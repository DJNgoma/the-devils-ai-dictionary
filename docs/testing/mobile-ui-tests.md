# Mobile UI tests

Implemented now:
- iOS smoke tests run through `npm run ios:test:ui`.
- The suite targets `platform=iOS Simulator,name=iPhone 17e,OS=latest`.
- The app launches in `-ui-testing YES` mode so startup skips the live catalogue, Apple account sync, and other flaky remote noise.

TODO next:
- Add Android UI smoke coverage.

TODO later:
- Add macOS UI coverage if the desktop client keeps growing.
- Add visionOS UI coverage if that surface stays worth the effort.
- Add watchOS UI coverage only if the watch app gains enough interaction to justify it.
