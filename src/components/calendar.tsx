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
}

export function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  style,
  className = "",
  showTodayButton = true,
}: CalendarProps) {
  const todayYMD = useMemo(() => getTodayYMD(), []);
  const initial = useMemo(() => parseYMD(value || todayYMD), [value, todayYMD]);

  const [viewYear, setViewYear] = useState<number>(initial.year);
  const [viewMonth, setViewMonth] = useState<number>(initial.month);

  // Sync view month/year if value changes externally
  useEffect(() => {
    if (value) {
      const parsed = parseYMD(value);
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]);

  const canGoNextMonth = useMemo(() => {
    if (!maxDate) return true;
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const firstDayOfNextMonth = formatYMD(nextY, nextM, 1);
    return firstDayOfNextMonth <= maxDate;
  }, [maxDate, viewMonth, viewYear]);

  const handlePrevMonth = () => {
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

  const handleTodayPress = () => {
    const today = parseYMD(todayYMD);
    setViewYear(today.year);
    setViewMonth(today.month);
    onChange?.(todayYMD);
  };

  const handleSelectDay = (day: CalendarDayItem) => {
    if (day.isDisabled) return;
    if (maxDate && day.dateString > maxDate) return;

    if (day.isPrevMonth) {
      handlePrevMonth();
    } else if (day.isNextMonth) {
      handleNextMonth();
    }

    onChange?.(day.dateString);
  };

  // Generate grid days
  const calendarDays = useMemo<CalendarDayItem[]>(() => {
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
  }, [viewYear, viewMonth, minDate, maxDate, todayYMD, value]);

  return (
    <View
      style={style}
      className={`bg-dark-surface border border-dark-border rounded-3xl p-4 ${className}`}
    >
      {/* Header Row */}
      <View className="flex-row items-center justify-between mb-4 px-1">
        {/* Left: Today button */}
        {showTodayButton ? (
          <TouchableOpacity
            onPress={handleTodayPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="py-1 px-2.5 rounded-xl bg-dark-card border border-dark-border/60"
          >
            <Text className="text-dark-textSecondary text-xs font-semibold tracking-wide">
              Today
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}

        {/* Center: Month & Year */}
        <Text className="text-dark-text text-base font-bold tracking-tight">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>

        {/* Right: Chevrons */}
        <View className="flex-row items-center gap-1.5">
          <TouchableOpacity
            onPress={handlePrevMonth}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-8 h-8 rounded-full items-center justify-center bg-dark-card border border-dark-border"
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

      {/* Weekday Names */}
      <View className="flex-row items-center justify-between mb-2">
        {WEEK_DAYS.map((day) => (
          <View key={day} className="w-[14.28%] items-center justify-center py-1">
            <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider">
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Date Grid */}
      <View className="flex-row flex-wrap">
        {calendarDays.map((item) => {
          return (
            <View
              key={item.dateString}
              className="w-[14.28%] aspect-square items-center justify-center py-0.5"
            >
              <TouchableOpacity
                onPress={() => handleSelectDay(item)}
                disabled={item.isDisabled}
                activeOpacity={0.7}
                style={
                  item.isSelected
                    ? { backgroundColor: "#D4F938" }
                    : undefined
                }
                className={`w-9 h-9 rounded-full items-center justify-center ${
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
}

export function CalendarModal({
  visible,
  onClose,
  value,
  onChange,
  title = "Select Date",
  minDate,
  maxDate,
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

  return (
    <HawkFlyUp visible={visible} onClose={onClose} title={title}>
      {/* Embedded Calendar */}
      <Calendar
        value={selectedDate}
        onChange={(d) => setSelectedDate(d)}
        minDate={minDate}
        maxDate={maxDate}
        className="mb-4"
      />

      {/* Confirm Button */}
      <TouchableOpacity
        onPress={handleConfirm}
        activeOpacity={0.8}
        className="bg-brand-accent py-3.5 rounded-2xl items-center justify-center"
      >
        <Text className="text-dark-bg text-base font-bold">
          Done ({formatDisplayDate(selectedDate)})
        </Text>
      </TouchableOpacity>
    </HawkFlyUp>
  );
}

export default Calendar;
