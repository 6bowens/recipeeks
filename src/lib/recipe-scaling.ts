/**
 * Mealie-Grade Ingredient Fraction Math & Scaling Engine
 */

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

/**
 * Parses any numeric, decimal, mixed fraction, or unicode fraction string into a float.
 * Examples: "1 1/2" -> 1.5, "3/4" -> 0.75, "2.5" -> 2.5, "½" -> 0.5, "1 ½" -> 1.5
 */
export function parseQuantity(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;

  let str = raw.trim();
  if (!str) return null;

  // Replace unicode fractions with space + decimal or value
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (str.includes(char)) {
      str = str.replace(char, ` ${val} `).trim();
    }
  }

  // Check for range like "2-4" -> average or take first
  if (str.includes('-') && !str.startsWith('-')) {
    const parts = str.split('-').map((p) => parseQuantity(p.trim())).filter((n): n is number => n !== null);
    if (parts.length === 2) {
      return (parts[0] + parts[1]) / 2;
    }
  }

  // Split by whitespace: e.g. ["1", "1/2"] or ["1", "0.5"]
  const parts = str.split(/\s+/);
  let total = 0;

  for (const part of parts) {
    if (part.includes('/')) {
      const [numStr, denStr] = part.split('/');
      const num = parseFloat(numStr);
      const den = parseFloat(denStr);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        total += num / den;
      }
    } else {
      const val = parseFloat(part);
      if (!isNaN(val)) {
        total += val;
      }
    }
  }

  return total > 0 ? total : null;
}

/**
 * Converts a decimal float back into a clean culinary fraction representation.
 * Examples: 1.5 -> "1 1/2", 0.75 -> "3/4", 0.333 -> "1/3", 2 -> "2"
 */
export function formatQuantity(val: number): string {
  if (val <= 0 || isNaN(val)) return '';

  const whole = Math.floor(val);
  const remainder = val - whole;

  if (remainder < 0.05) {
    return whole.toString();
  }
  if (remainder > 0.95) {
    return (whole + 1).toString();
  }

  // Match closest culinary fraction denominator (2, 3, 4, 8)
  const fractions: [number, string][] = [
    [1 / 8, '1/8'],
    [1 / 4, '1/4'],
    [1 / 3, '1/3'],
    [3 / 8, '3/8'],
    [1 / 2, '1/2'],
    [5 / 8, '5/8'],
    [2 / 3, '2/3'],
    [3 / 4, '3/4'],
    [7 / 8, '7/8'],
  ];

  let closestFraction = '1/2';
  let minDiff = 1;

  for (const [fracVal, fracStr] of fractions) {
    const diff = Math.abs(remainder - fracVal);
    if (diff < minDiff) {
      minDiff = diff;
      closestFraction = fracStr;
    }
  }

  if (minDiff < 0.08) {
    return whole > 0 ? `${whole} ${closestFraction}` : closestFraction;
  }

  // Fallback: round to 1 decimal place if unusual fraction
  return (Math.round(val * 10) / 10).toString();
}

/**
 * Scales an ingredient amount string by a given multiplier factor.
 * E.g., scaleIngredientAmount("1 1/2", 2) -> "3"
 * scaleIngredientAmount("3/4", 0.5) -> "3/8"
 */
export function scaleIngredientAmount(amount: string | null | undefined, factor: number): string {
  if (!amount || factor === 1) return amount || '';

  const parsed = parseQuantity(amount);
  if (parsed === null) return amount;

  const scaled = parsed * factor;
  return formatQuantity(scaled);
}
