import React, { useState } from "react";
import { Text } from "react-native";
import { parseQuantity, type InventoryItem } from "../core/model";
import {
  Button,
  Confirm,
  Field,
  Hint,
  Sheet,
  usePalette,
} from "../components/ui";

export function UseFood({
  item,
  busy,
  onUse,
  onClose,
}: {
  item: InventoryItem;
  busy: boolean;
  onUse: (amount: number) => Promise<boolean>;
  onClose: () => void;
}) {
  const c = usePalette();
  const [amount, setAmount] = useState(String(Math.min(1, item.quantity)));
  const [error, setError] = useState("");
  const [deplete, setDeplete] = useState(false);
  async function apply(value: number) {
    if (await onUse(value)) onClose();
  }
  function submit() {
    try {
      const used = parseQuantity(amount);
      if (used > item.quantity)
        throw new Error("You cannot use more than the quantity remaining.");
      if (used === item.quantity) setDeplete(true);
      else void apply(used);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the amount.");
    }
  }
  return (
    <Sheet
      title="Use some food"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Text style={{ color: c.ink, fontSize: 26, fontWeight: "800" }}>
        {item.name}
      </Text>
      <Hint>
        {item.quantity} {item.unit} remaining
      </Hint>
      <Field
        label={`Amount used (${item.unit})`}
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          setError("");
          setDeplete(false);
        }}
        keyboardType="decimal-pad"
        editable={!busy}
      />
      {error !== "" && <Hint error>{error}</Hint>}
      <Button
        title="Update quantity"
        primary
        onPress={submit}
        disabled={busy || deplete}
      />
      <Button
        title="Used it all"
        onPress={() => setDeplete(true)}
        disabled={busy}
      />
      {deplete && (
        <Confirm
          message={`Mark “${item.name}” as depleted? It will leave active inventory. You can find it under Depleted and add more later.`}
          action="Mark depleted"
          onCancel={() => setDeplete(false)}
          onConfirm={() => void apply(item.quantity)}
          busy={busy}
        />
      )}
    </Sheet>
  );
}
