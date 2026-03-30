import { type Page, type Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly kakaoButton: Locator;
  readonly googleButton: Locator;
  readonly signupLink: Locator;
  readonly homeLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.kakaoButton = page.getByText("카카오로 시작하기");
    this.googleButton = page.getByText("Google로 시작하기");
    this.signupLink = page.locator('a[href="/signup"]');
    this.homeLink = page.getByText("홈으로 돌아가기");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async expectLoaded() {
    await expect(this.kakaoButton).toBeVisible();
  }
}
