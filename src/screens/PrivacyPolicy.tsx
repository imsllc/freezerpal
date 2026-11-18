import React, { useState } from "react";
import { Linking, View } from "react-native";
import { Button, Heading, Hint, Sheet } from "../components/ui";

const policyUrl = "https://imediasystemsllc.com/freezer-pal-privacy-policy.html";

// Keep this offline copy in sync with freezer-pal-privacy-policy.html.
const sections = [
  {
    title: "Information stored on your device",
    paragraphs: [
      "FreezerPal stores the inventory you enter, including freezer names, food names, quantities, units, categories, dates, notes, and optional photos. It also saves preferences such as your selected freezer, filters, sorting, and appearance. The app uses this information to organize and display your inventory and remember your choices.",
      "Your inventory, photos, and settings are stored in a local app database. FreezerPal does not require an account, upload or sync this data to our servers, or share it with third parties.",
    ],
  },
  {
    title: "Advertising",
    paragraphs: [
      "The Android app uses Google AdMob to display banner ads. The Google Mobile Ads SDK can collect and share IP addresses, device or account identifiers, app interactions, and diagnostic information for advertising, measurement, and fraud prevention. FreezerPal does not send your inventory, notes, or food photos to AdMob.",
      "When available, use Ad privacy choices in Settings to review or change your choices.",
    ],
  },
  {
    title: "In-app purchases",
    paragraphs: [
      "Google Play processes the optional one-time purchase to remove ads. FreezerPal receives the product ID, purchase status, and purchase token to confirm and restore the purchase. Google handles your payment details. FreezerPal stores your ad-removal status on your device so it can work offline.",
    ],
  },
  {
    title: "Camera and photos",
    paragraphs: [
      "Adding a photo is optional. If you choose to take a photo, FreezerPal requests camera access where required. If you choose an existing photo, the app uses your device’s photo picker to access the image you select. FreezerPal processes the image on your device and saves a copy with the inventory item.",
      "You can use the app without adding photos and manage permissions in your device settings.",
    ],
  },
  {
    title: "Storage and deletion",
    paragraphs: [
      "FreezerPal keeps your data in the app’s local storage, where access is governed by your device’s security controls. The data stays there until you remove it or clear the app’s data.",
      "You can edit or delete inventory items in FreezerPal. You can remove an attached photo separately, and deleting an item removes its saved photo from the inventory. The original image in your photo library is managed separately.",
      "To remove all locally stored app data, clear FreezerPal’s storage in your Android settings or delete the app from your device. If you use FreezerPal in a browser, clear the site’s data.",
    ],
  },
  {
    title: "When you email us",
    paragraphs: [
      "If you contact us by email, we receive your email address, message, and any attachments you include. We use that information to respond to your request. Our email provider processes the correspondence to deliver and store it.",
      "We keep correspondence as needed to handle your request or meet legal obligations. You can email us to ask for deletion of your correspondence.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "For privacy questions or requests, contact Integrated Media Systems, LLC at integratedmediasystemsllc@gmail.com.",
    ],
  },
];

export function PrivacyPolicy({ onClose }: { onClose: () => void }) {
  const [linkError, setLinkError] = useState(false);

  return (
    <Sheet title="Privacy policy" onClose={onClose}>
      <Hint>FreezerPal: Freezer Inventory</Hint>
      <Hint>Effective November 12, 2026</Hint>
      <Hint>Integrated Media Systems, LLC develops FreezerPal. This policy explains how the app handles your information and what happens when you email us.</Hint>
      {sections.map(({ title, paragraphs }) => (
        <View key={title} style={{ gap: 8 }}>
          <Heading>{title}</Heading>
          {paragraphs.map((paragraph) => <Hint key={paragraph}>{paragraph}</Hint>)}
        </View>
      ))}
      <Button
        title="View policy online"
        onPress={() => {
          setLinkError(false);
          void Linking.openURL(policyUrl).catch(() => setLinkError(true));
        }}
      />
      {linkError && <Hint error>The online policy could not be opened.</Hint>}
    </Sheet>
  );
}
