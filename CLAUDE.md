# thelist — project guide for Claude Code

A static, framework-free site (Vite + TypeScript, vanilla DOM) listing things Jeff is
excited about, sorted by date. Deploys to Netlify at `thelist.jlamb.sh` on push to `main`.
Games for now; the model already allows tv / movie / event / other.

**Tooling:** Node via `mise` (`mise.toml` pins 22). If `mise` isn't on PATH in your shell,
call `/home/jlamb/.local/bin/mise exec -- npm test` etc. `.npmrc` sets `legacy-peer-deps`;
keep it (npm's resolver chokes on jsdom's optional `canvas` peer without it).

## Adding entries → use the `/add` skill

All content is `data/items.json` plus `public/covers/<id>.webp`; you should never need to
touch `src/` to add something. The `/add` skill (`.claude/skills/add/SKILL.md`) is the
complete workflow: input shorthand, research, cover sourcing (`npm run cover`), schema rules,
verify, commit, push. If the user asks to add/update/finish an entry without invoking it,
follow that file anyway.

Personal context: Jeff prefers PC and owns a Switch 2 and a PS5. Console exclusives on those
are fine but worth flagging; Xbox exclusives are effectively "PC" for him when they're on PC.

## Views & status (how the site interprets data)

- **upcoming**: release window not yet fully passed (or TBA). Default view, grouped by
  month / quarter / year / TBA, firm dates before vague ones.
- **backlog**: released (derived from date) or `status: "playing"`.
- **done**: `status: "completed"` or `"dropped"`. Grouped by month *finished* (`completed`),
  newest first; the "hype" sort becomes "rating" there.

## Code map

`src/types.ts` is the data model (commented; README has the schema as JSON). `src/dates.ts`
(fuzzy dates) and `src/filters.ts` (query/sort/group + URL mapping) are pure and unit-tested;
`src/render.ts` is pure `state → html`; `src/main.ts` owns DOM state and events;
`src/validate.ts` is the validator behind `npm test` and the runtime assert. Add new
platforms/types/statuses in `src/types.ts` only — validator and UI read the constants from
there. House style: tabs, `eslint` clean, tests for pure logic.

## Future ideas (not built yet)

- Check-off UX for completed items (currently manual `status`/`completed`/`rating` edits in JSON).
- Non-game media: the type chips appear automatically once a second type exists.
- Per-item detail pages / permalinks (`#<id>` already anchors to the card).
- Countdown / "this week" strip at the top of upcoming.
