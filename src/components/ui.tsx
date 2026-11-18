import React, { createContext, useContext } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { themes, type Colors } from "../theme";
import { Icon, type IconName } from "./Icon";

export const Palette = createContext<Colors>(themes.light);
export const SaveNotice = createContext<{ error: string; clear: () => void }>({
  error: "",
  clear: () => undefined,
});
export const usePalette = () => useContext(Palette);
export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  active = false,
  danger = false,
  compact = false,
  color,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
  compact?: boolean;
  color?: string;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={compact ? 4 : undefined}
      style={({ pressed }) => ({
        width: compact ? 40 : 48,
        height: compact ? 40 : 48,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? c.soft : pressed ? c.tag : "transparent",
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Icon
        name={icon}
        color={color ?? (danger ? c.danger : active ? c.accent : c.muted)}
        size={compact ? 20 : 22}
      />
      {active && (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: c.accent,
          }}
        />
      )}
    </Pressable>
  );
}
export function ErrorNotice() {
  const c = usePalette();
  const { error, clear } = useContext(SaveNotice);
  if (!error) return null;
  return (
    <View
      style={{
        padding: 14,
        gap: 10,
        borderRadius: 12,
        backgroundColor: c.dangerBg,
      }}
    >
      <Hint error>
        {error} Changes that failed to save have not been applied.
      </Hint>
      <Button title="Dismiss" onPress={clear} />
    </View>
  );
}
export function Button({
  title,
  onPress,
  primary = false,
  neutral = false,
  danger = false,
  disabled = false,
  label,
}: {
  title: string;
  onPress: () => void;
  primary?: boolean;
  neutral?: boolean;
  danger?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: danger
            ? c.dangerBg
            : neutral
              ? c.tag
              : primary
                ? c.accentFill
                : c.soft,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: danger ? c.danger : primary && !neutral ? c.onAccent : c.ink,
          fontSize: 15,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Heading({ children }: { children: React.ReactNode }) {
  const c = usePalette();
  return <Text style={[s.heading, { color: c.ink }]}>{children}</Text>;
}
export function Hint({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  const c = usePalette();
  return (
    <Text
      accessibilityRole={error ? "alert" : undefined}
      style={{
        color: error ? c.danger : c.muted,
        fontSize: 14,
        lineHeight: 21,
      }}
    >
      {children}
    </Text>
  );
}
export function Field({
  label,
  hint,
  trailing,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  trailing?: React.ReactNode;
}) {
  const c = usePalette();
  const input = (
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={c.muted}
      {...props}
      style={[
        s.input,
        { color: c.ink, borderColor: c.line, backgroundColor: c.surface },
        props.multiline && { minHeight: 100, textAlignVertical: "top" },
        trailing ? { flex: 1, minWidth: 0 } : null,
        props.style,
      ]}
    />
  );
  return (
    <View style={s.field}>
      <Text style={{ color: c.ink, fontSize: 14, fontWeight: "700" }}>
        {label}
      </Text>
      {trailing ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {input}
          {trailing}
        </View>
      ) : (
        input
      )}
      {hint && <Hint>{hint}</Hint>}
    </View>
  );
}
export function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const c = usePalette();
  return (
    <View style={s.field}>
      <Text style={{ color: c.ink, fontSize: 14, fontWeight: "700" }}>
        {label}
      </Text>
      <View style={s.wrap}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{ checked: value === option.value, disabled }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              s.chip,
              {
                borderColor: value === option.value ? c.accent : c.line,
                backgroundColor: value === option.value ? c.soft : c.surface,
                opacity: pressed || disabled ? 0.6 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: value === option.value ? c.accent : c.muted,
                fontSize: 14,
                fontWeight: value === option.value ? "700" : "500",
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Confirm({
  message,
  action,
  onConfirm,
  onCancel,
  busy = false,
}: {
  message: string;
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const c = usePalette();
  return (
    <View
      style={[
        s.confirm,
        { backgroundColor: c.dangerBg, borderColor: c.danger },
      ]}
    >
      <Text
        accessibilityRole="alert"
        style={{ color: c.ink, fontSize: 15, lineHeight: 23 }}
      >
        {message}
      </Text>
      <View style={s.row}>
        <Button title="Cancel" onPress={onCancel} disabled={busy} neutral />
        <Button title={action} onPress={onConfirm} danger disabled={busy} />
      </View>
    </View>
  );
}
export function Sheet({
  title,
  onClose,
  children,
  scrollRef,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  scrollRef?: React.Ref<ScrollView>;
}) {
  const c = usePalette();
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.select({ ios: "padding", android: "height" })
          }
        >
          <View style={[s.sheetHeader, { borderBottomColor: c.line }]}>
            <Text
              accessibilityRole="header"
              style={{ color: c.ink, fontSize: 22, fontWeight: "800", flex: 1 }}
            >
              {title}
            </Text>
            <Button title="Close" onPress={onClose} />
          </View>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.sheetBody}
          >
            <ErrorNotice />
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export const s = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { fontSize: 18, fontWeight: "800", marginTop: 12, marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  field: { gap: 8, marginVertical: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    minHeight: 50,
    fontSize: 16,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
    borderRadius: 12,
    justifyContent: "center",
  },
  sheetHeader: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 18,
    borderBottomWidth: 1,
  },
  sheetBody: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 44,
    gap: 12,
  },
  confirm: { borderWidth: 1, padding: 16, gap: 12, borderRadius: 14 },
});
