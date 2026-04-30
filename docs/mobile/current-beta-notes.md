# Current beta notes

This file is the running inventory for the current prerelease line between the
live App Store build (`1.0.6`) and the current distributed Apple beta from
this repo state (`1.2.0`, build `28`).

Use it for three things:

- keeping the current TestFlight "What to Test" note aligned with the build
  already in beta testing
- reminding yourself what actually changed before cutting a build
- keeping the Apple beta checklist tied to the product that exists, not the one
  we vaguely remember

## Cumulative product changes in this prerelease line

### Reading and navigation

- The glossary now groups entries more cleanly and asks for confirmation before
  removal.
- See Also and vendor references now resolve into real dictionary entries
  across web, Apple, and Android instead of loose labels.
- Newly linked terms from the expanded catalogue open from category lists,
  search results, daily word, and entry detail screens.
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

- The web home page now opens with a stronger editorial case-file composition
  instead of a beige hero card trying to pass as a personality.
- The default Book palette has been tightened across web, iPhone, and Android
  so it feels warmer, darker, and more intentional.
- The iPhone and Android home screens now share the same sharper opening copy
  and primary actions as the web book.
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

- The first-run onboarding sheet on iPhone now opens with a shorter intro,
  icon-led feature rows, and a pinned primary CTA instead of asking people to
  scroll through a welcome speech before they can move.
- The onboarding flow can still hand people directly into the existing guide if
  they want the longer editorial version before wandering off.

### Reviews and store-facing polish

- Native settings now include a manual review action.
- Automatic review prompts are now gated behind actual reading activity and a
  cooldown instead of appearing on launch like a desperate waiter.

### Release surfaces and capture tooling

- The installed app name is now shortened to Devil's AI across iPhone, Apple
  Watch, visionOS, macOS, and Android so device labels stop truncating it.
- The Apple screenshot workspace now has deterministic Home, Search,
  Categories, Saved, and Entry presets for cleaner capture passes without
  exposing that harness in ordinary app behaviour.
- Sharing a dictionary entry now sends the definition card image where the
  platform supports file sharing, while still including the entry link for
  people who want to read the word.

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

- The Home screen should feel like the dictionary's opening page, not a stack of
  generic rounded cards.
- The Book theme should use the warmer accent, readable contrast, and visible
  swatches across light-mode surfaces.
- The primary Home actions should read "Start the book" and "Draw a term" and
  behave correctly at ordinary iPhone widths.
- See Also and vendor references resolve into real entries instead of loose
  labels.
- Newly linked entries open from category lists, search results, daily word,
  and entry detail screens.
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
- Fresh installs should show the onboarding sheet once, keep the primary CTA
  visible, dismiss cleanly, and allow the guide button to hand off into the
  fuller reading guide.
- Sharing an entry from iPhone should offer a definition-card image plus the
  word link; if an app accepts only text, the fallback should still include the
  link and readable wording.

## Current "What to Test" note

The intended `en-US` App Store Connect note for build `28` is:

```text
Please focus on the 1.2.0 iPhone beta behaviour in this build:

- The Home screen should feel like the dictionary's opening page, not a stack of generic rounded cards.
- The Book theme should use the warmer accent, readable contrast, and visible swatches across light-mode surfaces.
- "Start the book" and "Draw a term" should work cleanly at ordinary iPhone widths.
- Browse and search the expanded dictionary; See Also and vendor references should still resolve into real entries instead of loose labels.
- Saved words should still behave as one collection across Today's Word, entry pages, and the Saved tab.
- Sign in with Apple should keep saved-word sync intact after relaunch.
- Notifications should allow opt-in, opt-out, and local delivery-hour changes without losing the saved preference after relaunch.
- Appearance should support Auto mode plus the manual themes, including Devil, without losing the chosen setting.
- Sharing an entry should include the definition-card image and word link where the target app supports shared files.
```

Internal note:

```text
Internal 1.2.0 pass: scrutinise the taste changes first. Home should feel like an editorial opening page, the warmer Book palette should hold contrast, and Start the book / Draw a term should behave at normal iPhone widths. Then recheck saved words, Sign in with Apple, notifications, Auto appearance, and sharing so the polish did not quietly mug the plumbing.
```

External note:

```text
The 1.2.0 beta refreshes the opening experience and default Book palette. Please try Home, Start the book, Draw a term, search, saved words, appearance, notifications, and sharing on your usual device. If anything feels like a generic app template wearing a clever sentence, that is useful feedback.
```

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
