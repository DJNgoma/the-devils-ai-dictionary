import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "About this book",
  description:
    "Editorial purpose, audience, and stance behind The Devil's AI Dictionary.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="reading-shell space-y-12">
      <section className="space-y-5">
        <p className="page-kicker">About</p>
        <h1 className="page-title">About this book</h1>
        <p className="page-intro">
          The project is for readers who already hear AI jargon daily and would like
          some of it translated back into English before it damages a strategy deck.
        </p>
      </section>

      <section className="surface-strong p-6 sm:p-8">
        <div className="book-prose">
          <p>
            The editorial voice is dry on purpose. AI language is often inflated long
            before it is clarified. A little wit helps puncture that inflation
            without collapsing into cynicism or boosterism.
          </p>
          <p>
            The book is not anti-technology, anti-start-up, or anti-ambition. It is
            against terminology doing more work than the systems themselves. If a
            phrase has a legitimate technical meaning, the entry treats it seriously.
            If it is mostly branding, the entry says so.
          </p>
          <p>
            The book was co-authored by{" "}
            <a
              href="https://daliso.com"
              target="_blank"
              rel="noreferrer"
              className="link-underline text-foreground"
            >
              Daliso Ngoma
            </a>
            ,{" "}
            <Link href="/dictionary/chatgpt" className="link-underline text-foreground">
              ChatGPT
            </Link>
            , and{" "}
            <Link href="/dictionary/codex" className="link-underline text-foreground">
              Codex
            </Link>
            . One brought the editorial point of view. The other two brought
            patience, speed, and a healthy willingness to be edited.
          </p>
          <p>
            The source now lives in public at{" "}
            <a
              href={siteConfig.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="link-underline text-foreground"
            >
              GitHub
            </a>
            . If the book has missed a term, you can open a pull request or start
            with the{" "}
            <a
              href={siteConfig.contributeUrl}
              target="_blank"
              rel="noreferrer"
              className="link-underline text-foreground"
            >
              contribution guide
            </a>
            .
          </p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Audience
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            Founders, operators, investors, marketers, technologists, and curious
            professionals who already know the buzzwords and want the substance.
          </p>
        </div>
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Approach
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            Each entry starts with a memorable definition, then moves quickly to what
            the term means in practice, how it gets abused, and what questions expose
            the difference.
          </p>
        </div>
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Biases
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            The book is biased toward clarity, operational realism, and naming the
            commercial incentives wrapped around technical language.
          </p>
        </div>
      </section>
    </div>
  );
}
