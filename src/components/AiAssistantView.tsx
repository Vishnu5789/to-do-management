import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { User } from '../types/index.ts';
import { api } from '../services/api.ts';
import { AiActionConfirmModal } from './AiActionConfirmModal.tsx';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  proposedAction?: any;
  recommendedTasks?: any[];
}

interface AiAssistantViewProps {
  currentUser: User;
  onNavigateToTask?: (taskId: string) => void;
  onTaskUpdated?: () => void;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  currentUser,
  onNavigateToTask,
  onTaskUpdated,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${currentUser.displayName}. I am your CCS To Do AI Assistant operating in **File Mode**.\n\nI can search your imported tasks, explain specific exception details (like **TD10025**), calculate workload metrics, recommend priorities, or prepare state transitions. Every proposed state change requires your explicit confirmation before execution.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeActionModal, setActiveActionModal] = useState<any | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const quickPrompts = [
    'Show high-priority tasks that are still open.',
    'Recommend the five tasks we should prioritize.',
    'Explain task TD10025 using its available details.',
    'Move TD10025 to In Progress.',
    'Put TD10002 on hold because we are waiting for a meter reading.',
    'Complete TD10001 with the note: billing validation completed.',
    'Summarize workload by assignee.',
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: Message = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text,
      }));

      const res = await api.sendAiChat(query, history);

      const assistantMsg: Message = {
        id: 'ai_' + Date.now(),
        sender: 'assistant',
        text: res.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedAction: res.proposedAction,
        recommendedTasks: res.recommendedTasks,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);

      // If action was proposed, also allow clicking directly
      if (res.proposedAction) {
        setActiveActionModal(res.proposedAction);
      }
    } catch (err: any) {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'assistant',
          text: `Error processing request: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const handleActionSuccess = (task: any, message: string) => {
    setActiveActionModal(null);
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 6000);

    // Append confirmation to chat
    setMessages((prev) => [
      ...prev,
      {
        id: 'conf_' + Date.now(),
        sender: 'assistant',
        text: `**Action Confirmed & Executed!**\nTask **${task.taskId}** has transitioned to **${task.status}** (${task.substatus}). Updated to version **v${task.version}** and committed to append-only audit history.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (onTaskUpdated) onTaskUpdated();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-100">CCS To Do AI Assistant</h2>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
                Server-Side Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Human-in-the-loop task operations with grounded factual retrieval
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-lg">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>File Mode — Local Actions Only</span>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-200 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-2xl px-5 py-3.5 text-xs sm:text-sm shadow-xs ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none space-y-3'
              }`}
            >
              <div className="whitespace-pre-line leading-relaxed font-sans">{m.text}</div>

              {/* Structured Action Proposal Card */}
              {m.proposedAction && (
                <div className="mt-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-blue-900 font-semibold">
                    <span className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Proposed Action Requires Confirmation</span>
                    </span>
                    <span className="font-mono text-[10px] bg-blue-200 px-2 py-0.5 rounded text-blue-800">
                      v{m.proposedAction.boundVersion}
                    </span>
                  </div>

                  <div className="text-slate-700">
                    <div>
                      Task: <strong className="font-mono">{m.proposedAction.taskId}</strong>
                    </div>
                    <div>
                      Action: <strong>{m.proposedAction.proposedAction}</strong> &rarr; Target State:{' '}
                      <strong className="text-blue-700">{m.proposedAction.resultingStatus}</strong>
                    </div>
                    {m.proposedAction.reason && (
                      <div className="italic text-slate-500 mt-1">"{m.proposedAction.reason}"</div>
                    )}
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => setActiveActionModal(m.proposedAction)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition"
                    >
                      <span>Review & Confirm Action Dialog</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Recommended Priorities List */}
              {m.recommendedTasks && m.recommendedTasks.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Recommended Tasks:
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {m.recommendedTasks.map((rec) => (
                      <div
                        key={rec.taskId}
                        onClick={() => onNavigateToTask && onNavigateToTask(rec.taskId)}
                        className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg cursor-pointer flex items-center justify-between text-xs transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-blue-700">{rec.taskId}</span>
                          <span className="text-slate-700 font-medium truncate max-w-xs">{rec.description}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-800 rounded font-semibold">
                          {rec.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`text-[10px] text-right mt-1 ${
                  m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                }`}
              >
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 text-xs text-slate-500 flex items-center space-x-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Querying local workspace records with Gemini...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts footer */}
      <div className="bg-slate-100/70 border-t border-slate-200 px-6 py-2.5 flex items-center space-x-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Quick Prompts:</span>
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="whitespace-nowrap px-3 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 text-[11px] rounded-full transition shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input box */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about tasks, priorities, or request a state transition (e.g., 'Move TD10025 to In Progress')..."
            className="flex-1 text-xs sm:text-sm px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      {/* Confirmation Dialog */}
      {activeActionModal && (
        <AiActionConfirmModal
          actionRequest={activeActionModal}
          onClose={() => setActiveActionModal(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
};
