import { ItemCategory } from './quotation';
import { PriceListItem } from './business';

export interface AIParsedItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  category: ItemCategory;
  needsReview: boolean;
}

export interface AIParsedQuotation {
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  jobTitle: string;
  items: AIParsedItem[];
  notes: string[];
  requiresReview: boolean;
}

export interface AIParseRequest {
  notes: string;
  priceList?: PriceListItem[];
  businessContext?: {
    currency?: string;
    defaultLabourRate?: number;
  };
}

export interface OllamaStatusResponse {
  connected: boolean;
  model: string;
  modelInstalled: boolean;
  availableModels: string[];
  error?: string;
  latencyMs?: number;
}
