import React, { useEffect, useState } from "react";
import { TurboModuleRegistry, View } from "react-native";
import type { AdsConsentInfo } from "react-native-google-mobile-ads";
import { usePalette } from "./ui";

type AdsSdk = typeof import("react-native-google-mobile-ads");

export function useInventoryAds(enabled: boolean) {
  const [sdk, setSdk] = useState<AdsSdk>();
  const [consent, setConsent] = useState<AdsConsentInfo>();
  const [initialized, setInitialized] = useState(false);
  const [showingPrivacyOptions, setShowingPrivacyOptions] = useState(false);

  useEffect(() => {
    if (!enabled || sdk || !TurboModuleRegistry.get("RNGoogleMobileAdsModule")) return;

    let active = true;
    void import("react-native-google-mobile-ads")
      .then(async (ads) => {
        const info = await ads.AdsConsent.gatherConsent().catch((error) => {
          if (__DEV__) console.info("AdMob consent update:", error);
          return ads.AdsConsent.getConsentInfo();
        });
        if (active) {
          setSdk(ads);
          setConsent(info);
        }
      })
      .catch((error) => {
        if (__DEV__) console.info("AdMob unavailable:", error);
      });
    return () => {
      active = false;
    };
  }, [enabled, sdk]);

  const canRequestAds = consent?.canRequestAds === true;
  useEffect(() => {
    if (!enabled || !sdk || !canRequestAds || initialized) return;

    let active = true;
    void sdk.default().initialize()
      .then(() => {
        if (active) setInitialized(true);
      })
      .catch((error) => {
        if (__DEV__) console.info("AdMob initialization:", error);
      });
    return () => {
      active = false;
    };
  }, [enabled, sdk, canRequestAds, initialized]);

  const openAdPrivacyChoices = sdk && consent?.privacyOptionsRequirementStatus ===
    sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
      ? async () => {
          setShowingPrivacyOptions(true);
          try {
            setConsent(await sdk.AdsConsent.showPrivacyOptionsForm());
          } finally {
            setShowingPrivacyOptions(false);
          }
        }
      : undefined;

  return {
    banner: enabled && sdk && canRequestAds && initialized && !showingPrivacyOptions
      ? <InventoryBanner sdk={sdk} />
      : null,
    openAdPrivacyChoices,
  };
}

function InventoryBanner({ sdk }: { sdk: AdsSdk }) {
  const c = usePalette();
  const [width, setWidth] = useState(0);
  const [loadedWidth, setLoadedWidth] = useState(0);
  const loaded = width > 0 && loadedWidth === width;
  const { BannerAd, BannerAdSize, TestIds } = sdk;

  return (
    <View
      onLayout={(event) => setWidth(Math.floor(event.nativeEvent.layout.width))}
      style={{
        alignItems: "center",
        borderTopColor: c.line,
        borderTopWidth: loaded ? 1 : 0,
        paddingTop: loaded ? 12 : 0,
      }}
    >
      {width > 0 && (
        <BannerAd
          key={width}
          unitId={__DEV__ ? TestIds.ADAPTIVE_BANNER : "ca-app-pub-6230290323057717/7211368969"}
          size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
          width={width}
          onAdLoaded={() => setLoadedWidth(width)}
          onAdFailedToLoad={(error) => {
            if (__DEV__) console.info("AdMob banner:", error);
          }}
        />
      )}
    </View>
  );
}
