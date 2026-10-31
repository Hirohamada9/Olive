# Olive v1 — PWA (local-only, sync-ready)

Olive is the renamed YoursDaily journal + speaking app, for one user, phone-first.
This v1 is **local-only**: no backend, no Supabase, no network calls, no external
CDN resources. It is built to run as a static site on GitHub Pages and to work
offline via a service worker.

Starting state: **empty**. No demo entries are included.

## Files

- `index.html` — app shell and all five tabs
- `app.js` — all logic, localStorage only
- `style.css` — calm warm cream / soft beige design, warm brown accents
- `manifest.webmanifest` — name Olive, display standalone, start_url `.`, scope `.`
- `sw.js` — caches the app shell only; journal data is not cached by the worker
- `icons/icon-192.png`, `icons/icon-512.png` — simple olive icon, generated locally

## Features

- **Journal (today):** life board with 9 domains only — Move, Learn,
  Speak/Create, Connect, Faith, Work, Home, Explore/Play, Rest — and no
  other domain. Tap for +1, tap again to clear;
  empty is not a failure. Below it, 6 optional prompts with progressive
  autosave and a visible Saved indicator, editable the same day:
  Today I…, The part I actually enjoyed was…, Work today in one line…,
  One thing I learned / noticed…, A God / faith moment if any…, and a goal
  direction (closer / drifting / neither) plus a free-text note.
- **Timeline:** days with content, newest first. Today can be edited via the
  Journal tab. Past days are read-only in v1 (stated in the UI).
- **Board:** current week grid, Monday–Sunday, with domain marks, plus
  you-vs-last-week counts per domain.
- **Talk:** pick a moment from the past week (or write your own), fill in
  Hook / Moment with feeling / Meaning / Close, see a read-back script,
  an estimated time from word count at ~130 words/minute, and save talks
  with a practice rep counter stored per talk.
- **Insights:** weekly and monthly summaries (days journaled, domain counts,
  most tapped domain). Suggested patterns are always labelled
  “Possible pattern — confirm or correct”, never stated as facts, and no
  patterns are suggested with fewer than 3 days of data.
- **Export / Import:** Download Markdown (all entries together) and
  Download JSON backup (the full store below). Import JSON merges by
  date/id: a newer entry replaces an older one, an existing newer entry is
  kept, and practice reps are kept at the higher count.
- **Avatar:** no personal caricature is included — its images are not in
  this repo. The header uses a simple, non-personal olive illustration
  (inline SVG). A personal avatar companion is a later phase.

## Data model — localStorage key `olive-v1`

```json
{
  "version": 1,
  "days": [
    {
      "id": "day-2026-10-31",
      "date": "2026-10-31",
      "domains": ["Move", "Learn"],
      "prompts": {
        "today": "",
        "enjoyed": "",
        "work": "",
        "learned": "",
        "faith": "",
        "goalNote": ""
      },
      "goalDirection": "closer",
      "createdAt": "2026-10-31T09:00:00.000Z",
      "updatedAt": "2026-10-31T09:05:00.000Z"
    }
  ],
  "talks": [
    {
      "id": "talk-abc123-xyz",
      "sourceDate": "2026-10-31",
      "hook": "",
      "moment": "",
      "meaning": "",
      "close": "",
      "reps": 0,
      "createdAt": "2026-10-31T09:00:00.000Z",
      "updatedAt": "2026-10-31T09:00:00.000Z"
    }
  ]
}
```

Rules that make this sync-ready without a rebuild:

- `version` is 1 for this shape. A future sync layer must not silently
  reinterpret a different version.
- Days are keyed by ISO local date (`YYYY-MM-DD`) and by a stable
  `day-<date>` id. A day's identity never changes when its text changes.
- Every day and talk carries `createdAt` / `updatedAt` (ISO timestamps).
  Merge rule: newer `updatedAt` wins for that record; ties keep the
  existing record. Talk `reps` are merged by taking the higher count.
- Domain values are the exact 9 names above. Do not add any other domain.
- `goalDirection` is `""`, `"closer"`, `"drifting"` or `"neither"` only.
- The JSON export is exactly this store object, so it is the migration file.

## How a future cloud sync would work (not built in v1)

1. Create a cloud backend (for example Supabase) with tables matching the
   shapes above, Row Level Security on, and login required — anon key only
   in the app, never a service/secret key.
2. One-time upload: send the local `days` and `talks` arrays to the cloud
   for the signed-in user, applying the same newer-wins merge rule.
3. After that upload, the cloud becomes the source of truth and the
   localStorage copy becomes an offline cache: read from cache when
   offline, write through to the cloud when online, and resolve conflicts
   by `updatedAt` (reps by higher count).
4. Do not change the day ids, date keys, domain names or prompt keys when
   adding sync, or the one-time upload will need a migration map.

## Deploying (separate step, not done here)

Copy this folder's contents to the root of the GitHub Pages site for the
Olive repository, enable Pages from the main branch, and open the site in
Safari on iPhone, then Share → Add to Home Screen. A private repository
does not by itself make the deployed Pages site private.
