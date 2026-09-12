# thelist — project guide for Claude Code

A static, framework-free site (Vite + TypeScript, vanilla DOM) listing things Jeff is
excited about, sorted by date. Deploys to Netlify at `thelist.jlamb.sh`. Games for now;
the model already allows tv / movie / event / other.

**Tooling:** Node via `mise` (`mise.toml` pins 22). If `mise` isn't on PATH in your shell,
call `/home/jlamb/.local/bin/mise exec -- npm test` etc. `.npmrc` sets `legacy-peer-deps`;
keep it (npm's resolver chokes on jsdom's optional `canvas` peer without it).

## The common task: "add <game> to the list"

Everything is data-driven; you should not need to touch `src/` to add an entry.

1. **Research** the title on the web: release date (as precise as is announced), platforms,
   developer/publisher, a one-or-two-sentence description, and a store/official link.
   Prefer official sources (Nintendo/PlayStation/Steam store pages, publisher sites);
   Wikipedia is fine for a summary.
2. **Find cover/key art.** Any aspect ratio works; the pipeline crops to 16:9. Good sources:
   - Nintendo store og:image: `https://assets.nintendo.com/image/upload/f_auto/q_auto/w_1200/store/software/switch2/<nsuid>/<hash>` (take the `store/software/...` path from the page's og:image and swap the transform prefix for `f_auto/q_auto/w_1200`).
   - Steam: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/<appid>/<hash>/header.jpg` (from the store page og:image) — only 460px wide, acceptable but soft.
   - Publisher press kits / official site key art (best).
   - Wikipedia infobox art via `https://en.wikipedia.org/wiki/Special:FilePath/<File name>` (low-res, last resort). Send a User-Agent header when curling Wikipedia.
3. **Generate the cover:** `npm run cover -- <id> <source>` → `public/covers/<id>.webp`.
   - **Steam games:** `npm run cover -- <id> steam:<appid>` is the default path. It pulls the
     1232×706 store capsule through Steam's public store-browse API, no key needed. Find the
     appid with `curl 'https://store.steampowered.com/api/storesearch/?term=<name>&cc=us&l=en'`
     (also handy: `api/appdetails?appids=<id>` for release date, credits and blurb).
   - Otherwise pass a URL or local file. `--fit contain` letterboxes instead of cropping
     (use it when a crop would clip the title/logo); `--position top|attention` steers the crop.
   - **Accepted imperfections, no need to ask:** upscaling from a smaller source (Steam's
     460px `header.jpg`, Nintendo 1200px art, etc.) and letterboxing on the dark background
     are both fine. Just mention it in your report, e.g. "cover upscaled from Steam 460px
     header" or "letterboxed to keep the logo". The script prints a warning when it upscales.
   - If no art is findable, set `"cover": null` (placeholder card) and say so.
4. **Append the entry** to `data/items.json`. Schema is in `src/types.ts` (with comments) and
   README. Rules the validator enforces:
   - `id` kebab-case and unique; `type` ∈ game/tv/movie/event/other.
   - `date` ∈ `YYYY-MM-DD` | `YYYY-MM` | `YYYY-Qn` | `YYYY` | `TBA`. Use the vaguest form
     that is actually announced; never invent a day.
   - `platforms` ⊆ PC, Switch 2, PS5, Xbox, Switch, Mobile, Other (exact spelling). List PC
     first when present. Set `exclusive` (and list only that platform) for console exclusives.
   - `cover` is `null` or `/covers/<id>.webp` and the file must exist.
   - `added` is today's date `YYYY-MM-DD`. `hype` is 1–3 (default to 2 unless told).
   - `status` only when Jeff says so: `playing` | `completed` | `dropped`.
   - Finished games: set `status: "completed"` (or `"dropped"`), `completed: "YYYY-MM-DD"` (the
     day he finished; required for completed), and `rating: 1–10` (his score, replaces the hype
     stars on the card). Leave `hype` off for things added straight to done. The done view sorts
     and groups by `completed`, newest first.
   Keep the array roughly in date order for readability (the site sorts anyway).
5. **Verify:** `npm test` (data-integrity test prints exactly what's wrong) and `npm run build`.
6. **Commit** (`Add <title>`) and push; Netlify deploys on push to `main`.

Personal context for descriptions: Jeff prefers PC. He owns a Switch 2 and a PS5, so
console exclusives on those are fine but worth flagging; Xbox exclusives are effectively
"PC" for him if they're on PC too. Write descriptions in a neutral, factual voice (what the
game is), and put any hype/caveats in `notes` (rendered as a `//` comment, lowercase, casual).

## Views & status (how the site interprets data)

- **upcoming**: release window not yet fully passed (or TBA). Default view, grouped by
  month / quarter / year / TBA, firm dates before vague ones.
- **backlog**: released (derived from date) or `status: "playing"`.
- **done**: `status: "completed"` or `"dropped"`. Grouped by month *finished* (`completed`),
  newest first; the "hype" sort becomes "rating" there.

## Code map

`src/dates.ts` (fuzzy dates) and `src/filters.ts` (query/sort/group + URL mapping) are pure
and unit-tested; `src/render.ts` is pure `state → html`; `src/main.ts` owns DOM state and
events. Add new platforms/types/statuses in `src/types.ts` only — validator and UI read the
constants from there. House style: tabs, `eslint` clean, tests for pure logic.

## Future ideas (not built yet)

- Check-off UX for completed items (currently manual `status`/`completed`/`rating` edits in JSON).
- Non-game media: the type chips appear automatically once a second type exists.
- Per-item detail pages / permalinks (`#<id>` already anchors to the card).
- Countdown / "this week" strip at the top of upcoming.
