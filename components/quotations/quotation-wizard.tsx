'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  User,
  FileText,
  CheckCircle2,
  ListPlus,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Save,
  Eye,
  Plus,
  RefreshCw,
  Info,
  Layers,
  Wrench,
  Zap,
  Hammer,
} from 'lucide-react';
import {
  Quotation,
  QuotationItem,
  ItemCategory,
  DiscountType,
} from '@/types/quotation';
import { BusinessProfile } from '@/types/business';
import {
  calculateLineTotal,
  calculateQuotationTotals,
  formatCurrency,
  SUPPORTED_CURRENCIES,
} from '@/lib/calculations/quotation';
import {
  saveQuotation,
  getNextQuotationNumber,
} from '@/lib/db';
import { useToast } from '@/components/ui/toast';
import { QuotationPreviewModal } from './quotation-preview-modal';
import { downloadQuotationPDF } from '@/lib/pdf/generate-quotation-pdf';

import { AIParsedItem } from '@/types/ai';

interface QuotationWizardProps {
  initialQuotation?: Quotation | null;
  businessProfile: BusinessProfile;
  onSaved: (quotation: Quotation) => void;
  onCancel: () => void;
}

const EXAMPLE_PROMPTS = [
  {
    role: 'Electrician',
    icon: Zap,
    label: 'Switch & Socket Repair',
    text: 'Replace 3 switches, repair one electrical socket, labour 2500 rupees, switches cost 450 each and socket repair parts 800.',
  },
  {
    role: 'Plumber',
    icon: Wrench,
    label: 'Pipe Leak & Valve Replacement',
    text: 'Repair leaking PVC kitchen pipe with 2m pipe at 350 per meter, replace 1/2 inch brass ball valve at 1450, plumbing labour 2000.',
  },
  {
    role: 'Technician',
    icon: Hammer,
    label: 'Ceiling Fan Installation & Wiring',
    text: 'Install two ceiling fans provided by customer, run 15 meters copper wire at 180 per meter, standard installation labour 3500.',
  },
];

