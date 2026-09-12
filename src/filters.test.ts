import { describe, expect, it } from "vitest";
import { countByView, DEFAULT_QUERY, queryFromParams, queryToCommand, queryToParams, runQuery, toEntries, viewOf } from "./filters";
import type { Item, Query } from "./types";

const T = Date.UTC(2026, 8, 12); // 2026-09-12

const mk = (over: Partial<Item> & { id: string }): Item => ({
	type: "game", title: over.id, date: "TBA", platforms: ["PC"], description: "x", cover: null, added: "2026-09-01", ...over,
});

const items: Item[] = [
	mk({ id: "b-soon", title: "Bravo", date: "2026-09-17", platforms: ["Switch 2"], exclusive: "Switch 2", hype: 3 }),
	mk({ id: "a-later", title: "alpha", date: "2026-11-05", added: "2026-09-10", hype: 1 }),
	mk({ id: "c-month", title: "Charlie", date: "2026-09", tags: ["roguelike"] }),
	mk({ id: "old", title: "Old", date: "2026-01-01" }),
	mk({ id: "beaten", title: "Beaten", date: "2025-06-01", status: "completed", completed: "2026-07-13", rating: 7 }),
	mk({ id: "beaten-later", title: "Beaten later", date: "2024-01-01", status: "completed", completed: "2026-09-06", rating: 9 }),
	mk({ id: "quit", title: "Quit", date: "2024-01-01", status: "dropped", completed: "2026-08-01", rating: 3 }),
	mk({ id: "show", title: "Show", type: "tv", date: "2027-Q1" }),
	mk({ id: "someday", title: "Someday", date: "TBA" }),
];
const entries = toEntries(items, T);
const q = (over: Partial<Query> = {}): Query => ({ ...DEFAULT_QUERY, ...over });
const ids = (query: Query) => runQuery(entries, query).flatMap((g) => g.entries.map((e) => e.item.id));

describe("views", () => {
	it("derives status from date unless overridden", () => {
		expect(entries.map((e) => [e.item.id, e.status])).toEqual([
			["b-soon", "upcoming"], ["a-later", "upcoming"], ["c-month", "upcoming"], ["old", "released"],
			["beaten", "completed"], ["beaten-later", "completed"], ["quit", "dropped"], ["show", "upcoming"], ["someday", "upcoming"],
		]);
		expect(viewOf(entries[3])).toBe("backlog");
		expect(countByView(entries)).toEqual({ upcoming: 5, backlog: 1, done: 3 });
	});
});

describe("runQuery", () => {
	it("sorts upcoming by date with firm dates first and TBA last, grouped by window", () => {
		const groups = runQuery(entries, q());
		expect(groups.map((g) => [g.label, g.entries.map((e) => e.item.id)])).toEqual([
			["September 2026", ["b-soon", "c-month"]],
			["November 2026", ["a-later"]],
			["Q1 2027", ["show"]],
			["TBA", ["someday"]],
		]);
	});
	it("filters by platform (any-of) and type", () => {
		expect(ids(q({ platforms: ["Switch 2"] }))).toEqual(["b-soon"]);
		expect(ids(q({ platforms: ["PC", "Switch 2"] }))).toHaveLength(5);
		expect(ids(q({ types: ["tv"] }))).toEqual(["show"]);
	});
	it("greps title, tags etc. case-insensitively", () => {
		expect(ids(q({ q: "ROGUE" }))).toEqual(["c-month"]);
		expect(ids(q({ q: "alp" }))).toEqual(["a-later"]);
	});
	it("other sorts are a single unlabelled group", () => {
		expect(runQuery(entries, q({ sort: "title" })).map((g) => g.label)).toEqual([""]);
		expect(ids(q({ sort: "title" }))).toEqual(["a-later", "b-soon", "c-month", "show", "someday"]);
		expect(ids(q({ sort: "title", desc: true }))[0]).toBe("someday");
		expect(ids(q({ sort: "hype" })).slice(0, 2)).toEqual(["b-soon", "a-later"]);
		expect(ids(q({ sort: "added" }))[0]).toBe("a-later");
	});
	it("switches views", () => {
		expect(ids(q({ view: "backlog" }))).toEqual(["old"]);
	});
	it("done view sorts and groups by completed date, newest first, and ranks by rating", () => {
		const groups = runQuery(entries, q({ view: "done" }));
		expect(groups.map((g) => [g.label, g.entries.map((e) => e.item.id)])).toEqual([
			["September 2026", ["beaten-later"]],
			["August 2026", ["quit"]],
			["July 2026", ["beaten"]],
		]);
		expect(ids(q({ view: "done", desc: true }))).toEqual(["beaten", "quit", "beaten-later"]);
		expect(ids(q({ view: "done", sort: "hype" }))).toEqual(["beaten-later", "beaten", "quit"]);
	});
});

describe("url state", () => {
	it("round-trips and drops defaults", () => {
		const full = q({ view: "done", sort: "hype", desc: true, platforms: ["PC", "PS5"], types: ["game"], q: "zelda" });
		expect(queryToParams(q()).toString()).toBe("");
		expect(queryFromParams(queryToParams(full))).toEqual(full);
	});
	it("ignores unknown values", () => {
		expect(queryFromParams(new URLSearchParams("view=nope&sort=x&platform=PC,Wii,PS5&type=book"))).toEqual(q({ platforms: ["PC", "PS5"] }));
	});
	it("renders a shell-ish command", () => {
		expect(queryToCommand(q())).toBe("ls ~/thelist/upcoming");
		expect(queryToCommand(q({ sort: "title", desc: true, platforms: ["Switch 2"], q: "zelda" })))
			.toBe('ls ~/thelist/upcoming --sort=title --reverse --platform=switch2 | grep -i "zelda"');
	});
});
