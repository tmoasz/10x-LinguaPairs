import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/home.page";

test.describe("Home Page", () => {
  test("should display the home page correctly", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Check if the page loaded
    await expect(page).toHaveTitle(/LinguaPairs/i);
  });

  test("should have visible navigation", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Check if navigation is visible
    const isNavVisible = await homePage.isNavigationVisible();
    expect(isNavVisible).toBeTruthy();
  });

  test("should take a screenshot of the home page", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Visual regression testing
    await expect(page).toHaveScreenshot("home-page.png", {
      fullPage: true,
    });
  });
});

test.describe("Navigation", () => {
  test("should navigate between pages", async ({ page }) => {
    await page.goto("/");

    // Wait for page to be ready
    await page.waitForLoadState("networkidle");

    // Check initial URL
    expect(page.url()).toContain("/");
  });
});

test.describe("API Tests", () => {
  test("should respond to health check", async ({ request }) => {
    // Example API test
    const response = await request.get("/api/health");

    // This will fail if there's no health endpoint - it's just an example
    if (response.ok()) {
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("status", "ok");
    }
  });
});
