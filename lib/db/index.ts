import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Quotation, QuotationNumberingState } from '@/types/quotation';
import { BusinessProfile, DEFAULT_BUSINESS_PROFILE } from '@/types/business';
import { BackupDataSchema } from '@/lib/validation/quotation';

interface KadeQuoteDB extends DBSchema {
  quotations: {
    key: string;
    value: Quotation;
    indexes: {
      'by-status': string;
      'by-created': string;
      'by-number': string;
    };
  };
  businessProfile: {
    key: string;
    value: BusinessProfile;
  };
  settings: {
    key: string;
    value: QuotationNumberingState | any;
  };
}

const DB_NAME = 'kadequote_local_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<KadeQuoteDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<KadeQuoteDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in the browser'));
  }

  if (!dbPromise) {
    dbPromise = openDB<KadeQuoteDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Quotations store
        if (!db.objectStoreNames.contains('quotations')) {
          const quotStore = db.createObjectStore('quotations', { keyPath: 'id' });
          quotStore.createIndex('by-status', 'status');
          quotStore.createIndex('by-created', 'createdAt');
          quotStore.createIndex('by-number', 'quotationNumber', { unique: true });
        }

        // Business Profile store
        if (!db.objectStoreNames.contains('businessProfile')) {
          db.createObjectStore('businessProfile');
        }

        // Settings / numbering store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Quotation CRUD operations
 */
export async function getAllQuotations(): Promise<Quotation[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('quotations');
    // Sort descending by createdAt
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Failed to get quotations:', err);
    return [];
  }
}

export async function getQuotationById(id: string): Promise<Quotation | undefined> {
  const db = await getDB();
  return db.get('quotations', id);
}

export async function saveQuotation(quotation: Quotation): Promise<void> {
  const db = await getDB();
  await db.put('quotations', quotation);
}

export async function deleteQuotation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('quotations', id);
}

/**
 * Generates the next sequential quotation number safely, e.g. KQ-2026-0001
 */
export async function getNextQuotationNumber(): Promise<string> {
  const db = await getDB();
  const currentYear = new Date().getFullYear();
  const state: QuotationNumberingState = (await db.get('settings', 'quotation_sequence')) || {
    prefix: 'KQ',
    year: currentYear,
    lastSequence: 0,
  };

  let nextSequence = state.lastSequence + 1;
  // If year rolled over, reset sequence counter
  if (state.year !== currentYear) {
    state.year = currentYear;
    nextSequence = 1;
  }

  state.lastSequence = nextSequence;
  await db.put('settings', state, 'quotation_sequence');

  const paddedSeq = String(nextSequence).padStart(4, '0');
  return `${state.prefix || 'KQ'}-${currentYear}-${paddedSeq}`;
}

/**
 * Duplicates an existing quotation as a fresh draft
 */
export async function duplicateQuotation(id: string): Promise<Quotation> {
  const existing = await getQuotationById(id);
  if (!existing) {
    throw new Error('Quotation to duplicate not found');
  }

  const nextNumber = await getNextQuotationNumber();
  const now = new Date().toISOString();
  const todayStr = new Date().toISOString().slice(0, 10);

  const newQuotation: Quotation = {
    ...existing,
    id: crypto.randomUUID ? crypto.randomUUID() : `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    quotationNumber: nextNumber,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    issueDate: todayStr,
    items: existing.items.map((item) => ({
      ...item,
      id: crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    })),
  };

  await saveQuotation(newQuotation);
  return newQuotation;
}

/**
 * Business Profile operations
 */
export async function getBusinessProfile(): Promise<BusinessProfile> {
  try {
    const db = await getDB();
    const profile = await db.get('businessProfile', 'current');
    if (!profile) {
      // Seed default profile
      await db.put('businessProfile', DEFAULT_BUSINESS_PROFILE, 'current');
      return DEFAULT_BUSINESS_PROFILE;
    }
    return profile;
  } catch (err) {
    console.error('Failed to get business profile:', err);
    return DEFAULT_BUSINESS_PROFILE;
  }
}

export async function saveBusinessProfile(profile: BusinessProfile): Promise<void> {
  const db = await getDB();
  await db.put('businessProfile', profile, 'current');
}

/**
 * Backup / Export all data as JSON
 */
export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const quotations = await db.getAll('quotations');
  const businessProfile = await db.get('businessProfile', 'current');
  const numberingState = await db.get('settings', 'quotation_sequence');

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    quotations,
    businessProfile: businessProfile || DEFAULT_BUSINESS_PROFILE,
    numberingState: numberingState || null,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Import data from a backup JSON file with strict validation
 */
export async function importAllData(
  jsonString: string
): Promise<{ success: boolean; quotationsCount: number; message: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    const validated = BackupDataSchema.parse(parsed);

    const db = await getDB();
    const tx = db.transaction(['quotations', 'businessProfile', 'settings'], 'readwrite');

    const quotStore = tx.objectStore('quotations');
    let importedCount = 0;

    for (const q of validated.quotations) {
      if (q && q.id && q.quotationNumber) {
        await quotStore.put(q);
        importedCount++;
      }
    }

    if (validated.businessProfile) {
      await tx.objectStore('businessProfile').put(validated.businessProfile, 'current');
    }

    if (validated.numberingState) {
      await tx.objectStore('settings').put(validated.numberingState, 'quotation_sequence');
    }

    await tx.done;

    return {
      success: true,
      quotationsCount: importedCount,
      message: `Successfully imported ${importedCount} quotation(s) and profile settings.`,
    };
  } catch (err: any) {
    return {
      success: false,
      quotationsCount: 0,
      message: err?.message || 'Invalid backup file structure or corrupted data.',
    };
  }
}

/**
 * Clear all local data completely (factory reset)
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['quotations', 'businessProfile', 'settings'], 'readwrite');
  await tx.objectStore('quotations').clear();
  await tx.objectStore('businessProfile').clear();
  await tx.objectStore('settings').clear();
  await tx.done;
}
