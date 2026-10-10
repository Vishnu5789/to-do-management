import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  Layers,
  Users,
  TrendingUp,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { DashboardMetrics, Task, User } from '../types/index.ts';
import { api } from '../services/api.ts';

interface DashboardViewProps {
  currentUser: User;
  onSelectTask: (task: Task) => void;
  onNavigateToQueue: (filter?: any) => void;
  onNavigateToAi: () => void;
  onNavigateToImport: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  onSelectTask,
  onNavigateToQueue,
  onNavigateToAi,
  onNavigateToImport,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getMetrics();
      setMetrics(data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load metrics');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-3 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>Calculating operational metrics from persisted workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        Failed to load dashboard metrics: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              File Mode Operations Workspace
            </h3>
            <p className="text-xs text-blue-800">
              Operating on imported Oracle CCS To Do lists. All metrics, state transitions, and audit records are
              persisted locally.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onNavigateToImport}
            className="px-3 py-1.5 bg-white border border-blue-300 hover:bg-blue-100/50 text-blue-700 text-xs font-semibold rounded-lg transition"
          >
            Import File
          </button>
          <button
            onClick={fetchMetrics}
            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total */}
        <div
          onClick={() => onNavigateToQueue()}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 cursor-pointer transition group"
        >
          <span className="text-[11px] font-semibold text-slate-500 block truncate">Total Tasks</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{metrics.totalImportedTasks}</div>
          <span className="text-[10px] text-blue-600 font-medium group-hover:underline">View queue &rarr;</span>
        </div>

        {/* Open */}
        <div
          onClick={() => onNavigateToQueue({ status: 'Open' })}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-400 cursor-pointer transition group"
        >
          <span className="text-[11px] font-semibold text-slate-500 block truncate">Open (Unassigned)</span>
          <div className="text-xl font-bold text-slate-800 mt-1">{metrics.openTasks}</div>
          <span className="text-[10px] text-slate-500 font-medium group-hover:underline">Filter open</span>
        </div>

        {/* Assigned */}
        <div
          onClick={() => onNavigateToQueue({ status: 'Assigned' })}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 cursor-pointer transition group"
        >
          <span className="text-[11px] font-semibold text-blue-600 block truncate">Assigned</span>
          <div className="text-xl font-bold text-blue-900 mt-1">{metrics.assignedTasks}</div>
          <span className="text-[10px] text-blue-600 font-medium group-hover:underline">Filter assigned</span>
        </div>

        {/* In Progress */}
        <div
          onClick={() => onNavigateToQueue({ status: 'In Progress' })}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-amber-400 cursor-pointer transition group"
        >
          <span className="text-[11px] font-semibold text-amber-700 block truncate">In Progress</span>
          <div className="text-xl font-bold text-amber-900 mt-1">{metrics.inProgressTasks}</div>
          <span className="text-[10px] text-amber-600 font-medium group-hover:underline">Filter active</span>
        </div>

        {/* On Hold */}
        <div
          onClick={() => onNavigateToQueue({ status: 'On Hold' })}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-purple-400 cursor-pointer transition group"
        >
          <span className="text-[11px] font-semibold text-purple-700 block truncate">On Hold</span>
          <div className="text-xl font-bold text-purple-900 mt-1">{metrics.onHoldTasks}</div>
          <span className="text-[10px] text-purple-600 font-medium group-hover:underline">Filter on hold</span>
        </div>

        {/* Completed */}
        <div
          onClick={() => onNavigateToQueue({ status: 'Completed' })}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-400 cursor-pointer transition group"
        >
          <span className="text-[11px] font-semibold text-emerald-700 block truncate">Completed</span>
          <div className="text-xl font-bold text-emerald-900 mt-1">{metrics.completedTasks}</div>
          <span className="text-[10px] text-emerald-600 font-medium group-hover:underline">Filter resolved</span>
        </div>

        {/* Overdue */}
        <div
          onClick={() => onNavigateToQueue({ dueFilter: 'overdue' })}
          className="bg-red-50/60 p-3.5 rounded-xl border border-red-200 shadow-2xs hover:border-red-400 cursor-pointer transition group"
        >
          <span className="text-[11px] font-semibold text-red-700 block truncate">Overdue</span>
          <div className="text-xl font-bold text-red-900 mt-1">{metrics.overdueTasks}</div>
          <span className="text-[10px] text-red-600 font-medium group-hover:underline">Urgent attention</span>
        </div>

        {/* Critical & High */}
        <div
          onClick={() => onNavigateToQueue({ priority: 'Critical' })}
          className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-200 shadow-2xs hover:border-orange-400 cursor-pointer transition group"
        >
          <span className="text-[11px] font-semibold text-orange-800 block truncate">Critical / High</span>
          <div className="text-xl font-bold text-orange-900 mt-1">{metrics.criticalAndHighActiveTasks}</div>
          <span className="text-[10px] text-orange-700 font-medium group-hover:underline">High priority</span>
        </div>
      </div>

      {/* Main Grid: Workload breakdown & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Status & Priority Distribution + Recently Updated */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status and Priority Summary Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
              <span>Queue Status & Priority Distribution</span>
              <span className="text-xs text-slate-400 font-normal">Persisted records</span>
            </h3>

            {/* Visual Bar representation */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Lifecycle Progress</span>
                  <span>
                    {metrics.completedTasks} / {metrics.totalImportedTasks} Resolved (
                    {metrics.totalImportedTasks > 0
                      ? Math.round((metrics.completedTasks / metrics.totalImportedTasks) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${(metrics.completedTasks / (metrics.totalImportedTasks || 1)) * 100}%`,
                    }}
                    className="bg-emerald-500"
                    title={`Completed: ${metrics.completedTasks}`}
                  />
                  <div
                    style={{
                      width: `${(metrics.inProgressTasks / (metrics.totalImportedTasks || 1)) * 100}%`,
                    }}
                    className="bg-amber-500"
                    title={`In Progress: ${metrics.inProgressTasks}`}
                  />
                  <div
                    style={{
                      width: `${(metrics.onHoldTasks / (metrics.totalImportedTasks || 1)) * 100}%`,
                    }}
                    className="bg-purple-500"
                    title={`On Hold: ${metrics.onHoldTasks}`}
                  />
                  <div
                    style={{
                      width: `${(metrics.assignedTasks / (metrics.totalImportedTasks || 1)) * 100}%`,
                    }}
                    className="bg-blue-500"
                    title={`Assigned: ${metrics.assignedTasks}`}
                  />
                  <div
                    style={{
                      width: `${(metrics.openTasks / (metrics.totalImportedTasks || 1)) * 100}%`,
                    }}
                    className="bg-slate-300"
                    title={`Open: ${metrics.openTasks}`}
                  />
                </div>
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap gap-2 text-xs pt-1">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Completed: {metrics.completedTasks}</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>In Progress: {metrics.inProgressTasks}</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-purple-50 text-purple-800 rounded-md border border-purple-200">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>On Hold: {metrics.onHoldTasks}</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 rounded-md border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Assigned: {metrics.assignedTasks}</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Open: {metrics.openTasks}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Recently Updated Tasks */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Recently Updated Tasks</h3>
              <button
                onClick={() => onNavigateToQueue()}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                View all in work queue &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {metrics.recentlyUpdatedTasks.map((t) => (
                <div
                  key={t.taskId}
                  onClick={() => onSelectTask(t)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded-lg px-2 -mx-2 transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {t.taskId}
                    </span>
                    <div>
                      <div className="text-xs font-medium text-slate-800 truncate max-w-md">
                        {t.description || t.taskType}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t.teamName} &bull; Assignee: {t.assigneeName || 'Unassigned'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {t.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: AI Workload Advisor & My Active Tasks */}
        <div className="space-y-6">
          {/* AI Workload Summary Widget */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-500 rounded-md text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-100">AI Operational Summary</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Active backlog consists of{' '}
              <strong className="text-white">{metrics.criticalAndHighActiveTasks} high/critical priority</strong> tasks.
              There are <strong className="text-red-400">{metrics.overdueTasks} overdue items</strong> requiring
              immediate triage, particularly within the Billing and Field Services queues.
            </p>

            <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-xs space-y-1.5">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Recommended Action:</div>
              <div className="text-slate-200">
                1. Review life-support pending disconnection task <span className="font-mono text-amber-300">TD10004</span>.
              </div>
              <div className="text-slate-200">
                2. Transition investigated rate tier task <span className="font-mono text-blue-300">TD10025</span>.
              </div>
            </div>

            <button
              onClick={onNavigateToAi}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 transition"
            >
              <span>Open AI Assistant & Propose Actions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tasks by Team Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">Workload by Functional Team</h3>
            <div className="space-y-2 text-xs">
              {Object.entries(metrics.tasksByTeam).map(([team, count]) => (
                <div key={team} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700 truncate">{team}</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
