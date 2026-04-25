type TermDiagramProps = {
  kind:
    | "rag"
    | "embeddings"
    | "context-window"
    | "function-calling"
    | "mcp"
    | "agent-loop"
    | "model-routing"
    | "skill-loading"
    | "worktree";
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

  if (kind === "agent-loop") {
    return (
      <DiagramFrame title="Agents are loops with permission">
        <div className="grid gap-3 md:grid-cols-5">
          <Box>Goal and constraints</Box>
          <Arrow label="plan" />
          <Box>Tool, browser, or code action</Box>
          <Arrow label="observe" />
          <Box>Continue, ask, or stop</Box>
        </div>
      </DiagramFrame>
    );
  }

  if (kind === "model-routing") {
    return (
      <DiagramFrame title="Routing is policy with a bill attached">
        <div className="grid gap-3 md:grid-cols-5">
          <Box>Application request</Box>
          <Arrow label="classify" />
          <Box>Gateway applies policy and budget</Box>
          <Arrow label="route" />
          <Box>Selected model or fallback</Box>
        </div>
      </DiagramFrame>
    );
  }

  if (kind === "skill-loading") {
    return (
      <DiagramFrame title="Skills load guidance only when the task earns it">
        <div className="grid gap-3 md:grid-cols-5">
          <Box>User task</Box>
          <Arrow label="match" />
          <Box>Skill instructions load on demand</Box>
          <Arrow label="use" />
          <Box>Scripts and resources stay scoped</Box>
        </div>
      </DiagramFrame>
    );
  }

  if (kind === "worktree") {
    return (
      <DiagramFrame title="A worktree gives the agent a separate bench">
        <div className="grid gap-3 md:grid-cols-5">
          <Box>Main checkout stays steady</Box>
          <Arrow label="branch" />
          <Box>Linked worktree gets isolated edits</Box>
          <Arrow label="verify" />
          <Box>Merge, keep, or discard</Box>
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
