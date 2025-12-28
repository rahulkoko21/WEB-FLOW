import React, { useState, useEffect, useMemo } from 'react';
import { Stage, Outlet, StageLog, OutletStatus } from './types.ts';
import { STAGES, STAGE_ORDER } from './constants.ts';
import OutletCard from './components/OutletCard.tsx';
import AddOutletModal from './components/AddOutletModal.tsx';
import EditOutletModal from '././components/EditOutletModal.tsx';
import AnalyticsModal from './components/AnalyticsModal.tsx';
import ImportModal from './components/ImportModal.tsx';
import ArchiveModal from './components/ArchiveModal.tsx';

const App: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [activeAnalyticsOutletId, setActiveAnalyticsOutletId] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live Clock Update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const formattedLiveDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(currentTime);
  }, [currentTime]);

  const formattedLiveTime = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(currentTime);
  }, [currentTime]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('outlet_pipeline_data');
      if (saved) {
        setOutlets(JSON.parse(saved));
      } else {
        const initial: Outlet[] = [
          {
            id: '1',
            name: 'Urban Bites - Downtown',
            brand: 'Dil Daily',
            city: 'Bangalore',
            status: 'onboarding in progress',
            description: 'Premium cloud kitchen specializing in fusion street food.',
            currentStage: Stage.ONBOARDING_REQUEST,
            createdAt: Date.now() - 86400000 * 2,
            lastMovedAt: Date.now() - 86400000 * 2,
            history: [{ stage: Stage.ONBOARDING_REQUEST, timestamp: Date.now() - 86400000 * 2, note: 'Initial request received.' }],
            isArchived: false
          }
        ];
        setOutlets(initial);
      }
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('outlet_pipeline_data', JSON.stringify(outlets));
  }, [outlets]);

  const handleAddOutlet = (name: string, description: string, note: string, status: OutletStatus, brand?: string, city?: string) => {
    const newOutlet: Outlet = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      brand,
      city,
      status,
      description,
      currentStage: Stage.ONBOARDING_REQUEST,
      createdAt: Date.now(),
      lastMovedAt: Date.now(),
      history: [{ stage: Stage.ONBOARDING_REQUEST, timestamp: Date.now(), note }],
      isArchived: false
    };
    setOutlets(prev => [...prev, newOutlet]);
  };

  const handleImportOutlets = (importedOutlets: Outlet[]) => {
    setOutlets(prev => {
      const updatedList = [...prev];
      importedOutlets.forEach(imp => {
        const idx = updatedList.findIndex(o => o.name.toLowerCase() === imp.name.toLowerCase());
        if (imp.importAction === 'Update' && idx !== -1) {
          const existing = updatedList[idx];
          const stageChanged = existing.currentStage !== imp.currentStage;
          const newHistory = [...existing.history];
          
          if (stageChanged) {
            newHistory.push({ 
              stage: imp.currentStage, 
              timestamp: imp.lastMovedAt || Date.now(), 
              note: 'Moved via bulk data import' 
            });
          }

          updatedList[idx] = {
            ...existing,
            brand: imp.brand || existing.brand,
            city: imp.city || existing.city,
            status: imp.status || existing.status,
            currentStage: imp.currentStage,
            lastMovedAt: stageChanged ? (imp.lastMovedAt || Date.now()) : existing.lastMovedAt,
            history: newHistory,
            description: existing.description.includes('Imported from Excel') || existing.description.length < 5 
              ? imp.description 
              : existing.description
          };
        } else {
          const { importAction, ...cleanOutlet } = imp;
          updatedList.push({ ...(cleanOutlet as Outlet), isArchived: false });
        }
      });
      return updatedList;
    });
    setIsImportModalOpen(false);
  };

  const handleArchiveOutlet = (id: string) => {
    setOutlets(prev => prev.map(o => 
      o.id === id ? { ...o, isArchived: true, archivedAt: Date.now() } : o
    ));
  };

  const handleRestoreOutlet = (id: string) => {
    setOutlets(prev => prev.map(o => 
      o.id === id ? { ...o, isArchived: false, archivedAt: undefined } : o
    ));
  };

  const handlePermanentDelete = (id: string) => {
    if (confirm('Permanently delete this outlet? This action cannot be undone.')) {
      setOutlets(prev => prev.filter(o => o.id !== id));
    }
  };

  const handleUpdateNote = (id: string, note: string) => {
    setOutlets(prev => prev.map(o => {
      if (o.id === id) {
        const newHistory = [...o.history];
        let currentIdx = -1;
        for (let i = newHistory.length - 1; i >= 0; i--) {
          if (newHistory[i].stage === o.currentStage) {
            currentIdx = i;
            break;
          }
        }
        if (currentIdx !== -1) {
          newHistory[currentIdx] = { ...newHistory[currentIdx], note };
        } else {
          newHistory.push({ stage: o.currentStage, timestamp: Date.now(), note });
        }
        return { ...o, history: newHistory };
      }
      return o;
    }));
  };

  const handleSaveEdit = (updatedOutlet: Outlet) => {
    setOutlets(prev => prev.map(o => o.id === updatedOutlet.id ? updatedOutlet : o));
  };

  const handleMoveOutlet = (id: string, direction: 'forward' | 'backward') => {
    setOutlets(prev => prev.map(o => {
      if (o.id === id) {
        const currentIndex = STAGE_ORDER.indexOf(o.currentStage);
        const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < STAGE_ORDER.length) {
          const newStage = STAGE_ORDER[nextIndex];
          const newHistory = [...(o.history || [])];
          newHistory.push({ stage: newStage, timestamp: Date.now() });
          return { ...o, currentStage: newStage, lastMovedAt: Date.now(), history: newHistory };
        }
      }
      return o;
    }));
  };

  const handleShowHistory = (id: string) => {
    setActiveAnalyticsOutletId(id);
    setIsAnalyticsOpen(true);
  };

  // Only show non-archived outlets in the main pipeline
  const activeOutlets = useMemo(() => outlets.filter(o => !o.isArchived), [outlets]);
  const archivedOutlets = useMemo(() => outlets.filter(o => o.isArchived), [outlets]);

  const filteredOutlets = useMemo(() => {
    if (!searchTerm.trim()) return activeOutlets;
    const term = searchTerm.toLowerCase();
    return activeOutlets.filter(o => 
      o.name.toLowerCase().includes(term) || 
      (o.brand?.toLowerCase() || '').includes(term) ||
      (o.city?.toLowerCase() || '').includes(term) ||
      (o.status?.toLowerCase() || '').includes(term) ||
      o.description.toLowerCase().includes(term) || 
      o.history.some(h => h.note?.toLowerCase().includes(term))
    );
  }, [activeOutlets, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
      <header className="bg-white border-b border-slate-200 z-30 px-4 sm:px-6 py-3 sm:py-4 safe-top shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
              <i className="fa-solid fa-layer-group text-white text-lg sm:text-xl"></i>
            </div>
            <div className="flex-1 shrink-0">
              <h1 className="text-base sm:text-xl font-black text-slate-800 tracking-tight leading-none">Outlet Ops</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Pipeline</p>
                <span className="text-slate-200 text-[8px]">|</span>
                <p className="text-indigo-50 text-[9px] sm:text-[10px] font-bold whitespace-nowrap bg-indigo-600 px-2 py-0.5 rounded-full">
                  <i className="fa-regular fa-calendar-check mr-1 text-white"></i>
                  <span className="text-white">{formattedLiveDate}</span> <span className="ml-1 text-indigo-100 font-medium">{formattedLiveTime}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <i className={`fa-solid fa-magnifying-glass text-sm transition-colors ${searchTerm ? 'text-indigo-500' : 'text-slate-300 group-focus-within:text-indigo-400'}`}></i>
            </div>
            <input
              type="text"
              placeholder="Search outlets, cities, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-full sm:rounded-2xl py-2.5 sm:py-3 pl-10 pr-10 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
             <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-600 px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-slate-200 flex items-center justify-center transition-all active:scale-95"
            >
              <i className="fa-solid fa-file-import sm:mr-2"></i>
              <span className="hidden sm:inline">Import</span>
            </button>
            <button 
              onClick={() => {
                setActiveAnalyticsOutletId(undefined);
                setIsAnalyticsOpen(true);
              }}
              className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-600 px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-slate-200 flex items-center justify-center transition-all active:scale-95"
            >
              <i className="fa-solid fa-chart-line sm:mr-2"></i>
              <span className="hidden sm:inline">Analytics</span>
            </button>
            <button 
              onClick={() => setIsArchiveOpen(true)}
              className="relative flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-600 px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-slate-200 flex items-center justify-center transition-all active:scale-95"
            >
              <i className="fa-solid fa-trash-can sm:mr-2"></i>
              <span className="hidden sm:inline">Bin</span>
              {archivedOutlets.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {archivedOutlets.length}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xl shadow-indigo-100 flex items-center justify-center transition-all active:scale-95"
            >
              <i className="fa-solid fa-plus sm:mr-2"></i>
              <span className="hidden sm:inline">New Outlet</span>
              <span className="sm:hidden ml-1">Add</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto p-4 sm:p-6 md:p-8 pipeline-container">
        <div className="flex gap-4 sm:gap-6 min-w-max h-full pb-4">
          {STAGES.map((stage, index) => {
            const stageOutlets = filteredOutlets.filter(o => o.currentStage === stage.id);
            const totalStageCount = activeOutlets.filter(o => o.currentStage === stage.id).length;
            
            return (
              <div key={stage.id} className="flex flex-col w-[280px] sm:w-[320px] pipeline-column">
                <div className={`mb-3 sm:mb-4 p-3 rounded-2xl border ${stage.color} flex flex-col gap-1 shadow-sm`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black opacity-30 mr-0.5">{index + 1}.</span>
                      <i className={`fa-solid ${stage.icon} text-xs sm:text-sm`}></i>
                      <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider">{stage.label}</h3>
                    </div>
                    <span className="bg-white/50 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border border-current">
                      {searchTerm ? `${stageOutlets.length}/${totalStageCount}` : stageOutlets.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-[400px] bg-slate-200/30 rounded-2xl p-3 sm:p-4 border border-slate-200/50 overflow-y-auto">
                  {stageOutlets.length > 0 ? (
                    stageOutlets.map(outlet => (
                      <OutletCard 
                        key={outlet.id} 
                        outlet={outlet} 
                        onMove={handleMoveOutlet}
                        onDelete={handleArchiveOutlet}
                        onShowHistory={handleShowHistory}
                        onUpdateNote={handleUpdateNote}
                        onEdit={setEditingOutlet}
                      />
                    ))
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 py-12">
                      <i className={`fa-solid ${searchTerm ? 'fa-magnifying-glass' : stage.icon} text-2xl sm:text-3xl mb-3 opacity-20`}></i>
                      <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 text-center px-4">
                        {searchTerm ? 'No results' : 'Empty'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {isAddModalOpen && (
        <AddOutletModal 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={handleAddOutlet} 
        />
      )}

      {isImportModalOpen && (
        <ImportModal
          outlets={activeOutlets}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportOutlets}
        />
      )}

      {editingOutlet && (
        <EditOutletModal 
          outlet={editingOutlet}
          onClose={() => setEditingOutlet(null)}
          onSave={handleSaveEdit}
          onDelete={handleArchiveOutlet}
        />
      )}

      {isAnalyticsOpen && (
        <AnalyticsModal 
          outlets={activeOutlets}
          initialSelectedId={activeAnalyticsOutletId}
          onClose={() => setIsAnalyticsOpen(false)} 
        />
      )}

      {isArchiveOpen && (
        <ArchiveModal
          outlets={archivedOutlets}
          onRestore={handleRestoreOutlet}
          onDeletePermanent={handlePermanentDelete}
          onClose={() => setIsArchiveOpen(false)}
        />
      )}
    </div>
  );
};

export default App;