# Store listing copy

This file turns the remaining text-heavy store setup into copy you can paste rather than rewrite.

Use it alongside:

- [Mobile checklists](./checklists.md)
- [Google Play testing](./google-play-testing.md)
- [iOS TestFlight notes](../ios-testflight.md)

## Shared links and contact

- Product URL: `https://thedevilsaidictionary.com`
- Privacy policy URL: `https://thedevilsaidictionary.com/privacy`
- Support URL: `https://github.com/DJNgoma/the-devils-ai-dictionary/issues`
- Secondary contact page: `https://daliso.com`
- Support email: choose the address you actually want exposed in the stores before submission. There is no published support inbox in this repo yet.

## Google Play

### Core listing

- App name: `The Devil's AI Dictionary`
- Short description: `A sceptical field guide to AI terms, hype words, and vendor promises.`

### Full description

The Devil's AI Dictionary is a book-shaped reference for people who already hear AI jargon all day and would like some of it translated back into English.

Read sharp, plain-English definitions of AI terms, hype words, vendor labels, and operational realities. Each entry starts with a memorable definition, then gets to the practical meaning, the common misuse, and the questions worth asking in a real meeting.

What the app does well:

- browse the full dictionary by letter or category
- search across terms, aliases, and definitions
- read a daily word and jump to a random entry
- save entries and keep your reading place on device
- keep reading offline from the bundled catalogue
- open and share canonical links for individual entries

The editorial voice is dry on purpose. The project is not anti-technology or anti-ambition. It is against terminology doing more work than the systems themselves. If a phrase has a legitimate technical meaning, the entry treats it seriously. If it is mostly branding, the entry says so.

No account, payment, or subscription is required to read the dictionary. The app is a reference book, not a social feed. The goal is simple: separate capability from costume and give AI language a little less room to bluff.

### Internal testing release notes

First native Android testing pass. Please focus on install and upgrade behaviour, offline cold launch, search responsiveness, saved entries, theme persistence, deep links, and sharing an entry out to another app.

### Open or closed testing release notes

Native Android beta for The Devil's AI Dictionary. This build is meant to validate everyday reading flow, offline launch, search, deep links, sharing, and persistence across relaunches on real devices before wider rollout.

## App Store Connect

### Core listing

- App name: `The Devil's AI Dictionary`
- Subtitle: `AI jargon, translated back`
- Promotional text: `Sharp, plain-English definitions for AI terms, hype words, and vendor language.`
- Keywords: `AI,dictionary,glossary,technology,startups,productivity,reference`

### Description

The Devil's AI Dictionary is a sceptical field guide to the language around AI.

It is built for readers who already hear the jargon every day and want it translated back into English before it damages a strategy deck, product review, or board slide.

Inside the app you can:

- browse the dictionary by letter and category
- search across terms, aliases, and definitions
- read a daily word or jump to a random entry
- save entries and keep your place on device
- keep reading from a bundled on-device catalogue
- share canonical web links for individual entries

The editorial approach is simple: be funny enough to stay readable, accurate enough to be useful, and sceptical enough to resist vendor perfume. If a term has a precise technical meaning and a swampier marketing meaning, both get named.

The app does not require an account, a subscription, or a payment method to read. It is a reference book, not a feed.

### TestFlight What to Test

This build validates the native reading flow on iPhone and the watch companion path. Please focus on launch stability, browsing, search, saved entries, daily-word state, deep links, and whether the app keeps its place cleanly across relaunches. If you are testing with a paired watch, also check that the current word stays in sync after the phone refreshes its catalogue.

## Still manual

- Android screenshots for phone portrait
- iPhone screenshots for the native iPhone app
- Android feature graphic
- Final support email selection if the store record needs one
