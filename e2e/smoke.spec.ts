import { test, expect } from "@playwright/test";
import { LandingPage } from "./pages/landing.page";
import { LoginPage } from "./pages/login.page";
import { CommunityPage } from "./pages/community.page";
import { PricingPage } from "./pages/pricing.page";

test.describe("Smoke Tests — 주요 페이지 로딩", () => {
  test("랜딩 페이지 로딩 + CTA 표시", async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.expectLoaded();
    await expect(landing.startCta).toBeVisible();
  });

  test("로그인 페이지 로딩 + OAuth 버튼", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.expectLoaded();
    await expect(login.signupLink).toBeVisible();
  });

  test("커뮤니티 페이지 로딩", async ({ page }) => {
    const community = new CommunityPage(page);
    await community.goto();
    await community.expectLoaded();
  });

  test("가격표 페이지 로딩", async ({ page }) => {
    const pricing = new PricingPage(page);
    await pricing.goto();
    await pricing.expectLoaded();
  });

  test("법적 페이지 접근 가능", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1").first()).toBeVisible();

    await page.goto("/terms");
    await expect(page.locator("h1").first()).toBeVisible();
  });
});

test.describe("Navigation — 페이지 이동", () => {
  test("랜딩 → 로그인 이동", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href="/login"]').first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("로그인 → 회원가입 이동", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signupLink.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("로그인 → 홈 이동", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.homeLink.click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("SEO & Meta — 기본 메타데이터", () => {
  test("랜딩 페이지 title + meta description", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(5);

    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description).toBeTruthy();
  });

  test("OG 태그 존재", async ({ page }) => {
    await page.goto("/");
    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute("content");
    expect(ogTitle).toBeTruthy();
  });
});

test.describe("Responsive — 모바일 뷰포트", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("모바일에서 랜딩 페이지 로딩", async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.expectLoaded();
    await expect(landing.startCta).toBeVisible();
  });

  test("모바일에서 커뮤니티 페이지 로딩", async ({ page }) => {
    const community = new CommunityPage(page);
    await community.goto();
    await community.expectLoaded();
  });
});

test.describe("Error Handling — 에러 페이지", () => {
  test("존재하지 않는 페이지 → 404", async ({ page }) => {
    const response = await page.goto("/nonexistent-page-12345");
    expect(response?.status()).toBe(404);
  });
});
