# triage_agent.py — Orchestrator for the issue triage agent
import os
import time
import requests
from github import Github  # pip install PyGithub

# ── Config ──────────────────────────────────────────────────
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
DEVIN_API_KEY = os.environ["DEVIN_API_KEY"]
REPO_NAME = "your-username/your-demo-repo"

DEVIN_API_BASE = "https://api.devin.ai/v1"
DEVIN_HEADERS = {
    "Authorization": f"Bearer {DEVIN_API_KEY}",
    "Content-Type": "application/json",
}

# ── Step 1: Fetch issues needing triage ─────────────────────
gh = Github(GITHUB_TOKEN)
repo = gh.get_repo(REPO_NAME)

open_issues = repo.get_issues(state="open")
issues_to_triage = [
    issue for issue in open_issues
    if "triaged" not in [l.name for l in issue.labels]
    and not issue.pull_request  # skip PRs
]

print(f"Found {len(issues_to_triage)} issues to triage")

# ── Step 2: Build the Devin prompt for each issue ──────────
def build_triage_prompt(issue, repo_name):
    return f"""
You are an issue triage agent. Analyze GitHub issue #{issue.number}
in the repo `{repo_name}` and perform the following:

## Issue Details
- **Title:** {issue.title}
- **Body:** {issue.body or '(no body)'}
- **Current Labels:** {', '.join(l.name for l in issue.labels) or 'none'}
- **Created:** {issue.created_at}
- **Author:** {issue.user.login}

## Your Tasks

### 1. Explore the Codebase
- Identify which files/functions this issue likely relates to
  based on the issue description, error messages, or component references
- Use `git log` and `git blame` on those files to find:
  - Who last modified them and when
  - Whether the area is actively maintained (commits in last 3 months)
    or cold (no commits in 3+ months)

### 2. Classify the Issue
Based on your analysis, determine:
- **Component**: one of [web, api, auth, db, infra, queue, cli, shared]
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
  note this as "potentially stale area"

### 4. Check for Duplicates
- Look at other open issues in the repo
- If any are clearly describing the same problem
  (same component + similar error/description), note the duplicate

### 5. Calculate Priority Score
Score from 1-10 based on:
- Severity weight (critical=10, high=7, medium=4, low=1)
- Recency of activity in affected code (active=boost, cold=penalty)
- Issue age (older unresolved = slight boost)
- Effort inverse (smaller effort + high severity = higher priority)

### 6. Write Back to GitHub
Using the GitHub CLI (`gh`), do the following:

a) Apply labels to issue #{issue.number}:
gh issue edit {issue.number} --repo {repo_name} --add-label "severity:<your-severity>"
gh issue edit {issue.number} --repo {repo_name} --add-label "effort:<your-effort>"
gh issue edit {issue.number} --repo {repo_name} --add-label "triaged"

b) Post a comment on issue #{issue.number} with this format:
gh issue comment {issue.number} --repo {repo_name} --body "
🔍 Triage Summary
Priority Score: X/10
Component: <component> | Severity: <severity> | Effort: <effort>
Investigation Notes
<2-3 sentences about what this issue likely involves,
which files are relevant, and what the fix might entail>
Relevant Files

path/to/file.ts (last modified by @user, X days ago)
path/to/other.ts (last modified by @user, X days ago)

Suggested Assignee
Based on recent commit history: @username
(Last touched the relevant files X days ago)
Similar Issues

#XX — <title> (if duplicates found, otherwise 'None identified')


Automated triage by Devin • [Priority scoring methodology]
"

Important: You MUST actually run the gh commands — do not just
describe what you would do. Authenticate with the GitHub CLI using
the available credentials and execute the commands.
"""

# ── Step 3: Create Devin sessions ──────────────────────────
session_ids = []

for issue in issues_to_triage:
    prompt = build_triage_prompt(issue, REPO_NAME)

    response = requests.post(
        f"{DEVIN_API_BASE}/sessions",
        headers=DEVIN_HEADERS,
        json={
            "prompt": prompt,
            # Optionally attach the repo so Devin can explore it:
            # "idling_timeout": 30,  # minutes before auto-pause
        },
    )
    session = response.json()
    session_id = session["session_id"]
    session_ids.append((issue.number, session_id))
    print(f"  Issue #{issue.number} → Devin session {session_id}")

    # Rate limit: don't slam the API
    time.sleep(2)

# ── Step 4: Poll for completion ────────────────────────────
print("\nWaiting for Devin sessions to complete...")

for issue_num, sid in session_ids:
    while True:
        status = requests.get(
            f"{DEVIN_API_BASE}/session/{sid}",
            headers=DEVIN_HEADERS,
        ).json()

        state = status.get("status_enum")
        if state in ["stopped", "finished"]:
            print(f"  Issue #{issue_num}: ✅ Done")
            break
        elif state == "failed":
            print(f"  Issue #{issue_num}: ❌ Failed")
            break
        else:
            time.sleep(15)  # check every 15 seconds

print("\nTriage complete!")