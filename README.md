# thelist

A dated list of things I'm excited about, live at **thelist.jlamb.sh**. Upcoming
games for now; TV, films, live shows and whatever else can join later.

Static site, no framework: plain TypeScript + Vite, terminal-flavoured to match
[jlamb.sh](https://jlamb.sh). All content lives in one JSON file, so adding an entry
is "edit JSON, drop in a cover, push" and Netlify redeploys.

## Develop

Tool versions come from `mise.toml` (Node 22); run everything through `mise exec`
(or an interactive shell where mise is activated).

```sh
npm install        # .npmrc sets legacy-peer-deps (jsdom's optional canvas peer trips npm)
npm run dev        # vite dev server
npm run lint       # eslint (tabs, typescript-eslint)
npm test           # vitest — dates, filters, render smoke tests, and the data-integrity gate
npm run build      # tsc typecheck + vite production build → dist/
npm run preview    # serve the production build locally
```

## Adding an entry

1. Append an object to `data/items.json` (schema below; `CLAUDE.md` has the
   agent-facing walkthrough).
2. Make a cover: `npm run cover -- <id> steam:<appid>` (pulls the full-size store
   capsule, no API key) or `npm run cover -- <id> <image-url-or-file>`. Either writes
   a fixed 640×360 (16:9) webp to `public/covers/<id>.webp`. Add `--fit contain` for
   art you don't want cropped, or `--position top` etc. to steer the crop.
3. `npm test` — the data test fails with a specific message if anything's off.
4. Commit and push.

### Schema (`data/items.json`)

```jsonc
{
  "id": "control-resonant",            // kebab-case, unique; names the cover file
  "type": "game",                      // game | tv | movie | event | other
  "title": "Control: Resonant",
  "date": "2026-09-24",                // or "2026-09", "2026-Q4", "2026", "TBA"
  "platforms": ["PC", "PS5", "Xbox"],  // PC | Switch 2 | PS5 | Xbox | Switch | Mobile | Other
  "exclusive": "Switch 2",             // optional; flags a console exclusive
  "description": "One or two sentences.",
  "cover": "/covers/control-resonant.webp",  // or null
  "developer": "Remedy Entertainment", // optional
  "publisher": "Remedy Entertainment", // optional
  "tags": ["action rpg"],              // optional, lowercase
  "links": [{ "label": "steam", "url": "https://..." }],  // optional; first link = title link
  "hype": 3,                           // optional, 1–3
  "notes": "why I'm hyped / caveats",  // optional, shown as a // comment
  "added": "2026-09-12",
  "status": "completed",               // optional: playing | completed | dropped
  "completed": "2026-09-06",           // required with status completed/dropped; drives the done view
  "rating": 8                          // optional, 1–10, my score once played; replaces hype on the card
}
```

Status is derived from the date unless set: an item is **upcoming** until its whole
release window has passed, then **released** (it moves to the *backlog* view).
`completed` / `dropped` send it to *done*, which is grouped by the month it was finished,
newest first; `playing` keeps it in *backlog*.

## Structure

- `index.html` — page shell: history line, hero, mount points, footer.
- `src/main.ts` — loads and validates the data, owns query state, wires events, syncs the URL.
- `src/render.ts` — pure `state → html` functions (tabs, toolbar, grouped cards).
- `src/filters.ts` — pure view/filter/sort/group logic and URL ↔ query mapping.
- `src/dates.ts` — fuzzy release dates (day / month / quarter / year / TBA), labels, relative phrases.
- `src/validate.ts` — the JSON validator behind `npm test` and the runtime assert.
- `src/types.ts` — the data model; the allowed platform/type/status lists live here.
- `src/style.css` — all visuals; design tokens borrowed from jlamb.sh.
- `scripts/cover.mjs` — cover normaliser (sharp).
- `data/items.json` — **the content**. `public/covers/` — the images.

## URL state

Filters live in the query string so views are linkable: `?view=backlog`,
`?sort=title&desc=1`, `?platform=PC,PS5`, `?type=game`, `?q=zelda`. Defaults are
omitted. Keys: `/` focuses search, `Esc` clears it, `u` / `b` / `d` switch views,
`r` resets filters.

## Deploy

Netlify, configured in `netlify.toml` (mirrors the adjacent caelia / jlamb.sh sites):
`npm run lint && npm test && npm run build`, publishing `dist/`. Point the site at
`thelist.jlamb.sh` in the Netlify UI.
