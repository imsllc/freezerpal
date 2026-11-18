import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { requireOptionalNativeModule } from "expo";
import Storage from "expo-sqlite/kv-store";
import { createRemoveAdsBilling, type RemoveAdsControls } from "../core/removeAdsBilling";

const billing = createRemoveAdsBilling(() => import("expo-iap"), Storage);
const supported = requireOptionalNativeModule("ExpoIap") !== null;

export function useRemoveAds(): RemoveAdsControls | undefined {
  const state = useSyncExternalStore(billing.subscribe, billing.getState);
  useEffect(() => {
    if (!supported) return;
    void billing.refresh();
    const listener = AppState.addEventListener("change", (next) => {
      if (next === "active") void billing.refresh();
    });
    return () => listener.remove();
  }, []);
  return supported ? { ...state, buy: billing.buy, restore: billing.restore } : undefined;
}
