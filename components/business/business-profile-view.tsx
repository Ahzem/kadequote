'use client';

import React, { useState } from 'react';
import {
  Building2,
  Save,
  Plus,
  Trash2,
  Upload,
  Layers,
} from 'lucide-react';
import { BusinessProfile, PriceListItem } from '@/types/business';
import { ItemCategory } from '@/types/quotation';
import { SUPPORTED_CURRENCIES, formatCurrency } from '@/lib/calculations/quotation';
import { saveBusinessProfile } from '@/lib/db';
import { useToast } from '@/components/ui/toast';

interface BusinessProfileViewProps {
  initialProfile: BusinessProfile;
  onProfileUpdated: (updated: BusinessProfile) => void;
}

export function BusinessProfileView({
  initialProfile,
  onProfileUpdated,
}: BusinessProfileViewProps) {
  const { success, error } = useToast();

  const [profile, setProfile] = useState<BusinessProfile>(initialProfile);
  const [isSaving, setIsSaving] = useState(false);

  // New price list item draft
  const [newPriceName, setNewPriceName] = useState('');
  const [newPriceCategory, setNewPriceCategory] = useState<ItemCategory>('material');
  const [newPriceUnit, setNewPriceUnit] = useState('piece');
  const [newPriceAmount, setNewPriceAmount] = useState<number>(0);

  // Handle Logo Upload as Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Invalid File', 'Please upload an image file (PNG, JPG, SVG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      error('Image Too Large', 'Please upload a logo image smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setProfile((prev) => ({ ...prev, logoBase64: base64 }));
      success('Logo Uploaded', 'Business logo will be embedded in quotations and PDFs.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setProfile((prev) => ({ ...prev, logoBase64: undefined }));
  };

  // Add Item to Price List
  const handleAddPriceItem = () => {
    if (!newPriceName.trim()) {
      error('Missing Name', 'Please enter an item name.');
      return;
    }

    const newItem: PriceListItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: newPriceName.trim(),
      category: newPriceCategory,
      unit: newPriceUnit.trim() || 'piece',
      defaultPrice: Math.max(0, newPriceAmount),
    };

    setProfile((prev) => ({
      ...prev,
      priceList: [...prev.priceList, newItem],
    }));

    setNewPriceName('');
    setNewPriceAmount(0);
    success('Added to Price List', `${newItem.name} added.`);
  };

  const handleRemovePriceItem = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      priceList: prev.priceList.filter((item) => item.id !== id),
    }));
  };

  // Save changes to IndexedDB
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await saveBusinessProfile(profile);
      onProfileUpdated(profile);
      success('Business Profile Saved', 'Your details and price list have been updated.');
    } catch (err: unknown) {
      error('Save Failed', err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Business Profile & Price List</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your company identity, default quotation terms, and reusable price list.
          </p>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Company Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Company Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business / Trading Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Apex Electrical & Plumbing"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Owner / Proprietor Name
                </label>
                <input
                  type="text"
                  value={profile.ownerName}
                  onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })}
                  placeholder="Sunil Perera"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+94 77 123 4567"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="contact@apex.lk"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Address</label>
                <textarea
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  rows={2}
                  placeholder="Workshop / Office address"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Quotation Defaults */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Quotation Defaults
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Currency</label>
                <select
                  value={profile.defaultCurrency}
                  onChange={(e) => setProfile({ ...profile, defaultCurrency: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Validity Period (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={profile.defaultValidityDays}
                  onChange={(e) =>
                    setProfile({ ...profile, defaultValidityDays: parseInt(e.target.value) || 14 })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Labour Rate ({profile.defaultCurrency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={profile.defaultLabourRate || 0}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      defaultLabourRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="2500"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-right"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Terms & Payment Conditions
              </label>
              <textarea
                value={profile.defaultTerms}
                onChange={(e) => setProfile({ ...profile, defaultTerms: e.target.value })}
                rows={4}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed font-mono"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Logo & Branding */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Business Logo
            </h2>

            {profile.logoBase64 ? (
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.logoBase64}
                    alt="Logo Preview"
                    className="max-h-24 max-w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="w-full py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                >
                  Remove Logo
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-200 hover:border-emerald-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-emerald-50/20 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700 flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                  Upload Company Logo
                </span>
                <span className="text-[11px] text-slate-400 mt-1">PNG, JPG, or SVG (Max 2MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your logo is stored directly in browser IndexedDB and automatically added to generated PDFs.
            </p>
          </div>
        </div>
      </div>

      {/* Reusable Price List Editor */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Saved Price List Reference</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              These items are sent as reference context to Gemma 3 1B to auto-match standard rates.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {profile.priceList.length} items configured
          </span>
        </div>

        {/* Add item inline form */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
            Add New Reusable Item
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Item Name</label>
              <input
                type="text"
                value={newPriceName}
                onChange={(e) => setNewPriceName(e.target.value)}
                placeholder="e.g. Copper wire 2.5mm"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Category</label>
              <select
                value={newPriceCategory}
                onChange={(e) => setNewPriceCategory(e.target.value as ItemCategory)}
                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 capitalize"
              >
                <option value="material">Material</option>
                <option value="labour">Labour</option>
                <option value="service">Service</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Unit</label>
              <input
                type="text"
                value={newPriceUnit}
                onChange={(e) => setNewPriceUnit(e.target.value)}
                placeholder="meter, piece, hr"
                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Default Price</label>
              <input
                type="number"
                min="0"
                step="any"
                value={newPriceAmount || ''}
                onChange={(e) => setNewPriceAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-right"
              />
            </div>

            <div className="sm:col-span-1">
              <button
                type="button"
                onClick={handleAddPriceItem}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Existing Price Items Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Unit</th>
                <th className="py-2.5 px-3 text-right">Default Rate</th>
                <th className="py-2.5 px-2 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profile.priceList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{item.name}</td>
                  <td className="py-2.5 px-3 capitalize text-slate-500 italic">{item.category}</td>
                  <td className="py-2.5 px-3 text-center text-slate-600">{item.unit}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                    {formatCurrency(item.defaultPrice, profile.defaultCurrency)}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemovePriceItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
