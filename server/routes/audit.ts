import { Router, Request, Response } from 'express';
import { taskRepository } from '../db.ts';
import { TaskFileImporter } from '../../src/services/importer.ts';

const router = Router();

// GET /api/audit/logs
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const taskId = req.query.taskId as string;
    const logs = await taskRepository.getAuditLogs(taskId);
    res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper for CSV escaping with formula injection defense
function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = TaskFileImporter.sanitizeFormulaInjection(val);
  // Double-quote escape
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

// GET /api/export/csv - Export current task list with formula injection defense
router.get('/export-tasks', async (_req: Request, res: Response) => {
  try {
    const tasks = await taskRepository.getTasks();

    const headers = [
      'Task ID',
      'Task Type',
      'Description',
      'Status',
      'Substatus',
      'Priority',
      'Assignee',
      'Team',
      'Related Object Type',
      'Related Object ID',
      'Created Date',
      'Due Date',
      'Locally Modified',
      'Has Conflict',
      'Version',
      'Data Mode Disclaimer',
    ];

    const rows = tasks.map((t) => [
      escapeCsvCell(t.taskId),
      escapeCsvCell(t.taskType),
      escapeCsvCell(t.description),
      escapeCsvCell(t.status),
      escapeCsvCell(t.substatus),
      escapeCsvCell(t.priority),
      escapeCsvCell(t.assigneeName || 'Unassigned'),
      escapeCsvCell(t.teamName),
      escapeCsvCell(t.relatedObjectType),
      escapeCsvCell(t.relatedObjectId),
      escapeCsvCell(t.createdAt),
      escapeCsvCell(t.dueAt || ''),
      escapeCsvCell(t.isLocallyModified ? 'YES' : 'NO'),
      escapeCsvCell(t.hasConflict ? 'YES' : 'NO'),
      escapeCsvCell(`v${t.version}`),
      escapeCsvCell('Local File Mode Prototype - Not Connected to Live Oracle CCS'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="CCS_ToDo_LocalWorkspace_Export.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/export/reconciliation - Reconciliation report
router.get('/export-reconciliation', async (_req: Request, res: Response) => {
  try {
    const tasks = await taskRepository.getTasks();

    const headers = [
      'Task ID',
      'Original Imported Status',
      'Current Local Status',
      'Original Imported Priority',
      'Current Local Priority',
      'Is Locally Modified',
      'Has Conflict',
      'Conflict Details',
      'Completion Note',
      'Hold Reason',
      'Last Import Batch',
      'Version',
      'Reconciliation State',
    ];

    const rows = tasks.map((t) => {
      const origStatus = t.sourceValues?.Status || t.sourceValues?.['To Do Status'] || 'Original ' + t.status;
      const origPrio = t.sourceValues?.Priority || t.priority;
      const recState = t.hasConflict
        ? 'UNRESOLVED CONFLICT'
        : t.isLocallyModified
        ? 'LOCALLY MODIFIED'
        : 'SYNCHRONIZED';

      const conflictDesc = t.conflictDetails
        ? `Source: ${t.conflictDetails.sourceStatus} vs Local: ${t.conflictDetails.localStatus} (Diff: ${t.conflictDetails.diffFields.join(', ')})`
        : 'None';

      return [
        escapeCsvCell(t.taskId),
        escapeCsvCell(origStatus),
        escapeCsvCell(t.status),
        escapeCsvCell(origPrio),
        escapeCsvCell(t.priority),
        escapeCsvCell(t.isLocallyModified ? 'YES' : 'NO'),
        escapeCsvCell(t.hasConflict ? 'YES' : 'NO'),
        escapeCsvCell(conflictDesc),
        escapeCsvCell(t.completionNote || ''),
        escapeCsvCell(t.holdReason || ''),
        escapeCsvCell(t.lastImportBatchId),
        escapeCsvCell(`v${t.version}`),
        escapeCsvCell(recState),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="CCS_ToDo_Reconciliation_Report.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/export/audit - Audit trail export
router.get('/export-audit', async (_req: Request, res: Response) => {
  try {
    const logs = await taskRepository.getAuditLogs();

    const headers = [
      'Event ID',
      'Task ID',
      'Actor Name',
      'Action',
      'Previous Status',
      'New Status',
      'Reason / Note',
      'Timestamp',
      'Source',
      'Correlation ID',
    ];

    const rows = logs.map((l) => [
      escapeCsvCell(l.eventId),
      escapeCsvCell(l.taskId),
      escapeCsvCell(l.actorName),
      escapeCsvCell(l.action),
      escapeCsvCell(`${l.previousStatus} (${l.previousSubstatus})`),
      escapeCsvCell(`${l.newStatus} (${l.newSubstatus})`),
      escapeCsvCell(l.reason),
      escapeCsvCell(l.timestamp),
      escapeCsvCell(l.source),
      escapeCsvCell(l.correlationId),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="CCS_ToDo_Audit_History.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
