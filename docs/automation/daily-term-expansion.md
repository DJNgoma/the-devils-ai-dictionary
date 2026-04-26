# Daily term expansion automation

This workflow exists so the daily content expansion run can add terms without touching the user's normal checkout unless the result is safe to publish.

## Rules

- Bootstrap a fresh automation-owned worktree from a dedicated mirror first.
- Do all editorial work in that fresh worktree, not in `/Users/daliso/Developer/TheDevilsAIDictionary`.
- Regenerate and verify the catalogue before any commit.
- Select terms from [`docs/automation/daily-term-queue.json`](./daily-term-queue.json), not by scanning the full catalogue freehand.
- Only publish diffs that stay inside:
  - `content/entries/*.mdx`
  - `docs/automation/daily-term-queue.json`
  - `src/generated/entries.generated.json`
  - `src/generated/entries.web.generated.json`
  - `src/generated/entry-detail-shards.generated.ts`
  - `src/generated/entry-details/*.json`
  - `public/catalog/version.json`
  - `public/catalog/catalog.<hash>.json`
  - `public/catalog/search-index.<hash>.json`
  - `public/mobile-catalog/manifest.json`
  - `public/mobile-catalog/entries.<hash>.json`
- Do not run `npm run deploy:cf` as part of the daily automation. The repo's normal production deploy path is GitHub Actions on push to `main`. Manual Cloudflare deploy remains an emergency-only fallback.

## Commands

Bootstrap a clean automation worktree from the current `origin/main` tip:

```bash
GH_PATH="$HOME/.local/bin/gh" PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH" \
  /Users/daliso/.codex/automations/the-devil-s-ai-dictionary-daily-term-expansion/bootstrap.sh --json
```

That returns a `workspace` path plus the fetched base commit, retry count, git transport, and lockfile hash used for dependency caching. Change into that directory and do the rest of the run there.

The bootstrap wrapper:

- owns its own bare mirror and worktree directories under `~/.codex/automations/the-devil-s-ai-dictionary-daily-term-expansion/`
- retries `origin/main` refresh in-run instead of falling back to a cached authoring base
- requires `gitTransport: "https-gh"` for the GitHub production path
- hydrates `node_modules` from an automation-owned cache keyed by `sha256(package-lock.json)`
- stops before drafting if a fresh fetch or dependency install never succeeds

Choose the next queued batch before drafting:

```bash
scripts/with-node.sh node scripts/daily-term-automation.mjs queue next --count 7 --json
```

The queue file order is authoritative. The worker returns the first queued items in file order, emits a low-queue warning when only five or six queued items remain, and fails early when fewer than five queued items are available.

After writing the queued entries, regenerate and verify the expected slugs:

```bash
scripts/with-node.sh node scripts/daily-term-automation.mjs verify slug-one slug-two --json
```

That command:

- runs `scripts/build-content-artifacts.sh`
- checks `src/generated/entries.generated.json`
- checks `public/catalog/version.json`
- checks the versioned `public/catalog/catalog.<hash>.json`
- checks the versioned `public/catalog/search-index.<hash>.json`
- checks `public/mobile-catalog/manifest.json` and its versioned snapshot
- reports `diagramCoverage` for the requested slugs so the run explicitly considers whether a mental model should be attached
- reports `misunderstoodSelection` for the requested slugs so high-scoring terms do not silently reshape the "Most misunderstood" rail
- requires a real `node_modules` tree in the scratch checkout, then runs `npm run lint`, `npm run typecheck`, and `npm run build`

If dependency hydration failed before this point, treat that as a blocker and stop rather than downgrading to a lighter verification pass.

When verification passes, commit and push only through the guarded publish command:

```bash
scripts/with-node.sh node scripts/daily-term-automation.mjs publish \
  slug-one slug-two \
  --message "Add new terms without losing the catalogue" \
  --push \
  --json
```

That command refuses to run if:

- the current workspace is the user's `main` checkout
- the changed entry slugs do not exactly match the explicit publish slug list
- unexpected files were changed
- unstaged changes remain after staging the allowed paths
- `origin/main` moved and the push would now be stale

`publish --push` still requires a live refresh of `origin/main` and will fail if the remote stays unreachable or if `origin/main` advanced while the worktree was being edited.
It also marks the published slugs as `published` in the queue file inside the same commit.

## Editorial checklist

- Read [`docs/content-authoring.md`](../content-authoring.md) before drafting new terms.
- Draft only the slugs returned by `queue next`.
- Avoid recent duplicates from automation memory and from existing published entries.
- Keep the humour dry and controlled.
- Use British or South African leaning spelling where natural.
- Check the `diagramCoverage` field from `verify --json`. If a new term lacks a diagram, either add the strongest matching diagram key or be ready to say why a mental model would be forced.
- Set `misunderstoodScore` using the rubric in `docs/content-authoring.md`, then check `misunderstoodSelection` from `verify --json` to see whether the term enters the live rail.
- Treat queue depletion, network failures, missing dependencies, or stale `origin/main` as first-class blockers and report them plainly.
