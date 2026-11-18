import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { FreezerLocation, InventoryItem } from "../core/model";
import { Icon } from "../components/Icon";
import { ErrorNotice, IconButton, usePalette } from "../components/ui";
import { SafeAreaView } from "react-native-safe-area-context";

export function FreezerPicker({
  locations,
  items,
  selected,
  busy,
  onSelect,
  onClose,
}: {
  locations: FreezerLocation[];
  items: InventoryItem[];
  selected: string;
  busy: boolean;
  onSelect: (id: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const c = usePalette();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: c.overlay,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Pressable
          accessibilityLabel="Close freezer menu"
          onPress={onClose}
          style={{ position: "absolute", inset: 0 }}
        />
        <View
          style={{
            width: "100%",
            maxWidth: 460,
            maxHeight: "75%",
            alignSelf: "center",
            borderRadius: 16,
            padding: 12,
            backgroundColor: c.surface,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingLeft: 12,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{ flex: 1, color: c.ink, fontSize: 18, fontWeight: "600" }}
            >
              Select freezer
            </Text>
            <IconButton
              icon="close"
              label="Close freezer menu"
              onPress={onClose}
            />
          </View>
          <ErrorNotice />
          <ScrollView>
            {locations.map((location) => {
              const count = items.filter(
                (i) => i.quantity > 0 && i.locationId === location.id,
              ).length;
              return (
                <Pressable
                  key={location.id}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: selected === location.id,
                    disabled: busy,
                  }}
                  disabled={busy}
                  onPress={() => {
                    void onSelect(location.id).then((ok) => {
                      if (ok) onClose();
                    });
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 56,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor:
                      selected === location.id ? c.soft : "transparent",
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: c.ink,
                      fontSize: 15,
                    }}
                  >
                    {location.name} - {count} {count === 1 ? "item" : "items"}
                  </Text>
                  {selected === location.id && (
                    <Icon name="check" color={c.accent} size={20} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
