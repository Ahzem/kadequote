'use client';

import React, { useState } from 'react';
import {
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Download,
  Eye,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { Quotation } from '@/types/quotation';
import { BusinessProfile } from '@/types/business';
import { OllamaStatusResponse } from '@/types/ai';
import { formatCurrency } from '@/lib/calculations/quotation';
import { downloadQuotationPDF } from '@/lib/pdf/generate-quotation-pdf';
import { QuotationPreviewModal } from '@/components/quotations/quotation-preview-modal';

interface DashboardViewProps {
  quotations: Quotation[];
  businessProfile: BusinessProfile;
  ollamaStatus: OllamaStatusResponse | null;
  onRefreshOllama: () => void;
  isCheckingOllama: boolean;
  onCreateNew: () => void;
  onViewAll: () => void;
  onEditQuotation: (q: Quotation) => void;
  onGoToSettings: () => void;
}

export function DashboardView({
  quotations,
  businessProfile,
  ollamaStatus,
  onRefreshOllama,
  isCheckingOllama,
  onCreateNew,
  onViewAll,
  onEditQuotation,
  onGoToSettings,
}: DashboardViewProps) {
  const [previewQuote, setPreviewQuote] = useState<Quotation | null>(null);

  // Real statistics computed directly from IndexedDB quotations
  const totalCount = quotations.length;
  const draftCount = quotations.filter((q) => q.status === 'draft').length;
  const finalizedCount = quotations.filter((q) => q.status === 'finalized').length;
  const totalValue = quotations.reduce((sum, q) => sum + (q.total || 0), 0);

  // Recent 5 quotations
  const recentQuotations = quotations.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome & Top Action Bar */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            100% Local-First AI • Gemma 3 1B
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {businessProfile.ownerName || businessProfile.name}!
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
            Convert informal job notes from electricians, plumbers, and technicians into professional,
            itemized quotations within seconds. All data stays strictly on your computer.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Create Quotation
            </button>
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-xs transition-colors"
            >
              View All ({totalCount})
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quotes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Quotations</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{totalCount}</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Stored in local IndexedDB</span>
          </div>
        </div>

        {/* Draft Quotes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Drafts</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-700">{draftCount}</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Awaiting review / editing</span>
          </div>
        </div>

        {/* Finalized Quotes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Finalized</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-700">{finalizedCount}</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Ready for clients</span>
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Estimated Value</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 truncate block">
              {formatCurrency(totalValue, businessProfile.defaultCurrency || 'LKR')}
            </span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Total across all quotes</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Quotes & AI Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Recent Quotations */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Quotations</h2>
              <p className="text-xs text-slate-500">Your latest work records</p>
            </div>
            {totalCount > 0 && (
              <button
                onClick={onViewAll}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                View All
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {recentQuotations.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No quotations created yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Click below to parse rough job notes into your first professional quote.
              </p>
              <button
                onClick={onCreateNew}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                + Create First Quotation
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentQuotations.map((q) => (
                <div
                  key={q.id}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800">{q.quotationNumber}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {q.customer.name || 'Valued Customer'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{q.jobTitle}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 block">
                        {formatCurrency(q.total, q.currency)}
                      </span>
                      <span className="text-[10px] text-slate-400">{q.issueDate}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewQuote(q)}
                        title="Quick Preview"
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadQuotationPDF(q, businessProfile)}
                        title="Download PDF"
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditQuotation(q)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Local AI Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Local AI Engine</h3>
              </div>
              <button
                onClick={onRefreshOllama}
                disabled={isCheckingOllama}
                title="Refresh Status"
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingOllama ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Status indicator */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Status</span>
                {ollamaStatus?.connected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Offline / Stopped
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Inference Model</span>
                <span className="font-semibold text-slate-800">
                  {ollamaStatus?.model || 'gemma3:1b'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Model Installed</span>
                <span className="font-semibold text-slate-800">
                  {ollamaStatus?.modelInstalled ? (
                    <span className="text-emerald-700 font-bold">Yes (Ready)</span>
                  ) : (
                    <span className="text-amber-700">Not detected</span>
                  )}
                </span>
              </div>

              {ollamaStatus?.latencyMs !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Ping Latency</span>
                  <span className="font-semibold text-slate-800">{ollamaStatus.latencyMs} ms</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
              Ollama operates completely on your localhost (127.0.0.1:11434). No customer or pricing
              data ever leaves this machine.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onGoToSettings}
              className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center block"
            >
              Configure Ollama & Settings
            </button>
          </div>
        </div>
      </div>

      {/* Quotation Preview Modal */}
      <QuotationPreviewModal
        isOpen={!!previewQuote}
        onClose={() => setPreviewQuote(null)}
        quotation={previewQuote}
        business={businessProfile}
      />
    </div>
  );
}
