import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Step 4: Onboarding complete.
 * See issue #47.
 */
export function CompletePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto mt-20 p-8 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-3xl font-bold">You are all set!</h1>
      <p className="text-gray-500 mt-2">
        Your organization is ready. Start exploring the dashboard.
      </p>
      <button
        onClick={() => navigate("/dashboard")}
        className="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-md text-lg"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
