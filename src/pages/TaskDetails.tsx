import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Calendar as CalendarIcon, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { Task, TimeEntry } from '@/types';
import { calculateTaskStats } from '@/lib/calc';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  
  const [formData, setFormData] = useState({
    billable: '',
    nonBillable: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [taskRes, entriesRes] = await Promise.all([
        fetch(`/api/tasks/${id}`),
        fetch(`/api/tasks/${id}/entries?page=${page}&limit=${limit}`)
      ]);
      
      if (taskRes.ok && entriesRes.ok) {
        setTask(await taskRes.json());
        const entriesData = await entriesRes.json();
        setEntries(entriesData.entries);
        setTotalPages(Math.ceil(entriesData.total / limit));
      } else {
        toast.error('Failed to fetch task details');
        navigate('/tasks');
      }
    } catch (err) {
      toast.error('Something went wrong');
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingEntry ? 'PUT' : 'POST';
    const url = editingEntry 
      ? `/api/entries/${(editingEntry as any)._id || editingEntry.id}` 
      : `/api/tasks/${id}/entries`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billable: Number(formData.billable),
          nonBillable: Number(formData.nonBillable),
          date: formData.date,
          notes: formData.notes
        })
      });
      
      if (res.ok) {
        toast.success(editingEntry ? 'Entry updated' : 'Time entry added');
        setIsEntryOpen(false);
        setEditingEntry(null);
        setFormData({
          billable: '',
          nonBillable: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          notes: ''
        });
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save entry');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this time entry?')) return;
    try {
      const res = await fetch(`/api/entries/${entryId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Entry deleted');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

  if (!task) return <div className="flex h-full items-center justify-center">Loading...</div>;

  const stats = calculateTaskStats(task, entries);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{task.name}</h2>
          <p className="text-muted-foreground">{task.description || 'Task details and time tracking.'}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(
          "border-l-4",
          stats.status === 'green' ? "border-l-green-500" : 
          stats.status === 'red' ? "border-l-red-500" : "border-l-slate-500"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-3 w-3 rounded-full",
                stats.status === 'green' ? "bg-green-500" : 
                stats.status === 'red' ? "bg-red-500" : "bg-slate-500"
              )} />
              <span className="text-2xl font-bold capitalize">{stats.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Billable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBillable} / {task.loe} hrs</div>
            <p className="text-xs text-muted-foreground">Total billable hours recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              stats.remaining < 0 ? "text-red-500" : "text-green-500"
            )}>
              {stats.remaining} hrs
            </div>
            <p className="text-xs text-muted-foreground">Hours left in budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvested} hrs</div>
            <p className="text-xs text-muted-foreground">Billable + Non-billable</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Time Entries</h3>
          <Dialog open={isEntryOpen} onOpenChange={(open) => {
            setIsEntryOpen(open);
            if (!open) {
              setEditingEntry(null);
              setFormData({
                billable: '',
                nonBillable: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                notes: ''
              });
            }
          }}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billable">Billable Hours</Label>
                    <Input 
                      id="billable" 
                      type="number" 
                      step="0.5"
                      value={formData.billable} 
                      onChange={e => setFormData({...formData, billable: e.target.value})} 
                      placeholder="0"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nonBillable">Non-Billable Hours</Label>
                    <Input 
                      id="nonBillable" 
                      type="number" 
                      step="0.5"
                      value={formData.nonBillable} 
                      onChange={e => setFormData({...formData, nonBillable: e.target.value})} 
                      placeholder="0"
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input 
                    id="notes" 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="What did you work on?"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full">
                    {editingEntry ? 'Update Entry' : 'Save Entry'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Non-Billable</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No time entries recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map(entry => (
                  <TableRow key={(entry as any)._id || entry.id}>
                    <TableCell className="font-medium">
                      {format(new Date(entry.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{entry.billable} hrs</TableCell>
                    <TableCell>{entry.nonBillable} hrs</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {entry.notes || '-'}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingEntry(entry);
                          setFormData({
                            billable: entry.billable.toString(),
                            nonBillable: entry.nonBillable.toString(),
                            date: format(new Date(entry.date), 'yyyy-MM-dd'),
                            notes: entry.notes || ''
                          });
                          setIsEntryOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteEntry((entry as any)._id || entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination 
          currentPage={page} 
          totalPages={totalPages} 
          onPageChange={setPage} 
        />
      </div>
    </div>
  );
}
