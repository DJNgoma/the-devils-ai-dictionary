# Daily term expansion automation

This workflow exists so the daily content expansion run can add terms without touching the main checkout unless the result is safe to publish.

## Rules

- Prepare an isolated scratch checkout first.
- Do all editorial work in that scratch checkout, not in `/Users/daliso/Developer/TheDevilsAIDictionary`.
- Regenerate and verify the catalogue before any commit.
- Only publish diffs that stay inside:
  - `content/entries/*.mdx`
  - `src/generated/entries.generated.json`
  - `public/catalog/version.json`
  - `public/catalog/catalog.<hash>.json`
- Do not run `npm run deploy:cf` as part of the daily automation. The repo's normal production deploy path is GitHub Actions on push to `main`. Manual Cloudflare deploy remains an emergency-only fallback.

## Commands

Prepare a clean scratch checkout from the current `origin/main` tip:

```bash
scripts/with-node.sh node scripts/daily-term-automation.mjs prepare --json
```

That returns a `workspace` path. Change into that directory and do the rest of the run there.
`prepare` first tries to refresh the source checkout's cached `origin/main` and retries transient failures before giving up.
For GitHub remotes, the helper prefers HTTPS git transport authenticated through `gh` when `gh auth status` is available, so the automation does not depend on SSH being healthy.
If GitHub is briefly unavailable but the source checkout already has a cached `refs/remotes/origin/main`, `prepare` may still succeed in degraded mode by basing the scratch checkout on that cached ref.
The JSON result reports whether the base was `fresh` or `cached`, plus the exact ref and commit used.
When the source checkout already has `node_modules`, the helper tries to clone that dependency tree into the scratch repo with local copy-on-write semantics so lint, typecheck, and build can run without a fresh `npm ci`.

After writing the new entries, regenerate and verify the expected slugs:

```bash
scripts/with-node.sh node scripts/daily-term-automation.mjs verify slug-one slug-two --json
```

That command:

- runs `scripts/build-content-artifacts.sh`
- checks `src/generated/entries.generated.json`
- checks `public/catalog/version.json`
- checks the versioned `public/catalog/catalog.<hash>.json`
- checks `public/mobile-catalog/manifest.json` and its versioned snapshot
- requires a real `node_modules` tree in the scratch checkout, then runs `npm run lint`, `npm run typecheck`, and `npm run build`

If `node_modules` could not be copied into the scratch repo, treat that as a blocker and stop rather than downgrading to a lighter verification pass.

When verification passes, commit and push only through the guarded publish command:

```bash
scripts/with-node.sh node scripts/daily-term-automation.mjs publish \
  --message "Add new terms without losing the catalogue" \
  --push \
  --json
```

That command refuses to run if:

- the current branch is `main`
- unexpected files were changed
- unstaged changes remain after staging the allowed paths
- `origin/main` moved and the push would now be stale

A cached `prepare` only allows authoring and verification to continue.
`publish --push` still requires a live refresh of `origin/main` and will fail if the remote stays unreachable or if `origin/main` advanced while the scratch branch was being edited.
Switching to `gh`-backed HTTPS avoids SSH-specific failures, but it does not bypass GitHub or DNS outages entirely.

## Editorial checklist

- Read [`docs/content-authoring.md`](../content-authoring.md) before drafting new terms.
- Avoid recent duplicates from automation memory.
- Keep the humour dry and controlled.
- Use British or South African leaning spelling where natural.
- Report the exact blocker if network access, Node tooling, or push rights are missing.
