import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { TopCategoryMiniPie } from "../../services/budgetService";
import { getCurrencySymbol } from "../../services/currency";

interface BudgetHeroPieProps {
  monthLabel: string;
  onOpenMonthPicker: () => void;
  onOpenCreateBudget: () => void;
  onOpenBudgetSummary?: () => void;
  onOpenImportTemplate?: () => void;
  remainingAmount: number;
  totalBudget: number;
  progressPercent: number; // 0 to 100
  topCategories: TopCategoryMiniPie[];
  currency?: string | null;
  numberFormat?: string | null;
}

// ─── Center Hero Amount Formatter ─────────────────────────────────────────────
// Transforms >= 1000 into K with 1 decimal place (e.g. 6.4K, 7.5K)
function formatHeroRemaining(amount: number, currencyCode?: string | null) {
  const symbol = getCurrencySymbol(currencyCode);
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let formattedVal = "";
  if (abs >= 1000) {
    formattedVal = `${(abs / 1000).toFixed(1)}K`;
  } else {
    formattedVal = `${Math.round(abs)}`;
  }

  const text = isNegative ? `-${symbol}${formattedVal}` : `${symbol}${formattedVal}`;
  return { text, isNegative };
}

function getBudgetProgressColor(progressPercent: number, isExceeded?: boolean) {
  if (isExceeded) return "#F43F5E"; // Red ONLY when exceeded!
  if (progressPercent >= 100) return "#22C55E"; // Green when completed (100%)
  if (progressPercent >= 75) return "#F59E0B"; // Orange (75% to 99%)
  return "#D4F938"; // Yellow Accent (until 75%)
}

