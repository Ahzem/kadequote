'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Building2,
  Settings,
  Sparkles,
  Menu,
  X,
  Cpu,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { Quotation } from '@/types/quotation';
import { BusinessProfile, DEFAULT_BUSINESS_PROFILE } from '@/types/business';
import { OllamaStatusResponse } from '@/types/ai';
import {
  getAllQuotations,
  getBusinessProfile,
  deleteQuotation,
  duplicateQuotation,
} from '@/lib/db';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { QuotationWizard } from '@/components/quotations/quotation-wizard';
import { QuotationsList } from '@/components/quotations/quotations-list';
import { BusinessProfileView } from '@/components/business/business-profile-view';
import { SettingsView } from '@/components/settings/settings-view';

type ActiveTab = 'dashboard' | 'create' | 'quotations' | 'profile' | 'settings';

function MainApp() {
  const { error } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // App data state
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(DEFAULT_BUSINESS_PROFILE);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Ollama health status
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatusResponse | null>(null);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);

  // Check Ollama status
  const checkOllamaHealth = useCallback(async () => {
    setIsCheckingOllama(true);
    try {
      const res = await fetch('/api/ai/status');
      if (res.ok) {
        const data: OllamaStatusResponse = await res.json();
        setOllamaStatus(data);
      } else {
        setOllamaStatus({
          connected: false,
          model: 'gemma3:1b',
          modelInstalled: false,
          availableModels: [],
          error: `HTTP ${res.status}: Failed to reach local status endpoint`,
        });
      }
    } catch (err: any) {
      setOllamaStatus({
        connected: false,
        model: 'gemma3:1b',
        modelInstalled: false,
        availableModels: [],
        error: err.message || 'Network error querying Ollama status',
      });
    } finally {
      setIsCheckingOllama(false);
    }
  }, []);

  // Load IndexedDB data
  const loadDatabaseData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [quotes, profile] = await Promise.all([
        getAllQuotations(),
        getBusinessProfile(),
      ]);
      setQuotations(quotes);
      setBusinessProfile(profile);
    } catch (err: any) {
      console.error('Failed to load local data:', err);
      error('Storage Error', 'Could not open IndexedDB in this browser.');
    } finally {
      setIsLoadingData(false);
    }
  }, [error]);

  useEffect(() => {
    loadDatabaseData();
    checkOllamaHealth();
  }, [loadDatabaseData, checkOllamaHealth]);

  // Actions
  const handleCreateNew = () => {
    setEditingQuotation(null);
    setActiveTab('create');
    setMobileMenuOpen(false);
  };

  const handleEditQuotation = (q: Quotation) => {
    setEditingQuotation(q);
    setActiveTab('create');
    setMobileMenuOpen(false);
  };

  const handleQuotationSaved = (saved: Quotation) => {
    setQuotations((prev) => {
      const idx = prev.findIndex((item) => item.id === saved.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
    setEditingQuotation(null);
    setActiveTab('quotations');
  };

  const handleDuplicate = async (id: string) => {
    const duplicated = await duplicateQuotation(id);
    setQuotations((prev) => [duplicated, ...prev]);
  };

  const handleDelete = async (id: string) => {
    await deleteQuotation(id);
    setQuotations((prev) => prev.filter((q) => q.id !== id));
  };

  const handleProfileUpdated = (updated: BusinessProfile) => {
    setBusinessProfile(updated);
  };

  const handleDataReset = () => {
    loadDatabaseData();
    setActiveTab('dashboard');
  };

  interface NavItem {
    id: ActiveTab;
    label: string;
    icon: any;
    badge?: number;
  }

  // Navigation Items
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create', label: 'Create Quotation', icon: FilePlus },
    { id: 'quotations', label: 'All Quotations', icon: FileText, badge: quotations.length },
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'settings', label: 'Settings & AI', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-800 antialiased font-sans">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm">
            KQ
          </div>
          <span className="font-bold text-base tracking-tight">KadeQuote</span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Slide-down Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-1 z-30 sticky top-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'create') setEditingQuotation(null);
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === item.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 sticky top-0 h-screen select-none justify-between p-5">
        <div className="space-y-6">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-md shadow-emerald-500/20">
              KQ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-white tracking-tight">KadeQuote</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Local AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Offline Quotation Maker</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'create') setEditingQuotation(null);
                    setActiveTab(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Live Ollama Status Indicator */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('settings')}
            className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
                Ollama Engine
              </span>
              <span className="flex h-2 w-2 relative">
                {ollamaStatus?.connected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                )}
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-200 truncate">
              {ollamaStatus?.model || 'gemma3:1b'}
            </div>

            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
              <span>{ollamaStatus?.connected ? 'Online (Local)' : 'Offline / Stopped'}</span>
              {ollamaStatus?.latencyMs !== undefined && (
                <span className="text-slate-400 font-mono">{ollamaStatus.latencyMs}ms</span>
              )}
            </div>
          </button>

          <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Zero cloud transfer • 100% Private</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {isLoadingData ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium">Opening local database...</p>
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <DashboardView
                quotations={quotations}
                businessProfile={businessProfile}
                ollamaStatus={ollamaStatus}
                onRefreshOllama={checkOllamaHealth}
                isCheckingOllama={isCheckingOllama}
                onCreateNew={handleCreateNew}
                onViewAll={() => setActiveTab('quotations')}
                onEditQuotation={handleEditQuotation}
                onGoToSettings={() => setActiveTab('settings')}
              />
            )}

            {/* Create / Edit Quotation Tab */}
            {activeTab === 'create' && (
              <QuotationWizard
                key={editingQuotation ? editingQuotation.id : 'new-quotation'}
                initialQuotation={editingQuotation}
                businessProfile={businessProfile}
                onSaved={handleQuotationSaved}
                onCancel={() => {
                  setEditingQuotation(null);
                  setActiveTab('quotations');
                }}
              />
            )}

            {/* All Quotations Tab */}
            {activeTab === 'quotations' && (
              <QuotationsList
                quotations={quotations}
                businessProfile={businessProfile}
                onCreateNew={handleCreateNew}
                onEdit={handleEditQuotation}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            )}

            {/* Business Profile Tab */}
            {activeTab === 'profile' && (
              <BusinessProfileView
                initialProfile={businessProfile}
                onProfileUpdated={handleProfileUpdated}
              />
            )}

            {/* Settings & AI Status Tab */}
            {activeTab === 'settings' && (
              <SettingsView
                ollamaStatus={ollamaStatus}
                onRefreshOllama={checkOllamaHealth}
                isCheckingOllama={isCheckingOllama}
                onDataReset={handleDataReset}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
