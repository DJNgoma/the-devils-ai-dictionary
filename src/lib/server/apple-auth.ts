import type { MobilePushEnv } from "@/lib/server/cloudflare-context";

type AppleIdentityTokenClaims = {
  aud: string | string[];
  email?: string;
  email_verified?: boolean | string;
  exp: number;
  iat: number;
  is_private_email?: boolean | string;
  iss: string;
  sub: string;
};

type AppleTokenResponse = {
  error?: string;
  error_description?: string;
  id_token?: string;
};

type AppleUserPayload = {
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
};

type AppleJwk = {
  e: string;
  kid: string;
  kty: string;
  n: string;
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

function decodePemKey(privateKey: string) {
  const normalized = privateKey
    .replaceAll("\\n", "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/u, "")
    .replace(/-----END PRIVATE KEY-----/u, "")
    .replace(/\s+/gu, "");

  return Buffer.from(normalized, "base64");
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

function parseJwtPart<T>(token: string, index: number) {
  const part = token.split(".")[index];

  if (!part) {
    throw new Error("Apple identity token was incomplete.");
  }

  return JSON.parse(Buffer.from(base64UrlDecode(part)).toString("utf8")) as T;
}

function normalizeBoolean(value: boolean | string | undefined) {
  if (typeof value === "boolean") {
    return value;
  }

  return value === "true";
}

async function createAppleClientSecret({
  clientId,
  env,
}: {
  clientId: string;
  env: MobilePushEnv;
}) {
  const teamId = env.APPLE_TEAM_ID;
  const keyId = env.APPLE_KEY_ID;
  const privateKey = env.APPLE_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    throw new Error(
      "Apple auth is missing APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_PRIVATE_KEY.",
    );
  }

  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: "https://appleid.apple.com",
    exp: now + 5 * 60,
    iat: now,
    iss: teamId,
    sub: clientId,
  };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    decodePemKey(privateKey),
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

async function fetchAppleKeys() {
  const response = await fetch("https://appleid.apple.com/auth/keys", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Apple signing keys could not be fetched.");
  }

  const body = (await response.json()) as { keys?: AppleJwk[] };

  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error("Apple signing keys were missing.");
  }

  return body.keys;
}

async function verifyIdentityToken({
  clientId,
  identityToken,
}: {
  clientId: string;
  identityToken: string;
}) {
  const header = parseJwtPart<{ alg?: string; kid?: string }>(identityToken, 0);

  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error(
      "Apple identity token used an unexpected signing algorithm.",
    );
  }

  const [encodedHeader, encodedPayload, encodedSignature] =
    identityToken.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Apple identity token was incomplete.");
  }

  const keys = await fetchAppleKeys();
  const signingKey = keys.find(
    (key) => key.kid === header.kid && key.kty === "RSA" && key.n && key.e,
  );

  if (!signingKey) {
    throw new Error("No Apple signing key matched the identity token.");
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      alg: "RS256",
      e: signingKey.e,
      ext: true,
      key_ops: ["verify"],
      kty: "RSA",
      n: signingKey.n,
    },
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"],
  );

  const isValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlDecode(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );

  if (!isValid) {
    throw new Error("Apple identity token signature could not be verified.");
  }

  const claims = parseJwtPart<AppleIdentityTokenClaims>(identityToken, 1);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];

  if (claims.iss !== "https://appleid.apple.com") {
    throw new Error("Apple identity token issuer was not valid.");
  }

  if (!audiences.includes(clientId)) {
    throw new Error("Apple identity token audience did not match this client.");
  }

  if (claims.exp * 1000 <= Date.now()) {
    throw new Error("Apple identity token expired.");
  }

  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new Error("Apple identity token did not include a subject.");
  }

  return claims;
}

export async function verifyAppleIdentityToken({
  clientId,
  identityToken,
}: {
  clientId: string;
  identityToken: string;
}) {
  const claims = await verifyIdentityToken({
    clientId,
    identityToken,
  });

  return {
    email: claims.email ?? null,
    emailVerified: normalizeBoolean(claims.email_verified),
    isPrivateEmail: normalizeBoolean(claims.is_private_email),
    sub: claims.sub,
  };
}

export function getAppleWebClientId(env: MobilePushEnv) {
  if (!env.APPLE_WEB_CLIENT_ID) {
    throw new Error("Apple web sign-in requires APPLE_WEB_CLIENT_ID.");
  }

  return env.APPLE_WEB_CLIENT_ID;
}

export function getAppleNativeClientId(env: MobilePushEnv) {
  return env.APPLE_NATIVE_CLIENT_ID ?? env.APNS_BUNDLE_ID ?? null;
}

export function parseAppleUserPayload(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AppleUserPayload;
  } catch {
    return null;
  }
}

export async function exchangeAppleAuthorizationCode({
  authorizationCode,
  clientId,
  env,
  redirectUri,
}: {
  authorizationCode: string;
  clientId: string;
  env: MobilePushEnv;
  redirectUri?: string;
}) {
  const clientSecret = await createAppleClientSecret({
    clientId,
    env,
  });
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: authorizationCode,
    grant_type: "authorization_code",
  });

  if (redirectUri) {
    body.set("redirect_uri", redirectUri);
  }

  const response = await fetch("https://appleid.apple.com/auth/token", {
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const payload = (await response.json()) as AppleTokenResponse;

  if (!response.ok || !payload.id_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        "Apple refused the authorization code exchange.",
    );
  }

  const claims = await verifyIdentityToken({
    clientId,
    identityToken: payload.id_token,
  });
  return {
    email: claims.email ?? null,
    emailVerified: normalizeBoolean(claims.email_verified),
    isPrivateEmail: normalizeBoolean(claims.is_private_email),
    sub: claims.sub,
  };
}

export function buildAppleDisplayName({
  email,
  providedDisplayName,
  userPayload,
}: {
  email?: string | null;
  providedDisplayName?: string | null;
  userPayload?: AppleUserPayload | null;
}) {
  const trimmedProvided = providedDisplayName?.trim();

  if (trimmedProvided) {
    return trimmedProvided;
  }

  const name = [userPayload?.name?.firstName, userPayload?.name?.lastName]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ");

  if (name) {
    return name;
  }

  return email?.trim() || null;
}
