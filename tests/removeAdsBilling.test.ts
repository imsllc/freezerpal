import { test } from "node:test";
import assert from "node:assert/strict";
import type { Purchase } from "expo-iap";
import { createRemoveAdsBilling, REMOVE_ADS_PRODUCT } from "../src/core/removeAdsBilling";

type LoadStore = Parameters<typeof createRemoveAdsBilling>[0];
type Store = Awaited<ReturnType<LoadStore>>;

function fixture(initialCache: string | null = null) {
  let cached = initialCache;
  let onPurchase: (purchase: Purchase) => void = () => undefined;
  const play = { available: [] as Purchase[], offline: false, listed: true };
  const acknowledgments: boolean[] = [];
  const checkout: string[] = [];
  const store = {
    async initConnection() { return true; },
    async getAvailablePurchases() {
      if (play.offline) throw new Error("Google Play offline");
      return play.available;
    },
    async fetchProducts() {
      return play.listed ? [{ id: REMOVE_ADS_PRODUCT, displayPrice: "$2.99" }] : [];
    },
    async requestPurchase(request: { request: { google: { skus: string[] } } }) {
      checkout.push(...request.request.google.skus);
      return null;
    },
    async finishTransaction({ isConsumable }: { isConsumable: boolean }) {
      acknowledgments.push(isConsumable);
    },
    purchaseUpdatedListener(listener: typeof onPurchase) { onPurchase = listener; },
    purchaseErrorListener() {},
  } as unknown as Store;

  const billing = createRemoveAdsBilling(async () => store, {
    async getItem() { return cached; },
    async setItem(_key, value) { cached = value; },
  });

  async function emit(purchaseState: "pending" | "purchased") {
    onPurchase({ productId: REMOVE_ADS_PRODUCT, purchaseState, purchaseToken: "test-token" } as Purchase);
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  return { billing, play, checkout, acknowledgments, emit, getCached: () => cached };
}

test("Remove ads checks out once and unlocks only after Google Play confirms payment", async () => {
  const { billing, checkout, acknowledgments, emit, getCached } = fixture();
  await billing.refresh();
  assert.equal(billing.getState().price, "$2.99");
  await Promise.all([billing.buy(), billing.buy()]);
  assert.deepEqual(checkout, [REMOVE_ADS_PRODUCT]);

  await emit("pending");
  assert.equal(billing.getState().owned, false);
  assert.match(billing.getState().message, /pending/);
  assert.deepEqual(acknowledgments, []);

  await emit("purchased");
  await emit("purchased");
  assert.equal(billing.getState().owned, true);
  assert.equal(billing.getState().busy, false);
  assert.equal(getCached(), "owned");
  assert.deepEqual(acknowledgments, [false]);
});

test("an offline ownership check keeps the cached unlock and a successful empty check clears it", async () => {
  const { billing, play, getCached } = fixture("owned");
  play.offline = true;
  await billing.refresh();
  assert.equal(billing.getState().owned, true);
  assert.equal(getCached(), "owned");

  play.offline = false;
  await billing.refresh();
  assert.equal(billing.getState().owned, false);
  assert.equal(getCached(), "not-owned");
});

test("a missing catalog listing blocks checkout but does not block restoring ownership", async () => {
  const { billing, checkout, play, acknowledgments } = fixture();
  play.listed = false;
  await billing.buy();
  assert.deepEqual(checkout, []);
  assert.match(billing.getState().message, /unavailable/);

  play.available = [{
    productId: REMOVE_ADS_PRODUCT,
    purchaseState: "purchased",
    purchaseToken: "restored-token",
    isAcknowledgedAndroid: true,
  } as Purchase];
  await billing.restore();
  assert.equal(billing.getState().owned, true);
  assert.deepEqual(acknowledgments, []);
});
