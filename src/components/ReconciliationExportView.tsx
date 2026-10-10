import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Task, User } from '../types/index.ts';
import { api } from '../services/api.ts';

interface ReconciliationExportViewProps {
  currentUser: User;
  onSelectTask: (task: Task) => void;
}

export const ReconciliationExportView: React.FC<ReconciliationExportViewProps> = ({
  currentUser,
  onSelectTask,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTasks();
      setTasks(data);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const modifiedTasks = tasks.filter((t) => t.isLocallyModified);
  const conflictTasks = tasks.filter((t) => t.hasConflict);

  return (
    <div className="space-y-6">
      {/* Header and Disclaimer */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
          <FileText className="w-5 h-5 text-blue-600" />
          <span>Local Workspace Reconciliation & Secure Exports</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          This module compares your local working state against original imported Oracle CCS snapshots. All exports
          are protected against spreadsheet formula injection (=, +, -, @) and explicitly labeled as local
          workspace results.
        </p>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Disclaimer:</strong> Exporting files does not update or sync with live Oracle Utilities CCS. All
            data represents this local File Mode workspace only.
          </span>
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Full Task List */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <h3 className="font-bold text-slate-800 text-xs">Current Workspace Task List</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Complete snapshot of all {tasks.length} active and resolved tasks in local storage.
            </p>
          </div>
          <a
            href="/api/audit/export-tasks"
            download
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Tasks (CSV)</span>
          </a>
        </div>

        {/* Reconciliation Report */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <h3 className="font-bold text-slate-800 text-xs">Reconciliation Status Report</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Direct comparison between original imported values and local working modifications.
            </p>
          </div>
          <a
            href="/api/audit/export-reconciliation"
            download
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Reconciliation (CSV)</span>
          </a>
        </div>

        {/* Audit Trail Export */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <h3 className="font-bold text-slate-800 text-xs">Audit & Action History</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Append-only audit events with user actor, timestamps, and reason documentation.
            </p>
          </div>
          <a
            href="/api/audit/export-audit"
            download
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Audit Trail (CSV)</span>
          </a>
        </div>
      </div>

      {/* Conflicts and Local Modifications Review Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Tasks Requiring Reconciliation Review ({conflictTasks.length} Conflicts, {modifiedTasks.length} Locally Modified)
            </h3>
            <p className="text-xs text-slate-500">
              Tasks altered since original file import or flagged during subsequent batch uploads.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {modifiedTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No tasks have been modified from their original import snapshot.
            </div>
          ) : (
            modifiedTasks.map((t) => (
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
                    <div className="text-xs font-semibold text-slate-800 flex items-center space-x-2">
                      <span>{t.description}</span>
                      {t.hasConflict && (
                        <span className="bg-red-100 text-red-800 border border-red-300 px-1.5 py-0.2 rounded text-[10px] font-bold">
                          Conflict Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Working Status: <strong className="text-slate-800">{t.status}</strong> | Version: v{t.version}
                      {t.conflictDetails && (
                        <span className="text-red-700 ml-2">
                          (Source import specified: {t.conflictDetails.sourceStatus})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-blue-600 font-medium">Review &rarr;</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
