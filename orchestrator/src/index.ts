import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import { logger } from './services/logger';
import { RedisService } from './services/redis';
import { MCPServer } from './mcp/server';
import { A2AServer } from './a2a/server';
import { SupervisorAgent } from './agents/supervisor';
import { createHealthRouter } from './routes/health';
import { WebSocketMessage } from './types';

const PORT = parseInt(process.env.PORT || '3001', 10);

// Initialize Express
const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Initialize services
const redis = new RedisService();
const mcpServer = new MCPServer();
const a2aServer = new A2AServer(redis);
const supervisor = new SupervisorAgent(redis);

// WebSocket server for real-time agent communication
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Map<string, WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  wsClients.set(clientId, ws);
  logger.info(`WebSocket client connected: ${clientId}`);

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      logger.debug(`WebSocket message from ${clientId}:`, message);
      handleWebSocketMessage(clientId, message);
    } catch (error) {
      logger.error('WebSocket message parse error', error);
    }
  });

  ws.on('close', () => {
    wsClients.delete(clientId);
    logger.info(`WebSocket client disconnected: ${clientId}`);
  });

  ws.on('error', (error) => {
    logger.error(`WebSocket error for client ${clientId}`, error);
    wsClients.delete(clientId);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'agent_update',
    data: { message: 'Connected to orchestrator', clientId },
    timestamp: new Date(),
  }));
});

function handleWebSocketMessage(clientId: string, message: any) {
  switch (message.type) {
    case 'subscribe_task':
      logger.info(`Client ${clientId} subscribed to task ${message.taskId}`);
      break;
    case 'ping':
      const client = wsClients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
      }
      break;
    default:
      logger.debug(`Unknown WebSocket message type: ${message.type}`);
  }
}

function broadcastToClients(message: WebSocketMessage) {
  const payload = JSON.stringify(message);
  wsClients.forEach((ws, clientId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    } else {
      wsClients.delete(clientId);
    }
  });
}

// Subscribe to Redis events and broadcast via WebSocket
async function setupRedisSubscriptions() {
  await redis.subscribe('a2a:task_complete', (message) => {
    broadcastToClients({
      type: 'analysis_complete',
      data: JSON.parse(message),
      timestamp: new Date(),
    });
  });

  await redis.subscribe('a2a:task_progress', (message) => {
    broadcastToClients({
      type: 'task_progress',
      data: JSON.parse(message),
      timestamp: new Date(),
    });
  });

  await redis.subscribe('a2a:orchestration_complete', (message) => {
    broadcastToClients({
      type: 'analysis_complete',
      data: JSON.parse(message),
      timestamp: new Date(),
    });
  });
}

// Routes
app.use('/health', createHealthRouter(() => a2aServer.getAgentCount()));
app.use('/api/mcp', mcpServer.getRouter());
app.use('/api/a2a', a2aServer.getRouter());

// Supervisor orchestration route
app.post('/api/agents/orchestrate', async (req, res) => {
  try {
    const { caseText, analysisType, caseId } = req.body;
    if (!caseText && !caseId) {
      res.status(400).json({ error: 'Either caseText or caseId is required' });
      return;
    }
    const result = await supervisor.orchestrate(
      caseText || '',
      analysisType || 'full_analysis',
      caseId
    );
    res.json(result);
  } catch (error) {
    logger.error('Agent orchestration error', error);
    res.status(500).json({ error: 'Orchestration failed' });
  }
});

// Agent config endpoint
app.get('/api/agents/supervisor/config', (req, res) => {
  res.json(supervisor.getConfig());
});

// Start server
async function start() {
  try {
    // Connect to Redis
    await redis.connect();
    await setupRedisSubscriptions();
    logger.info('Redis subscriptions established');
  } catch (error) {
    logger.warn('Redis not available - running without pub/sub', error);
  }

  server.listen(PORT, () => {
    logger.info(`Orchestrator service running on port ${PORT}`);
    logger.info(`WebSocket server available at ws://localhost:${PORT}/ws`);
    logger.info(`Health check at http://localhost:${PORT}/health`);
    logger.info(`MCP API at http://localhost:${PORT}/api/mcp/`);
    logger.info(`A2A API at http://localhost:${PORT}/api/a2a/`);
  });
}

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close WebSocket connections
  wsClients.forEach((ws, clientId) => {
    ws.close(1001, 'Server shutting down');
    wsClients.delete(clientId);
  });
  wss.close();

  // Close HTTP server
  server.close(async () => {
    logger.info('HTTP server closed');

    // Disconnect Redis
    try {
      await redis.disconnect();
    } catch (error) {
      logger.error('Redis disconnect error', error);
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error) => {
  logger.error('Failed to start orchestrator', error);
  process.exit(1);
});
