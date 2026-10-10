import assert from 'node:assert';
import { TaskFileImporter } from '../src/services/importer.ts';
import { TaskLifecycleEngine } from '../src/services/lifecycle.ts';
import { FileModeTaskRepository } from '../server/db.ts';
import { AiAssistantService } from '../server/aiService.ts';
import { Task, User } from '../src/types/index.ts';
import { SAMPLE_CLEAN_EXPORT_CSV, SAMPLE_INVALID_ROWS_CSV } from '../src/utils/sampleFiles.ts';

async function runAllTests() {
  console.log('====================================================');
  console.log('  CCS TO DO AI MANAGER — AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function runTest(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  [PASS] ${name}`);
        passedCount++;
      })
      .catch((err) => {
        console.error(`  [FAIL] ${name}`);
        console.error(`         Reason: ${err.message}`);
        failedCount++;
      });
  }

  const supervisorUser: User = {
    userId: 'test_sup',
    displayName: 'Test Supervisor',
    email: 'sup@test.com',
    role: 'Supervisor',
    teamId: 'TEAM_BILLING',
    teamName: 'Billing Team',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const operatorUser: User = {
    userId: 'test_op',
    displayName: 'Test Operator',
    email: 'op@test.com',
    role: 'Operator',
    teamId: 'TEAM_BILLING',
    teamName: 'Billing Team',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const otherOperatorUser: User = {
    userId: 'test_other_op',
    displayName: 'Other Operator',
    email: 'other@test.com',
    role: 'Operator',
    teamId: 'TEAM_FIELD',
    teamName: 'Field Team',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  // 1. CSV and XLSX parsing
  await runTest('1. CSV / Spreadsheet parsing preserves headers and data rows', () => {
    const enc = new TextEncoder();
    const buffer = enc.encode(SAMPLE_CLEAN_EXPORT_CSV);
    const parsed = TaskFileImporter.parseFile(buffer, 'clean.csv');
    assert.strictEqual(parsed.headers.length > 5, true);
    assert.strictEqual(parsed.rawRows.length, 6);
  });

  // 2. Column mapping auto-suggestion
  await runTest('2. Column mapping auto-suggests canonical CCS headers', () => {
    const headers = ['To Do Entry ID', 'To Do Type', 'Message', 'Status', 'Priority', 'Assigned User'];
    const mapping = TaskFileImporter.autoSuggestMapping(headers);
    assert.strictEqual(mapping.taskId, 'To Do Entry ID');
    assert.strictEqual(mapping.taskType, 'To Do Type');
    assert.strictEqual(mapping.description, 'Message');
    assert.strictEqual(mapping.status, 'Status');
  });

  // 3. Missing and duplicate task IDs detection
  await runTest('3. Missing and duplicate task IDs are strictly rejected', () => {
    const enc = new TextEncoder();
    const buffer = enc.encode(SAMPLE_INVALID_ROWS_CSV);
    const parsed = TaskFileImporter.parseFile(buffer, 'invalid.csv');
    const mapping = TaskFileImporter.autoSuggestMapping(parsed.headers);
    const summary = TaskFileImporter.validateAndTransform(
      parsed.rawRows,
      mapping,
      new Map(),
      'BATCH_TEST',
      new Date().toISOString()
    );

    assert.strictEqual(summary.rejectedRows >= 3, true);
    assert.strictEqual(summary.duplicateRows, 1);
    // Find missing ID report
    const missingId = summary.rejectedReport.find((r) => r.reason.includes('Missing mandatory Task ID'));
    assert.ok(missingId);
    // Find duplicate ID report
    const dupId = summary.rejectedReport.find((r) => r.reason.includes('Duplicate Task ID'));
    assert.ok(dupId);
  });

  // 4. Invalid status and date handling
  await runTest('4. Invalid status and date handling does not silently convert', () => {
    const statusRes = TaskFileImporter.normalizeStatus('999_UNKNOWN_STATUS');
    assert.ok(statusRes.error, 'Unknown status should return error');

    const dateRes = TaskFileImporter.parseDate('INVALID_DATE_STRING');
    assert.ok(dateRes.warning, 'Ambiguous date should report warning');
  });

  // 5. Formula Injection Defense
  await runTest('5. Export and Import sanitize spreadsheet formula injection prefixes', () => {
    assert.strictEqual(TaskFileImporter.sanitizeFormulaInjection('=SUM(A1:A10)'), "'=SUM(A1:A10)");
    assert.strictEqual(TaskFileImporter.sanitizeFormulaInjection('+123'), "'+123");
    assert.strictEqual(TaskFileImporter.sanitizeFormulaInjection('-456'), "'-456");
    assert.strictEqual(TaskFileImporter.sanitizeFormulaInjection('@calc'), "'@calc");
    assert.strictEqual(TaskFileImporter.sanitizeFormulaInjection('Normal Text'), 'Normal Text');
  });

  // 6. Re-import conflict detection and preservation of locally modified tasks
  await runTest('6. Locally modified task is NOT overwritten on re-import; conflict is flagged', () => {
    const existingTask: Task = {
      taskId: 'TD10001',
      sourceSystem: 'Oracle CCS',
      taskType: 'TD-BILLERR',
      description: 'Test task',
      priority: 'Critical',
      status: 'Completed',
      substatus: 'Resolved',
      assigneeId: operatorUser.userId,
      assigneeName: operatorUser.displayName,
      teamId: 'TEAM_BILLING',
      teamName: 'Billing Team',
      relatedObjectType: 'Bill',
      relatedObjectId: 'B1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueAt: null,
      sourceValues: {},
      currentLocalValues: { status: 'Completed' },
      lastImportedAt: new Date().toISOString(),
      lastImportBatchId: 'B1',
      isLocallyModified: true, // User completed it locally!
      version: 2,
    };

    const existingMap = new Map<string, Task>();
    existingMap.set('TD10001', existingTask);

    const incomingRows = [
      {
        'To Do Entry ID': 'TD10001',
        'Status': '10', // Source still says Open
        'Priority': 'Critical',
      },
    ];

    const mapping = {
      taskId: 'To Do Entry ID',
      status: 'Status',
      priority: 'Priority',
      taskType: '',
      description: '',
    };

    const summary = TaskFileImporter.validateAndTransform(
      incomingRows,
      mapping as any,
      existingMap,
      'BATCH_2',
      new Date().toISOString()
    );

    assert.strictEqual(summary.conflictsCount, 1, 'Should flag conflict');
    const resultTask = summary.acceptedTasks[0];
    assert.strictEqual(resultTask.status, 'Completed', 'Must NOT revert locally completed task to Open');
    assert.strictEqual(resultTask.hasConflict, true);
    assert.ok(resultTask.conflictDetails);
  });

  // 7. Status transition lifecycle validator
  await runTest('7. Valid and invalid status transitions enforce state machine', () => {
    const task: Task = {
      taskId: 'TD99001',
      sourceSystem: 'Oracle CCS',
      taskType: 'TD-BILLERR',
      description: 'Test',
      priority: 'High',
      status: 'Assigned',
      substatus: 'Assigned',
      assigneeId: operatorUser.userId,
      assigneeName: operatorUser.displayName,
      teamId: 'TEAM_BILLING',
      teamName: 'Billing Team',
      relatedObjectType: 'Account',
      relatedObjectId: 'A1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueAt: null,
      sourceValues: {},
      currentLocalValues: {},
      lastImportedAt: new Date().toISOString(),
      lastImportBatchId: 'B1',
      isLocallyModified: false,
      version: 1,
    };

    // Valid: Assigned -> In Progress
    const res1 = TaskLifecycleEngine.validateTransition(task, 'START_PROGRESS', operatorUser);
    assert.strictEqual(res1.valid, true);
    assert.strictEqual(res1.targetStatus, 'In Progress');

    // Invalid: Assigned -> Resume Progress (Must be on hold)
    const res2 = TaskLifecycleEngine.validateTransition(task, 'RESUME_PROGRESS', operatorUser);
    assert.strictEqual(res2.valid, false);

    // Hold requires reason
    const res3 = TaskLifecycleEngine.validateTransition(
      { ...task, status: 'In Progress' },
      'PUT_ON_HOLD',
      operatorUser,
      { reason: '' }
    );
    assert.strictEqual(res3.valid, false, 'Put on hold without reason must fail');

    // Complete requires note for TD-BILLERR
    const res4 = TaskLifecycleEngine.validateTransition(
      { ...task, status: 'In Progress' },
      'COMPLETE',
      operatorUser,
      { note: '' }
    );
    assert.strictEqual(res4.valid, false, 'Completion without note for TD-BILLERR must fail');

    // Valid completion with note
    const res5 = TaskLifecycleEngine.validateTransition(
      { ...task, status: 'In Progress' },
      'COMPLETE',
      operatorUser,
      { note: 'Tariff calculated correctly and verified.' }
    );
    assert.strictEqual(res5.valid, true);
  });

  // 8. Operator vs Supervisor Permissions
  await runTest('8. Role-based authorization: Operators cannot reassign tasks of other operators', () => {
    const assignedTask: Task = {
      taskId: 'TD99002',
      sourceSystem: 'Oracle CCS',
      taskType: 'TD-BILLERR',
      description: 'Assigned to Elena',
      priority: 'High',
      status: 'Assigned',
      substatus: 'Assigned to Elena',
      assigneeId: 'usr_op_1',
      assigneeName: 'Elena Rostova',
      teamId: 'TEAM_BILLING',
      teamName: 'Billing Team',
      relatedObjectType: 'Account',
      relatedObjectId: 'A1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueAt: null,
      sourceValues: {},
      currentLocalValues: {},
      lastImportedAt: new Date().toISOString(),
      lastImportBatchId: 'B1',
      isLocallyModified: false,
      version: 1,
    };

    // Operator trying to reassign
    const opReassign = TaskLifecycleEngine.validateTransition(
      assignedTask,
      'REASSIGN',
      operatorUser,
      { assigneeId: 'usr_op_2' }
    );
    assert.strictEqual(opReassign.valid, false, 'Operator cannot reassign');

    // Supervisor reassigning
    const supReassign = TaskLifecycleEngine.validateTransition(
      assignedTask,
      'REASSIGN',
      supervisorUser,
      { assigneeId: 'usr_op_2', assigneeName: 'Carlos Mendez' }
    );
    assert.strictEqual(supReassign.valid, true, 'Supervisor can reassign');
  });

  // 9. Concurrency conflict / optimistic locking
  await runTest('9. Stale task version rejects action execution', () => {
    const task: Task = {
      taskId: 'TD99003',
      sourceSystem: 'Oracle CCS',
      taskType: 'TD-BILLERR',
      description: 'Test',
      priority: 'Medium',
      status: 'Open',
      substatus: 'Unassigned',
      assigneeId: null,
      assigneeName: null,
      teamId: 'TEAM_BILLING',
      teamName: 'Billing Team',
      relatedObjectType: 'Account',
      relatedObjectId: 'A1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueAt: null,
      sourceValues: {},
      currentLocalValues: {},
      lastImportedAt: new Date().toISOString(),
      lastImportBatchId: 'B1',
      isLocallyModified: false,
      version: 3, // Real version is 3
    };

    const staleVersionAttempt = TaskLifecycleEngine.validateTransition(
      task,
      'START_PROGRESS',
      supervisorUser,
      { expectedVersion: 2 } // Stale expected version!
    );
    assert.strictEqual(staleVersionAttempt.valid, false);
    assert.ok(staleVersionAttempt.errorMessage?.includes('Concurrency Conflict'));
  });

  // 10. AI Action Proposal and Explicit Confirmation Cycle
  await runTest('10. AI Action proposal generates bound token without executing write', async () => {
    // Propose action on Open task TD10004
    const propRes = await AiAssistantService.toolProposeTaskAction(supervisorUser, {
      taskId: 'TD10004',
      action: 'START_PROGRESS',
    });

    assert.strictEqual(propRes.success, true);
    assert.strictEqual(propRes.requiresExplicitConfirmation, true);
    assert.ok(propRes.actionRequest.requestId);

    // Verify task is NOT changed yet!
    const checkTask = await AiAssistantService.toolGetTaskDetails({ taskId: 'TD10004' });
    assert.strictEqual(checkTask.task?.status, 'Open', 'Task must remain Open before explicit confirmation');
  });

  // 11. Expired confirmation tokens are rejected
  await runTest('11. Expired AI confirmation tokens are rejected and marked EXPIRED', async () => {
    const prop = await AiAssistantService.toolProposeTaskAction(supervisorUser, {
      taskId: 'TD10004',
      action: 'START_PROGRESS',
    });

    assert.strictEqual(prop.success, true);
    assert.ok(prop.actionRequest);

    // Artificially expire the request in global store
    const { taskRepository } = await import('../server/db.ts');
    await taskRepository.updateAiActionRequest(prop.actionRequest.requestId, {
      expiresAt: new Date(Date.now() - 10000).toISOString(),
    });

    // Attempt execution
    const execRes = await AiAssistantService.executeConfirmedTaskAction(
      supervisorUser,
      prop.actionRequest.requestId
    );

    assert.strictEqual(execRes.status, 'REJECTED');
    assert.ok(execRes.message.includes('expired'));
  });

  // 12. Nonexistent task handled safely
  await runTest('12. AI and API handle nonexistent tasks safely without fabrication', async () => {
    const res = await AiAssistantService.toolGetTaskDetails({ taskId: 'TD99999_NONEXISTENT' });
    assert.strictEqual(res.found, false);
    assert.ok(res.error?.includes('not found'));
  });

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});
