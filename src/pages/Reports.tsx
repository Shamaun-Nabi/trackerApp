import React, { useState, useEffect } from 'react';
import { Download, Filter, FileText, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Task, TimeEntry, TaskStats } from '@/types';
import { calculateTaskStats, formatMonth } from '@/lib/calc';
import { format, subMonths, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface ReportRow {
  task: Task;
  stats: TaskStats;
  monthlyBillable: number;
  monthlyNonBillable: number;
}

export default function Reports() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const monthStr = formatMonth(currentMonth);
      const res = await fetch(`/api/reports/summary?month=${monthStr}`);
      
      if (res.ok) {
        const summary = await res.json();
        
        const rows: ReportRow[] = summary.map((item: any) => ({
          task: {
            id: item._id,
            name: item.name,
            loe: item.loe,
            description: item.description,
            createdAt: item.createdAt
          },
          stats: {
            totalBillable: item.totalBillable,
            totalNonBillable: item.totalNonBillable,
            totalInvested: item.totalBillable + item.totalNonBillable,
            remaining: item.loe - item.totalBillable,
            status: (item.loe - item.totalBillable) < 0 ? 'red' : 
                    (item.loe - item.totalBillable) > 0 ? 'green' : 'slate'
          },
          monthlyBillable: item.monthlyBillable,
          monthlyNonBillable: item.monthlyNonBillable
        }));
        
        setReportData(rows);
      }
    } catch (err) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [currentMonth]);

  const exportToCSV = () => {
    const headers = ['Task Name', 'LOE', 'Billable Hours', 'Non-billable Hours', 'Remaining Hours', 'Status', 'Created Date'];
    const rows = reportData.map(row => [
      row.task.name,
      row.task.loe,
      row.stats.totalBillable,
      row.stats.totalNonBillable,
      row.stats.remaining,
      row.stats.status.toUpperCase(),
      format(new Date(row.task.createdAt), 'yyyy-MM-dd')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `report-${formatMonth(currentMonth)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalMonthlyBillable = reportData.reduce((sum, r) => sum + r.monthlyBillable, 0);
  const totalMonthlyNonBillable = reportData.reduce((sum, r) => sum + r.monthlyNonBillable, 0);
  const overrunTasks = reportData.filter(r => r.stats.status === 'red');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Monthly Report</h2>
          <p className="text-muted-foreground">Detailed breakdown of time spent per task.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 border rounded-md bg-card font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button className="gap-2 ml-4" onClick={exportToCSV} disabled={reportData.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Monthly Billable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMonthlyBillable} hrs</div>
            <p className="text-xs text-muted-foreground">Total for {format(currentMonth, 'MMM yyyy')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Monthly Non-Billable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMonthlyNonBillable} hrs</div>
            <p className="text-xs text-muted-foreground">Total for {format(currentMonth, 'MMM yyyy')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Overrun Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              overrunTasks.length > 0 ? "text-red-500" : "text-green-500"
            )}>
              {overrunTasks.length}
            </div>
            <p className="text-xs text-muted-foreground">Tasks exceeding LOE</p>
          </CardContent>
        </Card>
      </div>

      {overrunTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <CardTitle className="text-sm font-semibold uppercase">Overrun Alert</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">
              The following tasks have exceeded their estimated hours: 
              <span className="font-bold ml-1">
                {overrunTasks.map(r => r.task.name).join(', ')}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Name</TableHead>
              <TableHead>LOE</TableHead>
              <TableHead>Monthly Billable</TableHead>
              <TableHead>Total Billable</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Loading report...</TableCell>
              </TableRow>
            ) : reportData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No activity recorded for this month.
                </TableCell>
              </TableRow>
            ) : (
              reportData.map(row => (
                <TableRow key={(row.task as any)._id || row.task.id}>
                  <TableCell className="font-medium">{row.task.name}</TableCell>
                  <TableCell>{row.task.loe} hrs</TableCell>
                  <TableCell className="text-blue-600 font-medium">+{row.monthlyBillable} hrs</TableCell>
                  <TableCell>{row.stats.totalBillable} hrs</TableCell>
                  <TableCell className={cn(
                    "font-medium",
                    row.stats.remaining < 0 ? "text-red-500" : "text-green-500"
                  )}>
                    {row.stats.remaining} hrs
                  </TableCell>
                  <TableCell>
                    <div className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase",
                      row.stats.status === 'green' ? "bg-green-100 text-green-700" : 
                      row.stats.status === 'red' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                    )}>
                      {row.stats.status}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
