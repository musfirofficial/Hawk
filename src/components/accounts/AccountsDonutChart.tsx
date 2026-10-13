import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { LiquidAssetType } from "../../db/schema";

interface AccountsDonutChartProps {
  bankBalance: number;
  cashBalance: number;
  activeType: LiquidAssetType;
  onToggleActive?: () => void;
  size?: number;
  strokeWidth?: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleInDegrees: number
) {
  const rad = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const sweep = endAngle - startAngle;
  const largeArcFlag = sweep > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function AccountsDonutChart({
  bankBalance,
  cashBalance,
  activeType,
  onToggleActive,
  size = 190,
  strokeWidth = 16,
}: AccountsDonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Safe positive balances for ratio calculation
  const safeBank = Math.max(0, bankBalance);
  const safeCash = Math.max(0, cashBalance);
  const total = safeBank + safeCash;

  const { bankPct, cashPct, activePct } = useMemo(() => {
    if (total <= 0) {
      return { bankPct: 0, cashPct: 0, activePct: 0 };
    }
    const bPct = Math.round((safeBank / total) * 100);
    const cPct = 100 - bPct; // ensure summing to 100
    const aPct = activeType === "BANK" ? bPct : cPct;
    return { bankPct: bPct, cashPct: cPct, activePct: aPct };
  }, [safeBank, safeCash, total, activeType]);

  // Calculate arc angles with rounded end caps and gaps
  const { bankPath, cashPath, singleSegment } = useMemo(() => {
    if (total <= 0) {
      return { bankPath: null, cashPath: null, singleSegment: null };
    }

    if (safeBank > 0 && safeCash === 0) {
      return { bankPath: null, cashPath: null, singleSegment: "BANK" as const };
    }

    if (safeCash > 0 && safeBank === 0) {
      return { bankPath: null, cashPath: null, singleSegment: "CASH" as const };
    }

    // Both have values > 0: render segmented arcs with rounded caps and gap
    const gap = 16; // gap in degrees between segments
    const availableAngle = 360 - gap * 2;
    const bankFrac = safeBank / total;

    // Allocate sweeps
    const bankSweep = Math.max(4, Math.min(availableAngle - 4, bankFrac * availableAngle));
    const cashSweep = Math.max(4, availableAngle - bankSweep);

    const startBank = gap / 2;
    const endBank = startBank + bankSweep;

    const startCash = endBank + gap;
    const endCash = startCash + cashSweep;

    const bPath = describeArc(center, center, radius, startBank, endBank);
    const cPath = describeArc(center, center, radius, startCash, endCash);

    return { bankPath: bPath, cashPath: cPath, singleSegment: null };
  }, [safeBank, safeCash, total, center, radius]);

  const activeColor = activeType === "BANK" ? "#38BDF8" : "#22C55E";
  const activeLabel = activeType === "BANK" ? "Bank Share" : "Cash Share";
  const activeTag = activeType === "BANK" ? "Bank Active" : "Cash Active";

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center relative"
    >
      <Svg width={size} height={size}>
        {/* Dark background track ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#1E2330"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* 100% Single segment case */}
        {singleSegment === "BANK" && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#38BDF8"
            strokeWidth={strokeWidth}
            fill="none"
          />
        )}
        {singleSegment === "CASH" && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#22C55E"
            strokeWidth={strokeWidth}
            fill="none"
          />
        )}

        {/* Dual segment arcs */}
        {bankPath && (
          <Path
            d={bankPath}
            stroke="#38BDF8"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        )}
        {cashPath && (
          <Path
            d={cashPath}
            stroke="#22C55E"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </Svg>

      {/* Inner circular center display */}
      <TouchableOpacity
        onPress={onToggleActive}
        disabled={!onToggleActive}
        activeOpacity={0.8}
        className="absolute w-32 h-32 rounded-full bg-dark-bg/90 border border-dark-border/80 items-center justify-center p-2 shadow-lg"
      >
        <Text className="text-dark-muted text-[11px] font-semibold uppercase tracking-wider text-center">
          {activeLabel}
        </Text>
        <Text className="text-dark-text text-3xl font-extrabold tracking-tight my-0.5">
          {activePct}%
        </Text>
        <View
          className={`px-2.5 py-0.5 rounded-full flex-row items-center gap-1.5 ${
            activeType === "BANK"
              ? "bg-sky-500/15 border border-sky-500/30"
              : "bg-emerald-500/15 border border-emerald-500/30"
          }`}
        >
          <View
            className={`w-1.5 h-1.5 rounded-full ${
              activeType === "BANK" ? "bg-sky-400" : "bg-emerald-400"
            }`}
          />
          <Text
            className={`text-[10px] font-bold ${
              activeType === "BANK" ? "text-sky-400" : "text-emerald-400"
            }`}
          >
            {activeTag}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default AccountsDonutChart;
