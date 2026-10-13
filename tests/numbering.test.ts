import { describe, it, expect } from 'vitest';

function formatQuotationNumber(prefix: string, year: number, sequence: number): string {
  const padded = String(sequence).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}

describe('Quotation Numbering', () => {
  it('formats quotation numbers with 4-digit zero padding', () => {
    expect(formatQuotationNumber('KQ', 2026, 1)).toBe('KQ-2026-0001');
    expect(formatQuotationNumber('KQ', 2026, 42)).toBe('KQ-2026-0042');
    expect(formatQuotationNumber('KQ', 2026, 999)).toBe('KQ-2026-0999');
    expect(formatQuotationNumber('KQ', 2026, 1000)).toBe('KQ-2026-1000');
  });

  it('preserves custom prefixes', () => {
    expect(formatQuotationNumber('EST', 2026, 7)).toBe('EST-2026-0007');
    expect(formatQuotationNumber('INV', 2026, 15)).toBe('INV-2026-0015');
  });
});
