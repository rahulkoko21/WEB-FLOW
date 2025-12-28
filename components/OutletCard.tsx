
import React, { useState, useMemo } from 'react';
import { Outlet, Stage } from '../types.ts';
import { STAGE_ORDER } from '../constants.ts';

interface OutletCardProps {
  outlet: Outlet;
  onMove: (id: string, direction: 'forward' | 'backward') => void;
  onDelete: (id: string) => void;
  onShowHistory: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onEdit: (outlet: Outlet) => void;
}

const OutletCard: React.FC<OutletCardProps> = ({ outlet, onMove, onDelete, onShowHistory, onUpdateNote, onEdit }) => {
  const [isEditingNote, setIsEditingNote] = useState(false);
  
  const currentStageNote = useMemo(() => {
    let lastLog = undefined;
    for (let i = outlet.history.length - 1; i >= 0; i--) {
      if (outlet.history[i].stage === outlet.currentStage) {
        lastLog = outlet.history[i];
        break;
      }
    }
    return lastLog?.note || '';
  }, [outlet.history, outlet.currentStage]);

  const [tempNote, setTempNote] = useState(currentStageNote);

  React.useEffect(() => {
    setTempNote(currentStageNote);
  }, [currentStageNote]);

  const stageIndex = STAGE_ORDER.indexOf(outlet.currentStage);
  const canMoveBackward = stageIndex > 0;
  const canMoveForward = stageIndex < STAGE_ORDER.length - 1;

  const getStatusStyle = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'inactive': return 'bg-slate-50 text-slate-500 border-slate-100';
      case 'closed': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'deboarded': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'training pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'confirmation pending': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'onboarding in progress': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const daysInStage = Math.floor((Date.now() - outlet.lastMovedAt) / (1000 * 60 * 60 * 24));

  const handleSaveNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNote(outlet.id, tempNote);
    setIsEditingNote(false);
  };

  const handleCancelNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempNote(currentStageNote);
    setIsEditingNote(false);
  };

  return (
    <div 
      onClick={() => onEdit(outlet)}
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group overflow-hidden cursor-pointer hover:border-indigo-200"
    >
      <div className="flex justify-end items-start mb-2">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsEditingNote(!isEditingNote); }}
            className={`text-slate-300 hover:text-amber-500 transition-colors ${isEditingNote ? 'text-amber-500' : ''}`}
            title="Edit Stage Note"
          >
            <i className="fa-solid fa-note-sticky text-xs"></i>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onShowHistory(outlet.id); }}
            className="text-slate-300 hover:text-indigo-500 transition-colors"
            title="View Journey History"
          >
            <i className="fa-solid fa-clock-rotate-left text-xs"></i>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(outlet.id); }}
            className="text-slate-300 hover:text-rose-500 transition-colors"
            title="Delete Outlet"
          >
            <i className="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>
      
      <div className="flex gap-1.5 flex-wrap mb-1">
        {outlet.brand && (
          <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md truncate">
            {outlet.brand}
          </span>
        )}
        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md truncate ${getStatusStyle(outlet.status)}`}>
          {outlet.status}
        </span>
      </div>

      <h4 className="font-semibold text-slate-800 text-sm mb-1 truncate" title={outlet.name}>
        {outlet.name}
      </h4>
      <p className="text-slate-500 text-[11px] line-clamp-2 mb-3 leading-relaxed">
        {outlet.description}
      </p>

      {isEditingNote ? (
        <div className="mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <textarea
            autoFocus
            value={tempNote}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setTempNote(e.target.value)}
            className="w-full text-[11px] p-2 bg-amber-50 border border-amber-200 rounded-lg outline-none focus:ring-1 focus:ring-amber-300 resize-none"
            placeholder={`Note for ${outlet.currentStage}...`}
            rows={3}
          />
          <div className="flex justify-end gap-1 mt-1">
            <button onClick={handleCancelNote} className="text-[9px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1">Cancel</button>
            <button onClick={handleSaveNote} className="text-[9px] font-bold bg-amber-500 text-white px-2 py-1 rounded shadow-sm hover:bg-amber-600">Save</button>
          </div>
        </div>
      ) : currentStageNote ? (
        <div className="mb-4 p-2 bg-amber-50/30 rounded-lg border-l-2 border-amber-200">
          <p className="text-[10px] text-amber-900 line-clamp-2 italic">
            "{currentStageNote}"
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-4">
        <div className="flex items-center">
          <i className="fa-regular fa-clock mr-1"></i>
          {daysInStage === 0 ? 'Today' : `${daysInStage}d`}
        </div>
        {outlet.city && (
          <div className="flex items-center opacity-60">
            <i className="fa-solid fa-location-dot mr-1 text-[8px]"></i>
            {outlet.city}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-3">
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMove(outlet.id, 'backward'); }}
            disabled={!canMoveBackward}
            className={`w-7 h-7 flex items-center justify-center rounded-md border ${canMoveBackward ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-100 text-slate-200 cursor-not-allowed'}`}
          >
            <i className="fa-solid fa-chevron-left text-[10px]"></i>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMove(outlet.id, 'forward'); }}
            disabled={!canMoveForward}
            className={`w-7 h-7 flex items-center justify-center rounded-md border ${canMoveForward ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-100 text-slate-200 cursor-not-allowed'}`}
          >
            <i className="fa-solid fa-chevron-right text-[10px]"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutletCard;
