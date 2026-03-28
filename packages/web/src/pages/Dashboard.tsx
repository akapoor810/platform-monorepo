import { useEffect, useState } from "react";
import { DataTable } from "../components/DataTable";
import { MetricsCard } from "../components/MetricsCard";
import { useCurrentOrg } from "../hooks/useCurrentOrg";
import { api } from "../lib/api";

export function Dashboard() {
  const { org } = useCurrentOrg();
  const [metrics, setMetrics] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (!org) return;
    Promise.all([
      api.get(`/orgs/${org.id}/metrics`),
      api.get(`/orgs/${org.id}/activity?limit=50`),
    ]).then(([m, a]) => {
      setMetrics(m.data);
      setRecentActivity(a.data);
    });
  }, [org]);

  if (!org) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>{org.name} Dashboard</h1>
      <div className="metrics-grid">
        <MetricsCard title="Active Users" value={metrics?.activeUsers ?? "—"} />
        <MetricsCard title="API Calls (24h)" value={metrics?.apiCalls24h ?? "—"} />
        <MetricsCard title="Error Rate" value={metrics?.errorRate ?? "—"} />
        <MetricsCard title="P95 Latency" value={metrics?.p95Latency ?? "—"} />
      </div>
      <h2>Recent Activity</h2>
      <DataTable data={recentActivity} columns={activityColumns} />
    </div>
  );
}
