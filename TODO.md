# TODO

## Usage

Keep this file as the lightweight source of truth for follow-up work that is known, real, and not yet shipped.

## Current follow-up

### Finish Apple web sign-in go-live

Status:
The Cloudflare worker now has the shared Apple auth secrets and the production deploy workflow hard-fails if the required web auth secret set is incomplete. Web Sign in with Apple is still not live because `APPLE_WEB_CLIENT_ID` depends on an Apple Services ID that does not yet exist in the Apple Developer account, and no recoverable prior Service ID was found locally.

Next steps:
- Create the Apple Services ID `com.djngoma.devilsaidictionary.web` under `African Technopreneurs (PTY) LTD - 5CND4GK432`.
- Enable Sign in with Apple for `thedevilsaidictionary.com`.
- Add the return URL `https://thedevilsaidictionary.com/api/auth/apple/callback`.
- Set the Cloudflare worker secret `APPLE_WEB_CLIENT_ID` to that Services ID.
- Verify `https://thedevilsaidictionary.com/api/auth/apple/start` returns a redirect to Apple instead of the current missing-client-id error.