// ─── Mini Category Pie ────────────────────────────────────────────────────────
function MiniCategoryPie({ item }: { item: TopCategoryMiniPie }) {
  // Made category circles bigger per user request
  const size = 58;
  const stroke = 6;
  const center = size / 2;
  const radius = (size - stroke - 4) / 2;
  const circumference = 2 * Math.PI * radius;

  const pct = Math.min(100, Math.max(0, item.progressPercent));
  const arcLength = (pct / 100) * circumference;
  const strokeColor =
    item.categoryId === 0
      ? item.color
      : getBudgetProgressColor(item.progressPercent);

  return (
    <View className="items-center mx-3 my-1" style={{ width: 72 }}>
      {/* Donut ring */}
      <View
        style={{ width: size, height: size }}
        className="items-center justify-center relative mb-1.5"
      >
        <Svg width={size} height={size}>
          {/* Background track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#262B3A"
            strokeWidth={stroke}
            fill="none"
          />

          {/* Progress arc */}
          {pct > 0 && (
            <G rotation={-90} origin={`${center}, ${center}`}>
              {pct >= 99 ? (
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={strokeColor}
                  strokeWidth={stroke}
                  fill="none"
                />
              ) : (
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={strokeColor}
                  strokeWidth={stroke}
                  strokeDasharray={`${arcLength} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </G>
          )}
        </Svg>

        {/* Center percentage label */}
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-dark-text font-bold text-xs leading-tight">
            {item.categoryId === 0 ? "0%" : `${Math.round(pct)}%`}
          </Text>
        </View>
      </View>

      {/* Category Name beneath */}
      <Text
        className="text-dark-muted font-medium text-[11px] text-center"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.categoryName}
      </Text>
    </View>
  );
}

export function BudgetHeroPie({
  monthLabel,
  onOpenMonthPicker,
  onOpenCreateBudget,
  onOpenBudgetSummary,
  onOpenImportTemplate,
  remainingAmount,
  totalBudget,
  progressPercent,
  topCategories,
  currency,
}: BudgetHeroPieProps) {
  // Remaining circle: made bit smaller per user request
  const bigSize = 140;
  const bigStroke = 14;
  const bigCenter = bigSize / 2;
  const bigRadius = (bigSize - bigStroke - 6) / 2;
  const bigCircumference = 2 * Math.PI * bigRadius;

  const clampedProgress =
    totalBudget > 0
      ? Math.max(0, Math.min(100, Math.round((remainingAmount / totalBudget) * 100)))
      : 0;
  const bigArcLength = (clampedProgress / 100) * bigCircumference;

  const { text: heroAmountText, isNegative: isExceeded } = formatHeroRemaining(
    remainingAmount,
    currency
  );

  // 3 + 2 layout matching the reference image:
  const row1Categories = topCategories.slice(0, 3);
  const row2Categories = topCategories.slice(3, 5);

  return (
    <View className="bg-dark-surface border border-dark-border rounded-3xl pt-4 pb-5 px-4 mb-5 items-center relative">
      {/* ── Top Right: White Import Button (No circle behind per user request) ── */}
      {onOpenImportTemplate && (
        <TouchableOpacity
          onPress={onOpenImportTemplate}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className="absolute top-4 right-5 p-1 z-10"
        >
          <Ionicons name="download-outline" size={21} color="#F8FAFC" />
        </TouchableOpacity>
      )}

      {/* ── 1. Top Month Picker Pill ── */}
      <TouchableOpacity
        onPress={onOpenMonthPicker}
        activeOpacity={0.7}
        className="flex-row items-center bg-dark-card border border-dark-border/80 px-4 py-2 rounded-full mb-5"
      >
        <Ionicons
          name="calendar-outline"
          size={14}
          color="#94A3B8"
          style={{ marginRight: 6 }}
        />
        <Text className="text-dark-text font-bold text-xs tracking-wide">
          {monthLabel}
        </Text>
        <Ionicons
          name="chevron-down"
          size={14}
          color="#94A3B8"
          style={{ marginLeft: 6 }}
        />
      </TouchableOpacity>

      {/* ── 2. Big Donut Ring + Flanking Buttons ── */}
      <View className="flex-row items-center justify-between w-full px-2 mb-6">
        {/* Left: Bulb Button (Opens summary page) */}
        <TouchableOpacity
          onPress={onOpenBudgetSummary}
          activeOpacity={0.8}
          className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center shadow-sm"
        >
          <Ionicons name="bulb-outline" size={20} color="#F8FAFC" />
        </TouchableOpacity>

        {/* Center: Big Donut Pie */}
        <View
          style={{ width: bigSize, height: bigSize }}
          className="items-center justify-center relative"
        >
          <Svg width={bigSize} height={bigSize}>
            {/* Background track */}
            <Circle
              cx={bigCenter}
              cy={bigCenter}
              r={bigRadius}
              stroke="#1B1F2B"
              strokeWidth={bigStroke}
              fill="none"
            />

            {/* Progress Arc: yellow until 75%, orange from 75%, red for 100%+ or exceeded */}
            {clampedProgress > 0 && !isExceeded && (
              <G rotation={-90} origin={`${bigCenter}, ${bigCenter}`}>
                {clampedProgress >= 99 ? (
                  <Circle
                    cx={bigCenter}
                    cy={bigCenter}
                    r={bigRadius}
                    stroke={getBudgetProgressColor(progressPercent, isExceeded)}
                    strokeWidth={bigStroke}
                    fill="none"
                  />
                ) : (
                  <Circle
                    cx={bigCenter}
                    cy={bigCenter}
                    r={bigRadius}
                    stroke={getBudgetProgressColor(progressPercent, isExceeded)}
                    strokeWidth={bigStroke}
                    strokeDasharray={`${bigArcLength} ${bigCircumference}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    fill="none"
                  />
                )}
              </G>
            )}

            {/* If exceeded: show full red ring */}
            {isExceeded && (
              <Circle
                cx={bigCenter}
                cy={bigCenter}
                r={bigRadius}
                stroke="#F43F5E"
                strokeWidth={bigStroke}
                fill="none"
              />
            )}
          </Svg>

          {/* Center Text inside Big Donut: Not uppercase, formatted with K, red if exceeded */}
          <View className="absolute inset-0 items-center justify-center px-2">
            <Text
              className={`font-semibold text-xs mb-0.5 ${
                isExceeded ? "text-rose-400" : "text-dark-muted"
              }`}
            >
              {isExceeded ? "Exceeded" : "Remaining"}
            </Text>
            <Text
              className={`text-2xl font-black leading-7 tracking-tight text-center ${
                isExceeded ? "text-rose-500" : "text-dark-text"
              }`}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {heroAmountText}
            </Text>
          </View>
        </View>

        {/* Right: Add Budget Button */}
        <TouchableOpacity
          onPress={onOpenCreateBudget}
          activeOpacity={0.7}
          className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center shadow-sm active:border-brand-accent"
        >
          <Ionicons name="add" size={22} color="#F8FAFC" />
        </TouchableOpacity>
      </View>

      {/* ── 3. Top 5 Categories (3 + 2 layout matching image reference) ── */}
      <View className="w-full items-center">
        {/* Row 1: 3 categories */}
        <View className="flex-row items-center justify-center mb-2">
          {row1Categories.map((item, idx) => (
            <MiniCategoryPie key={`row1-${item.categoryId}-${idx}`} item={item} />
          ))}
        </View>

        {/* Row 2: 2 categories centered */}
        <View className="flex-row items-center justify-center">
          {row2Categories.map((item, idx) => (
            <MiniCategoryPie key={`row2-${item.categoryId}-${idx}`} item={item} />
          ))}
        </View>
      </View>
    </View>
  );
}

export default BudgetHeroPie;
