import {
  AiActionRequest,
  ImportBatch,
  Task,
  TaskAuditLog,
  TaskFilter,
  User,
} from '../types/index.ts';

export interface TaskRepository {
  getTasks(filter?: TaskFilter): Promise<Task[]>;
  getTaskById(taskId: string): Promise<Task | null>;
  saveTask(task: Task): Promise<Task>;
  updateTaskWithAudit(
    taskId: string,
    expectedVersion: number,
    updater: (task: Task) => Partial<Task>,
    auditData: Omit<TaskAuditLog, 'eventId' | 'timestamp'>
  ): Promise<{ task: Task; auditLog: TaskAuditLog }>;
  saveImportBatch(
    batch: ImportBatch,
    tasksToSave: Task[],
    auditLogs: TaskAuditLog[]
  ): Promise<void>;
  getImportBatches(): Promise<ImportBatch[]>;
  getAuditLogs(taskId?: string): Promise<TaskAuditLog[]>;
  getUsers(): Promise<User[]>;
  getUserById(userId: string): Promise<User | null>;
  getAiActionRequest(requestId: string): Promise<AiActionRequest | null>;
  saveAiActionRequest(request: AiActionRequest): Promise<void>;
  updateAiActionRequest(
    requestId: string,
    updates: Partial<AiActionRequest>
  ): Promise<AiActionRequest>;
  resolveConflict(
    taskId: string,
    resolution: 'KEEP_LOCAL' | 'ACCEPT_SOURCE' | 'MERGE',
    actor: User,
    notes?: string
  ): Promise<Task>;
  resetToSampleData(): Promise<number>;
}
