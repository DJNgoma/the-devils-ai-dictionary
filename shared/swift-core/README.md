# Devil's AI Dictionary Swift Core

This package is the first shared Swift boundary for future native clients.

It is intentionally narrow:

- decode the generated JSON catalog
- expose read-only lookup and faceted filter helpers
- mirror the bookmark persistence shape used by the web app

It does not own UI, routing, platform storage, or full-text search indexing.
