import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="page-shell flex flex-col gap-6 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-display text-lg font-semibold tracking-tight text-foreground">
            Not anti-AI. Anti-verbal laundering.
          </p>
          <p className="mt-2 text-sm leading-7 text-foreground-soft">
            The Devil&apos;s AI Dictionary is built as an expandable digital book:
            sharp definitions first, reality checks immediately after.
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
          <Link href="/search" className="hover:text-foreground">
            Search
          </Link>
        </div>
      </div>
    </footer>
  );
}
