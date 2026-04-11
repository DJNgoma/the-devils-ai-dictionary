import { NextResponse } from "next/server";
import {
  getAuthenticatedSession,
  readSessionToken,
} from "@/lib/server/auth";
import {
  getAppServerEnv,
  requirePrimaryDatabase,
} from "@/lib/server/cloudflare-context";
import { getSavedWordsSyncMetadata } from "@/lib/server/saved-words";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const sessionToken = readSessionToken(request);

    if (!sessionToken) {
      return NextResponse.json({
        authenticated: false,
        ok: true,
      });
    }

    const env = await getAppServerEnv();
    const database = requirePrimaryDatabase(env);
    const session = await getAuthenticatedSession(database, sessionToken);

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        ok: true,
      });
    }

    const syncMetadata = await getSavedWordsSyncMetadata(
      database,
      session.user.id,
    );

    return NextResponse.json({
      authenticated: true,
      lastSyncedAt: syncMetadata.lastSyncedAt,
      ok: true,
      platform: session.platform,
      savedWordCount: syncMetadata.savedWordCount,
      user: session.user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Session lookup failed.",
        ok: false,
      },
      { status: 500 },
    );
  }
}
