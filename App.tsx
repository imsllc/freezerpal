import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import {
  defaultPreferences,
  selectItems,
  type Preferences,
} from "./src/core/model";
import { useInventory } from "./src/hooks/useInventory";
import { useRemoveAds } from "./src/hooks/useRemoveAds";
import { themes } from "./src/theme";
import {
  Button,
  Confirm,
  ErrorNotice,
  Hint,
  IconButton,
  Palette,
  SaveNotice,
  Sheet,
} from "./src/components/ui";
import { Icon } from "./src/components/Icon";
import { FoodCard } from "./src/components/FoodCard";
import { useInventoryAds } from "./src/components/InventoryAds";
import { ItemForm } from "./src/screens/ItemForm";
import { UseFood } from "./src/screens/UseFood";
import { Filters } from "./src/screens/Filters";
import { Locations } from "./src/screens/Locations";
import { Settings } from "./src/screens/Settings";
import { PrivacyPolicy } from "./src/screens/PrivacyPolicy";
import { FreezerPicker } from "./src/screens/FreezerPicker";

type Screen =
  | { kind: "add" }
  | { kind: "edit" | "use" | "delete"; id: string }
  | { kind: "filters" | "freezers" | "locations" | "settings" | "privacy" }
  | null;
export default function App() {
  return (
    <SafeAreaProvider>
      <FreezerPal />
    </SafeAreaProvider>
  );
}

