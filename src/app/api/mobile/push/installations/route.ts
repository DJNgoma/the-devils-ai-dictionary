import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getMobilePushEnv,
  requirePushInstallationsDatabase,
  type PushOptInStatus,
} from "@/lib/server/cloudflare-context";
import { upsertPushInstallation } from "@/lib/server/push-installations";

export const dynamic = "force-dynamic";

const installationSchema = z.object({
  appVersion: z.string().trim().min(1),
  environment: z.enum(["development", "production"]),
  locale: z.string().trim().min(1),
  optInStatus: z.enum([
    "authorized",
    "denied",
    "ephemeral",
    "notDetermined",
    "provisional",
    "unsupported",
    "unknown",
  ] satisfies [PushOptInStatus, ...PushOptInStatus[]]),
  platform: z.literal("ios"),
  token: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = installationSchema.parse(await request.json());
    const env = await getMobilePushEnv();
    const database = requirePushInstallationsDatabase(env);

    await upsertPushInstallation(database, payload);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid installation payload.",
          issues: error.issues,
          ok: false,
        },
        { status: 400 },
      );
    }

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
