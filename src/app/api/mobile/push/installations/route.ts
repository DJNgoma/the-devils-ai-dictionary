import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clientPushOptInStatuses,
  type ClientPushOptInStatus,
  getMobilePushEnv,
  pushInstallationPlatforms,
  type PushInstallationPlatform,
  requirePushInstallationsDatabase,
} from "@/lib/server/cloudflare-context";
import { upsertPushInstallation } from "@/lib/server/push-installations";

export const dynamic = "force-dynamic";

const installationSchema = z.object({
  appVersion: z.string().trim().min(1).max(64),
  environment: z.enum(["development", "production"]),
  locale: z.string().trim().min(1).max(35),
  preferredDeliveryHour: z.number().int().min(0).max(23).nullable().optional(),
  optInStatus: z.enum(
    clientPushOptInStatuses satisfies readonly [
      ClientPushOptInStatus,
      ...ClientPushOptInStatus[],
    ],
  ),
  platform: z.enum(
    pushInstallationPlatforms satisfies readonly [
      PushInstallationPlatform,
      ...PushInstallationPlatform[],
    ],
  ),
  timeZone: z.string().trim().min(1).max(64).nullable().optional(),
  token: z.string().trim().min(1).max(4096),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Request body is not valid JSON.",
        ok: false,
      },
      { status: 400 },
    );
  }

  const parsed = installationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid installation payload.",
        issues: parsed.error.issues,
        ok: false,
      },
      { status: 400 },
    );
  }

  try {
    const env = await getMobilePushEnv();
    const database = requirePushInstallationsDatabase(env);

    await upsertPushInstallation(database, parsed.data);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Push installation failed.",
        ok: false,
      },
      { status: 500 },
    );
  }
}
