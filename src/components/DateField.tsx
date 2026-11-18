import React, { useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  calendarDays,
  monthForDate,
  shiftMonth,
  formatDateInput,
  parseDateInput,
} from "../core/calendar";
import { displayDate, isDate, today } from "../core/model";
import { Hint, IconButton, usePalette } from "./ui";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DateField({
  label,
  value,
  onChange,
  optional = false,
  disabled = false,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  optional?: boolean;
  disabled?: boolean;
}) {
  const c = usePalette();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => monthForDate(value));
  const [choosingMonth, setChoosingMonth] = useState(false);
  const [touched, setTouched] = useState(false);
  const text = value && isDate(value) ? displayDate(value) : (value ?? "");
  const invalid = value ? !isDate(value) : !optional;
  const currentDate = today();
  function select(date: string | null) {
    onChange(date);
    setOpen(false);
    setChoosingMonth(false);
    setTouched(false);
  }
  return (
    <View style={styles.field}>
      <Text style={{ color: c.ink, fontSize: 14, fontWeight: "700" }}>
        {label}
      </Text>
      <View
        style={[
          styles.input,
          { backgroundColor: c.surface, borderColor: c.line },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          value={text}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={c.muted}
          editable={!disabled}
          keyboardType="number-pad"
          inputMode="numeric"
          autoCorrect={false}
          autoComplete="off"
          onFocus={() => setOpen(false)}
          onBlur={() => setTouched(true)}
          onChangeText={(input) => {
            const formatted = formatDateInput(input, text);
            onChange(
              formatted === ""
                ? optional
                  ? null
                  : ""
                : (parseDateInput(formatted) ?? formatted),
            );
          }}
          style={[styles.textInput, { color: c.ink }]}
        />
        <IconButton
          icon="calendar"
          label={`Open calendar for ${label}`}
          disabled={disabled}
          onPress={() => {
            Keyboard.dismiss();
            if (!open) {
              setCursor(monthForDate(value));
              setChoosingMonth(false);
            }
            setOpen(!open);
          }}
        />
        {optional && value && (
          <IconButton
            icon="close"
            label={`Clear ${label}`}
            compact
            disabled={disabled}
            onPress={() => select(null)}
          />
        )}
      </View>
      {touched && invalid && (
        <Hint error>Enter a valid date as MM/DD/YYYY.</Hint>
      )}
      {open && !disabled && (
        <View
          style={[
            styles.calendar,
            { backgroundColor: c.surface, borderColor: c.line },
          ]}
        >
          <View style={styles.header}>
            <View style={{ transform: [{ rotate: "90deg" }] }}>
              <IconButton
                icon="chevron"
                label={choosingMonth ? "Previous year" : "Previous month"}
                disabled={
                  cursor.year === 1900 && (choosingMonth || cursor.month === 0)
                }
                onPress={() =>
                  setCursor(shiftMonth(cursor, choosingMonth ? -12 : -1))
                }
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${months[cursor.month]} ${cursor.year}. ${choosingMonth ? "Show days" : "Choose month and year"}`}
              onPress={() => setChoosingMonth(!choosingMonth)}
              style={styles.monthTitle}
            >
              <Text style={{ color: c.ink, fontSize: 16, fontWeight: "600" }}>
                {choosingMonth
                  ? cursor.year
                  : `${months[cursor.month]} ${cursor.year}`}
              </Text>
            </Pressable>
            <View style={{ transform: [{ rotate: "-90deg" }] }}>
              <IconButton
                icon="chevron"
                label={choosingMonth ? "Next year" : "Next month"}
                disabled={
                  cursor.year === 9999 && (choosingMonth || cursor.month === 11)
                }
                onPress={() =>
                  setCursor(shiftMonth(cursor, choosingMonth ? 12 : 1))
                }
              />
            </View>
          </View>
          {choosingMonth ? (
            <View style={styles.grid}>
              {months.map((month, index) => (
                <Pressable
                  key={month}
                  accessibilityRole="button"
                  accessibilityLabel={`${month} ${cursor.year}`}
                  style={[
                    styles.monthCell,
                    {
                      backgroundColor:
                        cursor.month === index ? c.soft : c.surface,
                    },
                  ]}
                  onPress={() => {
                    setCursor({ ...cursor, month: index });
                    setChoosingMonth(false);
                  }}
                >
                  <Text
                    style={{
                      color: c.ink,
                      fontSize: 14,
                    }}
                  >
                    {month.slice(0, 3)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.grid}>
                {weekdays.map((day, index) => (
                  <View key={index} style={styles.weekday}>
                    <Text style={{ color: c.muted, fontSize: 12 }}>{day}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.grid}>
                {calendarDays(cursor).map((date, index) =>
                  date ? (
                    <View key={date} style={styles.dayCell}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${months[cursor.month]} ${Number(date.slice(8))}, ${cursor.year}${date === currentDate ? ", today" : ""}`}
                        accessibilityState={{ selected: date === value }}
                        onPress={() => select(date)}
                        style={({ pressed }) => [
                          styles.day,
                          {
                            backgroundColor:
                              date === value
                                ? c.accentFill
                                : pressed
                                  ? c.soft
                                  : c.surface,
                            borderColor:
                              date === currentDate ? c.accent : "transparent",
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: date === value ? c.onAccent : c.ink,
                            fontSize: 14,
                            fontWeight:
                              date === value || date === currentDate
                                ? "700"
                                : "400",
                          }}
                        >
                          {Number(date.slice(8))}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View key={`blank-${index}`} style={styles.dayCell} />
                  ),
                )}
              </View>
            </>
          )}
          <View style={[styles.actions, { borderTopColor: c.line }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => select(currentDate)}
              style={styles.action}
            >
              <Text style={{ color: c.accent, fontWeight: "600" }}>Today</Text>
            </Pressable>
            {optional && (
              <Pressable
                accessibilityRole="button"
                onPress={() => select(null)}
                style={styles.action}
              >
                <Text style={{ color: c.muted }}>No date</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={[styles.action, { marginLeft: "auto" }]}
            >
              <Text style={{ color: c.muted }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: 8, marginVertical: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 4,
  },
  textInput: {
    minHeight: 50,
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    paddingHorizontal: 13,
  },
  calendar: { borderWidth: 1, borderRadius: 12, padding: 8 },
  header: { flexDirection: "row", alignItems: "center" },
  monthTitle: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.285714%", alignItems: "center", paddingVertical: 8 },
  dayCell: {
    width: "14.285714%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  day: {
    width: "100%",
    maxWidth: 44,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  monthCell: {
    width: "33.333333%",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    marginTop: 8,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
