type TermDiagramProps = {
  kind: "rag" | "embeddings" | "context-window" | "function-calling" | "mcp";
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
    <div className="rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm leading-6 text-foreground">
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
  if (kind === "rag") {
    return (
      <DiagramFrame title="RAG is retrieval plus stuffing">
        <div className="grid gap-3 md:grid-cols-5">
          <Box>User question</Box>
          <Arrow label="search" />
          <Box>Retriever fetches documents</Box>
          <Arrow label="stuff" />
          <Box>Model answers with extra context</Box>
        </div>
      </DiagramFrame>
    );
  }

  if (kind === "embeddings") {
    return (
      <DiagramFrame title="Embeddings turn meaning into coordinates">
        <div className="grid gap-3 md:grid-cols-5">
          <Box>Text or image</Box>
          <Arrow label="encode" />
          <Box>Vector representation</Box>
          <Arrow label="compare" />
          <Box>Nearest neighbours or clusters</Box>
        </div>
      </DiagramFrame>
    );
  }

  if (kind === "context-window") {
    return (
      <DiagramFrame title="A model has limited room on the desk">
        <div className="grid gap-3 md:grid-cols-4">
          <Box>System instructions</Box>
          <Box>User message</Box>
          <Box>Retrieved context and tool output</Box>
          <Box>Space left for the reply</Box>
        </div>
      </DiagramFrame>
    );
  }

  if (kind === "function-calling") {
    return (
      <DiagramFrame title="The model chooses the call, software does the work">
        <div className="grid gap-3 md:grid-cols-5">
          <Box>User asks for something</Box>
          <Arrow label="choose tool" />
          <Box>Model emits structured arguments</Box>
          <Arrow label="execute" />
          <Box>Application runs tool and returns result</Box>
        </div>
      </DiagramFrame>
    );
  }

  return (
    <DiagramFrame title="MCP separates the assistant from the connectors">
      <div className="grid gap-3 md:grid-cols-5">
        <Box>Assistant or client app</Box>
        <Arrow label="requests" />
        <Box>MCP server</Box>
        <Arrow label="brokers" />
        <Box>Tools, resources, prompts</Box>
      </div>
    </DiagramFrame>
  );
}
