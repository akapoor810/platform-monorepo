import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { token } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", token);
      navigate("/dashboard");
    } catch (err: any) {
      if (err.status === 401) {
        setError("Invalid email or password");
      } else if (err.message?.includes("SSO")) {
        // TODO: Handle SSO enforcement error — redirect to SSO login
        // See issue #67
        setError("Your organization requires SSO login.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = () => {
    // Redirect to SSO provider
    window.location.href = `/api/auth/sso?email=${encodeURIComponent(email)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Sign in to Acme
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-md w-full px-3 py-2 border border-gray-300"
              placeholder="Email address"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-md w-full px-3 py-2 border border-gray-300"
              placeholder="Password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="text-center">
          <button
            onClick={handleSSOLogin}
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            Sign in with SSO
          </button>
        </div>
      </div>
    </div>
  );
}
