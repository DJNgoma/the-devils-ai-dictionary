# Cross-platform design system

This document is the authoritative style guide for The Devil's AI Dictionary across
all platforms: web (Next.js), iOS (SwiftUI), watchOS, and Android (Compose).

The **web CSS** (`src/app/globals.css`) is the source of truth for color values.
Native platforms must match these hex values exactly.

## Principles

- Mobile-first, not desktop squeezed smaller
- Consistency before novelty — same palette everywhere
- Editorial, but app-like
- Low-friction thumb reach
- Light enough for Samsung A30s-class hardware

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

- Phone primary nav: `Home`, `Browse`, `Search`, `Saved`
- Desktop keeps the fuller top navigation
- Phone secondary routes live behind the app-bar menu

### Buttons

- `primary`: accent fill, white text, high-emphasis action
- `secondary`: bordered surface button, primary text
- `ghost`: low-emphasis chrome action
- Minimum target height: 44px, preferred 48px
- Border radius: 18 dp (iOS) / 16 dp (Android Material small shape)
- Press effect: 0.98 scale (iOS)

### Cards

- Fully tappable on mobile
- Mobile defaults to compact card density
- Background: `panel`/`surface`, 1px `border` stroke
- Corner radius: 24 dp (iOS) / 20 dp (Android medium shape)

### Chips

| Tone | Foreground | Background | Border |
|---|---|---|---|
| neutral | primary text | panelStrong | border |
| accent | accent | accentMuted | accent @ 28% |
| success | success | success @ 12% | success @ 28% |
| warning | warning/danger | warning @ 12% | warning @ 28% |

### Sheets

- Bottom-anchored
- Safe-area-aware
- Scrollable internally
- Used for mobile menu and mobile filters

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
- navigation semantics (Home, Browse, Search, Saved)
- filter semantics
- saved-place shape
- token names and color-role meanings

Replace natively:

- bottom nav with native tab bars
- app bar/detail nav with native stacks
- bottom sheets with native sheets
- save confirmations with haptics or native toasts
