import React, { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { FreezerLocation, InventoryItem } from "../core/model";
import {
  Button,
  Choices,
  Confirm,
  Field,
  Hint,
  Sheet,
  s,
  usePalette,
} from "../components/ui";

export function Locations({
  locations,
  items,
  busy,
  onSave,
  onDelete,
  onClose,
}: {
  locations: FreezerLocation[];
  items: InventoryItem[];
  busy: boolean;
  onSave: (name: string, id?: string) => Promise<boolean>;
  onDelete: (id: string, destinationId: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const c = usePalette();
  const scrollRef = useRef<ScrollView>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  async function save() {
    if (!name.trim()) {
      setError("Enter a freezer name.");
      return;
    }
    if (await onSave(name, editing ?? undefined)) {
      setName("");
      setEditing(null);
      setError("");
    }
  }
  if (discard)
    return (
      <Sheet title="Unsaved freezer" onClose={() => setDiscard(false)}>
        <Confirm
          message="Discard this unsaved freezer name?"
          action="Discard changes"
          onConfirm={onClose}
          onCancel={() => setDiscard(false)}
        />
      </Sheet>
    );
  return (
    <Sheet
      title="Your freezers"
      scrollRef={scrollRef}
      onClose={() => {
        if (busy) return;
        if (name.trim()) setDiscard(true);
        else onClose();
      }}
    >
      <Field
        label={editing ? "Rename freezer" : "New freezer name"}
        placeholder="e.g. Garage Freezer"
        value={name}
        maxLength={60}
        onChangeText={(v) => {
          setName(v);
          setError("");
        }}
        editable={!busy && !deleting}
      />
      {error !== "" && <Hint error>{error}</Hint>}
      <Button
        title={editing ? "Save name" : "Add freezer"}
        primary
        disabled={busy || deleting !== null}
        onPress={() => void save()}
      />
      {editing && (
        <Button
          title="Cancel rename"
          neutral
          disabled={busy}
          onPress={() => {
            setEditing(null);
            setName("");
            setError("");
          }}
        />
      )}
      <Hint>
        Keep at least one freezer. Deleting a freezer moves its food to a
        freezer you choose.
      </Hint>
      {locations.map((location) => (
        <View
          key={location.id}
          style={{
            padding: 16,
            backgroundColor: c.surface,
            borderColor: c.line,
            borderWidth: 1,
            borderRadius: 16,
            gap: 10,
          }}
        >
          <Text style={{ color: c.ink, fontSize: 18, fontWeight: "700" }}>
            {location.name}
          </Text>
          <Hint>
            {
              items.filter(
                (i) => i.locationId === location.id && i.quantity > 0,
              ).length
            }{" "}
            foods in stock
          </Hint>
          <View style={s.row}>
            <Button
              title="Rename"
              disabled={busy || deleting !== null}
              label={`Rename ${location.name}`}
              onPress={() => {
                setEditing(location.id);
                setName(location.name);
                setError("");
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              }}
            />
            <Button
              title="Delete"
              danger
              disabled={busy || locations.length < 2 || editing !== null}
              label={`Delete ${location.name}`}
              onPress={() => {
                setDeleting(location.id);
                setDestination(locations.find((l) => l.id !== location.id)!.id);
              }}
            />
          </View>
          {deleting === location.id && (
            <>
              <Choices
                label="Move all food to"
                options={locations
                  .filter((l) => l.id !== location.id)
                  .map((l) => ({ value: l.id, label: l.name }))}
                value={destination}
                onChange={setDestination}
                disabled={busy}
              />
              <Confirm
                message={`Delete “${location.name}” and move its food, including depleted entries? If this freezer is selected, the list will switch to the destination freezer.`}
                action="Move & delete"
                busy={busy}
                onCancel={() => setDeleting(null)}
                onConfirm={() => {
                  void onDelete(location.id, destination).then((ok) => {
                    if (ok) setDeleting(null);
                  });
                }}
              />
            </>
          )}
        </View>
      ))}
    </Sheet>
  );
}
