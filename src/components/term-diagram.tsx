import { termDiagrams, type TermDiagramKind } from "@/lib/term-diagrams";

type TermDiagramProps = {
  kind: TermDiagramKind;
};

function DiagramFrame({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="surface p-5 sm:p-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-foreground-soft">
        Mental model
      </p>
      <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm leading-6 text-foreground md:flex-1">
      {children}
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex min-h-10 items-center justify-center text-center font-mono text-[0.68rem] uppercase tracking-[0.22em] text-foreground-soft">
      {label}
    </div>
  );
}

export function TermDiagram({ kind }: TermDiagramProps) {
  const diagram = termDiagrams[kind];

  return (
    <DiagramFrame title={diagram.title}>
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        {diagram.steps.map((step, index) => (
          <div className="contents" key={`${step.label}-${index}`}>
            <Box>{step.label}</Box>
            {step.connectorAfter ? <Arrow label={step.connectorAfter} /> : null}
          </div>
        ))}
      </div>
    </DiagramFrame>
  );
}
