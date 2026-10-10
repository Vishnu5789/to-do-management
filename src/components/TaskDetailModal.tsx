import React, { useState } from 'react';
import {
  X,
  Clock,
  User as UserIcon,
  CheckCircle,
  Play,
  Pause,
  AlertTriangle,
  FileText,
  RotateCcw,
  Shield,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Hash,
  Loader2,
} from 'lucide-react';
import { Task, TaskAuditLog, User } from '../types/index.ts';
import { api } from '../services/api.ts';

interface TaskDetailModalProps {
  task: Task;
  auditLogs: TaskAuditLog[];
  currentUser: User;
  allUsers: User[];
  onClose: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  auditLogs,
  currentUser,
  allUsers,
  onClose,
  onTaskUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'audit' | 'source'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Dialog states for requiring notes/reasons
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReason, setHoldReason] = useState('');

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNote, setCompletionNote] = useState('');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(task.assigneeId || '');

  // Conflict resolution state
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  const isSupervisor = currentUser.role === 'Supervisor';

  const handleAction = async (
    action: 'START_PROGRESS' | 'PUT_ON_HOLD' | 'RESUME_PROGRESS' | 'COMPLETE' | 'ASSIGN' | 'REASSIGN',
    options?: { reason?: string; note?: string; assigneeId?: string; assigneeName?: string }
  ) => {
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await api.transitionTask(task.taskId, action, {
        ...options,
        expectedVersion: task.version,
      });
      setIsLoading(false);
      onTaskUpdated(res.task);
    } catch (err: any) {
      setIsLoading(false);
      setActionError(err.message || 'Action failed');
    }
  };

  const handleResolveConflict = async (resolution: 'KEEP_LOCAL' | 'ACCEPT_SOURCE' | 'MERGE') => {
    setIsResolvingConflict(true);
    setActionError(null);
    try {
      const updated = await api.resolveConflict(task.taskId, resolution, `Resolved via UI modal`);
      setIsResolvingConflict(false);
      onTaskUpdated(updated);
    } catch (err: any) {
      setIsResolvingConflict(false);
      setActionError(err.message || 'Conflict resolution failed');
    }
  };

  const priorityColor = {
    Critical: 'bg-red-100 text-red-800 border-red-300',
    High: 'bg-orange-100 text-orange-800 border-orange-300',
    Medium: 'bg-blue-100 text-blue-800 border-blue-300',
    Low: 'bg-slate-100 text-slate-700 border-slate-300',
  }[task.priority];

  const statusColor = {
    Open: 'bg-slate-100 text-slate-800 border-slate-300',
    Assigned: 'bg-blue-100 text-blue-800 border-blue-300',
    'In Progress': 'bg-amber-100 text-amber-900 border-amber-300',
    'On Hold': 'bg-purple-100 text-purple-900 border-purple-300',
    Completed: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  }[task.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs bg-slate-800 px-2.5 py-0.5 rounded text-blue-400 font-semibold border border-slate-700">
                {task.taskId}
              </span>
              <span className="text-xs text-slate-400 font-medium">{task.taskType}</span>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                v{task.version}
              </span>
              {task.isLocallyModified && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">
                  Locally Modified
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-1 line-clamp-1">{task.description}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 text-sm font-medium">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Task Overview & Lifecycle
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Audit Trail</span>
            <span className="bg-slate-200 text-slate-700 text-xs px-1.5 py-0.2 rounded-full">
              {auditLogs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('source')}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === 'source'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Source Metadata
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {actionError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <span className="font-semibold block">Transition Error:</span>
                {actionError}
              </div>
            </div>
          )}

          {/* Conflict Banner if task has conflict */}
          {task.hasConflict && task.conflictDetails && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-amber-900 font-semibold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Re-Import Conflict Detected</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                This task was modified locally in your workspace, but an incoming file import contains differing
                values. Oracle CCS live state is not assumed; please resolve how to reconcile this record:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-amber-200">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Local Workspace State</div>
                  <div className="font-medium text-slate-900">Status: {task.conflictDetails.localStatus}</div>
                  <div className="text-slate-600">Priority: {task.conflictDetails.localPriority}</div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-600 uppercase font-semibold">Import File State</div>
                  <div className="font-medium text-amber-900">Status: {task.conflictDetails.sourceStatus}</div>
                  <div className="text-amber-800">Priority: {task.conflictDetails.sourcePriority}</div>
                </div>
              </div>

              {isSupervisor ? (
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => handleResolveConflict('KEEP_LOCAL')}
                    disabled={isResolvingConflict}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition"
                  >
                    Keep Local Values
                  </button>
                  <button
                    onClick={() => handleResolveConflict('ACCEPT_SOURCE')}
                    disabled={isResolvingConflict}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition"
                  >
                    Accept Source File Values
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-amber-700 italic">
                  Only a supervisor is authorized to resolve import conflicts.
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Status and Priority Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500 font-medium">Status & Substatus</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${statusColor}`}>
                      {task.status}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">{task.substatus}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500 font-medium">Priority</div>
                  <div className="mt-1">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${priorityColor}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment & Team */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Assignment & Scope</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Assignee</span>
                    <span className="font-semibold text-slate-800 flex items-center space-x-1.5 mt-0.5">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{task.assigneeName || 'Unassigned'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Team Role</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{task.teamName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Related Object</span>
                    <span className="font-medium text-slate-800 mt-0.5 block">
                      {task.relatedObjectType}: <span className="font-mono text-blue-700">{task.relatedObjectId}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Due Date</span>
                    <span className="font-medium text-slate-800 mt-0.5 block">
                      {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'None scheduled'}
                      {task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'Completed' && (
                        <span className="ml-1 text-[10px] text-red-600 font-bold">[OVERDUE]</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Completion Note / Hold Reason if present */}
              {task.holdReason && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                  <span className="font-bold text-purple-900 block mb-1">Active Hold Reason:</span>
                  <p className="text-purple-800 italic">"{task.holdReason}"</p>
                </div>
              )}

              {task.completionNote && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <span className="font-bold text-emerald-900 block mb-1">Completion Note on Record:</span>
                  <p className="text-emerald-800 italic">"{task.completionNote}"</p>
                </div>
              )}

              {/* Lifecycle Actions Toolbar */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Execute Lifecycle Transition
                  </h4>
                  <span className="text-[11px] text-slate-400">Server validated</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Start Progress */}
                  {(task.status === 'Open' || task.status === 'Assigned') && (
                    <button
                      onClick={() => handleAction('START_PROGRESS')}
                      disabled={isLoading}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Progress</span>
                    </button>
                  )}

                  {/* Put On Hold */}
                  {(task.status === 'In Progress' || task.status === 'Assigned') && (
                    <button
                      onClick={() => setShowHoldModal(true)}
                      disabled={isLoading}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Put On Hold...</span>
                    </button>
                  )}

                  {/* Resume Progress */}
                  {task.status === 'On Hold' && (
                    <button
                      onClick={() => handleAction('RESUME_PROGRESS')}
                      disabled={isLoading}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Progress</span>
                    </button>
                  )}

                  {/* Complete Task */}
                  {task.status !== 'Completed' && (
                    <button
                      onClick={() => setShowCompleteModal(true)}
                      disabled={isLoading}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Complete Task...</span>
                    </button>
                  )}

                  {/* Assign / Reassign */}
                  {task.status !== 'Completed' && (
                    <button
                      onClick={() => setShowAssignModal(true)}
                      disabled={isLoading}
                      className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>{task.assigneeId ? 'Reassign...' : 'Assign...'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Task Audit Log (Append-Only)</span>
                <span>{auditLogs.length} events recorded</span>
              </div>
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No audit events recorded for this task.</div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-2">
                  {auditLogs.map((log) => (
                    <div key={log.eventId} className="ml-5 relative">
                      <div className="absolute -left-7 top-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{log.action}</span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          {log.previousStatus} &rarr; <span className="font-semibold">{log.newStatus}</span>
                        </div>
                        {log.reason && (
                          <div className="text-xs text-slate-700 italic bg-white p-2 rounded border border-slate-200 mt-1">
                            "{log.reason}"
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>Actor: {log.actorName}</span>
                          <span className="font-mono">Source: {log.source}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'source' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                Last Imported From Batch: <span className="font-mono font-semibold">{task.lastImportBatchId}</span>{' '}
                on {new Date(task.lastImportedAt).toLocaleString()}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Raw Imported Row Attributes
                </h4>
                <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-80">
                  <pre>{JSON.stringify(task.sourceValues, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
          <div>Workspace Mode: <span className="font-semibold text-slate-700">File Mode</span></div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-medium text-slate-700 transition"
          >
            Close
          </button>
        </div>

        {/* Modals for Put On Hold, Complete, Assign */}
        {showHoldModal && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Place Task On Hold</h3>
              <p className="text-xs text-slate-600">
                A valid hold reason is required (min 5 characters) per utility operating procedure.
              </p>
              <textarea
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="e.g., Awaiting meter reading from field dispatch unit"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-hidden"
                rows={3}
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowHoldModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowHoldModal(false);
                    await handleAction('PUT_ON_HOLD', { reason: holdReason });
                  }}
                  disabled={holdReason.trim().length < 5}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  Confirm Hold
                </button>
              </div>
            </div>
          </div>
        )}

        {showCompleteModal && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Complete To Do Task</h3>
              <p className="text-xs text-slate-600">
                Enter an audit completion note describing how the billing anomaly or exception was resolved.
              </p>
              <textarea
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="e.g., Tariff adjusted and verified against customer ledger."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
                rows={3}
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowCompleteModal(false);
                    await handleAction('COMPLETE', { note: completionNote });
                  }}
                  disabled={completionNote.trim().length < 5}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  Complete Task
                </button>
              </div>
            </div>
          </div>
        )}

        {showAssignModal && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="font-bold text-slate-900 text-base">
                {task.assigneeId ? 'Reassign Task' : 'Assign Task'}
              </h3>
              <p className="text-xs text-slate-600">
                Select an authorized operator from the team directory:
              </p>
              <select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="">-- Select Operator --</option>
                {allUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.displayName} ({u.role} - {u.teamName})
                  </option>
                ))}
              </select>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const chosen = allUsers.find((u) => u.userId === selectedAssigneeId);
                    setShowAssignModal(false);
                    const actionType = task.assigneeId ? 'REASSIGN' : 'ASSIGN';
                    await handleAction(actionType, {
                      assigneeId: selectedAssigneeId,
                      assigneeName: chosen?.displayName,
                    });
                  }}
                  disabled={!selectedAssigneeId}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  Assign Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
