import { Router, Request, Response } from 'express';
import { taskRepository } from '../db.ts';

const router = Router();

router.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await taskRepository.getUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const currentUserId = req.query.userId as string;
    const tasks = await taskRepository.getTasks();
    const now = new Date();

    const metrics = {
      totalImportedTasks: tasks.length,
      openTasks: tasks.filter((t) => t.status === 'Open').length,
      assignedTasks: tasks.filter((t) => t.status === 'Assigned').length,
      inProgressTasks: tasks.filter((t) => t.status === 'In Progress').length,
      onHoldTasks: tasks.filter((t) => t.status === 'On Hold').length,
      completedTasks: tasks.filter((t) => t.status === 'Completed').length,
      overdueTasks: tasks.filter((t) => t.dueAt && new Date(t.dueAt) < now && t.status !== 'Completed').length,
      criticalAndHighActiveTasks: tasks.filter(
        (t) => (t.priority === 'Critical' || t.priority === 'High') && t.status !== 'Completed'
      ).length,
      conflictsCount: tasks.filter((t) => t.hasConflict).length,
      tasksByTeam: {} as Record<string, number>,
      tasksByPriority: {} as Record<string, number>,
      tasksByStatus: {} as Record<string, number>,
      recentlyUpdatedTasks: [...tasks]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6),
      myActiveTasks: currentUserId
        ? tasks.filter((t) => t.assigneeId === currentUserId && t.status !== 'Completed')
        : [],
    };

    for (const t of tasks) {
      metrics.tasksByTeam[t.teamName] = (metrics.tasksByTeam[t.teamName] || 0) + 1;
      metrics.tasksByPriority[t.priority] = (metrics.tasksByPriority[t.priority] || 0) + 1;
      metrics.tasksByStatus[t.status] = (metrics.tasksByStatus[t.status] || 0) + 1;
    }

    res.json({ success: true, metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
