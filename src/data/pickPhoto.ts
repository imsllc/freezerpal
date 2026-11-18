import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { validatePhoto } from "../core/photo";

export async function pickFoodPhoto(
  source: "camera" | "library",
): Promise<string | null> {
  if (source === "camera" && Platform.OS !== "web") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Allow camera access in your device settings or choose a photo instead.",
      );
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    cameraType: ImagePicker.CameraType.back,
  };
  // On web the picker is opened directly from the button press, before awaiting anything.
  const result = await (source === "camera"
    ? ImagePicker.launchCameraAsync(options)
    : ImagePicker.launchImageLibraryAsync(options));
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    try {
      if (Math.max(asset.width, asset.height) > 640)
        context.resize(
          asset.width >= asset.height ? { width: 640 } : { height: 640 },
        );
      const image = await context.renderAsync();
      try {
        const saved = await image.saveAsync({
          format: SaveFormat.JPEG,
          compress: 0.76,
          base64: true,
        });
        if (Platform.OS === "web" && saved.uri.startsWith("blob:"))
          URL.revokeObjectURL(saved.uri);
        return validatePhoto(`data:image/jpeg;base64,${saved.base64 ?? ""}`);
      } finally {
        image.release();
      }
    } finally {
      context.release();
    }
  } finally {
    if (Platform.OS === "web" && asset.uri.startsWith("blob:"))
      URL.revokeObjectURL(asset.uri);
  }
}
