---
name: add
description: Add one or more entries to thelist (thelist.jlamb.sh) from a shorthand line each, e.g. "Game Title, 2 stars" or "Game Title, finished Nov 15 2026, rating 7/10". Researches each title, makes the cover, appends to data/items.json, runs the checks, commits and pushes. Use whenever the user wants to add games (or other media) to the list.
---

# /add — add entries to thelist

The user gives one entry per line after the command. Parse each line, do the full workflow for
every entry, then report. `CLAUDE.md` is the authority on the schema and sourcing rules; this
skill is the checklist.

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
2. **Cover:** `npm run cover -- <id> steam:<appid>` when it's on Steam; otherwise a Nintendo
   store / press-kit URL (see CLAUDE.md). Upscaling and letterboxing are fine — just mention it.
   No art at all → `"cover": null` and say so.
3. **Append** the object to `data/items.json`, keeping the array in release-date order (TBA
   last). `added` is today. Platforms: PC first when present; consoles the user owns are
   Switch 2 and PS5, so flag exclusives with `exclusive`.
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
