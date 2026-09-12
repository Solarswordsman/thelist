/**
 * Structural validation for data/items.json. Deliberately dependency-free and
 * chatty: the messages are what an agent sees when `npm test` fails after it
 * adds an entry, so they should say exactly what to fix.
 */
import { ITEM_TYPES, MANUAL_STATUSES, PLATFORMS, type Item } from "./types";
import { DATE_RE, parseDate } from "./dates";

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
	return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/** Returns a list of human-readable problems; empty means valid. */
export function validateItems(data: unknown): string[] {
	const errors: string[] = [];
	if (!Array.isArray(data)) return ["items.json must be a JSON array of items"];
	const ids = new Set<string>();
	data.forEach((raw, i) => {
		const where = isRecord(raw) && typeof raw.id === "string" ? `item "${raw.id}"` : `item #${i}`;
		const err = (msg: string) => errors.push(`${where}: ${msg}`);
		if (!isRecord(raw)) return err("must be an object");

		if (typeof raw.id !== "string" || !ID_RE.test(raw.id)) err("id must be kebab-case (a-z, 0-9, hyphens)");
		else if (ids.has(raw.id)) err("duplicate id");
		else ids.add(raw.id);

		if (!ITEM_TYPES.includes(raw.type as never)) err(`type must be one of ${ITEM_TYPES.join(", ")}`);
		if (typeof raw.title !== "string" || !raw.title.trim()) err("title is required");
		if (typeof raw.description !== "string" || !raw.description.trim()) err("description is required");

		if (typeof raw.date !== "string" || !DATE_RE.test(raw.date)) err(`date must be YYYY-MM-DD, YYYY-MM, YYYY-Qn, YYYY or TBA (got ${JSON.stringify(raw.date)})`);
		else {
			try { parseDate(raw.date); } catch (e) { err((e as Error).message); }
		}

		if (!isStringArray(raw.platforms) || raw.platforms.length === 0) err("platforms must be a non-empty array");
		else {
			for (const p of raw.platforms) if (!PLATFORMS.includes(p as never)) err(`unknown platform "${p}" (allowed: ${PLATFORMS.join(", ")})`);
			if (new Set(raw.platforms).size !== raw.platforms.length) err("platforms has duplicates");
		}
		if (raw.exclusive !== undefined) {
			if (!PLATFORMS.includes(raw.exclusive as never)) err(`exclusive must be one of ${PLATFORMS.join(", ")}`);
			else if (isStringArray(raw.platforms) && !raw.platforms.includes(raw.exclusive as string)) err("exclusive platform must also appear in platforms");
			else if (isStringArray(raw.platforms) && raw.platforms.length !== 1) err("an exclusive should list only that platform");
		}

		if (raw.cover !== null && (typeof raw.cover !== "string" || !raw.cover.startsWith("/covers/"))) err("cover must be null or a \"/covers/<id>.webp\" path");

		for (const k of ["developer", "publisher", "notes"] as const) {
			if (raw[k] !== undefined && typeof raw[k] !== "string") err(`${k} must be a string`);
		}
		if (raw.tags !== undefined && !isStringArray(raw.tags)) err("tags must be an array of strings");
		if (raw.links !== undefined) {
			if (!Array.isArray(raw.links)) err("links must be an array of {label, url}");
			else raw.links.forEach((l, j) => {
				if (!isRecord(l) || typeof l.label !== "string" || typeof l.url !== "string" || !/^https?:\/\//.test(l.url)) err(`links[${j}] must be {label, url} with an http(s) url`);
			});
		}
		if (raw.hype !== undefined && ![1, 2, 3].includes(raw.hype as number)) err("hype must be 1, 2 or 3");
		if (typeof raw.added !== "string" || !DAY_RE.test(raw.added)) err("added must be YYYY-MM-DD");
		if (raw.status !== undefined && !MANUAL_STATUSES.includes(raw.status as never)) err(`status must be one of ${MANUAL_STATUSES.join(", ")} (or omitted)`);
	});
	return errors;
}

/** Throws with every problem listed if the data is invalid; otherwise returns it typed. */
export function assertItems(data: unknown): Item[] {
	const errors = validateItems(data);
	if (errors.length) throw new Error(`data/items.json has ${errors.length} problem(s):\n  - ${errors.join("\n  - ")}`);
	return data as Item[];
}
