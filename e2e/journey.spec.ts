import { test, expect } from "@playwright/test";
import path from "node:path";

const SAMPLE = path.join(__dirname, "fixtures", "sample.png");

test("anonymous scan → confirm → recipes → cook → feedback", async ({ page }) => {
  // landing
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Hack dinner with/i }),
  ).toBeVisible();

  // scan
  await page.getByRole("link", { name: /Scan ingredients/i }).first().click();
  await expect(page).toHaveURL(/\/scan/);
  await page.locator("input[type=file][multiple]").setInputFiles(SAMPLE);
  await expect(page.locator("main img").first()).toBeVisible();
  await page.getByRole("button", { name: /Analyse/i }).click();

  // confirmation (mandatory, editable)
  await expect(
    page.getByRole("heading", { name: /Check your ingredients/i }),
  ).toBeVisible();
  await expect(page.locator("main ul li").first()).toBeVisible();
  await page.getByRole("button", { name: /Continue with/i }).click();

  // preferences
  await expect(
    page.getByRole("heading", { name: /How should we cook/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Generate 3 recipes/i }).click();

  // results — exactly three recipes
  await expect(
    page.getByRole("heading", { name: /Three ways to dinner/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Cook this/i })).toHaveCount(3);
  await page.getByRole("button", { name: /Cook this/i }).first().click();

  // detail → start cooking
  await expect(page.getByRole("heading", { name: /Method/i })).toBeVisible();
  await page.getByRole("button", { name: /Start cooking/i }).click();

  // guided cooking — step through to the end
  await expect(page.getByText(/^Step \d/i).first()).toBeVisible();
  for (let i = 0; i < 15; i++) {
    const done = page.getByRole("button", { name: /I.m done/i });
    if (await done.isVisible().catch(() => false)) {
      await done.click();
      break;
    }
    await page.getByRole("button", { name: /^Next/i }).click();
  }

  // feedback → cooked
  await expect(
    page.getByRole("heading", { name: /Did this become dinner/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /make it again/i }).click();
  await expect(
    page.getByRole("heading", { name: /dinner sorted/i }),
  ).toBeVisible();
});
