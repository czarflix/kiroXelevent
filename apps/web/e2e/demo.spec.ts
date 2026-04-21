import { expect, test } from "@playwright/test";

test("public demo loads core workflow", async ({ page }, testInfo) => {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "VoiceGauntlet" })).toBeVisible();
  await expect(page.getByText("Built with Kiro")).toBeVisible();
  await expect(page.getByText(".kiro/specs/refundbot-demo/requirements.md")).toBeVisible();

  await page.getByRole("button", { name: /Play proof run/i }).click();
  await expect(page.getByRole("heading", { name: /Agent claimed refund success/i })).toBeVisible();
  await expect(page.locator("[data-testid='transcript']")).toContainText("Your refund has been processed successfully");

  await page.getByRole("button", { name: /Open audio evidence/i }).click();
  await expect(page.locator("[data-testid='audio-player']")).toBeVisible();
  await expect(page.locator("[data-testid='audio-player'] .micro-label")).toHaveText("Generated Replay");
  await page.getByRole("button", { name: /Play audio evidence/i }).click();
  const audioReady = await page.locator("[data-testid='audio-player'] audio").evaluate(
    (audio: HTMLAudioElement) =>
      new Promise<number>((resolve) => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          resolve(audio.duration);
          return;
        }
        audio.addEventListener("loadedmetadata", () => resolve(audio.duration), { once: true });
      })
  );
  expect(audioReady).toBeGreaterThan(0);

  await page.getByRole("button", { name: /Shrink failure/i }).click();
  await expect(page.getByText(/turns to/i)).toBeVisible();

  await page.getByRole("button", { name: /Export Kiro task/i }).click();
  await expect(page.getByText("Task ready for `.kiro/specs/agent-hardening/tasks.md`.")).toBeVisible();
  await expect(page.locator(".task-preview")).toContainText("Fix REQ-002");

  await page.getByRole("button", { name: /Rerun green/i }).click();
  await expect(page.getByRole("heading", { name: "VoiceGauntlet Certified." })).toBeVisible();
  await expect(page.locator(".verdict")).toContainText("Green");

  await page.screenshot({ path: testInfo.outputPath("voicegauntlet-demo.png"), fullPage: true });
  expect(errors).toEqual([]);
});
