import { NextResponse } from "next/server";
import { getMobilePushEnv } from "@/lib/server/cloudflare-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = await getMobilePushEnv();
  const enabled = Boolean(
    env.WEB_PUSH_VAPID_PUBLIC_KEY &&
      env.WEB_PUSH_VAPID_PRIVATE_KEY &&
      env.WEB_PUSH_VAPID_SUBJECT,
  );

  return NextResponse.json({
    enabled,
    publicKey: enabled ? env.WEB_PUSH_VAPID_PUBLIC_KEY : null,
  });
}
