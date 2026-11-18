import {
  adjustedQuantity,
  defaultPreferences,
  normalizePreferences,
  validateItem,
  type FreezerLocation,
  type InventoryItem,
  type ItemInput,
  type Preferences,
  type Snapshot,
} from "../core/model";
import { validatePhoto } from "../core/photo";

// A small SQL port keeps the data layer testable independently of React Native.
export interface Database {
  execAsync(sql: string): Promise<void>;
  runAsync(
    sql: string,
    ...params: (string | number | null)[]
  ): Promise<unknown>;
  getAllAsync<T>(
    sql: string,
    ...params: (string | number | null)[]
  ): Promise<T[]>;
  getFirstAsync<T>(
    sql: string,
    ...params: (string | number | null)[]
  ): Promise<T | null>;
}
export class Repository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private db: Database,
    private id: () => string,
  ) {}
  // All reads and writes share one queue: no interleaved transactions or stale +/- updates.
  private serialized<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async transaction<T>(task: () => Promise<T>): Promise<T> {
    await this.db.execAsync("BEGIN IMMEDIATE");
    try {
      const result = await task();
      await this.db.execAsync("COMMIT");
      return result;
    } catch (error) {
      await this.db.execAsync("ROLLBACK");
      throw error;
    }
  }
  initialize(): Promise<void> {
    return this.serialized(async () => {
      await this.db.execAsync(
        "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
      );
      const version = await this.db.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
      );
      const schemaVersion = version?.user_version ?? 0;
      if (schemaVersion > 2)
        throw new Error(
          "This data was created by a newer FreezerPal version. Update the app to open it.",
        );
      if (schemaVersion < 2)
        await this.transaction(async () => {
          if (schemaVersion === 0) {
            await this.db.execAsync(`
          CREATE TABLE locations (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(name)) BETWEEN 1 AND 60));
          CREATE TABLE items (
            id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
            quantity REAL NOT NULL CHECK(quantity >= 0 AND quantity <= 1000000), unit TEXT NOT NULL,
            category TEXT NOT NULL, locationId TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
            addedOn TEXT NOT NULL, expiresOn TEXT, notes TEXT NOT NULL DEFAULT ''
          );
          CREATE INDEX items_location ON items(locationId);
          CREATE INDEX items_expiration ON items(expiresOn);
          CREATE TABLE preferences (id INTEGER PRIMARY KEY CHECK(id = 1), value TEXT NOT NULL);
          INSERT INTO locations (id, name) VALUES ('default-freezer', 'Freezer');
        `);
            await this.db.runAsync(
              "INSERT INTO preferences (id, value) VALUES (1, ?)",
              JSON.stringify(defaultPreferences),
            );
          }
          await this.db.execAsync(`
            CREATE TABLE item_photos (
              id TEXT PRIMARY KEY NOT NULL,
              itemId TEXT NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
              data TEXT NOT NULL
            );
            PRAGMA user_version = 2;
          `);
        });
    });
  }
  private async snapshot(): Promise<Snapshot> {
    const items = await this.db.getAllAsync<InventoryItem>(
      "SELECT items.*, item_photos.id AS photoId FROM items LEFT JOIN item_photos ON item_photos.itemId = items.id",
    );
    const locations = await this.db.getAllAsync<FreezerLocation>(
      "SELECT * FROM locations ORDER BY name COLLATE NOCASE",
    );
    const row = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM preferences WHERE id = 1",
    );
    // A malformed preference row should surface as an error, never discard inventory.
    const preferences = normalizePreferences(
      row ? JSON.parse(row.value) : {},
      locations,
    );
    return { items, locations, preferences };
  }
  load(): Promise<Snapshot> {
    return this.serialized(() => this.snapshot());
  }
  loadPhoto(id: string): Promise<string | null> {
    return this.serialized(async () => {
      const photo = await this.db.getFirstAsync<{ data: string }>(
        "SELECT data FROM item_photos WHERE id = ?",
        id,
      );
      return photo?.data ?? null;
    });
  }
  private mutate(task: () => Promise<unknown>): Promise<Snapshot> {
    return this.serialized(() =>
      this.transaction(async () => {
        await task();
        return this.snapshot();
      }),
    );
  }
  saveItem(
    input: ItemInput,
    id?: string,
    photo?: string | null,
  ): Promise<Snapshot> {
    return this.mutate(async () => {
      const locations = await this.db.getAllAsync<FreezerLocation>(
        "SELECT * FROM locations",
      );
      const item = validateItem(input, locations);
      const itemId = id ?? this.id();
      const values = [
        item.name,
        item.quantity,
        item.unit,
        item.category,
        item.locationId,
        item.addedOn,
        item.expiresOn,
        item.notes,
      ];
      if (id) {
        if (
          !(await this.db.getFirstAsync(
            "SELECT id FROM items WHERE id = ?",
            id,
          ))
        )
          throw new Error("This item no longer exists.");
        await this.db.runAsync(
          "UPDATE items SET name=?, quantity=?, unit=?, category=?, locationId=?, addedOn=?, expiresOn=?, notes=? WHERE id=?",
          ...values,
          id,
        );
      } else {
        if (item.quantity === 0)
          throw new Error("New food must have a quantity greater than zero.");
        await this.db.runAsync(
          "INSERT INTO items (name, quantity, unit, category, locationId, addedOn, expiresOn, notes, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          ...values,
          itemId,
        );
      }
      if (photo === null) {
        await this.db.runAsync(
          "DELETE FROM item_photos WHERE itemId = ?",
          itemId,
        );
      } else if (photo !== undefined) {
        await this.db.runAsync(
          "INSERT INTO item_photos (id, itemId, data) VALUES (?, ?, ?) ON CONFLICT(itemId) DO UPDATE SET id = excluded.id, data = excluded.data",
          this.id(),
          itemId,
          validatePhoto(photo),
        );
      }
    });
  }
  adjustItem(id: string, delta: number): Promise<Snapshot> {
    return this.mutate(async () => {
      const item = await this.db.getFirstAsync<Pick<InventoryItem, "quantity">>(
        "SELECT quantity FROM items WHERE id = ?",
        id,
      );
      if (!item) throw new Error("This item no longer exists.");
      if (!Number.isFinite(delta) || delta === 0)
        throw new Error("Enter an amount greater than zero.");
      await this.db.runAsync(
        "UPDATE items SET quantity = ? WHERE id = ?",
        adjustedQuantity(item.quantity, delta),
        id,
      );
    });
  }
  deleteItem(id: string): Promise<Snapshot> {
    return this.mutate(() =>
      this.db.runAsync("DELETE FROM items WHERE id = ?", id),
    );
  }
  savePreferences(patch: Partial<Preferences>): Promise<Snapshot> {
    return this.mutate(async () => {
      const state = await this.snapshot();
      const next = normalizePreferences(
        { ...state.preferences, ...patch },
        state.locations,
      );
      await this.db.runAsync(
        "UPDATE preferences SET value = ? WHERE id = 1",
        JSON.stringify(next),
      );
    });
  }
  saveLocation(name: string, id?: string): Promise<Snapshot> {
    return this.mutate(async () => {
      name = name.trim();
      if (!name || name.length > 60)
        throw new Error("Freezer name is required (up to 60 characters).");
      const existing = await this.db.getFirstAsync<FreezerLocation>(
        "SELECT * FROM locations WHERE name = ? COLLATE NOCASE",
        name,
      );
      if (existing && existing.id !== id)
        throw new Error("A freezer with that name already exists.");
      if (id) {
        if (
          !(await this.db.getFirstAsync(
            "SELECT id FROM locations WHERE id=?",
            id,
          ))
        )
          throw new Error("This freezer no longer exists.");
        await this.db.runAsync(
          "UPDATE locations SET name = ? WHERE id = ?",
          name,
          id,
        );
      } else
        await this.db.runAsync(
          "INSERT INTO locations (id, name) VALUES (?, ?)",
          this.id(),
          name,
        );
    });
  }
  deleteLocation(id: string, destinationId: string): Promise<Snapshot> {
    return this.mutate(async () => {
      const state = await this.snapshot();
      if (state.locations.length < 2)
        throw new Error("Keep at least one freezer. You can rename it.");
      if (!state.locations.some((l) => l.id === id))
        throw new Error("This freezer no longer exists.");
      if (
        id === destinationId ||
        !state.locations.some((l) => l.id === destinationId)
      )
        throw new Error("Choose another freezer to receive these items.");
      await this.db.runAsync(
        "UPDATE items SET locationId = ? WHERE locationId = ?",
        destinationId,
        id,
      );
      await this.db.runAsync("DELETE FROM locations WHERE id = ?", id);
      if (state.preferences.locationId === id) {
        await this.db.runAsync(
          "UPDATE preferences SET value = ? WHERE id = 1",
          JSON.stringify({ ...state.preferences, locationId: destinationId }),
        );
      }
    });
  }
}
