import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

/**
 * Step 3.5: Make the first API call to verify integration.
 * See issue #47.
 */
export function FirstApiCallPage() {
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const navigate = useNavigate();

  const testApiCall = async () => {
    setStatus("testing");
    try {
      await api.post("/test/ping", { source: "onboarding" });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 text-center">
      <h1 className="text-3xl font-bold">Test your integration</h1>
      <p className="text-gray-500 mt-2">Step 3.5 of 4</p>
      <div className="mt-8">
        {status === "idle" && (
          <button onClick={testApiCall} className="bg-indigo-600 text-white px-6 py-3 rounded-md">
            Send test event
          </button>
        )}
        {status === "testing" && <p className="text-gray-500">Testing connection...</p>}
        {status === "success" && (
          <div>
            <p className="text-green-600 text-xl font-bold">Connection successful!</p>
            <button
              onClick={() => navigate("/onboarding/complete")}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-md"
            >
              Finish setup
            </button>
          </div>
        )}
        {status === "error" && (
          <div>
            <p className="text-red-600">Connection failed. Check your API key.</p>
            <button onClick={testApiCall} className="mt-4 text-indigo-600">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
