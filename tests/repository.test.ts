import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { Repository, type Database } from "../src/data/repository";
import type { ItemInput } from "../src/core/model";

function connection(path = ":memory:") {
  const native = new DatabaseSync(path);
  const port: Database = {
    async execAsync(sql) {
      native.exec(sql);
    },
    async runAsync(sql, ...params) {
      return native.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string, ...params: (string | number | null)[]) {
      return native.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]) {
      return (native.prepare(sql).get(...params) as T) ?? null;
    },
  };
  let serial = 0;
  return { native, port, repo: new Repository(port, () => `id-${++serial}`) };
}
const input: ItemInput = {
  name: "Chicken",
  quantity: 8,
  unit: "pieces",
  category: "Meat",
  locationId: "default-freezer",
  addedOn: "2026-11-09",
  expiresOn: null,
  notes: "Top shelf",
};
// Small JPEG-prefixed payloads for testing storage and identity, not image decoding.
const photoA = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
const photoB = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQIA";

test("initialization is idempotent with migration, foreign keys, and a default freezer", async () => {
  const { repo, native } = connection();
  try {
    await repo.initialize();
    await repo.initialize();
    const state = await repo.load();
    assert.equal(state.locations.length, 1);
    assert.equal(state.locations[0]?.name, "Freezer");
    assert.equal(
      (native.prepare("PRAGMA user_version").get() as { user_version: number })
        .user_version,
      2,
    );
    assert.throws(() =>
      native
        .prepare("INSERT INTO items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(
          "bad",
          "Bad",
          1,
          "pieces",
          "Other",
          "missing",
          "2026-11-09",
          null,
          "",
        ),
    );
    await assert.rejects(
      repo.deleteLocation("default-freezer", "missing"),
      /at least one/,
    );
  } finally {
    native.close();
  }
});
test("SQLite persists food, photos, freezers and preferences across close/reopen", async () => {
  const folder = mkdtempSync(join(tmpdir(), "freezerpal-"));
  const file = join(folder, "test.db");
  const first = connection(file);
  try {
    await first.repo.initialize();
    const food = (await first.repo.saveItem(input, undefined, photoA))
      .items[0]!;
    const state = await first.repo.saveLocation("Garage");
    const garage = state.locations.find((l) => l.name === "Garage")!;
    await first.repo.savePreferences({
      locationId: garage.id,
      sort: "expiresOn",
      category: "Meat",
      theme: "dark",
      search: "chick",
      descending: true,
      stock: "all",
      expiry: "undated",
    });
    const expected = await first.repo.load();
    first.native.close();
    const second = connection(file);
    try {
      await second.repo.initialize();
      assert.deepEqual(await second.repo.load(), expected);
      assert.equal(await second.repo.loadPhoto(food.photoId!), photoA);
    } finally {
      second.native.close();
    }
  } finally {
    if (first.native.isOpen) first.native.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
test("version 1 inventory upgrades without altering its food, freezers, or saved filters", async () => {
  const { repo, native } = connection();
  try {
    await repo.initialize();
    await repo.saveItem(input);
    const before = await repo.savePreferences({
      search: "chicken",
      sort: "quantity",
    });
    native.exec("DROP TABLE item_photos; PRAGMA user_version = 1;");
    await repo.initialize();
    assert.deepEqual(await repo.load(), before);
    assert.equal(
      (native.prepare("PRAGMA user_version").get() as { user_version: number })
        .user_version,
      2,
    );
  } finally {
    native.close();
  }
});

test("editing preserves photos unless replaced or removed, and deleting food deletes its photo", async () => {
  const { repo, native } = connection();
  try {
    await repo.initialize();
    const food = (await repo.saveItem(input, undefined, photoA)).items[0]!;
    const firstPhotoId = food.photoId!;
    const renamed = (
      await repo.saveItem({ ...input, name: "Chicken thighs" }, food.id)
    ).items[0]!;
    assert.equal(renamed.photoId, firstPhotoId);
    assert.equal(await repo.loadPhoto(firstPhotoId), photoA);
    await assert.rejects(
      repo.saveItem(
        { ...input, name: "Failed edit" },
        food.id,
        "https://example.com/photo.jpg",
      ),
      /could not be read/,
    );
    assert.deepEqual((await repo.load()).items[0], renamed);
    const replaced = (await repo.saveItem(input, food.id, photoB)).items[0]!;
    assert.notEqual(replaced.photoId, firstPhotoId);
    assert.equal(await repo.loadPhoto(firstPhotoId), null);
    assert.equal(await repo.loadPhoto(replaced.photoId!), photoB);
    const removed = (await repo.saveItem(input, food.id, null)).items[0]!;
    assert.equal(removed.photoId, null);
    assert.equal(await repo.loadPhoto(replaced.photoId!), null);
    const withPhoto = (await repo.saveItem(input, food.id, photoA)).items[0]!;
    await repo.deleteItem(food.id);
    assert.equal(await repo.loadPhoto(withPhoto.photoId!), null);
  } finally {
    native.close();
  }
});
test("concurrent adjustments serialize and decimal depletion can be restocked", async () => {
  const { repo, native } = connection();
  try {
    await repo.initialize();
    const saved = await repo.saveItem(input);
    const id = saved.items[0]!.id;
    await Promise.all([
      repo.adjustItem(id, -2),
      repo.adjustItem(id, -1),
      repo.adjustItem(id, 0.125),
    ]);
    assert.equal((await repo.load()).items[0]?.quantity, 5.125);
    await repo.adjustItem(id, -5.125);
    assert.equal((await repo.load()).items[0]?.quantity, 0);
    await assert.rejects(repo.adjustItem(id, -1));
    await assert.rejects(repo.adjustItem(id, NaN));
    await repo.adjustItem(id, 1);
    assert.equal((await repo.load()).items[0]?.quantity, 1);
  } finally {
    native.close();
  }
});
test("edit, move, rename and delete preserve item identity; duplicate names and invalid data are rejected", async () => {
  const { repo, native } = connection();
  try {
    await repo.initialize();
    const item = (await repo.saveItem(input)).items[0]!;
    const garage = (await repo.saveLocation("Garage")).locations.find(
      (l) => l.name === "Garage",
    )!;
    await repo.saveItem(
      { ...item, name: "Chicken breasts", locationId: garage.id },
      item.id,
    );
    await repo.saveLocation("Basement", garage.id);
    assert.equal((await repo.load()).items[0]?.id, item.id);
    await assert.rejects(repo.saveLocation("basement"), /already exists/);
    await assert.rejects(repo.saveItem({ ...input, quantity: -1 }));
    await assert.rejects(repo.saveItem({ ...input, quantity: 0 }));
    await repo.savePreferences({ locationId: garage.id });
    const moved = await repo.deleteLocation(garage.id, "default-freezer");
    assert.equal(moved.items[0]?.locationId, "default-freezer");
    assert.equal(moved.preferences.locationId, "default-freezer");
    assert.equal(moved.locations.length, 1);
    await repo.deleteItem(item.id);
    assert.equal((await repo.load()).items.length, 0);
    await assert.rejects(repo.saveItem(input, "missing"), /no longer exists/);
  } finally {
    native.close();
  }
});
test("failed multi-step freezer deletion rolls back moved items and filters; subsequent writes still work", async () => {
  const { repo, port, native } = connection();
  try {
    await repo.initialize();
    await repo.saveItem(input);
    const garage = (await repo.saveLocation("Garage")).locations.find(
      (l) => l.name === "Garage",
    )!;
    await repo.savePreferences({ locationId: "default-freezer" });
    const before = await repo.load();
    const original = port.runAsync;
    port.runAsync = async (sql, ...params) => {
      if (sql.startsWith("DELETE FROM locations"))
        throw new Error("Simulated disk failure");
      return original(sql, ...params);
    };
    await assert.rejects(
      repo.deleteLocation("default-freezer", garage.id),
      /disk failure/,
    );
    assert.deepEqual(await repo.load(), before);
    port.runAsync = original;
    assert.equal(
      (await repo.deleteLocation("default-freezer", garage.id)).items[0]
        ?.locationId,
      garage.id,
    );
  } finally {
    native.close();
  }
});
test("newer schemas are refused without overwriting existing data", async () => {
  const { repo, native } = connection();
  try {
    native.exec("PRAGMA user_version = 99");
    await assert.rejects(repo.initialize(), /newer FreezerPal/);
    assert.equal(
      (native.prepare("PRAGMA user_version").get() as { user_version: number })
        .user_version,
      99,
    );
  } finally {
    native.close();
  }
});
