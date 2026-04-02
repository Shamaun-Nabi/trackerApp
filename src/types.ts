export interface Task {
  id: string;
  name: string;
  loe: number;
  description?: string;
  createdAt: string;
  totalBillable?: number;
  totalNonBillable?: number;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  billable: number;
  nonBillable: number;
  date: string;
  notes?: string;
}

export interface TaskStats {
  totalBillable: number;
  totalNonBillable: number;
  totalInvested: number;
  remaining: number;
  status: 'green' | 'default' | 'red';
}
