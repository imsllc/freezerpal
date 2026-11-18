import React, { useState } from "react";
import type { Preferences } from "../core/model";
import type { RemoveAdsControls } from "../core/removeAdsBilling";
import { Button, Choices, Heading, Hint, Sheet } from "../components/ui";

export function Settings({
  theme,
  busy,
  onTheme,
  onLocations,
  onPrivacyPolicy,
  openAdPrivacyChoices,
  removeAds,
  onClose,
}: {
  theme: Preferences["theme"];
  busy: boolean;
  onTheme: (theme: Preferences["theme"]) => void;
  onLocations: () => void;
  onPrivacyPolicy: () => void;
  openAdPrivacyChoices?: () => Promise<void>;
  removeAds?: RemoveAdsControls;
  onClose: () => void;
}) {
  const [openingPrivacyChoices, setOpeningPrivacyChoices] = useState(false);
  const [privacyError, setPrivacyError] = useState(false);

  return (
    <Sheet title="Settings" onClose={onClose}>
      <Choices
        label="Appearance"
        options={[
          { value: "system", label: "Use device setting" },
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        value={theme}
        onChange={onTheme}
        disabled={busy}
      />
      <Button title="Privacy policy" onPress={onPrivacyPolicy} />
      {openAdPrivacyChoices && (
        <>
          <Button
            title="Ad privacy choices"
            disabled={busy || openingPrivacyChoices}
            onPress={() => {
              setOpeningPrivacyChoices(true);
              setPrivacyError(false);
              void openAdPrivacyChoices()
                .catch(() => setPrivacyError(true))
                .finally(() => setOpeningPrivacyChoices(false));
            }}
          />
          {privacyError && (
            <Hint error>Ad privacy choices could not open. Please try again.</Hint>
          )}
        </>
      )}
      <Heading>Storage locations</Heading>
      <Button title="Manage freezers" onPress={onLocations} />
      {removeAds && (
        <>
          <Button
            title={removeAds.owned ? "Ads removed" : removeAds.price ? "Remove ads \u00b7 " + removeAds.price : "Remove ads"}
            disabled={removeAds.busy || removeAds.owned}
            onPress={() => void removeAds.buy()}
          />
          <Button
            title="Restore purchases"
            disabled={removeAds.busy}
            onPress={() => void removeAds.restore()}
          />
          {removeAds.message !== "" && <Hint>{removeAds.message}</Hint>}
        </>
      )}
    </Sheet>
  );
}
