import type { ReactNode } from "react";

export const useInventoryAds: (enabled: boolean) => {
  banner: ReactNode;
  openAdPrivacyChoices?: () => Promise<void>;
} = () => ({ banner: null });
