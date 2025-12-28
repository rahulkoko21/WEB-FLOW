
import { Stage, StageInfo, OutletStatus } from './types.ts';

export const BRANDS = [
  'Dil Daily',
  'Bihari Bowl',
  'Aahar',
  'Bhole Ke Chole',
  'Khichdi Bar',
  'The Chaat Cult',
  'Vegerama Pure Veg and Fasting Specials',
  'House of Andhra',
  'The Junglee Kitchen'
];

export const CITIES = [
  'Bangalore',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Mumbai',
  'Ahmedabad'
];

export const STATUSES: OutletStatus[] = [
  'Active',
  'Inactive',
  'Closed',
  'Deboarded',
  'Training pending',
  'Confirmation Pending',
  'onboarding in progress'
];

export const STAGES: StageInfo[] = [
  { id: Stage.ONBOARDING_REQUEST, label: 'Onboarding Request', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'fa-file-import', targetDays: 2 },
  { id: Stage.OVERLAP_CHECK, label: 'Overlap Check', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'fa-magnifying-glass-location', targetDays: 1 },
  { id: Stage.CHEF_APPROVAL, label: 'Chef Approval', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'fa-utensils', targetDays: 3 },
  { id: Stage.FASSI_APPLY, label: 'FASSI Apply', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'fa-signature', targetDays: 7 },
  { id: Stage.ID_CREATION, label: 'ID Creation', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'fa-id-card', targetDays: 2 },
  { id: Stage.INTEGRATION, label: 'Integration', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: 'fa-circle-nodes', targetDays: 2 },
  { id: Stage.TRAINING, label: 'Training', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: 'fa-chalkboard-user', targetDays: 3 },
  { id: Stage.HANDOVER, label: 'Handover', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: 'fa-handshake', targetDays: 1 },
  { id: Stage.OUTLET_LIVE, label: 'Outlet Live', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: 'fa-rocket', targetDays: 0 },
];

export const STAGE_ORDER = STAGES.map(s => s.id);
