import { expect, test } from "@playwright/test";

test("public demo loads core workflow", async ({ page }, testInfo) => {
  const errors: string[] = [];
  const visibleLabel = (name: string) => page.locator(".micro-label:visible", { hasText: name }).first();

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "VoiceGauntlet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "RefundBot gauntlet" }).first()).toBeVisible();
  await expect(visibleLabel("Failure Replay")).toBeVisible();
  await expect(page.getByRole("button", { name: /Shrink Failure/i })).toBeVisible();
  await page.getByRole("button", { name: /Shrink Failure/i }).click();
  await expect(visibleLabel("Minimal Failing Transcript")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("voicegauntlet-demo.png"), fullPage: true });
  expect(errors).toEqual([]);
});
