import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudflareMocks = vi.hoisted(() => ({
  getAppServerEnv: vi.fn(),
  requirePrimaryDatabase: vi.fn(),
}));
const authMocks = vi.hoisted(() => ({
  createAppleStateToken: vi.fn(),
  createAuthSession: vi.fn(),
  getAuthenticatedSession: vi.fn(),
  readSessionToken: vi.fn(),
  revokeSession: vi.fn(),
  sanitizeReturnTo: vi.fn(),
  upsertAppleUser: vi.fn(),
  verifyAppleStateToken: vi.fn(),
}));
const appleAuthMocks = vi.hoisted(() => ({
  buildAppleDisplayName: vi.fn(),
  exchangeAppleAuthorizationCode: vi.fn(),
  getAppleNativeClientId: vi.fn(),
  getAppleWebClientId: vi.fn(),
  parseAppleUserPayload: vi.fn(),
}));
const savedWordMocks = vi.hoisted(() => ({
  getSavedWordsSyncMetadata: vi.fn(),
  listSavedWords: vi.fn(),
}));

vi.mock("@/lib/server/cloudflare-context", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/cloudflare-context")
  >("@/lib/server/cloudflare-context");

  return {
    ...actual,
    getAppServerEnv: cloudflareMocks.getAppServerEnv,
    requirePrimaryDatabase: cloudflareMocks.requirePrimaryDatabase,
  };
});

vi.mock("@/lib/server/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/auth")>(
    "@/lib/server/auth",
  );

  return {
    ...actual,
    createAppleStateToken: authMocks.createAppleStateToken,
    createAuthSession: authMocks.createAuthSession,
    getAuthenticatedSession: authMocks.getAuthenticatedSession,
    readSessionToken: authMocks.readSessionToken,
    revokeSession: authMocks.revokeSession,
    sanitizeReturnTo: authMocks.sanitizeReturnTo,
    upsertAppleUser: authMocks.upsertAppleUser,
    verifyAppleStateToken: authMocks.verifyAppleStateToken,
  };
});

vi.mock("@/lib/server/apple-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/apple-auth")>(
    "@/lib/server/apple-auth",
  );

  return {
    ...actual,
    buildAppleDisplayName: appleAuthMocks.buildAppleDisplayName,
    exchangeAppleAuthorizationCode:
      appleAuthMocks.exchangeAppleAuthorizationCode,
    getAppleNativeClientId: appleAuthMocks.getAppleNativeClientId,
    getAppleWebClientId: appleAuthMocks.getAppleWebClientId,
    parseAppleUserPayload: appleAuthMocks.parseAppleUserPayload,
  };
});

vi.mock("@/lib/server/saved-words", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/saved-words")
  >("@/lib/server/saved-words");

  return {
    ...actual,
    getSavedWordsSyncMetadata: savedWordMocks.getSavedWordsSyncMetadata,
    listSavedWords: savedWordMocks.listSavedWords,
  };
});

import { GET as appleStart } from "@/app/api/auth/apple/start/route";
import { POST as appleCallback } from "@/app/api/auth/apple/callback/route";
import { POST as appleNative } from "@/app/api/auth/apple/native/route";
import { GET as sessionGet } from "@/app/api/auth/session/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";

