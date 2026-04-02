import { Task, TimeEntry, TaskStats } from '../types';

export function calculateTaskStats(task: Task, entries: TimeEntry[]): TaskStats {
  const totalBillable = entries.reduce((sum, entry) => sum + entry.billable, 0);
  const totalNonBillable = entries.reduce((sum, entry) => sum + entry.nonBillable, 0);
  const totalInvested = totalBillable + totalNonBillable;
  const remaining = task.loe - totalBillable;

  let status: 'green' | 'default' | 'red' = 'default';
  if (totalBillable > task.loe) {
    status = 'red';
  } else if (totalBillable < task.loe) {
    status = 'green';
  }

  return {
    totalBillable,
    totalNonBillable,
    totalInvested,
    remaining,
    status,
  };
}

export function formatMonth(date: Date): string {
  return date.toISOString().slice(0, 7); // YYYY-MM
}
