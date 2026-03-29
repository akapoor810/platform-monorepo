# triage_agent.py — Orchestrator for the issue triage agent
import os
import time
import requests
from github import Github  # pip install PyGithub

# ── Config ──────────────────────────────────────────────────
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
DEVIN_API_KEY = os.environ["DEVIN_API_KEY"]
REPO_NAME = "akapoor810/platform-monorepo"  # also accessible as akapoor-cognition/platform-monorepo

DEVIN_API_BASE = "https://api.devin.ai/v1"
DEVIN_HEADERS = {
    "Authorization": f"Bearer {DEVIN_API_KEY}",
    "Content-Type": "application/json",
}

# ── Step 1: Fetch issues needing triage ─────────────────────
gh = Github(GITHUB_TOKEN)
repo = gh.get_repo(REPO_NAME)

# ── Step 2: Build the Devin prompt for each issue ──────────
def build_triage_prompt(issue, repo_name):
    return f"""
You are an issue triage agent. Work autonomously from start to finish — do NOT pause, ask for clarification, or wait for confirmation at any point. If you are uncertain about anything, make your best judgment and proceed.

First, authenticate with GitHub: gh auth login --with-token <<< "$GITHUB_TOKEN"
Then clone the repo: gh repo clone {REPO_NAME}
Then cd into the repo directory.
Analyze GitHub issue #{issue.number}
in the repo `{repo_name}` and perform the following:

## Issue Details
- **Title:** {issue.title}
- **Body:** {issue.body or '(no body)'}
- **Current Labels:** {', '.join(l.name for l in issue.labels) or 'none'}
- **Created:** {issue.created_at}
- **Author:** {issue.user.login}

## Your Tasks

### 1. Explore the Codebase
- Carefully read the issue body, existing labels/tags, and any linked files or URLs
  referenced in the issue to gather full context
- Identify which files, functions, and classes this issue likely relates to
  based on the issue description, error messages, stack traces, component
  references, or any file paths mentioned in the issue body
- Use `git log` and `git blame` on those files to find:
  - Who last modified them and when
  - Whether the area is actively maintained (commits in last 3 months)
    or cold (no commits in 3+ months)
- Check related PRs or commits that touch the same files for additional context

### 2. Classify the Issue
Based on your analysis, determine:
- **Component**: one of [web, api, auth, db, infra, queue, cli, shared]
  (Note: issues already have a `component:` label — verify it matches your analysis)
- **Severity**: one of [critical, high, medium, low]
  - critical = data loss, security, or full outage
  - high = major feature broken, no workaround
  - medium = feature broken but workaround exists
  - low = cosmetic, minor inconvenience
- **Effort**: one of [XS, S, M, L, XL]
  - XS = < 1 hour, config change or one-liner
  - S = 1-4 hours, single file change
  - M = 1-2 days, multiple files
  - L = 3-5 days, cross-cutting
  - XL = 1+ week, architectural

### 3. Check for Staleness
- If the component/files referenced haven't had a commit in 3+ months,
  apply the label `stale` to the issue:
  gh issue edit {issue.number} --repo {repo_name} --add-label "stale"

### 4. Check for Duplicates
- Look at other open issues in the repo
- Cluster similar issues by comparing: referenced component, error messages,
  description similarity, and affected files/functions
- If you find issues that are clearly describing the same problem
  (same component + similar error/description):
  a) Identify the most complete/informative issue as the **canonical** issue
  b) For each duplicate (less informative or newer) issue, you MUST label and
     close it — see Step 6c for the exact commands to run

### 5. Calculate Priority Score
Score from 1-10 based on:
- Severity weight (critical=10, high=7, medium=4, low=1)
- Platform area weight — core areas (auth, api, db) get a +1 boost;
  peripheral areas (cli, infra) get no boost
- Feature request relevance — if the issue is a feature request aligned
  with areas under active development (recent commits), give +1 boost
- Recency of activity in affected code (active=boost, cold=penalty)
- Issue age (older unresolved = slight boost)
- Effort inverse (smaller effort + high severity = higher priority)

Map the final score to a priority label:
- 8-10 → priority:critical
- 5-7  → priority:high
- 3-4  → priority:medium
- 1-2  → priority:low

### 6. Write Back to GitHub
Using the GitHub CLI (`gh`), do the following:

a) Apply labels to issue #{issue.number}:
gh issue edit {issue.number} --repo {repo_name} --add-label "severity:<your-severity>"
gh issue edit {issue.number} --repo {repo_name} --add-label "effort:<your-effort>"
gh issue edit {issue.number} --repo {repo_name} --add-label "priority:<critical|high|medium|low>"
gh issue edit {issue.number} --repo {repo_name} --add-label "triaged"

b) If duplicates were found in Step 4, label and close each duplicate NOW:
For EACH duplicate issue, run BOTH of these commands:
gh issue edit <DUPLICATE_NUMBER> --repo {repo_name} --add-label "duplicate"
gh issue close <DUPLICATE_NUMBER> --repo {repo_name} --comment "Closing as duplicate of #{issue.number}"
Do NOT skip this step — every duplicate must be labeled and closed.

c) Post a comment on issue #{issue.number} with this format:
gh issue comment {issue.number} --repo {repo_name} --body "
## Triage Summary
**Priority Score:** X/10 (`priority:<label>`)
**Component:** <component> | **Severity:** <severity> | **Effort:** <effort>

## Investigation Notes
<2-3 sentences about what this issue likely involves,
which files are relevant, and what the fix might entail>

## Relevant Files
- `path/to/file.ts` (last modified by @user, X days ago)
- `path/to/other.ts` (last modified by @user, X days ago)

## Suggested Assignee
Based on recent commit history: @username
(Last touched the relevant files X days ago)

## Next Steps
A short investigation plan to help an engineer get started:
- **Likely root cause:** <1-2 sentences on what is probably going wrong or what needs to change>
- **Start here:** `src/path/to/file.ts` lines XX-YY (last modified by @author N days/weeks ago)
- **Related PR:** #NNN — '<PR title>' (if a similar issue was previously fixed or a related change was made, otherwise omit)
- **Suggested approach:** <1-2 sentences on the recommended fix or implementation strategy>
- **Estimated complexity:** <brief justification for the effort label>

## Similar Issues
- #XX — <title> (if duplicates found, otherwise 'None identified')
- If duplicates were closed, note: 'Closed #XX, #YY as duplicates of this issue'

---
*Automated triage by Devin*
"

Important: You MUST actually run the gh commands — do not just
describe what you would do. Authenticate with the GitHub CLI using
the available credentials and execute the commands.
"""

