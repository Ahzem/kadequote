'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  ExternalLink,
  Terminal,
  CheckCircle2,
  AlertCircle,
  HardDrive,
} from 'lucide-react';
import { OllamaStatusResponse } from '@/types/ai';
import { exportAllData, importAllData, clearAllData } from '@/lib/db';
import { ConfirmModal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

interface SettingsViewProps {
  ollamaStatus: OllamaStatusResponse | null;
  onRefreshOllama: () => void;
  isCheckingOllama: boolean;
  onDataReset: () => void;
}

export function SettingsView({
  ollamaStatus,
  onRefreshOllama,
  isCheckingOllama,
  onDataReset,
}: SettingsViewProps) {
  const { success, error, info } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Export Data JSON handler
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const jsonStr = await exportAllData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `kadequote-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success('Export Completed', 'Downloaded complete backup of all local quotations and settings.');
    } catch (err: any) {
      error('Export Failed', err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Import Data JSON handler
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const result = await importAllData(text);
      if (result.success) {
        success('Import Successful', result.message);
        onDataReset(); // Reload state
      } else {
        error('Import Failed', result.message);
      }
    } catch (err: any) {
      error('Import Failed', err.message || 'Invalid JSON file structure');
    } finally {
      setIsImporting(false);
      // Reset input
      e.target.value = '';
    }
  };

  // Clear all data
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      success('Data Reset', 'All local quotations and custom settings have been cleared.');
      setIsClearModalOpen(false);
      onDataReset();
    } catch (err: any) {
      error('Clear Failed', err.message);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">Settings & AI Status</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify your local Ollama connection, manage offline backups, and configure privacy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ollama Connection & Health Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Ollama Local Engine</h2>
                <p className="text-xs text-slate-500">Self-hosted AI inference</p>
              </div>
            </div>

            <button
              onClick={onRefreshOllama}
              disabled={isCheckingOllama}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingOllama ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
          </div>

          {/* Details table */}
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Connection State</span>
              {ollamaStatus?.connected ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected & Responding
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  <AlertCircle className="w-3.5 h-3.5" /> Offline / Unreachable
                </span>
              )}
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Local Endpoint</span>
              <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                http://127.0.0.1:11434
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Target Model</span>
              <span className="font-semibold text-slate-800 font-mono">
                {ollamaStatus?.model || 'gemma3:1b'}
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Model Installed</span>
              <span>
                {ollamaStatus?.modelInstalled ? (
                  <span className="text-emerald-700 font-semibold">Installed & Ready</span>
                ) : (
                  <span className="text-amber-700 font-semibold">Not Found in Ollama</span>
                )}
              </span>
            </div>

            {ollamaStatus?.latencyMs !== undefined && (
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Response Ping</span>
                <span className="text-slate-700 font-medium">{ollamaStatus.latencyMs} ms</span>
              </div>
            )}

            {ollamaStatus?.error && (
              <div className="py-3">
                <span className="text-slate-500 font-medium block mb-1">Last Error Message:</span>
                <p className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] font-mono leading-relaxed">
                  {ollamaStatus.error}
                </p>
              </div>
            )}
          </div>

          {/* Setup guide */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <Terminal className="w-4 h-4 text-slate-600" />
              <span>Ollama Quick Setup Guide</span>
            </div>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Install Ollama from{' '}
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:underline font-medium inline-flex items-center gap-0.5"
                >
                  ollama.com <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                Open PowerShell / Terminal and run:{' '}
                <code className="bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  ollama run gemma3:1b
                </code>
              </li>
              <li>
                Once downloaded, click <strong>Test Connection</strong> above to verify.
              </li>
            </ol>
          </div>
        </div>

        {/* Data Persistence & Privacy Card */}
        <div className="space-y-6">
          {/* Privacy Notice */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Privacy & Local Storage</h2>
                <p className="text-xs text-slate-500">100% on-device data retention</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              KadeQuote is built on a <strong>local-first</strong> architecture. Quotations, customer
              contacts, business pricing, and numbering counters are stored exclusively inside your browser’s
              IndexedDB database.
            </p>

            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>No remote database or external cloud storage is utilized.</li>
              <li>No analytics or telemetry scripts are embedded.</li>
              <li>Ollama inference runs entirely on your local machine.</li>
              <li>Data is tied to this browser profile on this computer.</li>
            </ul>
          </div>

          {/* Backup, Import & Factory Reset */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Data Management & Backup</h2>
                <p className="text-xs text-slate-500">Export or restore your local database</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportData}
                disabled={isExporting}
                className="p-3 text-left rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group"
              >
                <Download className="w-4 h-4 text-emerald-700 mb-1.5" />
                <span className="block text-xs font-bold text-slate-900">Export All Data</span>
                <span className="text-[11px] text-slate-500">Download JSON backup</span>
              </button>

              <label className="p-3 text-left rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                <Upload className="w-4 h-4 text-slate-700 mb-1.5" />
                <span className="block text-xs font-bold text-slate-900">Import Data</span>
                <span className="text-[11px] text-slate-500">
                  {isImporting ? 'Validating...' : 'Restore from JSON file'}
                </span>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImportFile}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            </div>

            {/* Clear All Data Danger Zone */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(true)}
                className="w-full py-2.5 px-4 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All Local Data (Factory Reset)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearAll}
        title="Reset All Local Data?"
        description="This will permanently delete all quotations, custom business settings, and price lists from this browser. Please ensure you have exported a backup if you need to retain records."
        confirmLabel="Erase Everything"
        isDestructive={true}
        isLoading={isClearing}
      />
    </div>
  );
}
