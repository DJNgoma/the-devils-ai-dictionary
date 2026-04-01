# Codebase history

This is a milestone summary of how the repo moved from its first commit to the current shape. It is not a full changelog. The goal is to explain the major architectural turns, product additions, and release-pipeline changes that matter when you are trying to understand why the tree looks the way it does.

## Overview

- First commit: `8439885` on 2026-03-20
- Current shape: editorial Next.js site, native SwiftUI iPhone app, native Compose Android app, Apple Watch companion, shared generated content snapshot, Cloudflare Workers deploy path, and a Windows desktop package
- One author has carried the whole history so far, with a burst of rapid architectural churn between 2026-03-28 and 2026-04-01

## 1. The scaffold became a book

Key commits:

- `8439885` Initial commit from Create Next App
- `e124740` Build the dictionary, not the dashboard
- `2d8c6c9`, `64411b9`, `81f0a50`, `f24f08e` expanded the initial term catalogue
- `296d21a`, `c949d00` gave the site credits, layout tone, and theme switching

What changed:

- The empty scaffold became an editorial AI reference book instead of a product dashboard.
- `content/entries/*.mdx` became the source of truth for terms.
- The App Router gained the homepage, book landing page, dictionary routes, category browsing, search, random entry routing, metadata helpers, OG images, sitemap, and robots support.
- The repo picked up its book-like visual identity and the first substantial body of entries.

## 2. The web app stopped depending on its birthplace

Key commits:

- `5f55ed9` Let the book escape its birthplace
- `809989a` Teach the worker to bring its own library
- `965c981` Add bookmark system for resume-reading across sessions
- `65b3ff1` Move all content computation to build time to fix Cloudflare Error 1102
- `d774e15` Expand dictionary content and deploy on Cloudflare routes
- `73550b8`, `9e664a1`, `9f67ea5` filled content gaps, opened contribution flow, and simplified suggestions

What changed:

- The deploy target shifted from default Vercel assumptions toward Cloudflare Workers with OpenNext.
- Runtime content work moved toward generated build artifacts instead of dynamic filesystem reads.
- Bookmarks and resume-reading behavior appeared on the web side.
- Contribution and suggestion flows were added so the project could behave more like a living reference work.

## 3. Mobile started as delivery shells

Key commits:

- `c57c9bf` Bundle the book for iPhone and let Xcode judge it
- `7d6b3bb` Teach the iPhone who signs for the book
- `2b92cff` Add Android delivery and tame older WebViews
- `eca0452`, `a8cf09b`, `b4abedb`, `b389b2b` tightened device notes, checklists, accessibility, and shell polish

What changed:

- iPhone shipping began with a Capacitor-backed Apple app in `ios/`.
- Android delivery arrived with a native project wrapper around the web experience, along with asset generation, Gradle wiring, and release notes.
- The repo gained early mobile QA and store-prep documentation.
- At this stage the web layer was still being dressed to survive inside mobile shells.

## 4. Apple Watch, APNs, and server-side push arrived

Key commit:

- `ff5ace5` Wire the Watch, push notifications, and the server behind them

What changed:

- The Apple Watch companion app was added.
- Phone-side current-word management and APNs registration landed.
- Cloudflare-backed push installation and test-send routes were added on the server side.
- Shared Apple code started to consolidate around storage and dictionary snapshot helpers.

This commit is the point where the repo stopped being only a website with wrappers and started becoming a cross-surface product with a real Apple delivery story.

## 5. The mobile architecture pivoted to native clients

Key commits:

- `7ee2a59` Replace the Capacitor webview with native SwiftUI on iPhone
- `7ffb752` Port the four web themes to native SwiftUI with a picker and persistence
- `7be8c64` Stand up the native Kotlin/Compose app inside the Android host
- `7be03e1` Wire universal links, promote the native Android launcher, and capture store screenshots

What changed:

- The iPhone app stopped being a webview shell and became a real SwiftUI application with native tabs, local browse/search/saved flows, entry detail screens, theming, and deep-link handling.
- Android moved toward a native Compose implementation instead of remaining a wrapped web app.
- Mobile design rules and navigation semantics were stabilized across both native clients.

This is the biggest architectural turn in the repo. Much of the later churn is cleanup after this pivot.

## 6. Boundaries, shared data, and CI were hardened

Key commits:

- `d7a3318` Add last-word dates and mend the native footnotes
- `709ae2e` Clarify mobile project boundaries and retire the phantom iOS wing
- `13143c4` Teach CI to build the native Android app
- `90d8441`, `fb5694b` stripped the iPhone web bridge and confined Capacitor to Android
- `0de3fe8`, `51f00b0`, `b106afd` hardened search URL state
- `febdd50`, `52a3660` shared catalogue constants and caught drift at build time
- `e54e844`, `ff4ee12` improved push token lifecycle handling
- `fb49288`, `b93cf74`, `7a2b9da` completed the Android shift away from the Capacitor shell

What changed:

- The repo boundaries became explicit: web in `src/`, native Android in `android/`, Apple code in `ios/`, shared Apple domain logic in `shared/swift-core/`.
- The generated content snapshot became a stronger contract between clients.
- CI started to treat the native Android app as a first-class build target.
- Search state, push lifecycle, and mobile runbooks were tightened so the native clients behaved more predictably.

Some of these commits overlap or partially repeat each other because the mobile cutover happened quickly. The net effect is clear even if the path was not linear.

## 7. Release engineering and platform packaging matured

Key commits:

- `3263c9d`, `0af8bff`, `9c80000` renamed the Apple project and fixed CI/runbooks around it
- `d9c7e52`, `bf75572` shared today's word across the site and Apple bundle
- `afa3c9e` removed a personal team id from the shared Xcode project
- `3a6e3aa` Unify release versioning and add the Windows desktop build
- `2fa33a7` Fold the watch extension into the app and prefer Xcode 26.4
- `41bbc5f` Move the iPhone app into TheDevilsAIDictionary
- `21597e0` Rename Apple asset generation and widen the icon pass

What changed:

- The Apple project stopped living under the generic name `App` and became easier to reason about.
- Release versioning was centralized with shared build-number tooling.
- A Windows desktop package was added as another shipping surface.
- The watch target was simplified for modern Xcode and TestFlight export behavior.
- The iPhone source tree was moved into a conventional named folder, and Apple asset generation was renamed and widened so the icon pipeline now covers the current iPhone and watch targets cleanly.

## Current shape

At the current stage of the repo, the project is organized around a few stable ideas:

- The web app is still the source of truth for content authoring and public site delivery.
- Native mobile clients are first-class products, not wrappers.
- Apple platforms share generated catalogue data and Swift domain logic.
- Cloudflare is the primary website deployment path.
- Release tooling, asset generation, and versioning now live in scripts instead of ad hoc manual steps.

## Reading the history

If you are scanning old commits, a few things help:

- Commits before `7ee2a59` often reflect a webview-shell world that no longer exists on iPhone.
- Commits around `90d8441` through `fb49288` are boundary-cleanup commits after the native pivot and may look repetitive because they close different parts of the same migration.
- Commits from `3263c9d` onward are mostly about naming cleanup, release stability, packaging, and making the Apple project feel like a conventional native app tree instead of inherited scaffolding.
