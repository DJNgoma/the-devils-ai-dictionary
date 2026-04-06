# Cross-platform design system

This document is the authoritative style guide for The Devil's AI Dictionary across
all platforms: web (Next.js), Windows (Electron), iOS (SwiftUI), watchOS, and
Android (Compose).

The **web CSS** (`src/app/globals.css`) is the source of truth for color values.
Native platforms must match these hex values exactly.

The Windows app is the web build in an Electron shell — no separate UI.
When this document says "web", that includes Windows.

## Principles

- Mobile-first, not desktop squeezed smaller
- Consistency before novelty — same palette everywhere
- Editorial, but app-like
- Low-friction thumb reach
- Light enough for Samsung A30s-class hardware

---

## Home page specification

The home page is the most visible surface and the most likely to drift between
platforms. This section is the canonical reference for what appears, in what
order, and with what labels. If a platform diverges from this list, it is a bug.

### Hero section

| Element | Value | Notes |
|---|---|---|
| Kicker | "Field guide" (apps) / "Online book" (web) | Web adds "· Updated [date]" |
| Title | "The Devil's AI Dictionary" | h1/page title |
| Primary CTA | **Read the book** | `button-primary`, navigates to /book |
| Secondary CTA | **Random entry** | `button-secondary`, navigates to /random |

Hero CTAs sit in a single row and share the available width equally. On Android use `Row` with `Modifier.weight(1f)` on each button (not `FlowRow`, which wraps them onto two lines on narrower devices). On iOS use an `HStack` with equal-width buttons. Never let one CTA push the other to a second row.

No "Browse the dictionary" link. The categories section lower on the page serves
that purpose.

### Today's word section

| Element | Value | Notes |
|---|---|---|
| Section label | "Today's word" | All platforms |
| Word title | Entry title | Large serif heading |
| Devil definition | Full text | Primary body text |
| Plain definition | Full text | Muted body text |
| Primary CTA | **Open** | `button-primary` |
| Share button | **Share** | Secondary, inline in the same action row |
| Random entry button | None | The Home hero already exposes Random entry; do not duplicate |
| Refresh button | None | Removed — this is a daily word, not manually refreshable |
| Date chip | None | Do not show the date under the word title |
| Warning label | None | `warningLabel` is retained in the data model but not rendered in any UI |

### Push notification prompt

Shown inside the today's word card, below the action buttons.

| Platform | Behaviour |
|---|---|
| iOS | Live prompt: "Enable notifications" or "Open Settings" depending on permission state (APNs) |
| Android | Live prompt: "Enable notifications" wired to the POST_NOTIFICATIONS runtime permission, status surfaced in Settings → Push diagnostics (FCM) |
| Web / Windows | Not shown |

Both mobile apps register the device token with `POST /api/mobile/push/installations`. iOS dispatches via APNs HTTP/2, Android via FCM HTTP v1 (`src/lib/server/fcm.ts`), branching per installation row in the shared test-send route. The `daily-word` notification channel is created in `DictionaryApplication`, and `DevilsFirebaseMessagingService` builds a `NotificationCompat` with a `slug` extra that `NativeDictionaryStore.handleIntent` reads as `CurrentWordSource.notificationTap`.

### Featured entry

| Element | Value |
|---|---|
| Section label | "Featured" |
| Card | Standard entry card |

### Browse by category

| Element | Value | Notes |
|---|---|---|
| Section label | **Browse by category** | Not "Categories" |
| Grid | Category cards | 2-col on phone, 3-col on desktop |
| "View all" link | "View all categories" | Web only (secondary text link) |

### Tab bar / bottom navigation

| Tab | Label | All platforms |
|---|---|---|
| 1 | Home | Yes |
| 2 | Search | Yes |
| 3 | Categories | Yes |
| 4 | Saved | Yes |
| 5 | Settings | Apps only (iOS, Android) |

Web uses a top navigation bar with: Home, Dictionary, Categories, Random, About, Search.

### Action buttons

One spec for every screen and every platform. The same conceptual action gets the same label, emphasis, and position everywhere.

| Rule | Value |
|---|---|
| No leading icons | Action-row buttons are label-only on every platform. Reserve icons for toolbar/nav affordances, not inline actions. |
| Share lives inline | Share is a secondary button inside the primary action row, not a standalone button below it. |
| Order | Primary action first, then secondaries left-to-right: Related terms → Share → Clear. Destructive/neutralising actions rightmost. |

