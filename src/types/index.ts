/**
 * Core Domain Types and Interfaces for CCS To Do AI Manager
 * File-Driven Operations MVP for Oracle Utilities CCS To Do Task Queues
 */

export type TaskStatus = 'Open' | 'Assigned' | 'In Progress' | 'On Hold' | 'Completed';

export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type UserRole = 'Operator' | 'Supervisor';

export interface User {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  teamId: string;
  teamName: string;
  isActive: boolean;
  createdAt: string;
}

export interface TaskConflictDetails {
  sourceStatus: string;
  sourceSubstatus: string;
  sourcePriority: string;
  localStatus: string;
  localSubstatus: string;
  localPriority: string;
  sourceUpdated: string;
  diffFields: string[];
}

export interface Task {
  taskId: string;
  sourceSystem: string;
  taskType: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  substatus: string;
  assigneeId: string | null;
  assigneeName: string | null;
  teamId: string;
  teamName: string;
  relatedObjectType: string;
  relatedObjectId: string;
  createdAt: string;
  updatedAt: string;
  dueAt: string | null;
  completionNote?: string | null;
  holdReason?: string | null;
  sourceValues: Record<string, any>;
  currentLocalValues: Record<string, any>;
  lastImportedAt: string;
  lastImportBatchId: string;
  isLocallyModified: boolean;
  hasConflict?: boolean;
  conflictDetails?: TaskConflictDetails | null;
  version: number;
}

export interface TaskAuditLog {
  eventId: string;
  taskId: string;
  actorId: string;
  actorName: string;
  action: TaskLifecycleAction | 'FILE_IMPORT' | 'RESOLVE_CONFLICT' | 'REASSIGN' | 'METADATA_UPDATE';
  previousStatus: string;
  previousSubstatus: string;
  newStatus: string;
  newSubstatus: string;
  reason: string;
  timestamp: string;
  result: 'SUCCESS' | 'FAILED';
  correlationId: string;
  source: 'USER_UI' | 'FILE_IMPORT' | 'AI_CONFIRMED';
  importBatchId?: string;
  details?: Record<string, any>;
}

export interface ImportBatch {
  batchId: string;
  filename: string;
  importedBy: string;
  importedAt: string;
  sourceMetadata: Record<string, any>;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  warningCount: number;
  newTasksCount: number;
  unchangedTasksCount: number;
  conflictsCount: number;
  result: 'Success' | 'Partial' | 'Rejected';
  rejectedReport: Array<{
    rowNumber: number;
    taskId?: string;
    reason: string;
    rawRow: Record<string, any>;
  }>;
  warnings: Array<{
    rowNumber: number;
    taskId?: string;
    warning: string;
  }>;
}

export type TaskLifecycleAction =
  | 'START_PROGRESS'
  | 'PUT_ON_HOLD'
  | 'RESUME_PROGRESS'
  | 'ASSIGN'
  | 'REASSIGN'
  | 'COMPLETE';

export interface AiActionRequest {
  requestId: string;
  userId: string;
  userName: string;
  taskId: string;
  proposedAction: TaskLifecycleAction;
  parameters: {
    note?: string;
    reason?: string;
    assigneeId?: string;
    assigneeName?: string;
  };
  taskVersion: number;
  currentStatus: TaskStatus;
  currentSubstatus: string;
  resultingStatus: TaskStatus;
  resultingSubstatus: string;
  confirmationState: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  executionState: 'UNEXECUTED' | 'EXECUTING' | 'SUCCESS' | 'REJECTED' | 'CONFLICT' | 'FAILED';
  resultMessage?: string;
  createdAt: string;
  expiresAt: string;
  executedAt?: string;
}

export interface ColumnMapping {
  taskId: string;
  taskType: string;
  description: string;
  status: string;
  substatus?: string;
  priority: string;
  assigneeName?: string;
  teamName?: string;
  createdAt?: string;
  dueAt?: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
}

export interface DashboardMetrics {
  totalImportedTasks: number;
  openTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  onHoldTasks: number;
  completedTasks: number;
  overdueTasks: number;
  criticalAndHighActiveTasks: number;
  tasksByTeam: Record<string, number>;
  tasksByPriority: Record<string, number>;
  tasksByStatus: Record<string, number>;
  recentlyUpdatedTasks: Task[];
  myActiveTasks: Task[];
}

export interface ValidationSummary {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  warningCount: number;
  newTasksCount: number;
  unchangedTasksCount: number;
  conflictsCount: number;
  acceptedTasks: Task[];
  rejectedReport: Array<{
    rowNumber: number;
    taskId?: string;
    reason: string;
    rawRow: Record<string, any>;
  }>;
  warnings: Array<{
    rowNumber: number;
    taskId?: string;
    warning: string;
  }>;
}

export interface TaskFilter {
  search?: string;
  status?: string;
  substatus?: string;
  priority?: string;
  taskType?: string;
  assigneeId?: string;
  teamId?: string;
  dueFilter?: 'all' | 'overdue' | 'today' | 'upcoming';
  importBatchId?: string;
  hasConflict?: boolean;
  isLocallyModified?: boolean;
}
