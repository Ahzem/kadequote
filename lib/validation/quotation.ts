import { z } from 'zod';

export const ItemCategorySchema = z.enum(['material', 'labour', 'service', 'other']);

export const QuotationItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative'),
  unit: z.string().default('piece'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  lineTotal: z.coerce.number().min(0),
  category: ItemCategorySchema.default('material'),
  needsReview: z.boolean().default(false),
});

export const CustomerDetailsSchema = z.object({
  name: z.string().trim(),
  phone: z.string().trim().default(''),
  email: z.string().trim().default(''),
  address: z.string().trim().default(''),
});

export const QuotationFormSchema = z.object({
  quotationNumber: z.string().min(1),
  status: z.enum(['draft', 'finalized']),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid issue date required (YYYY-MM-DD)'),
  validUntilDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid validity date required (YYYY-MM-DD)'),
  customer: CustomerDetailsSchema,
  jobTitle: z.string().trim().min(1, 'Job title or project name is required'),
  rawNotes: z.string().optional(),
  items: z.array(QuotationItemSchema).min(1, 'At least one quotation item is required'),
  currency: z.string().default('LKR'),
  discount: z.coerce.number().min(0).default(0),
  discountType: z.enum(['fixed', 'percentage']).default('fixed'),
  additionalCharges: z.coerce.number().min(0).default(0),
  additionalChargesDescription: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  taxEnabled: z.boolean().default(false),
  notes: z.string().default(''),
  terms: z.string().default(''),
});

export const AIParseRequestSchema = z.object({
  notes: z.string().min(2, 'Job notes are too short (minimum 2 characters)').max(4000, 'Job notes too long (max 4000 characters)'),
  priceList: z.array(
    z.object({
      id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
      name: z.string(),
      category: ItemCategorySchema.default('material'),
      unit: z.string(),
      defaultPrice: z.coerce.number(),
    })
  ).optional(),
  businessContext: z.object({
    currency: z.string().optional(),
    defaultLabourRate: z.coerce.number().optional(),
  }).optional(),
});

/**
 * Tolerant schema for AI model output parsing.
 * Gemma 3 1B may return nulls, string numbers, or slight variations.
 */
export const AIItemRawSchema = z.object({
  description: z.string().default('Unspecified item'),
  quantity: z.preprocess((val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/[^0-9.]/g, ''));
      return isNaN(parsed) ? 1 : parsed;
    }
    return 1;
  }, z.number().min(0).default(1)),
  unit: z.string().nullish().transform((val) => val || 'piece'),
  unitPrice: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val >= 0 ? val : null;
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/[^0-9.]/g, ''));
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }, z.number().min(0).nullable().default(null)),
  category: z.preprocess((val) => {
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim();
      if (['material', 'materials', 'part', 'parts', 'item', 'hardware'].includes(lower)) return 'material';
      if (['service', 'services', 'diagnostic', 'travel', 'inspection', 'consultation'].includes(lower)) return 'service';
      if (['labour', 'labor', 'work', 'installation', 'repair'].includes(lower)) return 'labour';
      if (['other', 'misc', 'miscellaneous'].includes(lower)) return 'other';
    }
    return 'material';
  }, ItemCategorySchema.default('material')),
  needsReview: z.boolean().default(false),
});

export const AIRawOutputSchema = z.object({
  customerName: z.string().nullish().transform((v) => (v && v.trim().length > 0 && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'unknown' ? v.trim() : null)),
  customerPhone: z.string().nullish().transform((v) => (v && v.trim().length > 0 && v.toLowerCase() !== 'null' ? v.trim() : null)),
  customerAddress: z.string().nullish().transform((v) => (v && v.trim().length > 0 && v.toLowerCase() !== 'null' ? v.trim() : null)),
  jobTitle: z.string().nullish().transform((v) => (v && v.trim().length > 0 ? v.trim() : 'Quotation Estimate')),
  items: z.array(AIItemRawSchema).default([]),
  notes: z.preprocess((val) => {
    if (Array.isArray(val)) return val.map(String).filter((s) => s.trim().length > 0);
    if (typeof val === 'string' && val.trim().length > 0) return [val.trim()];
    return [];
  }, z.array(z.string())).default([]),
  requiresReview: z.boolean().default(false),
});

/**
 * Backup / Import validation schema
 */
export const BackupDataSchema = z.object({
  version: z.string().default('1.0'),
  exportedAt: z.string(),
  quotations: z.array(z.any()),
  businessProfile: z.any().optional(),
  numberingState: z.any().optional(),
});
