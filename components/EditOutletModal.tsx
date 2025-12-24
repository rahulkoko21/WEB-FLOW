
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Stage, StageLog } from '../types.ts';
import { STAGES } from '../constants.ts';

interface EditOutletModalProps {
  outlet: Outlet;
  onClose: () => void;
  onSave: (updatedOutlet: Outlet) => void;
}

const EditOutletModal: React.FC<EditOutletModalProps> = ({ outlet, onClose, onSave }) => {
  const [formData, setFormData] = useState<Outlet>({ ...outlet });
  const [editingStageNote, setEditingStageNote] = useState<Stage | null>(null);
  const [tempStageNote, setTempStageNote] = useState('');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Outlet Configuration</h3>
              {isSaved && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full animate-in fade-in slide-in-from-left-2">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  CHANGES SAVED
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
          <div className="w-[400px] border-r border-slate-50 bg-slate-50/30 overflow-y-auto p-8 custom-scrollbar">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <i className="fa-solid fa-route text-indigo-500"></i>
              Pipeline Journey
            </h4>
            
            <div className="relative">
              <div className="absolute left-[22px] top-4 bottom-4 w-[2px] bg-slate-100"></div>

              <div className="space-y-10 relative">
                {STAGES.map((s, index) => {
                  const isActive = formData.currentStage === s.id;
                  const log = getStageLog(s.id);
                  const isCompleted = !!log && !isActive;

                  return (
                    <div key={s.id} className="relative group">
                      <div className="flex gap-6 w-full text-left items-start">
                        <button
                          type="button"
                          onClick={() => handleStageChange(s.id)}
                          className={`w-11 h-11 rounded-full flex items-center justify-center z-10 shadow-sm transition-all shrink-0 ring-4 ring-white ${
                            isActive 
                              ? 'bg-[#5D5CDE] text-white scale-110 shadow-[#5D5CDE]/30' 
                              : isCompleted 
                                ? 'bg-slate-100 text-slate-400' 
                                : 'bg-slate-50 text-slate-200'
                          }`}
                        >
                          <i className={`fa-solid ${s.icon} ${isActive ? 'text-base' : 'text-sm'}`}></i>
                        </button>

                        <div className="pt-0.5 flex-1 pr-8">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-black opacity-30 ${isActive ? 'text-[#5D5CDE] opacity-60' : ''}`}>
                              {index + 1}.
                            </span>
                            <h5 className={`text-[13px] font-bold uppercase tracking-wide transition-colors ${
                              isActive ? 'text-slate-800' : 'text-slate-400'
                            }`}>
                              {s.label}
                            </h5>
                          </div>
                          
                          {editingStageNote === s.id ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                autoFocus
                                value={tempStageNote}
                                onChange={(e) => setTempStageNote(e.target.value)}
                                className="w-full text-[11px] p-2 bg-white border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 resize-none font-medium"
                                rows={2}
                              />
                              <div className="flex gap-1 justify-end">
                                <button type="button" onClick={() => setEditingStageNote(null)} className="text-[9px] font-bold text-slate-400 px-2 py-1">Cancel</button>
                                <button type="button" onClick={handleSaveStageNote} className="text-[9px] font-bold bg-indigo-600 text-white px-2 py-1 rounded">Save Note</button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-0.5 relative">
                              <p className="text-[11px] text-slate-400 font-medium leading-tight italic">
                                {log?.note ? `"${log.note}"` : isActive ? 'Processing...' : 'No notes.'}
                              </p>
                              <button 
                                type="button"
                                onClick={() => handleEditNote(s.id, log?.note)}
                                className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-600 transition-all p-1"
                              >
                                <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                              </button>
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
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 ml-1 mb-1 block">Outlet Identity</span>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all placeholder:text-slate-300"
                      placeholder="Enter outlet name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 ml-1 mb-1 block">Operating Priority</span>
                      <div className="flex p-1 bg-slate-100 rounded-xl">
                        {(['low', 'medium', 'high'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setFormData({ ...formData, priority: p })}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                              formData.priority === p
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
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
                className="flex-1 px-8 py-4 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
              >
                Close Window
              </button>
              <button
                type="submit"
                className="flex-[2] px-8 py-4 bg-[#5D5CDE] text-white rounded-2xl font-bold hover:bg-[#4d4cbd] transition-all shadow-xl shadow-indigo-100 active:scale-95"
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
