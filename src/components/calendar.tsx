import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HawkFlyUp } from "./HawkFlyUp";

// Universal height for calendar grid content (matches a 5-week month)
const CALENDAR_BODY_HEIGHT = 256;

// --- Date Helpers (Timezone-safe) ---

export function parseYMD(dateStr?: string): { year: number; month: number; day: number } {
  if (dateStr) {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return { year: parts[0], month: parts[1] - 1, day: parts[2] };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

export function formatYMD(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function getTodayYMD(): string {
  const now = new Date();
  return formatYMD(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Converts local date (YYYY-MM-DD) and 12-hour time string ("hh:mm AM/PM")
 * into a proper ISO-8601 UTC timestamp based on the device's local timezone.
 */
export function localDateTimeToIso(
  dateStr: string,
  timeStr?: string | null
): string {
  if (!dateStr) return new Date().toISOString();
  const { year, month, day } = parseYMD(dateStr);
  const now = new Date();
  const today = getTodayYMD();
  let h = 12;
  let min = 0;
  let sec = 0;

  if (timeStr && timeStr.includes(":")) {
    const parts = timeStr.trim().split(" ");
    const hm = (parts[0] || "").split(":");
    let parsedH = parseInt(hm[0], 10);
    const parsedM = parseInt(hm[1], 10) || 0;
    if (parts[1] === "PM" && parsedH < 12) parsedH += 12;
    if (parts[1] === "AM" && parsedH === 12) parsedH = 0;
    if (!isNaN(parsedH)) h = parsedH;
    if (!isNaN(parsedM)) min = parsedM;

    // If the selected date, hour, and minute match current local time, preserve the current seconds
    if (
      dateStr === today &&
      h === now.getHours() &&
      min === now.getMinutes()
    ) {
      sec = now.getSeconds();
    }
  }
  const dt = new Date(year, month, day, h, min, sec, 0);
  return dt.toISOString();
}

/**
 * Parses an ISO-8601 timestamp and extracts local 12-hour time components.
 */
export function parseIsoToTimeInfo(isoString?: string | null): {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
} {
  const now = new Date();
  if (!isoString) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return { hour12, minute: minutes, period };
  }
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return { hour12, minute: minutes, period };
  }
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const period: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return { hour12, minute: minutes, period };
}

/**
 * Checks whether the specified date and time is in the future.
 */
export function isFutureTime(
  dateYMD: string,
  hour12: number,
  minute: number,
  period: "AM" | "PM"
): boolean {
  const today = getTodayYMD();
  if (dateYMD > today) return true;
  if (dateYMD < today) return false;

  const now = new Date();
  let selectedH = hour12;
  if (period === "PM" && selectedH < 12) selectedH += 12;
  if (period === "AM" && selectedH === 12) selectedH = 0;

  const currentH = now.getHours();
  const currentM = now.getMinutes();

  if (selectedH > currentH) return true;
  if (selectedH === currentH && minute > currentM) return true;
  return false;
}

export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return "";
  const { year, month, day } = parseYMD(dateStr);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day} ${monthNames[month]} ${year}`;
}

export function formatDisplayMonth(dateStr?: string): string {
  if (!dateStr) return "";
  const { year, month } = parseYMD(dateStr);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[month]} ${year}`;
}

const MONTH_NAMES = [
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

const MONTH_SHORT_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const QUARTERS = [
  [0, 1, 2], // Q1: Jan, Feb, Mar
  [3, 4, 5], // Q2: Apr, May, Jun
  [6, 7, 8], // Q3: Jul, Aug, Sep
  [9, 10, 11], // Q4: Oct, Nov, Dec
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface CalendarDayItem {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isPrevMonth: boolean;
  isNextMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

export type CalendarMode = "full" | "month-only";

export interface CalendarProps {
  /** Selected date in "YYYY-MM-DD" format */
  value?: string;
  /** Callback triggered when a date is selected */
  onChange?: (date: string) => void;
  /** Optional minimum selectable date "YYYY-MM-DD" */
  minDate?: string;
  /** Optional maximum selectable date "YYYY-MM-DD" */
  maxDate?: string;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Optional container class name */
  className?: string;
  /** Whether to show the top Today button */
  showTodayButton?: boolean;
  /** Developer capability: 'full' allows day & month picking; 'month-only' locks to months & year */
  mode?: CalendarMode;
}

export function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  style,
  className = "",
  showTodayButton = true,
  mode = "full",
}: CalendarProps) {
  const todayYMD = useMemo(() => getTodayYMD(), []);
  const initial = useMemo(() => parseYMD(value || todayYMD), [value, todayYMD]);

  const [viewYear, setViewYear] = useState<number>(initial.year);
  const [viewMonth, setViewMonth] = useState<number>(initial.month);
  const [viewType, setViewType] = useState<"day" | "month">(
    mode === "month-only" ? "month" : "day"
  );

  // Lock to month view if mode is month-only
  useEffect(() => {
    if (mode === "month-only") {
      setViewType("month");
    }
  }, [mode]);

  // Sync view month/year if value changes externally
  useEffect(() => {
    if (value) {
      const parsed = parseYMD(value);
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]);

  // Day view month navigation limits
  const canGoNextMonth = useMemo(() => {
    if (!maxDate) return true;
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const firstDayOfNextMonth = formatYMD(nextY, nextM, 1);
    return firstDayOfNextMonth <= maxDate;
  }, [maxDate, viewMonth, viewYear]);

  const canGoPrevMonth = useMemo(() => {
    if (!minDate) return true;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const daysInPrev = new Date(prevY, prevM + 1, 0).getDate();
    const lastDayOfPrevMonth = formatYMD(prevY, prevM, daysInPrev);
    return lastDayOfPrevMonth >= minDate;
  }, [minDate, viewMonth, viewYear]);

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    if (viewMonth === 0) {
      setViewYear((prev) => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    if (viewMonth === 11) {
      setViewYear((prev) => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Month view year navigation limits
  const canGoNextYear = useMemo(() => {
    if (!maxDate) return true;
    const firstDayOfNextYear = formatYMD(viewYear + 1, 0, 1);
    return firstDayOfNextYear <= maxDate;
  }, [maxDate, viewYear]);

  const canGoPrevYear = useMemo(() => {
    if (!minDate) return true;
    const lastDayOfPrevYear = formatYMD(viewYear - 1, 11, 31);
    return lastDayOfPrevYear >= minDate;
  }, [minDate, viewYear]);

  const handlePrevYear = () => {
    if (!canGoPrevYear) return;
    setViewYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    if (!canGoNextYear) return;
    setViewYear((prev) => prev + 1);
  };

  const handleTodayPress = () => {
    const today = parseYMD(todayYMD);
    setViewYear(today.year);
    setViewMonth(today.month);
    onChange?.(todayYMD);
  };

  const handleSelectDay = (day: CalendarDayItem) => {
    if (day.isDisabled) return;
    onChange?.(day.dateString);
  };

  const handleMonthSelect = (monthIdx: number) => {
    setViewMonth(monthIdx);
    if (mode === "month-only") {
      const newDate = formatYMD(viewYear, monthIdx, 1);
      onChange?.(newDate);
    } else {
      // In full mode, drill down to Day view with selected month
      const parsedVal = parseYMD(value || todayYMD);
      const daysInTargetMonth = new Date(viewYear, monthIdx + 1, 0).getDate();
      const clampedDay = Math.min(parsedVal.day || 1, daysInTargetMonth);
      const newDate = formatYMD(viewYear, monthIdx, clampedDay);
      onChange?.(newDate);
      setViewType("day");
    }
  };

  // Generate grid days for day view
  const calendarDays = useMemo<CalendarDayItem[]>(() => {
    if (viewType !== "day") return [];

    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;

    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

    const days: CalendarDayItem[] = [];

    // Trailing days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateString = formatYMD(prevYear, prevMonth, dayNum);
      const isDisabled =
        Boolean(minDate && dateString < minDate) ||
        Boolean(maxDate && dateString > maxDate);

      days.push({
        dateString,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isPrevMonth: true,
        isNextMonth: false,
        isToday: dateString === todayYMD,
        isSelected: dateString === value,
        isDisabled,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateString = formatYMD(viewYear, viewMonth, d);
      const isDisabled =
        Boolean(minDate && dateString < minDate) ||
        Boolean(maxDate && dateString > maxDate);

      days.push({
        dateString,
        dayNumber: d,
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false,
        isToday: dateString === todayYMD,
        isSelected: dateString === value,
        isDisabled,
      });
    }

    // Leading days from next month to complete 5 or 6 full weeks
    const totalTarget = days.length <= 35 ? 35 : 42;
    const remainingDays = totalTarget - days.length;
    for (let nextD = 1; nextD <= remainingDays; nextD++) {
      const dateString = formatYMD(nextYear, nextMonth, nextD);
      const isDisabled =
        Boolean(minDate && dateString < minDate) ||
        Boolean(maxDate && dateString > maxDate);

      days.push({
        dateString,
        dayNumber: nextD,
        isCurrentMonth: false,
        isPrevMonth: false,
        isNextMonth: true,
        isToday: dateString === todayYMD,
        isSelected: dateString === value,
        isDisabled,
      });
    }

    return days;
  }, [viewType, viewYear, viewMonth, minDate, maxDate, todayYMD, value]);

  // Group days into weeks of 7 items
  const weeks = useMemo(() => {
    const result: CalendarDayItem[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <View
      style={style}
      className={`bg-dark-surface border border-dark-border rounded-3xl p-4 ${className}`}
    >
      {viewType === "month" ? (
        /* --- MONTH PICKER VIEW --- */
        <View>
          {/* Month View Header (fixed min-height to match Day View header) */}
          <View className="relative flex-row items-center justify-between mb-3 px-1 min-h-[38px]">
            {/* Absolute Centered Year with Previous/Next Chevrons */}
            <View
              pointerEvents="box-none"
              className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center"
            >
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={handlePrevYear}
                  disabled={!canGoPrevYear}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className={`w-8 h-8 rounded-full items-center justify-center bg-dark-card border border-dark-border ${
                    !canGoPrevYear ? "opacity-30" : ""
                  }`}
                >
                  <Ionicons name="chevron-back" size={16} color="#94A3B8" />
                </TouchableOpacity>

                <Text className="text-dark-text text-base font-bold tracking-tight px-1.5">
                  {viewYear}
                </Text>

                <TouchableOpacity
                  onPress={handleNextYear}
                  disabled={!canGoNextYear}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className={`w-8 h-8 rounded-full items-center justify-center bg-dark-card border border-dark-border ${
                    !canGoNextYear ? "opacity-30" : ""
                  }`}
                >
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Left: If full mode, back arrow. If month-only, Reset button with no icon */}
            {mode === "full" ? (
              <TouchableOpacity
                onPress={() => setViewType("day")}
                activeOpacity={0.7}
                className="w-8 h-8 rounded-full items-center justify-center bg-dark-card border border-dark-border z-10"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={16} color="#F8FAFC" />
              </TouchableOpacity>
            ) : showTodayButton ? (
              <TouchableOpacity
                onPress={() => {
                  const now = parseYMD(todayYMD);
                  setViewYear(now.year);
                  setViewMonth(now.month);
                  onChange?.(formatYMD(now.year, now.month, 1));
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="py-1 px-3 rounded-xl bg-dark-card border border-dark-border/60 z-10"
              >
                <Text className="text-dark-textSecondary text-xs font-semibold tracking-wide">
                  Reset
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 32 }} />
            )}

            {/* Right: Symmetrical placeholder */}
            <View style={{ width: 32 }} />
          </View>

          {/* 12 Months Grid: Proper Aesthetic Circles across 4 Quarters with Universal Height */}
          <View style={{ height: CALENDAR_BODY_HEIGHT }} className="justify-between py-1">
            {QUARTERS.map((quarter, qIdx) => (
              <View
                key={qIdx}
                className="flex-row items-center justify-around flex-1"
              >
                {quarter.map((mIdx) => {
                  const mName = MONTH_SHORT_NAMES[mIdx];
                  const parsedVal = parseYMD(value || todayYMD);
                  const isSelected =
                    parsedVal.month === mIdx && parsedVal.year === viewYear;
                  const todayObj = parseYMD(todayYMD);
                  const isCurrentMonth =
                    todayObj.month === mIdx && todayObj.year === viewYear;

                  const firstDayOfM = formatYMD(viewYear, mIdx, 1);
                  const lastDayOfM = formatYMD(
                    viewYear,
                    mIdx,
                    new Date(viewYear, mIdx + 1, 0).getDate()
                  );
                  const isDisabled =
                    Boolean(minDate && lastDayOfM < minDate) ||
                    Boolean(maxDate && firstDayOfM > maxDate);

                  return (
                    <TouchableOpacity
                      key={mName}
                      disabled={isDisabled}
                      onPress={() => handleMonthSelect(mIdx)}
                      activeOpacity={0.7}
                      style={[
                        { width: 54, height: 54, borderRadius: 27 },
                        isSelected
                          ? { backgroundColor: "#D4F938" }
                          : undefined,
                      ]}
                      className={`rounded-full items-center justify-center border shadow-sm ${
                        isSelected
                          ? "border-brand-accent"
                          : isCurrentMonth
                          ? "bg-dark-card border-brand-accent/60"
                          : "bg-dark-card border-dark-border"
                      } ${isDisabled ? "opacity-30" : ""}`}
                    >
                      <Text
                        style={isSelected ? { color: "#0B0D12" } : undefined}
                        className={`text-sm ${
                          isSelected
                            ? "font-extrabold"
                            : isCurrentMonth
                            ? "font-bold text-brand-accent"
                            : "font-semibold text-dark-text"
                        }`}
                      >
                        {mName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      ) : (
        /* --- DAY VIEW --- */
        <View>
          {/* Day View Header Row (fixed min-height matching Month View header) */}
          <View className="flex-row items-center justify-between mb-3 px-1 min-h-[38px]">
            {/* Left: Reset button */}
            {showTodayButton ? (
              <TouchableOpacity
                onPress={handleTodayPress}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="py-1 px-3 rounded-xl bg-dark-card border border-dark-border/60"
              >
                <Text className="text-dark-textSecondary text-xs font-semibold tracking-wide">
                  Reset
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 44 }} />
            )}

            {/* Center: Month & Year (Tap to switch to Month Picker) */}
            <TouchableOpacity
              onPress={() => setViewType("month")}
              activeOpacity={0.7}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-card border border-dark-border/60"
            >
              <Text className="text-dark-text text-base font-bold tracking-tight">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Ionicons name="chevron-down" size={13} color="#94A3B8" />
            </TouchableOpacity>

            {/* Right: Chevrons */}
            <View className="flex-row items-center gap-1.5">
              <TouchableOpacity
                onPress={handlePrevMonth}
                disabled={!canGoPrevMonth}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className={`w-8 h-8 rounded-full items-center justify-center bg-dark-card border border-dark-border ${
                  !canGoPrevMonth ? "opacity-30" : ""
                }`}
              >
                <Ionicons name="chevron-back" size={16} color="#94A3B8" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNextMonth}
                disabled={!canGoNextMonth}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className={`w-8 h-8 rounded-full items-center justify-center bg-dark-card border border-dark-border ${
                  !canGoNextMonth ? "opacity-30" : ""
                }`}
              >
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Universal Height Day Grid Container */}
          <View style={{ height: CALENDAR_BODY_HEIGHT }} className="justify-between">
            {/* Weekday Names */}
            <View className="flex-row items-center justify-between h-6 mb-1">
              {WEEK_DAYS.map((day) => (
                <View key={day} className="w-[14.28%] items-center justify-center">
                  <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider">
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Weeks Container (Distributes evenly to guarantee identical 5-week height) */}
            <View className="flex-1 justify-between">
              {weeks.map((week, weekIdx) => (
                <View
                  key={weekIdx}
                  className="flex-row items-center justify-between flex-1"
                >
                  {week.map((item) => {
                    return (
                      <View
                        key={item.dateString}
                        className="w-[14.28%] items-center justify-center"
                      >
                        <TouchableOpacity
                          onPress={() => handleSelectDay(item)}
                          disabled={item.isDisabled}
                          activeOpacity={0.7}
                          style={[
                            { width: 36, height: 36, borderRadius: 18 },
                            item.isSelected
                              ? { backgroundColor: "#D4F938" }
                              : undefined,
                          ]}
                          className={`items-center justify-center ${
                            item.isSelected
                              ? ""
                              : item.isToday
                              ? "border border-brand-accent/50 bg-brand-accent/10"
                              : ""
                          }`}
                        >
                          <Text
                            style={
                              item.isSelected
                                ? { color: "#0B0D12" }
                                : undefined
                            }
                            className={`text-sm ${
                              item.isSelected
                                ? "font-extrabold"
                                : item.isToday
                                ? "font-bold text-brand-accent"
                                : item.isCurrentMonth
                                ? "font-semibold text-dark-text"
                                : "font-normal text-[#475569]"
                            } ${item.isDisabled ? "opacity-30" : ""}`}
                          >
                            {item.dayNumber}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// --- Modal Wrapper (Bottom Fly-up) ---

export interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  value?: string;
  onChange: (date: string) => void;
  title?: string;
  minDate?: string;
  maxDate?: string;
  /** Developer capability: 'full' allows day & month picking; 'month-only' locks to months & year */
  mode?: CalendarMode;
}

export function CalendarModal({
  visible,
  onClose,
  value,
  onChange,
  title = "Select Date",
  minDate,
  maxDate,
  mode = "full",
}: CalendarModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    value || getTodayYMD()
  );

  useEffect(() => {
    if (visible && value) {
      setSelectedDate(value);
    } else if (visible && !value) {
      setSelectedDate(getTodayYMD());
    }
  }, [visible, value]);

  const handleConfirm = () => {
    onChange(selectedDate);
    onClose();
  };

  const doneLabel =
    mode === "month-only"
      ? `Done (${formatDisplayMonth(selectedDate)})`
      : `Done (${formatDisplayDate(selectedDate)})`;

  return (
    <HawkFlyUp visible={visible} onClose={onClose} title={title}>
      {/* Embedded Calendar with universal height */}
      <Calendar
        value={selectedDate}
        onChange={(d) => setSelectedDate(d)}
        minDate={minDate}
        maxDate={maxDate}
        mode={mode}
        className="mb-4"
      />

      {/* Confirm Button */}
      <TouchableOpacity
        onPress={handleConfirm}
        activeOpacity={0.8}
        className="bg-brand-accent py-3.5 rounded-2xl items-center justify-center shadow-lg active:opacity-90"
      >
        <Text className="text-dark-bg text-base font-bold">
          {doneLabel}
        </Text>
      </TouchableOpacity>
    </HawkFlyUp>
  );
}

export default Calendar;
