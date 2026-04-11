# 1.0.4 Screenshot Workspace

This directory is the clean screenshot workspace for the `1.0.4` release.

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
- `review`

`raw` is the source-of-truth capture area. `composed` is what the renderer generates. `upload` is the App Store Connect-ready subset to point `asc screenshots upload` at.

## Render Command

```bash
python3 scripts/render-aso-screenshots.py --manifest screenshots/releases/1.0.4/manifest.json
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