function FreezerPal() {
  const { state, ready, busy, error, clearError, run, initialize, date } =
    useInventory();
  const system = useColorScheme();
  const removeAds = useRemoveAds();
  const adsEnabled = ready && (!removeAds || (removeAds.loaded && !removeAds.owned));
  const { banner, openAdPrivacyChoices } = useInventoryAds(adsEnabled);
  const dark =
    state.preferences.theme === "system"
      ? system === "dark"
      : state.preferences.theme === "dark";
  const c = themes[dark ? "dark" : "light"];
  const [screen, setScreen] = useState<Screen>(null);
  const [search, setSearch] = useState("");
  const hydratedSearch = useRef(false);
  useEffect(() => {
    if (ready && !hydratedSearch.current) {
      setSearch(state.preferences.search);
      hydratedSearch.current = true;
    }
  }, [ready, state.preferences.search]);
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.bg).catch(() => undefined);
  }, [c.bg]);
  function navigate(next: Screen) {
    clearError();
    setScreen(next);
  }
  const close = () => {
    if (!busy) setScreen(null);
  };
  const preferences = { ...state.preferences, search };
  const visible = selectItems(state.items, preferences, date);
  const freezerName =
    state.locations.find((l) => l.id === preferences.locationId)?.name ?? "";
  const freezerCount = state.items.filter(
    (i) => i.quantity > 0 && i.locationId === preferences.locationId,
  ).length;
  const selectedItem =
    screen && "id" in screen
      ? state.items.find((i) => i.id === screen.id)
      : undefined;
  const filtered =
    search.trim() !== "" ||
    preferences.category !== "all" ||
    preferences.expiry !== "all" ||
    preferences.stock !== "active";
  const customSort = preferences.sort !== "name" || preferences.descending;
  async function savePreferences(patch: Partial<Preferences>) {
    const ok = await run((repo) => repo.savePreferences(patch));
    if (ok && patch.search !== undefined) setSearch(patch.search);
    return ok;
  }
  async function deleteFood(id: string) {
    const ok = await run((repo) => repo.deleteItem(id));
    if (ok) setScreen(null);
    return ok;
  }
  return (
    <Palette.Provider value={c}>
      <SaveNotice.Provider value={{ error, clear: clearError }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <StatusBar style={dark ? "light" : "dark"} />
          {!ready ? (
            <View style={styles.loading}>
              <Text style={[styles.title, { color: c.ink }]}>FreezerPal</Text>
              {error ? (
                <>
                  <Hint error>{error}</Hint>
                  <Button title="Try again" onPress={() => void initialize()} />
                </>
              ) : (
                <ActivityIndicator color={c.accent} />
              )}
            </View>
          ) : (
            <View style={styles.page}>
              <View style={styles.header}>
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: c.ink, flex: 1 }]}
                >
                  FreezerPal
                </Text>
                <IconButton
                  icon="settings"
                  label="Settings"
                  onPress={() => navigate({ kind: "settings" })}
                />
              </View>
              <View style={styles.toolbar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${freezerName} - ${freezerCount} ${freezerCount === 1 ? "item" : "items"}. Select freezer`}
                  accessibilityState={{ expanded: screen?.kind === "freezers" }}
                  onPress={() => navigate({ kind: "freezers" })}
                  style={({ pressed }) => [
                    styles.freezer,
                    {
                      backgroundColor: pressed ? c.tag : c.surface,
                      borderColor: c.line,
                    },
                  ]}
                >
                  <Icon name="freezer" color={c.muted} size={21} />
                  <Text
                    style={{
                      flex: 1,
                      color: c.ink,
                      fontSize: 15,
                      fontWeight: "500",
                    }}
                  >
                    {freezerName} - {freezerCount}{" "}
                    {freezerCount === 1 ? "item" : "items"}
                  </Text>
                  <Icon name="chevron" color={c.muted} size={18} />
                </Pressable>
                <View style={styles.searchRow}>
                  <View
                    style={[
                      styles.search,
                      { backgroundColor: c.surface, borderColor: c.line },
                    ]}
                  >
                    <Icon name="search" color={c.muted} size={19} />
                    <TextInput
                      accessibilityLabel="Search inventory"
                      placeholder="Search food"
                      placeholderTextColor={c.muted}
                      value={search}
                      maxLength={100}
                      autoCorrect={false}
                      returnKeyType="search"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        color: c.ink,
                        fontSize: 15,
                        paddingVertical: 12,
                      }}
                      onChangeText={(value) => {
                        setSearch(value);
                        void run((repo) =>
                          repo.savePreferences({ search: value }),
                        );
                      }}
                    />
                    {search !== "" && (
                      <IconButton
                        icon="close"
                        label="Clear search"
                        compact
                        onPress={() => {
                          setSearch("");
                          void run((repo) =>
                            repo.savePreferences({ search: "" }),
                          );
                        }}
                      />
                    )}
                  </View>
                  <IconButton
                    icon="filter"
                    label="Filter and sort"
                    active={filtered || customSort}
                    onPress={() => navigate({ kind: "filters" })}
                  />
                </View>
                <ErrorNotice />
              </View>
              <FlatList
                data={visible}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                  <FoodCard
                    item={item}
                    busy={busy}
                    date={date}
                    onEdit={() => navigate({ kind: "edit", id: item.id })}
                    onDelete={() => navigate({ kind: "delete", id: item.id })}
                    onUse={() => navigate({ kind: "use", id: item.id })}
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Text style={{ color: c.muted, fontSize: 16 }}>
                      {filtered
                        ? "No matching items"
                        : "No items in this freezer"}
                    </Text>
                    {filtered && (
                      <Button
                        title="Clear filters"
                        onPress={() =>
                          void savePreferences({
                            ...defaultPreferences,
                            theme: preferences.theme,
                            locationId: preferences.locationId,
                          })
                        }
                        disabled={busy}
                      />
                    )}
                  </View>
                }
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
              <View style={[styles.footer, { borderColor: c.line }]}>
                <Button
                  title="＋  Add food"
                  primary
                  onPress={() => navigate({ kind: "add" })}
                  disabled={busy}
                />
              </View>
              {banner}
            </View>
          )}
          {screen?.kind === "add" && (
            <ItemForm
              locations={state.locations}
              preferredLocation={preferences.locationId}
              busy={busy}
              onClose={() => setScreen(null)}
              onSave={(input, id, photo) =>
                run((repo) => repo.saveItem(input, id, photo))
              }
              onDelete={deleteFood}
            />
          )}
          {screen?.kind === "edit" && selectedItem && (
            <ItemForm
              item={selectedItem}
              locations={state.locations}
              preferredLocation={preferences.locationId}
              busy={busy}
              onClose={() => setScreen(null)}
              onSave={(input, id, photo) =>
                run((repo) => repo.saveItem(input, id, photo))
              }
              onDelete={deleteFood}
            />
          )}
          {screen?.kind === "delete" && selectedItem && (
            <Sheet title="Delete food" onClose={close}>
              <Confirm
                message={`Delete “${selectedItem.name}”? This cannot be undone.`}
                action="Delete"
                onCancel={close}
                onConfirm={() => void deleteFood(selectedItem.id)}
                busy={busy}
              />
            </Sheet>
          )}
          {screen?.kind === "use" && selectedItem && (
            <UseFood
              item={selectedItem}
              busy={busy}
              onClose={() => setScreen(null)}
              onUse={(amount) =>
                run((repo) => repo.adjustItem(selectedItem.id, -amount))
              }
            />
          )}
          {screen?.kind === "filters" && (
            <Filters
              preferences={preferences}
              busy={busy}
              onSave={savePreferences}
              onClose={close}
            />
          )}
          {screen?.kind === "freezers" && (
            <FreezerPicker
              locations={state.locations}
              items={state.items}
              selected={preferences.locationId}
              busy={busy}
              onSelect={(id) => savePreferences({ locationId: id })}
              onClose={close}
            />
          )}
          {screen?.kind === "locations" && (
            <Locations
              locations={state.locations}
              items={state.items}
              busy={busy}
              onClose={close}
              onSave={(name, id) => run((repo) => repo.saveLocation(name, id))}
              onDelete={(id, destination) =>
                run((repo) => repo.deleteLocation(id, destination))
              }
            />
          )}
          {screen?.kind === "settings" && (
            <Settings
              theme={preferences.theme}
              busy={busy}
              onTheme={(theme) => void savePreferences({ theme })}
              onLocations={() => navigate({ kind: "locations" })}
              onPrivacyPolicy={() => navigate({ kind: "privacy" })}
              openAdPrivacyChoices={openAdPrivacyChoices}
              removeAds={removeAds}
              onClose={close}
            />
          )}
          {screen?.kind === "privacy" && (
            <PrivacyPolicy onClose={() => navigate({ kind: "settings" })} />
          )}
        </SafeAreaView>
      </SaveNotice.Provider>
    </Palette.Provider>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  title: { fontSize: 25, fontWeight: "600", letterSpacing: -0.5 },
  toolbar: { paddingHorizontal: 16, gap: 10, paddingBottom: 12 },
  freezer: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  search: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 },
  empty: { paddingVertical: 48, alignItems: "center", gap: 14 },
  footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  loading: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
    gap: 20,
    alignItems: "center",
  },
});
