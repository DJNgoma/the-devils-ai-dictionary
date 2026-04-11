import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedSession,
  readSessionToken,
} from "@/lib/server/auth";
import {
  type D1DatabaseLike,
  getAppServerEnv,
  requirePrimaryDatabase,
} from "@/lib/server/cloudflare-context";
import {
  clearSavedWords,
  deleteSavedWord,
  getSavedWordsSyncMetadata,
  listSavedWords,
  replaceSavedWords,
  upsertSavedWords,
  upsertSavedWord,
} from "@/lib/server/saved-words";

export const dynamic = "force-dynamic";

const savedWordSchema = z.object({
  description: z.string().trim().min(1).optional(),
  href: z.string().trim().min(1),
  savedAt: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
});

const savedWordsCollectionPayloadSchema = z
  .object({
    replace: z.boolean().optional(),
    words: z.array(savedWordSchema),
  })
  .superRefine((payload, ctx) => {
    if (payload.words.length === 0 && payload.replace !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Saved-word collections must include at least one word unless replace=true.",
        path: ["words"],
      });
    }
  });

const savedWordsPayloadSchema = z.union([
  savedWordsCollectionPayloadSchema,
  savedWordSchema,
]);

async function requireSession(request: Request) {
  const sessionToken = readSessionToken(request);

  if (!sessionToken) {
    return null;
  }

  const env = await getAppServerEnv();
  const database = requirePrimaryDatabase(env);
  const session = await getAuthenticatedSession(database, sessionToken);

  if (!session) {
    return null;
  }

  return {
    database,
    session,
  };
}

async function buildSavedWordsResponse(
  database: D1DatabaseLike,
  userId: string,
  savedWords: Awaited<ReturnType<typeof listSavedWords>>,
) {
  const metadata = await getSavedWordsSyncMetadata(database, userId);

  return NextResponse.json({
    lastSyncedAt: metadata.lastSyncedAt,
    ok: true,
    savedWordCount: metadata.savedWordCount,
    savedWords,
    words: savedWords,
  });
}

export async function GET(request: Request) {
  try {
    const authenticated = await requireSession(request);

    if (!authenticated) {
      return NextResponse.json(
        {
          error: "Sign in is required to sync saved words.",
          ok: false,
        },
        { status: 401 },
      );
    }

    const savedWords = await listSavedWords(
      authenticated.database,
      authenticated.session.user.id,
    );

    return buildSavedWordsResponse(
      authenticated.database,
      authenticated.session.user.id,
      savedWords,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Saved words could not be loaded.",
        ok: false,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authenticated = await requireSession(request);

    if (!authenticated) {
      return NextResponse.json(
        {
          error: "Sign in is required to sync saved words.",
          ok: false,
        },
        { status: 401 },
      );
    }

    const payload = savedWordsPayloadSchema.parse(await request.json());

    if ("words" in payload) {
      const words = payload.replace
        ? await replaceSavedWords(
            authenticated.database,
            authenticated.session.user.id,
            payload.words,
          )
        : await upsertSavedWords(
            authenticated.database,
            authenticated.session.user.id,
            payload.words,
          );

      return buildSavedWordsResponse(
        authenticated.database,
        authenticated.session.user.id,
        words,
      );
    }

    const savedWord = await upsertSavedWord(
      authenticated.database,
      authenticated.session.user.id,
      payload,
    );

    const metadata = await getSavedWordsSyncMetadata(
      authenticated.database,
      authenticated.session.user.id,
    );

    return NextResponse.json({
      lastSyncedAt: metadata.lastSyncedAt,
      ok: true,
      savedWordCount: metadata.savedWordCount,
      savedWord,
      savedWords: [savedWord],
      words: [savedWord],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid saved-word payload.",
          issues: error.issues,
          ok: false,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Saved words could not be updated.",
        ok: false,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authenticated = await requireSession(request);

    if (!authenticated) {
      return NextResponse.json(
        {
          error: "Sign in is required to sync saved words.",
          ok: false,
        },
        { status: 401 },
      );
    }

    const requestUrl = new URL(request.url);
    const slugFromQuery = requestUrl.searchParams.get("slug")?.trim() || null;
    const bodyText = await request.text();
    const body = bodyText.trim().length === 0
      ? null
      : z.object({ slug: z.string().trim().min(1) }).parse(JSON.parse(bodyText));
    const slug = slugFromQuery ?? body?.slug ?? null;

    if (slug) {
      await deleteSavedWord(
        authenticated.database,
        authenticated.session.user.id,
        slug,
      );
    } else {
      await clearSavedWords(
        authenticated.database,
        authenticated.session.user.id,
      );
    }

    const savedWords = await listSavedWords(
      authenticated.database,
      authenticated.session.user.id,
    );

    return buildSavedWordsResponse(
      authenticated.database,
      authenticated.session.user.id,
      savedWords,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid delete payload.",
          issues: error.issues,
          ok: false,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Saved word could not be removed.",
        ok: false,
      },
      { status: 500 },
    );
  }
}
