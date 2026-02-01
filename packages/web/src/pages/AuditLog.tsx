import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { DataTable } from "../components/DataTable";

interface AuditEntry {
  id: string;
  action: string;
  actorId: string;
  actorEmail: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Audit Log page — SOC 2 compliance requirement.
 * Shows all admin actions across the org.
 * See issue #35 for full requirements.
 */
export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "",
    actorId: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadAuditLog();
  }, [filters]);

  const loadAuditLog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.set("action", filters.action);
      if (filters.actorId) params.set("actorId", filters.actorId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const data = await api.get<{ entries: AuditEntry[] }>(
        `/audit-log?${params.toString()}`
      );
      setEntries(data.entries);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: "Timestamp", accessorKey: "createdAt" },
    { header: "Action", accessorKey: "action" },
    { header: "Actor", accessorKey: "actorEmail" },
    { header: "Target", accessorKey: "targetType" },
    { header: "Details", accessorFn: (row: AuditEntry) => JSON.stringify(row.metadata) },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Audit Log</h1>
      <p className="text-gray-500 mb-4">
        Track all admin actions across your organization for SOC 2 compliance.
      </p>

      <div className="mb-6 flex gap-4">
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">All actions</option>
          <option value="user.invite">User invited</option>
          <option value="user.remove">User removed</option>
          <option value="user.role_change">Role changed</option>
          <option value="apikey.create">API key created</option>
          <option value="apikey.revoke">API key revoked</option>
          <option value="org.settings_update">Settings updated</option>
          <option value="sso.configure">SSO configured</option>
        </select>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <DataTable data={entries} columns={columns} loading={loading} />
    </div>
  );
}
