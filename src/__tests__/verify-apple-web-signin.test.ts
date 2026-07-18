import { describe, expect, it } from "vitest";

import { validateAppleAuthorizeRedirect } from "../../scripts/verify-apple-web-signin.mjs";

const expectedClientId = "com.djngoma.devilsaidictionary.web";
const expectedRedirectUri =
  "https://thedevilsaidictionary.com/api/auth/apple/callback";

function createLocation(redirectUri = expectedRedirectUri) {
  const url = new URL("https://appleid.apple.com/auth/authorize");
  url.searchParams.set("client_id", expectedClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "form_post");
  return url.toString();
}

describe("Apple web sign-in verifier", () => {
  it("accepts the configured client and exact callback URL", () => {
    const result = validateAppleAuthorizeRedirect({
      expectedClientId,
      expectedRedirectUri,
      location: createLocation(),
    });

    expect(result.observedClientId).toBe(expectedClientId);
    expect(result.observedRedirectUri).toBe(expectedRedirectUri);
  });

  it("rejects a missing callback URL", () => {
    const location = new URL("https://appleid.apple.com/auth/authorize");
    location.searchParams.set("client_id", expectedClientId);

    expect(() =>
      validateAppleAuthorizeRedirect({
        expectedClientId,
        expectedRedirectUri,
        location: location.toString(),
      }),
    ).toThrow(/did not include a redirect_uri/);
  });

  it("rejects callback drift even when the client ID is correct", () => {
    expect(() =>
      validateAppleAuthorizeRedirect({
        expectedClientId,
        expectedRedirectUri,
        location: createLocation("https://stale.example.com/api/auth/apple/callback"),
      }),
    ).toThrow(/redirect_uri mismatch/);
  });
});
