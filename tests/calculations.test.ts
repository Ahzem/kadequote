import { describe, it, expect } from 'vitest';
import {
  calculateLineTotal,
  calculateQuotationTotals,
  round2,
  formatCurrency,
} from '../lib/calculations/quotation';

describe('Quotation Calculations', () => {
  describe('round2', () => {
    it('rounds numbers to 2 decimal places deterministically', () => {
      expect(round2(10.254)).toBe(10.25);
      expect(round2(10.256)).toBe(10.26);
      expect(round2(0)).toBe(0);
      expect(round2(-5)).toBe(-5);
      expect(round2(NaN)).toBe(0);
      expect(round2(Infinity)).toBe(0);
    });
  });

  describe('calculateLineTotal', () => {
    it('calculates quantity multiplied by unit price', () => {
      expect(calculateLineTotal(3, 450)).toBe(1350);
      expect(calculateLineTotal(2.5, 1200)).toBe(3000);
      expect(calculateLineTotal(1, 2500)).toBe(2500);
    });

    it('safely handles zero and negative numbers', () => {
      expect(calculateLineTotal(0, 500)).toBe(0);
      expect(calculateLineTotal(3, 0)).toBe(0);
      expect(calculateLineTotal(-2, 500)).toBe(0);
      expect(calculateLineTotal(2, -500)).toBe(0);
    });

    it('handles decimal quantities and prices without floating point quirks', () => {
      expect(calculateLineTotal(3, 33.33)).toBe(99.99);
      expect(calculateLineTotal(0.33, 10)).toBe(3.3);
    });
  });

  describe('calculateQuotationTotals', () => {
    it('calculates subtotal from multiple line items', () => {
      const items = [
        { quantity: 3, unitPrice: 450, lineTotal: 1350 },
        { quantity: 1, unitPrice: 800, lineTotal: 800 },
        { quantity: 1, unitPrice: 2500, lineTotal: 2500 },
      ];
      const result = calculateQuotationTotals({
        items,
        discount: 0,
        discountType: 'fixed',
        additionalCharges: 0,
        taxRate: 0,
        taxEnabled: false,
      });

      expect(result.subtotal).toBe(4650);
      expect(result.discountAmount).toBe(0);
      expect(result.additionalCharges).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(4650);
    });

    it('applies fixed monetary discount correctly', () => {
      const items = [{ quantity: 1, unitPrice: 5000, lineTotal: 5000 }];
      const result = calculateQuotationTotals({
        items,
        discount: 500,
        discountType: 'fixed',
        additionalCharges: 0,
        taxRate: 0,
        taxEnabled: false,
      });

      expect(result.subtotal).toBe(5000);
      expect(result.discountAmount).toBe(500);
      expect(result.total).toBe(4500);
    });

    it('caps fixed discount at subtotal (cannot exceed total items)', () => {
      const items = [{ quantity: 1, unitPrice: 1000, lineTotal: 1000 }];
      const result = calculateQuotationTotals({
        items,
        discount: 1500,
        discountType: 'fixed',
        additionalCharges: 0,
        taxRate: 0,
        taxEnabled: false,
      });

      expect(result.discountAmount).toBe(1000);
      expect(result.total).toBe(0);
    });

    it('applies percentage discount correctly', () => {
      const items = [{ quantity: 2, unitPrice: 1000, lineTotal: 2000 }];
      const result = calculateQuotationTotals({
        items,
        discount: 10, // 10%
        discountType: 'percentage',
        additionalCharges: 0,
        taxRate: 0,
        taxEnabled: false,
      });

      expect(result.subtotal).toBe(2000);
      expect(result.discountAmount).toBe(200);
      expect(result.total).toBe(1800);
    });

    it('adds additional charges to total', () => {
      const items = [{ quantity: 1, unitPrice: 3000, lineTotal: 3000 }];
      const result = calculateQuotationTotals({
        items,
        discount: 0,
        discountType: 'fixed',
        additionalCharges: 450, // e.g. transport
        taxRate: 0,
        taxEnabled: false,
      });

      expect(result.additionalCharges).toBe(450);
      expect(result.total).toBe(3450);
    });

    it('ignores tax when taxEnabled is false', () => {
      const items = [{ quantity: 1, unitPrice: 2000, lineTotal: 2000 }];
      const result = calculateQuotationTotals({
        items,
        discount: 0,
        discountType: 'fixed',
        additionalCharges: 0,
        taxRate: 15,
        taxEnabled: false,
      });

      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(2000);
    });

    it('calculates optional tax accurately when enabled', () => {
      const items = [{ quantity: 1, unitPrice: 2000, lineTotal: 2000 }];
      const result = calculateQuotationTotals({
        items,
        discount: 200, // discounted subtotal = 1800
        discountType: 'fixed',
        additionalCharges: 200, // taxable base = 2000
        taxRate: 15, // 15% of 2000 = 300
        taxEnabled: true,
      });

      expect(result.subtotal).toBe(2000);
      expect(result.discountAmount).toBe(200);
      expect(result.additionalCharges).toBe(200);
      expect(result.taxAmount).toBe(300);
      expect(result.total).toBe(2300);
    });

    it('protects against invalid negative charges or discounts', () => {
      const items = [{ quantity: 1, unitPrice: 1000, lineTotal: 1000 }];
      const result = calculateQuotationTotals({
        items,
        discount: -200,
        discountType: 'fixed',
        additionalCharges: -500,
        taxRate: -10,
        taxEnabled: true,
      });

      expect(result.discountAmount).toBe(0);
      expect(result.additionalCharges).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(1000);
    });
  });

  describe('formatCurrency', () => {
    it('formats LKR correctly', () => {
      expect(formatCurrency(2500, 'LKR')).toContain('Rs.');
      expect(formatCurrency(2500, 'LKR')).toContain('2,500.00');
    });

    it('formats USD correctly', () => {
      expect(formatCurrency(120.5, 'USD')).toContain('$');
      expect(formatCurrency(120.5, 'USD')).toContain('120.50');
    });

    it('formats EUR correctly', () => {
      expect(formatCurrency(99, 'EUR')).toContain('€');
      expect(formatCurrency(99, 'EUR')).toContain('99.00');
    });
  });
});
