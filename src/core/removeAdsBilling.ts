import type { Purchase } from "expo-iap";

export const REMOVE_ADS_PRODUCT = "remove_ads";
const CACHE_KEY = "freezerpal.remove-ads";

type Store = Pick<typeof import("expo-iap"),
  "initConnection" | "getAvailablePurchases" | "fetchProducts" | "requestPurchase" |
  "finishTransaction" | "purchaseUpdatedListener" | "purchaseErrorListener"
>;
type Cache = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
type State = { loaded: boolean; owned: boolean; busy: boolean; price?: string; message: string };
export type RemoveAdsControls = State & { buy(): Promise<void>; restore(): Promise<void> };

export function createRemoveAdsBilling(loadStore: () => Promise<Store>, cache: Cache) {
  let state: State = { loaded: false, owned: false, busy: false, message: "" };
  const subscribers = new Set<() => void>();
  const acknowledged = new Set<string>();
  let work = Promise.resolve();
  let cacheRead: Promise<void> | undefined;
  let connection: Promise<Store> | undefined;
  let listening = false;

  function update(patch: Partial<State>) {
    state = { ...state, ...patch };
    for (const subscriber of subscribers) subscriber();
  }

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = work.then(operation);
    work = result.then(() => undefined, () => undefined);
    return result;
  }

  function hydrate() {
    cacheRead ??= cache.getItem(CACHE_KEY).then(
      (value) => update({ loaded: true, owned: value === "owned" }),
      () => update({ loaded: true }),
    );
    return cacheRead;
  }

  async function remember(owned: boolean) {
    update({ owned });
    await cache.setItem(CACHE_KEY, owned ? "owned" : "not-owned").catch(() => undefined);
  }

  async function accept(store: Store, purchase: Purchase) {
    if (purchase.purchaseState !== "purchased" || !purchase.purchaseToken) {
      return purchase.purchaseState === "pending" ? "pending" : "none";
    }

    // Unlock confirmed purchases immediately, then acknowledge without consuming them.
    await remember(true);
    const token = purchase.purchaseToken;
    if (!("isAcknowledgedAndroid" in purchase && purchase.isAcknowledgedAndroid) && !acknowledged.has(token)) {
      await store.finishTransaction({ purchase, isConsumable: false });
      acknowledged.add(token);
    }
    return "owned";
  }

  async function reconcile(store: Store) {
    const purchases = (await store.getAvailablePurchases()).filter(
      (purchase) => purchase.productId === REMOVE_ADS_PRODUCT,
    );
    const completed = purchases.find((purchase) => purchase.purchaseState === "purchased" && purchase.purchaseToken);
    if (completed) return accept(store, completed);
    const pending = purchases.some((purchase) => purchase.purchaseState === "pending");
    await remember(false);
    return pending ? "pending" : "none";
  }

  async function refreshPrice(store: Store) {
    const products = await store.fetchProducts({ skus: [REMOVE_ADS_PRODUCT], type: "in-app" });
    const price = products?.find((product) => product.id === REMOVE_ADS_PRODUCT)?.displayPrice;
    update({ price });
    return price;
  }

  const pendingMessage = "Payment is pending. Ads are removed when Google Play confirms payment.";
  const confirmationError = "Google Play could not finish confirming the purchase. Try Restore purchases.";

  async function handleError(error: unknown, store?: Store) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === "already-owned" && store) {
      try {
        await hydrate();
        if (await reconcile(store) === "owned") {
          update({ busy: false, message: "Purchase restored. Ads are removed." });
          return;
        }
      } catch {
        update({ busy: false, message: confirmationError });
        return;
      }
    }
    update({ busy: false, message: code === "user-cancelled" ? "" : "Google Play could not complete the purchase. Try again." });
  }

  function connect() {
    connection ??= loadStore().then(async (store) => {
      if (!listening) {
        store.purchaseUpdatedListener((purchase) => {
          if (purchase.productId !== REMOVE_ADS_PRODUCT) return;
          void serialize(async () => {
            await hydrate();
            const result = await accept(store, purchase);
            update({ busy: false, message: result === "pending" ? pendingMessage : "" });
          }).catch(() => update({ busy: false, message: confirmationError }));
        });
        store.purchaseErrorListener((error) => {
          if (state.busy) void serialize(() => handleError(error, store));
        });
        listening = true;
      }
      if (!(await store.initConnection())) throw new Error("Google Play unavailable");
      return store;
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
    return connection;
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      subscribers.add(listener);
      return () => { subscribers.delete(listener); };
    },
    async refresh() {
      await hydrate();
      if (state.busy) return;
      await serialize(async () => {
        const store = await connect();
        const result = await reconcile(store);
        if (result === "pending") update({ message: pendingMessage });
        if (result === "owned" && state.message === pendingMessage) update({ message: "" });
        if (!state.owned) await refreshPrice(store);
      }).catch(() => undefined);
    },
    async buy() {
      if (state.busy || state.owned) return;
      update({ busy: true, message: "" });
      await serialize(async () => {
        await hydrate();
        const store = await connect();
        const result = await reconcile(store);
        if (result !== "none") {
          update({ busy: false, message: result === "pending" ? pendingMessage : "" });
          return;
        }
        if (!(await refreshPrice(store))) {
          update({ busy: false, message: "Remove ads is currently unavailable in Google Play." });
          return;
        }
        try {
          await store.requestPurchase({ type: "in-app", request: { google: { skus: [REMOVE_ADS_PRODUCT] } } });
        } catch (error) {
          await handleError(error, store);
        }
      }).catch(() => update({ busy: false, message: "Google Play is unavailable. Try again later." }));
    },
    async restore() {
      if (state.busy) return;
      update({ busy: true, message: "" });
      await serialize(async () => {
        await hydrate();
        const result = await reconcile(await connect());
        const message = result === "owned" ? "Purchase restored. Ads are removed."
          : result === "pending" ? pendingMessage : "No Remove ads purchase was found.";
        update({ busy: false, message });
      }).catch(() => update({ busy: false, message: "Could not restore purchases. Try again later." }));
    },
  };
}
