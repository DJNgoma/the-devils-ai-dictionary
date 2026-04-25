# Content authoring guide

This project uses one MDX file per term under `content/entries/`. The frontmatter carries the structured data. The optional body below the frontmatter is for short editorial asides only.

## Editorial rules

- Write for smart non-beginners.
- Keep the humour dry and controlled.
- Be precise when the technical meaning matters.
- Separate technical meaning from marketing meaning when they diverge.
- Do not imitate any specific author's phrasing.
- Do not write corporate fluff.
- Do not flatten disputed ideas into false certainty.
- Use British or South African leaning spelling where natural.

## Entry structure

Every file should follow this pattern:

```mdx
---
title: "Quantisation"
slug: "quantisation"
letter: "Q"
categories:
  - "Infrastructure and deployment"
aliases:
  - "quantization"
devilDefinition: |
  Your memorable one-liner goes here.
plainDefinition: |
  Give the technically accurate explanation here.
whyExists: |
  Explain why the term exists and what problem it names.
misuse: |
  Explain how the term is stretched, abused, or oversold.
practicalMeaning: |
  Explain what the term usually means in product or operational reality.
example: |
  One practical example sentence in context.
askNext:
  - "Question one"
  - "Question two"
related:
  - "inference"
  - "latency"
seeAlso:
  - "Reasoning"
  - "Latency"
difficulty: "intermediate"
technicalDepth: "medium"
hypeLevel: "low"
isVendorTerm: false
publishedAt: "2026-03-20"
updatedAt: "2026-03-20"
warningLabel: "Optional"
vendorReferences:
  - "Optional"
note: |
  Optional note when the term has multiple meanings depending on context.
tags:
  - "deployment"
misunderstoodScore: 4
translations:
  - label: "what it usually means in reality"
    text: "Optional translation strip."
diagram: "function-calling"
---

Optional short editorial aside.
```

## Allowed values

### Categories

Use the exact category titles defined in [`src/lib/site.ts`](../src/lib/site.ts):

- Core concepts
- Cultural terms
- Model building
- Model usage
- Agents and workflows
- Retrieval and memory
- Product and vendor terms
- Safety and evaluation
- Infrastructure and deployment
- Economics and operations of AI

### Difficulty

- `beginner`
- `intermediate`
- `advanced`

### Technical depth

- `low`
- `medium`
- `high`

### Hype level

- `low`
- `medium`
- `high`
- `severe`

### Diagram

Optional. Current built-in diagram keys:

- `rag`
- `embeddings`
- `context-window`
- `function-calling`
- `mcp`
- `agent-loop`
- `model-routing`
- `skill-loading`
- `worktree`

## Writing guidance by section

### `devilDefinition`

- 1 to 3 lines
- memorable
- sharp without becoming vague
- should capture the social function of the term, not just its mechanics

### `plainDefinition`

- short, accurate, and unsentimental
- if the term is ambiguous, say so directly

### `whyExists`

- explain the legitimate reason the term exists
- prevent the entry from becoming pure mockery

### `misuse`

- show how the term gets stretched in product, sales, policy, or media contexts
- be concrete about the distortion

### `practicalMeaning`

- anchor the term in workflows, budgets, tools, org behaviour, or deployment reality

### `askNext`

- use diagnostic questions
- these should help a reader interrogate claims in meetings or product reviews

### `seeAlso`

- optional human-readable adjacent terms
- use this when you want to preserve named references even if some entries are not published yet
- published entries with matching slugs will render as links automatically

## Before publishing a new term

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

Then check:

- the entry appears under the right letter
- the category page looks sensible
- related terms feel relevant
- the homepage is not accidentally skewed by publication date or misunderstanding score
