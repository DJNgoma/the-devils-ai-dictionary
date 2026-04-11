import type { D1DatabaseLike } from "@/lib/server/cloudflare-context";

export const SESSION_COOKIE_NAME = "devils_dict_session";
const APPLE_STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export type SessionPlatform = "web" | "ios";

export type AuthenticatedUser = {
  id: string;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  isPrivateEmail: boolean;
};

export type AuthSessionRecord = {
  sessionId: string;
  userId: string;
  platform: SessionPlatform;
  expiresAt: string;
  user: AuthenticatedUser;
};

export type AppleUserUpsertInput = {
  sub: string;
  email?: string | null;
  emailVerified?: boolean;
  isPrivateEmail?: boolean;
  displayName?: string | null;
};

type AuthenticatedSessionRow = {
  sessionId: string;
  userId: string;
  platform: SessionPlatform;
  expiresAt: string;
  displayName: string | null;
  email: string | null;
  emailVerified: number | string | boolean | null;
  id: string;
  isPrivateEmail: number | string | boolean | null;
};

type AuthenticatedUserRow = {
  displayName: string | null;
  email: string | null;
  emailVerified: number | string | boolean | null;
  id: string;
  isPrivateEmail: number | string | boolean | null;
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

async function hmacSha256(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)),
  );
}

function coerceBoolean(value: number | string | boolean | null | undefined) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true";
  }

  return false;
}

function toUser(row: AuthenticatedUserRow): AuthenticatedUser {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    emailVerified: coerceBoolean(row.emailVerified),
    isPrivateEmail: coerceBoolean(row.isPrivateEmail),
  };
}

export async function hashOpaqueToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );

  return base64UrlEncode(digest);
}

export function createOpaqueToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64UrlEncode(value);
}

export function sanitizeReturnTo(returnTo: string | null | undefined) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/saved";
  }

  return returnTo;
}

export async function createAppleStateToken({
  sessionSecret,
  returnTo,
}: {
  sessionSecret: string;
  returnTo: string;
}) {
  const payload = {
    issuedAt: Date.now(),
    nonce: createOpaqueToken(18),
    returnTo: sanitizeReturnTo(returnTo),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    await hmacSha256(sessionSecret, encodedPayload),
  );

  return `${encodedPayload}.${signature}`;
}

export async function verifyAppleStateToken({
  sessionSecret,
  token,
}: {
  sessionSecret: string;
  token: string;
}) {
  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    throw new Error("Apple sign-in state was malformed.");
  }

  const expectedSignature = base64UrlEncode(
    await hmacSha256(sessionSecret, encodedPayload),
  );

  if (expectedSignature !== encodedSignature) {
    throw new Error("Apple sign-in state could not be verified.");
  }

  const payload = JSON.parse(
    Buffer.from(base64UrlDecode(encodedPayload)).toString("utf8"),
  ) as {
    issuedAt?: number;
    returnTo?: string;
  };

  if (typeof payload.issuedAt !== "number") {
    throw new Error("Apple sign-in state was missing its timestamp.");
  }

  if (Date.now() - payload.issuedAt > APPLE_STATE_TTL_MS) {
    throw new Error("Apple sign-in state expired.");
  }

  return {
    returnTo: sanitizeReturnTo(payload.returnTo ?? "/saved"),
  };
}

export function readCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(/;\s*/u)) {
    const [key, ...rest] = part.split("=");

    if (key === name) {
      return rest.join("=");
    }
  }

  return null;
}

export function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export function readSessionToken(request: Request) {
  return (
    readBearerToken(request) ?? readCookieValue(request, SESSION_COOKIE_NAME)
  );
}

