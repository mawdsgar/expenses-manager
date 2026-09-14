export type RenovationStatus =
  | 'planning'
  | 'quote_received'
  | 'booked'
  | 'in_progress'
  | 'complete';

export interface RenovationTask {
  id: string;
  title: string;
  area: string;
  estimatedCost: number;
  scheduledMonth: string;
  status: RenovationStatus;
  sortOrder: number;
  pinned: boolean;
  contingencyPercent: number;
  partPaymentsAmount: number;
  dependsOn: string | null;
  notes: string;
}

export interface RenovationContribution {
  id: string;
  month: string;
  amount: number;
  status: 'planned' | 'received';
}

export interface RenovationSettings {
  safetyBuffer: number;
  planStart: string;
  planEnd: string;
}

export interface RenovationData {
  tasks: RenovationTask[];
  contributions: RenovationContribution[];
  settings: RenovationSettings;
}

export interface ForecastMonth {
  month: string;
  spending: number;
  endingBalance: number;
  tasks: RenovationTask[];
}

export interface TaskFundingGap {
  task: RenovationTask;
  unfundedAmount: number;
  fundedAmount: number;
}
