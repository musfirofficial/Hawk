import { SUPPORTED_CURRENCIES } from "../db/schema";

/**
 * Returns the currency symbol for a given ISO currency code.
 */
export function getCurrencySymbol(
  currencyCode?: string | null
): string {
  if (!currencyCode || !currencyCode.trim()) {
    return "$";
  }
  const clean = currencyCode.trim();

  // Check if currencyCode is already a recognized symbol
  const bySymbol = SUPPORTED_CURRENCIES.find((c) => c.symbol === clean);
  if (bySymbol) return bySymbol.symbol;

  // Check by ISO code (case-insensitive)
  const byCode = SUPPORTED_CURRENCIES.find(
    (c) => c.code.toUpperCase() === clean.toUpperCase()
  );
  if (byCode) return byCode.symbol;

  return clean || "$";
}

/**
 * Formats a monetary amount according to the user's currency and number format preference.
 * - COMMA_DOT: 1,234.56
 * - DOT_COMMA: 1.234,56
 */
export function formatCurrency(
  amount: number,
  currencyCode?: string | null,
  numberFormat?: string | null
): string {
  const symbol = getCurrencySymbol(currencyCode);
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount || 0);

  const parts = absAmount.toFixed(2).split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];

  let formattedNumber = "";

  if (numberFormat === "DOT_COMMA") {
    // Thousands separated by dot, decimals by comma
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    formattedNumber = `${integerPart},${decimalPart}`;
  } else {
    // Thousands separated by comma, decimals by dot (COMMA_DOT default)
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    formattedNumber = `${integerPart}.${decimalPart}`;
  }

  // Spacing for multi-character symbols like "Rs", "د.إ", "Fr"
  const needsSpace = symbol.length > 1;
  const symbolPrefix = needsSpace ? `${symbol} ` : symbol;

  return isNegative
    ? `-${symbolPrefix}${formattedNumber}`
    : `${symbolPrefix}${formattedNumber}`;
}
