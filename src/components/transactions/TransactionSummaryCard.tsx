import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useAuth } from "../../context/auth";
import { TransactionItem } from "../../context/transactions";
import { formatCurrency } from "../../services/currency";

// Font styles to guarantee DMSans loads across all Android and iOS engines
const fonts = {
  regular: { fontFamily: "DMSans_400Regular", fontWeight: "normal" as const },
  medium: { fontFamily: "DMSans_500Medium", fontWeight: "normal" as const },
  semibold: { fontFamily: "DMSans_600SemiBold", fontWeight: "normal" as const },
  bold: { fontFamily: "DMSans_700Bold", fontWeight: "normal" as const },
  extrabold: {
    fontFamily: "DMSans_800ExtraBold",
    fontWeight: "normal" as const,
  },
};

// ─── Dual-ring Pie ────────────────────────────────────────────────────────────
function DualRingPie({
  incomePercent,
  expensePercent,
  size = 68,
}: {
  incomePercent: number;
  expensePercent: number;
  size?: number;
}) {
  const stroke = Math.round(size * 0.12); // ~8px
  const center = size / 2;
  // Inset radius slightly so strokeLinecap="round" ends never get clipped by the SVG boundary
  const radius = (size - stroke - 6) / 2;
  const circumference = 2 * Math.PI * radius;

  const total = incomePercent + expensePercent;
  const incFrac = total > 0 ? incomePercent / total : 0;
  const expFrac = total > 0 ? expensePercent / total : 0;

  const hasBoth = incFrac > 0 && expFrac > 0;
  // Distinct spacing between segments to let both circular rounded caps be clearly visible
  const gap = hasBoth ? stroke * 1.5 : 0;
  const totalGaps = hasBoth ? gap * 2 : 0;
  const availableCircumference = circumference - totalGaps;

  const incLength = hasBoth
    ? Math.max(stroke, incFrac * availableCircumference)
    : incFrac * circumference;
  const expLength = hasBoth
    ? Math.max(stroke, expFrac * availableCircumference)
    : expFrac * circumference;

  const incOffset = hasBoth ? -gap / 2 : 0;
  const expOffset = hasBoth ? -(gap / 2 + incLength + gap) : 0;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size}>
        {/* Dark background track ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#262B3A"
          strokeWidth={stroke}
          fill="none"
        />

        <G rotation={-90} origin={`${center}, ${center}`}>
          {/* Income arc (Green) with circular rounded caps */}
          {incFrac >= 0.999 ? (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#22C55E"
              strokeWidth={stroke}
              fill="none"
            />
          ) : incFrac > 0 ? (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#22C55E"
              strokeWidth={stroke}
              strokeDasharray={`${incLength} ${circumference}`}
              strokeDashoffset={incOffset}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}

          {/* Expense arc (Red) with circular rounded caps */}
          {expFrac >= 0.999 ? (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#F43F5E"
              strokeWidth={stroke}
              fill="none"
            />
          ) : expFrac > 0 ? (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#F43F5E"
              strokeWidth={stroke}
              strokeDasharray={`${expLength} ${circumference}`}
              strokeDashoffset={expOffset}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
        </G>
      </Svg>
    </View>
  );
}

// ─── Category bar row ─────────────────────────────────────────────────────────
function CategoryBar({
  name,
  pct,
  isIncome,
}: {
  name: string;
  pct: number;
  isIncome: boolean;
}) {
  const barColor = isIncome ? "#22C55E" : "#F43F5E";
  const truncated = name.length > 18 ? name.slice(0, 17) + "…" : name;
  return (
    <View className="mb-2.5">
      <View className="flex-row items-center mb-1">
        <Ionicons
          name={isIncome ? "arrow-up-outline" : "arrow-down-outline"}
          size={12}
          color={barColor}
        />
        <Text
          className="text-dark-text font-semibold text-xs ml-1 flex-1"
          numberOfLines={1}
          style={fonts.semibold}
        >
          {truncated}
        </Text>
        <Text
          className="text-dark-muted font-medium text-[11px] ml-2"
          style={fonts.medium}
        >
          {Math.round(pct)}%
        </Text>
      </View>
      <View className="h-1 bg-dark-border rounded-full overflow-hidden">
        <View
          className={`h-1 rounded-full ${isIncome ? "bg-brand-income" : "bg-brand-expense"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </View>
    </View>
  );
}

// ─── Category stat type ───────────────────────────────────────────────────────
interface CategoryStat {
  id: string;
  name: string;
  isIncome: boolean;
  total: number;
  pct: number;
}

function CategoryPageCard({ items }: { items: CategoryStat[] }) {
  return (
    <View>
      {items.map((c) => (
        <CategoryBar
          key={c.id}
          name={c.name}
          pct={c.pct}
          isIncome={c.isIncome}
        />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface TransactionSummaryCardProps {
  transactions: TransactionItem[];
  periodLabel: string;
}

export function TransactionSummaryCard({
  transactions,
  periodLabel,
}: TransactionSummaryCardProps) {
  const { settings } = useAuth();
  const { width } = useWindowDimensions();

  const [expanded, setExpanded] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [pageWidth, setPageWidth] = useState(Math.max(200, width - 72));
  const flatRef = useRef<FlatList>(null);

  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const catMap: Record<
      string,
      { name: string; isIncome: boolean; total: number }
    > = {};

    for (const t of transactions) {
      if (t.type === "INCOME") totalIncome += t.amount;
      else if (t.type === "EXPENSE") totalExpense += t.amount;

      if (
        (t.type === "INCOME" || t.type === "EXPENSE") &&
        t.categoryId != null
      ) {
        const key = String(t.categoryId);
        if (!catMap[key]) {
          catMap[key] = {
            name: t.categoryName || "Uncategorized",
            isIncome: t.type === "INCOME",
            total: 0,
          };
        }
        catMap[key].total += t.amount;
      }
    }

    const net = totalIncome - totalExpense;
    const grandTotal = totalIncome + totalExpense;
    const incPct = grandTotal > 0 ? (totalIncome / grandTotal) * 100 : 0;
    const expPct = grandTotal > 0 ? (totalExpense / grandTotal) * 100 : 0;

    const categories: CategoryStat[] = Object.entries(catMap).map(
      ([key, c]) => {
        const base = c.isIncome ? totalIncome : totalExpense;
        return {
          id: key,
          name: c.name,
          isIncome: c.isIncome,
          total: c.total,
          pct: base > 0 ? (c.total / base) * 100 : 0,
        };
      },
    );
    categories.sort((a, b) => b.total - a.total);

    return {
      totalIncome,
      totalExpense,
      net,
      txCount: transactions.length,
      incPct,
      expPct,
      categories,
    };
  }, [transactions]);

  const categoryPages = useMemo(() => {
    const pages: CategoryStat[][] = [];
    for (let i = 0; i < stats.categories.length; i += 4) {
      pages.push(stats.categories.slice(i, i + 4));
    }
    return pages;
  }, [stats.categories]);

  const curr = settings?.currency;
  const fmt = settings?.numberFormat;

  return (
    <View className="bg-dark-surface border border-dark-border rounded-2xl mb-3 overflow-hidden">
      {/* ── Collapsed header ── */}
      <View className="p-4">
        {/* Top row: Period label & View logs button with proper spacing */}
        <View className="flex-row items-center justify-between mb-3">
          <Text
            className="text-dark-muted font-bold text-[11px] uppercase tracking-wider flex-1 mr-2"
            numberOfLines={1}
            style={fonts.bold}
          >
            {periodLabel}
          </Text>
          <TouchableOpacity
            onPress={() => setExpanded((v) => !v)}
            activeOpacity={0.7}
            className="bg-dark-card border border-dark-border rounded-full px-3.5 py-1.5"
          >
            <Text
              className="text-dark-text font-semibold text-xs"
              style={fonts.semibold}
            >
              {expanded ? "Hide logs" : "View logs"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Net amount on left + clean circular donut pie on right */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text
              className={`text-[32px] leading-9 font-extrabold ${
                stats.net >= 0 ? "text-brand-income" : "text-brand-expense"
              }`}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={fonts.extrabold}
            >
              {stats.net < 0 ? "-" : "+"}
              {formatCurrency(Math.abs(stats.net), curr, fmt)}
            </Text>
            <Text
              className="text-dark-muted font-medium text-[11px] mt-1"
              style={fonts.medium}
            >
              Net Saving
            </Text>
          </View>
          <DualRingPie
            incomePercent={stats.incPct}
            expensePercent={stats.expPct}
            size={68}
          />
        </View>
      </View>

      {/* ── Expanded section ── */}
      {expanded && (
        <>
          <View className="h-[1px] bg-dark-border" />
          <View className="p-4">
            {/* Tx count + Income + Expense */}
            <View className="flex-row mb-4 gap-4">
              <View className="flex-1">
                <Text
                  className="text-dark-muted font-medium text-[11px] mb-0.5"
                  style={fonts.medium}
                >
                  Transactions
                </Text>
                <Text
                  className="text-dark-text font-bold text-lg"
                  style={fonts.bold}
                >
                  {stats.txCount}
                </Text>
              </View>
              <View className="flex-1">
                <Text
                  className="text-dark-muted font-medium text-[11px] mb-0.5"
                  style={fonts.medium}
                >
                  Income
                </Text>
                <Text
                  className="text-brand-income font-bold text-sm"
                  numberOfLines={1}
                  style={fonts.bold}
                >
                  +{formatCurrency(stats.totalIncome, curr, fmt)}
                </Text>
              </View>
              <View className="flex-1">
                <Text
                  className="text-dark-muted font-medium text-[11px] mb-0.5"
                  style={fonts.medium}
                >
                  Expense
                </Text>
                <Text
                  className="text-brand-expense font-bold text-sm"
                  numberOfLines={1}
                  style={fonts.bold}
                >
                  -{formatCurrency(stats.totalExpense, curr, fmt)}
                </Text>
              </View>
            </View>

            {/* Category-wise summary */}
            {stats.categories.length > 0 && (
              <>
                <Text
                  className="text-dark-muted font-bold text-[11px]  tracking-wider mb-3"
                  style={fonts.bold}
                >
                  Category Wise Summary
                </Text>

                {categoryPages.length === 1 ? (
                  <CategoryPageCard items={categoryPages[0]} />
                ) : (
                  <View
                    onLayout={(e) => {
                      const measuredWidth = Math.round(
                        e.nativeEvent.layout.width,
                      );
                      if (measuredWidth > 0 && measuredWidth !== pageWidth) {
                        setPageWidth(measuredWidth);
                      }
                    }}
                  >
                    <FlatList
                      ref={flatRef}
                      data={categoryPages}
                      horizontal
                      pagingEnabled={Platform.OS === "ios"}
                      snapToInterval={pageWidth}
                      snapToAlignment="start"
                      decelerationRate="fast"
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={(_, i) => String(i)}
                      getItemLayout={(_, index) => ({
                        length: pageWidth,
                        offset: pageWidth * index,
                        index,
                      })}
                      onMomentumScrollEnd={(e) => {
                        if (pageWidth > 0) {
                          setActivePage(
                            Math.round(
                              e.nativeEvent.contentOffset.x / pageWidth,
                            ),
                          );
                        }
                      }}
                      renderItem={({ item }) => (
                        <View style={{ width: pageWidth }}>
                          <CategoryPageCard items={item} />
                        </View>
                      )}
                    />
                    <View className="flex-row justify-center mt-3 gap-1.5 items-center">
                      {categoryPages.map((_, i) => (
                        <View
                          key={i}
                          className={`h-1.5 rounded-full ${
                            i === activePage
                              ? "w-4 bg-dark-text"
                              : "w-1.5 bg-dark-border"
                          }`}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {stats.categories.length === 0 && (
              <Text
                className="text-dark-muted font-medium text-xs text-center py-2"
                style={fonts.medium}
              >
                No categorised transactions in this period.
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

export default TransactionSummaryCard;
