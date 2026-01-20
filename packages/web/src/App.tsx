import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.DashboardPage })));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.LoginPage })));
const TeamSettings = lazy(() => import("./pages/TeamSettings").then(m => ({ default: m.TeamSettingsPage })));
const AuditLog = lazy(() => import("./pages/AuditLog").then(m => ({ default: m.AuditLogPage })));
const UsageDashboard = lazy(() => import("./pages/UsageDashboard").then(m => ({ default: m.UsageDashboardPage })));

// TODO: Add onboarding wizard pages — see issue #47
// const Onboarding = lazy(() => import("./pages/onboarding/CreateOrg"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings/team" element={<TeamSettings />} />
            <Route path="/settings/audit-log" element={<AuditLog />} />
            <Route path="/settings/usage" element={<UsageDashboard />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
