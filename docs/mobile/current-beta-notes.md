# Current beta notes

This file is the running inventory for the current prerelease line between the
live App Store build (`1.0.2`) and the next Apple beta upload from this repo
state (`1.0.5`, build `21`).

Use it for three things:

- drafting TestFlight "What to Test" notes
- reminding yourself what actually changed before cutting a build
- keeping the Apple beta checklist tied to the product that exists, not the one
  we vaguely remember

## Cumulative product changes in this prerelease line

### Reading and navigation

- The glossary now groups entries more cleanly and asks for confirmation before
  removal.
- Home can be pulled to refresh on native apps instead of making editorial
  updates feel ceremonial.
- Buttons and menu treatment were tightened across the native apps so the main
  routes behave more consistently.
- The Today's Word card can now save a word directly on Home; saving no longer
  requires opening the entry first.

### Saved words and account sync

- Saved words are now a real collection, not a single local reading-place slot
  pretending to be a feature.
- iPhone and web now support Sign in with Apple for saved-word sync.
- Existing local saved words are merged into the synced account state on first
  sign-in.
- iPhone and web now show clearer sync feedback, including queued, syncing,
  error, and last-synced states.
- Sync is now local-first with a short debounce, so repeated save/remove taps
  do not fire a network request every time.
- Android still keeps saved words local for now.

### Notifications and delivery timing

- Native settings now expose a real notification toggle instead of relying on a
  one-way permission prompt.
- iPhone, Android, and supported browsers can each store a preferred local
  delivery hour for the daily word.
- The site now supports standard Web Push through a service worker and browser
  settings.
- Push installation records now store opt-in state, time zone, and preferred
  delivery hour so per-device delivery is possible.
- APNs delivery handling was tightened so transient offline conditions stop
  being treated as the end of the world.

### Settings, tone, and appearance

- Settings copy was rewritten to sound like the book rather than an appliance
  manual.
- Appearance now supports an Auto mode that resolves to Book in light mode and
  Night in dark mode; turning Auto off reveals the full manual theme list.
- Theme swatches now render with a black outline for better contrast.
- A new Devil theme ships across web, iPhone, and Android with a darker red-led
  palette.
- The site now surfaces the iPhone app more plainly, including an App Store
  callout in the home hero and footer.

### Onboarding and guidance

- A new first-run onboarding sheet on iPhone now points people to Home, saved
  words, Sign in with Apple sync, and the daily reminder instead of expecting
  them to infer the app's shape from the furniture.
- The onboarding flow can hand people directly into the existing guide if they
  want the longer editorial version before wandering off.

### Reviews and store-facing polish

- Native settings now include a manual review action.
- Automatic review prompts are now gated behind actual reading activity and a
  cooldown instead of appearing on launch like a desperate waiter.

### Web and backend groundwork

- The web app now has a dedicated `/settings` page for theme, saved-word sync,
  and browser notifications.
- Privacy copy now documents Sign in with Apple, saved-word sync, and web push
  alongside the existing native flows.
- Shared server routes now handle web push registration and browser delivery.
- New D1 migrations cover push delivery preferences plus Apple auth and synced
  saved words.

## Apple-specific checks for the next TestFlight round

Focus the iPhone pass on the things that changed recently enough to deserve
deliberate suspicion:

- Sign in with Apple succeeds, dismisses the sign-in button, and shows the
  signed-in state in Settings.
- Saved words sync after sign-in, including words saved from Today's Word, entry
  pages, and the Saved tab.
- The sync panel shows useful state changes: queued, syncing, error when
  relevant, and a believable last-synced timestamp after success.
- A relaunch keeps the signed-in state and saved-word collection intact.
- Notification opt-in, opt-out, and delivery-hour changes persist and survive a
  relaunch.
- Auto appearance resolves to Book in light mode and Night in dark mode, while
  manual selection still allows the full theme set when Auto is off.
- The Devil theme applies cleanly, the swatch outlines remain visible, and the
  chosen manual theme persists after relaunch.
- The review action is present in Settings, while no automatic review prompt
  appears on cold launch before the usage gate has been earned.
- Settings copy reads in the same dry register as the rest of the product.
- Fresh installs should show the onboarding sheet once, dismiss cleanly, and
  allow the guide button to hand off into the fuller reading guide.

## Draft "What to Test" note

If you want a short App Store Connect beta note later, this is the current
draft:

> Saved words can now sync through Sign in with Apple on iPhone and web. Try
> saving from Today's Word or any entry, then confirm the sync state and last
> synced time in Settings. Appearance now has an Auto mode that uses Book in
> light mode and Night in dark mode, manual mode still exposes the full theme
> line-up, and fresh installs now open with a short onboarding guide.

## Release-prep notes

- Apply `migrations/0002_push_installation_delivery_preferences.sql` and
  `migrations/0003_auth_and_saved_words.sql` before treating this build as
  release-candidate material.
- Keep the iPhone target's Sign in with Apple capability and
  `com.apple.developer.applesignin` entitlement in place.
- Make sure the Apple auth environment variables are present before expecting
  sign-in or sync to work outside local testing:
  `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`,
  `APPLE_WEB_CLIENT_ID`, `APPLE_NATIVE_CLIENT_ID`,
  `APPLE_WEB_REDIRECT_URI`, `APPLE_SESSION_SECRET`.
- If preferred delivery hours are meant to matter in production, the
  `POST /api/mobile/push/daily-send` job needs to run hourly rather than once a
  day.
