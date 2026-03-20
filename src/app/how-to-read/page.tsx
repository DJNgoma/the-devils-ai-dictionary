import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "How to read this dictionary",
  description:
    "A quick guide to the entry structure, warning labels, and editorial translation layers.",
  path: "/how-to-read",
});

export default function HowToReadPage() {
  return (
    <div className="reading-shell space-y-12">
      <section className="space-y-5">
        <p className="page-kicker">Guide</p>
        <h1 className="page-title">How to read this dictionary</h1>
        <p className="page-intro">
          Think of each entry as a small trap for inflated language. It opens with
          the joke, then closes on the actual meaning.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="surface p-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            The structure
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-foreground-soft">
            <p>
              <strong className="text-foreground">Devil&apos;s definition:</strong> the
              sharp line that captures the social function of the term.
            </p>
            <p>
              <strong className="text-foreground">Straight definition:</strong> the
              clean technical or practical meaning.
            </p>
            <p>
              <strong className="text-foreground">How people abuse the term:</strong> the
              ways it gets stretched, laundered, or used as camouflage.
            </p>
            <p>
              <strong className="text-foreground">What to ask next:</strong> the questions
              that convert slogans back into claims you can test.
            </p>
          </div>
        </div>
        <div className="surface p-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            The labels
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-foreground-soft">
            <p>
              <strong className="text-foreground">Difficulty</strong> tracks the assumed
              reader familiarity, not status.
            </p>
            <p>
              <strong className="text-foreground">Technical depth</strong> tells you how
              far into the mechanics the entry goes.
            </p>
            <p>
              <strong className="text-foreground">Hype level</strong> signals how likely
              the term is to be used as fog machine rather than explanation.
            </p>
            <p>
              <strong className="text-foreground">Warning labels</strong> appear when a term
              is especially abused, especially vague, or mostly marketing.
            </p>
          </div>
        </div>
      </section>

      <section className="surface-strong p-6 sm:p-8">
        <div className="book-prose">
          <p>
            Some entries also include translation strips such as vendor meaning,
            investor meaning, engineer meaning, or what it usually means in reality.
            These are not separate definitions. They are context clues for how the
            same phrase changes shape depending on who is speaking and what they need
            the room to believe.
          </p>
          <p>
            If you find yourself agreeing with a devilish definition too quickly,
            read the straight definition immediately after it. That is the part
            designed to stop the joke from becoming its own lazy myth.
          </p>
        </div>
      </section>
    </div>
  );
}
