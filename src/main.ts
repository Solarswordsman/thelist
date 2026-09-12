import "./style.css";
import rawItems from "../data/items.json";
import { todayUtc } from "./dates";
import { countByView, DEFAULT_QUERY, queryFromParams, queryToParams, runQuery, toEntries } from "./filters";
import { renderGroups, renderToolbar, renderViews } from "./render";
import { assertItems } from "./validate";
import type { ItemType, Platform, Query, Sort, View } from "./types";

const $ = <T extends Element>(sel: string): T => {
	const el = document.querySelector<T>(sel);
	if (!el) throw new Error(`missing ${sel}`);
	return el;
};

const items = assertItems(rawItems);
const today = todayUtc();
const entries = toEntries(items, today);
const counts = countByView(entries);
const presentTypes = new Set<ItemType>(items.map((i) => i.type));

let query: Query = queryFromParams(new URLSearchParams(location.search));

const viewsEl = $<HTMLElement>("#views");
const toolbarEl = $<HTMLElement>("#toolbar");
const listEl = $<HTMLElement>("#list");

function syncUrl() {
	const params = queryToParams(query).toString();
	history.replaceState(null, "", params ? `?${params}` : location.pathname);
}

/** Re-render everything from `query`. Cheap at this scale; keeps state in one place. */
function render({ focusSearch = false } = {}) {
	viewsEl.innerHTML = renderViews(query, counts);
	toolbarEl.innerHTML = renderToolbar(query, presentTypes);
	listEl.innerHTML = renderGroups(runQuery(entries, query), query, today);
	document.title = query.view === "upcoming" ? "thelist.jlamb.sh" : `${query.view} · thelist.jlamb.sh`;
	syncUrl();
	if (focusSearch) {
		const input = $<HTMLInputElement>("#search");
		input.focus();
		input.setSelectionRange(input.value.length, input.value.length);
	}
}

function update(patch: Partial<Query>, opts?: { focusSearch?: boolean }) {
	query = { ...query, ...patch };
	render(opts);
}

function toggle<T>(list: T[], v: T): T[] {
	return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

viewsEl.addEventListener("click", (ev) => {
	const tab = (ev.target as Element).closest<HTMLElement>("[data-view]");
	if (tab) update({ view: tab.dataset.view as View });
});

toolbarEl.addEventListener("click", (ev) => {
	const t = ev.target as Element;
	const plat = t.closest<HTMLElement>("[data-platform]");
	if (plat) return update({ platforms: toggle(query.platforms, plat.dataset.platform as Platform) });
	const type = t.closest<HTMLElement>("[data-type]");
	if (type) return update({ types: toggle(query.types, type.dataset.type as ItemType) });
	if (t.closest("[data-reverse]")) return update({ desc: !query.desc });
	if (t.closest("[data-clear]")) return update({ q: "" }, { focusSearch: true });
});

toolbarEl.addEventListener("change", (ev) => {
	const t = ev.target as HTMLElement;
	if (t.id === "sort") update({ sort: (t as HTMLSelectElement).value as Sort });
});

// Typing in the search box: keep focus, only refresh the list + command line.
let searchTimer: ReturnType<typeof setTimeout> | undefined;
toolbarEl.addEventListener("input", (ev) => {
	const t = ev.target as HTMLInputElement;
	if (t.id !== "search") return;
	clearTimeout(searchTimer);
	searchTimer = setTimeout(() => update({ q: t.value.trim() }, { focusSearch: true }), 120);
});

// Keyboard: "/" focuses search, Esc clears it, "u"/"b"/"d" switch views.
document.addEventListener("keydown", (ev) => {
	const inField = (ev.target as HTMLElement).matches("input, select, textarea");
	if (ev.key === "/" && !inField) { ev.preventDefault(); $<HTMLInputElement>("#search").focus(); }
	else if (ev.key === "Escape" && inField) { update({ q: "" }); $<HTMLInputElement>("#search").blur(); }
	else if (!inField && !ev.metaKey && !ev.ctrlKey) {
		const views: Record<string, View> = { u: "upcoming", b: "backlog", d: "done" };
		if (views[ev.key]) update({ view: views[ev.key] });
		else if (ev.key === "r") update({ ...DEFAULT_QUERY, view: query.view });
	}
});

window.addEventListener("popstate", () => { query = queryFromParams(new URLSearchParams(location.search)); render(); });

render();

const latest = items.map((i) => i.added).sort().at(-1) ?? "";
$("#hist-status").textContent = `✓ · ${items.length} item${items.length === 1 ? "" : "s"}`;
$("#footer-meta").textContent = `${items.length} entries · updated ${latest} · press / to grep`;
