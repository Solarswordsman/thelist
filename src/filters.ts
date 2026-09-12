/**
 * Pure view/filter/sort/group logic over items. No DOM. Tested in filters.test.ts.
 */
import { isReleased, parseDate, sortKey, type ReleaseDate } from "./dates";
import { PLATFORMS, SORTS, VIEWS, ITEM_TYPES, type Item, type Platform, type Query, type Sort, type Status, type View, type ItemType } from "./types";

/** An item plus everything derived from it once per render. */
export interface Entry {
	item: Item;
	date: ReleaseDate;
	/** Parsed `completed`, when present. */
	done?: ReleaseDate;
	status: Status;
}

export interface Group {
	key: string;
	label: string;
	entries: Entry[];
}

export function deriveStatus(item: Item, date: ReleaseDate, today: number): Status {
	if (item.status) return item.status;
	return isReleased(date, today) ? "released" : "upcoming";
}

export function toEntries(items: Item[], today: number): Entry[] {
	return items.map((item) => {
		const date = parseDate(item.date);
		const done = item.completed ? parseDate(item.completed) : undefined;
		return { item, date, done, status: deriveStatus(item, date, today) };
	});
}

/** Which view an entry belongs to. */
export function viewOf(e: Entry): View {
	switch (e.status) {
		case "upcoming": return "upcoming";
		case "completed":
		case "dropped": return "done";
		default: return "backlog"; // released, playing
	}
}

export function countByView(entries: Entry[]): Record<View, number> {
	const counts = { upcoming: 0, backlog: 0, done: 0 };
	for (const e of entries) counts[viewOf(e)]++;
	return counts;
}

export function matches(e: Entry, q: Query): boolean {
	if (viewOf(e) !== q.view) return false;
	if (q.platforms.length && !q.platforms.some((p) => e.item.platforms.includes(p))) return false;
	if (q.types.length && !q.types.includes(e.item.type)) return false;
	if (q.q) {
		const needle = q.q.toLowerCase();
		const hay = [e.item.title, e.item.description, e.item.developer, e.item.publisher, e.item.notes, ...(e.item.tags ?? [])]
			.filter(Boolean).join("\n").toLowerCase();
		if (!hay.includes(needle)) return false;
	}
	return true;
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/**
 * The date a view cares about: the done view sorts and groups by when I
 * finished something; everything else uses the release date.
 */
export function keyDate(e: Entry, view: View): ReleaseDate {
	return view === "done" && e.done ? e.done : e.date;
}

/** The done view ranks by my rating; before that, by hype. */
function score(e: Entry, view: View): number {
	return (view === "done" ? e.item.rating ?? e.item.hype : e.item.hype) ?? 0;
}

function compare(a: Entry, b: Entry, sort: Sort, view: View): number {
	// Done reads newest-first: the most recently finished thing on top.
	const byDate = () => (sortKey(keyDate(a, view)) - sortKey(keyDate(b, view))) * (view === "done" ? -1 : 1);
	switch (sort) {
		case "date": return byDate() || collator.compare(a.item.title, b.item.title);
		case "title": return collator.compare(a.item.title, b.item.title);
		case "added": return b.item.added.localeCompare(a.item.added) || byDate();
		case "hype": return score(b, view) - score(a, view) || byDate();
	}
}

export function sortEntries(entries: Entry[], sort: Sort, desc = false, view: View = "upcoming"): Entry[] {
	const sorted = [...entries].sort((a, b) => compare(a, b, sort, view));
	return desc ? sorted.reverse() : sorted;
}

/**
 * Bucket sorted entries under headings. Date sort groups by window (month /
 * quarter / year / TBA) of the view's key date; other sorts get a single
 * unlabelled group.
 */
export function groupEntries(entries: Entry[], sort: Sort, view: View = "upcoming"): Group[] {
	if (sort !== "date") return entries.length ? [{ key: "all", label: "", entries }] : [];
	const groups: Group[] = [];
	for (const e of entries) {
		const d = keyDate(e, view);
		const last = groups[groups.length - 1];
		if (last && last.key === d.groupKey) last.entries.push(e);
		else groups.push({ key: d.groupKey, label: d.groupLabel, entries: [e] });
	}
	return groups;
}

export function runQuery(entries: Entry[], q: Query): Group[] {
	return groupEntries(sortEntries(entries.filter((e) => matches(e, q)), q.sort, q.desc, q.view), q.sort, q.view);
}

/* ---------- Query <-> URL search params ---------- */

export const DEFAULT_QUERY: Query = { view: "upcoming", sort: "date", desc: false, platforms: [], types: [], q: "" };

function pick<T extends string>(allowed: readonly T[], v: string | null): T | undefined {
	return allowed.includes(v as T) ? (v as T) : undefined;
}

function pickList<T extends string>(allowed: readonly T[], v: string | null): T[] {
	if (!v) return [];
	return [...new Set(v.split(",").map((s) => pick(allowed, s.trim())).filter((x): x is T => x !== undefined))];
}

export function queryFromParams(params: URLSearchParams): Query {
	return {
		view: pick(VIEWS, params.get("view")) ?? DEFAULT_QUERY.view,
		sort: pick(SORTS, params.get("sort")) ?? DEFAULT_QUERY.sort,
		desc: params.get("desc") === "1",
		platforms: pickList(PLATFORMS, params.get("platform")) as Platform[],
		types: pickList(ITEM_TYPES, params.get("type")) as ItemType[],
		q: (params.get("q") ?? "").trim(),
	};
}

/** Only non-default fields are written, so the default view has a clean URL. */
export function queryToParams(q: Query): URLSearchParams {
	const p = new URLSearchParams();
	if (q.view !== DEFAULT_QUERY.view) p.set("view", q.view);
	if (q.sort !== DEFAULT_QUERY.sort) p.set("sort", q.sort);
	if (q.desc) p.set("desc", "1");
	if (q.platforms.length) p.set("platform", q.platforms.join(","));
	if (q.types.length) p.set("type", q.types.join(","));
	if (q.q) p.set("q", q.q);
	return p;
}

/** The query rendered as a fake shell command, for the toolbar's history line. */
export function queryToCommand(q: Query): string {
	const parts = ["ls", `~/thelist/${q.view}`];
	if (q.sort !== "date") parts.push(`--sort=${q.sort}`);
	if (q.desc) parts.push("--reverse");
	if (q.platforms.length) parts.push(`--platform=${q.platforms.map((p) => p.toLowerCase().replace(/\s+/g, "")).join(",")}`);
	if (q.types.length) parts.push(`--type=${q.types.join(",")}`);
	if (q.q) parts.push(`| grep -i ${JSON.stringify(q.q)}`);
	return parts.join(" ");
}
