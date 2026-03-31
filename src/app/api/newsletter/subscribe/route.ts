import { NextResponse } from "next/server";
import { z } from "zod";
import { absoluteUrl } from "@/lib/metadata";

export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  company: z.string().trim().max(200).optional(),
  email: z.email().max(320),
  sourcePath: z.string().trim().startsWith("/").max(200),
});

const genericSuccessMessage =
  "Check your inbox for the confirmation note. Buttondown will handle the double opt-in.";

export async function POST(request: Request) {
  try {
    const payload = subscriptionSchema.parse(await request.json());

    if (payload.company) {
      return NextResponse.json({
        message: genericSuccessMessage,
        ok: true,
      });
    }

    const apiKey = process.env.BUTTONDOWN_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          message:
            "Newsletter sign-up is not configured on this deployment yet. Please try again later.",
          ok: false,
        },
        { status: 503 },
      );
    }

    const ipAddress =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-real-ip") ??
      request.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim() ??
      undefined;

    const buttondownResponse = await fetch(
      "https://api.buttondown.com/v1/subscribers",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
          "X-Buttondown-Collision-Behavior": "add",
        },
        body: JSON.stringify({
          email_address: payload.email,
          ip_address: ipAddress,
          metadata: {
            digest: "weekly",
            sourcePath: payload.sourcePath,
          },
          referrer_url: absoluteUrl(payload.sourcePath),
          tags: ["website", "weekly-digest"],
          utm_campaign: "weekly_digest",
          utm_medium: "signup_form",
          utm_source: "website",
        }),
      },
    );

    if (
      buttondownResponse.ok ||
      buttondownResponse.status === 400 ||
      buttondownResponse.status === 409
    ) {
      return NextResponse.json({
        message: genericSuccessMessage,
        ok: true,
      });
    }

    if (buttondownResponse.status === 429) {
      return NextResponse.json(
        {
          message:
            "Too many sign-up attempts landed at once. Please try again in a few minutes.",
          ok: false,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        message:
          "The sign-up provider rejected that request. Please try again in a moment.",
        ok: false,
      },
      { status: 502 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          issues: error.issues,
          message: "Please enter a valid email address.",
          ok: false,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: "The sign-up did not land cleanly. Please try again in a moment.",
        ok: false,
      },
      { status: 500 },
    );
  }
}
