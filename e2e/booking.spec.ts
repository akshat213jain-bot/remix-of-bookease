import { test, expect } from "@playwright/test";

test.describe("Booking Flow", () => {
    test("should display provider list", async ({ page }) => {
        await page.goto("/providers");

        // Wait for providers to load
        await expect(page.locator("h1")).toContainText("Find a Provider");

        // Check that provider cards are visible
        const providerCards = page.locator("[data-testid='provider-card']");
        await expect(providerCards.first()).toBeVisible({ timeout: 10000 });
    });

    test("should navigate to provider detail page", async ({ page }) => {
        await page.goto("/providers");

        // Click on first provider
        const firstProvider = page.locator("[data-testid='provider-card']").first();
        await firstProvider.click();

        // Should see booking section
        await expect(page.locator("text=Book an Appointment")).toBeVisible();
    });

    test("should show calendar for date selection", async ({ page }) => {
        await page.goto("/providers");

        // Navigate to provider detail
        const firstProvider = page.locator("[data-testid='provider-card']").first();
        await firstProvider.click();

        // Calendar should be visible
        await expect(page.locator("[role='grid']")).toBeVisible();
    });

    test("should redirect to auth when booking without login", async ({ page }) => {
        await page.goto("/providers");

        const firstProvider = page.locator("[data-testid='provider-card']").first();
        await firstProvider.click();

        // Try to book without login
        const bookButton = page.locator("text=Sign in to Book");
        if (await bookButton.isVisible()) {
            await bookButton.click();
            await expect(page).toHaveURL(/.*auth.*/);
        }
    });
});

test.describe("Authentication", () => {
    test("should display login form", async ({ page }) => {
        await page.goto("/auth");

        await expect(page.locator("input[type='email']")).toBeVisible();
        await expect(page.locator("input[type='password']")).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
        await page.goto("/auth");

        await page.fill("input[type='email']", "invalid@test.com");
        await page.fill("input[type='password']", "wrongpassword");
        await page.click("button[type='submit']");

        // Should show error toast or message
        await expect(page.locator("text=/error|invalid|failed/i")).toBeVisible({ timeout: 5000 });
    });
});

test.describe("Navigation", () => {
    test("should have working navigation links", async ({ page }) => {
        await page.goto("/");

        // Check main nav links
        await expect(page.locator("nav")).toBeVisible();
    });

    test("should be responsive on mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");

        // Page should load without horizontal scroll
        const body = page.locator("body");
        const scrollWidth = await body.evaluate((el) => el.scrollWidth);
        const clientWidth = await body.evaluate((el) => el.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10);
    });
});
