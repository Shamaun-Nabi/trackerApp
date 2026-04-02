import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Edit2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { Task } from '@/types';
import { cn } from '@/lib/utils';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 9;
  
  const [formData, setFormData] = useState({
    name: '',
    loe: '',
    description: ''
  });

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?page=${page}&limit=${limit}&search=${search}`);
      const data = await res.json();
      setTasks(data.tasks);
      setTotalPages(Math.ceil(data.total / limit));
    } catch (err) {
      toast.error('Failed to fetch tasks');
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingTask ? 'PUT' : 'POST';
    const url = editingTask ? `/api/tasks/${editingTask.id || (editingTask as any)._id}` : '/api/tasks';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          loe: Number(formData.loe)
        })
      });
      
      if (res.ok) {
        toast.success(editingTask ? 'Task updated' : 'Task created');
        setIsCreateOpen(false);
        setEditingTask(null);
        setFormData({ name: '', loe: '', description: '' });
        fetchTasks();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Something went wrong');
      }
    } catch (err) {
      toast.error('Failed to save task');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task? All time entries will also be deleted.')) return;
    
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Task deleted');
        fetchTasks();
      }
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">Manage your project tasks and estimates.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingTask(null);
            setFormData({ name: '', loe: '', description: '' });
          }
        }}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Task Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Frontend Development"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loe">Estimated Hours (LOE)</Label>
                <Input 
                  id="loe" 
                  type="number" 
                  value={formData.loe} 
                  onChange={e => setFormData({...formData, loe: e.target.value})} 
                  placeholder="e.g. 40"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input 
                  id="description" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Brief task details..."
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Search tasks..." 
          className="pl-10" 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map(task => {
          const totalBillable = task.totalBillable || 0;
          const remaining = task.loe - totalBillable;
          
          let statusColor = '';
          if (totalBillable > task.loe) {
            statusColor = 'border-destructive/50 bg-destructive/5';
          } else if (remaining > 0) {
            statusColor = 'border-emerald-500/50 bg-emerald-500/5';
          }

          return (
            <Card 
              key={(task as any)._id || task.id} 
              className={cn(
                "group relative overflow-hidden transition-all hover:shadow-md",
                statusColor
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-1 text-lg">{task.name}</CardTitle>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingTask(task);
                        setFormData({
                          name: task.name,
                          loe: task.loe.toString(),
                          description: task.description || ''
                        });
                        setIsCreateOpen(true);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete((task as any)._id || task.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {task.description || 'No description provided.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">LOE: {task.loe} hrs</span>
                    <span className={cn(
                      "font-semibold",
                      remaining < 0 ? "text-destructive" : remaining > 0 ? "text-emerald-600" : "text-muted-foreground"
                    )}>
                      {remaining < 0 ? `Overrun: ${Math.abs(remaining)} hrs` : `${remaining} hrs remaining`}
                    </span>
                  </div>
                  <Link to={`/tasks/${(task as any)._id || task.id}`}>
                    <Button variant="outline" size="sm" className="gap-1">
                      Details
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {tasks.length === 0 && (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed text-center">
          <p className="text-muted-foreground">No tasks found.</p>
          <Button variant="link" onClick={() => setIsCreateOpen(true)}>Create your first task</Button>
        </div>
      )}

      <Pagination 
        currentPage={page} 
        totalPages={totalPages} 
        onPageChange={setPage} 
      />
    </div>
  );
}
