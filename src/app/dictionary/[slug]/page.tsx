import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { EntryCard } from "@/components/entry-card";
import { MdxContent } from "@/components/mdx-content";
import { NewsletterSignupPanel } from "@/components/newsletter-signup-panel";
import { OpenInIPhoneAppButton } from "@/components/open-in-iphone-app-button";
import { SavePlaceButton } from "@/components/save-place-button";
import { TermDiagram } from "@/components/term-diagram";
import {
  getAllEntries,
  getEntryBySlug,
  getRelatedEntries,
} from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";
import { difficultyLabels, technicalDepthLabels } from "@/lib/site";
import { formatDate, slugify } from "@/lib/utils";

type EntryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-6 sm:p-7">
      <div className="labelled-rule">{title}</div>
      <div className="mt-5 text-base leading-8 text-foreground-soft">{children}</div>
    </section>
  );
}

export async function generateStaticParams() {
  const entries = await getAllEntries();
  return entries.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: EntryPageProps) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);

  if (!entry) {
    return {};
  }

  return buildMetadata({
    title: entry.title,
    description: entry.plainDefinition,
    path: `/dictionary/${entry.slug}`,
    type: "article",
  });
}

export default async function EntryPage({ params }: EntryPageProps) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);

  if (!entry) {
    notFound();
  }

  const [allEntries, relatedEntries] = await Promise.all([
    getAllEntries(),
    getRelatedEntries(entry),
  ]);
  const seeAlso = entry.seeAlso.map((label) => {
    const matchingEntry = allEntries.find(
      (candidate) =>
        candidate.slug === label || candidate.slug === slugify(label),
    );

    return {
      label,
      href: matchingEntry?.url,
    };
  });

  return (
    <div className="reading-shell space-y-10">
      <section className="space-y-6">
        <Link href="/dictionary" className="page-kicker hover:text-foreground">
          Dictionary
        </Link>
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{entry.letter}</Badge>
          <Badge>{difficultyLabels[entry.difficulty]}</Badge>
          <Badge>{technicalDepthLabels[entry.technicalDepth]}</Badge>
          {entry.isVendorTerm ? <Badge tone="success">Vendor term</Badge> : null}
          {entry.categories.map((category) => (
            <Badge key={category}>{category}</Badge>
          ))}
        </div>
        <div className="space-y-5">
          <h1 className="page-title">{entry.title}</h1>
          <p className="max-w-3xl text-2xl leading-10 text-foreground">
            {entry.devilDefinition}
          </p>
          <p className="max-w-3xl text-lg leading-8 text-foreground-soft">
            {entry.plainDefinition}
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-foreground-soft">
          <span>Published {formatDate(entry.publishedAt)}</span>
          <span>Updated {formatDate(entry.updatedAt)}</span>
          {entry.aliases.length > 0 ? <span>Also known as {entry.aliases.join(", ")}</span> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <SavePlaceButton
            href={entry.url}
            title={entry.title}
            label="Dictionary entry"
            description={entry.devilDefinition}
          />
          <OpenInIPhoneAppButton slug={entry.slug} />
          <Link
            href="/book"
            className="button button-secondary"
          >
            Back to the book
          </Link>
        </div>
        {entry.warningLabel ? (
          <div className="rounded-[1.25rem] border border-dashed border-danger/30 bg-[color:rgba(166,59,50,0.06)] px-5 py-4 text-sm leading-7 text-danger">
            {entry.warningLabel}
          </div>
        ) : null}
      </section>

      <NewsletterSignupPanel
        compact
        title="Get the next week's additions by email"
        description="If this word was useful, the Tuesday-morning digest is the least irritating way to hear about new ones."
        sourcePath={entry.url}
      />

      {entry.translations.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {entry.translations.map((translation) => (
            <div key={translation.label} className="surface p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
                {translation.label}
              </p>
              <p className="mt-3 text-sm leading-7 text-foreground">{translation.text}</p>
            </div>
          ))}
        </section>
      ) : null}

      {entry.diagram ? <TermDiagram kind={entry.diagram} /> : null}

      <div className="grid gap-6">
        <Section title="Straight definition">
          <p>{entry.plainDefinition}</p>
        </Section>
        <Section title="Why this term exists">
          <p>{entry.whyExists}</p>
        </Section>
        <Section title="How people abuse the term">
          <p>{entry.misuse}</p>
        </Section>
        <Section title="What it usually means in practice">
          <p>{entry.practicalMeaning}</p>
        </Section>
        <Section title="Practical example">
          <blockquote className="border-l-2 border-accent pl-4 text-foreground italic">
            {entry.example}
          </blockquote>
        </Section>
        <Section title="What to ask when someone says it">
          <ul className="space-y-3">
            {entry.askNext.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </Section>
        {seeAlso.length > 0 ? (
          <Section title="See also">
            <div className="flex flex-wrap gap-2">
              {seeAlso.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="chip hover:border-accent hover:text-accent"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span key={item.label} className="chip">
                    {item.label}
                  </span>
                ),
              )}
            </div>
          </Section>
        ) : null}
        {entry.note ? (
          <Section title="Context note">
            <p>{entry.note}</p>
          </Section>
        ) : null}
        {entry.vendorReferences.length > 0 ? (
          <Section title="Relevant vendor or product references">
            <ul className="space-y-3">
              {entry.vendorReferences.map((reference) => (
                <li key={reference}>{reference}</li>
              ))}
            </ul>
          </Section>
        ) : null}
        {entry.body ? (
          <section className="surface p-6 sm:p-7">
            <div className="labelled-rule">Editorial aside</div>
            <div className="mt-5">
              <MdxContent source={entry.body} />
            </div>
          </section>
        ) : null}
      </div>

      <section className="space-y-5">
        <div className="labelled-rule">Related terms</div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {relatedEntries.map((relatedEntry) => (
            <EntryCard key={relatedEntry.slug} entry={relatedEntry} compact />
          ))}
        </div>
      </section>
    </div>
  );
}
