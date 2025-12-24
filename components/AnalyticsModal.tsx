
import React, { useState, useMemo } from 'react';
import { Outlet, Stage } from '../types.ts';
import { STAGES, STAGE_ORDER } from '../constants.ts';

interface AnalyticsModalProps {
  outlets: Outlet[];
  onClose: () => void;
  initialSelectedId?: string;
}

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ outlets, onClose, initialSelectedId }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journey'>('dashboard');
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(initialSelectedId || (outlets[0]?.id || null));

  const selectedOutlet = outlets.find(o => o.id === selectedOutletId);

  // Advanced Stats Calculation
  const stats = useMemo(() => {
    const total = outlets.length;
    const live = outlets.filter(o => o.currentStage === Stage.OUTLET_LIVE).length;
    const inPipeline = total - live;
    
    // Calculate delays
    const delayedOutlets = outlets.filter(o => {
      if (o.currentStage === Stage.OUTLET_LIVE) return false;
      const stageInfo = STAGES.find(s => s.id === o.currentStage);
      if (!stageInfo) return false;
      const daysInStage = Math.floor((Date.now() - o.lastMovedAt) / (1000 * 60 * 60 * 24));
      return daysInStage > stageInfo.targetDays;
    });

    // Average cycle time for LIVE outlets (from creation to live)
    const liveOutlets = outlets.filter(o => o.currentStage === Stage.OUTLET_LIVE);
    const avgCycleTime = liveOutlets.length > 0 
      ? Math.round(liveOutlets.reduce((acc, o) => acc + (o.lastMovedAt - o.createdAt), 0) / liveOutlets.length / (1000 * 60 * 60 * 24))
      : 0;

    return { total, live, inPipeline, delayedCount: delayedOutlets.length, avgCycleTime, delayedOutlets };
  }, [outlets]);

  // Stage performance data
  const stageMetrics = useMemo(() => {
    return STAGES.map(stage => {
      const stageOutlets = outlets.filter(o => o.currentStage === stage.id);
      const avgDays = stageOutlets.length > 0
        ? (stageOutlets.reduce((acc, o) => acc + (Date.now() - o.lastMovedAt), 0) / stageOutlets.length / (1000 * 60 * 60 * 24)).toFixed(1)
        : 0;
      
      const isBottleneck = Number(avgDays) > stage.targetDays && stage.targetDays > 0;

      return {
        ...stage,
        count: stageOutlets.length,
        avgDays,
        isBottleneck
      };
    });
  }, [outlets]);

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(ts));
  };

  const getStageInfo = (stageId: Stage) => STAGES.find(s => s.id === stageId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
      <div className="bg-white rounded-[2rem] w-full max-w-6xl h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <i className="fa-solid fa-chart-pie text-2xl"></i>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Executive Analytics</h3>
              <div className="flex items-center gap-3">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Global Pipeline Performance</p>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <p className="text-indigo-500 text-xs font-bold uppercase tracking-widest">Real-time Metrics</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('journey')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'journey' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Outlet Journey
            </button>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-200 text-slate-400 transition-colors ml-2">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'dashboard' ? (
            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50 custom-scrollbar">
              {/* Summary Grid */}
              <div className="grid grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Live</p>
                  <div className="flex items-end justify-between">
                    <h4 className="text-4xl font-black text-slate-800">{stats.live}</h4>
                    <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg text-[10px] font-black">
                      <i className="fa-solid fa-check mr-1"></i> ACTIVE
                    </span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">In Pipeline</p>
                  <div className="flex items-end justify-between">
                    <h4 className="text-4xl font-black text-indigo-600">{stats.inPipeline}</h4>
                    <span className="text-indigo-400 text-[10px] font-bold">TOTAL OPS</span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm ring-2 ring-rose-500/5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Delayed Outlets</p>
                  <div className="flex items-end justify-between">
                    <h4 className={`text-4xl font-black ${stats.delayedCount > 0 ? 'text-rose-500' : 'text-slate-300'}`}>{stats.delayedCount}</h4>
                    {stats.delayedCount > 0 && (
                      <span className="text-rose-500 bg-rose-50 px-2 py-1 rounded-lg text-[10px] font-black animate-pulse">
                        <i className="fa-solid fa-triangle-exclamation mr-1"></i> ACTION REQ.
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Avg Cycle (Days)</p>
                  <div className="flex items-end justify-between">
                    <h4 className="text-4xl font-black text-slate-800">{stats.avgCycleTime}</h4>
                    <span className="text-slate-400 text-[10px] font-bold">START TO FINISH</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-8">
                {/* Stage Distribution */}
                <div className="col-span-7 space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Pipeline Efficiency & Bottlenecks</h5>
                    <div className="space-y-6">
                      {stageMetrics.filter(m => m.id !== Stage.OUTLET_LIVE).map(metric => (
                        <div key={metric.id} className="group">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${metric.color}`}>
                                <i className={`fa-solid ${metric.icon}`}></i>
                              </div>
                              <span className="text-sm font-bold text-slate-700">{metric.label}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">
                                {metric.count} Outlets
                              </span>
                              <span className={`text-xs font-black px-2 py-1 rounded-lg ${metric.isBottleneck ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-50'}`}>
                                Avg {metric.avgDays}d / Target {metric.targetDays}d
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${metric.isBottleneck ? 'bg-rose-500' : 'bg-indigo-500'}`}
                              style={{ width: `${Math.min(100, (Number(metric.avgDays) / (metric.targetDays || 1)) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* At Risk List */}
                <div className="col-span-5 space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm h-full">
                    <div className="flex items-center justify-between mb-8">
                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">At-Risk Outlets</h5>
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-lg shadow-rose-200"></span>
                    </div>
                    
                    <div className="space-y-4">
                      {stats.delayedOutlets.length > 0 ? (
                        stats.delayedOutlets.map(outlet => {
                          const stageInfo = STAGES.find(s => s.id === outlet.currentStage);
                          const daysInStage = Math.floor((Date.now() - outlet.lastMovedAt) / (1000 * 60 * 60 * 24));
                          const delay = daysInStage - (stageInfo?.targetDays || 0);

                          return (
                            <div key={outlet.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-rose-200 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <h6 className="text-sm font-black text-slate-800">{outlet.name}</h6>
                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                  +{delay}d DELAYED
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <i className={`fa-solid ${stageInfo?.icon}`}></i>
                                <span>{outlet.currentStage}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                          <i className="fa-solid fa-circle-check text-4xl mb-4 opacity-20"></i>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">All within targets</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Journey View (Previous Code Enhanced) */}
              <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
                <div className="p-6 border-b border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pipeline Registry</p>
                  <div className="relative group">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm group-focus-within:text-indigo-500 transition-colors"></i>
                    <input 
                      type="text" 
                      placeholder="Locate outlet..."
                      className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {outlets.map(o => (
                    <button
                      key={o.id}
                      onClick={() => setSelectedOutletId(o.id)}
                      className={`w-full text-left p-4 rounded-2xl transition-all group relative overflow-hidden ${
                        selectedOutletId === o.id 
                          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                          : 'hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className="relative z-10">
                        <p className="text-xs font-black truncate mb-1">{o.name}</p>
                        <div className="flex items-center justify-between">
                          <p className={`text-[9px] font-bold uppercase tracking-widest truncate ${selectedOutletId === o.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {o.currentStage}
                          </p>
                          {selectedOutletId !== o.id && o.priority === 'high' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          )}
                        </div>
                      </div>
                      {selectedOutletId === o.id && (
                        <div className="absolute right-[-10px] top-[-10px] opacity-10">
                           <i className="fa-solid fa-route text-6xl"></i>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 bg-white custom-scrollbar">
                {selectedOutlet ? (
                  <div className="max-w-3xl mx-auto">
                    <div className="mb-12 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                           <h2 className="text-3xl font-black text-slate-800 tracking-tight">{selectedOutlet.name}</h2>
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              selectedOutlet.priority === 'high' ? 'bg-rose-50 text-rose-600' : 
                              selectedOutlet.priority === 'medium' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                            }`}>
                              {selectedOutlet.priority} PRIORITY
                           </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          <span className="flex items-center gap-1.5">
                            <i className="fa-regular fa-calendar"></i>
                            INITIATED: {formatDate(selectedOutlet.createdAt)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                          <span className="flex items-center gap-1.5 text-indigo-500">
                            <i className="fa-solid fa-clock-rotate-left"></i>
                            IN PROGRESS: {Math.floor((Date.now() - selectedOutlet.createdAt) / (1000 * 60 * 60 * 24))} DAYS
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-slate-100"></div>

                      <div className="space-y-16 relative">
                        {selectedOutlet.history && selectedOutlet.history.length > 0 ? (
                          selectedOutlet.history.slice().reverse().map((log, index) => {
                            const stageInfo = getStageInfo(log.stage);
                            const isLatest = index === 0;
                            const daysSpent = index < selectedOutlet.history.length - 1 
                               ? Math.max(1, Math.round((selectedOutlet.history.slice().reverse()[index].timestamp - selectedOutlet.history.slice().reverse()[index+1].timestamp) / (1000 * 60 * 60 * 24)))
                               : Math.max(1, Math.round((Date.now() - log.timestamp) / (1000 * 60 * 60 * 24)));

                            return (
                              <div key={index} className="flex gap-8 group">
                                <div className={`w-12 h-12 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm transition-all group-hover:scale-110 ${
                                  isLatest ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 ring-8 ring-indigo-50' : 'bg-slate-100 text-slate-400'
                                }`}>
                                  <i className={`fa-solid ${stageInfo?.icon || 'fa-circle'} text-base`}></i>
                                </div>
                                <div className="flex-1 pt-1">
                                  <div className="flex items-center justify-between mb-4">
                                    <div>
                                      <h4 className={`text-base font-black tracking-tight ${isLatest ? 'text-slate-800' : 'text-slate-500'}`}>
                                        {log.stage}
                                      </h4>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        Checkpoint reached {formatDate(log.timestamp)}
                                      </p>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-colors ${
                                      stageInfo?.targetDays && daysSpent > stageInfo.targetDays 
                                        ? 'bg-rose-50 text-rose-600' 
                                        : 'bg-slate-50 text-slate-400'
                                    }`}>
                                      {daysSpent} DAYS {stageInfo?.targetDays && daysSpent > stageInfo.targetDays && '• DELAYED'}
                                    </div>
                                  </div>
                                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 relative group-hover:bg-white group-hover:shadow-lg transition-all">
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                                      {log.note ? `"${log.note}"` : 'Operations report: Pending data entry for this phase.'}
                                    </p>
                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-50 group-hover:bg-white border-l border-b border-slate-100 rotate-45 transition-all"></div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                            <i className="fa-solid fa-timeline text-6xl mb-6 opacity-10"></i>
                            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Zero log entries found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <i className="fa-solid fa-route text-8xl mb-8 opacity-5"></i>
                    <h3 className="text-2xl font-black text-slate-400 mb-2">Registry Silent</h3>
                    <p className="text-sm font-medium">Select an active outlet to visualizes its full lifecycle journey.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;
