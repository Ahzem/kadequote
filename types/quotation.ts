export type ItemCategory = 'material' | 'labour' | 'service' | 'other';
export type QuotationStatus = 'draft' | 'finalized';
export type DiscountType = 'fixed' | 'percentage';

export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  category: ItemCategory;
  needsReview: boolean;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface QuotationCalculationSummary {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  additionalCharges: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
  issueDate: string;
  validUntilDate: string;
  customer: CustomerDetails;
  jobTitle: string;
  rawNotes?: string;
  items: QuotationItem[];
  currency: string;
  discount: number;
  discountType: DiscountType;
  additionalCharges: number;
  additionalChargesDescription?: string;
  taxRate: number;
  taxEnabled: boolean;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  notes: string;
  terms: string;
}

export interface QuotationNumberingState {
  prefix: string;
  year: number;
  lastSequence: number;
}
