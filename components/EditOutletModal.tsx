
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Stage, StageLog, OutletStatus } from '../types.ts';
import { STAGES, BRANDS, CITIES, STATUSES, STAGE_ORDER } from '../constants.ts';

interface EditOutletModalProps {
  outlet: Outlet;
  onClose: () => void;
  onSave: (updatedOutlet: Outlet) => void;
  onDelete: (id: string) => void;
}

const EditOutletModal: React.FC<EditOutletModalProps> = ({ outlet, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Outlet>({ ...outlet });
  const [editingStageNote, setEditingStageNote] = useState<Stage | null>(null);
  const [editingStageDate, setEditingStageDate] = useState<Stage | null>(null);
  const [tempStageNote, setTempStageNote] = useState('');
  const [tempStageDate, setTempStageDate] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const firstRender = useRef(true);

  // Auto-save effect with debounce
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onSave(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 800);

    return () => clearTimeout(timer);
  }, [formData, onSave]);

  const handleStageChange = (newStage: Stage) => {
    if (newStage === formData.currentStage) return;
    
    let newHistory = [...formData.history];
    let existingLogIndex = -1;
    for (let i = newHistory.length - 1; i >= 0; i--) {
      if (newHistory[i].stage === newStage) {
        existingLogIndex = i;
        break;
      }
    }
    
    if (existingLogIndex === -1) {
      newHistory.push({ stage: newStage, timestamp: Date.now() });
    } else {
      newHistory[existingLogIndex] = { ...newHistory[existingLogIndex], timestamp: Date.now() };
    }

    setFormData({
      ...formData,
      currentStage: newStage,
      lastMovedAt: Date.now(),
      history: newHistory
    });
  };

  const handleEditNote = (stage: Stage, currentNote: string = '') => {
    setEditingStageNote(stage);
    setTempStageNote(currentNote);
  };

  const handleEditDate = (stage: Stage, currentTs: number) => {
    setEditingStageDate(stage);
    // Format timestamp for datetime-local input (YYYY-MM-DDTHH:mm)
    const date = new Date(currentTs);
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    setTempStageDate(localISOTime);
  };

  const handleSaveStageNote = () => {
    if (!editingStageNote) return;
    const newHistory = [...formData.history];
    let logIdx = -1;
    for (let i = newHistory.length - 1; i >= 0; i--) {
      if (newHistory[i].stage === editingStageNote) {
        logIdx = i;
        break;
      }
    }
    
    if (logIdx !== -1) {
      newHistory[logIdx] = { ...newHistory[logIdx], note: tempStageNote };
    } else {
      newHistory.push({ stage: editingStageNote, timestamp: Date.now(), note: tempStageNote });
    }

    setFormData({ ...formData, history: newHistory });
    setEditingStageNote(null);
  };

  const handleSaveStageDate = () => {
    if (!editingStageDate) return;
    const newHistory = [...formData.history];
    let logIdx = -1;
    for (let i = newHistory.length - 1; i >= 0; i--) {
      if (newHistory[i].stage === editingStageDate) {
        logIdx = i;
        break;
      }
    }
    
    const newTs = new Date(tempStageDate).getTime();
    if (isNaN(newTs)) return;

    if (logIdx !== -1) {
      newHistory[logIdx] = { ...newHistory[logIdx], timestamp: newTs };
    } else {
      newHistory.push({ stage: editingStageDate, timestamp: newTs });
    }

    // Sort history by timestamp to maintain logical order if dates were back-dated
    newHistory.sort((a, b) => a.timestamp - b.timestamp);

    setFormData({ ...formData, history: newHistory });
    setEditingStageDate(null);
  };

  const handleDelete = () => {
    onDelete(outlet.id);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const getStageLog = (stageId: Stage) => {
    for (let i = formData.history.length - 1; i >= 0; i--) {
      if (formData.history[i].stage === stageId) {
        return formData.history[i];
      }
    }
    return undefined;
  };

  const formatDisplayDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(ts));
  };

  // Check if current brand is custom (not in list)
  const isCustomBrand = formData.brand && !BRANDS.includes(formData.brand);
  const currentStageIndex = STAGE_ORDER.indexOf(formData.currentStage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Outlet Configuration</h3>
              {formData.brand && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider shadow-md shadow-slate-200">
                  {formData.brand}
                </span>
              )}
              {isSaved && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full animate-in fade-in slide-in-from-left-2">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  SAVED
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Management Interface • Auto-saving active</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[420px] border-r border-slate-50 bg-slate-50/30 overflow-y-auto p-8 custom-scrollbar">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <i className="fa-solid fa-route text-indigo-500"></i>
              Pipeline Journey
            </h4>
            
            <div className="relative">
              {/* Static background vertical line */}
              <div className="absolute left-[22px] top-4 bottom-4 w-[2px] bg-slate-100"></div>
              
              {/* Dynamic colored vertical line segment */}
              <div 
                className="absolute left-[22px] top-4 w-[2px] bg-[#5D5CDE] transition-all duration-700"
                style={{ height: `${(currentStageIndex / (STAGE_ORDER.length - 1)) * 100}%`, maxHeight: 'calc(100% - 32px)' }}
              ></div>

              <div className="space-y-10 relative">
                {STAGES.map((s, index) => {
                  const isActive = index === currentStageIndex;
                  const isPast = index < currentStageIndex;
                  const log = getStageLog(s.id);
                  const isCompleted = !!log && isPast;

                  return (
                    <div key={s.id} className="relative group">
                      <div className="flex gap-6 w-full text-left items-start">
                        <button
                          type="button"
                          onClick={() => handleStageChange(s.id)}
                          className={`w-11 h-11 rounded-full flex items-center justify-center z-10 shadow-sm transition-all shrink-0 ring-4 ring-white ${
                            isActive 
                              ? 'bg-[#5D5CDE] text-white scale-110 shadow-[#5D5CDE]/30' 
                              : isPast 
                                ? 'bg-[#5D5CDE] text-white' 
                                : 'bg-slate-50 text-slate-200'
                          }`}
                        >
                          {isPast ? (
                             <i className="fa-solid fa-check text-sm"></i>
                          ) : (
                             <i className={`fa-solid ${s.icon} ${isActive ? 'text-base' : 'text-sm'}`}></i>
                          )}
                        </button>

                        <div className="pt-0.5 flex-1 pr-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-black opacity-30 ${isActive || isPast ? 'text-[#5D5CDE] opacity-60' : ''}`}>
                                {index + 1}.
                              </span>
                              <h5 className={`text-[13px] font-bold uppercase tracking-wide transition-colors ${
                                isActive || isPast ? 'text-slate-800' : 'text-slate-400'
                              }`}>
                                {s.label}
                              </h5>
                            </div>
                          </div>
                          
                          {/* Date Display and Editor */}
                          <div className="mt-1 flex items-center gap-2">
                            {editingStageDate === s.id ? (
                              <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-1">
                                <input 
                                  type="datetime-local"
                                  value={tempStageDate}
                                  onChange={(e) => setTempStageDate(e.target.value)}
                                  className="text-[10px] font-bold bg-white border border-indigo-200 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                                <div className="flex justify-end gap-1">
                                  <button type="button" onClick={() => setEditingStageDate(null)} className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-1">Cancel</button>
                                  <button type="button" onClick={handleSaveStageDate} className="text-[9px] font-black bg-indigo-600 text-white uppercase tracking-widest px-2 py-1 rounded">Update</button>
                                </div>
                              </div>
                            ) : (
                              log && (
                                <button 
                                  type="button"
                                  onClick={() => handleEditDate(s.id, log.timestamp)}
                                  className={`flex items-center gap-1.5 text-[9px] font-bold transition-colors group/date ${isPast ? 'text-[#5D5CDE]' : 'text-slate-400'} hover:text-indigo-600`}
                                >
                                  <i className="fa-solid fa-calendar-day text-[10px] opacity-40 group-hover/date:opacity-100"></i>
                                  {formatDisplayDate(log.timestamp)}
                                  <i className="fa-solid fa-pencil text-[8px] opacity-0 group-hover/date:opacity-100 ml-1"></i>
                                </button>
                              )
                            )}
                          </div>

                          {/* Note Display and Editor */}
                          {editingStageNote === s.id ? (
                            <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                              <textarea
                                autoFocus
                                value={tempStageNote}
                                onChange={(e) => setTempStageNote(e.target.value)}
                                className="w-full text-[11px] p-2 bg-white border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 resize-none font-medium"
                                rows={2}
                                placeholder="Add process note..."
                              />
                              <div className="flex gap-1 justify-end">
                                <button type="button" onClick={() => setEditingStageNote(null)} className="text-[9px] font-bold text-slate-400 px-2 py-1">Cancel</button>
                                <button type="button" onClick={handleSaveStageNote} className="text-[9px] font-bold bg-indigo-600 text-white px-2 py-1 rounded">Save Note</button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1 relative pr-6">
                              <p className={`text-[11px] font-medium leading-tight italic ${isActive || isPast ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {log?.note ? `"${log.note}"` : isActive ? 'Phase currently active...' : ''}
                              </p>
                              {log && (
                                <button 
                                  type="button"
                                  onClick={() => handleEditNote(s.id, log?.note)}
                                  className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-600 transition-all p-1"
                                >
                                  <i className="fa-solid fa-note-sticky text-[10px]"></i>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 p-10 overflow-y-auto space-y-8 bg-white">
            <div className="grid grid-cols-1 gap-8">
              <section>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">General Information</label>
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 ml-1 mb-1 block">Brand Selection</span>
                      <div className="relative">
                        <select
                          value={formData.brand || ''}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value || undefined })}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all appearance-none cursor-pointer hover:bg-slate-50"
                        >
                          <option value="">-- No Brand --</option>
                          {BRANDS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          {isCustomBrand && (
                            <option value={formData.brand}>{formData.brand} (Preserve Custom)</option>
                          )}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 ml-1 mb-1 block">City</span>
                      <div className="relative">
                        <select
                          value={formData.city || ''}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value || undefined })}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all appearance-none cursor-pointer hover:bg-slate-50"
                        >
                          <option value="">-- No City --</option>
                          {CITIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 ml-1 mb-1 block">Outlet Name / Location</span>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all placeholder:text-slate-300"
                        placeholder="e.g. Dil Daily - CBD"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 ml-1 mb-1 block">Operational Status</span>
                      <div className="relative">
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as OutletStatus })}
                          className="w-full px-5 py-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-black text-indigo-700 transition-all appearance-none cursor-pointer"
                        >
                          {STATUSES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Detailed Overview</label>
                <div className="space-y-6">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 ml-1 mb-1 block">Description</span>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm text-slate-600 resize-none leading-relaxed"
                      placeholder="Add a brief description..."
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="pt-6 flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-4 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 text-xs uppercase tracking-widest"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 px-4 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-bold hover:bg-rose-600 hover:text-white transition-all active:scale-95 text-xs flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <i className="fa-solid fa-trash-can"></i>
                Archive
              </button>
              <button
                type="submit"
                className="flex-[2] px-8 py-4 bg-[#5D5CDE] text-white rounded-2xl font-bold hover:bg-[#4d4cbd] transition-all shadow-xl shadow-indigo-100 active:scale-95 text-sm uppercase tracking-widest"
              >
                Done Editing
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditOutletModal;
