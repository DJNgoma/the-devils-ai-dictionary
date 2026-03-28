import type {
  D1DatabaseLike,
  PushDeliveryEnvironment,
  PushOptInStatus,
} from "@/lib/server/cloudflare-context";

export type PushInstallationInput = {
  token: string;
  platform: "ios";
  environment: PushDeliveryEnvironment;
  optInStatus: PushOptInStatus;
  appVersion: string;
  locale: string;
};

export type PushInstallationRecord = PushInstallationInput & {
  lastSuccessAt: string | null;
  updatedAt: string;
};

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
          updated_at,
          last_success_at
        )
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), NULL)
        ON CONFLICT(token) DO UPDATE SET
          platform = excluded.platform,
          environment = excluded.environment,
          opt_in_status = excluded.opt_in_status,
          app_version = excluded.app_version,
          locale = excluded.locale,
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
    )
    .run();
}

export async function markPushInstallationSuccess(
  database: D1DatabaseLike,
  token: string,
) {
  await database
    .prepare(
      `
        UPDATE push_installations
        SET
          last_success_at = datetime('now'),
          updated_at = datetime('now')
        WHERE token = ?
      `,
    )
    .bind(token)
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
          opt_in_status = 'unknown',
          updated_at = datetime('now')
        WHERE token = ?
      `,
    )
    .bind(token)
    .run();
}

export async function listTargetInstallations(
  database: D1DatabaseLike,
  token?: string,
) {
  const baseQuery = `
    SELECT
      token,
      platform,
      environment,
      opt_in_status AS optInStatus,
      app_version AS appVersion,
      locale,
      updated_at AS updatedAt,
      last_success_at AS lastSuccessAt
    FROM push_installations
    WHERE platform = 'ios'
      AND opt_in_status = 'authorized'
  `;

  if (token) {
    const statement = database
      .prepare(`${baseQuery} AND token = ? ORDER BY updated_at DESC LIMIT 1`)
      .bind(token);
    const record = await statement.first<PushInstallationRecord>();
    return record ? [record] : [];
  }

  const result = await database
    .prepare(`${baseQuery} ORDER BY updated_at DESC LIMIT 20`)
    .all<PushInstallationRecord>();

  return result.results;
}
