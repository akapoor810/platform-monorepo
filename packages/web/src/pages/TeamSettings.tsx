import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { DataTable } from "../components/DataTable";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export function TeamSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const { users } = await api.get("/orgs/current/users");
      setMembers(users);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    // BUG: This crashes if the invitee email matches an SSO domain
    // See issue #64
    await api.post("/orgs/current/invites", {
      email: inviteEmail,
      role: inviteRole,
    });
    setInviteEmail("");
    loadMembers();
  };

  const columns = [
    { header: "Name", accessorKey: "name" },
    { header: "Email", accessorKey: "email" },
    { header: "Role", accessorKey: "role" },
    { header: "Joined", accessorKey: "createdAt" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Team Settings</h1>

      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Invite Team Member</h2>
        <form onSubmit={handleInvite} className="flex gap-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2"
            required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Send Invite
          </button>
        </form>
      </div>

      <DataTable data={members} columns={columns} loading={loading} />
    </div>
  );
}
