
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Task, TimeEntry } from '@/types';
import { calculateTaskStats, formatMonth } from '@/lib/calc';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [tasksRes, entriesRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/reports/monthly?month=' + formatMonth(new Date()))
      ]);
      
      if (tasksRes.ok && entriesRes.ok) {
        setTasks(await tasksRes.json());
        setAllEntries(await entriesRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center">Loading...</div>;

  const currentMonthEntries = allEntries;
  const totalBillable = currentMonthEntries.reduce((sum, e) => sum + e.billable, 0);
  const totalNonBillable = currentMonthEntries.reduce((sum, e) => sum + e.nonBillable, 0);
  const totalInvested = totalBillable + totalNonBillable;

  // Overrun tasks
  const overrunTasks = tasks.filter(task => {
    // This is a bit complex as we need all entries for each task to check overrun
    // For now, let's just show a placeholder or fetch all entries if needed
    // But for the dashboard, let's keep it simple
    return false; // Placeholder
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your time tracking for {format(new Date(), 'MMMM yyyy')}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billable</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBillable} hrs</div>
            <p className="text-xs text-muted-foreground">Recorded this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Non-Billable</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNonBillable} hrs</div>
            <p className="text-xs text-muted-foreground">Recorded this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvested} hrs</div>
            <p className="text-xs text-muted-foreground">Billable + Non-billable</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest time entries for this month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentMonthEntries.slice(0, 5).map(entry => (
                <div key={(entry as any)._id || entry.id} className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {(entry as any).taskId?.name || 'Unknown Task'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.date), 'MMM dd')} • {entry.billable}h billable
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    +{entry.billable + entry.nonBillable}h
                  </div>
                </div>
              ))}
              {currentMonthEntries.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No entries yet this month.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Task Summary</CardTitle>
            <CardDescription>Quick view of your active tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.slice(0, 5).map(task => (
                <div key={(task as any)._id || task.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{task.name}</p>
                    <p className="text-xs text-muted-foreground">LOE: {task.loe} hrs</p>
                  </div>
                  <div className="text-xs font-medium px-2 py-1 rounded bg-secondary">
                    Active
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No tasks created yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
