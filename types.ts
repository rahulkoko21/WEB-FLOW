
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

export interface Outlet {
  id: string;
  name: string;
  description: string;
  note?: string;
  currentStage: Stage;
  createdAt: number;
  lastMovedAt: number;
  priority: 'low' | 'medium' | 'high';
  history: StageLog[];
}

export interface StageInfo {
  id: Stage;
  label: string;
  color: string;
  icon: string;
  targetDays: number; // New: Target days to complete this stage
}
