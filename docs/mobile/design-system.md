# Mobile design system

This document is the working UI contract for the Capacitor shell and the future native replacements.

## Principles

- Mobile-first, not desktop squeezed smaller
- Consistency before novelty
- Editorial, but app-like
- Low-friction thumb reach
- Light enough for Samsung A30s-class hardware
- Structured to map cleanly to SwiftUI and Compose later

## Tokens

### Spacing

- `4, 8, 12, 16, 20, 24, 32, 40, 48`
- Phone edge padding defaults to `16`
- Major mobile section spacing defaults to `24`
- Reading-card padding defaults to `20`

### Typography

- Kicker/meta: `11/12`
- Small UI/body-sm: `14/20`
- Body: `16/26`
- Emphasized body: `18/28`
- Card title: `22/28`
- Page title on phones: `32/36`

### Radii

- Controls: `16`
- Cards: `20`
- Emphasized surfaces: `24`
- Pills/chips: full

### Elevation

- Mobile defaults to border + low shadow
- Heavy blur is not the default phone treatment
- Deeper shadow and blur are reserved for larger breakpoints or singular hero moments

## Components

### Navigation

- Phone primary nav: `Home`, `Browse`, `Search`, `Saved`
- Desktop keeps the fuller top navigation
- Phone secondary routes live behind the app-bar menu

### Buttons

- `primary`: accent fill, high-emphasis action
- `secondary`: bordered surface button
- `ghost`: low-emphasis chrome action
- Minimum target height: `44px`, preferred `48px`

### Inputs

- Search stays visible on mobile browse/search screens
- Secondary filters move into a bottom sheet
- Inputs and selects use the same control height and radius

### Cards and lists

- Browse cards are fully tappable
- Mobile defaults to the compact card density
- Reading sections use a single editorial-card shell instead of one-off containers

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

## Capacitor shell rules

- Use `viewportFit: cover`
- Use `interactiveWidget: resizes-content`
- Use Capacitor `SystemBars` inset CSS fallback for Android WebView safe areas
- Hide or get out of the way of the keyboard rather than fighting it
- Handle Android hardware back explicitly: close sheets first, go back if possible, minimize the app at root

## Native handoff

Keep shared:

- content contract
- navigation semantics
- filter semantics
- saved-place shape
- token names and color-role meanings

Replace natively later:

- bottom nav with native tab bars
- app bar/detail nav with native stacks
- bottom sheets with native sheets
- save confirmations with haptics or native toasts
