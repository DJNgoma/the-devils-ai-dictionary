import type { Entry } from "@/lib/content";

type FcmServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

export type FcmCredentials = {
  projectId: string;
  serviceAccountJson: string;
};

export type FcmSendResult = {
  ok: boolean;
  status: number;
  reason?: string;
  token: string;
};

const terminalFcmErrors = new Set([
  "UNREGISTERED",
  "INVALID_ARGUMENT",
  "SENDER_ID_MISMATCH",
]);

const fcmScope = "https://www.googleapis.com/auth/firebase.messaging";

type CachedAccessToken = {
  accessToken: string;
  expiresAtMs: number;
};

let cachedAccessToken: CachedAccessToken | null = null;

function base64UrlEncode(input: ArrayBuffer | Uint8Array | string) {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input);

  return Buffer.from(bytes)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodePemKey(privateKey: string) {
  const normalized = privateKey
    .replaceAll("\\n", "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/u, "")
    .replace(/-----END PRIVATE KEY-----/u, "")
    .replace(/\s+/gu, "");

  return Buffer.from(normalized, "base64");
}

function parseServiceAccount(serviceAccountJson: string): FcmServiceAccount {
  try {
    const parsed = JSON.parse(serviceAccountJson) as Partial<FcmServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("Missing client_email or private_key");
    }
    return parsed as FcmServiceAccount;
  } catch (error) {
    throw new Error(
      `FCM_SERVICE_ACCOUNT_JSON is not valid JSON: ${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
  }
}

async function createGoogleOAuthJwt(account: FcmServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: account.client_email,
    scope: fcmScope,
    aud: account.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    decodePemKey(account.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function getFcmAccessToken(
  account: FcmServiceAccount,
): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now() + 60_000) {
    return cachedAccessToken.accessToken;
  }

  const jwt = await createGoogleOAuthJwt(account);
  const response = await fetch(
    account.token_uri ?? "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }).toString(),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `FCM OAuth token exchange failed with ${response.status}: ${body}`,
    );
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error("FCM OAuth token exchange returned no access_token");
  }

  const expiresInMs = (payload.expires_in ?? 3600) * 1000;
  cachedAccessToken = {
    accessToken: payload.access_token,
    expiresAtMs: Date.now() + expiresInMs,
  };
  return payload.access_token;
}

function createFcmMessage({
  entry,
  sentAt,
  token,
}: {
  entry: Entry;
  sentAt: string;
  token: string;
}) {
  const devilLine = entry.devilDefinition.trim().replace(/\s+/gu, " ");
  return {
    message: {
      token,
      notification: {
        title: entry.title,
        body: devilLine,
      },
      data: {
        slug: entry.slug,
        source: "notificationTap",
        sent_at: sentAt,
      },
      android: {
        priority: "HIGH",
        notification: {
          channel_id: "daily-word",
          click_action: "OPEN_ENTRY",
        },
      },
    },
  };
}

export function isTerminalFcmFailure(result: FcmSendResult) {
  if (result.ok) {
    return false;
  }
  if (result.status === 404 || result.status === 403) {
    return true;
  }
  if (
    typeof result.reason === "string" &&
    terminalFcmErrors.has(result.reason)
  ) {
    return true;
  }
  return false;
}

export async function sendCurrentWordFcm({
  credentials,
  entry,
  token,
}: {
  credentials: FcmCredentials;
  entry: Entry;
  token: string;
}): Promise<FcmSendResult> {
  const sentAt = new Date().toISOString();
  const account = parseServiceAccount(credentials.serviceAccountJson);
  const accessToken = await getFcmAccessToken(account);

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(createFcmMessage({ entry, sentAt, token })),
    },
  );

  if (response.ok) {
    return { ok: true, status: response.status, token };
  }

  const body = (await response.json().catch(() => null)) as
    | { error?: { status?: string; message?: string } }
    | null;

  return {
    ok: false,
    status: response.status,
    reason: body?.error?.status ?? body?.error?.message,
    token,
  };
}
