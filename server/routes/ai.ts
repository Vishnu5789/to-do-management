import { Router, Request, Response } from 'express';
import { AiAssistantService } from '../aiService.ts';
import { getActingUser } from './tasks.ts';

const router = Router();

// POST /api/ai/chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const actor = await getActingUser(req);
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message string is required.' });
    }

    const response = await AiAssistantService.processMessage(
      message,
      actor,
      conversationHistory || []
    );

    res.json({
      success: true,
      text: response.text,
      proposedAction: response.proposedAction,
      recommendedTasks: response.recommendedTasks,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/execute-action
router.post('/execute-action', async (req: Request, res: Response) => {
  try {
    const actor = await getActingUser(req);
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, error: 'Action requestId is required.' });
    }

    const result = await AiAssistantService.executeConfirmedTaskAction(actor, requestId);

    if (result.status === 'SUCCESS') {
      return res.json({
        success: true,
        status: result.status,
        message: result.message,
        task: result.task,
      });
    } else {
      return res.status(400).json({
        success: false,
        status: result.status,
        message: result.message,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
