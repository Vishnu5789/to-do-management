import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { taskRepository } from '../db.ts';
import { TaskFileImporter } from '../../src/services/importer.ts';
import { getActingUser } from './tasks.ts';
import { ColumnMapping, ImportBatch, Task, TaskAuditLog } from '../../src/types/index.ts';

const router = Router();

// POST /api/import/parse
// Body: { fileBase64: string, fileName: string }
router.post('/parse', async (req: Request, res: Response) => {
  try {
    const { fileBase64, fileName } = req.body;
    if (!fileBase64 || !fileName) {
      return res.status(400).json({ success: false, error: 'File content (base64) and filename are required.' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const parseResult = TaskFileImporter.parseFile(buffer, fileName);
    const suggestedMapping = TaskFileImporter.autoSuggestMapping(parseResult.headers);

    res.json({
      success: true,
      headers: parseResult.headers,
      suggestedMapping,
      previewRows: parseResult.rawRows.slice(0, 10),
      totalRows: parseResult.rawRows.length,
      fileName: parseResult.fileName,
      fileSize: parseResult.fileSize,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/import/validate
// Body: { rawRows: any[], mapping: ColumnMapping, fileName: string }
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { rawRows, mapping, fileName } = req.body;
    if (!rawRows || !Array.isArray(rawRows) || !mapping) {
      return res.status(400).json({ success: false, error: 'rawRows and mapping are required.' });
    }

    const existingTasks = await taskRepository.getTasks();
    const existingMap = new Map<string, Task>();
    for (const t of existingTasks) {
      existingMap.set(t.taskId, t);
    }

    const batchId = 'BATCH_' + crypto.randomUUID().slice(0, 8);
    const timestamp = new Date().toISOString();

    const summary = TaskFileImporter.validateAndTransform(
      rawRows,
      mapping as ColumnMapping,
      existingMap,
      batchId,
      timestamp
    );

    res.json({
      success: true,
      batchId,
      summary,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/import/commit
// Body: { batchId: string, fileName: string, summary: ValidationSummary, mapping: ColumnMapping }
router.post('/commit', async (req: Request, res: Response) => {
  try {
    const actor = await getActingUser(req);
    if (actor.role !== 'Supervisor') {
      return res.status(403).json({
        success: false,
        error: 'Permission Denied: Only supervisors are authorized to commit task file imports.',
      });
    }

    const { batchId, fileName, summary, sourceMetadata } = req.body;
    if (!batchId || !summary || !Array.isArray(summary.acceptedTasks)) {
      return res.status(400).json({ success: false, error: 'Invalid import commit payload.' });
    }

    const nowIso = new Date().toISOString();

    const importBatch: ImportBatch = {
      batchId,
      filename: fileName || 'uploaded_export.csv',
      importedBy: actor.displayName,
      importedAt: nowIso,
      sourceMetadata: sourceMetadata || {
        sourceSystem: 'Oracle CCS To Do Export',
        environment: 'File Mode Prototype',
      },
      totalRows: summary.totalRows,
      acceptedRows: summary.acceptedRows,
      rejectedRows: summary.rejectedRows,
      duplicateRows: summary.duplicateRows,
      warningCount: summary.warningCount,
      newTasksCount: summary.newTasksCount,
      unchangedTasksCount: summary.unchangedTasksCount,
      conflictsCount: summary.conflictsCount,
      result: summary.rejectedRows === 0 ? 'Success' : summary.acceptedRows > 0 ? 'Partial' : 'Rejected',
      rejectedReport: summary.rejectedReport || [],
      warnings: summary.warnings || [],
    };

    const auditLogs: TaskAuditLog[] = summary.acceptedTasks.map((t: Task) => ({
      eventId: 'EVT_' + crypto.randomUUID().slice(0, 8),
      taskId: t.taskId,
      actorId: actor.userId,
      actorName: actor.displayName,
      action: 'FILE_IMPORT',
      previousStatus: t.sourceValues?.Status || 'Unknown',
      previousSubstatus: 'Imported',
      newStatus: t.status,
      newSubstatus: t.substatus,
      reason: `Batch import ${batchId} from ${fileName}`,
      timestamp: nowIso,
      result: 'SUCCESS',
      correlationId: batchId,
      source: 'FILE_IMPORT',
      importBatchId: batchId,
    }));

    await taskRepository.saveImportBatch(importBatch, summary.acceptedTasks, auditLogs);

    res.json({
      success: true,
      message: `Successfully processed batch ${batchId}. ${summary.acceptedRows} tasks updated/created, ${summary.conflictsCount} conflicts flagged.`,
      batch: importBatch,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/import/batches
router.get('/batches', async (_req: Request, res: Response) => {
  try {
    const batches = await taskRepository.getImportBatches();
    res.json({ success: true, count: batches.length, batches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
