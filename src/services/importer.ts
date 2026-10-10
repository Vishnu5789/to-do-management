import * as XLSX from 'xlsx';
import {
  ColumnMapping,
  ImportBatch,
  Task,
  TaskAuditLog,
  TaskConflictDetails,
  TaskPriority,
  TaskStatus,
  User,
} from '../types/index.ts';

export interface ParseResult {
  headers: string[];
  rawRows: Record<string, any>[];
  fileName: string;
  fileSize: number;
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

export class TaskFileImporter {
  /**
   * Sanitizes cell string to defend against Formula Injection (CSV injection: = + - @ \t \r).
   */
  public static sanitizeFormulaInjection(value: any): string {
    if (value === null || value === undefined) return '';
    let str = String(value).trim();
    if (/^[=+\-@\t\r]/.test(str)) {
      // Escape unsafe spreadsheet prefixes
      str = "'" + str;
    }
    return str;
  }

  /**
   * Parses buffer or ArrayBuffer (CSV or XLSX) into structured headers and raw row objects.
   */
  public static parseFile(buffer: ArrayBuffer | Uint8Array, fileName: string): ParseResult {
    // 1. File size safety check (e.g. 10MB)
    const byteLength = buffer.byteLength;
    if (byteLength > 10 * 1024 * 1024) {
      throw new Error(`File size (${(byteLength / 1024 / 1024).toFixed(2)} MB) exceeds 10 MB limit.`);
    }

    // 2. Read workbook securely without formula execution
    const workbook = XLSX.read(buffer, {
      type: 'array',
      raw: false, // Reads text strings rather than raw parsed types to avoid formula evaluation
      cellFormula: false, // Explicitly disable formula calculation
      cellHTML: false,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Spreadsheet does not contain any worksheets.');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      header: 1, // Get raw array of arrays first to inspect headers accurately
      defval: '',
      blankrows: false,
    });

    if (!jsonData || jsonData.length === 0) {
      throw new Error('Spreadsheet is empty.');
    }

    const headerRow = jsonData[0] as string[];
    const headers = headerRow.map((h, idx) => (h ? String(h).trim() : `Column_${idx + 1}`));

    // Row count limit (5000 rows max for MVP)
    const dataRows = jsonData.slice(1) as any[][];
    if (dataRows.length > 5000) {
      throw new Error(`Spreadsheet contains ${dataRows.length} rows, which exceeds the 5,000 row limit.`);
    }

    const rawRows: Record<string, any>[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const rowArr = dataRows[i];
      // Skip completely empty rows
      if (!rowArr || rowArr.every((cell) => cell === null || cell === undefined || String(cell).trim() === '')) {
        continue;
      }
      const rowObj: Record<string, any> = {};
      for (let c = 0; c < headers.length; c++) {
        rowObj[headers[c]] = rowArr[c] !== undefined ? String(rowArr[c]).trim() : '';
      }
      rawRows.push(rowObj);
    }

    return {
      headers,
      rawRows,
      fileName,
      fileSize: byteLength,
    };
  }

  /**
   * Guess canonical column mapping based on standard Oracle CCS export headers.
   */
  public static autoSuggestMapping(headers: string[]): ColumnMapping {
    const findHeader = (patterns: RegExp[]): string => {
      for (const p of patterns) {
        const found = headers.find((h) => p.test(h.toLowerCase()));
        if (found) return found;
      }
      return '';
    };

    return {
      taskId: findHeader([/^task[_\s]?id$/i, /^to[_\s]?do[_\s]?id$/i, /^entry[_\s]?id$/i, /^id$/i]) || headers[0] || '',
      taskType: findHeader([/^task[_\s]?type$/i, /^to[_\s]?do[_\s]?type$/i, /^type$/i, /^category$/i]) || '',
      description: findHeader([/^description$/i, /^desc$/i, /^message$/i, /^to[_\s]?do[_\s]?message$/i, /^summary$/i]) || '',
      status: findHeader([/^status$/i, /^to[_\s]?do[_\s]?status$/i, /^state$/i]) || '',
      substatus: findHeader([/^sub[_\s]?status$/i, /^detailed[_\s]?status$/i, /^state[_\s]?detail$/i]),
      priority: findHeader([/^priority$/i, /^severity$/i, /^level$/i]) || '',
      assigneeName: findHeader([/^assignee$/i, /^assigned[_\s]?to$/i, /^assigned[_\s]?user$/i, /^user$/i, /^owner$/i]),
      teamName: findHeader([/^team$/i, /^role$/i, /^to[_\s]?do[_\s]?role$/i, /^group$/i, /^dept$/i]),
      createdAt: findHeader([/^created[_\s]?at$/i, /^creation[_\s]?date$/i, /^created[_\s]?date$/i, /^created$/i]),
      dueAt: findHeader([/^due[_\s]?at$/i, /^due[_\s]?date$/i, /^due$/i, /^target[_\s]?date$/i]),
      relatedObjectType: findHeader([/^related[_\s]?type$/i, /^object[_\s]?type$/i, /^drill[_\s]?down[_\s]?type$/i, /^entity[_\s]?type$/i]),
      relatedObjectId: findHeader([/^related[_\s]?id$/i, /^object[_\s]?id$/i, /^drill[_\s]?down[_\s]?id$/i, /^entity[_\s]?id$/i, /^key$/i]),
    };
  }

