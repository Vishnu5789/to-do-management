import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Sparkles,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { Task, TaskFilter, User } from '../types/index.ts';
import { api } from '../services/api.ts';

interface WorkQueueViewProps {
  currentUser: User;
  initialFilter?: TaskFilter;
  onSelectTask: (task: Task) => void;
  onNavigateToAiWithTask?: (taskId: string) => void;
}

export const WorkQueueView: React.FC<WorkQueueViewProps> = ({
  currentUser,
  initialFilter,
  onSelectTask,
  onNavigateToAiWithTask,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filter, setFilter] = useState<TaskFilter>({
    search: '',
    status: 'all',
    substatus: 'all',
    priority: 'all',
    taskType: 'all',
    teamId: 'all',
    dueFilter: 'all',
    ...initialFilter,
  });

  // Sorting
  const [sortField, setSortField] = useState<keyof Task>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const loadTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getTasks(filter);
      setTasks(data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const handleResetFilters = () => {
    setFilter({
      search: '',
      status: 'all',
      substatus: 'all',
      priority: 'all',
      taskType: 'all',
      teamId: 'all',
      dueFilter: 'all',
    });
    setCurrentPage(1);
  };

  const handleSort = (field: keyof Task) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sorted and Paginated items
  const sortedTasks = [...tasks].sort((a, b) => {
    const valA = a[sortField] || '';
    const valB = b[sortField] || '';
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedTasks.length / pageSize) || 1;
  const paginatedTasks = sortedTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const priorityColor = {
    Critical: 'bg-red-50 text-red-700 border-red-200',
    High: 'bg-orange-50 text-orange-700 border-orange-200',
    Medium: 'bg-blue-50 text-blue-700 border-blue-200',
    Low: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  const statusColor = {
    Open: 'bg-slate-100 text-slate-700 border-slate-300',
    Assigned: 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress': 'bg-amber-50 text-amber-800 border-amber-200',
    'On Hold': 'bg-purple-50 text-purple-700 border-purple-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filter.search || ''}
              onChange={(e) => {
                setFilter({ ...filter, search: e.target.value });
                setCurrentPage(1);
              }}
              placeholder="Search by Task ID (e.g. TD10025), description, type, or related entity..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>

            <a
              href="/api/audit/export-tasks"
              download
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs pt-1">
          {/* Status */}
          <select
            value={filter.status || 'all'}
            onChange={(e) => {
              setFilter({ ...filter, status: e.target.value });
              setCurrentPage(1);
            }}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Priority */}
          <select
            value={filter.priority || 'all'}
            onChange={(e) => {
              setFilter({ ...filter, priority: e.target.value });
              setCurrentPage(1);
            }}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Task Type */}
          <select
            value={filter.taskType || 'all'}
            onChange={(e) => {
              setFilter({ ...filter, taskType: e.target.value });
              setCurrentPage(1);
            }}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
          >
            <option value="all">All Task Types</option>
            <option value="TD-BILLERR">TD-BILLERR (Bill Segment Error)</option>
            <option value="TD-HIGHCON">TD-HIGHCON (High Consumption)</option>
            <option value="TD-MTRSTP">TD-MTRSTP (Stopped Meter)</option>
            <option value="TD-DISCNX">TD-DISCNX (Disconnect Verify)</option>
            <option value="TD-COLNOTE">TD-COLNOTE (Collections)</option>
            <option value="TD-NEWSRV">TD-NEWSRV (New Service)</option>
          </select>

          {/* Due Filter */}
          <select
            value={filter.dueFilter || 'all'}
            onChange={(e) => {
              setFilter({ ...filter, dueFilter: e.target.value as any });
              setCurrentPage(1);
            }}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
          >
            <option value="all">All Due Dates</option>
            <option value="overdue">Overdue Tasks</option>
            <option value="today">Due Today</option>
            <option value="upcoming">Upcoming</option>
          </select>

          {/* Conflict Toggle */}
          <select
            value={filter.hasConflict === undefined ? 'all' : String(filter.hasConflict)}
            onChange={(e) => {
              setFilter({
                ...filter,
                hasConflict: e.target.value === 'all' ? undefined : e.target.value === 'true',
              });
              setCurrentPage(1);
            }}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
          >
            <option value="all">Conflict: All</option>
            <option value="true">Has Import Conflict</option>
            <option value="false">No Conflicts</option>
          </select>

          {/* Modified Toggle */}
          <select
            value={filter.isLocallyModified === undefined ? 'all' : String(filter.isLocallyModified)}
            onChange={(e) => {
              setFilter({
                ...filter,
                isLocallyModified: e.target.value === 'all' ? undefined : e.target.value === 'true',
              });
              setCurrentPage(1);
            }}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
          >
            <option value="all">Workspace: All</option>
            <option value="true">Locally Modified</option>
            <option value="false">Original Import</option>
          </select>
        </div>
      </div>

      {/* Task Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            Loading tasks from local workspace...
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="text-slate-400 text-sm">No tasks matched your search or filters.</div>
            <button
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th
                    onClick={() => handleSort('taskId')}
                    className="p-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Task ID</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('priority')}
                    className="p-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Priority</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="p-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status / Substatus</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3 border-b border-slate-800">Type & Description</th>
                  <th className="p-3 border-b border-slate-800">Assignee / Team</th>
                  <th className="p-3 border-b border-slate-800">Related Object</th>
                  <th
                    onClick={() => handleSort('dueAt')}
                    className="p-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Due Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3 border-b border-slate-800 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedTasks.map((t) => {
                  const isOverdue = t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'Completed';

                  return (
                    <tr
                      key={t.taskId}
                      onClick={() => onSelectTask(t)}
                      className="hover:bg-blue-50/40 cursor-pointer transition"
                    >
                      {/* Task ID + badges */}
                      <td className="p-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span>{t.taskId}</span>
                          <span className="text-[10px] text-slate-400 font-normal">v{t.version}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-0.5">
                          {t.isLocallyModified && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-1 rounded font-sans">
                              Local
                            </span>
                          )}
                          {t.hasConflict && (
                            <span className="text-[9px] bg-red-100 text-red-800 border border-red-300 px-1 rounded font-sans flex items-center space-x-0.5">
                              <AlertTriangle className="w-2.5 h-2.5 inline" />
                              <span>Conflict</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            priorityColor[t.priority]
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>

                      {/* Status & Substatus */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border w-fit ${
                              statusColor[t.status]
                            }`}
                          >
                            {t.status}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs">
                            {t.substatus}
                          </span>
                        </div>
                      </td>

                      {/* Type & Description */}
                      <td className="p-3 max-w-md">
                        <span className="font-semibold text-slate-900 block truncate">{t.taskType}</span>
                        <span className="text-slate-600 line-clamp-1 text-[11px]">{t.description}</span>
                      </td>

                      {/* Assignee & Team */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-slate-900 font-medium block">
                          {t.assigneeName || (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-500">{t.teamName}</span>
                      </td>

                      {/* Related Object */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-slate-500 block text-[11px]">{t.relatedObjectType}</span>
                        <span className="font-mono text-slate-800 font-medium">{t.relatedObjectId}</span>
                      </td>

                      {/* Due Date */}
                      <td className="p-3 whitespace-nowrap">
                        {t.dueAt ? (
                          <div className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'}>
                            {new Date(t.dueAt).toLocaleDateString()}
                            {isOverdue && <span className="block text-[10px] font-bold">[OVERDUE]</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onSelectTask(t)}
                            className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-[11px] font-semibold"
                          >
                            Details
                          </button>
                          {onNavigateToAiWithTask && (
                            <button
                              onClick={() => onNavigateToAiWithTask(t.taskId)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Ask AI about this task"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, sortedTasks.length)} of {sortedTasks.length} tasks
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
