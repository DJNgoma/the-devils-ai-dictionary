"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RandomEntryRedirectProps = {
  slugs: string[];
};

export function RandomEntryRedirect({ slugs }: RandomEntryRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    if (slugs.length === 0) {
      router.replace("/dictionary");
      return;
    }

    const randomSlug = slugs[Math.floor(Math.random() * slugs.length)];
    router.replace(`/dictionary/${randomSlug}`);
  }, [router, slugs]);

  return (
    <div className="page-shell py-16">
      <div className="surface mx-auto max-w-2xl p-8 text-center">
        <p className="page-kicker">Random</p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">
          Picking a term worth your time
        </h1>
        <p className="mt-4 text-base leading-8 text-foreground-soft">
          The redirect should happen immediately. If it does not, the manual escape
          hatch remains unfashionably reliable.
        </p>
        <div className="mt-6">
          <Link
            href="/dictionary"
            className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white hover:translate-y-[-1px] hover:opacity-92"
          >
            Browse the dictionary
          </Link>
        </div>
      </div>
    </div>
  );
}
