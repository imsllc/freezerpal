import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { pickFoodPhoto } from "../data/pickPhoto";
import { useFoodPhoto } from "../hooks/useFoodPhoto";
import { Icon } from "./Icon";
import { Button, Hint, s, usePalette } from "./ui";

export function PhotoField({
  photoId,
  draft,
  disabled,
  onChange,
  onBusyChange,
}: {
  photoId: string | null;
  draft: string | null | undefined;
  disabled: boolean;
  onChange: (photo: string | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const c = usePalette();
  const savedPhoto = useFoodPhoto(draft === undefined ? photoId : null);
  const uri = draft === undefined ? savedPhoto : draft;
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const pickingRef = useRef(false);
  const [error, setError] = useState("");
  const [failedUri, setFailedUri] = useState<string>();
  const hasPhoto = Boolean(uri || (draft === undefined && photoId));

  async function pick(source: "camera" | "library") {
    if (pickingRef.current || disabled) return;
    pickingRef.current = true;
    setOpen(false);
    setError("");
    setPicking(true);
    onBusyChange(true);
    try {
      const photo = await pickFoodPhoto(source);
      if (photo) {
        setFailedUri(undefined);
        onChange(photo);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open the photo. Try another image.",
      );
    } finally {
      pickingRef.current = false;
      setPicking(false);
      onBusyChange(false);
    }
  }

  return (
    <View style={s.field}>
      <Text style={{ color: c.ink, fontSize: 14, fontWeight: "700" }}>
        Photo
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasPhoto ? "Change food photo" : "Add food photo"}
        accessibilityState={{ expanded: open, disabled: disabled || picking }}
        disabled={disabled || picking}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(!open);
        }}
        style={({ pressed }) => [
          styles.preview,
          {
            backgroundColor: c.tag,
            borderColor: c.line,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {picking ? (
          <ActivityIndicator color={c.accent} />
        ) : uri && failedUri !== uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setFailedUri(uri)}
          />
        ) : (
          <Icon name="camera" color={c.muted} size={30} />
        )}
      </Pressable>
      {open && (
        <View
          style={[
            styles.menu,
            { backgroundColor: c.surface, borderColor: c.line },
          ]}
        >
          <View style={s.row}>
            <Button
              title="Take photo"
              disabled={disabled}
              onPress={() => void pick("camera")}
            />
            <Button
              title="Choose photo"
              disabled={disabled}
              onPress={() => void pick("library")}
            />
            {hasPhoto && (
              <Button
                title="Remove photo"
                danger
                disabled={disabled}
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                  setError("");
                }}
              />
            )}
            <Button title="Cancel" onPress={() => setOpen(false)} neutral />
          </View>
        </View>
      )}
      {error !== "" && <Hint error>{error}</Hint>}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: 128,
    height: 128,
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  menu: { borderWidth: 1, borderRadius: 12, padding: 10 },
});