export function QuotationWizard({
  initialQuotation,
  businessProfile,
  onSaved,
  onCancel,
}: QuotationWizardProps) {
  const { success, error, info } = useToast();

  // Step state (1: Customer, 2: Describe/AI, 3: Review Items, 4: Totals, 5: Export)
  const [currentStep, setCurrentStep] = useState<number>(initialQuotation ? 3 : 1);

  // Form states initialized lazily
  const [quotationId] = useState<string>(() => {
    if (initialQuotation?.id) return initialQuotation.id;
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `q_${Date.now()}`;
  });

  const [quotationNumber, setQuotationNumber] = useState<string>(() => {
    if (initialQuotation?.quotationNumber) return initialQuotation.quotationNumber;
    return '';
  });

  const [status, setStatus] = useState<'draft' | 'finalized'>(() => {
    return initialQuotation?.status || 'draft';
  });

  const [issueDate, setIssueDate] = useState<string>(() => {
    if (initialQuotation?.issueDate) return initialQuotation.issueDate;
    return new Date().toISOString().slice(0, 10);
  });

  const [validUntilDate, setValidUntilDate] = useState<string>(() => {
    if (initialQuotation?.validUntilDate) return initialQuotation.validUntilDate;
    const today = new Date();
    const days = businessProfile.defaultValidityDays || 14;
    today.setDate(today.getDate() + days);
    return today.toISOString().slice(0, 10);
  });

  const [jobTitle, setJobTitle] = useState<string>(() => initialQuotation?.jobTitle || '');

  // Customer
  const [customerName, setCustomerName] = useState<string>(() => initialQuotation?.customer.name || '');
  const [customerPhone, setCustomerPhone] = useState<string>(() => initialQuotation?.customer.phone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(() => initialQuotation?.customer.email || '');
  const [customerAddress, setCustomerAddress] = useState<string>(() => initialQuotation?.customer.address || '');

  // AI & Job Description
  const [rawNotes, setRawNotes] = useState<string>(() => initialQuotation?.rawNotes || '');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [includePriceList, setIncludePriceList] = useState<boolean>(true);

  // Items
  const [items, setItems] = useState<QuotationItem[]>(() => initialQuotation?.items || []);
  const [showPriceListDrawer, setShowPriceListDrawer] = useState<boolean>(false);

  // Financials
  const [currency, setCurrency] = useState<string>(
    () => initialQuotation?.currency || businessProfile.defaultCurrency || 'LKR'
  );
  const [discount, setDiscount] = useState<number>(() => initialQuotation?.discount || 0);
  const [discountType, setDiscountType] = useState<DiscountType>(
    () => initialQuotation?.discountType || 'fixed'
  );
  const [additionalCharges, setAdditionalCharges] = useState<number>(
    () => initialQuotation?.additionalCharges || 0
  );
  const [additionalChargesDescription, setAdditionalChargesDescription] = useState<string>(
    () => initialQuotation?.additionalChargesDescription || ''
  );
  const [taxEnabled, setTaxEnabled] = useState<boolean>(() => initialQuotation?.taxEnabled || false);
  const [taxRate, setTaxRate] = useState<number>(() => initialQuotation?.taxRate || 0);

  // Notes & terms
  const [notes, setNotes] = useState<string>(() => initialQuotation?.notes || '');
  const [terms, setTerms] = useState<string>(
    () => initialQuotation?.terms || businessProfile.defaultTerms || ''
  );

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Numbering sequence generation when creating new quote
  useEffect(() => {
    if (!initialQuotation) {
      getNextQuotationNumber()
        .then((num) => setQuotationNumber(num))
        .catch(() => setQuotationNumber(`KQ-${new Date().getFullYear()}-0001`));
    }
  }, [initialQuotation]);

  // Real-time deterministic financial calculation
  const calculatedTotals = calculateQuotationTotals({
    items,
    discount,
    discountType,
    additionalCharges,
    taxRate,
    taxEnabled,
  });

  // Construct current quotation object
  const buildQuotationObject = (overrideStatus?: 'draft' | 'finalized'): Quotation => {
    const now = new Date().toISOString();
    return {
      id: quotationId,
      quotationNumber,
      status: overrideStatus || status,
      createdAt: initialQuotation ? initialQuotation.createdAt : now,
      updatedAt: now,
      issueDate,
      validUntilDate,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: customerAddress,
      },
      jobTitle: jobTitle || 'Quotation Estimate',
      rawNotes,
      items,
      currency,
      discount,
      discountType,
      additionalCharges,
      additionalChargesDescription,
      taxRate: taxEnabled ? taxRate : 0,
      taxEnabled,
      subtotal: calculatedTotals.subtotal,
      discountAmount: calculatedTotals.discountAmount,
      taxAmount: calculatedTotals.taxAmount,
      total: calculatedTotals.total,
      notes,
      terms,
    };
  };

  // AI Generation Handler
  const handleGenerateAI = async () => {
    if (!rawNotes.trim()) {
      setAiError('Please enter some notes describing the work or items.');
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai/parse-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: rawNotes,
          priceList: includePriceList ? businessProfile.priceList : undefined,
          businessContext: {
            currency,
            defaultLabourRate: businessProfile.defaultLabourRate,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process job notes with local AI');
      }

      const parsed = data.quotation;

      // Fill extracted fields if currently empty
      if (parsed.jobTitle && (!jobTitle || jobTitle === 'Quotation Estimate')) {
        setJobTitle(parsed.jobTitle);
      }
      if (parsed.customerName && !customerName) {
        setCustomerName(parsed.customerName);
      }
      if (parsed.customerPhone && !customerPhone) {
        setCustomerPhone(parsed.customerPhone);
      }
      if (parsed.customerAddress && !customerAddress) {
        setCustomerAddress(parsed.customerAddress);
      }

      // Convert parsed items to QuotationItem
      const newItems: QuotationItem[] = parsed.items.map((item: AIParsedItem) => {
        const qty = item.quantity || 1;
        const price = item.unitPrice !== null ? item.unitPrice : 0;
        return {
          id: Math.random().toString(36).substring(2, 9),
          description: item.description,
          quantity: qty,
          unit: item.unit || 'piece',
          unitPrice: price,
          lineTotal: calculateLineTotal(qty, price),
          category: item.category as ItemCategory,
          needsReview: item.needsReview || item.unitPrice === null,
        };
      });

      setItems(newItems);

      if (parsed.notes && parsed.notes.length > 0) {
        setNotes((prev) => (prev ? `${prev}\n${parsed.notes.join('\n')}` : parsed.notes.join('\n')));
      }

      success(
        'AI Interpretation Complete',
        `Generated ${newItems.length} item(s) using Gemma 3 1B. Please review below.`
      );
      setCurrentStep(3); // Advance to items review
    } catch (err: unknown) {
      console.error('AI generation error:', err);
      const errMsg = err instanceof Error ? err.message : 'Could not connect to Ollama. Check that Ollama is running.';
      setAiError(errMsg);
      error('AI Inference Error', errMsg);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Item Table Manipulation
  const handleAddItem = (preset?: Partial<QuotationItem>) => {
    const newItem: QuotationItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: preset?.description || '',
      quantity: preset?.quantity || 1,
      unit: preset?.unit || 'piece',
      unitPrice: preset?.unitPrice || 0,
      lineTotal: calculateLineTotal(preset?.quantity || 1, preset?.unitPrice || 0),
      category: preset?.category || 'material',
      needsReview: false,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<QuotationItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        const newQty = typeof updates.quantity === 'number' ? updates.quantity : item.quantity;
        const newPrice = typeof updates.unitPrice === 'number' ? updates.unitPrice : item.unitPrice;
        updated.lineTotal = calculateLineTotal(newQty, newPrice);
        // If price is supplied and positive, clear needsReview
        if (newPrice > 0 && item.needsReview) {
          updated.needsReview = false;
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Save Quotation Handler
  const handleSave = async (finalized: boolean = false) => {
    if (items.length === 0) {
      error('Cannot Save Quotation', 'Please add at least one quotation item before saving.');
      setCurrentStep(3);
      return;
    }

    setIsSaving(true);
    try {
      const targetStatus = finalized ? 'finalized' : 'draft';
      const quoteObj = buildQuotationObject(targetStatus);
      await saveQuotation(quoteObj);
      setStatus(targetStatus);
      success(
        finalized ? 'Quotation Finalized' : 'Draft Saved',
        `Quotation ${quoteObj.quotationNumber} saved to local storage.`
      );
      onSaved(quoteObj);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to save quotation locally';
      error('Save Failed', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (items.length === 0) {
      error('No Items', 'Add items before exporting PDF.');
      return;
    }
    const quoteObj = buildQuotationObject();
    downloadQuotationPDF(quoteObj, businessProfile);
    info('PDF Downloaded', `Saved ${quoteObj.quotationNumber} as PDF.`);
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                {quotationNumber}
              </span>
              <h1 className="text-lg font-bold text-slate-900">
                {initialQuotation ? 'Edit Quotation' : 'Create Quotation'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Follow the guided workflow to generate or customize your quote.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              disabled={items.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving || items.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>
          </div>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {[
            { num: 1, label: 'Customer' },
            { num: 2, label: 'Job & AI' },
            { num: 3, label: 'Items & Review' },
            { num: 4, label: 'Totals' },
            { num: 5, label: 'Save & Export' },
          ].map((st) => (
            <button
              key={st.num}
              type="button"
              onClick={() => setCurrentStep(st.num)}
              className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 border ${
                currentStep === st.num
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-xs'
                  : currentStep > st.num
                  ? 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold ${
                  currentStep === st.num
                    ? 'bg-emerald-600 text-white'
                    : currentStep > st.num
                    ? 'bg-slate-300 text-slate-700'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {st.num}
              </span>
              <span className="hidden sm:inline truncate max-w-full">{st.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: CUSTOMER DETAILS */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 1: Customer & Project Details</h2>
              <p className="text-xs text-slate-500">Provide client contact details and project title.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project / Job Title <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Electrical Switch Repair, Bathroom Plumbing"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Mr. Kamal Silva or Walk-in Client"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+94 77 123 4567"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Address</label>
              <textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                rows={2}
                placeholder="Job site address or billing address"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quotation Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Until Date</label>
              <input
                type="date"
                value={validUntilDate}
                onChange={(e) => setValidUntilDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">Step 1 of 5</span>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              Continue to Job Description
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DESCRIBE THE JOB & AI GENERATION */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Step 2: Describe the Job (Local AI)</h2>
                <p className="text-xs text-slate-500">
                  Type or paste informal notes. Ollama (Gemma 3 1B) will structure items automatically.
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Local AI Privacy-First
            </div>
          </div>

          {/* Example Quick Prompts */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Quick Prompt Templates (Click to insert):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EXAMPLE_PROMPTS.map((ex, idx) => {
                const IconComponent = ex.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRawNotes(ex.text);
                      info('Template Loaded', `Populated ${ex.label} sample notes.`);
                    }}
                    className="p-3 text-left rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1 rounded-md bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-700 transition-colors">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                        {ex.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {ex.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rough Notes Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Rough Job Notes or Voice-to-Text Transcription:
            </label>
            <textarea
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              rows={5}
              placeholder="e.g. Replace 3 switches, repair one electrical socket, labour 2500 rupees, switches cost 450 each and socket repair parts 800."
              className="w-full p-4 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all leading-relaxed"
            />
          </div>

          {/* Settings for AI */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/70">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={includePriceList}
                onChange={(e) => setIncludePriceList(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
              />
              <span>
                Include saved price list ({businessProfile.priceList.length} items) for automatic rate matching
              </span>
            </label>

            <span className="text-[11px] text-slate-500">
              Model: <strong className="text-slate-700">gemma3:1b</strong> (Local Ollama)
            </span>
          </div>

          {/* Error Message banner */}
          {aiError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Local AI Processing Failed</p>
                <p className="mt-0.5 opacity-90">{aiError}</p>
                <p className="mt-1 text-[11px] text-rose-700">
                  Tip: Ensure Ollama is running (`ollama run gemma3:1b`) or skip AI to add items manually.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  if (items.length === 0) {
                    handleAddItem();
                  }
                  setCurrentStep(3);
                }}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Skip AI & Add Manually
              </button>

              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isAiLoading || !rawNotes.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {isAiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Inferencing with Gemma 3 1B...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate with Local AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW ITEMS */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ListPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Step 3: Review & Edit Items</h2>
                <p className="text-xs text-slate-500">
                  Verify quantities, units, and unit prices. You can add, edit, or remove items.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPriceListDrawer(!showPriceListDrawer)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                Price List Reference
              </button>
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>
          </div>

          {/* AI Notice Banner */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Human Verification Required:</strong> AI-generated quotes are drafts. Confirm
              each description, material cost, and labour fee before providing to clients.
            </div>
          </div>

          {/* Quick Price List Picker Drawer (if opened) */}
          {showPriceListDrawer && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Click to add from your saved price list:
                </h4>
                <button
                  onClick={() => setShowPriceListDrawer(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {businessProfile.priceList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleAddItem({
                        description: item.name,
                        unit: item.unit,
                        unitPrice: item.defaultPrice,
                        category: item.category,
                        quantity: 1,
                      });
                      success('Added Item', `${item.name} added to quotation.`);
                    }}
                    className="p-2.5 text-left rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all flex justify-between items-center"
                  >
                    <div>
                      <span className="block text-xs font-medium text-slate-800">{item.name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{item.category} • {item.unit}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">
                      {formatCurrency(item.defaultPrice, currency)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Items Table */}
          {items.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No items added yet</p>
              <p className="text-xs text-slate-400 mt-1">Add items manually or go back to generate with AI.</p>
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl"
              >
                + Add First Item
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-8 text-center">#</th>
                    <th className="py-3 px-3 min-w-[200px]">Description</th>
                    <th className="py-3 px-3 w-28">Category</th>
                    <th className="py-3 px-3 w-24">Qty</th>
                    <th className="py-3 px-3 w-24">Unit</th>
                    <th className="py-3 px-3 w-32 text-right">Unit Price</th>
                    <th className="py-3 px-3 w-32 text-right">Line Total</th>
                    <th className="py-3 px-2 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        item.needsReview ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                        {index + 1}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                            placeholder="Item description..."
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-slate-800"
                          />
                          {item.needsReview && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold">
                              <AlertTriangle className="w-3 h-3" /> Price or quantity needs review
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={item.category}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { category: e.target.value as ItemCategory })
                          }
                          className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 capitalize text-slate-700"
                        >
                          <option value="material">Material</option>
                          <option value="labour">Labour</option>
                          <option value="service">Service</option>
                          <option value="other">Other</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                          placeholder="piece/hr"
                          className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                          }
                          className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right font-medium ${
                            item.unitPrice === 0
                              ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(item.lineTotal, currency)}
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes & Terms Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Special Notes & Job Specifications:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Work commences upon client approval. Customer to provide uninterrupted electricity."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quotation Terms & Conditions:
              </label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
                placeholder="Payment terms, validity, warranties..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              disabled={items.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-40"
            >
              Configure Totals & Adjustments
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: TOTALS & FINANCIAL CONFIG */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 4: Totals & Adjustments</h2>
              <p className="text-xs text-slate-500">
                Configure currency, discounts, additional charges, and optional estimated taxes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Configuration Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} ({curr.symbol}) — {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Discount */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">Discount</label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`px-2 py-0.5 rounded-md font-semibold ${
                        discountType === 'fixed'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Fixed ({currency})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`px-2 py-0.5 rounded-md font-semibold ${
                        discountType === 'percentage'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Percentage (%)
                    </button>
                  </div>
                </div>

                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Additional Charges */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                <label className="text-xs font-semibold text-slate-800 block">
                  Additional Charges (Transport / Emergency Fee / Consumables)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={additionalChargesDescription}
                    onChange={(e) => setAdditionalChargesDescription(e.target.value)}
                    placeholder="e.g. Transport & Delivery"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={additionalCharges}
                    onChange={(e) =>
                      setAdditionalCharges(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    placeholder="Amount"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-right"
                  />
                </div>
              </div>

              {/* Optional Tax */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 block">
                      Optional Tax / VAT Rate
                    </label>
                    <span className="text-[11px] text-slate-500">
                      User-configured estimate only (not certified tax filing)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxEnabled}
                      onChange={(e) => setTaxEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {taxEnabled && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="e.g. 15"
                      className="w-24 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                    <span className="text-xs text-slate-600 font-medium">% Tax Rate</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live Calculated Summary Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Deterministic Financial Summary
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-700">
                    <span>Items Subtotal ({items.length} items)</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(calculatedTotals.subtotal, currency)}
                    </span>
                  </div>

                  {calculatedTotals.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>
                        Discount {discountType === 'percentage' ? `(${discount}%)` : ''}
                      </span>
                      <span className="font-semibold">
                        -{formatCurrency(calculatedTotals.discountAmount, currency)}
                      </span>
                    </div>
                  )}

                  {calculatedTotals.additionalCharges > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>
                        {additionalChargesDescription
                          ? `Charges (${additionalChargesDescription})`
                          : 'Additional Charges'}
                      </span>
                      <span className="font-semibold text-slate-900">
                        +{formatCurrency(calculatedTotals.additionalCharges, currency)}
                      </span>
                    </div>
                  )}

                  {calculatedTotals.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Estimated Tax ({taxRate}%)</span>
                      <span className="font-semibold text-slate-900">
                        +{formatCurrency(calculatedTotals.taxAmount, currency)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-baseline">
                    <div>
                      <span className="text-base font-bold text-slate-900 block">Total Quotation</span>
                      <span className="text-[11px] text-slate-400">Calculated deterministically</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-700">
                      {formatCurrency(calculatedTotals.total, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Totals calculated using strict 2-decimal rounded arithmetic to guarantee monetary
                  accuracy.
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              Save & Export Quotation
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SAVE & EXPORT */}
      {currentStep === 5 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 5: Finalize & Export</h2>
              <p className="text-xs text-slate-500">
                Save as draft or finalize your quotation, and generate the printable PDF.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status card */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Quotation Status
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Draft quotations remain easily editable. Finalized quotations indicate completed pricing
                ready for customer presentation.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStatus('draft')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                    status === 'draft'
                      ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('finalized')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                    status === 'finalized'
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Finalized
                </button>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="md:col-span-2 p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Available Actions
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition-all group"
                >
                  <Eye className="w-5 h-5 text-slate-600 group-hover:text-slate-900 mb-2" />
                  <span className="block text-sm font-bold text-slate-900">Document Preview</span>
                  <span className="text-[11px] text-slate-500">View live rendered document layout</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-all group"
                >
                  <Download className="w-5 h-5 text-emerald-700 mb-2" />
                  <span className="block text-sm font-bold text-emerald-950">Download PDF</span>
                  <span className="text-[11px] text-emerald-700">Generate clean printable PDF file</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="p-4 rounded-xl border border-emerald-700 bg-emerald-700 hover:bg-emerald-800 text-white text-left transition-all shadow-xs"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-200 mb-2" />
                  <span className="block text-sm font-bold text-white">Finalize & Save</span>
                  <span className="text-[11px] text-emerald-200">Commit to IndexedDB store</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              onClick={() => handleSave(status === 'finalized')}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              {status === 'finalized' ? 'Save Finalized Quotation' : 'Save as Draft'}
            </button>
          </div>
        </div>
      )}

      {/* Render Document Preview Modal */}
      <QuotationPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        quotation={buildQuotationObject()}
        business={businessProfile}
      />
    </div>
  );
}
