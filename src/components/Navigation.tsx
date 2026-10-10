import React from 'react';
import {
  LayoutDashboard,
  ListTodo,
  UserCheck,
  FileUp,
  Bot,
  History,
  Users,
  Settings,
  ShieldAlert,
  Shield,
  Layers,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { User } from '../types/index.ts';

export type NavItem =
  | 'dashboard'
  | 'queue'
  | 'my-tasks'
  | 'import'
  | 'ai'
  | 'audit'
  | 'team'
  | 'reconciliation'
  | 'settings';

interface NavigationProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (userId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  allUsers,
  onSwitchUser,
}) => {
  const navItems = [
    { id: 'dashboard' as NavItem, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'queue' as NavItem, label: 'To Do Work Queue', icon: ListTodo },
    { id: 'my-tasks' as NavItem, label: 'My Tasks', icon: UserCheck },
    { id: 'import' as NavItem, label: 'File Import', icon: FileUp },
    { id: 'ai' as NavItem, label: 'AI Assistant', icon: Bot, badge: 'Gemini' },
    { id: 'audit' as NavItem, label: 'Activity & Audit', icon: History },
    { id: 'team' as NavItem, label: 'Team Workload', icon: Users },
    { id: 'reconciliation' as NavItem, label: 'Reconciliation', icon: Layers },
    { id: 'settings' as NavItem, label: 'Settings & Architecture', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
            CCS
          </div>
          <div>
            <h1 className="font-bold text-sm text-white leading-tight">To Do AI Manager</h1>
            <span className="text-[10px] text-slate-400 font-medium block">Oracle Utilities Edition</span>
          </div>
        </div>

        {/* Prominent File Mode Label as mandated by spec */}
        <div className="mt-3 px-2.5 py-1.5 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-300 text-[10px] font-semibold flex items-center space-x-1.5">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span className="truncate">File Mode — Not Connected to Live CCS</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active User Switcher / Role Simulation Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
          <span>Active Role & Identity</span>
          <span className="text-[9px] text-blue-400 font-mono">RBAC</span>
        </div>

        <div className="space-y-1.5">
          <select
            value={currentUser.userId}
            onChange={(e) => onSwitchUser(e.target.value)}
            className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            {allUsers.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.displayName} ({u.role})
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
            <span className="truncate max-w-[130px]">{currentUser.teamName}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                currentUser.role === 'Supervisor'
                  ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                  : 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
              }`}
            >
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
