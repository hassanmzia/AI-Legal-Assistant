import { Router } from 'express';
import { BackendService } from '../services/backend';
import { logger } from '../services/logger';

const startTime = Date.now();

export function createHealthRouter(agentCountFn: () => number): Router {
  const router = Router();
  const backend = new BackendService();

  router.get('/', async (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    try {
      const backendStatus = await backend.healthCheck();

      res.json({
        status: 'ok',
        service: 'orchestrator',
        uptime: uptimeSeconds,
        agents_count: agentCountFn(),
        backend: backendStatus.status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Health check error', error);
      res.status(503).json({
        status: 'degraded',
        service: 'orchestrator',
        uptime: uptimeSeconds,
        agents_count: agentCountFn(),
        backend: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
