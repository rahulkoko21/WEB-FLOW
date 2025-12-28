
import React, { useState } from 'react';
import { generateOutletDescription } from '../services/geminiService.ts';
import { BRANDS, CITIES, STATUSES } from '../constants.ts';
import { OutletStatus } from '../types.ts';

interface AddOutletModalProps {
  onClose: () => void;
  onAdd: (name: string, description: string, note: string, status: OutletStatus, brand?: string, city?: string) => void;
}

const AddOutletModal: React.FC<AddOutletModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<OutletStatus>('onboarding in progress');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name, description || 'New outlet request.', note, status, brand || undefined, city || undefined);
    onClose();
  };

  const handleAutoDescription = async () => {
    if (!name.trim()) return;
    setIsGenerating(true);
    const desc = await generateOutletDescription(name);
    setDescription(desc);
    setIsGenerating(false);
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBrand = e.target.value;
    setBrand(selectedBrand);
    if (selectedBrand && !name) {
      setName(selectedBrand);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Add New Outlet</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand</label>
              <div className="relative">
                <select
                  value={brand}
                  onChange={handleBrandChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none font-medium text-slate-700"
                >
                  <option value="">-- Brand --</option>
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">City</label>
              <div className="relative">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none font-medium text-slate-700"
                >
                  <option value="">-- City --</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Operational Status</label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OutletStatus)}
                className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none font-bold text-indigo-700"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 text-[10px] pointer-events-none"></i>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Outlet Name / Location</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dil Daily - Koramangala"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-slate-700">Description</label>
              <button
                type="button"
                onClick={handleAutoDescription}
                disabled={!name.trim() || isGenerating}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 flex items-center gap-1"
              >
                {isGenerating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-sparkles"></i>}
                AI Write
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us more about this outlet..."
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-xl shadow-slate-200 mt-2"
          >
            Create Outlet Entry
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddOutletModal;
