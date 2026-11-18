import React, { useState } from "react";
import { View } from "react-native";
import {
  adjustedQuantity,
  categories,
  MAX_QUANTITY,
  units,
  parseQuantity,
  today,
  validateItem,
  type InventoryItem,
  type ItemInput,
  type FreezerLocation,
} from "../core/model";
import { Button, Choices, Confirm, Field, Hint, Sheet } from "../components/ui";
import { DateField } from "../components/DateField";
import { PhotoField } from "../components/PhotoField";

export function ItemForm({
  item,
  locations,
  preferredLocation,
  busy: saving,
  onSave,
  onDelete,
  onClose,
}: {
  item?: InventoryItem;
  locations: FreezerLocation[];
  preferredLocation: string;
  busy: boolean;
  onSave: (
    input: ItemInput,
    id?: string,
    photo?: string | null,
  ) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ItemInput>(() =>
    item
      ? { ...item }
      : {
          name: "",
          quantity: 1,
          unit: "pieces",
          category: "Other",
          locationId: locations.some((l) => l.id === preferredLocation)
            ? preferredLocation
            : locations[0]!.id,
          addedOn: today(),
          expiresOn: null,
          notes: "",
        },
  );
  const [quantity, setQuantity] = useState(String(draft.quantity));
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<"delete" | "discard" | null>(
    null,
  );
  const [dirty, setDirty] = useState(false);
  const [photo, setPhoto] = useState<string | null>();
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const busy = saving || pickingPhoto;
  let numericQuantity: number | null = null;
  try {
    numericQuantity = parseQuantity(quantity.trim() || "0", true);
  } catch {
    // Let users finish or correct a typed quantity before stepping it.
  }
  function updateQuantity(value: string) {
    setQuantity(value);
    setDirty(true);
    setError("");
  }
  function stepQuantity(delta: -1 | 1) {
    if (numericQuantity === null) return;
    updateQuantity(
      String(
        adjustedQuantity(numericQuantity, Math.max(delta, -numericQuantity)),
      ),
    );
  }
  function change<K extends keyof ItemInput>(key: K, value: ItemInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setError("");
  }
  const close = () => {
    if (busy) return;
    if (dirty) setConfirmation("discard");
    else onClose();
  };
  async function save() {
    setError("");
    try {
      const input = validateItem(
        { ...draft, quantity: parseQuantity(quantity, !!item) },
        locations,
      );
      if (await onSave(input, item?.id, photo)) onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please check the form.");
    }
  }
  if (confirmation === "discard")
    return (
      <Sheet title="Unsaved food" onClose={() => setConfirmation(null)}>
        <Confirm
          message="Discard your unsaved changes?"
          action="Discard changes"
          onCancel={() => setConfirmation(null)}
          onConfirm={onClose}
        />
      </Sheet>
    );
  return (
    <Sheet title={item ? "Edit food" : "Add food"} onClose={close}>
      <Field
        label="Food name *"
        placeholder="e.g. Chicken breasts"
        value={draft.name}
        maxLength={100}
        editable={!busy}
        onChangeText={(v) => change("name", v)}
        autoCapitalize="sentences"
      />
      <Field
        label="Quantity *"
        value={quantity}
        keyboardType="decimal-pad"
        editable={!busy}
        onChangeText={updateQuantity}
        trailing={
          <>
            <Button
              title="−"
              label="Decrease quantity by one"
              disabled={
                busy ||
                numericQuantity === null ||
                numericQuantity <= (item ? 0 : 1)
              }
              onPress={() => stepQuantity(-1)}
            />
            <Button
              title="+"
              label="Increase quantity by one"
              disabled={
                busy ||
                numericQuantity === null ||
                numericQuantity + 1 > MAX_QUANTITY
              }
              onPress={() => stepQuantity(1)}
            />
          </>
        }
        hint={
          item
            ? "Up to 3 decimal places. Set to 0 to mark depleted."
            : "Greater than zero, with up to 3 decimal places."
        }
      />
      <PhotoField
        photoId={item?.photoId ?? null}
        draft={photo}
        disabled={saving}
        onBusyChange={setPickingPhoto}
        onChange={(value) => {
          setPhoto(value);
          setDirty(true);
          setError("");
        }}
      />
      <Choices
        label="Unit"
        options={units.map((v) => ({ value: v, label: v }))}
        value={draft.unit}
        onChange={(v) => change("unit", v)}
        disabled={busy}
      />
      <Choices
        label="Category"
        options={categories.map((v) => ({ value: v, label: v }))}
        value={draft.category}
        onChange={(v) => change("category", v)}
        disabled={busy}
      />
      <Choices
        label="Freezer"
        options={locations.map((v) => ({ value: v.id, label: v.name }))}
        value={draft.locationId}
        onChange={(v) => change("locationId", v)}
        disabled={busy}
      />
      <DateField
        label="Date added *"
        value={draft.addedOn}
        disabled={busy}
        onChange={(v) => {
          change("addedOn", v ?? "");
        }}
      />
      <DateField
        label="Best-before date (optional)"
        value={draft.expiresOn}
        optional
        disabled={busy}
        onChange={(v) => change("expiresOn", v)}
      />
      <Field
        label="Notes (optional)"
        value={draft.notes}
        placeholder="Brand, shelf, recipe plans…"
        maxLength={2000}
        editable={!busy}
        multiline
        onChangeText={(v) => change("notes", v)}
      />
      {error !== "" && <Hint error>{error}</Hint>}
      <Button
        title={busy ? "Saving…" : "Save food"}
        primary
        disabled={busy || confirmation !== null}
        onPress={() => void save()}
      />
      {item && (
        <Button
          title="Delete food"
          danger
          disabled={busy}
          onPress={() => setConfirmation("delete")}
        />
      )}
      {confirmation === "delete" && (
        <View>
          <Confirm
            busy={busy}
            message={`Permanently delete “${item?.name}”?`}
            action="Delete food"
            onCancel={() => setConfirmation(null)}
            onConfirm={() => {
              if (item)
                void onDelete(item.id).then((ok) => {
                  if (ok) onClose();
                });
            }}
          />
        </View>
      )}
    </Sheet>
  );
}
