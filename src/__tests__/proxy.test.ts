import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

function redirectLocation(path: string) {
  const response = proxy(new NextRequest(`https://example.com${path}`));

  expect(response).toBeDefined();
  expect(response?.status).toBe(308);

  return response?.headers.get("location");
}

describe("proxy", () => {
  it("keeps the global matcher for host redirects", () => {
    expect(config.matcher).toBe("/:path*");
  });

  it("redirects the www host to the apex domain", () => {
    const response = proxy(
      new NextRequest("https://www.thedevilsaidictionary.com/dictionary"),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://thedevilsaidictionary.com/dictionary",
    );
  });

  it("redirects legacy search query links to hash-backed dictionary state", () => {
    expect(redirectLocation("/search?q=agent&category=core-concepts")).toBe(
      "https://example.com/dictionary#q=agent&category=core-concepts",
    );
  });

  it("redirects dictionary filter query links before rendering", () => {
    expect(redirectLocation("/dictionary?letter=A")).toBe(
      "https://example.com/dictionary#letter=A",
    );
  });

  it("drops framework-only query params instead of copying them into hash state", () => {
    expect(redirectLocation("/search?q=agent&_rsc=abc")).toBe(
      "https://example.com/dictionary#q=agent",
    );
  });

  it("leaves ordinary dictionary requests alone", () => {
    expect(
      proxy(new NextRequest("https://example.com/dictionary")).headers.get(
        "location",
      ),
    ).toBeNull();
    expect(
      proxy(
        new NextRequest("https://example.com/dictionary?_rsc=abc"),
      ).headers.get("location"),
    ).toBeNull();
  });
});
