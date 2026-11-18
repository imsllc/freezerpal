export const categories = [
  "Meat",
  "Vegetables",
  "Fruit",
  "Prepared meals",
  "Bread",
  "Seafood",
  "Dairy",
  "Other",
] as const;
export const units = [
  "pieces",
  "packages",
  "pounds",
  "ounces",
  "kilograms",
  "grams",
  "portions",
  "bags",
  "containers",
] as const;
export type Category = (typeof categories)[number];
export interface FreezerLocation {
  id: string;
  name: string;
}
export interface InventoryItem {
  id: string;
  photoId: string | null;
  name: string;
  quantity: number;
  unit: string;
  category: Category;
  locationId: string;
  addedOn: string;
  expiresOn: string | null;
  notes: string;
}
export type ItemInput = Omit<InventoryItem, "id" | "photoId">;
export interface Preferences {
  search: string;
  locationId: string;
  category: Category | "all";
  sort: "name" | "quantity" | "addedOn" | "expiresOn";
  descending: boolean;
  expiry: "all" | "soon" | "expired" | "undated";
  stock: "active" | "depleted" | "all";
  theme: "system" | "light" | "dark";
}
export interface Snapshot {
  items: InventoryItem[];
  locations: FreezerLocation[];
  preferences: Preferences;
}
export const defaultPreferences: Preferences = {
  search: "",
  locationId: "all",
  category: "all",
  sort: "name",
  descending: false,
  expiry: "all",
  stock: "active",
  theme: "system",
};
export const MAX_QUANTITY = 1_000_000;
export function today(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= "1900-01-01"
  );
}
export function dayDifference(date: string, from: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}
export function displayDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}
export function expiryStatus(
  item: Pick<InventoryItem, "expiresOn">,
  date = today(),
): "expired" | "soon" | "fresh" | "undated" {
  if (!item.expiresOn) return "undated";
  const days = dayDifference(item.expiresOn, date);
  return days < 0 ? "expired" : days <= 7 ? "soon" : "fresh";
}
export function expiryLabel(item: InventoryItem, date = today()): string {
  if (!item.expiresOn) return "No date";
  const days = dayDifference(item.expiresOn, date);
  const interval =
    days < 0
      ? "Expired"
      : days === 0
        ? "Today"
        : `${days} ${days === 1 ? "day" : "days"}`;
  return `${interval} - ${displayDate(item.expiresOn)}`;
}
export function parseQuantity(text: string, allowZero = false): number {
  if (!/^\d+(?:\.\d{1,3})?$/.test(text.trim()))
    throw new Error("Enter a quantity with up to 3 decimal places.");
  const value = Number(text);
  validateQuantity(value, allowZero);
  return value;
}
export function validateQuantity(value: number, allowZero = true): void {
  if (
    !Number.isFinite(value) ||
    value < (allowZero ? 0 : 0.001) ||
    value > MAX_QUANTITY ||
    Math.abs(value * 1000 - Math.round(value * 1000)) > 0.00001
  ) {
    throw new Error(
      `Quantity must be ${allowZero ? "0" : "0.001"} to 1,000,000, with up to 3 decimal places.`,
    );
  }
}
export function adjustedQuantity(current: number, delta: number): number {
  validateQuantity(Math.abs(delta), false);
  const next = Math.round((current + delta) * 1000) / 1000;
  validateQuantity(next);
  if (delta < 0 && -delta > current)
    throw new Error("You cannot use more than the quantity remaining.");
  return next;
}
export function validateItem(
  input: ItemInput,
  locations: FreezerLocation[],
): ItemInput {
  const value = {
    ...input,
    name: input.name.trim(),
    unit: input.unit.trim(),
    notes: input.notes.trim(),
  };
  if (!value.name || value.name.length > 100)
    throw new Error("Food name is required (up to 100 characters).");
  validateQuantity(value.quantity);
  if (!value.unit || value.unit.length > 30)
    throw new Error("Choose a unit (up to 30 characters).");
  if (!categories.includes(value.category))
    throw new Error("Choose a valid category.");
  if (!locations.some((location) => location.id === value.locationId))
    throw new Error("Choose an existing freezer.");
  if (
    !isDate(value.addedOn) ||
    (value.expiresOn !== null && !isDate(value.expiresOn))
  )
    throw new Error("Enter a valid date in MM/DD/YYYY format (1900 or later).");
  if (value.notes.length > 2000)
    throw new Error("Notes must be 2,000 characters or fewer.");
  return value;
}
export function normalizePreferences(
  raw: unknown,
  locations: FreezerLocation[],
): Preferences {
  const p = raw && typeof raw === "object" ? (raw as Partial<Preferences>) : {};
  return {
    search: typeof p.search === "string" ? p.search.slice(0, 100) : "",
    locationId: locations.some((l) => l.id === p.locationId)
      ? p.locationId!
      : (locations.find((l) => l.id === "default-freezer")?.id ??
        locations[0]?.id ??
        "all"),
    category: categories.includes(p.category as Category) ? p.category! : "all",
    sort: ["name", "quantity", "addedOn", "expiresOn"].includes(p.sort ?? "")
      ? p.sort!
      : "name",
    descending: p.descending === true,
    expiry: ["all", "soon", "expired", "undated"].includes(p.expiry ?? "")
      ? p.expiry!
      : "all",
    stock: ["active", "depleted", "all"].includes(p.stock ?? "")
      ? p.stock!
      : "active",
    theme: ["system", "light", "dark"].includes(p.theme ?? "")
      ? p.theme!
      : "system",
  };
}
export function selectItems(
  items: InventoryItem[],
  prefs: Preferences,
  date = today(),
): InventoryItem[] {
  return items
    .filter(
      (item) =>
        item.name
          .toLocaleLowerCase()
          .includes(prefs.search.trim().toLocaleLowerCase()) &&
        (prefs.locationId === "all" || item.locationId === prefs.locationId) &&
        (prefs.category === "all" || item.category === prefs.category) &&
        (prefs.stock === "all" ||
          (prefs.stock === "active"
            ? item.quantity > 0
            : item.quantity === 0)) &&
        (prefs.expiry === "all" || expiryStatus(item, date) === prefs.expiry),
    )
    .sort((a, b) => {
      const left = a[prefs.sort];
      const right = b[prefs.sort];
      // Undated items stay last in either direction.
      if (left === null || right === null)
        return left === right
          ? a.name.localeCompare(b.name)
          : left === null
            ? 1
            : -1;
      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return (
        (prefs.descending ? -comparison : comparison) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id)
      );
    });
}
