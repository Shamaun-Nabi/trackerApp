import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, FileText, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetails from './pages/TaskDetails';
import Reports from './pages/Reports';
import { cn } from '@/lib/utils';

function NavItem({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) {
  return (
    <Link to={to}>
      <Button
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-2 px-3",
          active && "bg-secondary font-medium"
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}

function Sidebar() {
  const location = useLocation();
  
  return (
    <div className="flex h-full w-64 flex-col border-r bg-card px-3 py-4">
      <div className="mb-8 px-3">
        <h1 className="text-xl font-bold tracking-tight">TimeTracker</h1>
        <p className="text-xs text-muted-foreground">Monthly Task Management</p>
      </div>
      <nav className="flex-1 space-y-1">
        <NavItem 
          to="/" 
          icon={LayoutDashboard} 
          label="Dashboard" 
          active={location.pathname === "/"} 
        />
        <NavItem 
          to="/tasks" 
          icon={ListTodo} 
          label="Tasks" 
          active={location.pathname.startsWith("/tasks")} 
        />
        <NavItem 
          to="/reports" 
          icon={FileText} 
          label="Reports" 
          active={location.pathname === "/reports"} 
        />
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="flex h-screen w-full bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:id" element={<TaskDetails />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
      <Toaster />
    </Router>
  );
}
