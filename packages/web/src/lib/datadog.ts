import { datadogRum } from "@datadog/browser-rum";

/**
 * Initialize Datadog Real User Monitoring.
 * See issue #70 for requirements.
 *
 * Only enabled in staging and production environments.
 * Session replay sample rate: 20% to control costs.
 */
export function initDatadog() {
  const env = import.meta.env.VITE_ENV;

  if (env !== "staging" && env !== "production") {
    console.log("[Datadog RUM] Skipping init — not in staging/production");
    return;
  }

  datadogRum.init({
    applicationId: import.meta.env.VITE_DD_APP_ID || "",
    clientToken: import.meta.env.VITE_DD_CLIENT_TOKEN || "",
    site: "datadoghq.com",
    service: "acme-web",
    env,
    version: import.meta.env.VITE_APP_VERSION || "0.0.0",
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "mask-user-input",
  });
}

/**
 * Set user context for Datadog RUM.
 * Call after successful login.
 */
export function setDatadogUser(user: {
  id: string;
  email: string;
  orgId: string;
  role: string;
}) {
  datadogRum.setUser({
    id: user.id,
    email: user.email,
    orgId: user.orgId,
    role: user.role,
  });
}
