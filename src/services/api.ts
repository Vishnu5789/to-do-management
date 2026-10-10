import {
  ColumnMapping,
  DashboardMetrics,
  ImportBatch,
  Task,
  TaskAuditLog,
  TaskFilter,
  TaskLifecycleAction,
  User,
  ValidationSummary,
} from '../types/index.ts';

class ApiClient {
  private currentUserId: string = 'usr_sup_1'; // Default supervisor

  public setActingUser(userId: string) {
    this.currentUserId = userId;
  }

  public getActingUserId(): string {
    return this.currentUserId;
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUserId,
    };
  }

  public async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users', { headers: this.headers() });
    const data = await res.json();
    return data.users || [];
  }

  public async getMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`/api/metrics?userId=${this.currentUserId}`, { headers: this.headers() });
    const data = await res.json();
    return data.metrics;
  }

  public async getTasks(filter?: TaskFilter): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filter) {
      if (filter.search) params.append('search', filter.search);
      if (filter.status && filter.status !== 'all') params.append('status', filter.status);
      if (filter.substatus && filter.substatus !== 'all') params.append('substatus', filter.substatus);
      if (filter.priority && filter.priority !== 'all') params.append('priority', filter.priority);
      if (filter.taskType && filter.taskType !== 'all') params.append('taskType', filter.taskType);
      if (filter.assigneeId && filter.assigneeId !== 'all') params.append('assigneeId', filter.assigneeId);
      if (filter.teamId && filter.teamId !== 'all') params.append('teamId', filter.teamId);
      if (filter.dueFilter && filter.dueFilter !== 'all') params.append('dueFilter', filter.dueFilter);
      if (filter.hasConflict !== undefined) params.append('hasConflict', String(filter.hasConflict));
      if (filter.isLocallyModified !== undefined) params.append('isLocallyModified', String(filter.isLocallyModified));
      if (filter.importBatchId && filter.importBatchId !== 'all') params.append('importBatchId', filter.importBatchId);
    }
    const res = await fetch(`/api/tasks?${params.toString()}`, { headers: this.headers() });
    const data = await res.json();
    return data.tasks || [];
  }

  public async getTaskById(taskId: string): Promise<{ task: Task; auditLogs: TaskAuditLog[] }> {
    const res = await fetch(`/api/tasks/${taskId}`, { headers: this.headers() });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return { task: data.task, auditLogs: data.auditLogs || [] };
  }

  public async transitionTask(
    taskId: string,
    action: TaskLifecycleAction,
    options?: {
      reason?: string;
      note?: string;
      assigneeId?: string;
      assigneeName?: string;
      expectedVersion?: number;
    }
  ): Promise<{ task: Task; auditLog: TaskAuditLog }> {
    const res = await fetch(`/api/tasks/${taskId}/transition`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ action, ...options }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to update task.');
    }
    return { task: data.task, auditLog: data.auditLog };
  }

  public async resolveConflict(
    taskId: string,
    resolution: 'KEEP_LOCAL' | 'ACCEPT_SOURCE' | 'MERGE',
    notes?: string
  ): Promise<Task> {
    const res = await fetch(`/api/tasks/${taskId}/resolve-conflict`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ resolution, notes }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.task;
  }

  public async resetSampleData(): Promise<number> {
    const res = await fetch('/api/tasks/reset-sample', {
      method: 'POST',
      headers: this.headers(),
    });
    const data = await res.json();
    return data.count;
  }

  public async parseImportFile(fileBase64: string, fileName: string) {
    const res = await fetch('/api/import/parse', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ fileBase64, fileName }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data;
  }

  public async validateImport(rawRows: any[], mapping: ColumnMapping, fileName: string): Promise<{ batchId: string; summary: ValidationSummary }> {
    const res = await fetch('/api/import/validate', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ rawRows, mapping, fileName }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return { batchId: data.batchId, summary: data.summary };
  }

  public async commitImport(batchId: string, fileName: string, summary: ValidationSummary, sourceMetadata?: any): Promise<ImportBatch> {
    const res = await fetch('/api/import/commit', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ batchId, fileName, summary, sourceMetadata }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.batch;
  }

  public async getImportBatches(): Promise<ImportBatch[]> {
    const res = await fetch('/api/import/batches', { headers: this.headers() });
    const data = await res.json();
    return data.batches || [];
  }

  public async getAuditLogs(taskId?: string): Promise<TaskAuditLog[]> {
    const url = taskId ? `/api/audit/logs?taskId=${taskId}` : '/api/audit/logs';
    const res = await fetch(url, { headers: this.headers() });
    const data = await res.json();
    return data.logs || [];
  }

  public async sendAiChat(message: string, conversationHistory: any[]): Promise<{ text: string; proposedAction?: any; recommendedTasks?: any[] }> {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ message, conversationHistory }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data;
  }

  public async executeAiAction(requestId: string): Promise<{ task: Task; message: string }> {
    const res = await fetch('/api/ai/execute-action', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ requestId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Execution failed.');
    return { task: data.task, message: data.message };
  }
}

export const api = new ApiClient();
