import React, { useState } from "react";
import {
  categories,
  defaultPreferences,
  type Preferences,
} from "../core/model";
import { Button, Choices, Sheet } from "../components/ui";

export function Filters({
  preferences,
  busy,
  onSave,
  onClose,
}: {
  preferences: Preferences;
  busy: boolean;
  onSave: (preferences: Partial<Preferences>) => Promise<boolean>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(preferences);
  function change<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setDraft((p) => ({ ...p, [key]: value }));
  }
  async function save() {
    if (await onSave(draft)) onClose();
  }
  return (
    <Sheet
      title="Filter & sort"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Choices
        label="Category"
        options={[
          { value: "all" as const, label: "All categories" },
          ...categories.map((v) => ({ value: v, label: v })),
        ]}
        value={draft.category}
        onChange={(v) => change("category", v)}
        disabled={busy}
      />
      <Choices
        label="Best-before"
        options={[
          { value: "all", label: "Any date" },
          { value: "soon", label: "Next 7 days" },
          { value: "expired", label: "Past date" },
          { value: "undated", label: "No date" },
        ]}
        value={draft.expiry}
        onChange={(v) => change("expiry", v)}
        disabled={busy}
      />
      <Choices
        label="Inventory"
        options={[
          { value: "active", label: "In stock" },
          { value: "depleted", label: "Depleted" },
          { value: "all", label: "All food" },
        ]}
        value={draft.stock}
        onChange={(v) => change("stock", v)}
        disabled={busy}
      />
      <Choices
        label="Sort by"
        options={[
          { value: "name", label: "Name" },
          { value: "quantity", label: "Quantity" },
          { value: "addedOn", label: "Date added" },
          { value: "expiresOn", label: "Best-before" },
        ]}
        value={draft.sort}
        onChange={(v) => change("sort", v)}
        disabled={busy}
      />
      <Choices
        label="Order"
        options={[
          { value: "asc", label: "Ascending" },
          { value: "desc", label: "Descending" },
        ]}
        value={draft.descending ? "desc" : "asc"}
        onChange={(v) => change("descending", v === "desc")}
        disabled={busy}
      />
      <Button
        title="Apply selections"
        primary
        onPress={() => void save()}
        disabled={busy}
      />
      <Button
        title="Reset selections"
        onPress={() =>
          setDraft({
            ...defaultPreferences,
            theme: draft.theme,
            locationId: draft.locationId,
          })
        }
        disabled={busy}
      />
    </Sheet>
  );
}
