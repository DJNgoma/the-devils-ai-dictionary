import type {
  ClientPushOptInStatus,
  D1DatabaseLike,
  PushInstallationPlatform,
  PushDeliveryEnvironment,
  PushInstallationStatus,
} from "@/lib/server/cloudflare-context";

export type PushInstallationInput = {
  token: string;
  platform: PushInstallationPlatform;
  environment: PushDeliveryEnvironment;
  optInStatus: ClientPushOptInStatus;
  appVersion: string;
  locale: string;
  preferredDeliveryHour?: number | null;
  timeZone?: string | null;
};

export const pushDeliveryClaimHoldMinutes = 20;

export type PushInstallationRecord = Omit<PushInstallationInput, "optInStatus"> & {
  optInStatus: PushInstallationStatus;
  lastSuccessAt: string | null;
  lastSuccessDateKey: string | null;
  deliveryClaimDateKey: string | null;
  deliveryClaimedAt: string | null;
  updatedAt: string;
};

function affectedRowCount(result: {
  changes?: number;
  meta?: { changes?: number };
}) {
  if (typeof result.meta?.changes === "number") {
    return result.meta.changes;
  }

  if (typeof result.changes === "number") {
    return result.changes;
  }

  return 0;
}

export async function upsertPushInstallation(
  database: D1DatabaseLike,
  installation: PushInstallationInput,
) {
  await database
    .prepare(
      `
        INSERT INTO push_installations (
          token,
          platform,
          environment,
          opt_in_status,
          app_version,
          locale,
          preferred_delivery_hour,
          time_zone,
          updated_at,
          last_success_at,
          last_success_date_key,
          delivery_claim_date_key,
          delivery_claimed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL, NULL, NULL, NULL)
        ON CONFLICT(token) DO UPDATE SET
          platform = excluded.platform,
          environment = excluded.environment,
          opt_in_status = excluded.opt_in_status,
          app_version = excluded.app_version,
          locale = excluded.locale,
          preferred_delivery_hour = excluded.preferred_delivery_hour,
          time_zone = excluded.time_zone,
          updated_at = datetime('now')
      `,
    )
    .bind(
      installation.token,
      installation.platform,
      installation.environment,
      installation.optInStatus,
      installation.appVersion,
      installation.locale,
      installation.preferredDeliveryHour ?? null,
      installation.timeZone ?? null,
    )
    .run();
}

export async function markPushInstallationSuccess(
  database: D1DatabaseLike,
  token: string,
  deliveryDateKey: string,
) {
  await database
    .prepare(
      `
        UPDATE push_installations
        SET
          last_success_at = datetime('now'),
          last_success_date_key = ?,
          delivery_claim_date_key = NULL,
          delivery_claimed_at = NULL,
          updated_at = datetime('now')
        WHERE token = ?
      `,
    )
    .bind(deliveryDateKey, token)
    .run();
}

export async function markPushInstallationInvalid(
  database: D1DatabaseLike,
  token: string,
) {
  await database
    .prepare(
      `
        UPDATE push_installations
        SET
          opt_in_status = 'invalid',
          delivery_claim_date_key = NULL,
          delivery_claimed_at = NULL,
          updated_at = datetime('now')
        WHERE token = ?
      `,
    )
    .bind(token)
    .run();
}

export async function claimPushInstallationDelivery(
  database: D1DatabaseLike,
  token: string,
  deliveryDateKey: string,
) {
  const result = await database
    .prepare(
      `
        UPDATE push_installations
        SET
          delivery_claim_date_key = ?,
          delivery_claimed_at = datetime('now'),
          updated_at = datetime('now')
        WHERE token = ?
          AND opt_in_status = 'authorized'
          AND (
            last_success_date_key IS NULL
            OR last_success_date_key != ?
          )
          AND (
            delivery_claim_date_key IS NULL
            OR delivery_claim_date_key != ?
            OR delivery_claimed_at IS NULL
            OR datetime(delivery_claimed_at) <= datetime('now', '-${pushDeliveryClaimHoldMinutes} minutes')
          )
      `,
    )
    .bind(
      deliveryDateKey,
      token,
      deliveryDateKey,
      deliveryDateKey,
    )
    .run();

  return affectedRowCount(result) > 0;
}

export async function listTargetInstallations(
  database: D1DatabaseLike,
  token?: string,
  platform?: PushInstallationPlatform,
) {
  const conditions = ["opt_in_status = 'authorized'"];
  const bindings: unknown[] = [];

  if (platform) {
    conditions.push("platform = ?");
    bindings.push(platform);
  }

  const baseQuery = `
    SELECT
      token,
      platform,
      environment,
      opt_in_status AS optInStatus,
      app_version AS appVersion,
      locale,
      preferred_delivery_hour AS preferredDeliveryHour,
      time_zone AS timeZone,
      updated_at AS updatedAt,
      last_success_at AS lastSuccessAt,
      last_success_date_key AS lastSuccessDateKey,
      delivery_claim_date_key AS deliveryClaimDateKey,
      delivery_claimed_at AS deliveryClaimedAt
    FROM push_installations
    WHERE ${conditions.join(" AND ")}
  `;

  if (token) {
    const statement = database
      .prepare(`${baseQuery} AND token = ? ORDER BY updated_at DESC LIMIT 1`)
      .bind(...bindings, token);
    const record = await statement.first<PushInstallationRecord>();
    return record ? [record] : [];
  }

  const result = await database
    .prepare(`${baseQuery} ORDER BY updated_at DESC`)
    .bind(...bindings)
    .all<PushInstallationRecord>();

  return result.results;
}
