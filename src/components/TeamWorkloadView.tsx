import React, { useEffect, useState } from 'react';
import { Users, CheckCircle, AlertTriangle, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { Task, User } from '../types/index.ts';
import { api } from '../services/api.ts';

interface TeamWorkloadViewProps {
  currentUser: User;
  onSelectTask: (task: Task) => void;
}

export const TeamWorkloadView: React.FC<TeamWorkloadViewProps> = ({
  currentUser,
  onSelectTask,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [taskList, userList] = await Promise.all([api.getTasks(), api.getUsers()]);
        setTasks(taskList);
        setUsers(userList);
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <div className="py-20 text-center text-slate-400 text-xs">Loading team workload...</div>;
  }

  // Group tasks by team
  const teams = Array.from(new Set(tasks.map((t) => t.teamName)));

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span>Team Workload & Queue Balancing</span>
        </h2>
        <p className="text-xs text-slate-500">
          Distribution of active To Do tasks across functional operational groups and assigned operators.
        </p>
      </div>

      {/* Operator Cards */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Operator Workload Allocation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => {
            const userTasks = tasks.filter((t) => t.assigneeId === u.userId);
            const activeTasks = userTasks.filter((t) => t.status !== 'Completed');
            const completedTasks = userTasks.filter((t) => t.status === 'Completed');
            const overdue = activeTasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date());

            return (
              <div key={u.userId} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {u.displayName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-xs">{u.displayName}</h4>
                      <span className="text-[10px] text-slate-500">{u.teamName}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'Supervisor'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Active</span>
                    <span className="font-bold text-slate-900">{activeTasks.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 block">Done</span>
                    <span className="font-bold text-emerald-700">{completedTasks.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-600 block">Overdue</span>
                    <span className="font-bold text-red-700">{overdue.length}</span>
                  </div>
                </div>

                {activeTasks.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Top Active:</div>
                    {activeTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.taskId}
                        onClick={() => onSelectTask(t)}
                        className="p-1.5 bg-slate-50 hover:bg-blue-50 rounded text-[11px] cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-mono font-bold text-blue-700">{t.taskId}</span>
                        <span className="truncate max-w-[120px] text-slate-600">{t.description}</span>
                        <span className="text-[9px] px-1 bg-white border rounded">{t.priority}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Queues */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Functional Team Queues
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((teamName) => {
            const teamTasks = tasks.filter((t) => t.teamName === teamName);
            const openTeam = teamTasks.filter((t) => t.status === 'Open');
            const inProgTeam = teamTasks.filter((t) => t.status === 'In Progress');

            return (
              <div key={teamName} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs">{teamName}</h4>
                  <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {teamTasks.length} tasks
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-2 py-1 bg-slate-100 rounded text-slate-700">
                    Unassigned: <strong>{openTeam.length}</strong>
                  </span>
                  <span className="px-2 py-1 bg-amber-50 rounded text-amber-800 border border-amber-200">
                    In Progress: <strong>{inProgTeam.length}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
