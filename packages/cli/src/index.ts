#!/usr/bin/env node

import { Command } from "commander";
import { version } from "../package.json";

const program = new Command();

program
  .name("acme")
  .description("Acme Platform CLI")
  .version(version);

program
  .command("login")
  .description("Authenticate with the Acme platform")
  .option("--token <token>", "API token for non-interactive auth")
  .action(async (options) => {
    if (options.token) {
      // Token-based auth
      await saveToken(options.token);
      console.log("✓ Authenticated successfully");
    } else {
      // Interactive OAuth flow
      console.log("Opening browser for authentication...");
      await openBrowserAuth();
    }
  });

program
  .command("whoami")
  .description("Show current authenticated user")
  .action(async () => {
    const token = await getStoredToken();
    if (!token) {
      console.error("Not authenticated. Run `acme login` first.");
      process.exit(1);
    }
    const user = await fetchCurrentUser(token);
    console.log(`Logged in as ${user.email} (${user.org.name})`);
  });

// deploy command is a stub — see issue #38
program
  .command("deploy")
  .description("Deploy to an environment")
  .argument("<environment>", "Target environment (staging, production)")
  .option("--promote", "Promote staging to production")
  .action(async (environment, options) => {
    console.error("Error: deploy command is not yet implemented");
    console.error("See: https://github.com/akapoor810/platform-monorepo/issues/38");
    process.exit(1);
  });

program.parse();

async function saveToken(token: string) { /* TODO */ }
async function getStoredToken(): Promise<string | null> { return null; }
async function openBrowserAuth() { /* TODO */ }
async function fetchCurrentUser(token: string): Promise<any> { return {}; }
