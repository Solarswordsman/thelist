import { describe, expect, it } from "vitest";
import { isReleased, parseDate, relativeLabel, sortKey } from "./dates";

const T = Date.UTC(2026, 8, 12); // 2026-09-12

describe("parseDate", () => {
	it("parses a full day", () => {
		const d = parseDate("2026-09-17");
		expect(d.precision).toBe("day");
		expect(d.label).toBe("Sep 17, 2026");
		expect(d.groupKey).toBe("2026-09");
		expect(d.groupLabel).toBe("September 2026");
		expect(d.start).toBe(d.end);
	});
	it("parses a month as a window", () => {
		const d = parseDate("2026-02");
		expect(d.precision).toBe("month");
		expect(d.label).toBe("Feb 2026");
		expect(new Date(d.end).getUTCDate()).toBe(28);
	});
	it("parses quarters and years", () => {
		expect(parseDate("2027-Q2")).toMatchObject({ precision: "quarter", label: "Q2 2027", groupKey: "2027-Q2" });
		expect(parseDate("2027")).toMatchObject({ precision: "year", label: "2027", groupKey: "2027" });
		expect(new Date(parseDate("2027-Q2").end).toISOString()).toBe("2027-06-30T00:00:00.000Z");
	});
	it("parses TBA", () => {
		expect(parseDate("TBA")).toMatchObject({ precision: "tba", start: Infinity, label: "TBA" });
	});
	it("rejects junk", () => {
		for (const bad of ["", "2026-13", "2026-02-30", "Sep 2026", "2026-9-1", "tba", "2026-Q5"]) {
			expect(() => parseDate(bad), bad).toThrow();
		}
	});
});

describe("isReleased", () => {
	it("is false until the whole window has passed", () => {
		expect(isReleased(parseDate("2026-09-11"), T)).toBe(true);
		expect(isReleased(parseDate("2026-09-12"), T)).toBe(false);
		expect(isReleased(parseDate("2026-09"), T)).toBe(false);
		expect(isReleased(parseDate("2026-08"), T)).toBe(true);
		expect(isReleased(parseDate("2026-Q3"), T)).toBe(false);
		expect(isReleased(parseDate("TBA"), T)).toBe(false);
	});
});

describe("relativeLabel", () => {
	it("phrases day-precision dates", () => {
		expect(relativeLabel(parseDate("2026-09-12"), T)).toBe("today");
		expect(relativeLabel(parseDate("2026-09-13"), T)).toBe("tomorrow");
		expect(relativeLabel(parseDate("2026-09-17"), T)).toBe("in 5d");
		expect(relativeLabel(parseDate("2026-11-05"), T)).toBe("in 8w");
		expect(relativeLabel(parseDate("2027-01-20"), T)).toBe("in 4mo");
		expect(relativeLabel(parseDate("2028-03-01"), T)).toBe("in 1.5y");
		expect(relativeLabel(parseDate("2026-09-01"), T)).toBe("11d ago");
	});
	it("hedges vague dates", () => {
		expect(relativeLabel(parseDate("2026-09"), T)).toBe("this month");
		expect(relativeLabel(parseDate("2026-Q3"), T)).toBe("this quarter");
		expect(relativeLabel(parseDate("2026-11"), T)).toBe("~in 7w");
		expect(relativeLabel(parseDate("TBA"), T)).toBe("");
	});
});

describe("sortKey", () => {
	it("puts firm dates before vague ones in the same window", () => {
		expect(sortKey(parseDate("2026-09-17"))).toBeLessThan(sortKey(parseDate("2026-09")));
		expect(sortKey(parseDate("2026-09"))).toBeLessThan(sortKey(parseDate("2026-Q3")));
		expect(sortKey(parseDate("2026-Q4"))).toBeLessThan(sortKey(parseDate("2026")));
		expect(sortKey(parseDate("2027"))).toBeLessThan(sortKey(parseDate("TBA")));
	});
});
