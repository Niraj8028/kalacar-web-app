import { expect, test } from "@playwright/test";
import { expectFits, mockShop, watchErrors } from "./mock-shop";
import { GOOGLE_REVIEWS, SISTER_STUDIO } from "../../src/data/google-reviews";

test("Google reviews of the sister studio show, clearly labelled, with photos and no links to another site", async ({ page }) => {
  const errors = watchErrors(page);
  await mockShop(page);
  await page.goto("/");
  const section = page.locator(".greviews");
  await expect(section.getByRole("heading", { name: "Loved by devotees" })).toBeVisible();
  await expect(section.getByText(/Real Google reviews of\s*Murtiverse, our sister studio/)).toBeVisible();
  await expect(section.locator(".greview")).toHaveCount(GOOGLE_REVIEWS.length);
  await expect(section.locator(".greview-photo img")).toHaveCount(GOOGLE_REVIEWS.reduce((n, review) => n + review.photos.length, 0));
  await expect(section.getByRole("link")).toHaveCount(0);
  await expect(section.getByText(`${SISTER_STUDIO.reviewCount} reviews on Google`)).toBeVisible();
  const oshmi = section.locator(".greview", { hasText: "Oshmi Pandey" });
  await expect(oshmi.locator(".greview-text")).toHaveClass(/clamped/);
  await oshmi.getByRole("button", { name: "Read more" }).click();
  await expect(oshmi.locator(".greview-text")).not.toHaveClass(/clamped/);
  await expect(section.locator(".greview", { hasText: "Chanchal Sinha" }).getByRole("button")).toHaveCount(0);
  await expectFits(page);
  expect(errors).toEqual([]);
});
