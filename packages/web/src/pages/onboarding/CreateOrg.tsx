import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

/**
 * Step 1 of onboarding wizard: Create an organization.
 * See issue #47 for full onboarding flow requirements.
 */
export function CreateOrgPage() {
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/orgs", { name: orgName, slug });
      navigate("/onboarding/invite-team");
    } catch (err) {
      console.error("Failed to create org:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Create your organization</h1>
        <p className="text-gray-500 mt-2">Step 1 of 4</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Organization name</label>
          <input
            value={orgName}
            onChange={(e) => {
              setOrgName(e.target.value);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
            }}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Acme Inc"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">URL slug</label>
          <div className="flex items-center">
            <span className="text-gray-400 text-sm mr-1">acme.dev/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="flex-1 rounded-md border px-3 py-2"
              placeholder="acme-inc"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700"
        >
          {loading ? "Creating..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
