import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Bot,
  FileUp,
  Sparkles,
  Layers,
  CheckCircle,
  Bell,
  Search,
  ExternalLink,
} from 'lucide-react';
import { NavItem, Navigation } from './components/Navigation.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { WorkQueueView } from './components/WorkQueueView.tsx';
import { FileImportWizard } from './components/FileImportWizard.tsx';
import { AiAssistantView } from './components/AiAssistantView.tsx';
import { AuditHistoryView } from './components/AuditHistoryView.tsx';
import { TeamWorkloadView } from './components/TeamWorkloadView.tsx';
import { ReconciliationExportView } from './components/ReconciliationExportView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { TaskDetailModal } from './components/TaskDetailModal.tsx';
import { ImportBatch, Task, TaskAuditLog, User } from './types/index.ts';
import { api } from './services/api.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>({
    userId: 'usr_sup_1',
    email: 'marcus.vance@utility.internal',
    displayName: 'Marcus Vance',
    role: 'Supervisor',
    teamId: 'TEAM_BILLING',
    teamName: 'Billing & Revenue Oversight',
    isActive: true,
    createdAt: '2026-01-10T08:00:00.000Z',
  });

  // Selected task for modal details
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskAuditLogs, setSelectedTaskAuditLogs] = useState<TaskAuditLog[]>([]);

  // Queue initial filter override (when navigated from dashboard)
  const [queueFilter, setQueueFilter] = useState<any>({});

  // Global Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load users from backend
    api.getUsers().then((users) => {
      if (users.length > 0) {
        setAllUsers(users);
        const supervisor = users.find((u) => u.role === 'Supervisor') || users[0];
        setCurrentUser(supervisor);
        api.setActingUser(supervisor.userId);
      }
    });
  }, []);

  const handleSwitchUser = (userId: string) => {
    const user = allUsers.find((u) => u.userId === userId);
    if (user) {
      setCurrentUser(user);
      api.setActingUser(user.userId);
      showToast(`Switched active user to ${user.displayName} (${user.role})`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleSelectTask = async (task: Task) => {
    setSelectedTask(task);
    try {
      const details = await api.getTaskById(task.taskId);
      setSelectedTask(details.task);
      setSelectedTaskAuditLogs(details.auditLogs);
    } catch {
      setSelectedTaskAuditLogs([]);
    }
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setSelectedTask(updatedTask);
    showToast(`Task ${updatedTask.taskId} transitioned to ${updatedTask.status}.`);
  };

  const handleNavigateToQueueWithFilter = (filter?: any) => {
    setQueueFilter(filter || {});
    setCurrentTab('queue');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900 antialiased">
      {/* Sidebar Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        currentUser={currentUser}
        allUsers={allUsers}
        onSwitchUser={handleSwitchUser}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Enterprise Top Header Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              {currentTab === 'dashboard' && 'Operations Dashboard'}
              {currentTab === 'queue' && 'To Do Work Queue'}
              {currentTab === 'my-tasks' && 'My Active Queue'}
              {currentTab === 'import' && 'File Import Wizard'}
              {currentTab === 'ai' && 'AI Assistant (Gemini)'}
              {currentTab === 'audit' && 'System Activity & Audit Log'}
              {currentTab === 'team' && 'Team Workload Distribution'}
              {currentTab === 'reconciliation' && 'Reconciliation & Exports'}
              {currentTab === 'settings' && 'System Settings & Architecture'}
            </h2>

            {/* Prominent File Mode Notice Badge */}
            <span className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>File Mode — Not Connected to Live CCS</span>
            </span>
          </div>

          {/* Quick Actions & User Pill */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentTab('ai')}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-blue-200"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden md:inline">AI Assistant</span>
            </button>

            <button
              onClick={() => setCurrentTab('import')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Import Batch</span>
            </button>

            <div className="h-5 w-px bg-slate-200" />

            {/* Current user badge */}
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[11px]">
                {currentUser.displayName.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="hidden lg:block text-left">
                <span className="font-semibold text-slate-800 block text-xs leading-none">
                  {currentUser.displayName}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">{currentUser.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-slate-900 text-white px-6 py-2.5 text-xs font-medium flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              &times;
            </button>
          </div>
        )}

        {/* View Container */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              onSelectTask={handleSelectTask}
              onNavigateToQueue={handleNavigateToQueueWithFilter}
              onNavigateToAi={() => setCurrentTab('ai')}
              onNavigateToImport={() => setCurrentTab('import')}
            />
          )}

          {currentTab === 'queue' && (
            <WorkQueueView
              currentUser={currentUser}
              initialFilter={queueFilter}
              onSelectTask={handleSelectTask}
              onNavigateToAiWithTask={(taskId) => {
                setCurrentTab('ai');
              }}
            />
          )}

          {currentTab === 'my-tasks' && (
            <WorkQueueView
              currentUser={currentUser}
              initialFilter={{ assigneeId: currentUser.userId }}
              onSelectTask={handleSelectTask}
              onNavigateToAiWithTask={() => setCurrentTab('ai')}
            />
          )}

          {currentTab === 'import' && (
            <FileImportWizard
              currentUser={currentUser}
              onImportCompleted={(batch) => {
                showToast(`Batch ${batch.batchId} accepted (${batch.acceptedRows} rows).`);
                setCurrentTab('queue');
              }}
              onCancel={() => setCurrentTab('queue')}
            />
          )}

          {currentTab === 'ai' && (
            <AiAssistantView
              currentUser={currentUser}
              onNavigateToTask={(taskId) => {
                api.getTaskById(taskId).then((t) => handleSelectTask(t.task));
              }}
              onTaskUpdated={() => {
                showToast('Task updated via AI assistant.');
              }}
            />
          )}

          {currentTab === 'audit' && (
            <AuditHistoryView
              currentUser={currentUser}
              onSelectTaskId={(taskId) => {
                api.getTaskById(taskId).then((t) => handleSelectTask(t.task));
              }}
            />
          )}

          {currentTab === 'team' && (
            <TeamWorkloadView
              currentUser={currentUser}
              onSelectTask={handleSelectTask}
            />
          )}

          {currentTab === 'reconciliation' && (
            <ReconciliationExportView
              currentUser={currentUser}
              onSelectTask={handleSelectTask}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onResetWorkspace={() => {
                showToast('Workspace reset to clean sample state.');
                setCurrentTab('dashboard');
              }}
            />
          )}
        </main>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          auditLogs={selectedTaskAuditLogs}
          currentUser={currentUser}
          allUsers={allUsers}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </div>
  );
}
