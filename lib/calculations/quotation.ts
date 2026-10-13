import { QuotationItem, QuotationCalculationSummary, DiscountType } from '@/types/quotation';

/**
 * Rounds a number deterministically to two decimal places, avoiding floating-point precision issues.
 */
export function round2(num: number): number {
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates line total for a single quotation item.
 * Guarantees non-negative results and 2-decimal precision.
 */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  const safeQty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
  const safePrice = Math.max(0, Number.isFinite(unitPrice) ? unitPrice : 0);
  return round2(safeQty * safePrice);
}

export interface CalculationInput {
  items: Array<Pick<QuotationItem, 'quantity' | 'unitPrice' | 'lineTotal'>>;
  discount: number;
  discountType: DiscountType;
  additionalCharges: number;
  taxRate: number;
  taxEnabled: boolean;
}

/**
 * Computes all financial totals deterministically:
 * subtotal = sum of all line totals
 * discountAmount = calculated based on fixed or percentage, capped at subtotal
 * taxAmount = calculated on taxable base (discounted subtotal + additional charges) if taxEnabled
 * total = subtotal - discountAmount + additionalCharges + taxAmount
 */
export function calculateQuotationTotals(input: CalculationInput): QuotationCalculationSummary {
  // 1. Calculate subtotal
  const subtotal = round2(
    input.items.reduce((sum, item) => {
      const line = Number.isFinite(item.lineTotal)
        ? item.lineTotal
        : calculateLineTotal(item.quantity, item.unitPrice);
      return sum + Math.max(0, line);
    }, 0)
  );

  // 2. Calculate discount
  const rawDiscount = Math.max(0, Number.isFinite(input.discount) ? input.discount : 0);
  let discountAmount = 0;

  if (input.discountType === 'percentage') {
    const safeRate = Math.min(100, rawDiscount);
    discountAmount = round2(subtotal * (safeRate / 100));
  } else {
    discountAmount = round2(Math.min(subtotal, rawDiscount));
  }

  // 3. Additional charges
  const additionalCharges = round2(
    Math.max(0, Number.isFinite(input.additionalCharges) ? input.additionalCharges : 0)
  );

  // 4. Tax
  let taxAmount = 0;
  if (input.taxEnabled) {
    const safeTaxRate = Math.min(100, Math.max(0, Number.isFinite(input.taxRate) ? input.taxRate : 0));
    const taxableBase = Math.max(0, subtotal - discountAmount + additionalCharges);
    taxAmount = round2(taxableBase * (safeTaxRate / 100));
  }

  // 5. Total
  const total = round2(
    Math.max(0, subtotal - discountAmount + additionalCharges + taxAmount)
  );

  return {
    subtotal,
    discountAmount,
    additionalCharges,
    taxAmount,
    total,
  };
}

/**
 * Supported currencies in KadeQuote
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'LKR', symbol: 'Rs.', name: 'Sri Lankan Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
] as const;

/**
 * Formats a currency amount nicely with commas and 2 decimal places.
 */
export function formatCurrency(amount: number, currencyCode: string = 'LKR'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const currencyInfo = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  const symbol = currencyInfo ? currencyInfo.symbol : currencyCode;

  try {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
    return `${symbol} ${formatted}`;
  } catch {
    return `${symbol} ${safeAmount.toFixed(2)}`;
  }
}
