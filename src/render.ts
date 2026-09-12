/**
 * HTML rendering. Everything here is a pure (state -> html string) function so
 * it can be tested under jsdom without wiring; main.ts owns the DOM and events.
 */
import { relativeLabel } from "./dates";
import { queryToCommand, type Entry, type Group } from "./filters";
import { ITEM_TYPES, PLATFORMS, SORTS, VIEWS, type ItemType, type Query, type View } from "./types";

const OWNED = new Set(["PC", "Switch 2", "PS5"]);
const SOON_DAYS = 14;
const DAY_MS = 86_400_000;

export const esc = (s: unknown): string => String(s)
	.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const VIEW_LABELS: Record<View, string> = { upcoming: "upcoming", backlog: "backlog", done: "done" };
const SORT_LABELS: Record<Query["sort"], string> = { date: "date", title: "title", added: "recently added", hype: "hype" };
const SORT_LABELS_DONE: Record<Query["sort"], string> = { ...SORT_LABELS, date: "finished", hype: "rating" };

export function renderViews(q: Query, counts: Record<View, number>): string {
	return VIEWS.map((v) => `
		<button class="view-tab" role="tab" data-view="${v}" aria-selected="${v === q.view}">
			<span>${VIEW_LABELS[v]}</span><span class="count">${counts[v]}</span>
		</button>`).join("");
}

/** Colourise the fake command: flags amber, quoted args bright. */
function renderCommand(q: Query): string {
	return esc(queryToCommand(q))
		.replace(/(--[a-z]+)(=[^\s]+)?/g, (_m, flag: string, val = "") => `<span class="flag">${flag}</span>${val}`)
		.replace(/(&quot;.*&quot;)/, '<span class="arg">$1</span>');
}

export function renderToolbar(q: Query, presentTypes: Set<ItemType>): string {
	const platformChips = PLATFORMS.filter((p) => OWNED.has(p) || p === "Xbox").map((p) => `
		<button class="chip" data-platform="${esc(p)}" aria-pressed="${q.platforms.includes(p)}">${esc(p)}</button>`).join("");
	const typeChips = presentTypes.size > 1 ? `
		<div class="control-group">
			<span class="control-label">type</span>
			${ITEM_TYPES.filter((t) => presentTypes.has(t)).map((t) => `
				<button class="chip" data-type="${t}" aria-pressed="${q.types.includes(t)}">${t}</button>`).join("")}
		</div>` : "";
	return `
		<div class="caption"><span class="prompt-char">&#x276f;</span> <span class="cmd">${renderCommand(q)}</span></div>
		<div class="controls">
			<label class="search">
				<span class="prompt-char">/</span>
				<input id="search" type="search" placeholder="grep…" value="${esc(q.q)}" spellcheck="false" autocomplete="off" autocapitalize="off">
				${q.q ? '<button class="clear" data-clear aria-label="clear search">&#x2715;</button>' : ""}
			</label>
			<div class="control-group">
				<span class="control-label">platform</span>${platformChips}
			</div>
			${typeChips}
			<div class="sort">
				<span class="control-label">sort</span>
				<select id="sort" aria-label="sort by">
					${SORTS.map((s) => `<option value="${s}"${s === q.sort ? " selected" : ""}>${(q.view === "done" ? SORT_LABELS_DONE : SORT_LABELS)[s]}</option>`).join("")}
				</select>
				<button class="reverse" data-reverse aria-pressed="${q.desc}" title="reverse order">${q.desc ? "&#x2191;" : "&#x2193;"}</button>
			</div>
		</div>`;
}

function renderCover(e: Entry): string {
	const { item } = e;
	if (!item.cover) return `<div class="cover is-placeholder" aria-hidden="true">no cover yet</div>`;
	return `<div class="cover"><img src="${esc(item.cover)}" alt="" loading="lazy" decoding="async" width="640" height="360"></div>`;
}

