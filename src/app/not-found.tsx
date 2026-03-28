import Link from "next/link";

export default function NotFound() {
  return (
    <div className="reading-shell">
      <div className="surface-strong p-8 text-center sm:p-12">
        <p className="page-kicker">404</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground">
          That term is not in the index.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-foreground-soft">
          Either the link is wrong or the jargon has outrun the editors. Try the
          dictionary browser or search the published entries.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/dictionary"
            className="button button-primary"
          >
            Browse dictionary
          </Link>
          <Link
            href="/search"
            className="button button-secondary"
          >
            Search
          </Link>
        </div>
      </div>
    </div>
  );
}
