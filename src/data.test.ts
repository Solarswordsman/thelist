/**
 * Data-integrity gate: runs on every `npm test` and in the Netlify build, so a
 * malformed entry in data/items.json fails the deploy rather than the page.
 */
import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import items from "../data/items.json";
import { validateItems } from "./validate";

describe("data/items.json", () => {
	it("is valid", () => {
		expect(validateItems(items)).toEqual([]);
	});
	it("every cover path points at a real file", () => {
		const missing = items.filter((i) => i.cover && !existsSync(`public${i.cover}`)).map((i) => i.id);
		expect(missing, "run `npm run cover -- <id> <url>` for these").toEqual([]);
	});
	it("every cover file belongs to an item", () => {
		const referenced = new Set(items.map((i) => i.cover));
		const orphans = readdirSync("public/covers").filter((f) => f.endsWith(".webp") && !referenced.has(`/covers/${f}`));
		expect(orphans).toEqual([]);
	});
});

describe("validateItems", () => {
	const good = { id: "ok", type: "game", title: "t", date: "2026-09", platforms: ["PC"], description: "d", cover: null, added: "2026-09-12" };
	it("accepts a minimal entry", () => {
		expect(validateItems([good])).toEqual([]);
	});
	it("reports each problem with the item id", () => {
		const errs = validateItems([
			{ ...good, id: "Bad Id" },
			{ ...good, id: "dup" }, { ...good, id: "dup" },
			{ ...good, id: "x", date: "soon", platforms: ["Wii"], exclusive: "PS5", hype: 5, cover: "cover.png", status: "wishlist" },
		]);
		expect(errs.some((e) => e.includes("kebab-case"))).toBe(true);
		expect(errs.filter((e) => e.includes("duplicate id"))).toHaveLength(1);
		const x = errs.filter((e) => e.startsWith('item "x":'));
		expect(x.some((e) => e.includes("date must be"))).toBe(true);
		expect(x.some((e) => e.includes('unknown platform "Wii"'))).toBe(true);
		expect(x.some((e) => e.includes("exclusive"))).toBe(true);
		expect(x.some((e) => e.includes("hype must be"))).toBe(true);
		expect(x.some((e) => e.includes("cover must be"))).toBe(true);
		expect(x.some((e) => e.includes("status must be"))).toBe(true);
	});
	it("ties completed and rating to status", () => {
		expect(validateItems([{ ...good, status: "completed" }])).toEqual(['item "ok": status "completed" needs a completed date']);
		expect(validateItems([{ ...good, completed: "2026-06-06" }])).toEqual(['item "ok": completed requires status "completed" or "dropped"']);
		expect(validateItems([{ ...good, rating: 8 }])[0]).toContain("rating only makes sense");
		expect(validateItems([{ ...good, status: "playing", rating: 11 }])[0]).toContain("rating must be");
		expect(validateItems([{ ...good, status: "completed", completed: "2026-06-06", rating: 9 }])).toEqual([]);
	});
});
