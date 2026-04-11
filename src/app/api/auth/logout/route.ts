import { NextResponse } from "next/server";
import {
  readSessionToken,
  revokeSession,
  SESSION_COOKIE_NAME,
} from "@/lib/server/auth";
import {
  getAppServerEnv,
  requirePrimaryDatabase,
} from "@/lib/server/cloudflare-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const env = await getAppServerEnv();
    const sessionToken = readSessionToken(request);

    if (sessionToken) {
      await revokeSession(requirePrimaryDatabase(env), sessionToken);
    }

    const response = NextResponse.json({
      ok: true,
    });

    response.cookies.set({
      httpOnly: true,
      maxAge: 0,
      name: SESSION_COOKIE_NAME,
      path: "/",
      sameSite: "lax",
      value: "",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Logout failed.",
        ok: false,
      },
      { status: 500 },
    );
  }
}
