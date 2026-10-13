import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../../context/auth";
import { TransactionItem } from "../../context/transactions";
import { formatCurrency } from "../../services/currency";

// ─── Dual-ring Pie ────────────────────────────────────────────────────────────
function DualRingPie({
  incomePercent,
  expensePercent,
  size = 72,
}: {
  incomePercent: number;
  expensePercent: number;
  size?: number;
}) {
  const stroke = Math.round(size * 0.11);
  const totalPercent = Math.min(incomePercent + expensePercent, 100);
  const incPct = totalPercent > 0 ? (incomePercent / totalPercent) * 100 : 0;
  const expPct = totalPercent > 0 ? (expensePercent / totalPercent) * 100 : 0;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background ring */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: "#262B3A",
        }}
      />

      {/* Expense arc (red) */}
      {expPct > 0 && (
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: "#F43F5E",
            borderTopColor: "transparent",
            borderRightColor: expPct > 50 ? "#F43F5E" : "transparent",
            borderBottomColor: "#F43F5E",
            borderLeftColor: expPct > 75 ? "#F43F5E" : "transparent",
            transform: [{ rotate: `${-90 + (incPct / 100) * 360}deg` }],
          }}
        />
      )}

      {/* Income arc (green) */}
      {incPct > 0 && (
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: "#22C55E",
            borderTopColor: "#22C55E",
            borderRightColor: incPct > 25 ? "#22C55E" : "transparent",
            borderBottomColor: incPct > 50 ? "#22C55E" : "transparent",
            borderLeftColor: incPct > 75 ? "#22C55E" : "transparent",
            transform: [{ rotate: "-90deg" }],
          }}
        />
      )}

      {/* Center label */}
      <View style={{ alignItems: "center" }}>
        <Text
          style={{
            color: "#F8FAFC",
            fontSize: Math.round(size * 0.17),
            fontFamily: "DMSans_700Bold",
            lineHeight: Math.round(size * 0.22),
          }}
        >
          {Math.round(expensePercent)}%
        </Text>
        <Text
          style={{
            color: "#60677C",
            fontSize: Math.round(size * 0.13),
            fontFamily: "DMSans_500Medium",
          }}
        >
          exp
        </Text>
      </View>
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
  const truncated = name.length > 14 ? name.slice(0, 13) + "…" : name;
  return (
    <View style={{ marginBottom: 10 }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}
      >
        <Ionicons
          name={isIncome ? "arrow-up-outline" : "arrow-down-outline"}
          size={12}
          color={barColor}
        />
        <Text
          style={{
            color: "#F8FAFC",
            fontSize: 12,
            fontFamily: "DMSans_600SemiBold",
            marginLeft: 4,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {truncated}
        </Text>
        <Text
          style={{
            color: "#60677C",
            fontSize: 11,
            fontFamily: "DMSans_500Medium",
            marginLeft: 8,
          }}
        >
          {Math.round(pct)}%
        </Text>
      </View>
      <View
        style={{
          height: 4,
          backgroundColor: "#262B3A",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: barColor,
            width: `${Math.min(pct, 100)}%`,
          }}
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
  const cardWidth = width - 40;

  const [expanded, setExpanded] = useState(false);
  const [activePage, setActivePage] = useState(0);
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
    <View
      style={{
        backgroundColor: "#141720",
        borderWidth: 1,
        borderColor: "#262B3A",
        borderRadius: 20,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      {/* ── Collapsed header ── */}
      <View style={{ padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: "#60677C",
              fontSize: 11,
              fontFamily: "DMSans_700Bold",
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {periodLabel}
          </Text>
          <TouchableOpacity
            onPress={() => setExpanded((v) => !v)}
            activeOpacity={0.7}
            style={{
              backgroundColor: "#1B1F2B",
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: "#262B3A",
            }}
          >
            <Text
              style={{
                color: "#F8FAFC",
                fontSize: 12,
                fontFamily: "DMSans_600SemiBold",
              }}
            >
              {expanded ? "Hide logs" : "View logs"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Net amount + pie */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text
              style={{
                color: stats.net >= 0 ? "#22C55E" : "#F43F5E",
                fontSize: 34,
                fontFamily: "DMSans_800ExtraBold",
                lineHeight: 40,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {stats.net < 0 ? "-" : "+"}
              {formatCurrency(Math.abs(stats.net), curr, fmt)}
            </Text>
            <Text
              style={{
                color: "#60677C",
                fontSize: 11,
                fontFamily: "DMSans_500Medium",
                marginTop: 2,
              }}
            >
              Income − Expense
            </Text>
          </View>
          <DualRingPie
            incomePercent={stats.incPct}
            expensePercent={stats.expPct}
            size={72}
          />
        </View>
      </View>

      {/* ── Expanded section ── */}
      {expanded && (
        <>
          <View style={{ height: 1, backgroundColor: "#262B3A" }} />
          <View style={{ padding: 16 }}>
            {/* Tx count + Income + Expense */}
            <View style={{ flexDirection: "row", marginBottom: 18, gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#60677C",
                    fontSize: 11,
                    fontFamily: "DMSans_500Medium",
                    marginBottom: 2,
                  }}
                >
                  Transactions
                </Text>
                <Text
                  style={{
                    color: "#F8FAFC",
                    fontSize: 18,
                    fontFamily: "DMSans_700Bold",
                  }}
                >
                  {stats.txCount}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#60677C",
                    fontSize: 11,
                    fontFamily: "DMSans_500Medium",
                    marginBottom: 2,
                  }}
                >
                  Income
                </Text>
                <Text
                  style={{
                    color: "#22C55E",
                    fontSize: 14,
                    fontFamily: "DMSans_700Bold",
                  }}
                  numberOfLines={1}
                >
                  +{formatCurrency(stats.totalIncome, curr, fmt)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#60677C",
                    fontSize: 11,
                    fontFamily: "DMSans_500Medium",
                    marginBottom: 2,
                  }}
                >
                  Expense
                </Text>
                <Text
                  style={{
                    color: "#F43F5E",
                    fontSize: 14,
                    fontFamily: "DMSans_700Bold",
                  }}
                  numberOfLines={1}
                >
                  -{formatCurrency(stats.totalExpense, curr, fmt)}
                </Text>
              </View>
            </View>

            {/* Category-wise summary */}
            {stats.categories.length > 0 && (
              <>
                <Text
                  style={{
                    color: "#60677C",
                    fontSize: 11,
                    fontFamily: "DMSans_700Bold",
                    letterSpacing: 0.8,
                    marginBottom: 12,
                  }}
                >
                  Category wise summary
                </Text>

                {categoryPages.length === 1 ? (
                  <CategoryPageCard items={categoryPages[0]} />
                ) : (
                  <>
                    <FlatList
                      ref={flatRef}
                      data={categoryPages}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={(_, i) => String(i)}
                      onMomentumScrollEnd={(e) => {
                        setActivePage(
                          Math.round(e.nativeEvent.contentOffset.x / cardWidth),
                        );
                      }}
                      renderItem={({ item }) => (
                        <View style={{ width: cardWidth - 32 }}>
                          <CategoryPageCard items={item} />
                        </View>
                      )}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        marginTop: 10,
                        gap: 5,
                      }}
                    >
                      {categoryPages.map((_, i) => (
                        <View
                          key={i}
                          style={{
                            width: i === activePage ? 16 : 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor:
                              i === activePage ? "#F8FAFC" : "#262B3A",
                          }}
                        />
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            {stats.categories.length === 0 && (
              <Text
                style={{
                  color: "#60677C",
                  fontSize: 12,
                  fontFamily: "DMSans_500Medium",
                  textAlign: "center",
                  paddingVertical: 8,
                }}
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
