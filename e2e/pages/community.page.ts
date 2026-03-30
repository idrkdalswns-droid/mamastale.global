import { type Page, type Locator, expect } from "@playwright/test";

export class CommunityPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1").first();
    this.searchInput = page.locator('input[placeholder="동화 검색..."]');
    this.nextPageButton = page.locator('button[aria-label="다음 페이지"]');
    this.prevPageButton = page.locator('button[aria-label="이전 페이지"]');
  }

  async goto() {
    await this.page.goto("/community");
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press("Enter");
  }

  async filterByType(type: "전체" | "클래스 완성작" | "오프라인 클래스") {
    await this.page.getByRole("button", { name: type }).click();
  }
}
