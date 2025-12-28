import React, { useState } from 'react';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { Outlet, Stage, OutletStatus } from '../types.ts';
import { STAGE_ORDER, BRANDS, STATUSES, CITIES, STAGES } from '../constants.ts';

interface ImportFailure {
  row: number;
  name: string;
  reason: string;
  offendingText?: string;
}

interface ImportSummary {
  success: Outlet[];
  failures: ImportFailure[];
}

interface ImportModalProps {
  outlets: Outlet[];
  onClose: () => void;
  onImport: (outlets: Outlet[]) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ outlets, onClose, onImport }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const downloadTemplate = () => {
    const templateData = [
      {
        "Outlet Name": "Dil Daily - Koramangala",
        "Brand": "Dil Daily",
        "Cities": "Bangalore",
        "Pipeline Stage": "ONBOARDING REQUEST",
        "Outlet Status": "onboarding in progress",
        "Live Date": "2023-12-26"
      },
      {
        "Outlet Name": "Bihari Bowl - Indiranagar",
        "Brand": "Bihari Bowl",
        "Cities": "Bangalore",
        "Pipeline Stage": "FASSI APPLY",
        "Outlet Status": "onboarding in progress",
        "Live Date": "2023-11-05"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Outlet_Import_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const success: Outlet[] = [];
        const failures: ImportFailure[] = [];

        data.forEach((row, idx) => {
          const rowNum = idx + 2; 
          const nameInput = row['Outlet Name'] || row['Name'] || row['brand'] || row['Brand'];
          const displayName = nameInput ? String(nameInput) : 'Unnamed Row';
          
          if (!nameInput) {
            failures.push({ row: rowNum, name: 'Missing Name', reason: 'The Outlet Name column is empty.' });
            return;
          }

          const name = String(nameInput).trim();
          const brandInput = row['Brand'] || row['brand'];
          const cityInput = row['Cities'] || row['cities'] || row['City'] || row['city'];
          const pipelineStageRaw = String(row['Pipeline Stage'] || row['status'] || row['Status'] || '');
          const outletStatusRaw = String(row['Outlet Status'] || row['outlet status'] || row['Operational Status'] || '');
          const liveDateRaw = row['live date'] || row['Live Date'];

          // AUTO-DETECT SAME VS NEW OUTLET
          const existingOutlet = outlets.find(o => o.name.toLowerCase() === name.toLowerCase());
          const importAction: 'New' | 'Update' = existingOutlet ? 'Update' : 'New';

          // Validate Pipeline Stage
          let currentStage: Stage | undefined = undefined;
          const stageSearch = pipelineStageRaw.trim().toUpperCase();
          
          if (stageSearch) {
            for (const s of Object.values(Stage)) {
              if (stageSearch === s.toUpperCase() || stageSearch === s.toUpperCase().replace(/\s/g, '')) {
                currentStage = s;
                break;
              }
            }
            if (!currentStage) {
              failures.push({ 
                row: rowNum, 
                name: displayName, 
                reason: 'Invalid Pipeline Stage', 
                offendingText: pipelineStageRaw 
              });
              return;
            }
          } else {
            currentStage = existingOutlet ? existingOutlet.currentStage : Stage.ONBOARDING_REQUEST;
          }

          // Validate Brand
          let detectedBrand = undefined;
          if (brandInput) {
            const searchBrand = String(brandInput).trim();
            detectedBrand = BRANDS.find(b => b.toLowerCase() === searchBrand.toLowerCase());
            if (!detectedBrand) {
              failures.push({ 
                row: rowNum, 
                name: displayName, 
                reason: 'Unrecognized Brand', 
                offendingText: searchBrand 
              });
              return;
            }
          } else {
            detectedBrand = existingOutlet?.brand;
          }

          // Validate City
          let detectedCity = undefined;
          if (cityInput) {
            const searchCity = String(cityInput).trim();
            detectedCity = CITIES.find(c => c.toLowerCase() === searchCity.toLowerCase());
            if (!detectedCity) {
              failures.push({ 
                row: rowNum, 
                name: displayName, 
                reason: 'Unrecognized City', 
                offendingText: searchCity 
              });
              return;
            }
          } else {
            detectedCity = existingOutlet?.city;
          }

          // Validate Operational Status
          let operationalStatus: OutletStatus = existingOutlet?.status || 'onboarding in progress';
          if (outletStatusRaw.trim()) {
            const searchStatus = outletStatusRaw.trim().toLowerCase();
            const foundStatus = STATUSES.find(s => s.toLowerCase() === searchStatus);
            if (foundStatus) {
              operationalStatus = foundStatus;
            } else {
              failures.push({ 
                row: rowNum, 
                name: displayName, 
                reason: 'Invalid Operational Status', 
                offendingText: outletStatusRaw 
              });
              return;
            }
          }

          let lastMovedAt = existingOutlet?.lastMovedAt || Date.now();
          if (liveDateRaw) {
            const parsedDate = new Date(liveDateRaw);
            if (!isNaN(parsedDate.getTime())) {
              lastMovedAt = parsedDate.getTime();
            }
          }

          const id = existingOutlet?.id || Math.random().toString(36).substr(2, 9);
          
          success.push({
            id,
            name,
            brand: detectedBrand,
            city: detectedCity,
            status: operationalStatus,
            description: existingOutlet?.description || `Imported via Bulk Processor.`,
            currentStage: currentStage || Stage.ONBOARDING_REQUEST,
            createdAt: existingOutlet?.createdAt || Date.now(),
            lastMovedAt,
            history: existingOutlet ? existingOutlet.history : [{ stage: currentStage || Stage.ONBOARDING_REQUEST, timestamp: lastMovedAt, note: 'Imported via Excel' }],
            importAction
          });
        });

        setSummary({ success, failures });
      } catch (err) {
        console.error(err);
        setError("Critical error processing file. Please ensure it is a valid .XLSX or .CSV.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setError("File read error.");
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleFinishImport = () => {
    if (summary && summary.success.length > 0) {
      onImport(summary.success);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Bulk Import Data</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Automatic "New" vs "Same" Detection</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {!summary ? (
            <div className="space-y-8">
              <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                        Intelligent Import
                    </h4>
                    <button 
                        onClick={downloadTemplate}
                        className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 px-3 py-1.5 rounded-xl shadow-sm hover:shadow-md hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5"
                    >
                        <i className="fa-solid fa-download"></i>
                        GET TEMPLATE
                    </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium mb-4">
                  The system will automatically detect if an outlet exists by matching the name. 
                  Existing outlets will be moved through the "pipes" (stages) while new ones will be registered.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      Brands/Cities must match Registry
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      Stage names must be exact
                    </div>
                  </div>
                </div>
              </div>

              <label className={`relative border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center transition-all cursor-pointer group ${isProcessing ? 'border-slate-200 bg-slate-50 opacity-50' : 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30'}`}>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
                
                {isProcessing ? (
                  <>
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Analyzing File...</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <i className="fa-solid fa-file-excel text-3xl"></i>
                    </div>
                    <p className="text-base font-black text-slate-800 mb-2">Drop Spreadsheet Here</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Excel or CSV</p>
                  </>
                )}
              </label>

              {error && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-center gap-10">
                 <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">New Outlets</p>
                    <p className="text-4xl font-black text-indigo-600">
                      {summary.success.filter(s => s.importAction === 'New').length}
                    </p>
                 </div>
                 <div className="w-px h-12 bg-slate-100"></div>
                 <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Moving Pipes</p>
                    <p className="text-4xl font-black text-emerald-500">
                      {summary.success.filter(s => s.importAction === 'Update').length}
                    </p>
                 </div>
                 {summary.failures.length > 0 && (
                   <>
                    <div className="w-px h-12 bg-slate-100"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Failures</p>
                        <p className="text-4xl font-black text-rose-500">{summary.failures.length}</p>
                    </div>
                   </>
                 )}
              </div>

              {summary.failures.length > 0 && (
                <div>
                   <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <i className="fa-solid fa-file-circle-exclamation"></i>
                      Correction Required
                   </h4>
                   <div className="bg-rose-50/20 rounded-2xl border border-rose-100 overflow-hidden">
                      <table className="w-full text-left text-[11px] font-bold border-collapse">
                         <thead>
                            <tr className="bg-rose-50 text-rose-600">
                               <th className="px-4 py-3 border-b border-rose-100">Row</th>
                               <th className="px-4 py-3 border-b border-rose-100">Outlet Identifier</th>
                               <th className="px-4 py-3 border-b border-rose-100">Mismatch Reason</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-rose-100/50">
                            {summary.failures.map((f, i) => (
                               <tr key={i} className="text-rose-700/80 hover:bg-rose-50 transition-colors">
                                  <td className="px-4 py-3 font-black">#{f.row}</td>
                                  <td className="px-4 py-3 truncate max-w-[140px] font-bold">{f.name}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col gap-1">
                                      <span>{f.reason}</span>
                                      {f.offendingText && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[9px] text-rose-400 uppercase tracking-tighter">Value in file:</span>
                                          <code className="bg-rose-100/50 text-rose-600 px-1.5 py-0.5 rounded text-[10px] font-black font-mono border border-rose-200">
                                            "{f.offendingText}"
                                          </code>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 flex gap-4 shrink-0 bg-slate-50/50">
          {!summary ? (
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 border border-slate-200 rounded-2xl font-black text-slate-400 hover:bg-white transition-all uppercase text-[10px] tracking-widest"
            >
              Cancel
            </button>
          ) : (
            <>
               <button
                  onClick={() => setSummary(null)}
                  className="flex-1 py-4 px-6 border border-slate-200 rounded-2xl font-black text-slate-400 hover:bg-white transition-all uppercase text-[10px] tracking-widest"
               >
                  Retry Upload
               </button>
               <button
                  onClick={handleFinishImport}
                  disabled={summary.success.length === 0}
                  className={`flex-[2] py-4 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl ${
                    summary.success.length > 0 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 shadow-xl' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
               >
                  {summary.success.length > 0 ? `Apply ${summary.success.length} Updates` : 'Close'}
               </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;