const { withAndroidManifest, withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");

module.exports = function withAndroidRelease(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const features = (manifest["uses-feature"] ??= []);
    // Camera capture is optional. These declarations override Play's implicit hardware filters.
    for (const name of ["android.hardware.camera", "android.hardware.camera.autofocus"]) {
      const feature = features.find((item) => item.$["android:name"] === name);
      if (feature) {
        feature.$["android:required"] = "false";
      } else {
        features.push({ $: { "android:name": name, "android:required": "false" } });
      }
    }
    return config;
  });

  config = withGradleProperties(config, (config) => {
    const releaseProperties = {
      "android.enableMinifyInReleaseBuilds": "true",
      "android.enableShrinkResourcesInReleaseBuilds": "true",
      "android.r8.optimizedResourceShrinking": "true",
    };
    config.modResults = config.modResults.filter(
      (item) => item.type !== "property" || !Object.hasOwn(releaseProperties, item.key),
    );
    for (const [key, value] of Object.entries(releaseProperties)) {
      config.modResults.push({ type: "property", key, value });
    }
    return config;
  });

  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (!gradle.includes('getDefaultProguardFile("proguard-android-optimize.txt")')) {
      const defaultRules = 'getDefaultProguardFile("proguard-android.txt")';
      if (!gradle.includes(defaultRules)) {
        throw new Error("Review the Expo Android template's release optimization settings.");
      }
      gradle = gradle.replace(
        defaultRules,
        'getDefaultProguardFile("proguard-android-optimize.txt")',
      );
    }
    // Expo's template debug-signs release builds by default. The Play bundle is signed separately.
    const releaseBlock = /^([ \t]+)(release \{\r?\n)([\s\S]*?)^\1\}/m;
    if (!releaseBlock.test(gradle)) {
      throw new Error("Review the Expo Android template's release signing settings.");
    }
    config.modResults.contents = gradle.replace(
      releaseBlock,
      (_block, indent, start, body) =>
        indent + start + body.replace(/^[ \t]*signingConfig = signingConfigs\.debug[ \t]*\r?\n/m, "") + indent + "}",
    );
    return config;
  });
};