Canonical labels (do not paraphrase):

| Concept | Label |
|---|---|
| Open the Today's word entry | **Open** |
| Open the saved place | **Open saved place** |
| Save the current entry as the saved place | **Save word** |
| Save the current book page as the saved place | **Save place** |
| Jump to related terms for an entry | **Related terms** |
| Share an entry or the daily word | **Share** |
| Clear the saved place | **Clear** |
| Read the book from the Home hero | **Read the book** |
| Random entry from the Home hero | **Random entry** |

### Platform verification status

| Platform | Last verified | Build | Status |
|---|---|---|---|
| Web | 2026-04-05 | — | Verified |
| iOS | 2026-04-06 | 14 (1.0.2) | Verified |
| Android | 2026-04-06 | 14 (1.0.2) | Verified |
| Windows | — | — | Untested (shares web build, expected to match) |
| watchOS | — | — | Untested (separate UI, see watchOS rules below) |

---

## Themes

Four themes ship on every platform. Only Night is dark; the rest use `color-scheme: light`.

| Theme | Mood | Color scheme |
|---|---|---|
| Book | warm, literary | light |
| Codex | cool, technical | light |
| Absolutely | muted, minimalist | light |
| Night | dark, amber | dark |

Theme is persisted per-platform (`localStorage` on web, `UserDefaults` on Apple, `SharedPreferences` on Android). Default is Book.

---

## Color tokens

### Authoritative palette (web hex values — native must match)

#### Book

| Token | Hex | Role |
|---|---|---|
| background | `#f4efe6` | page fill |
| background-muted | `#efe7da` | recessed areas |
| foreground | `#231d17` | primary text |
| foreground-soft | `#65584c` | muted/secondary text |
| accent | `#b2552f` | brand, links, primary buttons |
| success | `#26594a` | positive states |
| warning | `#92400e` | caution states |
| danger | `#a63b32` | errors, destructive actions |

#### Codex

| Token | Hex | Role |
|---|---|---|
| background | `#f3f8fd` | page fill |
| background-muted | `#e9f1f9` | recessed areas |
| foreground | `#0d0d0d` | primary text |
| foreground-soft | `#516273` | muted/secondary text |
| accent | `#0169cc` | brand, links, primary buttons |
| success | `#00a240` | positive states |
| warning | `#b26714` | caution states |
| danger | `#e02e2a` | errors, destructive actions |

#### Absolutely

| Token | Hex | Role |
|---|---|---|
| background | `#f6f3ee` | page fill |
| background-muted | `#f0ece4` | recessed areas |
| foreground | `#2d2d2b` | primary text |
| foreground-soft | `#6e685f` | muted/secondary text |
| accent | `#cc7d5e` | brand, links, primary buttons |
| success | `#00c853` | positive states |
| warning | `#b67a3a` | caution states |
| danger | `#ff5f38` | errors, destructive actions |

#### Night

| Token | Hex | Role |
|---|---|---|
| background | `#12100d` | page fill |
| background-muted | `#171411` | recessed areas |
| foreground | `#efe6d7` | primary text |
| foreground-soft | `#b8a893` | muted/secondary text |
| accent | `#e4864d` | brand, links, primary buttons |
| success | `#5ec9a1` | positive states |
| warning | `#f3a43c` | caution states |
| danger | `#f08a7d` | errors, destructive actions |

### Surface & border tokens

Web uses `rgba()` surfaces for backdrop-blur. Native platforms flatten these to solid hex:

| Token | Book | Codex | Absolutely | Night |
|---|---|---|---|---|
| surface (iOS: panel) | `#fffbf5` | `#ffffff` | `#f9f9f7` | `#1c1814` |
| surface-strong (iOS: panelStrong) | `#efe7da` | `#e9f1f9` | `#f0ece4` | `#211c17` |
| border (iOS/Android) | `#d4c2b0` | `#c4d5e8` | `#ddd0c3` | `#4a3d38` |
| accent-muted | `#f7e0cf` | `#d6e8f5` | `#f5e2d6` | `#663019` |

### Platform token mapping

