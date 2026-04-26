# Apple web sign-in go-live runbook

This runbook covers the Apple Developer portal click-path, the Cloudflare Worker secret update, the verification step, and rollback. The worker side is already wired — see `src/app/api/auth/apple/start/route.ts`, `src/app/api/auth/apple/callback/route.ts`, and `src/lib/server/apple-auth.ts`. The deploy workflow at `.github/workflows/deploy-cloudflare.yml` hard-fails when `APPLE_WEB_CLIENT_ID` (and the rest of the Apple secret set) is missing.

The blocker is human-only: an Apple Services ID has to be created in the Apple Developer portal, and the resulting identifier has to be set as the `APPLE_WEB_CLIENT_ID` Worker secret.

## Targets to match

- Apple Team: `African Technopreneurs (PTY) LTD - 5CND4GK432`
- Services ID (also the `APPLE_WEB_CLIENT_ID` value): `com.djngoma.devilsaidictionary.web`
- Web domain: `thedevilsaidictionary.com`
- Return URL: `https://thedevilsaidictionary.com/api/auth/apple/callback`

The route code reads the client ID via `getAppleWebClientId(env)` and the redirect URI defaults to `<NEXT_PUBLIC_SITE_URL>/api/auth/apple/callback`, so as long as those values match Apple's records the round trip works without further code changes.

## 1. Apple Developer portal — create the Services ID

1. Sign in at <https://developer.apple.com/account> with an account that has the Admin role on `African Technopreneurs (PTY) LTD - 5CND4GK432`.
2. Top-right account picker: confirm the team is `African Technopreneurs (PTY) LTD`. If not, switch.
3. Sidebar: **Certificates, Identifiers & Profiles** → **Identifiers**.
4. Filter dropdown (top-right of the table): switch from **App IDs** to **Services IDs**.
5. Click the blue **+** button.
6. Select **Services IDs**, click **Continue**.
7. Description: `The Devils AI Dictionary Web` (any human label is fine).
8. Identifier: `com.djngoma.devilsaidictionary.web` — must match exactly.
9. Click **Continue**, then **Register**.
10. Re-open the Services ID you just created.
11. Tick **Sign in with Apple**, then **Configure**.
12. **Primary App ID:** select the existing iOS App ID (the bundle ID used by the iOS app — `APNS_BUNDLE_ID` in the Worker env reflects this).
13. **Domains and Subdomains:** add `thedevilsaidictionary.com` (no scheme, no trailing slash).
14. **Return URLs:** add `https://thedevilsaidictionary.com/api/auth/apple/callback`.
15. **Save** in the configuration sheet, then **Continue** and **Save** on the Services ID screen.
16. Apple may show a "Verify domain" prompt with a `.well-known/apple-developer-domain-association.txt` file. The site already serves Sign in with Apple to native clients on this domain, so verification typically completes immediately. If it does not, download the file Apple provides, deploy it under `public/.well-known/`, and re-run the verify step.

## 2. Set the Cloudflare Worker secret

Run from the repo root with `wrangler` authenticated against the production account (`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` set, or an interactive `wrangler login`):

```sh
printf '%s' 'com.djngoma.devilsaidictionary.web' | npx wrangler secret put APPLE_WEB_CLIENT_ID
```

Confirm it's now in the secret list:

```sh
npx wrangler secret list --format json | jq '.[].name' | grep APPLE_WEB_CLIENT_ID
```

The other Apple secrets (`APPLE_SESSION_SECRET`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`) are already in place — the deploy workflow's `Verify Apple web auth secrets exist` step is what enforces that.

## 3. Verify

```sh
node scripts/verify-apple-web-signin.mjs
```

Expected on success:

```
Hitting https://thedevilsaidictionary.com/api/auth/apple/start ...
Apple web sign-in start route looks healthy:
  status        302
  authorize_url https://appleid.apple.com/auth/authorize
  client_id     com.djngoma.devilsaidictionary.web
  redirect_uri  https://thedevilsaidictionary.com/api/auth/apple/callback
```

The script also runs against a local dev server (`--target=local`) or any other origin (`--target=https://staging.example.com`). Override the expected Services ID with `--expected-client-id=...` if testing a non-production identifier.

If the script fails with `Apple web sign-in requires APPLE_WEB_CLIENT_ID.`, the Worker still doesn't have the secret — re-run step 2 and confirm `wrangler secret list` actually shows it for the production worker (not a preview environment).

If the script fails with `client_id mismatch`, the Worker secret holds a different identifier than the one configured at Apple. Decide which is canonical and align both.

If the redirect host or path differs from `appleid.apple.com/auth/authorize`, the route itself has changed — re-read `src/app/api/auth/apple/start/route.ts` before continuing.

## 4. End-to-end smoke after a successful verify

1. In a logged-out browser, open <https://thedevilsaidictionary.com> and start the Apple web sign-in flow from the settings UI.
2. Complete the Apple consent screen.
3. Apple should `form_post` back to `/api/auth/apple/callback`, the worker should set the session cookie, and the browser should land on the post-login page with `?apple=ok` in the query string.
4. Reload the page — confirm the session sticks (the cookie is `httpOnly`, `SameSite=Lax`, 180-day max age).

## Rollback

Apple web sign-in is additive. To take it back offline if something goes wrong, in order of escalating impact:

1. **Pull the secret.** `npx wrangler secret delete APPLE_WEB_CLIENT_ID`. The `/api/auth/apple/start` route immediately returns 500 with `Apple web sign-in requires APPLE_WEB_CLIENT_ID.` and existing sessions are unaffected. Note that the next production deploy will fail the `Verify Apple web auth secrets exist` workflow step until the secret is restored or the workflow is updated, so use this only if the next step is to fix-forward quickly.
2. **Revoke the Services ID configuration.** In the Apple portal, open the Services ID, untick **Sign in with Apple**, save. Apple stops accepting authorize requests for that client_id; the start route still issues redirects, but Apple returns an error to the user. Use this if Apple flagged a domain/return-URL issue and you need to re-configure.
3. **Delete the Services ID.** Last resort. Only do this if the identifier was registered against the wrong team or with a typo that can't be edited. After deletion you cannot re-register the same identifier for 30 days.

For any rollback path, re-running `node scripts/verify-apple-web-signin.mjs` is the fastest way to confirm the current state.