# ── Step 3 & 4: Create Devin sessions in batches and poll ──
BATCH_SIZE = 5  # stay within concurrent session limit

if __name__ == "__main__":
    open_issues = repo.get_issues(state="open")
    issues_to_triage = [
        issue for issue in open_issues
        if "triaged" not in [l.name for l in issue.labels]
        and not issue.pull_request
    ]
    print(f"Found {len(issues_to_triage)} issues to triage")

def wait_for_sessions(batch):
    """Poll until all sessions in batch are done."""
    print("\n  Waiting for batch to complete...")
    for issue_num, sid in batch:
        print(f"  Polling issue #{issue_num} (session {sid})...")
        poll_count = 0
        while True:
            poll_count += 1
            resp = requests.get(
                f"{DEVIN_API_BASE}/session/{sid}",
                headers=DEVIN_HEADERS,
            )
            status = resp.json()
            state = status.get("status_enum")
            print(f"    [poll #{poll_count}] issue #{issue_num} → state={state!r} (raw: {status})")
            if state in ["stopped", "finished"]:
                print(f"  Issue #{issue_num}: ✅ Done")
                break
            elif state == "failed":
                print(f"  Issue #{issue_num}: ❌ Failed — {status}")
                break
            else:
                print(f"    Sleeping 15s before next poll...")
                time.sleep(15)

if __name__ == "__main__":
    for batch_start in range(0, len(issues_to_triage), BATCH_SIZE):
        batch_issues = issues_to_triage[batch_start:batch_start + BATCH_SIZE]
        print(f"\nBatch {batch_start // BATCH_SIZE + 1}: issues {[i.number for i in batch_issues]}")
        batch_sessions = []

        for issue in batch_issues:
            prompt = build_triage_prompt(issue, REPO_NAME)
            response = requests.post(
                f"{DEVIN_API_BASE}/sessions",
                headers=DEVIN_HEADERS,
                json={"prompt": prompt, "idling_timeout": 10},
            )
            session = response.json()
            print(f"  Devin API response (issue #{issue.number}): status={response.status_code} body={session}")
            if response.status_code != 200 or "session_id" not in session:
                print(f"  ❌ Failed to create session for issue #{issue.number}: {session}")
                continue
            session_id = session["session_id"]
            batch_sessions.append((issue.number, session_id))
            print(f"  Issue #{issue.number} → Devin session {session_id}")
            time.sleep(2)

        wait_for_sessions(batch_sessions)

    print("\nTriage complete!")
