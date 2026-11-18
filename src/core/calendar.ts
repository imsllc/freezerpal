import { isDate, today } from "./model";

export interface CalendarMonth {
  year: number;
  month: number;
}
export function monthForDate(value: string | null): CalendarMonth {
  const [year, month] = (value && isDate(value) ? value : today())
    .split("-")
    .map(Number);
  return { year: year!, month: month! - 1 };
}
export function shiftMonth(
  cursor: CalendarMonth,
  delta: number,
): CalendarMonth {
  const index = Math.max(
    1900 * 12,
    Math.min(9999 * 12 + 11, cursor.year * 12 + cursor.month + delta),
  );
  return { year: Math.floor(index / 12), month: index % 12 };
}
export function calendarDays({
  year,
  month,
}: CalendarMonth): (string | null)[] {
  const start = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - start + 1;
    return day < 1 || day > count
      ? null
      : `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
}
export function formatDateInput(input: string, previous = ""): string {
  let digits = input.replace(/\D/g, "").slice(0, 8);
  // Backspace across an automatic separator removes the preceding digit too.
  if (previous.endsWith("/") && input === previous.slice(0, -1))
    digits = digits.slice(0, -1);
  if (digits.length < 2) return digits;
  if (digits.length < 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDateInput(input: string): string | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return null;
  const [month, day, year] = input.split("/");
  const date = `${year}-${month}-${day}`;
  return isDate(date) ? date : null;
}
