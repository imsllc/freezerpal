import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adjustedQuantity,
  defaultPreferences,
  expiryStatus,
  expiryLabel,
  isDate,
  normalizePreferences,
  parseQuantity,
  selectItems,
  today,
  validateItem,
  type InventoryItem,
} from "../src/core/model";

const chicken: InventoryItem = {
  photoId: null,
  id: "chicken",
  name: "Chicken breasts",
  quantity: 8,
  unit: "pieces",
  category: "Meat",
  locationId: "freezer",
  addedOn: "2026-11-01",
  expiresOn: "2026-11-10",
  notes: "",
};
test("quantities allow decimals and reject malformed, negative, infinite and oversized values", () => {
  assert.equal(parseQuantity("0.125"), 0.125);
  assert.equal(parseQuantity("0", true), 0);
  for (const value of [
    "",
    "0",
    "-1",
    "NaN",
    "Infinity",
    "1e3",
    "1.0001",
    "1000001",
    "2abc",
  ])
    assert.throws(() => parseQuantity(value));
  assert.equal(adjustedQuantity(0.3, -0.1), 0.2);
  assert.equal(adjustedQuantity(8, -2), 6);
  assert.throws(() => adjustedQuantity(1, -2));
  assert.throws(() => adjustedQuantity(1, 0.0001));
});
test("dates validate leap days without rollover and use calendar days across DST", () => {
  assert.equal(isDate("2024-02-29"), true);
  for (const date of [
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "26-01-01",
    "2026-1-01",
    "1899-01-01",
  ])
    assert.equal(isDate(date), false);
  assert.equal(today(new Date(2026, 10, 9, 23, 55)), "2026-11-09");
  assert.equal(
    expiryStatus({ expiresOn: "2026-11-01" }, "2026-11-02"),
    "expired",
  );
  assert.equal(expiryStatus({ expiresOn: "2026-11-09" }, "2026-11-09"), "soon");
  assert.equal(expiryStatus({ expiresOn: "2026-11-16" }, "2026-11-09"), "soon");
  assert.equal(
    expiryStatus({ expiresOn: "2026-11-17" }, "2026-11-09"),
    "fresh",
  );
  assert.equal(expiryStatus({ expiresOn: null }), "undated");
  assert.equal(
    expiryLabel({ ...chicken, expiresOn: null }, "2026-11-09"),
    "No date",
  );
  assert.equal(
    expiryLabel({ ...chicken, expiresOn: "2026-11-12" }, "2026-11-09"),
    "3 days - 11/12/2026",
  );
  assert.equal(expiryLabel(chicken, "2026-11-09"), "1 day - 11/10/2026");
  assert.equal(expiryLabel(chicken, "2026-11-10"), "Today - 11/10/2026");
  assert.equal(
    expiryLabel(chicken, "2026-11-11"),
    "Expired - 11/10/2026",
  );
});
test("item validation trims input and enforces existing location, dates and name", () => {
  assert.equal(
    validateItem({ ...chicken, name: " Chicken " }, [
      { id: "freezer", name: "Freezer" },
    ]).name,
    "Chicken",
  );
  for (const patch of [
    { name: "  " },
    { locationId: "missing" },
    { addedOn: "2026-02-30" },
    { expiresOn: "" },
    { quantity: Infinity },
  ]) {
    assert.throws(() =>
      validateItem({ ...chicken, ...patch }, [
        { id: "freezer", name: "Freezer" },
      ]),
    );
  }
});
test("search, category, stock, freezer and date filters compose without mutating inventory", () => {
  const data = [
    chicken,
    {
      ...chicken,
      id: "peas",
      name: "Peas",
      category: "Vegetables" as const,
      quantity: 0,
      expiresOn: null,
    },
  ];
  assert.deepEqual(
    selectItems(
      data,
      {
        ...defaultPreferences,
        search: " CHICK ",
        locationId: "freezer",
        category: "Meat",
        expiry: "soon",
      },
      "2026-11-09",
    ).map((i) => i.id),
    ["chicken"],
  );
  assert.deepEqual(
    selectItems(data, { ...defaultPreferences, stock: "depleted" }).map(
      (i) => i.id,
    ),
    ["peas"],
  );
  assert.equal(
    selectItems(
      data,
      { ...defaultPreferences, expiry: "expired" },
      "2026-11-11",
    ).length,
    1,
  );
  assert.equal(data[0], chicken);
});
test("all sort fields work; missing dates stay last in either direction", () => {
  const apple = {
    ...chicken,
    id: "apple",
    name: "Apple",
    quantity: 1,
    addedOn: "2026-10-01",
    expiresOn: "2026-12-01",
  };
  const undated = { ...chicken, id: "none", name: "Bread", expiresOn: null };
  for (const sort of ["name", "quantity", "addedOn"] as const)
    assert.equal(
      selectItems([chicken, apple], { ...defaultPreferences, sort })[0]?.id,
      "apple",
    );
  assert.equal(
    selectItems([undated, apple, chicken], {
      ...defaultPreferences,
      sort: "expiresOn",
    })[0]?.id,
    "chicken",
  );
  const descending = selectItems([undated, apple, chicken], {
    ...defaultPreferences,
    sort: "expiresOn",
    descending: true,
  });
  assert.deepEqual(
    descending.map((i) => i.id),
    ["apple", "chicken", "none"],
  );
});
test("invalid or stale preferences fall back safely", () => {
  assert.deepEqual(normalizePreferences(null, []), defaultPreferences);
  assert.deepEqual(
    normalizePreferences(
      { locationId: "deleted", sort: "invalid", theme: "invalid" },
      [],
    ),
    defaultPreferences,
  );
  const locations = [
    { id: "freezer", name: "Kitchen" },
    { id: "garage", name: "Garage" },
  ];
  const legacy = normalizePreferences({ locationId: "all" }, locations);
  assert.equal(legacy.locationId, "freezer");
  assert.equal(
    normalizePreferences({ locationId: "deleted" }, locations).locationId,
    "freezer",
  );
  assert.equal(
    normalizePreferences({ locationId: "garage" }, locations).locationId,
    "garage",
  );
  assert.deepEqual(
    selectItems(
      [chicken, { ...chicken, id: "garage-food", locationId: "garage" }],
      legacy,
    ).map((i) => i.id),
    ["chicken"],
  );
});
