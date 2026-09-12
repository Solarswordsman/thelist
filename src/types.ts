/**
 * The data model for entries in data/items.json.
 *
 * Keep this file and the "Data schema" section of CLAUDE.md in sync — agents
 * adding entries read CLAUDE.md, and `npm test` validates every entry against
 * the rules in validate.ts.
 */

/** What kind of thing this is. Games first; other media can join later. */
export const ITEM_TYPES = ["game", "tv", "movie", "event", "other"] as const;
export type ItemType = typeof ITEM_TYPES[number];

/**
 * Platforms I care about. "PC" is always preferred, so it's listed first; the
 * consoles I own are Switch 2 and PS5. Order here is display order.
 */
export const PLATFORMS = ["PC", "Switch 2", "PS5", "Xbox", "Switch", "Mobile", "Other"] as const;
export type Platform = typeof PLATFORMS[number];

/**
 * A manually-set status. Anything without one is derived from its date:
 * "upcoming" until the release window has fully passed, then "released".
 */
export const MANUAL_STATUSES = ["playing", "completed", "dropped"] as const;
export type ManualStatus = typeof MANUAL_STATUSES[number];
export type Status = "upcoming" | "released" | ManualStatus;

export interface Link {
	/** Short label, e.g. "steam", "official", "wiki". */
	label: string;
	url: string;
}

export interface Item {
	/** Stable kebab-case id; also names the cover file (public/covers/<id>.webp). */
	id: string;
	type: ItemType;
	title: string;
	/**
	 * Release date at whatever precision is known:
	 *   "2026-09-17" | "2026-09" | "2026-Q4" | "2026" | "TBA"
	 */
	date: string;
	/** Platforms it releases on, subset of PLATFORMS. */
	platforms: Platform[];
	/** Set when it's a console exclusive worth flagging (e.g. "Switch 2"). */
	exclusive?: Platform;
	/** One or two sentences: what it is. */
	description: string;
	/** Site-relative path to a 16:9 cover (see scripts/cover.mjs), or null. */
	cover: string | null;
	developer?: string;
	publisher?: string;
	/** Free-form genre/theme tags, lowercase. */
	tags?: string[];
	links?: Link[];
	/** Excitement level, 1–3. Rendered as stars. */
	hype?: 1 | 2 | 3;
	/** Personal note: why I'm hyped, what I've heard, etc. */
	notes?: string;
	/** ISO day the entry was added ("YYYY-MM-DD"). */
	added: string;
	/** Manual override; see Status. */
	status?: ManualStatus;
	/** ISO day I finished (or dropped) it. Drives sorting/grouping in the done view. */
	completed?: string;
	/** My score after playing, 1–10. Shown instead of hype once it's done. */
	rating?: number;
}

/** The three top-level views. */
export const VIEWS = ["upcoming", "backlog", "done"] as const;
export type View = typeof VIEWS[number];

export const SORTS = ["date", "title", "added", "hype"] as const;
export type Sort = typeof SORTS[number];

export interface Query {
	view: View;
	sort: Sort;
	/** Reverse the sort. */
	desc: boolean;
	/** Only items available on any of these platforms (empty = all). */
	platforms: Platform[];
	/** Only items of any of these types (empty = all). */
	types: ItemType[];
	/** Case-insensitive substring over title/description/tags/developer. */
	q: string;
}
