import { Task, TaskLifecycleAction, TaskStatus, User, UserRole } from '../types/index.ts';

export interface TransitionValidationResult {
  valid: boolean;
  targetStatus: TaskStatus;
  targetSubstatus: string;
  errorMessage?: string;
  requiresReason?: boolean;
  requiresNote?: boolean;
}

export class TaskLifecycleEngine {
  /**
   * Evaluates if a proposed lifecycle transition is allowed for a given task, user, and action.
   */
  public static validateTransition(
    task: Task,
    action: TaskLifecycleAction,
    user: User,
    options?: {
      reason?: string;
      note?: string;
      assigneeId?: string;
      assigneeName?: string;
      expectedVersion?: number;
    }
  ): TransitionValidationResult {
    // 1. Version conflict check
    if (options?.expectedVersion !== undefined && options.expectedVersion !== task.version) {
      return {
        valid: false,
        targetStatus: task.status,
        targetSubstatus: task.substatus,
        errorMessage: `Concurrency Conflict: Task has been modified by another process. Current version is v${task.version}, but action was prepared against v${options.expectedVersion}. Please refresh.`,
      };
    }

    // 2. Permission checks based on user role
    const isSupervisor = user.role === 'Supervisor';
    const isOperator = user.role === 'Operator';

    // Operators can only work on tasks assigned to them or their team (unless unassigned)
    if (isOperator && task.assigneeId && task.assigneeId !== user.userId && action !== 'ASSIGN') {
      return {
        valid: false,
        targetStatus: task.status,
        targetSubstatus: task.substatus,
        errorMessage: `Unauthorized: Task is assigned to another operator (${task.assigneeName || task.assigneeId}). Only supervisors or the assigned operator can update this task.`,
      };
    }

    switch (action) {
      case 'START_PROGRESS': {
        // Can transition from Assigned or Open to In Progress
        if (task.status !== 'Assigned' && task.status !== 'Open') {
          return {
            valid: false,
            targetStatus: task.status,
            targetSubstatus: task.substatus,
            errorMessage: `Cannot Start Progress from status "${task.status}". Task must be Open or Assigned.`,
          };
        }
        return {
          valid: true,
          targetStatus: 'In Progress',
          targetSubstatus: 'In Progress',
        };
      }

      case 'PUT_ON_HOLD': {
        // Can only put On Hold if currently In Progress or Assigned
        if (task.status !== 'In Progress' && task.status !== 'Assigned') {
          return {
            valid: false,
            targetStatus: task.status,
            targetSubstatus: task.substatus,
            errorMessage: `Cannot put task On Hold from status "${task.status}". Task must be In Progress or Assigned.`,
          };
        }
        if (!options?.reason || options.reason.trim().length < 5) {
          return {
            valid: false,
            targetStatus: 'On Hold',
            targetSubstatus: 'Awaiting External Input',
            errorMessage: `Hold Reason is required (minimum 5 characters) to place task on hold.`,
            requiresReason: true,
          };
        }
        return {
          valid: true,
          targetStatus: 'On Hold',
          targetSubstatus: options.reason.includes('meter')
            ? 'Awaiting Meter Reading'
            : options.reason.includes('customer')
            ? 'Awaiting Customer Response'
            : 'Suspended - Pending Info',
        };
      }

      case 'RESUME_PROGRESS': {
        // Can resume from On Hold
        if (task.status !== 'On Hold') {
          return {
            valid: false,
            targetStatus: task.status,
            targetSubstatus: task.substatus,
            errorMessage: `Cannot Resume Progress from status "${task.status}". Task must be On Hold.`,
          };
        }
        return {
          valid: true,
          targetStatus: 'In Progress',
          targetSubstatus: 'In Progress',
        };
      }

      case 'ASSIGN': {
        // Only Supervisor or unassigned self-assign
        if (!isSupervisor && task.assigneeId !== null && task.assigneeId !== user.userId) {
          return {
            valid: false,
            targetStatus: task.status,
            targetSubstatus: task.substatus,
            errorMessage: `Only supervisors can assign tasks assigned to other operators.`,
          };
        }
        if (task.status === 'Completed') {
          return {
            valid: false,
            targetStatus: task.status,
            targetSubstatus: task.substatus,
            errorMessage: `Cannot assign a Completed task.`,
          };
        }
        const targetAssignee = options?.assigneeName || user.displayName;
        return {
          valid: true,
          targetStatus: task.status === 'Open' ? 'Assigned' : task.status,
          targetSubstatus: `Assigned to ${targetAssignee}`,
        };
      }

      case 'REASSIGN': {
        if (!isSupervisor) {
          return {
            valid: false,
            targetStatus: task.status,
            targetSubstatus: task.substatus,
            errorMessage: `Permission Denied: Only supervisors have permission to reassign tasks.`,
          };
        }
        if (task.status === 'Completed') {
          return {
            valid: false,
            targetStatus: task.status,
            targetSubstatus: task.substatus,
            errorMessage: `Cannot reassign a Completed task.`,
          };
        }
        if (!options?.assigneeId && !options?.assigneeName) {
          return {
            valid: false,
            targetStatus: task.status,
            targetSubstatus: task.substatus,
            errorMessage: `Reassign target operator is required.`,
          };
        }
        return {
          valid: true,
          targetStatus: task.status === 'Open' ? 'Assigned' : task.status,
          targetSubstatus: `Reassigned to ${options.assigneeName || options.assigneeId}`,
        };
      }

      case 'COMPLETE': {
        // Can complete from In Progress or Assigned (or Open if supervisor)
        if (task.status === 'Completed') {
          return {
            valid: false,
            targetStatus: task.status,
            targetSubstatus: task.substatus,
            errorMessage: `Task is already Completed.`,
          };
        }
        if (task.status === 'On Hold') {
          return {
            valid: false,
            targetStatus: task.status,
            targetSubstatus: task.substatus,
            errorMessage: `Cannot complete task while On Hold. Resume progress first.`,
          };
        }
        if (task.status === 'Open' && !isSupervisor) {
          return {
            valid: false,
            targetStatus: task.status,
            targetSubstatus: task.substatus,
            errorMessage: `Operators cannot complete Open unassigned tasks directly. Start progress first.`,
          };
        }
        // Completion note requirement
        const note = options?.note?.trim() || '';
        const taskTypesRequiringNote = ['TD-BILLERR', 'TD-DISCNX', 'TD-HIGHCON', 'TD-NEWSRV'];
        const isNoteRequired = taskTypesRequiringNote.includes(task.taskType) || isSupervisor;
        if (isNoteRequired && note.length < 5) {
          return {
            valid: false,
            targetStatus: 'Completed',
            targetSubstatus: 'Resolved',
            errorMessage: `Completion Note is required (minimum 5 characters) for ${task.taskType} tasks.`,
            requiresNote: true,
          };
        }

        return {
          valid: true,
          targetStatus: 'Completed',
          targetSubstatus: 'Resolved',
        };
      }

      default:
        return {
          valid: false,
          targetStatus: task.status,
          targetSubstatus: task.substatus,
          errorMessage: `Unknown lifecycle action: ${action}`,
        };
    }
  }
}
