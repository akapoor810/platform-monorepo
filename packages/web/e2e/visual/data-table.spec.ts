import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for DataTable component.
 * See issue #63 for full visual testing plan.
 *
 * Run: pnpm test:visual
 * Update baselines: pnpm test:visual --update-snapshots
 */
test.describe("DataTable Visual Regression", () => {
  test("renders correctly with data", async ({ page }) => {
    await page.goto("/test/components/data-table?state=populated");
    await expect(page.locator("[data-testid=data-table]")).toBeVisible();
    await expect(page).toHaveScreenshot("data-table-populated.png", {
      maxDiffPixelRatio: 0.001,
    });
  });

  test("renders loading state", async ({ page }) => {
    await page.goto("/test/components/data-table?state=loading");
    await expect(page).toHaveScreenshot("data-table-loading.png", {
      maxDiffPixelRatio: 0.001,
    });
  });

  test("renders empty state", async ({ page }) => {
    await page.goto("/test/components/data-table?state=empty");
    await expect(page).toHaveScreenshot("data-table-empty.png", {
      maxDiffPixelRatio: 0.001,
    });
  });

  test("renders with pagination", async ({ page }) => {
    await page.goto("/test/components/data-table?state=paginated");
    await expect(page).toHaveScreenshot("data-table-paginated.png", {
      maxDiffPixelRatio: 0.001,
    });
  });
});
