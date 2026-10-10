import { Router, Request, Response } from 'express';
import { taskRepository } from '../db.ts';
import { TaskLifecycleEngine } from '../../src/services/lifecycle.ts';
import { TaskFilter, User } from '../../src/types/index.ts';

const router = Router();

// Middleware to resolve acting user (from headers or default)
export async function getActingUser(req: Request): Promise<User> {
  const userId = req.headers['x-user-id'] as string;
  const users = await taskRepository.getUsers();
  if (userId) {
    const found = users.find((u) => u.userId === userId);
    if (found) return found;
  }
  // Default to Elena Rostova (Operator) or Marcus Vance (Supervisor)
  return users[0]; // Marcus Vance (Supervisor)
}

// GET /api/tasks
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: TaskFilter = {
      search: req.query.search as string,
      status: req.query.status as string,
      substatus: req.query.substatus as string,
      priority: req.query.priority as string,
      taskType: req.query.taskType as string,
      assigneeId: req.query.assigneeId as string,
      teamId: req.query.teamId as string,
      dueFilter: req.query.dueFilter as any,
      importBatchId: req.query.importBatchId as string,
      hasConflict: req.query.hasConflict !== undefined ? req.query.hasConflict === 'true' : undefined,
      isLocallyModified: req.query.isLocallyModified !== undefined ? req.query.isLocallyModified === 'true' : undefined,
    };

    const tasks = await taskRepository.getTasks(filter);
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await taskRepository.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: `Task ${req.params.id} not found.` });
    }
    const auditLogs = await taskRepository.getAuditLogs(req.params.id);
    res.json({ success: true, task, auditLogs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:id/transition
router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const actor = await getActingUser(req);
    const { action, reason, note, assigneeId, assigneeName, expectedVersion } = req.body;

    const task = await taskRepository.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: `Task ${req.params.id} not found.` });
    }

    // 1. Central server-side transition validator
    const validation = TaskLifecycleEngine.validateTransition(task, action, actor, {
      reason,
      note,
      assigneeId,
      assigneeName,
      expectedVersion,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errorMessage,
        requiresReason: validation.requiresReason,
        requiresNote: validation.requiresNote,
      });
    }

    // 2. Prepare atomic update
    const updates: any = {
      status: validation.targetStatus,
      substatus: validation.targetSubstatus,
    };

    if (action === 'PUT_ON_HOLD') {
      updates.holdReason = reason;
    }
    if (action === 'COMPLETE') {
      updates.completionNote = note;
    }
    if (action === 'ASSIGN' || action === 'REASSIGN') {
      if (assigneeId) updates.assigneeId = assigneeId;
      if (assigneeName) updates.assigneeName = assigneeName;
    }

    // 3. Commit state change and audit log atomically
    const { task: updatedTask, auditLog } = await taskRepository.updateTaskWithAudit(
      task.taskId,
      task.version,
      () => updates,
      {
        taskId: task.taskId,
        actorId: actor.userId,
        actorName: actor.displayName,
        action,
        previousStatus: task.status,
        previousSubstatus: task.substatus,
        newStatus: validation.targetStatus,
        newSubstatus: validation.targetSubstatus,
        reason: reason || note || `Transition to ${validation.targetStatus}`,
        result: 'SUCCESS',
        correlationId: 'API_' + Date.now(),
        source: 'USER_UI',
      }
    );

    res.json({
      success: true,
      message: `Task ${task.taskId} updated to ${validation.targetStatus}.`,
      task: updatedTask,
      auditLog,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:id/resolve-conflict
router.post('/:id/resolve-conflict', async (req: Request, res: Response) => {
  try {
    const actor = await getActingUser(req);
    if (actor.role !== 'Supervisor') {
      return res.status(403).json({
        success: false,
        error: 'Permission Denied: Only supervisors can review and resolve import conflicts.',
      });
    }

    const { resolution, notes } = req.body; // 'KEEP_LOCAL' | 'ACCEPT_SOURCE' | 'MERGE'
    if (!['KEEP_LOCAL', 'ACCEPT_SOURCE', 'MERGE'].includes(resolution)) {
      return res.status(400).json({ success: false, error: 'Invalid resolution policy.' });
    }

    const resolved = await taskRepository.resolveConflict(req.params.id, resolution, actor, notes);
    res.json({
      success: true,
      message: `Conflict for ${req.params.id} resolved using ${resolution}.`,
      task: resolved,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/reset-sample
router.post('/reset-sample', async (_req: Request, res: Response) => {
  try {
    const count = await taskRepository.resetToSampleData();
    res.json({ success: true, count, message: `Workspace reset to ${count} sample tasks.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
