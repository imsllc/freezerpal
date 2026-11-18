# FreezerPal: Freezer Inventory

An offline-first React Native / Expo / TypeScript household freezer inventory app.

- **Project:** `C:\source\freezerpal`
- **Android package / iOS bundle ID:** `com.freezerpal.app`
- **Display name:** `FreezerPal: Freezer Inventory`

## Run locally

Use Node.js 24 LTS and npm:

```powershell
cd C:\source\freezerpal
npm install
npm start
```

Open with a compatible Expo Go client (SDK 57), or use `npm run android` with Android Studio, its SDK and a connected emulator/device for a local development build. `npm run ios` requires macOS and Xcode. If your Expo Go client uses a different SDK, use the local development build.

`npm run web` opens a browser preview. Native Android/iOS are the primary targets. The preview also uses SQLite; Metro is configured to send the COOP/COEP headers needed by its web worker. An exported web build requires the same headers on its web server (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`) and HTTPS or localhost. A browser clearing its site data removes preview inventory.

For a local Android debug APK on Windows, run `npm run build:android`. The script discovers the standard Android Studio JDK and SDK paths. Override `JAVA_HOME` and `ANDROID_HOME` if needed. Start Metro before opening `android/app/build/outputs/apk/debug/app-debug.apk`.

## Android release

Use JDK 17 for the release build. Set `JAVA_HOME` to that installation if Android Studio supplies a newer bundled JDK.

Before each new Google Play upload, set `expo.android.versionCode` in `app.json` above the highest code already uploaded for `com.freezerpal.app`, including testing tracks. Update `expo.version` for a new user-facing version and keep the npm package version in sync. Pass the highest uploaded version code to the release build. This example assumes the highest uploaded code is 3.

```powershell
npm run build:android:release -- -LastUploadedVersionCode 3
```

For local verification, you can omit `-LastUploadedVersionCode`. Expo prebuild applies `scripts/with-android-release.cjs`, which enables R8 and resource shrinking. The script checks the R8 mapping and DEX inside the unsigned `android/app/build/outputs/bundle/release/app-release.aab`. Sign the bundle locally with the existing Play upload key before uploading. Keep the signed bundle and `android/app/build/outputs/mapping/release/mapping.txt` for each release in private release storage.

Confirm the AdMob Android app ID in `app.json` and the banner ad unit ID in `src/components/InventoryAds.android.tsx` against the AdMob app for this package. Publish the applicable consent messages and use a registered AdMob test device to check first-launch consent, ad privacy choices, and banner behavior on the release build.

Use the public [FreezerPal privacy policy](https://imediasystemsllc.com/freezer-pal-privacy-policy.html) in the Google Play privacy policy declaration. Settings links to the public page and includes an offline copy. Update both copies when updating the policy. Review the Play Ads, Advertising ID, and Data safety declarations against the shipped SDKs. [Google Mobile Ads data disclosure](https://developers.google.com/admob/android/privacy/play-data-disclosure)

Install the signed release from a Play internal testing track to smoke-test startup, upgrading existing inventory, camera and photo selection, and the `remove_ads` checkout and Restore purchases flow after reinstalling with a license tester.

## Phase 1 features

- Add, edit, and confirm deletion of food with quantity, unit, category, freezer, editable date added, optional best-before date and notes.
- Date-added and best-before fields open an inline calendar with month/year navigation and a Today shortcut. Input dates display as MM/DD/YYYY; best-before can be cleared. Calendar dates are stored as local calendar-day strings, without timezone conversion.
- Dates can also be typed or pasted. Slashes are added after the month and day; incomplete or impossible dates prevent saving. The calendar icon remains available beside each field.
- Dairy is available in the food form and category filter, with a flat blue-and-white milk-carton icon.
- Tap the gray camera box below Quantity to take a photo or choose one from the device. The photo previews on the form and replaces the category icon in the square list thumbnail after saving. You can replace or remove it from the same menu. Photos stay on the device.
- Decimal quantities to three places, custom amounts used by tapping a card's quantity, confirmed depletion, and restocking through the depleted inventory filter or item editor.
- Multiple freezers with creation, rename, item movement, and atomic deletion that moves all entries to a chosen destination. At least one freezer is retained.
- Name search, freezer/category/date/stock filters, sorting by name/quantity/date added/best-before in either direction. Selections and theme preferences persist.
- Local calendar-day indicators for past dates and the next seven days, refreshed every 30 seconds or when the app resumes. Undated food sorts last in either direction.
- System, light and dark appearance, safe-area layouts, keyboard-aware forms, accessible labeled controls, and useful empty/error states.
- Compact inventory cards with category icons, pencil/trash actions, gray date tags (`3 days - 11-12-2026` or `No date`), and whole-card expiration highlighting. Cards have no freezer labels or +/- buttons. The top freezer/count selector shows only the selected freezer's items; the filter icon sits beside search. Tap the quantity to enter an amount used. Legacy "All freezers" selections fall back to an existing freezer; deleting the selected freezer switches to the destination chosen for its food.
- SQLite persistence with stable UUIDs, foreign keys, schema versioning, indexes, serialized writes, transactions, and rollback on failure. Failed updates stay unapplied; errors are visible inside forms as well as inventory.

## Architecture and reference projects

Reviewed `C:\source\compass-app`, `C:\source\thermo-sudoku`, and `C:\source\app-for-cats` without modifying them. This project uses Expo SDK 57 / React 19 / React Native 0.86 from the newer apps, strict TypeScript, `src` organization, shared light/dark colors, `react-native-safe-area-context`, Expo StatusBar/SystemUI, and the Sudoku apps' simple native-modal navigation rather than adding a navigation library for a single primary screen. Android native projects are generated by Expo prebuild and ignored in Git.

The data layer uses `expo-sqlite`, following the [official SQLite API](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/). Unlike the reference apps' small AsyncStorage state, structured inventory benefits from relational constraints and atomic freezer moves. `expo-crypto` supplies stable random UUIDs. Inventory features work offline and without an account. The native Android build uses Google AdMob for a banner on the inventory screen. Debug builds request Google test ads. Ads require the native SDK and an internet connection.

On Android, Settings offers permanent ad removal and purchase restoration through Google Play. In Play Console, create and activate the one-time product `remove_ads` for `com.freezerpal.app` with a permanent Buy option priced at USD $2.99 in the US. The app displays the price returned by Google Play. Test checkout from an internal testing build with a Play license tester.

- `src/core/model.ts`: types, validation, quantity math, date rules, filtering/sorting.
- `src/data/repository.ts`: SQL schema/migration and data-access boundary. Every mutation and its resulting snapshot are part of one transaction.
- `src/data/database.ts`: platform database initialization and UUID generation.
- `src/hooks/useInventory.ts`: hydration, errors, save state, and foreground date refresh.
- `src/components/ui.tsx`: shared controls, sheets, confirmations, and theme context.
- `src/screens`: focused forms for food, usage, filters, locations, and appearance.
- `App.tsx`: inventory list and native-modal navigation.

Inventory is updated as soon as SQLite commits. Initial load failures never reset or overwrite saved data. Schema version 2 adds a separate photo table and upgrades existing version 1 inventory in place. Photos are resized locally with [Expo ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/) and saved alongside the item in the same transaction. Inventory queries load only the photo ID; cards fetch the image as needed. Deleting food deletes its saved photo. A newer unknown schema is refused. All SQL values are bound parameters.

The app uses the [Expo system image picker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/) for camera and library access. Rebuild an installed development APK to include the new native modules and camera permission. On web, the browser controls whether Take photo opens a camera or a file chooser. Microphone permission is disabled.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build:web
npx expo export --platform android --output-dir dist-android
npx expo install --check
```

The tests use Node's SQLite engine against the actual repository SQL, including a close/reopen persistence test, concurrent adjustment test, and injected write failure / transaction rollback. Node 24 is required for `node:sqlite`. These tests complement device testing; they do not emulate the Expo native bridge.

Implementation verification: TypeScript and ESLint pass, all 19 tests pass, and web export, Android Hermes bytecode export, and Android prebuild pass. Tests cover upgrading an existing database, photo persistence across reopen, replacement, removal, and rollback after a failed save. A full Gradle APK build and physical-device camera testing were not performed.

The launcher icon and web favicon use `app_icon.jpg`. Run `npm run icons` to regenerate the standard icon, Android adaptive color and monochrome layers, and the preview at `.build-temp/icon-preview.png`. Rebuild the native app to update the installed launcher icon.

Food category icons use the bundled Microsoft [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) Flat SVG assets (MIT license): solid colors with no gradients or 3D effects. The original SVG files live in `assets/food`; `src/data/foodIcons.json` bundles their XML for `react-native-svg`, keeping the icons sharp across platforms and available offline. The Microsoft MIT notice is included in the icon data and in `assets/food/LICENSE.txt`. Action icons remain vector controls, with blue edit and red delete actions.

## Not included / remaining validation

CSV/JSON export/import, backup/restore, sharing, barcode scanning, notifications, and standalone analytics remain out of scope. Inventory and saved photos remain on the device and are removed when the app is uninstalled or its storage is cleared.

Store signing, account configuration and publishing are not part of this project. No user accounts were accessed. Physical-device UI testing, Android keyboard/back-button behavior, and iOS testing remain necessary before release. The in-app browser could not connect to the local development server in this environment, and the local browser automation tool could not open Edge, so visual UI validation was not completed.

