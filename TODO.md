# TODO

## Usage

Keep this file as the lightweight source of truth for follow-up work that is known, real, and not yet shipped.

## Current follow-up

### Complete Apple web sign-in end-to-end acceptance

Status:
The production start route is live. On 2026-07-18, `node scripts/verify-apple-web-signin.mjs` received a 307 to Apple's authorize endpoint with the expected Services ID and exact callback URL. The deploy workflow also hard-fails if the required Worker secret set is incomplete.

What remains (full verification and rollback details live in `docs/apple-web-signin-runbook.md`):
- Run one manual end-to-end smoke in a logged-out browser: complete Apple consent, confirm `/api/auth/apple/callback` returns to the app with `?apple=ok`, reload, and confirm the session sticks.
- If Apple rejects the domain during that round trip, deploy the association file Apple provides under `public/.well-known/apple-developer-domain-association.txt` and retry.

The start-route verifier now checks both the Services ID and the exact callback URL, including a regression test for redirect drift. Use `--expected-redirect-uri` only when intentionally testing a non-production callback.
