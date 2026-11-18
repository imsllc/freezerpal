import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { expiryLabel, expiryStatus, type InventoryItem } from "../core/model";
import { CategoryIcon } from "./CategoryIcon";
import { IconButton, usePalette } from "./ui";
import { useFoodPhoto } from "../hooks/useFoodPhoto";

export function FoodCard({
  item,
  date,
  busy,
  onEdit,
  onDelete,
  onUse,
}: {
  item: InventoryItem;
  date: string;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUse: () => void;
}) {
  const c = usePalette();
  const photo = useFoodPhoto(item.photoId);
  const [failedPhotoId, setFailedPhotoId] = useState<string | null>(null);
  const status = expiryStatus(item, date);
  const depleted = item.quantity === 0;
  const backgroundColor =
    !depleted && status === "expired"
      ? c.dangerBg
      : !depleted && status === "soon"
        ? c.warningBg
        : c.surface;
  const borderColor =
    !depleted && status === "expired"
      ? c.danger
      : !depleted && status === "soon"
        ? c.warning
        : c.line;
  return (
    <View style={[styles.card, { backgroundColor, borderColor }]}>
      <View style={styles.thumbnail}>
        {photo && failedPhotoId !== item.photoId ? (
          <Image
            source={{ uri: photo }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessible
            accessibilityLabel={`Photo of ${item.name}`}
            onError={() => setFailedPhotoId(item.photoId)}
          />
        ) : (
          <CategoryIcon category={item.category} size={42} />
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: c.ink }]}>{item.name}</Text>
          <IconButton
            icon="edit"
            color={c.edit}
            label={`Edit ${item.name}`}
            compact
            onPress={onEdit}
            disabled={busy}
          />
          <IconButton
            icon="trash"
            danger
            label={`Delete ${item.name}`}
            compact
            onPress={onDelete}
            disabled={busy}
          />
        </View>
        <View style={styles.details}>
          <View style={{ gap: 5, flexShrink: 1 }}>
            <View style={[styles.tag, { backgroundColor: c.tag }]}>
              <Text style={{ color: c.muted, fontSize: 13, fontWeight: "500" }}>
                {expiryLabel(item, date)}
              </Text>
            </View>
          </View>
          <View style={[styles.quantity, { borderColor: c.line }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                depleted
                  ? `Restock ${item.name}`
                  : `Use an amount of ${item.name}, ${item.quantity} ${item.unit} remaining`
              }
              onPress={depleted ? onEdit : onUse}
              disabled={busy}
              style={styles.amount}
            >
              <Text style={{ color: c.ink, fontSize: 15, fontWeight: "600" }}>
                {item.quantity}{" "}
                <Text
                  style={{ fontSize: 12, fontWeight: "400", color: c.muted }}
                >
                  {item.unit}
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
  },
  thumbnail: {
    width: 104,
    height: 104,
    alignSelf: "flex-start",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 2 },
  name: { flex: 1, fontSize: 17, fontWeight: "600", paddingVertical: 8 },
  details: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  quantity: { flexDirection: "row", alignItems: "center", marginLeft: "auto" },
  amount: {
    minHeight: 44,
    minWidth: 48,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});
