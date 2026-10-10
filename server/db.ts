import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AiActionRequest,
  ImportBatch,
  Task,
  TaskAuditLog,
  TaskFilter,
  User,
} from '../src/types/index.ts';
import { TaskRepository } from '../src/services/repository.ts';
import { generateSeedTasks, SEED_USERS } from './seedData.ts';

interface DataStoreSchema {
  tasks: Task[];
  users: User[];
  importBatches: ImportBatch[];
  auditLogs: TaskAuditLog[];
  aiActionRequests: AiActionRequest[];
}

export class FileModeTaskRepository implements TaskRepository {
  private dataDir: string;
  private filePath: string;
  private state: DataStoreSchema;
  private isLoaded = false;

  constructor(customDataDir?: string) {
    this.dataDir = customDataDir || path.resolve(process.cwd(), 'data');
    this.filePath = path.join(this.dataDir, 'ccs_todo_store.json');
    this.state = {
      tasks: [],
      users: [...SEED_USERS],
      importBatches: [],
      auditLogs: [],
      aiActionRequests: [],
    };
    this.initStore();
  }

  private initStore() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
          this.state = parsed;
          this.isLoaded = true;
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to read persisted store from disk, initializing fresh seed:', err);
    }

    // Seed initially
    this.state.tasks = generateSeedTasks();
    this.state.users = [...SEED_USERS];
    this.state.importBatches = [
      {
        batchId: 'BATCH_INITIAL_SEED_2026',
        filename: 'CCS_ToDo_Initial_Export_Oct2026.csv',
        importedBy: 'Marcus Vance',
        importedAt: '2026-10-01T10:00:00.000Z',
        sourceMetadata: {
          sourceSystem: 'Oracle Utilities CCS v24.2',
          exportFormat: 'CSV',
          environment: 'File Mode - Production Snapshot',
        },
        totalRows: 54,
        acceptedRows: 54,
        rejectedRows: 0,
        duplicateRows: 0,
        warningCount: 2,
        newTasksCount: 54,
        unchangedTasksCount: 0,
        conflictsCount: 1,
        result: 'Success',
        rejectedReport: [],
        warnings: [
          {
            rowNumber: 46,
            taskId: 'TD10045',
            warning: 'Description was blank in original source export.',
          },
        ],
      },
    ];
    this.state.auditLogs = [
      {
        eventId: 'EVT_INIT_001',
        taskId: 'TD10001',
        actorId: 'usr_op_1',
        actorName: 'Elena Rostova',
        action: 'START_PROGRESS',
        previousStatus: 'Assigned',
        previousSubstatus: 'Assigned to Elena Rostova',
        newStatus: 'In Progress',
        newSubstatus: 'Investigating Rate Schedule',
        reason: 'Operator accepted billing exception investigation ticket.',
        timestamp: '2026-10-05T09:12:00.000Z',
        result: 'SUCCESS',
        correlationId: 'CORR_INIT_1',
        source: 'USER_UI',
      },
      {
        eventId: 'EVT_INIT_002',
        taskId: 'TD10002',
        actorId: 'usr_op_2',
        actorName: 'Carlos Mendez',
        action: 'PUT_ON_HOLD',
        previousStatus: 'In Progress',
        previousSubstatus: 'In Progress',
        newStatus: 'On Hold',
        newSubstatus: 'Awaiting Meter Reading',
        reason: 'Awaiting specialized interval meter reading from field crew',
        timestamp: '2026-10-06T14:30:00.000Z',
        result: 'SUCCESS',
        correlationId: 'CORR_INIT_2',
        source: 'USER_UI',
      },
    ];
    this.state.aiActionRequests = [];

    this.persistSync();
    this.isLoaded = true;
  }

  private persistSync() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('CRITICAL: Failed to write persisted store to disk:', err);
    }
  }

  public async getTasks(filter?: TaskFilter): Promise<Task[]> {
    let list = [...this.state.tasks];

    if (!filter) return list;

    if (filter.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.taskId.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.taskType.toLowerCase().includes(q) ||
          (t.assigneeName && t.assigneeName.toLowerCase().includes(q)) ||
          t.relatedObjectId.toLowerCase().includes(q)
      );
    }

    if (filter.status && filter.status !== 'all') {
      list = list.filter((t) => t.status.toLowerCase() === filter.status!.toLowerCase());
    }

    if (filter.substatus && filter.substatus !== 'all') {
      list = list.filter((t) => t.substatus.toLowerCase() === filter.substatus!.toLowerCase());
    }

    if (filter.priority && filter.priority !== 'all') {
      list = list.filter((t) => t.priority.toLowerCase() === filter.priority!.toLowerCase());
    }

    if (filter.taskType && filter.taskType !== 'all') {
      list = list.filter((t) => t.taskType === filter.taskType);
    }

    if (filter.assigneeId && filter.assigneeId !== 'all') {
      list = list.filter((t) => t.assigneeId === filter.assigneeId);
    }

    if (filter.teamId && filter.teamId !== 'all') {
      list = list.filter((t) => t.teamId === filter.teamId);
    }

    if (filter.hasConflict !== undefined) {
      list = list.filter((t) => !!t.hasConflict === filter.hasConflict);
    }

    if (filter.isLocallyModified !== undefined) {
      list = list.filter((t) => !!t.isLocallyModified === filter.isLocallyModified);
    }

    if (filter.importBatchId && filter.importBatchId !== 'all') {
      list = list.filter((t) => t.lastImportBatchId === filter.importBatchId);
    }

    if (filter.dueFilter && filter.dueFilter !== 'all') {
      const now = new Date();
      if (filter.dueFilter === 'overdue') {
        list = list.filter((t) => t.dueAt && new Date(t.dueAt) < now && t.status !== 'Completed');
      } else if (filter.dueFilter === 'today') {
        const todayStr = now.toISOString().slice(0, 10);
        list = list.filter((t) => t.dueAt && t.dueAt.slice(0, 10) === todayStr);
      } else if (filter.dueFilter === 'upcoming') {
        list = list.filter((t) => t.dueAt && new Date(t.dueAt) >= now);
      }
    }

    return list;
  }

  public async getTaskById(taskId: string): Promise<Task | null> {
    const task = this.state.tasks.find((t) => t.taskId === taskId);
    return task ? { ...task } : null;
  }

  public async saveTask(task: Task): Promise<Task> {
    const idx = this.state.tasks.findIndex((t) => t.taskId === task.taskId);
    if (idx >= 0) {
      this.state.tasks[idx] = { ...task };
    } else {
      this.state.tasks.push({ ...task });
    }
    this.persistSync();
    return { ...task };
  }

  public async updateTaskWithAudit(
    taskId: string,
    expectedVersion: number,
    updater: (task: Task) => Partial<Task>,
    auditData: Omit<TaskAuditLog, 'eventId' | 'timestamp'>
  ): Promise<{ task: Task; auditLog: TaskAuditLog }> {
    const idx = this.state.tasks.findIndex((t) => t.taskId === taskId);
    if (idx < 0) {
      throw new Error(`Task with ID "${taskId}" not found.`);
    }

    const current = this.state.tasks[idx];
    if (current.version !== expectedVersion) {
      throw new Error(
        `Optimistic lock failure: Task ${taskId} has version ${current.version}, expected ${expectedVersion}. Refresh required.`
      );
    }

    const updates = updater(current);
    const nowIso = new Date().toISOString();

    const updatedTask: Task = {
      ...current,
      ...updates,
      updatedAt: nowIso,
      version: current.version + 1,
      isLocallyModified: true,
      currentLocalValues: {
        ...current.currentLocalValues,
        status: updates.status || current.status,
        substatus: updates.substatus || current.substatus,
        priority: updates.priority || current.priority,
        assigneeName: updates.assigneeName !== undefined ? updates.assigneeName : current.assigneeName,
      },
    };

    const newAuditLog: TaskAuditLog = {
      ...auditData,
      eventId: 'EVT_' + crypto.randomUUID().slice(0, 8),
      taskId,
      timestamp: nowIso,
    };

    // Atomic application
    this.state.tasks[idx] = updatedTask;
    this.state.auditLogs.unshift(newAuditLog);
    this.persistSync();

    return { task: updatedTask, auditLog: newAuditLog };
  }

  public async saveImportBatch(
    batch: ImportBatch,
    tasksToSave: Task[],
    auditLogs: TaskAuditLog[]
  ): Promise<void> {
    // Add batch
    this.state.importBatches.unshift(batch);

    // Upsert tasks
    for (const incoming of tasksToSave) {
      const idx = this.state.tasks.findIndex((t) => t.taskId === incoming.taskId);
      if (idx >= 0) {
        this.state.tasks[idx] = incoming;
      } else {
        this.state.tasks.unshift(incoming);
      }
    }

    // Add audit logs
    for (const log of auditLogs) {
      this.state.auditLogs.unshift(log);
    }

    this.persistSync();
  }

  public async getImportBatches(): Promise<ImportBatch[]> {
    return [...this.state.importBatches];
  }

  public async getAuditLogs(taskId?: string): Promise<TaskAuditLog[]> {
    if (taskId) {
      return this.state.auditLogs.filter((l) => l.taskId === taskId);
    }
    return [...this.state.auditLogs];
  }

  public async getUsers(): Promise<User[]> {
    return [...this.state.users];
  }

  public async getUserById(userId: string): Promise<User | null> {
    const user = this.state.users.find((u) => u.userId === userId);
    return user ? { ...user } : null;
  }

  public async getAiActionRequest(requestId: string): Promise<AiActionRequest | null> {
    const req = this.state.aiActionRequests.find((r) => r.requestId === requestId);
    return req ? { ...req } : null;
  }

  public async saveAiActionRequest(request: AiActionRequest): Promise<void> {
    this.state.aiActionRequests.unshift(request);
    this.persistSync();
  }

  public async updateAiActionRequest(
    requestId: string,
    updates: Partial<AiActionRequest>
  ): Promise<AiActionRequest> {
    const idx = this.state.aiActionRequests.findIndex((r) => r.requestId === requestId);
    if (idx < 0) {
      throw new Error(`AI Action Request "${requestId}" not found.`);
    }
    this.state.aiActionRequests[idx] = {
      ...this.state.aiActionRequests[idx],
      ...updates,
    };
    this.persistSync();
    return { ...this.state.aiActionRequests[idx] };
  }

  public async resolveConflict(
    taskId: string,
    resolution: 'KEEP_LOCAL' | 'ACCEPT_SOURCE' | 'MERGE',
    actor: User,
    notes?: string
  ): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found.`);
    }
    if (!task.hasConflict || !task.conflictDetails) {
      throw new Error(`Task ${taskId} does not have an active conflict.`);
    }

    let updatedFields: Partial<Task> = {};
    const conflict = task.conflictDetails;

    if (resolution === 'KEEP_LOCAL') {
      updatedFields = {
        hasConflict: false,
        conflictDetails: null,
      };
    } else if (resolution === 'ACCEPT_SOURCE') {
      updatedFields = {
        status: conflict.sourceStatus as any,
        substatus: conflict.sourceSubstatus,
        priority: conflict.sourcePriority as any,
        isLocallyModified: false,
        hasConflict: false,
        conflictDetails: null,
      };
    } else if (resolution === 'MERGE') {
      updatedFields = {
        hasConflict: false,
        conflictDetails: null,
      };
    }

    const { task: savedTask } = await this.updateTaskWithAudit(
      taskId,
      task.version,
      () => updatedFields,
      {
        taskId,
        actorId: actor.userId,
        actorName: actor.displayName,
        action: 'RESOLVE_CONFLICT',
        previousStatus: task.status,
        previousSubstatus: task.substatus,
        newStatus: (updatedFields.status || task.status) as any,
        newSubstatus: (updatedFields.substatus || task.substatus) as any,
        reason: `Supervisor resolved conflict with policy: ${resolution}. ${notes || ''}`,
        result: 'SUCCESS',
        correlationId: 'CONFLICT_RES_' + crypto.randomUUID().slice(0, 6),
        source: 'USER_UI',
      }
    );

    return savedTask;
  }

  public async resetToSampleData(): Promise<number> {
    this.state.tasks = generateSeedTasks();
    this.state.users = [...SEED_USERS];
    this.state.auditLogs = [];
    this.state.aiActionRequests = [];
    this.persistSync();
    return this.state.tasks.length;
  }
}

// Global singleton instance for the server runtime
export const taskRepository = new FileModeTaskRepository();
