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
3. **Generate the cover:** `npm run cover -- <id> <url-or-local-file>` → `public/covers/<id>.webp`.
   Use `--fit contain` for portrait box art (letterboxes instead of cropping heads off) or
   `--position top|attention` to steer the crop. If no art is findable, set `"cover": null`
   and the card shows a placeholder; fix it up later.
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
- **done**: `status: "completed"` or `"dropped"`.

## Code map

`src/dates.ts` (fuzzy dates) and `src/filters.ts` (query/sort/group + URL mapping) are pure
and unit-tested; `src/render.ts` is pure `state → html`; `src/main.ts` owns DOM state and
events. Add new platforms/types/statuses in `src/types.ts` only — validator and UI read the
constants from there. House style: tabs, `eslint` clean, tests for pure logic.

## Future ideas (not built yet)

- Check-off UX for completed items (currently manual `status` edits in JSON).
- Non-game media: the type chips appear automatically once a second type exists.
- Per-item detail pages / permalinks (`#<id>` already anchors to the card).
- Countdown / "this week" strip at the top of upcoming.
