import { type Page, type Locator, expect } from "@playwright/test";

export class LandingPage {
  readonly page: Page;
  readonly startCta: Locator;
  readonly heroHeading: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.startCta = page.getByText(/무료로 체험하기|우리 아이 동화 만들기/).first();
    this.heroHeading = page.locator("h1").first();
    this.footer = page.locator("footer");
  }

  async goto() {
    await this.page.goto("/");
  }

  async expectLoaded() {
    await expect(this.heroHeading).toBeVisible();
  }

  async clickStart() {
    await this.startCta.click();
  }
}
