# test_single_issue.py
from triage_agent import repo, build_triage_prompt, REPO_NAME, DEVIN_API_BASE, DEVIN_HEADERS
import requests

issue = repo.get_issue(1)  # pick a specific issue number
prompt = build_triage_prompt(issue, REPO_NAME)

response = requests.post(
    f"{DEVIN_API_BASE}/sessions",
    headers=DEVIN_HEADERS,
    json={"prompt": prompt},
)
body = response.json()
print(f"Devin API response: status={response.status_code} body={body}")
if response.status_code != 200 or "session_id" not in body:
    print(f"❌ Failed to create session: {body}")
else:
    session_id = body["session_id"]
    print(f"Session: {session_id}")