describe("auth routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    const env = {
      APPLE_KEY_ID: "key-id",
      APPLE_NATIVE_CLIENT_ID: "com.example.native",
      APPLE_PRIVATE_KEY:
        "-----BEGIN PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY-----",
      APPLE_SESSION_SECRET: "session-secret",
      APPLE_TEAM_ID: "team-id",
      APPLE_WEB_CLIENT_ID: "com.example.web",
      APPLE_WEB_REDIRECT_URI: "https://example.com/api/auth/apple/callback",
      NEXT_PUBLIC_SITE_URL: "https://example.com",
      PUSH_INSTALLATIONS_DB: { prepare: vi.fn() },
    };

    cloudflareMocks.getAppServerEnv.mockResolvedValue(env);
    cloudflareMocks.requirePrimaryDatabase.mockReturnValue({
      prepare: vi.fn(),
    });
    authMocks.createAppleStateToken.mockResolvedValue("state-token");
    authMocks.sanitizeReturnTo.mockImplementation((value) => value ?? "/saved");
    authMocks.verifyAppleStateToken.mockResolvedValue({ returnTo: "/saved" });
    authMocks.createAuthSession.mockResolvedValue({
      expiresAt: "2026-05-11T10:00:00.000Z",
      sessionToken: "session-token",
    });
    authMocks.getAuthenticatedSession.mockResolvedValue({
      expiresAt: "2026-05-11T10:00:00.000Z",
      platform: "web",
      sessionId: "session-1",
      user: {
        displayName: "Reader",
        email: "reader@example.com",
        emailVerified: true,
        id: "user-1",
        isPrivateEmail: false,
      },
      userId: "user-1",
    });
    authMocks.readSessionToken.mockReturnValue("session-token");
    appleAuthMocks.getAppleWebClientId.mockReturnValue("com.example.web");
    appleAuthMocks.getAppleNativeClientId.mockReturnValue("com.example.native");
    appleAuthMocks.parseAppleUserPayload.mockReturnValue({
      email: "reader@example.com",
      name: { firstName: "Reader", lastName: "McRead" },
    });
    appleAuthMocks.buildAppleDisplayName.mockReturnValue("Reader McRead");
    savedWordMocks.listSavedWords.mockResolvedValue([
      {
        description: "A software system granted just enough initiative.",
        href: "/dictionary/agent",
        savedAt: "2026-04-11T10:00:00.000Z",
        slug: "agent",
        title: "Agent",
      },
    ]);
    savedWordMocks.getSavedWordsSyncMetadata.mockResolvedValue({
      lastSyncedAt: "2026-04-11T10:05:00.000Z",
      savedWordCount: 1,
    });
  });

  it("starts Apple web sign in with a redirect", async () => {
    const response = await appleStart(
      new Request("https://example.com/api/auth/apple/start?returnTo=/saved"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "https://appleid.apple.com/auth/authorize",
    );
    expect(response.headers.get("location")).toContain("state=state-token");
    expect(response.headers.get("location")).toContain("response_mode=form_post");
    expect(response.headers.get("location")).toContain("client_id=com.example.web");
  });

  it("exchanges a web callback for a session", async () => {
    appleAuthMocks.exchangeAppleAuthorizationCode.mockResolvedValue({
      email: "reader@example.com",
      emailVerified: true,
      isPrivateEmail: false,
      sub: "apple-sub-1",
    });
    authMocks.upsertAppleUser.mockResolvedValue({
      displayName: "Reader McRead",
      email: "reader@example.com",
      emailVerified: true,
      id: "user-1",
      isPrivateEmail: false,
    });

    const formData = new FormData();
    formData.set("code", "web-code");
    formData.set("state", "state-token");
    formData.set("user", JSON.stringify({ email: "reader@example.com" }));

    const response = await appleCallback(
      new Request("https://example.com/api/auth/apple/callback", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.com/saved?apple=ok",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "devils_dict_session=session-token",
    );
    expect(appleAuthMocks.exchangeAppleAuthorizationCode).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationCode: "web-code",
        clientId: "com.example.web",
        redirectUri: "https://example.com/api/auth/apple/callback",
      }),
    );
  });

  it("exchanges a native code for a session token", async () => {
    appleAuthMocks.exchangeAppleAuthorizationCode.mockResolvedValue({
      email: "native@example.com",
      emailVerified: true,
      isPrivateEmail: false,
      sub: "apple-sub-2",
    });
    authMocks.upsertAppleUser.mockResolvedValue({
      displayName: "Native Reader",
      email: "native@example.com",
      emailVerified: true,
      id: "user-2",
      isPrivateEmail: false,
    });

    const response = await appleNative(
      new Request("https://example.com/api/auth/apple/native", {
        body: JSON.stringify({
          authorizationCode: "native-code",
          givenName: "Native",
          familyName: "Reader",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      savedWords: [
        {
          slug: "agent",
        },
      ],
      sessionToken: "session-token",
      user: {
        email: "native@example.com",
        id: "user-2",
      },
    });
  });

  it("returns the current session and user", async () => {
    const response = await sessionGet(
      new Request("https://example.com/api/auth/session", {
        headers: {
          cookie: "devils_dict_session=session-token",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authenticated: true,
      lastSyncedAt: "2026-04-11T10:05:00.000Z",
      platform: "web",
      savedWordCount: 1,
      user: {
        id: "user-1",
      },
    });
  });

  it("logs out an authenticated session", async () => {
    const response = await logoutPost(
      new Request("https://example.com/api/auth/logout", {
        headers: {
          cookie: "devils_dict_session=session-token",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(authMocks.revokeSession).toHaveBeenCalledWith(
      expect.any(Object),
      "session-token",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "devils_dict_session=",
    );
  });
});
