import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Step 3: Install the SDK.
 * See issue #47.
 */
export function InstallSDKPage() {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const installCommand = "npm install @acme/sdk";
  const snippet = `import { AcmeClient } from "@acme/sdk";

const client = new AcmeClient({
  apiKey: process.env.ACME_API_KEY,
});

// Track an event
await client.track("user.signup", {
  userId: "usr_123",
  plan: "pro",
});`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto mt-20 p-8">
      <h1 className="text-3xl font-bold text-center">Install the SDK</h1>
      <p className="text-gray-500 text-center mt-2">Step 3 of 4</p>

      <div className="mt-8 bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs">Terminal</span>
          <button
            onClick={() => copyToClipboard(installCommand)}
            className="text-gray-400 text-xs hover:text-white"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-green-400 text-sm">$ {installCommand}</pre>
      </div>

      <div className="mt-6 bg-gray-900 rounded-lg p-4">
        <pre className="text-gray-300 text-sm overflow-x-auto">{snippet}</pre>
      </div>

      <button
        onClick={() => navigate("/onboarding/first-api-call")}
        className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-md"
      >
        Continue
      </button>
    </div>
  );
}
