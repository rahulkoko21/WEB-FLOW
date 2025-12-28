
import React, { useState, useMemo } from 'react';
import { Outlet, Stage, OutletStatus } from '../types.ts';
import { STAGES, STAGE_ORDER, BRANDS, CITIES, STATUSES } from '../constants.ts';

interface AnalyticsModalProps {
  outlets: Outlet[];
  onClose: () => void;
  initialSelectedId?: string;
}

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ outlets, onClose, initialSelectedId }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'brands' | 'journey'>('dashboard');
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(initialSelectedId || (outlets[0]?.id || null));
  const [selectedBrandName, setSelectedBrandName] = useState<string | null>(null);
  const [selectedDashboardBrand, setSelectedDashboardBrand] = useState<string | null>(null);
  const [selectedDashboardCity, setSelectedDashboardCity] = useState<string | null>(null);
  const [selectedDashboardStatus, setSelectedDashboardStatus] = useState<string | null>(null);
  
  // Custom Date Range State (Global for the Modal)
  const defaultEnd = new Date();
  defaultEnd.setHours(23, 59, 59, 999);
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30); 
  defaultStart.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState({
    start: defaultStart.getTime(),
    end: defaultEnd.getTime()
  });
  
  const [tempStart, setTempStart] = useState(new Date(dateRange.start).toISOString().split('T')[0]);
  const [tempEnd, setTempEnd] = useState(new Date(dateRange.end).toISOString().split('T')[0]);
  const [showDayPicker, setShowDayPicker] = useState(false);

  const selectedOutlet = outlets.find(o => o.id === selectedOutletId);

  // --- Date Helpers ---
  const formatDate = (ts: number) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(ts));
  const formatDateTime = (ts: number) => new Intl.DateTimeFormat('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  }).format(new Date(ts));
  
  const getDayLabel = (ts: number) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(ts));

  // --- Date Range Days Calculation ---
  const historyDays = useMemo(() => {
    const days: number[] = [];
    let current = new Date(dateRange.start);
    current.setHours(0, 0, 0, 0);
    const endBound = new Date(dateRange.end);
    
    let safetyCounter = 0;
    while (current.getTime() <= endBound.getTime() && safetyCounter < 366) {
      days.push(current.getTime());
      current.setDate(current.getDate() + 1);
      safetyCounter++;
    }
    return days;
  }, [dateRange]);

  // --- Dashboard Data Filtered by Brand, City, Status AND Date Range ---
  const dashboardOutlets = useMemo(() => {
    return outlets.filter(o => {
      const matchBrand = !selectedDashboardBrand || o.brand === selectedDashboardBrand;
      const matchCity = !selectedDashboardCity || o.city === selectedDashboardCity;
      const matchStatus = !selectedDashboardStatus || o.status === selectedDashboardStatus;
      
      const hasActivityInRange = o.history.some(h => h.timestamp >= dateRange.start && h.timestamp <= dateRange.end);
      const createdInRange = o.createdAt >= dateRange.start && o.createdAt <= dateRange.end;
      
      return matchBrand && matchCity && matchStatus && (hasActivityInRange || createdInRange);
    });
  }, [outlets, selectedDashboardBrand, selectedDashboardCity, selectedDashboardStatus, dateRange]);

  // --- Core Calculations for Dashboard ---
  const dashboardStats = useMemo(() => {
    const portfolioTotal = outlets.filter(o => {
      const matchBrand = !selectedDashboardBrand || o.brand === selectedDashboardBrand;
      const matchCity = !selectedDashboardCity || o.city === selectedDashboardCity;
      const matchStatus = !selectedDashboardStatus || o.status === selectedDashboardStatus;
      return matchBrand && matchCity && matchStatus;
    }).length;

    return { 
      portfolioTotal
    };
  }, [outlets, selectedDashboardBrand, selectedDashboardCity, selectedDashboardStatus]);

  // --- Pipeline Trend (Filtered for Dashboard) ---
  const dashboardTrendData = useMemo(() => {
    const trend = historyDays.map(dayStart => {
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);
      const count = dashboardOutlets.reduce((acc, outlet) => {
        const movementsOnThisDay = outlet.history.filter(h => h.timestamp >= dayStart && h.timestamp < dayEnd).length;
        return acc + (movementsOnThisDay > 0 ? 1 : 0);
      }, 0);
      return { ts: dayStart, label: getDayLabel(dayStart), count };
    });
    const maxCount = Math.max(...trend.map(t => t.count), 1);
    return { trend, maxCount };
  }, [dashboardOutlets, historyDays]);

  const brandMetrics = useMemo(() => {
    const metrics = BRANDS.map(brandName => {
      const brandOutlets = outlets.filter(o => o.brand === brandName);
      if (brandOutlets.length === 0) return null;

      const live = brandOutlets.filter(o => o.currentStage === Stage.OUTLET_LIVE).length;
      const delayed = brandOutlets.filter(o => {
          if (o.currentStage === Stage.OUTLET_LIVE) return false;
          const stageInfo = STAGES.find(s => s.id === o.currentStage);
          if (!stageInfo) return false;
          const daysInStage = Math.floor((Date.now() - o.lastMovedAt) / (1000 * 60 * 60 * 24));
          return daysInStage > (stageInfo.targetDays || 14);
      }).length;

      const historyTrend = historyDays.map(dayStart => {
        const dayEnd = dayStart + (24 * 60 * 60 * 1000);
        const count = brandOutlets.reduce((acc, outlet) => {
          const movementsOnThisDay = outlet.history.filter(h => h.timestamp >= dayStart && h.timestamp < dayEnd).length;
          return acc + (movementsOnThisDay > 0 ? 1 : 0);
        }, 0);
        return { ts: dayStart, label: getDayLabel(dayStart), count };
      });

      const maxTrendCount = Math.max(...historyTrend.map(t => t.count), 1);

      return {
        name: brandName,
        total: brandOutlets.length,
        live,
        delayed,
        health: Math.max(0, 100 - (delayed * 15)),
        historyTrend,
        maxTrendCount,
        outlets: brandOutlets.sort((a, b) => b.lastMovedAt - a.lastMovedAt)
      };
    }).filter(Boolean);

    return metrics.sort((a, b) => (b?.total || 0) - (a?.total || 0));
  }, [outlets, historyDays]);

  const handleApplyDateRange = () => {
    const startObj = new Date(tempStart);
    startObj.setHours(0, 0, 0, 0);
    const endObj = new Date(tempEnd);
    endObj.setHours(23, 59, 59, 999);
    
    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) return;
    
    setDateRange({
      start: startObj.getTime(),
      end: endObj.getTime()
    });
    setShowDayPicker(false);
  };

  const getStageInfo = (stageId: Stage) => STAGES.find(s => s.id === stageId);

  const getStageLog = (stageId: Stage) => {
    if (!selectedOutlet) return undefined;
    for (let i = selectedOutlet.history.length - 1; i >= 0; i--) {
      if (selectedOutlet.history[i].stage === stageId) {
        return selectedOutlet.history[i];
      }
    }
    return undefined;
  };

  const getStatusBadgeStyle = (status: string) => {
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

  const renderGlobalDatePicker = () => (
    <div className="relative">
      <button 
        onClick={(e) => { e.stopPropagation(); setShowDayPicker(!showDayPicker); }}
        className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-slate-900 font-black text-[10px] uppercase tracking-widest"
      >
        <i className="fa-solid fa-calendar-range text-indigo-500"></i>
        {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
        <i className={`fa-solid fa-chevron-down text-[8px] transition-transform ${showDayPicker ? 'rotate-180' : ''}`}></i>
      </button>
      
      {showDayPicker && (
        <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-50 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Select Period</h5>
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">From</label>
              <input 
                type="date" 
                value={tempStart} 
                onChange={(e) => setTempStart(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 text-slate-900"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">To</label>
              <input 
                type="date" 
                value={tempEnd} 
                onChange={(e) => setTempEnd(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 text-slate-900"
              />
            </div>
            <div className="pt-2 flex gap-2">
               <button onClick={() => setShowDayPicker(false)} className="flex-1 py-2 text-[10px] font-black text-slate-400 uppercase hover:text-slate-600">Cancel</button>
               <button onClick={handleApplyDateRange} className="flex-[2] bg-indigo-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl" onClick={() => setShowDayPicker(false)}>
      <div className="bg-white rounded-[2rem] w-full max-w-6xl h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
              <i className="fa-solid fa-chart-pie text-xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Executive Analytics</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Pipeline Performance Intelligence</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['dashboard', 'brands', 'journey'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab !== 'brands') setSelectedBrandName(null);
                }}
                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors ml-4">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {(activeTab === 'dashboard' || activeTab === 'brands') && (
          <div className="px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-50 flex justify-end items-center z-30 shrink-0">
            {renderGlobalDatePicker()}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex bg-slate-50/50 relative">
          
          {/* --- DASHBOARD TAB --- */}
          {activeTab === 'dashboard' && (
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* BRAND & CITY & STATUS SELECTOR KPI */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Focus Brand</p>
                      <div className="relative">
                        <select 
                          value={selectedDashboardBrand || ''} 
                          onChange={(e) => setSelectedDashboardBrand(e.target.value || null)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 appearance-none text-slate-800 transition-all"
                        >
                          <option value="">All Brands</option>
                          {BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Focus City</p>
                      <div className="relative">
                        <select 
                          value={selectedDashboardCity || ''} 
                          onChange={(e) => setSelectedDashboardCity(e.target.value || null)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 appearance-none text-slate-800 transition-all"
                        >
                          <option value="">All Cities</option>
                          {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Operational Status</p>
                      <div className="relative">
                        <select 
                          value={selectedDashboardStatus || ''} 
                          onChange={(e) => setSelectedDashboardStatus(e.target.value || null)}
                          className="w-full bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 appearance-none text-indigo-700 transition-all"
                        >
                          <option value="">All Statuses</option>
                          {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-indigo-400 pointer-events-none"></i>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall Portfolio Count KPI (Ignoring Date Filter) */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Brand Portfolio</p>
                    <h4 className="text-4xl font-black text-slate-800">{dashboardStats.portfolioTotal}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Overall Registry</span>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                      <i className="fa-solid fa-globe mr-1"></i> Selection Base
                    </span>
                  </div>
                </div>
              </div>

              {/* DASHBOARD ACTIVITY GRAPH */}
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm mb-8 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Pipeline Activity Trend</h5>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Activity across selected period
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Peak Activity: {dashboardTrendData.maxCount}</span>
                  </div>
                </div>
                
                <div className="relative h-48 flex items-end gap-1.5 pr-12">
                   {dashboardTrendData.trend.map((t, i) => (
                      <div key={i} className="flex-1 group/bar relative h-full flex flex-col justify-end">
                         <div 
                            className="w-full bg-indigo-600/10 rounded-t-lg transition-all duration-500 hover:bg-indigo-600/40 relative"
                            style={{ height: `${(t.count / dashboardTrendData.maxCount) * 100}%` }}
                         >
                            {t.count > 0 && (
                               <div className="absolute inset-0 bg-indigo-600 rounded-t-lg opacity-70"></div>
                            )}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl">
                               {t.label}: {t.count} Movements
                            </div>
                         </div>
                      </div>
                   ))}
                   <div className="absolute right-0 inset-y-0 w-10 flex flex-col justify-between items-end border-l border-slate-50 pl-2">
                      <span className="text-[9px] font-black text-slate-400">{dashboardTrendData.maxCount}</span>
                      <span className="text-[9px] font-black text-slate-300">{Math.floor(dashboardTrendData.maxCount / 2)}</span>
                      <span className="text-[9px] font-black text-slate-400">0</span>
                   </div>
                </div>
                <div className="flex items-center gap-1.5 mt-4">
                   {dashboardTrendData.trend.map((t, i) => {
                      const total = dashboardTrendData.trend.length;
                      const step = Math.max(1, Math.floor(total / 8));
                      const showLabel = i % step === 0 || i === total - 1;
                      return (
                        <span key={i} className="flex-1 text-center text-[8px] font-black text-slate-400 uppercase tracking-tighter truncate">
                           {showLabel ? t.label : ''}
                        </span>
                      );
                   })}
                   <div className="w-10"></div>
                </div>
              </div>

              {/* SELECTION RESULTS TABLE */}
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Selection Results</h5>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Viewing {dashboardOutlets.length} outlets active in focus period
                    </p>
                  </div>
                </div>

                {dashboardOutlets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-50">
                          <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">Outlet Name</th>
                          <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Brand / City</th>
                          <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                          <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Stage</th>
                          <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Days</th>
                          <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-2">Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50/50">
                        {dashboardOutlets.map((o) => {
                          const stageInfo = getStageInfo(o.currentStage);
                          const daysInStage = Math.floor((Date.now() - o.lastMovedAt) / (1000 * 60 * 60 * 24));
                          const isDelayed = stageInfo?.targetDays && daysInStage > stageInfo.targetDays;

                          return (
                            <tr key={o.id} className="group hover:bg-slate-50/50 transition-all">
                              <td className="py-4 pl-2">
                                <span className="text-xs font-black text-slate-700">{o.name}</span>
                              </td>
                              <td className="py-4">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-900 uppercase tracking-tight">{o.brand || 'No Brand'}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{o.city || 'No City'}</span>
                                </div>
                              </td>
                              <td className="py-4 text-center">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter ${getStatusBadgeStyle(o.status)}`}>
                                  {o.status}
                                </span>
                              </td>
                              <td className="py-4">
                                <div className="flex items-center gap-2">
                                  <i className={`fa-solid ${stageInfo?.icon || 'fa-circle'} text-[10px] text-slate-300`}></i>
                                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{o.currentStage}</span>
                                </div>
                              </td>
                              <td className="py-4 text-center">
                                <span className={`text-[10px] font-black ${isDelayed ? 'text-rose-500' : 'text-slate-400'}`}>
                                  {daysInStage}d
                                </span>
                              </td>
                              <td className="py-4 text-right pr-2">
                                <button 
                                  onClick={() => {
                                    setSelectedOutletId(o.id);
                                    setActiveTab('journey');
                                  }}
                                  className="w-8 h-8 rounded-lg bg-slate-50 text-slate-300 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                >
                                  <i className="fa-solid fa-arrow-right-long text-xs"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-50 rounded-[2rem]">
                    <i className="fa-solid fa-filter-circle-xmark text-4xl mb-4 opacity-10"></i>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">No activity found in selected date range</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- BRANDS TAB --- */}
          {activeTab === 'brands' && (
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                {selectedBrandName ? (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <button 
                      onClick={() => setSelectedBrandName(null)}
                      className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-6 hover:text-indigo-800 transition-colors"
                    >
                      <i className="fa-solid fa-arrow-left"></i>
                      Back to All Brands
                    </button>
                    
                    <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm mb-8">
                       <div className="flex items-center justify-between mb-8">
                          <div>
                            <h4 className="text-2xl font-black text-slate-800">{selectedBrandName}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Operational Summary</p>
                          </div>
                       </div>

                       <div className="overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Outlet Name</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">City</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Stage</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">View</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {outlets.filter(o => o.brand === selectedBrandName).map(outlet => {
                                const stageInfo = getStageInfo(outlet.currentStage);
                                return (
                                  <tr key={outlet.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4">
                                      <span className="text-xs font-black text-slate-700">{outlet.name}</span>
                                    </td>
                                    <td className="py-4">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">{outlet.city || 'N/A'}</span>
                                    </td>
                                    <td className="py-4 text-center">
                                      <span className={`text-[9px] font-black border px-2 py-0.5 rounded-lg uppercase tracking-tight ${getStatusBadgeStyle(outlet.status)}`}>
                                        {outlet.status}
                                      </span>
                                    </td>
                                    <td className="py-4">
                                      <div className="flex items-center gap-2">
                                        <i className={`fa-solid ${stageInfo?.icon} text-[10px] text-slate-400`}></i>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{outlet.currentStage}</span>
                                      </div>
                                    </td>
                                    <td className="py-4 text-right">
                                        <button 
                                          onClick={() => {
                                            setSelectedOutletId(outlet.id);
                                            setActiveTab('journey');
                                          }}
                                          className="text-slate-300 hover:text-indigo-600 transition-colors"
                                        >
                                          <i className="fa-solid fa-arrow-right-long"></i>
                                        </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-300 pb-12">
                    {brandMetrics.map((brand) => (
                      <div 
                        key={brand?.name} 
                        className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex flex-col group"
                      >
                           <div className="flex justify-between items-start mb-8">
                              <div>
                                 <h4 className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{brand?.name}</h4>
                                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                                    Period Outlets: <span className="text-slate-900">{brand?.total}</span>
                                 </p>
                              </div>
                           </div>

                           <div className="flex-1 flex flex-col mb-4">
                              <div className="flex items-center justify-between mb-4">
                                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Process Flow</span>
                                 <div className="flex gap-2">
                                    <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
                                       {brand?.live} Live
                                    </span>
                                    {brand?.delayed > 0 && (
                                       <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                                          {brand?.delayed} Stalled
                                       </span>
                                    )}
                                 </div>
                              </div>

                              <div className="relative h-32 flex items-end gap-1 pr-10">
                                 {brand?.historyTrend.map((t, i) => (
                                    <div key={i} className="flex-1 group/bar relative h-full flex flex-col justify-end">
                                       <div 
                                          className="w-full bg-indigo-500/10 rounded-t-[4px] transition-all duration-500 hover:bg-indigo-500/30 cursor-pointer relative"
                                          style={{ height: `${(t.count / (brand?.maxTrendCount || 1)) * 100}%` }}
                                       >
                                          {t.count > 0 && (
                                             <div className="absolute inset-0 bg-indigo-500 rounded-t-[4px] opacity-60"></div>
                                          )}
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>

                           <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                              <div className="flex-1 pr-8">
                                 <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Health</span>
                                    <span className={`text-[9px] font-black ${(brand?.health || 0) > 70 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                       {brand?.health}%
                                    </span>
                                 </div>
                                 <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div 
                                       className={`h-full rounded-full transition-all duration-1000 ${
                                          (brand?.health || 0) > 70 ? 'bg-emerald-500' : (brand?.health || 0) > 40 ? 'bg-amber-400' : 'bg-rose-500'
                                       }`}
                                       style={{ width: `${brand?.health}%` }}
                                    ></div>
                                 </div>
                              </div>
                              <button 
                                 onClick={() => setSelectedBrandName(brand?.name || null)}
                                 className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                              >
                                 View
                                 <i className="fa-solid fa-arrow-right-long"></i>
                              </button>
                           </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          )}

          {/* --- JOURNEY TAB --- */}
          {activeTab === 'journey' && (
            <>
              <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
                <div className="p-6 border-b border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pipeline Registry</p>
                  <div className="relative group">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm group-focus-within:text-indigo-400 transition-colors"></i>
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
                        <div className="flex justify-between items-start">
                            <p className="text-xs font-black truncate mb-1">{o.name}</p>
                            {o.brand && selectedOutletId !== o.id && (
                                <span className="text-[8px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{o.brand}</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-[9px] font-bold uppercase tracking-widest truncate ${selectedOutletId === o.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {o.currentStage}
                          </p>
                        </div>
                      </div>
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
                           <div className="flex gap-2">
                              {selectedOutlet.brand && (
                                  <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{selectedOutlet.brand}</span>
                              )}
                              {selectedOutlet.city && (
                                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{selectedOutlet.city}</span>
                              )}
                              <span className={`text-[10px] font-bold border px-2 py-0.5 rounded uppercase tracking-wider ${getStatusBadgeStyle(selectedOutlet.status)}`}>
                                {selectedOutlet.status}
                              </span>
                           </div>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          <span className="flex items-center gap-1.5">
                            <i className="fa-regular fa-calendar"></i>
                            INITIATED: {formatDate(selectedOutlet.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-slate-100"></div>
                      
                      {(() => {
                        const currentIdx = STAGE_ORDER.indexOf(selectedOutlet.currentStage);
                        return (
                          <div 
                            className="absolute left-[21px] top-4 w-0.5 bg-indigo-600 transition-all duration-700"
                            style={{ height: `${(currentIdx / (STAGE_ORDER.length - 1)) * 100}%` }}
                          ></div>
                        );
                      })()}

                      <div className="space-y-16 relative">
                        {STAGES.map((stageInfo, index) => {
                          const currentIdx = STAGE_ORDER.indexOf(selectedOutlet.currentStage);
                          const isActive = index === currentIdx;
                          const isPast = index < currentIdx;
                          const log = getStageLog(stageInfo.id);

                          return (
                            <div key={stageInfo.id} className="flex gap-8 group">
                              <div className={`w-12 h-12 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm transition-all group-hover:scale-110 ${
                                isActive 
                                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 ring-8 ring-indigo-50' 
                                  : isPast 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-slate-100 text-slate-400'
                              }`}>
                                {isPast ? (
                                  <i className="fa-solid fa-check text-sm"></i>
                                ) : (
                                  <i className={`fa-solid ${stageInfo?.icon || 'fa-circle'} text-base`}></i>
                                )}
                              </div>
                              <div className="flex-1 pt-1">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <h4 className={`text-base font-black tracking-tight ${isActive || isPast ? 'text-slate-800' : 'text-slate-500'}`}>
                                      {stageInfo.id}
                                    </h4>
                                    {log && (
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        Reached {formatDateTime(log.timestamp)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {(isActive || log?.note) && (
                                  <div className={`p-5 rounded-2xl border relative group-hover:shadow-lg transition-all ${
                                    isActive ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'
                                  }`}>
                                    <p className={`text-sm leading-relaxed font-medium italic ${isActive ? 'text-indigo-700' : 'text-slate-600'}`}>
                                      {log?.note ? `"${log.note}"` : isActive ? 'Phase currently active...' : ''}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <i className="fa-solid fa-route text-8xl mb-8 opacity-5"></i>
                    <h3 className="text-2xl font-black text-slate-400 mb-2">Registry Silent</h3>
                    <p className="text-sm font-medium">Select an outlet to visualize its journey.</p>
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
