# Commit message style

This repo's best commit subjects sound like the book: dry, controlled, slightly barbed, and specific about what changed.

## House style

- Use a single-line subject only.
- Use the imperative mood.
- Do not end with a period.
- Target roughly 45 to 72 characters.
- Put the concrete change first and the wit second.
- Keep the tone dry, book-aware, and slightly barbed.
- Use at most one twist or metaphor.
- Avoid corporate filler, boilerplate generator phrasing, and conventional-commit prefixes.
- Prefer repo-aware nouns such as `book`, `dictionary`, `entries`, `worker`, `routes`, `credits`, and `shelf`.
- If the change is highly technical, let clarity win and keep the wit restrained.

## Fallback rule

If a subject cannot be made witty without becoming vague, use a plain imperative line that is specific and restrained.

## Audit of the visible `main` history

This audit covers the currently visible `main` history reviewed for this repo.

### Strong fit

- `68a5588 Retire the jargon shelf for now`
- `809989a Teach the worker to bring its own library`
- `5f55ed9 Let the book escape its birthplace`
- `f24f08e Add the companies the founders keep pointing at`
- `81f0a50 Add the people whose names now function as strategy`
- `d952dfd Add the hosting rivalry without the melodrama`
- `c949d00 Let the book change its clothes`
- `296d21a Put the credits in the book, where they belong`
- `64411b9 Add the devices and wrappers people keep mistaking for destiny`
- `2d8c6c9 Add the cultural jargon before it colonises the place`
- `e124740 Build the dictionary, not the dashboard`

### Acceptable, but flatter than the strongest voice

- `73550b8 Fill alphabet gaps and link Daliso site`
- `d774e15 Expand dictionary content and deploy on Cloudflare routes`
- `65b3ff1 Move all content computation to build time to fix Cloudflare Error 1102`
- `965c981 Add bookmark system for resume-reading across sessions`

### Off-tone

- `8439885 Initial commit from Create Next App`

All other visible commits in the reviewed `main` history are either strong fits or already aligned with the house style closely enough not to merit correction.

## Write like this / avoid this

| Prefer | Why it works |
| --- | --- |
| `Build the dictionary, not the dashboard` | Concrete first, dry second, unmistakably this project |
| `Retire the jargon shelf for now` | Light wit, clear intent, no product-management perfume |
| `Teach the worker to bring its own library` | Technical change stated in the repo's own voice |

| Avoid | Why it misses |
| --- | --- |
| `Initial commit from Create Next App` | Boilerplate generator phrasing with no project voice |
| `Update build pipeline and deployment configuration` | Flat operational phrasing that could belong to any repo |
| `feat: improve content management workflow` | Generic product/devops language plus a conventional-commit prefix |
