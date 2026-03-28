import type { Entry } from "@/lib/content";
import type { PushDeliveryEnvironment } from "@/lib/server/cloudflare-context";

type ApnsCredentials = {
  bundleId: string;
  environment: PushDeliveryEnvironment;
  keyId: string;
  privateKey: string;
  teamId: string;
};

type CurrentWordPushPayload = {
  slug: string;
  source: "notificationTap";
  sent_at: string;
};

export type ApnsSendResult = {
  ok: boolean;
  status: number;
  reason?: string;
  token: string;
};

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

async function createApnsJwt({
  keyId,
  privateKey,
  teamId,
}: Pick<ApnsCredentials, "keyId" | "privateKey" | "teamId">) {
  const header = {
    alg: "ES256",
    kid: keyId,
  };
  const claims = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
  };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    decodePemKey(privateKey),
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function createNotificationBody(entry: Entry, sentAt: string) {
  const apsAlertBody = entry.devilDefinition.trim().replace(/\s+/gu, " ");
  const body: {
    aps: {
      alert: {
        body: string;
        title: string;
      };
      sound: "default";
    };
  } & CurrentWordPushPayload = {
    aps: {
      alert: {
        title: entry.title,
        body: apsAlertBody,
      },
      sound: "default",
    },
    slug: entry.slug,
    source: "notificationTap",
    sent_at: sentAt,
  };

  return JSON.stringify(body);
}

export async function sendCurrentWordPush({
  credentials,
  entry,
  token,
}: {
  credentials: ApnsCredentials;
  entry: Entry;
  token: string;
}): Promise<ApnsSendResult> {
  const sentAt = new Date().toISOString();
  const authToken = await createApnsJwt(credentials);
  const endpoint =
    credentials.environment === "development"
      ? "https://api.sandbox.push.apple.com"
      : "https://api.push.apple.com";
  const response = await fetch(`${endpoint}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${authToken}`,
      "apns-priority": "10",
      "apns-push-type": "alert",
      "apns-topic": credentials.bundleId,
      "content-type": "application/json",
    },
    body: createNotificationBody(entry, sentAt),
  });

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      token,
    };
  }

  const body = (await response.json().catch(() => null)) as
    | { reason?: string }
    | null;

  return {
    ok: false,
    status: response.status,
    reason: body?.reason,
    token,
  };
}
