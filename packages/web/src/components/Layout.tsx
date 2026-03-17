import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { CommandPalette } from "./CommandPalette";

export function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex">
      <CommandPalette />

      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">Acme Platform</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm ${
                isActive ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/settings/team"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm ${
                isActive ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            Team Settings
          </NavLink>
          <NavLink
            to="/settings/audit-log"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm ${
                isActive ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            Audit Log
          </NavLink>
          <NavLink
            to="/settings/usage"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm ${
                isActive ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            Usage & Billing
          </NavLink>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm"
          >
            Sign out
          </button>
          <div className="mt-2 text-xs text-gray-600">
            Press <kbd className="bg-gray-800 px-1 rounded">⌘K</kbd> to search
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