| Web CSS var | iOS (ThemeColorSet) | Android (NativeColors) | watchOS |
|---|---|---|---|
| `--background` | `paper` | `paper` | system bg |
| `--surface` | `panel` | `surface` | — |
| `--surface-strong` | `panelStrong` | `surfaceStrong` | — |
| `--foreground-soft` | `mutedText` | *(add `foregroundSoft`)* | `.secondary` |
| `--accent` | `accent` | `accent` | `.orange` tint |
| `--success` | `success` | `success` | system green |
| `--danger` | `warning` (iOS) | `warning` (Android) | system red |

---

## Typography

### Fonts

| Role | Web | iOS | Android |
|---|---|---|---|
| Display | Fraunces 500/600/700 | system .serif | `FontFamily.Serif` |
| Body | Source Serif 4 400–700 | system .serif | `FontFamily.Serif` |
| UI text | Source Serif 4 | system .rounded | system default |
| Mono | IBM Plex Mono 400/500 | system .monospaced | `FontFamily.Monospace` |

Native platforms use system serif/mono rather than bundling web fonts.
This is intentional — system fonts feel more at home on each OS.

### Type scale (pt/dp)

| Role | Size | Weight | Design | Used for |
|---|---|---|---|---|
| Kicker/meta | 11 | semibold | monospaced | section labels, dates |
| Small UI | 12 | semibold | rounded | chips, badges |
| Body small | 14–15 | regular | rounded | plain definitions |
| Body | 16–17 | medium | rounded | devil definitions |
| Card title | 24 (compact) / 30 | semibold | serif | entry titles |
| Page title | 32–40 | bold | serif | screen headings |

### watchOS type scale

watchOS uses dynamic type with design families:

| Role | Style | Design |
|---|---|---|
| Entry title | `.title3` | serif, semibold |
| Section heading | `.headline` | serif, semibold |
| Definition body | `.body` | rounded |
| Supporting text | `.footnote` | rounded |
| Label | `.caption2` | rounded, semibold |

---

## Spacing

Scale: `4, 8, 12, 16, 20, 24, 32, 40, 48`

| Context | Value |
|---|---|
| Phone edge padding | 16 |
| Tablet edge padding | 24 |
| Desktop edge padding | 32 |
| Card internal padding | 20 |
| Card gap (between cards) | 14 (Android) / 12 (iOS grid) |
| Section spacing | 24 (iOS) / 18 (Android) |
| Control min height | 48 (iOS) / 52 (Android) |

---

## Radii

| Surface | Value | Style |
|---|---|---|
| Controls / buttons | 16 dp | continuous (iOS) |
| Cards | 20 dp (Android) / 24 dp (iOS) | continuous (iOS) |
| Emphasized surfaces | 24–28 dp | continuous (iOS) |
| Chips | capsule / full | — |

Web equivalents: `--radius: 1.5rem`, `--radius-card: 1.25rem`, `--radius-control: 1rem`

---

## Elevation & shadows

| Platform | Default card | Emphasis card |
|---|---|---|
| Web | `0 12px 36px rgba(…, 0.08)` per-theme | `0 18px 60px rgba(…, 0.11)` per-theme |
| iOS | `black 5%, r:10, y:6` | `black 10%, r:18, y:10` |
| Android | Material 3 defaults | Material 3 defaults |

Mobile defaults to border + low shadow. Heavy blur reserved for hero moments.

---

## Components

### Navigation

- Phone primary nav (web): `Home`, `Search`, `Categories`, `Saved`
- Native app tabs (iOS/Android): `Home`, `Search`, `Categories`, `Saved`, `Settings`
- Desktop keeps the fuller top navigation: Home, Dictionary, Categories, Random, About, Search
- Phone secondary routes live behind the app-bar menu (web) or Settings tab (native)

### Buttons

- `primary`: accent fill, white text, high-emphasis action
- `secondary`: bordered surface button, primary text
- `ghost`: low-emphasis chrome action
- Minimum target height: 44px, preferred 48px
- Border radius: 18 dp (iOS) / 16 dp (Android Material small shape)
- Press effect: 0.98 scale (iOS)

### Cards

- Fully tappable on mobile — wrap in a button/clickable, set `contentShape(Rectangle())` (iOS) or use the `onClick` parameter (Android) so the **whole card area** registers taps, not just the rendered text glyphs
- Mobile defaults to compact card density
- Background: `panel`/`surface`, 1px `border` stroke
- Corner radius: 24 dp (iOS) / 20 dp (Android medium shape)

