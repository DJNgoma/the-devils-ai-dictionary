# Mobile UI tests

Implemented now:
- iOS smoke tests run through `npm run ios:test:ui`.
- The default build lane runs a representative iPhone matrix: the current iPhone family in the latest installed iOS runtime, plus the latest SE size class.
- The matrix uses clean managed simulators for those iPhone families instead of reusing lived-in personal devices.
- Use `npm run ios:test:ui:17e` when you only want the fast single-device pass on `iPhone 17e`.
- Use `npm run ios:test:ui:all-supported` only when you explicitly want the exhaustive all-supported-iPhone sweep.
- The app launches in `-ui-testing YES` mode so startup skips the live catalogue, Apple account sync, and other flaky remote noise.

TODO next:
- Add Android UI smoke coverage.

TODO later:
- Add macOS UI coverage if the desktop client keeps growing.
- Add visionOS UI coverage if that surface stays worth the effort.
- Add watchOS UI coverage only if the watch app gains enough interaction to justify it.
