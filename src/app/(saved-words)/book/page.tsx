import Link from "next/link";
import { EntryCard } from "@/components/entry-card";
import { ResumeReadingCard } from "@/components/resume-reading-card";
import { getEntryBySlug, getSearchableEntries } from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Book landing page",
  description:
    "Read the project as an online book: preface, reading approach, and selected starting points.",
  path: "/book",
});

export default async function BookPage() {
  const [entries, openingEntry, practicalEntry, vendorEntry] = await Promise.all([
    getSearchableEntries(),
    getEntryBySlug("ai-psychosis"),
    getEntryBySlug("inference"),
    getEntryBySlug("openai"),
  ]);

  const starters = entries.filter((entry) =>
    ["agentic-ai", "rag", "structured-outputs"].includes(entry.slug),
  );

  return (
    <div className="reading-shell space-y-14">
      <section className="space-y-6">
        <p className="page-kicker">Book</p>
        <h1 className="page-title">A field guide for people already in the room</h1>
        <p className="page-intro">
          This site is built like an online reference book. You can dip in by term,
          wander by category, or read it front to back until the jargon starts
          looking less inevitable.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/random"
            className="button button-secondary"
          >
            Random entry
          </Link>
        </div>
      </section>

      <ResumeReadingCard hideIfCurrentHref="/book" />

      <section className="surface-strong p-6 sm:p-8">
        <div className="book-prose">
          <p>
            The dictionary has two jobs. First, to expose inflated language before it
            hardens into received wisdom. Second, to make the useful distinctions
            visible: model versus product, retrieval versus memory, structure versus
            theatre, evaluation versus vibes.
          </p>
          <p>
            The entries are short on purpose. If a concept cannot survive plain
            English, it usually needs less reverence, not more slideware.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {openingEntry ? <EntryCard entry={openingEntry} /> : null}
        {practicalEntry ? <EntryCard entry={practicalEntry} /> : null}
        {vendorEntry ? <EntryCard entry={vendorEntry} /> : null}
      </section>

      <section className="space-y-6">
        <div className="labelled-rule">How this book reads</div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="surface p-5">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Devil&apos;s definition
            </h2>
            <p className="mt-3 text-sm leading-7 text-foreground-soft">
              The memorable line. Good for puncturing fog quickly.
            </p>
          </div>
          <div className="surface p-5">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Straight definition
            </h2>
            <p className="mt-3 text-sm leading-7 text-foreground-soft">
              The technically serious part. Good for not embarrassing yourself later.
            </p>
          </div>
          <div className="surface p-5">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              What to ask next
            </h2>
            <p className="mt-3 text-sm leading-7 text-foreground-soft">
              The diagnostic questions that turn jargon back into concrete claims.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="labelled-rule">Good places to start</div>
        <div className="grid gap-5 md:grid-cols-3">
          {starters.map((entry) => (
            <EntryCard key={entry.slug} entry={entry} compact />
          ))}
        </div>
      </section>

      <section className="surface p-6 sm:p-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(14rem,1fr)] md:items-end">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Read the orientation notes first if you want the legend.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
              The site includes a short guide to the labels, warning badges, and
              translation strips. If you want the editorial operating manual, that is
              where it lives.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/how-to-read"
              className="button button-primary"
            >
              How to read this dictionary
            </Link>
            <Link
              href="/dictionary"
              className="button button-secondary"
            >
              Browse entries
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
