# iOS push and watch v1

This repo now ships a first-pass Apple stack with:

- APNs registration in the native iPhone app
- a persisted native `CurrentWordRecord` store on phone and watch
- watch sync through `WCSession.updateApplicationContext`
- a Cloudflare D1-backed installation registry
- a manual push test endpoint for random-word notifications

## Cloudflare runtime

`wrangler.jsonc` binds the D1 database as `PUSH_INSTALLATIONS_DB`.

Required Worker secrets:

- `APNS_BUNDLE_ID`
- `APNS_KEY_ID`
- `APNS_PRIVATE_KEY`
- `APNS_TEAM_ID`
- `PUSH_TEST_SEND_SECRET`
- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT`

Set them with Wrangler:

```bash
npx wrangler secret put APNS_BUNDLE_ID
npx wrangler secret put APNS_KEY_ID
npx wrangler secret put APNS_PRIVATE_KEY
npx wrangler secret put APNS_TEAM_ID
npx wrangler secret put PUSH_TEST_SEND_SECRET
npx wrangler secret put WEB_PUSH_VAPID_PUBLIC_KEY
npx wrangler secret put WEB_PUSH_VAPID_PRIVATE_KEY
npx wrangler secret put WEB_PUSH_VAPID_SUBJECT
```

The D1 migrations live in `migrations/0001_push_installations.sql` and `migrations/0002_push_installation_delivery_preferences.sql`.

## APNs expectations

- The iOS app target needs the Push Notifications capability enabled in the Apple Developer portal and provisioning profile.
- The signed app build must include the `aps-environment` entitlement, or APNs registration will fail even though the project compiles locally.
- The server sends only `slug`, `source`, and `sent_at` in the custom payload. The app resolves the full entry from the bundled catalog.

## Test send

Register an installation by opening the iPhone app and accepting push permission from the in-app prompt.

Then send a manual push:

```bash
curl -X POST https://thedevilsaidictionary.com/api/mobile/push/test-send \
  -H "Authorization: Bearer $PUSH_TEST_SEND_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Target one device token:

```bash
curl -X POST https://thedevilsaidictionary.com/api/mobile/push/test-send \
  -H "Authorization: Bearer $PUSH_TEST_SEND_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"token":"<device-token>"}'
```

Target one entry:

```bash
curl -X POST https://thedevilsaidictionary.com/api/mobile/push/test-send \
  -H "Authorization: Bearer $PUSH_TEST_SEND_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"slug":"agentic-ai"}'
```

## QA notes

- Native iOS and Android daily notifications are scheduled locally on device. The shared `POST /api/mobile/push/daily-send` route is now a web-only server path, invoked by the production Cloudflare Cron Trigger once per day.
- Ordinary app launch should show the last stored word on phone and watch.
- Manual refresh should replace the current word and persist it.
- Notification taps should replace the current word with the pushed slug and route the phone to `/dictionary/{slug}`.
- If the user force-quits the iPhone app from the multitasking switcher, iOS will not resume remote notification delivery until the app is opened again.
