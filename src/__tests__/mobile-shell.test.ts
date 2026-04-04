import { describe, expect, it } from "vitest";
import {
  getMobileBackHref,
  getMobileChromeTitle,
  getMobilePrimaryNavId,
  isMobilePrimaryNavActive,
} from "@/lib/site";

describe("mobile navigation helpers", () => {
  it("maps home-adjacent routes to the home tab", () => {
    expect(getMobilePrimaryNavId("/")).toBe("home");
    expect(getMobilePrimaryNavId("/book")).toBe("home");
    expect(getMobilePrimaryNavId("/about")).toBe("home");
  });

  it("maps dictionary routes to the search tab", () => {
    expect(getMobilePrimaryNavId("/dictionary")).toBe("search");
    expect(getMobilePrimaryNavId("/dictionary/agent")).toBe("search");
  });

  it("maps category routes to the categories tab", () => {
    expect(getMobilePrimaryNavId("/categories")).toBe("categories");
    expect(getMobilePrimaryNavId("/categories/model-building")).toBe("categories");
  });

  it("returns readable chrome titles", () => {
    expect(getMobileChromeTitle("/dictionary")).toBe("Search");
    expect(getMobileChromeTitle("/dictionary/agent")).toBe("Entry");
    expect(getMobileChromeTitle("/categories")).toBe("Categories");
    expect(getMobileChromeTitle("/saved")).toBe("Saved");
  });

  it("provides back destinations for detail routes", () => {
    expect(getMobileBackHref("/dictionary/agent")).toBe("/dictionary");
    expect(getMobileBackHref("/categories/model-building")).toBe("/categories");
    expect(getMobileBackHref("/")).toBeNull();
  });

  it("reports active mobile tabs", () => {
    expect(isMobilePrimaryNavActive("/dictionary", "search")).toBe(true);
    expect(isMobilePrimaryNavActive("/categories", "categories")).toBe(true);
    expect(isMobilePrimaryNavActive("/saved", "home")).toBe(false);
  });
});