function renderWhen(e: Entry, today: number, view: View): string {
	if (view === "done" && e.done) {
		const rel = relativeLabel(e.done, today);
		return `<span class="entry-when"><span class="when-label">${e.status === "dropped" ? "dropped" : "finished"}</span><time datetime="${esc(e.done.raw)}">${esc(e.done.label)}</time>${rel ? `<span class="rel is-past">${esc(rel)}</span>` : ""}</span>`;
	}
	const rel = relativeLabel(e.date, today);
	const days = (e.date.start - today) / DAY_MS;
	const cls = e.date.precision === "day" && days >= 0 && days <= SOON_DAYS ? " is-soon" : e.status !== "upcoming" ? " is-past" : "";
	return `<span class="entry-when"><time datetime="${esc(e.date.raw)}">${esc(e.date.label)}</time>${rel ? `<span class="rel${cls}">${esc(rel)}</span>` : ""}</span>`;
}

function renderMeta(e: Entry): string {
	const { item } = e;
	const plats = item.platforms.map((p) => {
		const cls = ["plat", p === "PC" ? "is-pc" : "", OWNED.has(p) ? "is-owned" : "", item.exclusive === p ? "is-exclusive" : ""].filter(Boolean).join(" ");
		return `<span class="${cls}" title="${item.exclusive === p ? "exclusive" : ""}">${esc(p)}${item.exclusive === p ? " exclusive" : ""}</span>`;
	}).join("");
	const type = item.type !== "game" ? `<span class="type-chip">${esc(item.type)}</span>` : "";
	const status = item.status ? `<span class="type-chip">${esc(item.status)}</span>` : "";
	const hype = item.hype ? `<span class="hype" title="hype ${item.hype}/3">${"★".repeat(item.hype)}<span class="off">${"★".repeat(3 - item.hype)}</span></span>` : "";
	const rating = item.rating !== undefined ? `<span class="rating" title="my score">${item.rating}<span class="off">/10</span></span>` : "";
	return `<div class="entry-meta">${plats}${type}${status}${rating || hype}</div>`;
}

function renderFoot(e: Entry, view: View): string {
	const { item } = e;
	const released = view === "done" && e.done ? `<span>released ${esc(e.date.label)}</span>` : "";
	const credits = [item.developer, item.publisher && item.publisher !== item.developer ? item.publisher : ""].filter(Boolean).map(esc).join(" / ");
	const tags = (item.tags ?? []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
	const links = (item.links ?? []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("");
	if (!credits && !tags && !links && !released) return "";
	return `<div class="entry-foot">${released}${credits ? `<span>${credits}</span>` : ""}${tags}${links ? `<span class="links">${links}</span>` : ""}</div>`;
}

export function renderEntry(e: Entry, today: number, view: View = "upcoming"): string {
	const { item } = e;
	const days = (e.date.start - today) / DAY_MS;
	const soon = e.date.precision === "day" && days >= 0 && days <= SOON_DAYS;
	const primary = item.links?.[0];
	const title = primary ? `<a href="${esc(primary.url)}" target="_blank" rel="noopener">${esc(item.title)}</a>` : esc(item.title);
	return `
		<article class="entry${soon ? " is-soon" : ""}" id="${esc(item.id)}" data-id="${esc(item.id)}">
			${renderCover(e)}
			<div class="entry-body">
				<div class="entry-head">
					<h3 class="entry-title">${title}</h3>
					${renderWhen(e, today, view)}
				</div>
				${renderMeta(e)}
				<p class="entry-desc">${esc(item.description)}</p>
				${item.notes ? `<p class="entry-notes">${esc(item.notes)}</p>` : ""}
				${renderFoot(e, view)}
			</div>
		</article>`;
}

export function renderGroups(groups: Group[], q: Query, today: number): string {
	if (!groups.length) {
		return `<p class="empty">ls: ~/thelist/${esc(q.view)}: nothing here${q.q || q.platforms.length || q.types.length ? " matching those flags" : " (yet)"}</p>`;
	}
	return groups.map((g) => `
		<section class="group">
			${g.label ? `<h2 class="group-head"><span class="hash">##</span><span class="label">${esc(g.label)}</span><span class="rule"></span><span class="count">${g.entries.length}</span></h2>` : ""}
			<div class="entries">${g.entries.map((e) => renderEntry(e, today, q.view)).join("")}</div>
		</section>`).join("");
}
