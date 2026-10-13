'use client';

import React from 'react';
import { X, Download, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Quotation } from '@/types/quotation';
import { BusinessProfile } from '@/types/business';
import { formatCurrency } from '@/lib/calculations/quotation';
import { downloadQuotationPDF } from '@/lib/pdf/generate-quotation-pdf';

interface QuotationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  business: BusinessProfile;
}

export function QuotationPreviewModal({
  isOpen,
  onClose,
  quotation,
  business,
}: QuotationPreviewModalProps) {
  if (!isOpen || !quotation) return null;

  const handleDownload = () => {
    downloadQuotationPDF(quotation, business);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Quotation Preview</h2>
              <p className="text-xs text-slate-500">{quotation.quotationNumber} • {quotation.jobTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body - Rendered Document */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100/50">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
            {/* Top row: Business info & Quote meta */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-6">
              <div className="space-y-1">
                {business.logoBase64 && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={business.logoBase64}
                    alt={business.name}
                    className="h-10 w-auto object-contain mb-2 rounded"
                  />
                )}
                <h3 className="text-lg font-bold text-emerald-800">{business.name}</h3>
                {business.ownerName && <p className="text-xs text-slate-600 font-medium">Proprietor: {business.ownerName}</p>}
                {business.phone && <p className="text-xs text-slate-500">Phone: {business.phone}</p>}
                {business.email && <p className="text-xs text-slate-500">Email: {business.email}</p>}
                {business.address && <p className="text-xs text-slate-500">{business.address}</p>}
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="inline-block text-xl font-black tracking-wider text-slate-900">
                  QUOTATION
                </span>
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                  {quotation.quotationNumber}
                </div>
                <p className="text-xs text-slate-500 mt-2">Date: <span className="text-slate-700 font-medium">{quotation.issueDate}</span></p>
                <p className="text-xs text-slate-500">Valid Until: <span className="text-slate-700 font-medium">{quotation.validUntilDate}</span></p>
                <div className="pt-1">
                  {quotation.status === 'finalized' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Finalized
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Clock className="w-3 h-3" /> Draft
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bill to & Job Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                  Bill To / Client
                </span>
                <p className="text-sm font-bold text-slate-900">{quotation.customer.name || 'Valued Customer'}</p>
                {quotation.customer.phone && <p className="text-xs text-slate-600">{quotation.customer.phone}</p>}
                {quotation.customer.email && <p className="text-xs text-slate-600">{quotation.customer.email}</p>}
                {quotation.customer.address && <p className="text-xs text-slate-600">{quotation.customer.address}</p>}
              </div>

              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                  Project / Job
                </span>
                <p className="text-sm font-bold text-slate-900">{quotation.jobTitle}</p>
                <p className="text-xs text-slate-500">Currency: {quotation.currency}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Qty / Unit</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotation.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/40">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{item.description}</td>
                      <td className="py-2.5 px-3 capitalize text-slate-500 italic">{item.category}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{item.quantity} {item.unit}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{formatCurrency(item.unitPrice, quotation.currency)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(item.lineTotal, quotation.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
              <div className="flex-1 space-y-3 text-xs text-slate-600">
                {quotation.notes && (
                  <div>
                    <span className="font-semibold text-slate-800 block mb-0.5">Notes:</span>
                    <p className="whitespace-pre-line leading-relaxed">{quotation.notes}</p>
                  </div>
                )}
                {quotation.terms && (
                  <div>
                    <span className="font-semibold text-slate-800 block mb-0.5">Terms & Conditions:</span>
                    <p className="whitespace-pre-line leading-relaxed text-[11px] text-slate-500">{quotation.terms}</p>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-64 bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCurrency(quotation.subtotal, quotation.currency)}</span>
                </div>

                {quotation.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount {quotation.discountType === 'percentage' ? `(${quotation.discount}%)` : ''}</span>
                    <span>-{formatCurrency(quotation.discountAmount, quotation.currency)}</span>
                  </div>
                )}

                {quotation.additionalCharges > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Additional Charges</span>
                    <span className="font-medium text-slate-900">{formatCurrency(quotation.additionalCharges, quotation.currency)}</span>
                  </div>
                )}

                {quotation.taxEnabled && quotation.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({quotation.taxRate}%)</span>
                    <span className="font-medium text-slate-900">{formatCurrency(quotation.taxAmount, quotation.currency)}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Estimated Total</span>
                  <span className="text-base text-emerald-700 font-extrabold">{formatCurrency(quotation.total, quotation.currency)}</span>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-slate-50 py-2 px-3 rounded-lg border border-slate-100 text-[11px] text-slate-500 text-center italic">
              Notice: This document is a price quotation only and does not constitute a tax invoice or formal receipt.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
