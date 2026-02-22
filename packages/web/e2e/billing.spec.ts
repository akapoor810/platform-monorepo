import { test, expect } from "@playwright/test";

test.describe("Billing", () => {
  test.beforeAll(async ({ request }) => {
    // Seed billing data via API
    await request.post("/api/test/seed-billing", {
      data: { orgId: "test-org-1", months: 6 },
    });
  });

  test("should display current plan", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(page.locator("h2")).toContainText("Pro Plan");
    await expect(page.locator("[data-testid=billing-amount]")).toContainText("$99/mo");
  });

  /**
   * Flaky test — fails ~30% of CI runs.
   * The billing history table depends on seeded data loaded via API in beforeAll.
   * API sometimes takes too long in CI due to cold starts.
   *
   * See issue #54 for details and proposed fix.
   */
  test("should display billing history", async ({ page }) => {
    await page.goto("/settings/billing");

    // BUG: This times out when the API is slow to respond
    // Should add explicit waitForResponse before asserting
    await expect(
      page.locator("table.billing-history tbody tr").first()
    ).toBeVisible({ timeout: 15_000 });

    const rows = await page.locator("table.billing-history tbody tr").count();
    expect(rows).toBeGreaterThanOrEqual(3);
  });

  test("should open upgrade modal", async ({ page }) => {
    await page.goto("/settings/billing");
    await page.click("[data-testid=upgrade-button]");
    await expect(page.locator("[role=dialog]")).toBeVisible();
    await expect(page.locator("[role=dialog] h2")).toContainText("Upgrade Plan");
  });
});
