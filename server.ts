import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import tasksRouter from './server/routes/tasks.ts';
import importRouter from './server/routes/import.ts';
import aiRouter from './server/routes/ai.ts';
import auditRouter from './server/routes/audit.ts';
import usersRouter from './server/routes/users.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Register API routes
  app.use('/api/tasks', tasksRouter);
  app.use('/api/import', importRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api', usersRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      mode: 'File Mode - Not Connected to Live CCS',
      version: '1.0.0-mvp',
      timestamp: new Date().toISOString(),
    });
  });

  if (!isProd) {
    // Development mode: attach Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CCS To Do AI Manager] Server started on http://0.0.0.0:${PORT} in ${isProd ? 'production' : 'development'} mode.`);
    console.log(`[CCS To Do AI Manager] Operating in: File Mode — Not Connected to Live CCS.`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
