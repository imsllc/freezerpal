import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calendarDays,
  monthForDate,
  shiftMonth,
  formatDateInput,
  parseDateInput,
} from "../src/core/calendar";
import { displayDate } from "../src/core/model";

test("calendar aligns weekdays and handles leap years without adjacent-month dates", () => {
  const leap = calendarDays({ year: 2024, month: 1 });
  assert.equal(leap.length, 42);
  assert.equal(leap[4], "2024-02-01");
  assert.equal(leap.filter(Boolean).length, 29);
  assert.equal(leap[32], "2024-02-29");
  assert.equal(leap[33], null);
  assert.equal(
    calendarDays({ year: 2026, month: 1 }).filter(Boolean).length,
    28,
  );
  assert.equal(calendarDays({ year: 2026, month: 10 })[0], "2026-11-01");
});

test("typed dates insert slashes, accept pasted dates, and allow backspacing through separators", () => {
  assert.equal(formatDateInput("1"), "1");
  assert.equal(formatDateInput("11"), "11/");
  assert.equal(formatDateInput("1109"), "11/09/");
  assert.equal(formatDateInput("11092026"), "11/09/2026");
  assert.equal(formatDateInput("11/09/2026"), "11/09/2026");
  assert.equal(formatDateInput("abc11092026999"), "11/09/2026");
  assert.equal(formatDateInput("11", "11/"), "1");
  assert.equal(formatDateInput("11/09", "11/09/"), "11/0");
  assert.equal(formatDateInput("", "1"), "");
});

test("typed dates convert to storage format only when complete and valid", () => {
  assert.equal(parseDateInput("11/09/2026"), "2026-11-09");
  assert.equal(parseDateInput("02/29/2024"), "2024-02-29");
  for (const input of [
    "",
    "11/",
    "11/09/",
    "11/09/202",
    "02/29/2026",
    "02/30/2026",
    "13/01/2026",
    "01/01/1899",
  ])
    assert.equal(parseDateInput(input), null);
});
test("calendar navigation crosses year boundaries and honors supported date bounds", () => {
  assert.deepEqual(shiftMonth({ year: 2026, month: 11 }, 1), {
    year: 2027,
    month: 0,
  });
  assert.deepEqual(shiftMonth({ year: 2026, month: 0 }, -1), {
    year: 2025,
    month: 11,
  });
  assert.deepEqual(shiftMonth({ year: 2026, month: 5 }, -12), {
    year: 2025,
    month: 5,
  });
  assert.deepEqual(shiftMonth({ year: 1900, month: 0 }, -1), {
    year: 1900,
    month: 0,
  });
  assert.deepEqual(shiftMonth({ year: 9999, month: 11 }, 1), {
    year: 9999,
    month: 11,
  });
});
test("selected calendar dates stay local and display as MM/DD/YYYY", () => {
  assert.deepEqual(monthForDate("2026-11-09"), { year: 2026, month: 10 });
  assert.equal(displayDate("2026-11-09"), "11/09/2026");
});
