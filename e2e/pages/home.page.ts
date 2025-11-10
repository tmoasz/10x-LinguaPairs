import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for the Home Page
 */
export class HomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly navigationLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1").first();
    this.navigationLinks = page.locator("nav a");
  }

  /**
   * Navigate to the home page
   */
  async goto() {
    await this.page.goto("/");
  }

  /**
   * Get the main heading text
   */
  async getHeadingText(): Promise<string | null> {
    return await this.heading.textContent();
  }

  /**
   * Check if navigation is visible
   */
  async isNavigationVisible(): Promise<boolean> {
    return await this.navigationLinks.first().isVisible();
  }

  /**
   * Navigate to a specific page by link text
   */
  async navigateToPage(linkText: string) {
    await this.page.getByRole("link", { name: linkText }).click();
  }
}
