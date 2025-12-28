
import React from 'react';
import { Outlet } from '../types.ts';

interface ArchiveModalProps {
  outlets: Outlet[];
  onRestore: (id: string) => void;
  onDeletePermanent: (id: string) => void;
  onClose: () => void;
}

const ArchiveModal: React.FC<ArchiveModalProps> = ({ outlets, onRestore, onDeletePermanent, onClose }) => {
  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(ts));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[85vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-trash-can text-rose-500"></i>
              Recycle Bin
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {outlets.length} archived {outlets.length === 1 ? 'outlet' : 'outlets'} • Hidden from board & analytics
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {outlets.length > 0 ? (
            <div className="space-y-4">
              {outlets.map((o) => (
                <div key={o.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center justify-between group hover:bg-white hover:border-indigo-100 transition-all">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-black text-slate-700 truncate">{o.name}</h4>
                      {o.brand && (
                        <span className="text-[9px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase">{o.brand}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-2">
                      <span className="text-indigo-400">{o.currentStage}</span>
                      <span className="text-slate-200">|</span>
                      <span>Archived: {o.archivedAt ? formatDate(o.archivedAt) : 'Unknown'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRestore(o.id)}
                      className="h-10 px-4 bg-white border border-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-emerald-600 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                    >
                      <i className="fa-solid fa-arrow-up-from-bracket"></i>
                      Restore
                    </button>
                    <button
                      onClick={() => onDeletePermanent(o.id)}
                      className="w-10 h-10 bg-white border border-rose-100 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm active:scale-95"
                      title="Permanently Delete"
                    >
                      <i className="fa-solid fa-trash-can text-sm"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-300">
              <i className="fa-solid fa-trash-can text-6xl mb-6 opacity-10"></i>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Your bin is empty</p>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 flex bg-slate-50/50">
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200 active:scale-95 transition-all"
          >
            Close Recycle Bin
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArchiveModal;
