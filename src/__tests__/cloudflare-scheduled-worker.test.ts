import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function readProjectFile(...segments: string[]) {
  return readFileSync(path.join(projectRoot, ...segments), "utf8");
}

describe("Cloudflare scheduled web push", () => {
  it("keeps production scheduling on Cloudflare instead of GitHub Actions", () => {
    const wranglerConfig = JSON.parse(readProjectFile("wrangler.jsonc"));
    const githubWorkflow = readProjectFile(".github", "workflows", "daily-push.yml");

    expect(wranglerConfig.main).toBe("cloudflare-worker.mjs");
    expect(wranglerConfig.triggers?.crons).toEqual(["59 23 * * *"]);
    expect(githubWorkflow).toContain("workflow_dispatch:");
    expect(githubWorkflow).not.toContain("schedule:");
    expect(githubWorkflow).not.toContain("- cron:");
  });

  it("keeps the scheduled handler wired to the web-only daily-send route", () => {
    const worker = readProjectFile("cloudflare-worker.mjs");

    expect(worker).toContain("scheduled(controller, env, ctx)");
    expect(worker).toContain("/api/mobile/push/daily-send");
    expect(worker).toContain("PUSH_TEST_SEND_SECRET");
    expect(worker).toContain("cloudflare-cron");
  });
});
