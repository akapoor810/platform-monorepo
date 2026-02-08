import React, { useState, useEffect } from "react";
import { api } from "../lib/api";

interface UsageData {
  metric: string;
  current: number;
  limit: number;
  period: string;
}

/**
 * Usage Dashboard — shows API usage and billing metering.
 * Part of the usage-based billing feature.
 * See issue #61 for full requirements.
 */
export function UsageDashboardPage() {
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const data = await api.get<{ usage: UsageData[] }>("/usage/current");
      setUsage(data.usage);
    } catch (err) {
      console.error("Failed to load usage data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min(100, Math.round((current / limit) * 100));
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) {
    return <div className="p-6">Loading usage data...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Usage & Billing</h1>
      <p className="text-gray-500 mb-6">
        Monitor your API usage and resource consumption.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usage.map((item) => {
          const percentage = getUsagePercentage(item.current, item.limit);
          return (
            <div key={item.metric} className="bg-white rounded-lg border p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase">
                {item.metric.replace(/_/g, " ")}
              </h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {item.current.toLocaleString()}
                </span>
                <span className="text-gray-400">
                  / {item.limit.toLocaleString()}
                </span>
              </div>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getBarColor(percentage)}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {percentage}% used · Period: {item.period}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
