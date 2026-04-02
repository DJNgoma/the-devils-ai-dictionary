import { NextResponse } from "next/server";
import { z } from "zod";
import generatedData from "@/generated/entries.generated.json";
import type { Entry } from "@/lib/content";
import {
  getMobilePushEnv,
  requirePushInstallationsDatabase,
} from "@/lib/server/cloudflare-context";
import {
  isTerminalApnsFailure,
  sendCurrentWordPush,
} from "@/lib/server/apns";
import {
  listTargetInstallations,
  markPushInstallationInvalid,
  markPushInstallationSuccess,
} from "@/lib/server/push-installations";

export const dynamic = "force-dynamic";

const testSendSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  token: z.string().trim().min(1).optional(),
});

const entries = generatedData.entries as Entry[];
const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));

function pickEntry(slug?: string) {
  if (slug) {
    return entryBySlug.get(slug);
  }

  if (entries.length === 0) {
    return undefined;
  }

  const index = Math.floor(Math.random() * entries.length);
  return entries[index];
}

function isAuthorized(request: Request, secret: string | undefined) {
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  try {
    const env = await getMobilePushEnv();

    if (!isAuthorized(request, env.PUSH_TEST_SEND_SECRET)) {
      return NextResponse.json(
        {
          error: "Unauthorized push test send.",
          ok: false,
        },
        { status: 401 },
      );
    }

    const payload = testSendSchema.parse(await request.json());
    const database = requirePushInstallationsDatabase(env);
    const entry = pickEntry(payload.slug);

    if (!entry) {
      return NextResponse.json(
        {
          error: payload.slug
            ? `Entry "${payload.slug}" was not found.`
            : "No entries are available for push testing.",
          ok: false,
        },
        { status: 404 },
      );
    }

    if (
      !env.APNS_BUNDLE_ID ||
      !env.APNS_KEY_ID ||
      !env.APNS_PRIVATE_KEY ||
      !env.APNS_TEAM_ID
    ) {
      throw new Error("APNs credentials are not fully configured.");
    }

    const credentials = {
      bundleId: env.APNS_BUNDLE_ID,
      keyId: env.APNS_KEY_ID,
      privateKey: env.APNS_PRIVATE_KEY,
      teamId: env.APNS_TEAM_ID,
    };

    const installations = await listTargetInstallations(database, payload.token);

    if (installations.length === 0) {
      return NextResponse.json(
        {
          error: "No authorized iOS installations were found.",
          ok: false,
        },
        { status: 404 },
      );
    }

    const results = await Promise.all(
      installations.map(async (installation) => {
        const result = await sendCurrentWordPush({
          credentials: {
            bundleId: credentials.bundleId,
            environment: installation.environment,
            keyId: credentials.keyId,
            privateKey: credentials.privateKey,
            teamId: credentials.teamId,
          },
          entry,
          token: installation.token,
        });

        if (result.ok) {
          await markPushInstallationSuccess(database, installation.token);
        } else if (isTerminalApnsFailure(result)) {
          await markPushInstallationInvalid(database, installation.token);
        }

        return result;
      }),
    );

    return NextResponse.json({
      entry: {
        slug: entry.slug,
        title: entry.title,
      },
      ok: results.some((result) => result.ok),
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid push test payload.",
          issues: error.issues,
          ok: false,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Push test send failed.",
        ok: false,
      },
      { status: 500 },
    );
  }
}