  /**
   * Normalizes status values from Oracle CCS codes or standard terms.
   */
  public static normalizeStatus(rawStatus: string): { status?: TaskStatus; error?: string } {
    if (!rawStatus) return { error: 'Status is missing' };
    const norm = String(rawStatus).trim().toUpperCase();

    if (norm === 'OPEN' || norm === '10' || norm === 'NEW' || norm === 'UNASSIGNED') {
      return { status: 'Open' };
    }
    if (norm === 'ASSIGNED' || norm === '20' || norm === 'BEING WORKED') {
      return { status: 'Assigned' };
    }
    if (norm === 'IN PROGRESS' || norm === 'IN_PROGRESS' || norm === 'WORKING' || norm === 'WIP') {
      return { status: 'In Progress' };
    }
    if (norm === 'ON HOLD' || norm === 'ON_HOLD' || norm === 'HOLD' || norm === 'SUSPENDED' || norm === 'PENDING') {
      return { status: 'On Hold' };
    }
    if (norm === 'COMPLETED' || norm === 'COMPLETE' || norm === '30' || norm === 'CLOSED' || norm === 'RESOLVED') {
      return { status: 'Completed' };
    }

    return { error: `Unknown status value: "${rawStatus}". Status cannot be automatically inferred.` };
  }

  /**
   * Normalizes priority values.
   */
  public static normalizePriority(rawPriority: string): { priority?: TaskPriority; error?: string } {
    if (!rawPriority) return { priority: 'Medium' }; // Default to Medium if absent, with notice
    const norm = String(rawPriority).trim().toUpperCase();

    if (norm === 'CRITICAL' || norm === '1' || norm === 'URGENT' || norm === 'P1') {
      return { priority: 'Critical' };
    }
    if (norm === 'HIGH' || norm === '2' || norm === 'P2') {
      return { priority: 'High' };
    }
    if (norm === 'MEDIUM' || norm === 'MED' || norm === '3' || norm === 'NORMAL' || norm === 'P3') {
      return { priority: 'Medium' };
    }
    if (norm === 'LOW' || norm === '4' || norm === 'P4') {
      return { priority: 'Low' };
    }

    return { error: `Invalid priority "${rawPriority}". Must be Critical, High, Medium, or Low.` };
  }

  /**
   * Parses various date formats safely without arbitrary date guessing.
   */
  public static parseDate(rawDate: string | number | undefined): { dateStr: string | null; warning?: string } {
    if (!rawDate) return { dateStr: null };

    // If it's an Excel serial date number
    if (typeof rawDate === 'number' || (!isNaN(Number(rawDate)) && Number(rawDate) > 30000 && Number(rawDate) < 60000)) {
      const num = Number(rawDate);
      const parsed = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(parsed.getTime())) {
        return { dateStr: parsed.toISOString() };
      }
    }

    const str = String(rawDate).trim();
    if (!str) return { dateStr: null };

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return { dateStr: parsed.toISOString() };
    }

