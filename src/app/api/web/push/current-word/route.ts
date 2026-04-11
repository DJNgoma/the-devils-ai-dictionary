import { NextResponse } from "next/server";
import { getTodayWord } from "@/lib/content";
import { createWebPushNotificationText } from "@/lib/server/web-push";

export const dynamic = "force-dynamic";

export async function GET() {
  const entry = await getTodayWord();

  if (!entry) {
    return NextResponse.json(
      {
        error: "No daily word is available right now.",
        ok: false,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    body: createWebPushNotificationText(entry),
    ok: true,
    slug: entry.slug,
    title: entry.title,
    url: `/dictionary/${entry.slug}`,
  });
}
