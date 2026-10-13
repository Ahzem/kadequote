import { ItemCategory } from './quotation';

export interface PriceListItem {
  id: string;
  name: string;
  category: ItemCategory;
  unit: string;
  defaultPrice: number;
  description?: string;
}

export interface BusinessProfile {
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  logoBase64?: string;
  defaultCurrency: string;
  defaultValidityDays: number;
  defaultTerms: string;
  defaultLabourRate?: number;
  priceList: PriceListItem[];
}

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  name: 'Apex Electrical & Plumbing Services',
  ownerName: 'Sunil Perera',
  phone: '+94 77 123 4567',
  email: 'apex.services@example.com',
  address: '142 Temple Road, Colombo 03, Sri Lanka',
  defaultCurrency: 'LKR',
  defaultValidityDays: 14,
  defaultTerms: '1. Quotation valid for 14 days from issue date.\n2. 50% advance payment required upon job confirmation.\n3. Balance payable upon successful completion & inspection.\n4. Materials warranty as per manufacturer policy.',
  defaultLabourRate: 2500,
  priceList: [
    { id: 'pl-1', name: 'Electrical switch replacement (Single)', category: 'material', unit: 'piece', defaultPrice: 450 },
    { id: 'pl-2', name: 'Electrical socket replacement (13A)', category: 'material', unit: 'piece', defaultPrice: 800 },
    { id: 'pl-3', name: 'Copper pipe 1/2 inch', category: 'material', unit: 'meter', defaultPrice: 1200 },
    { id: 'pl-4', name: 'Standard electrical diagnostic & inspection', category: 'labour', unit: 'hour', defaultPrice: 2000 },
    { id: 'pl-5', name: 'Full socket / switch wiring labour', category: 'labour', unit: 'point', defaultPrice: 1500 },
    { id: 'pl-6', name: 'Circuit breaker (MCB 16A/20A)', category: 'material', unit: 'piece', defaultPrice: 1650 },
  ],
};
