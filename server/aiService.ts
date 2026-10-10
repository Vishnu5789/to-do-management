import crypto from 'node:crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { taskRepository } from './db.ts';
import { TaskLifecycleEngine } from '../src/services/lifecycle.ts';
import { AiActionRequest, Task, TaskLifecycleAction, User } from '../src/types/index.ts';

export class AiAssistantService {
  private static getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return null;
    }
    return new GoogleGenAI({});
  }

  /**
   * Typed tool: searchTasks
   */
  public static async toolSearchTasks(args: {
    query?: string;
    status?: string;
    priority?: string;
    teamId?: string;
    assigneeId?: string;
    isOverdue?: boolean;
  }) {
    const filter: any = {};
    if (args.query) filter.search = args.query;
    if (args.status) filter.status = args.status;
    if (args.priority) filter.priority = args.priority;
    if (args.teamId) filter.teamId = args.teamId;
    if (args.assigneeId) filter.assigneeId = args.assigneeId;
    if (args.isOverdue) filter.dueFilter = 'overdue';

    const tasks = await taskRepository.getTasks(filter);
    return {
      matchCount: tasks.length,
      tasks: tasks.slice(0, 15).map((t) => ({
        taskId: t.taskId,
        taskType: t.taskType,
        description: t.description,
        status: t.status,
        substatus: t.substatus,
        priority: t.priority,
        assigneeName: t.assigneeName || 'Unassigned',
        teamName: t.teamName,
        dueAt: t.dueAt,
        version: t.version,
      })),
    };
  }

  /**
   * Typed tool: getTaskDetails
   */
  public static async toolGetTaskDetails(args: { taskId: string }) {
    const task = await taskRepository.getTaskById(args.taskId);
    if (!task) {
      return { found: false, error: `Task "${args.taskId}" not found in current local workspace.` };
    }
    return {
      found: true,
      task: {
        taskId: task.taskId,
        taskType: task.taskType,
        description: task.description,
        status: task.status,
        substatus: task.substatus,
        priority: task.priority,
        assigneeName: task.assigneeName || 'Unassigned',
        assigneeId: task.assigneeId,
        teamName: task.teamName,
        relatedObjectType: task.relatedObjectType,
        relatedObjectId: task.relatedObjectId,
        createdAt: task.createdAt,
        dueAt: task.dueAt,
        completionNote: task.completionNote,
        holdReason: task.holdReason,
        isLocallyModified: task.isLocallyModified,
        hasConflict: task.hasConflict,
        version: task.version,
        sourceValues: task.sourceValues,
      },
    };
  }

  /**
   * Typed tool: getDashboardMetrics
   */
  public static async toolGetDashboardMetrics() {
    const tasks = await taskRepository.getTasks();
    const now = new Date();

    const counts = {
      total: tasks.length,
      open: tasks.filter((t) => t.status === 'Open').length,
      assigned: tasks.filter((t) => t.status === 'Assigned').length,
      inProgress: tasks.filter((t) => t.status === 'In Progress').length,
      onHold: tasks.filter((t) => t.status === 'On Hold').length,
      completed: tasks.filter((t) => t.status === 'Completed').length,
      overdue: tasks.filter((t) => t.dueAt && new Date(t.dueAt) < now && t.status !== 'Completed').length,
      criticalAndHigh: tasks.filter((t) => (t.priority === 'Critical' || t.priority === 'High') && t.status !== 'Completed').length,
      conflicts: tasks.filter((t) => t.hasConflict).length,
    };

    return { metrics: counts };
  }

  /**
   * Typed tool: getTaskHistory
   */
  public static async toolGetTaskHistory(args: { taskId: string }) {
    const logs = await taskRepository.getAuditLogs(args.taskId);
    return {
      taskId: args.taskId,
      historyCount: logs.length,
      auditLogs: logs.map((l) => ({
        eventId: l.eventId,
        action: l.action,
        actorName: l.actorName,
        fromStatus: `${l.previousStatus} (${l.previousSubstatus})`,
        toStatus: `${l.newStatus} (${l.newSubstatus})`,
        reason: l.reason,
        timestamp: l.timestamp,
        result: l.result,
      })),
    };
  }

  /**
   * Typed tool: summarizeTasks
   */
  public static async toolSummarizeTasks(args: { filterType?: string }) {
    const tasks = await taskRepository.getTasks();
    const activeTasks = tasks.filter((t) => t.status !== 'Completed');

    const byType: Record<string, number> = {};
    const byTeam: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const t of activeTasks) {
      byType[t.taskType] = (byType[t.taskType] || 0) + 1;
      byTeam[t.teamName] = (byTeam[t.teamName] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    }

    return {
      totalActive: activeTasks.length,
      breakdownByType: byType,
      breakdownByTeam: byTeam,
      breakdownByPriority: byPriority,
    };
  }

  /**
   * Typed tool: recommendPriorities
   */
  public static async toolRecommendPriorities(args: { limit?: number }) {
    const tasks = await taskRepository.getTasks();
    const now = new Date();

    const active = tasks.filter((t) => t.status !== 'Completed');

    // Score based on Critical/High priority, Overdue status, and age
    const scored = active.map((t) => {
      let score = 0;
      if (t.priority === 'Critical') score += 100;
      if (t.priority === 'High') score += 50;
      if (t.priority === 'Medium') score += 20;

      const isOverdue = t.dueAt && new Date(t.dueAt) < now;
      if (isOverdue) score += 60;

      if (t.hasConflict) score += 30; // Conflicts need immediate supervisor attention

      return {
        taskId: t.taskId,
        taskType: t.taskType,
        description: t.description,
        priority: t.priority,
        status: t.status,
        dueAt: t.dueAt,
        isOverdue,
        hasConflict: t.hasConflict,
        score,
        recommendationReason: `${t.priority} priority ${isOverdue ? ' [OVERDUE]' : ''}${t.hasConflict ? ' [HAS CONFLICT]' : ''}`,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return {
      recommendations: scored.slice(0, args.limit || 5),
    };
  }

  /**
   * Typed tool: proposeTaskAction
   * Creates a structured AiActionRequest bound to the exact task, current version, user, and action.
   * DOES NOT execute the action. Returns the proposal for the explicit confirmation modal.
   */
  public static async toolProposeTaskAction(
    actor: User,
    args: {
      taskId: string;
      action: TaskLifecycleAction;
      reason?: string;
      note?: string;
      assigneeId?: string;
      assigneeName?: string;
    }
  ) {
    const task = await taskRepository.getTaskById(args.taskId);
    if (!task) {
      return {
        success: false,
        error: `Cannot propose action: Task "${args.taskId}" does not exist in local workspace.`,
      };
    }

    // Validate transition upfront
    const validation = TaskLifecycleEngine.validateTransition(task, args.action, actor, {
      reason: args.reason,
      note: args.note,
      assigneeId: args.assigneeId,
      assigneeName: args.assigneeName,
      expectedVersion: task.version,
    });

    if (!validation.valid) {
      return {
        success: false,
        error: `Action "${args.action}" cannot be proposed: ${validation.errorMessage}`,
        requiresReason: validation.requiresReason,
        requiresNote: validation.requiresNote,
      };
    }

    const requestId = 'REQ_' + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min expiry

    const actionRequest: AiActionRequest = {
      requestId,
      userId: actor.userId,
      userName: actor.displayName,
      taskId: task.taskId,
      proposedAction: args.action,
      parameters: {
        note: args.note,
        reason: args.reason,
        assigneeId: args.assigneeId,
        assigneeName: args.assigneeName,
      },
      taskVersion: task.version,
      currentStatus: task.status,
      currentSubstatus: task.substatus,
      resultingStatus: validation.targetStatus,
      resultingSubstatus: validation.targetSubstatus,
      confirmationState: 'PENDING',
      executionState: 'UNEXECUTED',
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    await taskRepository.saveAiActionRequest(actionRequest);

    return {
      success: true,
      requiresExplicitConfirmation: true,
      actionRequest: {
        requestId: actionRequest.requestId,
        taskId: task.taskId,
        description: task.description,
        currentStatus: task.status,
        currentSubstatus: task.substatus,
        proposedAction: args.action,
        resultingStatus: validation.targetStatus,
        resultingSubstatus: validation.targetSubstatus,
        reason: args.reason || args.note || 'Operator initiated via AI Assistant',
        note: args.note,
        boundVersion: task.version,
        dataMode: 'Local imported workspace (File Mode)',
      },
    };
  }

  /**
   * Typed tool: executeConfirmedTaskAction
   * Called only when the user explicitly clicks "Confirm Action" in the confirmation UI.
   * Revalidates token, user permissions, exact task state, and atomic version.
   */
  public static async executeConfirmedTaskAction(
    actor: User,
    requestId: string
  ): Promise<{
    status: 'SUCCESS' | 'REJECTED' | 'CONFLICT' | 'FAILED';
    message: string;
    task?: Task;
  }> {
    const actionReq = await taskRepository.getAiActionRequest(requestId);
    if (!actionReq) {
      return {
        status: 'FAILED',
        message: 'Invalid or unknown AI action confirmation token.',
      };
    }

    // 1. Check expiration
    if (new Date() > new Date(actionReq.expiresAt)) {
      await taskRepository.updateAiActionRequest(requestId, {
        confirmationState: 'EXPIRED',
        executionState: 'REJECTED',
        resultMessage: 'Confirmation token expired.',
      });
      return {
        status: 'REJECTED',
        message: 'Action confirmation has expired (15-minute validity window exceeded). Please request action again.',
      };
    }

    // 2. Check reuse
    if (actionReq.executionState !== 'UNEXECUTED' || actionReq.confirmationState === 'CONFIRMED') {
      return {
        status: 'REJECTED',
        message: 'This confirmation token has already been executed or cancelled. Replay attacks are prevented.',
      };
    }

    // 3. User verification
    if (actionReq.userId !== actor.userId && actor.role !== 'Supervisor') {
      return {
        status: 'REJECTED',
        message: 'Unauthorized: Confirmation token was issued to a different user.',
      };
    }

    // 4. Fetch current task state and check version
    const task = await taskRepository.getTaskById(actionReq.taskId);
    if (!task) {
      return {
        status: 'FAILED',
        message: `Task ${actionReq.taskId} was not found in local workspace.`,
      };
    }

    if (task.version !== actionReq.taskVersion) {
      await taskRepository.updateAiActionRequest(requestId, {
        executionState: 'CONFLICT',
        resultMessage: `Version mismatch. Expected v${actionReq.taskVersion}, found v${task.version}.`,
      });
      return {
        status: 'CONFLICT',
        message: `Task state has changed since action preview (current v${task.version} vs preview v${actionReq.taskVersion}). Operation aborted to prevent overwriting concurrent edits. Reload task and review.`,
      };
    }

    // 5. Re-validate business transitions
    const validation = TaskLifecycleEngine.validateTransition(
      task,
      actionReq.proposedAction,
      actor,
      {
        reason: actionReq.parameters.reason,
        note: actionReq.parameters.note,
        assigneeId: actionReq.parameters.assigneeId,
        assigneeName: actionReq.parameters.assigneeName,
        expectedVersion: task.version,
      }
    );

    if (!validation.valid) {
      await taskRepository.updateAiActionRequest(requestId, {
        executionState: 'REJECTED',
        resultMessage: validation.errorMessage,
      });
      return {
        status: 'REJECTED',
        message: `Business validation failed: ${validation.errorMessage}`,
      };
    }

    // 6. Execute atomic update and commit audit log
    try {
      const updates: Partial<Task> = {
        status: validation.targetStatus,
        substatus: validation.targetSubstatus,
      };

      if (actionReq.proposedAction === 'PUT_ON_HOLD') {
        updates.holdReason = actionReq.parameters.reason;
      }
      if (actionReq.proposedAction === 'COMPLETE') {
        updates.completionNote = actionReq.parameters.note;
      }
      if (actionReq.proposedAction === 'ASSIGN' || actionReq.proposedAction === 'REASSIGN') {
        if (actionReq.parameters.assigneeId) updates.assigneeId = actionReq.parameters.assigneeId;
        if (actionReq.parameters.assigneeName) updates.assigneeName = actionReq.parameters.assigneeName;
      }

      const { task: updatedTask } = await taskRepository.updateTaskWithAudit(
        task.taskId,
        task.version,
        () => updates,
        {
          taskId: task.taskId,
          actorId: actor.userId,
          actorName: actor.displayName,
          action: actionReq.proposedAction,
          previousStatus: task.status,
          previousSubstatus: task.substatus,
          newStatus: validation.targetStatus,
          newSubstatus: validation.targetSubstatus,
          reason: actionReq.parameters.reason || actionReq.parameters.note || 'AI Assistant approved execution',
          result: 'SUCCESS',
          correlationId: requestId,
          source: 'AI_CONFIRMED',
        }
      );

      await taskRepository.updateAiActionRequest(requestId, {
        confirmationState: 'CONFIRMED',
        executionState: 'SUCCESS',
        executedAt: new Date().toISOString(),
        resultMessage: `Action executed successfully. Task transitioned to ${validation.targetStatus}.`,
      });

      return {
        status: 'SUCCESS',
        message: `Verified state update: Task ${task.taskId} is now ${validation.targetStatus} (${validation.targetSubstatus}).`,
        task: updatedTask,
      };
    } catch (err: any) {
      await taskRepository.updateAiActionRequest(requestId, {
        executionState: 'FAILED',
        resultMessage: err.message,
      });
      return {
        status: 'FAILED',
        message: `Write failed during execution: ${err.message}`,
      };
    }
  }

  /**
   * Main conversational interface.
   * Handles natural language prompts with Gemini model + tools,
   * with complete deterministic fallback if API key is not configured.
   */
  public static async processMessage(
    userMessage: string,
    currentUser: User,
    conversationHistory: Array<{ role: 'user' | 'model'; text: string }> = []
  ): Promise<{
    text: string;
    proposedAction?: any;
    recommendedTasks?: any[];
  }> {
    const gemini = this.getGeminiClient();

    // Deterministic intent parsing for prompt-specified inquiries & safety
    const lower = userMessage.toLowerCase().trim();

    // 1. Check for write requests: "Move TD10025 to In Progress", "Put TD10025 on hold...", "Complete TD10025 with note..."
    const moveMatch = lower.match(/(?:move|change|set|transition)\s+(td\d{5})\s+(?:to\s+)?(in progress|assigned|open|on hold|completed)/i);
    const holdMatch = lower.match(/(?:put|place)\s+(td\d{5})\s+(?:on\s+hold)(?:\s+(?:because|reason:?)\s*(.*))?/i);
    const completeMatch = lower.match(/(?:complete|close|resolve)\s+(td\d{5})(?:\s+(?:with\s+(?:the\s+)?note:?)\s*(.*))?/i);

    if (holdMatch) {
      const taskId = holdMatch[1].toUpperCase();
      const reason = holdMatch[2]?.trim() || 'Operator placed on hold via AI assistant';
      const prop = await this.toolProposeTaskAction(currentUser, {
        taskId,
        action: 'PUT_ON_HOLD',
        reason,
      });
      if (prop.success) {
        return {
          text: `I have prepared a proposal to place task **${taskId}** on hold with reason: *"${reason}"*. \n\nPer security policy, please review and explicitly confirm the action below.`,
          proposedAction: prop.actionRequest,
        };
      } else {
        return { text: `Unable to put ${taskId} on hold: ${prop.error}` };
      }
    }

    if (completeMatch) {
      const taskId = completeMatch[1].toUpperCase();
      const note = completeMatch[2]?.trim() || 'Billing validation completed.';
      const prop = await this.toolProposeTaskAction(currentUser, {
        taskId,
        action: 'COMPLETE',
        note,
      });
      if (prop.success) {
        return {
          text: `I have prepared a proposal to complete task **${taskId}** with note: *"${note}"*. \n\nPlease review the details in the confirmation dialog below and confirm execution.`,
          proposedAction: prop.actionRequest,
        };
      } else {
        return { text: `Unable to complete ${taskId} as requested: ${prop.error}` };
      }
    }

    if (moveMatch) {
      const taskId = moveMatch[1].toUpperCase();
      const targetState = moveMatch[2].toLowerCase();
      let action: TaskLifecycleAction = 'START_PROGRESS';
      if (targetState.includes('progress')) action = 'START_PROGRESS';
      else if (targetState.includes('hold')) action = 'PUT_ON_HOLD';
      else if (targetState.includes('complete')) action = 'COMPLETE';

      const prop = await this.toolProposeTaskAction(currentUser, {
        taskId,
        action,
        reason: 'Moved to ' + targetState,
      });
      if (prop.success) {
        return {
          text: `I have prepared the action request for **${taskId}** to transition to **${action}**. \n\nPlease confirm the action below.`,
          proposedAction: prop.actionRequest,
        };
      } else {
        return { text: `Cannot move ${taskId}: ${prop.error}` };
      }
    }

    // If Gemini client is active, execute through Gemini 3.8 Flash with tool bindings
    if (gemini) {
      try {
        const systemInstruction = `You are the CCS To Do AI Assistant for Oracle Utilities Customer Cloud Service (CCS) To Do entries operating in File Mode (local imported workspace).
Never claim that actions update live Oracle CCS. All actions are in local workspace only.
Always retrieve factual data from provided tools. Never hallucinate or invent task IDs, statuses, or metrics.
When the user asks to change, move, assign, hold, or complete a task, you MUST invoke proposeTaskAction. The action will be executed only after explicit user confirmation.
User context: Name: ${currentUser.displayName}, Role: ${currentUser.role}, Team: ${currentUser.teamName}.
Maintain a professional enterprise utility operations demeanor.`;

        // Define tools for Gemini
        const toolsDeclaration = [
          {
            functionDeclarations: [
              {
                name: 'searchTasks',
                description: 'Search tasks by keywords, status, priority, team, or overdue state.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: { type: Type.STRING },
                    status: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    isOverdue: { type: Type.BOOLEAN },
                  },
                },
              },
              {
                name: 'getTaskDetails',
                description: 'Retrieve complete factual details and source values of a specific task ID.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING, description: 'The exact Task ID like TD10025' },
                  },
                  required: ['taskId'],
                },
              },
              {
                name: 'getDashboardMetrics',
                description: 'Retrieve real aggregated counts of open, in-progress, overdue, and high priority tasks.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {},
                },
              },
              {
                name: 'getTaskHistory',
                description: 'Retrieve audit history log for a task.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING },
                  },
                  required: ['taskId'],
                },
              },
              {
                name: 'recommendPriorities',
                description: 'Get top prioritized tasks requiring urgent operational attention.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    limit: { type: Type.NUMBER },
                  },
                },
              },
              {
                name: 'proposeTaskAction',
                description: 'Propose a task lifecycle transition (Start Progress, Put on Hold, Complete, Assign). Requires explicit user confirmation.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING },
                    action: {
                      type: Type.STRING,
                      description: 'START_PROGRESS | PUT_ON_HOLD | RESUME_PROGRESS | COMPLETE | ASSIGN | REASSIGN',
                    },
                    reason: { type: Type.STRING },
                    note: { type: Type.STRING },
                  },
                  required: ['taskId', 'action'],
                },
              },
            ],
          },
        ];

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API call timed out')), 7000)
        );

        const response = await Promise.race([
          gemini.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              ...conversationHistory.map((h) => ({
                role: h.role,
                parts: [{ text: h.text }],
              })),
              { role: 'user', parts: [{ text: userMessage }] },
            ],
            config: {
              systemInstruction,
              tools: toolsDeclaration as any,
            },
          }),
          timeoutPromise,
        ]);

        // Check if model called function calls
        const fcProp = (response as any).functionCalls;
        const functionCalls = typeof fcProp === 'function' ? fcProp.call(response) : fcProp;
        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          let toolResult: any = {};
          let proposedAction: any = undefined;

          if (call.name === 'searchTasks') {
            toolResult = await this.toolSearchTasks(call.args as any);
          } else if (call.name === 'getTaskDetails') {
            toolResult = await this.toolGetTaskDetails(call.args as any);
          } else if (call.name === 'getDashboardMetrics') {
            toolResult = await this.toolGetDashboardMetrics();
          } else if (call.name === 'getTaskHistory') {
            toolResult = await this.toolGetTaskHistory(call.args as any);
          } else if (call.name === 'recommendPriorities') {
            toolResult = await this.toolRecommendPriorities(call.args as any);
          } else if (call.name === 'proposeTaskAction') {
            const propRes = await this.toolProposeTaskAction(currentUser, call.args as any);
            toolResult = propRes;
            if (propRes.success) {
              proposedAction = propRes.actionRequest;
            }
          }

          // Follow-up generation with tool response
          const followUp = await gemini.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              ...conversationHistory.map((h) => ({
                role: h.role,
                parts: [{ text: h.text }],
              })),
              { role: 'user', parts: [{ text: userMessage }] },
              {
                role: 'model',
                parts: [{ functionCall: call }],
              },
              {
                role: 'user',
                parts: [
                  {
                    functionResponse: {
                      name: call.name,
                      response: toolResult,
                    },
                  },
                ],
              },
            ],
            config: { systemInstruction },
          });

          return {
            text: followUp.text || 'Action processed.',
            proposedAction,
          };
        }

        if (response.text) {
          return { text: response.text };
        }
      } catch (err: any) {
        console.warn('Gemini API call failed, falling back to deterministic engine:', err.message);
      }
    }

    // Deterministic fallback response engine
    if (lower.includes('high-priority') && (lower.includes('open') || lower.includes('still open'))) {
      const res = await this.toolSearchTasks({ priority: 'Critical', status: 'Open' });
      return {
        text: `Here are the active high-priority and critical tasks currently in Open status (${res.matchCount} found):\n` +
          res.tasks.map((t) => `• **${t.taskId}** (${t.taskType}): ${t.description} — *Team: ${t.teamName}*`).join('\n'),
      };
    }

    if (lower.includes('overdue')) {
      const res = await this.toolSearchTasks({ isOverdue: true });
      return {
        text: `Found ${res.matchCount} overdue tasks requiring attention:\n` +
          res.tasks.map((t) => `• **${t.taskId}** (${t.priority}): Due ${t.dueAt?.slice(0, 10)} — ${t.description} (Assignee: ${t.assigneeName})`).join('\n'),
      };
    }

    if (lower.includes('recommend') || lower.includes('prioritize')) {
      const rec = await this.toolRecommendPriorities({ limit: 5 });
      return {
        text: `Based on priority levels, overdue due dates, and open exception flags, here are the top 5 recommended tasks to prioritize:\n\n` +
          rec.recommendations.map((r, i) => `${i + 1}. **${r.taskId}** [${r.priority}] — ${r.description} (${r.recommendationReason})`).join('\n\n'),
        recommendedTasks: rec.recommendations,
      };
    }

    if (lower.includes('explain') || lower.includes('details') || lower.includes('td10025')) {
      const idMatch = lower.match(/td\d{5}/i);
      const targetId = idMatch ? idMatch[0].toUpperCase() : 'TD10025';
      const det = await this.toolGetTaskDetails({ taskId: targetId });
      if (!det.found) {
        return { text: `Task ${targetId} was not found in the local workspace database.` };
      }
      const t = det.task!;
      return {
        text: `**Task Analysis: ${t.taskId}** (${t.taskType})\n` +
          `• **Status:** ${t.status} (${t.substatus})\n` +
          `• **Priority:** ${t.priority}\n` +
          `• **Assignee:** ${t.assigneeName} (${t.teamName})\n` +
          `• **Related Entity:** ${t.relatedObjectType} (${t.relatedObjectId})\n` +
          `• **Due Date:** ${t.dueAt ? t.dueAt.slice(0, 10) : 'None'} ${t.dueAt && new Date(t.dueAt) < new Date() ? '*(OVERDUE)*' : ''}\n` +
          `• **Description:** ${t.description}\n` +
          (t.holdReason ? `• **Hold Reason:** ${t.holdReason}\n` : '') +
          `• **Local Mode State:** Version v${t.version}${t.isLocallyModified ? ', Locally Modified' : ', Unaltered from import'}.`,
      };
    }

    if (lower.includes('why') && lower.includes('pending')) {
      const idMatch = lower.match(/td\d{5}/i);
      const targetId = idMatch ? idMatch[0].toUpperCase() : 'TD10002';
      const det = await this.toolGetTaskDetails({ taskId: targetId });
      if (det.found && det.task) {
        const t = det.task;
        return {
          text: `Task **${t.taskId}** is currently **${t.status}** (${t.substatus}). ` +
            (t.holdReason ? `Active Hold Reason on record: *"${t.holdReason}"*. ` : '') +
            `Assigned to ${t.assigneeName || 'nobody'}. Created on ${t.createdAt.slice(0, 10)}.`,
        };
      }
    }

    if (lower.includes('summarize') || lower.includes('workload')) {
      const sum = await this.toolSummarizeTasks({});
      const metrics = await this.toolGetDashboardMetrics();
      return {
        text: `**Workspace Summary:**\n` +
          `• Total Tasks in Database: ${metrics.metrics.total}\n` +
          `• Open: ${metrics.metrics.open} | Assigned: ${metrics.metrics.assigned} | In Progress: ${metrics.metrics.inProgress}\n` +
          `• On Hold: ${metrics.metrics.onHold} | Completed: ${metrics.metrics.completed}\n` +
          `• Critical/High Priority Active: ${metrics.metrics.criticalAndHigh}\n` +
          `• Overdue Tasks: ${metrics.metrics.overdue}\n` +
          `• Active Import Conflicts: ${metrics.metrics.conflicts}`,
      };
    }

    // Default helpful guidance
    return {
      text: `I can assist you with your Oracle CCS To Do workspace in File Mode. Try asking:\n` +
        `• *"Show high-priority tasks that are still open."*\n` +
        `• *"Show overdue tasks."*\n` +
        `• *"Recommend the five tasks we should prioritize."*\n` +
        `• *"Explain task TD10025 using its available details."*\n` +
        `• *"Move TD10025 to In Progress."*\n` +
        `• *"Put TD10002 on hold because we are waiting for meter reading."*\n` +
        `• *"Complete TD10001 with note: Billing validation completed."*`,
    };
  }
}
