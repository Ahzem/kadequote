'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { Quotation } from '@/types/quotation';
import { BusinessProfile } from '@/types/business';
import { formatCurrency } from '@/lib/calculations/quotation';
import { downloadQuotationPDF } from '@/lib/pdf/generate-quotation-pdf';
import { ConfirmModal } from '@/components/ui/modal';
import { QuotationPreviewModal } from './quotation-preview-modal';
import { useToast } from '@/components/ui/toast';

interface QuotationsListProps {
  quotations: Quotation[];
  businessProfile: BusinessProfile;
  onCreateNew: () => void;
  onEdit: (quotation: Quotation) => void;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function QuotationsList({
  quotations,
  businessProfile,
  onCreateNew,
  onEdit,
  onDuplicate,
  onDelete,
}: QuotationsListProps) {
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'finalized'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest'>('newest');

  // Preview Modal state
  const [previewQuote, setPreviewQuote] = useState<Quotation | null>(null);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter & sort
  const filteredQuotations = useMemo(() => {
    return quotations
      .filter((q) => {
        // Status filter
        if (statusFilter !== 'all' && q.status !== statusFilter) {
          return false;
        }
        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchNumber = q.quotationNumber.toLowerCase().includes(term);
          const matchCustomer = (q.customer.name || '').toLowerCase().includes(term);
          const matchJob = (q.jobTitle || '').toLowerCase().includes(term);
          return matchNumber || matchCustomer || matchJob;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'highest') {
          return b.total - a.total;
        }
        return 0;
      });
  }, [quotations, searchTerm, statusFilter, sortBy]);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteTargetId);
      success('Quotation Deleted', 'The quotation was removed from local storage.');
      setDeleteTargetId(null);
    } catch (err: any) {
      error('Delete Failed', err.message || 'Could not delete quotation.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateClick = async (id: string) => {
    try {
      await onDuplicate(id);
      success('Quotation Duplicated', 'New sequential draft created.');
    } catch (err: any) {
      error('Duplication Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Quotations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, duplicate, and export all locally stored quotations.
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Quotation
        </button>
      </div>

      {/* Filters and search */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by quote #, client name, or project..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Status filter */}
        <div className="sm:col-span-3 flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs">
          {(['all', 'draft', 'finalized'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`flex-1 py-1.5 rounded-lg font-medium capitalize transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="sm:col-span-3">
          <div className="relative">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full pl-8 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quotations List / Table */}
      {filteredQuotations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Quotations Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'No quotations match your current search and filter criteria.'
              : 'You have not created any quotations yet. Start converting rough job notes into professional quotes.'}
          </p>
          <button
            onClick={onCreateNew}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Quotation
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Client / Project</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Number */}
                    <td className="py-3.5 px-4 font-bold text-emerald-800 whitespace-nowrap">
                      {q.quotationNumber}
                    </td>

                    {/* Client & Job */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 block truncate max-w-[200px]">
                          {q.customer.name || 'Valued Customer'}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[240px]">
                          {q.jobTitle}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {q.issueDate}
                    </td>

                    {/* Items count */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {q.items.length} item{q.items.length === 1 ? '' : 's'}
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(q.total, q.currency)}
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {q.status === 'finalized' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Finalized
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" /> Draft
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewQuote(q)}
                          title="Preview Quotation"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadQuotationPDF(q, businessProfile)}
                          title="Download PDF"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(q)}
                          title="Edit Quotation"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateClick(q.id)}
                          title="Duplicate as new Draft"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(q.id)}
                          title="Delete"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <QuotationPreviewModal
        isOpen={!!previewQuote}
        onClose={() => setPreviewQuote(null)}
        quotation={previewQuote}
        business={businessProfile}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Quotation?"
        description="This will permanently remove this quotation from local browser storage. This action cannot be undone."
        confirmLabel="Delete Permanently"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
