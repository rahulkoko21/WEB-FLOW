
export enum Stage {
  ONBOARDING_REQUEST = 'ONBOARDING REQUEST',
  OVERLAP_CHECK = 'OVERLAP CHECK',
  CHEF_APPROVAL = 'CHEF APPROVAL',
  FASSI_APPLY = 'FASSI APPLY',
  ID_CREATION = 'ID CREATION',
  INTEGRATION = 'INTEGRATION',
  TRAINING = 'TRAINING OF OUTLET',
  HANDOVER = 'HANDOVER',
  OUTLET_LIVE = 'OUTLET LIVE'
}

export interface StageLog {
  stage: Stage;
  timestamp: number;
  note?: string;
}

export type OutletStatus = 
  | 'Active' 
  | 'Inactive' 
  | 'Closed' 
  | 'Deboarded' 
  | 'Training pending' 
  | 'Confirmation Pending' 
  | 'onboarding in progress';

export interface Outlet {
  id: string;
  name: string;
  brand?: string;
  city?: string;
  status: OutletStatus;
  description: string;
  note?: string;
  currentStage: Stage;
  createdAt: number;
  lastMovedAt: number;
  history: StageLog[];
  isArchived?: boolean;
  archivedAt?: number;
  // Temporary field used during import to determine behavior
  importAction?: 'New' | 'Update';
}

export interface StageInfo {
  id: Stage;
  label: string;
  color: string;
  icon: string;
  targetDays: number;
}
