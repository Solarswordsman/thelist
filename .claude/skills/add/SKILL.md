---
name: add
description: Add one or more entries to thelist (thelist.jlamb.sh) from a shorthand line each, e.g. "Game Title, 2 stars" or "Game Title, finished Nov 15 2026, rating 7/10". Researches each title, makes the cover, appends to data/items.json, runs the checks, commits and pushes. Use whenever the user wants to add games (or other media) to the list.
---

# /add — add entries to thelist

The user gives one entry per line after the command. Parse each line, do the full workflow for
every entry, then report. This file is the complete workflow; `src/types.ts` is the schema of
record and `npm test` enforces it.

## Input shorthand

Each line is `<title>` followed by comma-separated hints. Recognise, in any order:

| Hint | Meaning |
|---|---|
| `N stars` / `N★` / `hype N` | `hype: N` (1–3). Default **2** if absent and not finished. |
| `finished <date>` / `done <date>` / `completed <date>` | `status: "completed"`, `completed: <ISO date>`. |
| `dropped <date>` | `status: "dropped"`, `completed: <ISO date>`. |
| `playing` | `status: "playing"`. |
| `rating N/10` / `N/10` | `rating: N`. |
| `(add a comment: ...)` / `(note: ...)` / anything in parentheses | `notes: "..."` — keep the user's wording, lowercase, casual. |
| `tv` / `movie` / `event` | `type` (default `game`). |

Dates in hints can be casual ("November 15 2026", "nov 15") — convert to `YYYY-MM-DD`; assume the
current year if none given. Everything else on the line is the title (trim it; fix obvious typos
against the official name and mention it).

## Per entry

1. **Research** (web search / fetch): official title, release date at the announced precision
   (`YYYY-MM-DD` | `YYYY-MM` | `YYYY-Qn` | `YYYY` | `TBA` — never invent a day), platforms,
   whether it is a console exclusive, developer/publisher, 1–2 sentence neutral description,
   genre tags, and a store/official link plus a wiki link where useful. Prefer official sources.
   For Steam titles, `curl 'https://store.steampowered.com/api/storesearch/?term=<name>&cc=us&l=en'`
   gives the appid and `api/appdetails?appids=<id>` gives date/credits/blurb.
2. **Cover:** `npm run cover -- <id> <source>` writes `public/covers/<id>.webp` (640×360,
   16:9). Sources, best first:
   - `steam:<appid>` — pulls the 1232×706 store capsule via Steam's public store-browse API,
     no key needed. Use this for anything on Steam.
   - Nintendo store: take the `store/software/...` path from the product page's og:image and
     use `https://assets.nintendo.com/image/upload/f_auto/q_auto/w_1200/<that path>` (1200×675).
   - Publisher press kit / official-site key art, any size.
   - Wikipedia infobox art via `https://en.wikipedia.org/wiki/Special:FilePath/<File name>`
     (low-res, last resort; send a User-Agent when curling).
   Any aspect ratio works: the script crops to 16:9. `--fit contain` letterboxes instead (use
   it when a crop would clip the title/logo); `--position top|attention` steers the crop.
   **Accepted without asking:** upscaling from a small source and letterboxing on the dark
   background — just mention it in the report. No art at all → `"cover": null` and say so.
3. **Append** the object to `data/items.json`, keeping the array in release-date order (TBA
   last). Rules the validator enforces (full model with comments in `src/types.ts`):
   - `id` kebab-case and unique (also names the cover file); `type` ∈ game/tv/movie/event/other.
   - `date` ∈ `YYYY-MM-DD` | `YYYY-MM` | `YYYY-Qn` | `YYYY` | `TBA` — the vaguest form that is
     actually announced.
   - `platforms` ⊆ PC, Switch 2, PS5, Xbox, Switch, Mobile, Other (exact spelling), PC first
     when present. Console exclusive → set `exclusive` and list only that platform.
   - `cover` is `null` or `/covers/<id>.webp` and the file must exist.
   - `added` is today (`YYYY-MM-DD`). `hype` 1–3. `status` only when the user says so.
   - Finished: `status: "completed"` (or `"dropped"`) + `completed: "YYYY-MM-DD"` + `rating`
     1–10. Leave `hype` off for things added straight to done.
   - `description`: 1–2 neutral, factual sentences (what it is). Hype and caveats go in
     `notes`, rendered as a `//` comment — lowercase, casual, the user's voice.
4. If a line names something already in the list, update that entry (e.g. mark it finished)
   rather than duplicating it.

## Finish

- Run `npm test` and `npm run build` (through `mise exec` if `npm` isn't on PATH). Fix any
  validator complaint — its messages say exactly what's wrong.
- Commit as `Add <title>` (or `Add N games` with the titles in the body) and `git push` so
  Netlify deploys. Skip the push only if the user says so.
- Report a compact table: title · date · platforms · hype/rating · cover note (e.g. "steam
  1232px", "upscaled from 460px", "letterboxed", "no art found"). Call out anything you were
  unsure of (conflicting dates, unconfirmed platforms) so the user can double-check.
