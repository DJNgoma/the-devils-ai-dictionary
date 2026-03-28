# Contributing

This repo welcomes contributions for missing terms, adjacent editorial fixes, and glossary improvements that strengthen the book without turning it into a product backlog.

## What is welcome

- New term entries under `content/entries/*.mdx`
- Copy fixes to existing entries
- Related-term improvements, metadata cleanups, and glossary navigation fixes
- Documentation updates that directly support glossary contributors

## What is out of scope by default

- Broad product redesigns
- Speculative architecture changes
- Unrelated feature work
- Large code refactors that are not required to publish or improve glossary content

If a change goes beyond the glossary and its supporting reading experience, open an issue first instead of sending a surprise PR.

## How to add a term

1. Read [docs/content-authoring.md](docs/content-authoring.md).
2. Create a new MDX file under `content/entries/`.
3. Copy the frontmatter structure from an existing entry.
4. Keep category names aligned with `src/lib/site.ts`.
5. Add manual `related` slugs where they help.
6. Keep the tone dry, precise, and useful. No vendor perfume, no textbook bloat.

## Editorial bar

- Write for smart non-beginners.
- Be funny enough to stay readable, but not vague.
- Separate technical meaning from marketing meaning when they diverge.
- Prefer practical meaning over performative cleverness.
- If the entry starts sounding impressed with itself, cut it back.

## Before opening a pull request

Run:

```bash
npm run typecheck
npm run build
```

Then verify:

- the term appears under the correct letter
- related terms feel sensible
- the homepage or category pages are not skewed by the new metadata

## Pull request expectations

- Keep PRs focused.
- If you are proposing a new term, explain why it deserves to be in the book now.
- If you are fixing copy, say whether the problem is technical accuracy, tone, or clarity.

If you are not ready to write the term yourself, open a term-suggestion issue instead.
