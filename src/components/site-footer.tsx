import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="hidden border-t border-line md:block">
      <div className="page-shell flex flex-col gap-6 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_10px_30px_rgba(178,85,47,0.18)]">
              <BrandMark className="size-7" />
            </span>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-foreground-soft">
              The Devil&apos;s AI Dictionary
            </p>
          </div>
          <p className="font-display text-lg font-semibold tracking-tight text-foreground">
            Not anti-AI. Anti-verbal laundering.
          </p>
          <p className="mt-2 text-sm leading-7 text-foreground-soft">
            The Devil&apos;s AI Dictionary is built as an expandable digital book:
            sharp definitions first, reality checks immediately after.
          </p>
          <p className="mt-2 text-sm leading-7 text-foreground-soft">
            Co-authored by{" "}
            <a
              href="https://daliso.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Daliso Ngoma
            </a>
            ,{" "}
            <Link href="/dictionary/chatgpt" className="hover:text-foreground">
              ChatGPT
            </Link>
            , and{" "}
            <Link href="/dictionary/codex" className="hover:text-foreground">
              Codex
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-foreground-soft">
          <Link href="/book" className="hover:text-foreground">
            Book
          </Link>
          <Link href="/how-to-read" className="hover:text-foreground">
            How to read
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/search" className="hover:text-foreground">
            Search
          </Link>
          <a
            href={siteConfig.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href={siteConfig.contributeUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Contribute a term
          </a>
        </div>
      </div>
    </footer>
  );
}
