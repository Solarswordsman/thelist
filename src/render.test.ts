// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DEFAULT_QUERY, runQuery, toEntries } from "./filters";
import { renderGroups, renderToolbar } from "./render";
import type { Item } from "./types";

const T = Date.UTC(2026, 8, 12);
const items: Item[] = [
	{ id: "a", type: "game", title: "A <b>&</b>", date: "2026-09-17", platforms: ["Switch 2"], exclusive: "Switch 2", description: "desc", cover: "/covers/a.webp", added: "2026-09-12", hype: 2, links: [{ label: "site", url: "https://example.com" }] },
	{ id: "b", type: "game", title: "B", date: "TBA", platforms: ["PC", "PS5"], description: "desc", cover: null, added: "2026-09-12" },
];
const entries = toEntries(items, T);

describe("renderGroups", () => {
	it("renders grouped cards with escaped text, covers and badges", () => {
		document.body.innerHTML = renderGroups(runQuery(entries, DEFAULT_QUERY), DEFAULT_QUERY, T);
		const heads = [...document.querySelectorAll(".group-head .label")].map((el) => el.textContent);
		expect(heads).toEqual(["September 2026", "TBA"]);
		const a = document.querySelector("#a")!;
		expect(a.querySelector(".entry-title a")!.textContent).toBe("A <b>&</b>");
		expect(a.querySelector(".entry-title b")).toBeNull();
		expect(a.querySelector(".cover img")!.getAttribute("src")).toBe("/covers/a.webp");
		expect(a.querySelector(".plat.is-exclusive")!.textContent).toBe("Switch 2 exclusive");
		expect(a.querySelector(".rel")!.textContent).toBe("in 5d");
		expect(a.classList.contains("is-soon")).toBe(true);
		const b = document.querySelector("#b")!;
		expect(b.querySelector(".cover.is-placeholder")).not.toBeNull();
		expect(b.querySelector(".plat.is-pc")).not.toBeNull();
		expect(b.querySelector(".rel")).toBeNull();
	});
	it("renders an empty state", () => {
		document.body.innerHTML = renderGroups([], { ...DEFAULT_QUERY, view: "done" }, T);
		expect(document.querySelector(".empty")!.textContent).toContain("nothing here");
	});
});

describe("renderToolbar", () => {
	it("reflects the query in chips, select and command line", () => {
		document.body.innerHTML = renderToolbar({ ...DEFAULT_QUERY, platforms: ["PC"], sort: "title", q: "zel" }, new Set(["game"]));
		expect(document.querySelector('[data-platform="PC"]')!.getAttribute("aria-pressed")).toBe("true");
		expect((document.querySelector("#sort") as HTMLSelectElement).value).toBe("title");
		expect((document.querySelector("#search") as HTMLInputElement).value).toBe("zel");
		expect(document.querySelector(".caption .cmd")!.textContent).toContain('--sort=title --platform=pc | grep -i "zel"');
		expect(document.querySelector("[data-type]")).toBeNull();
	});
});
