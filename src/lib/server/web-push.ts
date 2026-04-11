import type { Entry } from "@/lib/content";

type WebPushCredentials = {
  privateKey: string;
  publicKey: string;
  subject: string;
};

export type WebPushSendResult = {
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

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return new Uint8Array(Buffer.from(padded, "base64"));
}

function parsePublicKeyCoordinates(publicKey: string) {
  const decoded = base64UrlDecode(publicKey);

  if (decoded.length !== 65 || decoded[0] !== 0x04) {
    throw new Error("WEB_PUSH_VAPID_PUBLIC_KEY is not a valid uncompressed P-256 public key.");
  }

  return {
    x: base64UrlEncode(decoded.subarray(1, 33)),
    y: base64UrlEncode(decoded.subarray(33, 65)),
  };
}

function derToJoseSignature(signature: Uint8Array) {
  if (signature[0] !== 0x30) {
    throw new Error("Unexpected ECDSA signature format.");
  }

  let offset = 1;
  const sequenceLength = signature[offset];
  offset += 1;

  if (sequenceLength + 2 !== signature.length) {
    throw new Error("Unexpected ECDSA sequence length.");
  }

  if (signature[offset] !== 0x02) {
    throw new Error("Missing ECDSA R component.");
  }
  offset += 1;
  const rLength = signature[offset];
  offset += 1;
  const r = signature.subarray(offset, offset + rLength);
  offset += rLength;

  if (signature[offset] !== 0x02) {
    throw new Error("Missing ECDSA S component.");
  }
  offset += 1;
  const sLength = signature[offset];
  offset += 1;
  const s = signature.subarray(offset, offset + sLength);

  const jose = new Uint8Array(64);
  jose.set(r.subarray(Math.max(0, r.length - 32)), 32 - Math.min(32, r.length));
  jose.set(s.subarray(Math.max(0, s.length - 32)), 64 - Math.min(32, s.length));
  return jose;
}

async function createVapidJwt({
  audience,
  credentials,
}: {
  audience: string;
  credentials: WebPushCredentials;
}) {
  const header = {
    alg: "ES256",
    typ: "JWT",
  };
  const claims = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    sub: credentials.subject,
  };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const { x, y } = parsePublicKeyCoordinates(credentials.publicKey);
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      crv: "P-256",
      d: credentials.privateKey,
      ext: false,
      key_ops: ["sign"],
      kty: "EC",
      x,
      y,
    },
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["sign"],
  );

  const rawSignature = new Uint8Array(
    await crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: "SHA-256",
      },
      key,
      new TextEncoder().encode(signingInput),
    ),
  );
  const normalizedSignature =
    rawSignature.length === 64
      ? rawSignature
      : derToJoseSignature(rawSignature);

  return `${signingInput}.${base64UrlEncode(normalizedSignature)}`;
}

export function createWebPushNotificationText(entry: Entry) {
  return entry.devilDefinition.trim().replace(/\s+/gu, " ");
}

export function isTerminalWebPushFailure(result: WebPushSendResult) {
  return !result.ok && (result.status === 404 || result.status === 410);
}

export async function sendCurrentWordWebPush({
  credentials,
  entry,
  token,
}: {
  credentials: WebPushCredentials;
  entry: Entry;
  token: string;
}): Promise<WebPushSendResult> {
  const audience = new URL(token).origin;
  const vapidJwt = await createVapidJwt({
    audience,
    credentials,
  });

  const response = await fetch(token, {
    method: "POST",
    headers: {
      authorization: `vapid t=${vapidJwt}, k=${credentials.publicKey}`,
      "crypto-key": `p256ecdsa=${credentials.publicKey}`,
      topic: `daily-word-${entry.slug}`,
      ttl: "3600",
      urgency: "normal",
    },
  });

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      token,
    };
  }

  const reason = await response.text().catch(() => response.statusText);

  return {
    ok: false,
    status: response.status,
    reason: reason || response.statusText,
    token,
  };
}
