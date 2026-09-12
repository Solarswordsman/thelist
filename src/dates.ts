/**
 * Fuzzy release-date handling. Pure functions; unit-tested in dates.test.ts.
 *
 * Accepted forms: "YYYY-MM-DD", "YYYY-MM", "YYYY-Qn", "YYYY", "TBA".
 */

export type Precision = "day" | "month" | "quarter" | "year" | "tba";

export interface ReleaseDate {
	raw: string;
	precision: Precision;
	/** First day of the release window (UTC ms). Infinity for TBA. */
	start: number;
	/** Last day of the release window (UTC ms). Infinity for TBA. */
	end: number;
	/** Short display label: "Sep 17, 2026", "Sep 2026", "Q4 2026", "2026", "TBA". */
	label: string;
	/** Key used to bucket items into headed groups: "2026-09", "2026-Q4", "2026", "TBA". */
	groupKey: string;
	/** Heading for the group: "September 2026", "Q4 2026", "2026", "TBA". */
	groupLabel: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_MS = 86_400_000;

const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const pad = (n: number) => String(n).padStart(2, "0");

export const DATE_RE = /^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?|-Q([1-4]))?|TBA)$/;

export function parseDate(raw: string): ReleaseDate {
	const m = DATE_RE.exec(raw);
	if (!m) throw new Error(`Bad date "${raw}" — expected YYYY-MM-DD, YYYY-MM, YYYY-Qn, YYYY or TBA`);
	if (raw === "TBA") {
		return { raw, precision: "tba", start: Infinity, end: Infinity, label: "TBA", groupKey: "TBA", groupLabel: "TBA" };
	}
	const y = Number(m[1]);
	if (m[4]) {
		const q = Number(m[4]);
		const m0 = (q - 1) * 3 + 1;
		return {
			raw, precision: "quarter",
			start: utc(y, m0, 1), end: utc(y, m0 + 2, lastDay(y, m0 + 2)),
			label: `Q${q} ${y}`, groupKey: `${y}-Q${q}`, groupLabel: `Q${q} ${y}`,
		};
	}
	if (m[2] === undefined) {
		return { raw, precision: "year", start: utc(y, 1, 1), end: utc(y, 12, 31), label: `${y}`, groupKey: `${y}`, groupLabel: `${y}` };
	}
	const mo = Number(m[2]);
	if (mo < 1 || mo > 12) throw new Error(`Bad month in "${raw}"`);
	const groupKey = `${y}-${pad(mo)}`;
	const groupLabel = `${MONTHS[mo - 1]} ${y}`;
	if (m[3] === undefined) {
		return { raw, precision: "month", start: utc(y, mo, 1), end: utc(y, mo, lastDay(y, mo)), label: `${MONTHS[mo - 1].slice(0, 3)} ${y}`, groupKey, groupLabel };
	}
	const d = Number(m[3]);
	if (d < 1 || d > lastDay(y, mo)) throw new Error(`Bad day in "${raw}"`);
	const t = utc(y, mo, d);
	return { raw, precision: "day", start: t, end: t, label: `${MONTHS[mo - 1].slice(0, 3)} ${d}, ${y}`, groupKey, groupLabel };
}

/** Today as a UTC-midnight timestamp, from a local Date. */
export function todayUtc(now: Date = new Date()): number {
	return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** True once the whole release window is in the past. */
export function isReleased(d: ReleaseDate, today: number): boolean {
	return d.end < today;
}

/**
 * Compact relative phrase for a list card: "today", "tomorrow", "in 5d",
 * "in 3w", "in 2mo", "3d ago", "this month", "this quarter", "this year",
 * "~in 2mo" for vague dates, or "" for TBA.
 */
export function relativeLabel(d: ReleaseDate, today: number): string {
	if (d.precision === "tba") return "";
	if (d.precision !== "day") {
		if (today >= d.start && today <= d.end) return `this ${d.precision}`;
		const ref = today < d.start ? d.start : d.end;
		return `~${span(ref, today)}`;
	}
	return span(d.start, today);
}

function span(target: number, today: number): string {
	const days = Math.round((target - today) / DAY_MS);
	if (days === 0) return "today";
	if (days === 1) return "tomorrow";
	if (days === -1) return "yesterday";
	const abs = Math.abs(days);
	let unit: string;
	if (abs < 14) unit = `${abs}d`;
	else if (abs < 60) unit = `${Math.round(abs / 7)}w`;
	else if (abs < 365) unit = `${Math.round(abs / 30.44)}mo`;
	else unit = `${(abs / 365.25).toFixed(1).replace(/\.0$/, "")}y`;
	return days > 0 ? `in ${unit}` : `${unit} ago`;
}

const PRECISION_RANK: Record<Precision, number> = { day: 0, month: 1, quarter: 2, year: 3, tba: 4 };

/**
 * Sort key: vague dates sort to the end of their window so firm dates come
 * first, and a vaguer window ending on the same day sorts after a tighter one.
 */
export function sortKey(d: ReleaseDate): number {
	return d.end + PRECISION_RANK[d.precision];
}
