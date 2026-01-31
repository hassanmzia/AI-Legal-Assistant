import { Router } from 'express';
import axios from 'axios';
import { MCPToolCallRequest } from '../types';
import { logger } from '../services/logger';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

export class MCPServer {
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes() {
    // List available tools
    this.router.get('/tools', async (req, res) => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/mcp/tools/`);
        res.json(response.data);
      } catch (error) {
        logger.error('MCP list tools error', error);
        res.status(500).json({ error: 'Failed to list tools' });
      }
    });

    // Call a tool
    this.router.post('/tools/call', async (req, res) => {
      try {
        const request: MCPToolCallRequest = req.body;
        logger.info(`MCP tool call: ${request.name}`, { arguments: request.arguments });
        const response = await axios.post(`${BACKEND_URL}/api/mcp/tools/call/`, request);
        res.json(response.data);
      } catch (error) {
        logger.error('MCP tool call error', error);
        res.status(500).json({ content: [{ type: 'text', text: 'Tool call failed' }], isError: true });
      }
    });

    // List resources
    this.router.get('/resources', async (req, res) => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/mcp/resources/`);
        res.json(response.data);
      } catch (error) {
        logger.error('MCP list resources error', error);
        res.status(500).json({ error: 'Failed to list resources' });
      }
    });

    // Read resource
    this.router.post('/resources/read', async (req, res) => {
      try {
        const response = await axios.post(`${BACKEND_URL}/api/mcp/resources/read/`, req.body);
        res.json(response.data);
      } catch (error) {
        logger.error('MCP read resource error', error);
        res.status(500).json({ error: 'Failed to read resource' });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
