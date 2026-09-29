import { describe, expect, it } from "vitest";

import { findDates, formatRange, normalizeDate } from "@/lib/ats/dates";

describe("findDates", () => {
  it("classifies each format", () => {
    expect(findDates("Mar 2021 – Present").map((d) => d.format)).toEqual(["Mon YYYY"]);
    expect(findDates("March 2021 – June 2022").map((d) => d.format)).toEqual([
      "Month YYYY",
      "Month YYYY",
    ]);
    expect(findDates("04/2021 – 05/2022").map((d) => d.format)).toEqual(["MM/YYYY", "MM/YYYY"]);
    expect(findDates("04/21 – Present").map((d) => d.format)).toEqual(["MM/YY"]);
    expect(findDates("2021-04").map((d) => d.format)).toEqual(["YYYY-MM"]);
    expect(findDates("2018 – 2021").map((d) => d.format)).toEqual(["YYYY"]);
  });

  it("ignores plain numbers", () => {
    expect(findDates("Processed 2,000 claims across 12 regions")).toEqual([]);
  });
});

describe("normalizeDate", () => {
  it("converts every format to Mon YYYY", () => {
    expect(normalizeDate("March 2021")).toBe("Mar 2021");
    expect(normalizeDate("Sept. 2020")).toBe("Sep 2020");
    expect(normalizeDate("04/2021")).toBe("Apr 2021");
    expect(normalizeDate("2021-04")).toBe("Apr 2021");
    expect(normalizeDate("04/21")).toBe("Apr 2021");
    expect(normalizeDate("present")).toBe("Present");
    expect(normalizeDate("2019")).toBe("2019");
  });

  it("leaves text it can't parse alone", () => {
    expect(normalizeDate("Summer 2019")).toBe("Summer 2019");
  });

  it("formats ranges with an en dash", () => {
    expect(formatRange("03/2025", "current")).toBe("Mar 2025 – Present");
    expect(formatRange("2019", "")).toBe("2019");
  });
});