#### Emphasis treatment

The **first card on every primary screen** (Home, Categories, Search, Saved, Book, Guide, About) is the section description card. It uses the **emphasised** background (`panelStrong` / `surfaceStrong`) to set the screen apart from the content cards below it.

| Surface | Default | Emphasis |
|---|---|---|
| iOS | `NativeCard {}` | `NativeCard(emphasis: true) {}` |
| Android | `NativeScreenCard(colors)` | `NativeScreenCard(colors, emphasis = true)` |

Per-screen emphasis:

| Screen | First card | Emphasis |
|---|---|---|
| Home | "Field guide" hero | yes |
| Today's word section | "Today's word" | no (it's a content card) |
| Categories | "Categories" intro | yes |
| Search | "Search" intro | yes |
| Saved | "Saved" intro | yes |
| Book / Guide / About | section header | yes |

### Chips

| Tone | Foreground | Background | Border |
|---|---|---|---|
| neutral | primary text | panelStrong | border |
| accent | accent | accentMuted | accent @ 28% |
| success | success | success @ 12% | success @ 28% |
| warning | warning/danger | warning @ 12% | warning @ 28% |

### Sheets and modals

- Bottom-anchored where it suits the gesture (filters, mobile menu)
- Full-screen sheets for content that benefits from a clean canvas
- Safe-area-aware
- Scrollable internally

#### Modal inventory

| Surface | iOS presentation | Android presentation | Web equivalent |
|---|---|---|---|
| Entry detail | `.sheet(item:)` | `NativeOverlayScaffold` (full-screen overlay) | route `/dictionary/[slug]` |
| Category detail | `.sheet(item:)` | `NativeOverlayScaffold` (full-screen overlay) | route `/categories/[slug]` |
| Book | `.sheet(item:)` | `NativeOverlayScaffold` | route `/book` |
| Guide | `.sheet(item:)` | `NativeOverlayScaffold` | route `/how-to-read` |
| About | `.sheet(item:)` | `NativeOverlayScaffold` | route `/about` |
| Search filters | `.sheet(isPresented:)` Form | `ModalBottomSheet` | mobile filter `AppSheet` |
| Overflow menu | `Menu` toolbar | `DropdownMenu` | mobile menu `AppSheet` |

Tapping a category card anywhere in the apps (Home hero grid **and** the Categories tab) opens the category modal with the entries inside — never a filtered Search view. The old "show in search" path is reserved for developer-mode affordances only.

Tapping a category card on the apps opens the category modal with the entries inside. Tapping an entry inside the modal opens the entry detail on top of it. Closing the entry returns you to the category modal; closing the category returns you to whichever tab you came from. The web stays on routes — the apps use modals because tab + push navigation would lose the user's place.

### Save feedback

After saving an entry or the book landing page, both apps show a brief confirmation:

| Platform | Mechanism | Action |
|---|---|---|
| iOS | Toast banner overlay (`NativeSavedToast`), 2.5s auto-dismiss | "Open" jumps to Saved tab |
| Android | `SnackbarHost` from main scaffold | "Open" jumps to Saved tab |

### Feedback states

- Loading: small text/skeleton-like placeholder, no spinner theatre
- Empty: one explanation, one next action
- Success: lightweight inline acknowledgement
- Error: plain explanation plus recovery route

---

## Android native rules

- Use Compose and native window insets for safe areas, not WebView fallback CSS
- Use edge-to-edge layouts with explicit inset handling around app bars, bottom bars, and sheets
- Keep keyboard behavior native and predictable
- Handle Android hardware back explicitly: close overlays first, return to `Home` from other tabs, and background the app at root

## watchOS rules

- Use system dynamic type — no custom font sizes
- Orange accent for highlights, red for warnings
- List with `.carousel` style for vertical paging
- Sections: Today's word (hero), Featured, Recent, Misunderstood
- Tap to open on phone via `WKApplication.shared().openSystemURL()`

---

## Shared handoff contract

Keep shared across platforms:

- content contract (entries, definitions, categories)
- navigation semantics (Home, Search, Categories, Saved)
- filter semantics
- saved-place shape
- token names and color-role meanings

Replace natively:

- bottom nav with native tab bars
- app bar/detail nav with native stacks
- bottom sheets with native sheets
- save confirmations with haptics or native toasts
