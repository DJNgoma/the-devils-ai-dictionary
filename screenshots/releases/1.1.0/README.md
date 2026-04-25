# 1.1.0 Screenshot Workspace

This directory is the clean screenshot workspace for the `1.1.0` TestFlight
line. It was prepared from the existing OpenAI-enhanced `1.0.7` screenshot set
at the start of the release pass, before the new `1.1.0 (27)` iOS TestFlight
build was uploaded.

The `aso-appstore-screenshots` skill was run for this pass. No saved ASO
memory state was found for this app, so the existing App Store-ready
`1.0.4` screenshot set was used as the confirmed baseline:

- `SEARCH AI TERMS FAST`
- `BROWSE SKEPTICAL DEFINITIONS`
- `START EACH DAY WITH A NEW ENTRY`
- `SAVE THE TERMS YOU REVISIT`

The enhancement backend for this run is OpenAI Image v2 (`gpt-image-2`) rather
than Nano Banana. The OpenAI-enhanced iPhone set is saved under
`openai/iphone/upload`, with its review contact sheet at
`openai/iphone/review-contact-sheet.png`.

The project-local deterministic renderer remains available as the strict source
of truth under `upload` so text, dimensions, and device crops stay stable.

## Families

- `APP_IPHONE_67` -> `1320 x 2868`
- `APP_IPAD_PRO_3GEN_129` -> `2064 x 2752`
- `APP_WATCH_SERIES_10` -> `416 x 496`

## Directory Layout

- `raw/iphone`
- `raw/ipad`
- `raw/watch`
- `composed/iphone`
- `composed/ipad`
- `composed/watch`
- `upload/iphone`
- `upload/ipad`
- `upload/watch`
- `openai/iphone/source`
- `openai/iphone/upload`
- `review`

`raw` is the source-of-truth capture area. `composed` is what the renderer generates. `upload` is the App Store Connect-ready subset to point `asc screenshots upload` at.

## Render Command

```bash
python3 scripts/render-aso-screenshots.py --manifest screenshots/releases/1.1.0/manifest.json
```

This requires Pillow:

```bash
python3 -m pip install Pillow
```

## iPhone / iPad Capture Notes

The iOS app already supports deterministic screenshot presets through launch arguments:

```bash
-developer-mode YES -developer-screenshot-preset home -site-theme book
-developer-mode YES -developer-screenshot-preset search -site-theme book
-developer-mode YES -developer-screenshot-preset categories -site-theme book
-developer-mode YES -developer-screenshot-preset saved -site-theme book
-developer-mode YES -developer-screenshot-preset entry -site-theme book
```

These presets suppress the splash screen and stage stable content for clean capture.

## Watch Capture Notes

The watch app now supports deterministic screenshot presets too:

```bash
-watch-screenshot-preset home
-watch-screenshot-preset entry
```

Use bundle ID `com.djngoma.devilsaidictionary.watchkitapp` when launching the watch target.

## Current Seed State

- The iPhone family has a full four-slide seed set from the deterministic preset flow.
- The iPad family has a full seed set available from prior raw captures.
- The watch family has one usable home capture.
- All generated upload assets have been validated locally with `asc screenshots validate`.
