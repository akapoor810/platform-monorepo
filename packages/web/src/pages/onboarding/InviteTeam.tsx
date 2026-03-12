import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

/**
 * Step 2: Invite team members.
 * See issue #47.
 */
export function InviteTeamPage() {
  const [emails, setEmails] = useState<string[]>([""]);
  const navigate = useNavigate();

  const addRow = () => setEmails([...emails, ""]);
  const updateEmail = (i: number, val: string) => {
    const copy = [...emails];
    copy[i] = val;
    setEmails(copy);
  };

  const handleSubmit = async () => {
    const validEmails = emails.filter((e) => e.includes("@"));
    if (validEmails.length) {
      await Promise.all(
        validEmails.map((email) =>
          api.post("/orgs/current/invites", { email, role: "member" })
        )
      );
    }
    navigate("/onboarding/install-sdk");
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8">
      <h1 className="text-3xl font-bold text-center">Invite your team</h1>
      <p className="text-gray-500 text-center mt-2">Step 2 of 4 (optional)</p>
      <div className="mt-8 space-y-3">
        {emails.map((email, i) => (
          <input
            key={i}
            type="email"
            value={email}
            onChange={(e) => updateEmail(i, e.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="colleague@company.com"
          />
        ))}
        <button onClick={addRow} className="text-indigo-600 text-sm">
          + Add another
        </button>
      </div>
      <div className="mt-6 flex gap-3">
        <button onClick={handleSubmit} className="flex-1 bg-indigo-600 text-white py-2 rounded-md">
          Continue
        </button>
        <button onClick={() => navigate("/onboarding/install-sdk")} className="text-gray-500 text-sm">
          Skip
        </button>
      </div>
    </div>
  );
}