    return { dateStr: null, warning: `Could not parse date "${str}". Saved as null.` };
  }

  /**
   * Validates and transforms source rows against canonical mapping and existing task state.
   */
  public static validateAndTransform(
    rawRows: Record<string, any>[],
    mapping: ColumnMapping,
    existingTasksMap: Map<string, Task>,
    batchId: string,
    batchTimestamp: string
  ): ValidationSummary {
    const summary: ValidationSummary = {
      totalRows: rawRows.length,
      acceptedRows: 0,
      rejectedRows: 0,
      duplicateRows: 0,
      warningCount: 0,
      newTasksCount: 0,
      unchangedTasksCount: 0,
      conflictsCount: 0,
      acceptedTasks: [],
      rejectedReport: [],
      warnings: [],
    };

    const seenTaskIdsInFile = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2; // Accounting for 1-based index and header row

      const rawTaskId = mapping.taskId ? String(row[mapping.taskId] || '').trim() : '';

      // 1. Missing Task ID
      if (!rawTaskId) {
        summary.rejectedRows++;
        summary.rejectedReport.push({
          rowNumber: rowNum,
          reason: 'Missing mandatory Task ID (column not mapped or value empty).',
          rawRow: row,
        });
        continue;
      }

      // Preserve task ID strictly as string
      const taskId = rawTaskId;

      // 2. Duplicate Task ID within this same file
      if (seenTaskIdsInFile.has(taskId)) {
        summary.duplicateRows++;
        summary.rejectedRows++;
        summary.rejectedReport.push({
          rowNumber: rowNum,
          taskId,
          reason: `Duplicate Task ID "${taskId}" in uploaded file. Multiple rows with same ID rejected.`,
          rawRow: row,
        });
        continue;
      }
      seenTaskIdsInFile.add(taskId);

      // 3. Status validation
      const rawStatusVal = mapping.status ? String(row[mapping.status] || '') : 'Open';
      const statusRes = this.normalizeStatus(rawStatusVal);
      if (statusRes.error) {
        summary.rejectedRows++;
        summary.rejectedReport.push({
          rowNumber: rowNum,
          taskId,
          reason: statusRes.error,
          rawRow: row,
        });
        continue;
      }
      const canonicalStatus = statusRes.status!;

      // 4. Priority validation
      const rawPriorityVal = mapping.priority ? String(row[mapping.priority] || '') : 'Medium';
      const priorityRes = this.normalizePriority(rawPriorityVal);
      if (priorityRes.error) {
        summary.rejectedRows++;
        summary.rejectedReport.push({
          rowNumber: rowNum,
          taskId,
          reason: priorityRes.error,
          rawRow: row,
        });
        continue;
      }
      const canonicalPriority = priorityRes.priority!;

      // 5. Task Type and Description
      const taskType = mapping.taskType ? String(row[mapping.taskType] || 'TD-GENERAL').trim() : 'TD-GENERAL';
      const description = mapping.description ? String(row[mapping.description] || '').trim() : '';
      if (!description) {
        summary.warnings.push({
          rowNumber: rowNum,
          taskId,
          warning: 'Description is blank in source file.',
        });
        summary.warningCount++;
      }

      // 6. Dates
      const createdDateRes = this.parseDate(mapping.createdAt ? row[mapping.createdAt] : undefined);
      if (createdDateRes.warning) {
        summary.warnings.push({ rowNumber: rowNum, taskId, warning: createdDateRes.warning });
        summary.warningCount++;
      }
      const createdAt = createdDateRes.dateStr || batchTimestamp;

      const dueDateRes = this.parseDate(mapping.dueAt ? row[mapping.dueAt] : undefined);
      if (dueDateRes.warning) {
        summary.warnings.push({ rowNumber: rowNum, taskId, warning: dueDateRes.warning });
        summary.warningCount++;
      }
      const dueAt = dueDateRes.dateStr;

      // 7. Assignee & Team
      const rawAssignee = mapping.assigneeName ? String(row[mapping.assigneeName] || '').trim() : '';
      const rawTeam = mapping.teamName ? String(row[mapping.teamName] || 'Operations Queue').trim() : 'Operations Queue';
      const rawSubstatus = mapping.substatus ? String(row[mapping.substatus] || '').trim() : '';

      const relatedObjectType = mapping.relatedObjectType ? String(row[mapping.relatedObjectType] || 'General').trim() : 'General';
      const relatedObjectId = mapping.relatedObjectId ? String(row[mapping.relatedObjectId] || '').trim() : '';

      // Check existing task for Re-import and conflict policy
      const existing = existingTasksMap.get(taskId);

      if (!existing) {
        // New Task
        summary.newTasksCount++;
        summary.acceptedRows++;

        const newTask: Task = {
          taskId,
          sourceSystem: 'Oracle CCS To Do Export',
          taskType,
          description: description || `To Do task for ${relatedObjectType} ${relatedObjectId || taskId}`,
          priority: canonicalPriority,
          status: canonicalStatus,
          substatus: rawSubstatus || (canonicalStatus === 'Open' ? 'Unassigned' : canonicalStatus),
          assigneeId: rawAssignee ? 'USER_' + rawAssignee.toUpperCase().replace(/\s+/g, '_') : null,
          assigneeName: rawAssignee || null,
          teamId: 'TEAM_' + rawTeam.toUpperCase().replace(/\s+/g, '_'),
          teamName: rawTeam,
          relatedObjectType,
          relatedObjectId,
          createdAt,
          updatedAt: batchTimestamp,
          dueAt,
          sourceValues: { ...row },
          currentLocalValues: {
            status: canonicalStatus,
            substatus: rawSubstatus || canonicalStatus,
            priority: canonicalPriority,
            assigneeName: rawAssignee || null,
          },
          lastImportedAt: batchTimestamp,
          lastImportBatchId: batchId,
          isLocallyModified: false,
          hasConflict: false,
          version: 1,
        };
        summary.acceptedTasks.push(newTask);
      } else {
        // Existing task: Check Conflict Policy
        // If task has local changes and source differs in status or priority, FLAG CONFLICT
        const sourceDiffers =
          existing.status !== canonicalStatus ||
          existing.priority !== canonicalPriority ||
          (rawAssignee && existing.assigneeName !== rawAssignee);

        if (existing.isLocallyModified && sourceDiffers) {
          // CONFLICT DETECTED!
          // NEVER automatically revert a locally completed task or modified task
          summary.conflictsCount++;
          summary.acceptedRows++;

          const diffFields: string[] = [];
          if (existing.status !== canonicalStatus) diffFields.push('status');
          if (existing.priority !== canonicalPriority) diffFields.push('priority');
          if (rawAssignee && existing.assigneeName !== rawAssignee) diffFields.push('assignee');

          const conflictDetails: TaskConflictDetails = {
            sourceStatus: canonicalStatus,
            sourceSubstatus: rawSubstatus || canonicalStatus,
            sourcePriority: canonicalPriority,
            localStatus: existing.status,
            localSubstatus: existing.substatus,
            localPriority: existing.priority,
            sourceUpdated: batchTimestamp,
            diffFields,
          };

          const conflictedTask: Task = {
            ...existing,
            // Keep local values intact!
            sourceValues: { ...row },
            lastImportedAt: batchTimestamp,
            lastImportBatchId: batchId,
            hasConflict: true,
            conflictDetails,
            version: existing.version + 1,
          };

          summary.warnings.push({
            rowNumber: rowNum,
            taskId,
            warning: `Conflict detected: Task ${taskId} has local modifications (Status: ${existing.status}). Incoming source specifies ${canonicalStatus}. Flagged for supervisor review.`,
          });
          summary.warningCount++;
          summary.acceptedTasks.push(conflictedTask);
        } else if (!existing.isLocallyModified && sourceDiffers) {
          // Clean update from source without local changes
          summary.acceptedRows++;
          const updatedTask: Task = {
            ...existing,
            taskType,
            description: description || existing.description,
            status: canonicalStatus,
            substatus: rawSubstatus || canonicalStatus,
            priority: canonicalPriority,
            assigneeName: rawAssignee || existing.assigneeName,
            teamName: rawTeam || existing.teamName,
            dueAt: dueAt || existing.dueAt,
            sourceValues: { ...row },
            currentLocalValues: {
              status: canonicalStatus,
              substatus: rawSubstatus || canonicalStatus,
              priority: canonicalPriority,
              assigneeName: rawAssignee || existing.assigneeName,
            },
            lastImportedAt: batchTimestamp,
            lastImportBatchId: batchId,
            hasConflict: false,
            conflictDetails: null,
            version: existing.version + 1,
            updatedAt: batchTimestamp,
          };
          summary.acceptedTasks.push(updatedTask);
        } else {
          // Unchanged task
          summary.unchangedTasksCount++;
          summary.acceptedRows++;
          const unchangedTask: Task = {
            ...existing,
            sourceValues: { ...row },
            lastImportedAt: batchTimestamp,
            lastImportBatchId: batchId,
          };
          summary.acceptedTasks.push(unchangedTask);
        }
      }
    }

    return summary;
  }
}