export async function upsertAppleUser(
  database: D1DatabaseLike,
  input: AppleUserUpsertInput,
) {
  const now = new Date().toISOString();
  const userId = createOpaqueToken(16);

  await database
    .prepare(
      `
        INSERT INTO auth_users (
          id,
          apple_sub,
          email,
          email_verified,
          is_private_email,
          display_name,
          created_at,
          updated_at,
          last_signed_in_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(apple_sub) DO UPDATE SET
          email = COALESCE(excluded.email, auth_users.email),
          email_verified = CASE
            WHEN excluded.email_verified = 1 THEN 1
            ELSE auth_users.email_verified
          END,
          is_private_email = CASE
            WHEN excluded.email IS NOT NULL THEN excluded.is_private_email
            ELSE auth_users.is_private_email
          END,
          display_name = COALESCE(NULLIF(excluded.display_name, ''), auth_users.display_name),
          updated_at = excluded.updated_at,
          last_signed_in_at = excluded.last_signed_in_at
      `,
    )
    .bind(
      userId,
      input.sub,
      input.email ?? null,
      input.emailVerified ? 1 : 0,
      input.isPrivateEmail ? 1 : 0,
      input.displayName?.trim() || null,
      now,
      now,
      now,
    )
    .run();

  const row = await database
    .prepare(
      `
        SELECT
          id,
          display_name AS displayName,
          email,
          email_verified AS emailVerified,
          is_private_email AS isPrivateEmail
        FROM auth_users
        WHERE apple_sub = ?
        LIMIT 1
      `,
    )
    .bind(input.sub)
    .first<AuthenticatedUserRow>();

  if (!row) {
    throw new Error("Apple account could not be persisted.");
  }

  return toUser(row);
}

export async function createAuthSession({
  database,
  platform,
  userId,
}: {
  database: D1DatabaseLike;
  platform: SessionPlatform;
  userId: string;
}) {
  const sessionToken = createOpaqueToken(32);
  const sessionId = createOpaqueToken(16);
  const tokenHash = await hashOpaqueToken(sessionToken);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await database
    .prepare(
      `
        INSERT INTO auth_sessions (
          id,
          user_id,
          token_hash,
          platform,
          created_at,
          updated_at,
          expires_at,
          last_seen_at,
          revoked_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
    )
    .bind(sessionId, userId, tokenHash, platform, now, now, expiresAt, now)
    .run();

  return {
    expiresAt,
    sessionId,
    sessionToken,
  };
}

export async function getAuthenticatedSession(
  database: D1DatabaseLike,
  sessionToken: string,
) {
  const tokenHash = await hashOpaqueToken(sessionToken);
  const row = await database
    .prepare(
      `
        SELECT
          auth_sessions.id AS sessionId,
          auth_sessions.user_id AS userId,
          auth_sessions.platform AS platform,
          auth_sessions.expires_at AS expiresAt,
          auth_users.id AS id,
          auth_users.display_name AS displayName,
          auth_users.email AS email,
          auth_users.email_verified AS emailVerified,
          auth_users.is_private_email AS isPrivateEmail
        FROM auth_sessions
        INNER JOIN auth_users ON auth_users.id = auth_sessions.user_id
        WHERE auth_sessions.token_hash = ?
          AND auth_sessions.revoked_at IS NULL
        LIMIT 1
      `,
    )
    .bind(tokenHash)
    .first<AuthenticatedSessionRow>();

  if (!row) {
    return null;
  }

  if (Date.parse(row.expiresAt) <= Date.now()) {
    await revokeSession(database, sessionToken);
    return null;
  }

  const seenAt = new Date().toISOString();
  await database
    .prepare(
      `
        UPDATE auth_sessions
        SET
          last_seen_at = ?,
          updated_at = ?
        WHERE id = ?
      `,
    )
    .bind(seenAt, seenAt, row.sessionId)
    .run();

  return {
    expiresAt: row.expiresAt,
    platform: row.platform,
    sessionId: row.sessionId,
    user: toUser({
      displayName: row.displayName,
      email: row.email,
      emailVerified: row.emailVerified,
      id: row.id,
      isPrivateEmail: row.isPrivateEmail,
    }),
    userId: row.userId,
  } satisfies AuthSessionRecord;
}

export async function revokeSession(
  database: D1DatabaseLike,
  sessionToken: string,
) {
  const tokenHash = await hashOpaqueToken(sessionToken);
  const now = new Date().toISOString();

  await database
    .prepare(
      `
        UPDATE auth_sessions
        SET
          revoked_at = ?,
          updated_at = ?
        WHERE token_hash = ?
      `,
    )
    .bind(now, now, tokenHash)
    .run();
}
