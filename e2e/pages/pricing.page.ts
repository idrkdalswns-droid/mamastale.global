import { type Page, type Locator, expect } from "@playwright/test";

export class PricingPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1").first();
  }

  async goto() {
    await this.page.goto("/pricing");
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }
}
