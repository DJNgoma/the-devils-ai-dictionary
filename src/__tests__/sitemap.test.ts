import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { absoluteUrl } from "@/lib/metadata";

describe("sitemap", () => {
  it("includes the recently added updates page", async () => {
    const routes = await sitemap();
    expect(routes.map((route) => route.url)).toContain(absoluteUrl("/updates"));
  });
});
