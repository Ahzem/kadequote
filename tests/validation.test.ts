import { describe, it, expect } from 'vitest';
import {
  AIRawOutputSchema,
  AIParseRequestSchema,
  QuotationFormSchema,
  BackupDataSchema,
} from '../lib/validation/quotation';
import { extractAndParseJSON } from '../lib/ai/ollama';

describe('Validation Schemas', () => {
  describe('AI Output Validation and Parsing', () => {
    it('correctly parses valid structured JSON output from Gemma', () => {
      const mockRaw = {
        customerName: null,
        customerAddress: null,
        jobTitle: 'Electrical switch repair',
        items: [
          {
            description: 'Electrical switch',
            quantity: 3,
            unit: 'piece',
            unitPrice: 450,
            category: 'material',
            needsReview: false,
          },
          {
            description: 'Labour for repair',
            quantity: 1,
            unit: 'job',
            unitPrice: 2500,
            category: 'labour',
            needsReview: false,
          },
        ],
        notes: ['Done with care'],
        requiresReview: false,
      };

      const result = AIRawOutputSchema.parse(mockRaw);
      expect(result.jobTitle).toBe('Electrical switch repair');
      expect(result.customerName).toBeNull();
      expect(result.items).toHaveLength(2);
      expect(result.items[0].quantity).toBe(3);
      expect(result.items[0].unitPrice).toBe(450);
      expect(result.items[0].category).toBe('material');
    });

    it('coerces string numbers and handles missing/null prices appropriately', () => {
      const mockWithStringsAndNulls = {
        customerName: 'Kamal Perera',
        jobTitle: 'Plumbing leak',
        items: [
          {
            description: 'PVC pipe',
            quantity: '2.5',
            unit: 'meter',
            unitPrice: '1200',
            category: 'material',
          },
          {
            description: 'Glue / Sealant',
            quantity: '1',
            unit: 'tube',
            unitPrice: null, // missing price
            category: 'material',
          },
        ],
      };

      const result = AIRawOutputSchema.parse(mockWithStringsAndNulls);
      expect(result.customerName).toBe('Kamal Perera');
      expect(result.items[0].quantity).toBe(2.5);
      expect(result.items[0].unitPrice).toBe(1200);
      expect(result.items[1].unitPrice).toBeNull();
    });

    it('handles categories flexibly (e.g. materials -> material, labor -> labour)', () => {
      const mockCategories = {
        jobTitle: 'Test',
        items: [
          { description: 'Cable', quantity: 1, unitPrice: 100, category: 'materials' },
          { description: 'Wiring', quantity: 1, unitPrice: 200, category: 'labor' },
          { description: 'Testing', quantity: 1, unitPrice: 300, category: 'service' },
        ],
      };

      const result = AIRawOutputSchema.parse(mockCategories);
      expect(result.items[0].category).toBe('material');
      expect(result.items[1].category).toBe('labour');
      expect(result.items[2].category).toBe('service');
    });

    it('extracts JSON cleanly from markdown code fences or conversational text', () => {
      const markdownWrapped = 'Here is your quotation:\n```json\n{"jobTitle": "Ceiling Fan", "items": []}\n```\nHope this helps!';
      const extracted = extractAndParseJSON(markdownWrapped) as { jobTitle: string };
      expect(extracted.jobTitle).toBe('Ceiling Fan');

      const plainJson = '{"jobTitle": "Direct Object", "items": []}';
      expect((extractAndParseJSON(plainJson) as { jobTitle: string }).jobTitle).toBe('Direct Object');
    });
  });

  describe('AI Request Validation', () => {
    it('accepts valid notes', () => {
      const valid = AIParseRequestSchema.safeParse({ notes: 'Fix 2 lights in hallway' });
      expect(valid.success).toBe(true);
    });

    it('rejects too short or empty notes', () => {
      const invalid = AIParseRequestSchema.safeParse({ notes: 'a' });
      expect(invalid.success).toBe(false);
    });

    it('rejects notes exceeding 4000 characters', () => {
      const longNotes = 'a'.repeat(4005);
      const invalid = AIParseRequestSchema.safeParse({ notes: longNotes });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Quotation Form Validation', () => {
    it('accepts a fully valid quotation form payload', () => {
      const validForm = {
        quotationNumber: 'KQ-2026-0001',
        status: 'draft',
        issueDate: '2026-10-13',
        validUntilDate: '2026-10-27',
        customer: {
          name: 'Nimal Silva',
          phone: '+94 71 234 5678',
          email: 'nimal@example.com',
          address: 'Colombo, Sri Lanka',
        },
        jobTitle: 'Bathroom Electrical Installation',
        items: [
          {
            id: 'item-1',
            description: 'Waterproof Light Fixture',
            quantity: 2,
            unit: 'piece',
            unitPrice: 3500,
            lineTotal: 7000,
            category: 'material',
            needsReview: false,
          },
        ],
        currency: 'LKR',
        discount: 0,
        discountType: 'fixed',
        additionalCharges: 0,
        taxRate: 0,
        taxEnabled: false,
        notes: '',
        terms: '',
      };

      const result = QuotationFormSchema.safeParse(validForm);
      expect(result.success).toBe(true);
    });

    it('fails when items array is empty', () => {
      const emptyItems = {
        quotationNumber: 'KQ-2026-0001',
        status: 'draft',
        issueDate: '2026-10-13',
        validUntilDate: '2026-10-27',
        customer: { name: 'Test' },
        jobTitle: 'Test Job',
        items: [],
      };

      const result = QuotationFormSchema.safeParse(emptyItems);
      expect(result.success).toBe(false);
    });
  });

  describe('Data Import / Backup Validation', () => {
    it('validates a genuine backup payload', () => {
      const genuine = {
        version: '1.0',
        exportedAt: '2026-10-13T06:00:00Z',
        quotations: [
          {
            id: 'q1',
            quotationNumber: 'KQ-2026-0001',
            status: 'draft',
          },
        ],
        businessProfile: { name: 'My Business' },
      };

      const result = BackupDataSchema.safeParse(genuine);
      expect(result.success).toBe(true);
    });

    it('rejects corrupt backup file missing required metadata or invalid types', () => {
      const corrupted = {
        randomGarbage: 12345,
      };

      const result = BackupDataSchema.safeParse(corrupted);
      expect(result.success).toBe(false);
    });
  });
});
