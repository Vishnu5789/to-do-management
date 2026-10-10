import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, X, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api.ts';

interface AiActionConfirmModalProps {
  actionRequest: {
    requestId: string;
    taskId: string;
    description: string;
    currentStatus: string;
    currentSubstatus: string;
    proposedAction: string;
    resultingStatus: string;
    resultingSubstatus: string;
    reason: string;
    note?: string;
    boundVersion: number;
    dataMode: string;
  };
  onClose: () => void;
  onSuccess: (task: any, message: string) => void;
}

export const AiActionConfirmModal: React.FC<AiActionConfirmModalProps> = ({
  actionRequest,
  onClose,
  onSuccess,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsExecuting(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const res = await api.executeAiAction(actionRequest.requestId);
      setIsExecuting(false);
      onSuccess(res.task, res.message);
    } catch (err: any) {
      setIsExecuting(false);
      // Backend returned rejected, conflict, or failed
      const msg = err.message || 'Operation failed.';
      if (msg.includes('Conflict') || msg.includes('Version mismatch')) {
        setErrorStatus('CONFLICT');
      } else if (msg.includes('Permission') || msg.includes('expired') || msg.includes('validation')) {
        setErrorStatus('REJECTED');
      } else {
        setErrorStatus('FAILED');
      }
      setErrorMessage(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/30 rounded-lg text-blue-400 border border-blue-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-100">Review Proposed AI Task Action</h3>
              <p className="text-xs text-slate-400">Explicit confirmation required before mutating local workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* File mode disclaimer */}
          <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold uppercase tracking-wider text-[11px] block">
                File Mode — Not Connected to Live CCS
              </span>
              This action will update your local task repository only. It will not write or sync to Oracle Utilities CCS.
            </div>
          </div>

          {/* Action Diff Grid */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg divide-y divide-slate-200 text-sm">
            <div className="p-3.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Task ID:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                {actionRequest.taskId}
              </span>
            </div>

            <div className="p-3.5 flex justify-between items-start gap-4">
              <span className="text-slate-500 font-medium shrink-0">Description:</span>
              <span className="text-right text-slate-800 line-clamp-2 text-xs">
                {actionRequest.description || 'No description available'}
              </span>
            </div>

            <div className="p-3.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Requested Action:</span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {actionRequest.proposedAction.replace(/_/g, ' ')}
              </span>
            </div>

            {/* State Transition Diff */}
            <div className="p-3.5 bg-blue-50/50">
              <div className="text-xs text-slate-500 font-medium mb-2">State Transition:</div>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="bg-white p-2 rounded border border-slate-200 text-center flex-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Current State</div>
                  <div className="font-semibold text-slate-800">{actionRequest.currentStatus}</div>
                  <div className="text-[11px] text-slate-500">{actionRequest.currentSubstatus}</div>
                </div>

                <div className="px-3 text-blue-600">
                  <ArrowRight className="w-5 h-5" />
                </div>

                <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-center flex-1">
                  <div className="text-[10px] text-emerald-600 uppercase font-semibold">Expected State</div>
                  <div className="font-semibold text-emerald-800">{actionRequest.resultingStatus}</div>
                  <div className="text-[11px] text-emerald-600">{actionRequest.resultingSubstatus}</div>
                </div>
              </div>
            </div>

            <div className="p-3.5">
              <div className="text-slate-500 font-medium text-xs mb-1">Reason / Notes:</div>
              <p className="text-slate-800 text-xs italic bg-white p-2 rounded border border-slate-200">
                "{actionRequest.reason}"
              </p>
            </div>

            <div className="p-3 flex justify-between items-center text-xs text-slate-500">
              <span>Token Bound Version:</span>
              <span className="font-mono">v{actionRequest.boundVersion}</span>
            </div>
          </div>

          {/* Error / Conflict Banner */}
          {errorStatus && (
            <div
              className={`p-3.5 rounded-lg border text-xs ${
                errorStatus === 'CONFLICT'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <div className="font-bold flex items-center space-x-1 mb-1">
                <ShieldAlert className="w-4 h-4" />
                <span>
                  {errorStatus === 'CONFLICT'
                    ? 'Conflict Detected: Task Version Changed'
                    : errorStatus === 'REJECTED'
                    ? 'Action Rejected: Business Validation Failed'
                    : 'Operation Failed'}
                </span>
              </div>
              <p>{errorMessage}</p>
              <p className="mt-2 text-[11px] font-medium text-slate-600">
                Please refresh the task queue and inspect the latest record before re-proposing.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium text-sm transition"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={isExecuting}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-xs transition flex items-center space-x-2 disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying & Executing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Confirm Action</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
