import React, { useEffect, useState } from 'react';
import {
  History,
  Download,
  Filter,
  Search,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Shield,
  Layers,
} from 'lucide-react';
import { TaskAuditLog, User } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuditHistoryViewProps {
  currentUser: User;
  onSelectTaskId?: (taskId: string) => void;
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({
  currentUser,
  onSelectTaskId,
}) => {
  const [logs, setLogs] = useState<TaskAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (filterAction !== 'all' && l.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.taskId.toLowerCase().includes(q) ||
        l.actorName.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q) ||
        l.correlationId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Immutable Activity & Audit History</span>
          </h2>
          <p className="text-xs text-slate-500">
            Append-only enterprise log of all lifecycle transitions, file batch imports, and AI-confirmed actions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="/api/audit/export-audit"
            download
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit CSV</span>
          </a>
          <button
            onClick={loadLogs}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs"
            title="Refresh logs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Task ID, Actor Name, or Reason..."
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-hidden"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
        >
          <option value="all">All Actions</option>
          <option value="START_PROGRESS">START_PROGRESS</option>
          <option value="PUT_ON_HOLD">PUT_ON_HOLD</option>
          <option value="RESUME_PROGRESS">RESUME_PROGRESS</option>
          <option value="COMPLETE">COMPLETE</option>
          <option value="ASSIGN">ASSIGN / REASSIGN</option>
          <option value="FILE_IMPORT">FILE_IMPORT</option>
          <option value="RESOLVE_CONFLICT">RESOLVE_CONFLICT</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading audit records...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">No audit logs matching current filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="p-3 border-b border-slate-800">Event ID</th>
                  <th className="p-3 border-b border-slate-800">Task ID</th>
                  <th className="p-3 border-b border-slate-800">Action</th>
                  <th className="p-3 border-b border-slate-800">Transition</th>
                  <th className="p-3 border-b border-slate-800">Actor</th>
                  <th className="p-3 border-b border-slate-800">Reason / Details</th>
                  <th className="p-3 border-b border-slate-800">Source</th>
                  <th className="p-3 border-b border-slate-800">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((l) => (
                  <tr key={l.eventId} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-[11px] text-slate-500">{l.eventId}</td>
                    <td className="p-3 font-mono font-bold text-blue-700">
                      <button
                        onClick={() => onSelectTaskId && onSelectTaskId(l.taskId)}
                        className="hover:underline"
                      >
                        {l.taskId}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      <span>{l.previousStatus}</span> &rarr;{' '}
                      <span className="font-semibold text-slate-900">{l.newStatus}</span>
                    </td>
                    <td className="p-3 text-slate-800 font-medium">{l.actorName}</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate" title={l.reason}>
                      {l.reason || '—'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          l.source === 'AI_CONFIRMED'
                            ? 'bg-purple-100 text-purple-800 font-bold'
                            : l.source === 'FILE_IMPORT'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {l.source}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
