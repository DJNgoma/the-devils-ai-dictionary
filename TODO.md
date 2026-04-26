# TODO

## Usage

Keep this file as the lightweight source of truth for follow-up work that is known, real, and not yet shipped.

## Current follow-up

### Finish Apple web sign-in go-live

Status:
The Cloudflare worker now has the shared Apple auth secrets and the production deploy workflow hard-fails if the required web auth secret set is incomplete. Web Sign in with Apple is still not live because `APPLE_WEB_CLIENT_ID` depends on an Apple Services ID that does not yet exist in the Apple Developer account, and no recoverable prior Service ID was found locally.

Next steps (full click-path, secret command, and rollback live in `docs/apple-web-signin-runbook.md`):
- Create the Apple Services ID `com.djngoma.devilsaidictionary.web` under `African Technopreneurs (PTY) LTD - 5CND4GK432`.
- Enable Sign in with Apple for `thedevilsaidictionary.com`.
- Add the return URL `https://thedevilsaidictionary.com/api/auth/apple/callback`.
- Set the Cloudflare worker secret `APPLE_WEB_CLIENT_ID` to that Services ID.
- Run `node scripts/verify-apple-web-signin.mjs` and confirm a 302 to Apple with `client_id=com.djngoma.devilsaidictionary.web`. The script fails with the live server error today and turns green once the Services ID and Worker secret are in place.

After the Services ID is live, expect to revisit:
- Apple may demand a `.well-known/apple-developer-domain-association.txt` file for `thedevilsaidictionary.com`. Nothing under `public/.well-known/` serves it today; if Apple's domain check fails, deploy the file Apple provides.
- `scripts/verify-apple-web-signin.mjs` only checks the start route — it cannot prove the `/api/auth/apple/callback` token exchange works without a real Apple round trip. Plan a one-time manual end-to-end smoke (logged-out browser, full consent flow, confirm session cookie sticks) when the secret first lands.
- The verifier prints `redirect_uri` but does not assert it matches `https://thedevilsaidictionary.com/api/auth/apple/callback`. If a future env change drifts the redirect URI, the script will still pass — tighten it to a strict comparison once the value is locked in.
