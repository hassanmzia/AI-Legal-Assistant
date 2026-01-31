import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { A2AAgentCard, A2ATask, A2AMessage } from '../types';
import { logger } from '../services/logger';
import { RedisService } from '../services/redis';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

export class A2AServer {
  private router: Router;
  private agents: Map<string, A2AAgentCard>;
  private tasks: Map<string, A2ATask>;
  private redis: RedisService;

  constructor(redis: RedisService) {
    this.router = Router();
    this.agents = new Map();
    this.tasks = new Map();
    this.redis = redis;
    this.registerDefaultAgents();
    this.setupRoutes();
  }

  private registerDefaultAgents() {
    const defaultAgents: A2AAgentCard[] = [
      {
        id: 'legal-analyst',
        name: 'Legal Analysis Agent',
        description: 'Comprehensive legal case analysis with ReAct pattern',
        capabilities: ['case_analysis', 'full_analysis', 'legal_research'],
        endpoint: `${BACKEND_URL}/api/analyses/`,
        status: 'online',
        tools: ['rag_search_tool', 'tavily_web_search_tool', 'analyze_loopholes_tool', 'risk_assessment_tool'],
      },
      {
        id: 'research-agent',
        name: 'Legal Research Agent',
        description: 'Searches precedents and legal databases',
        capabilities: ['precedent_search', 'legal_research', 'web_search'],
        endpoint: `${BACKEND_URL}/api/analyses/`,
        status: 'online',
        tools: ['rag_search_tool', 'tavily_web_search_tool'],
      },
      {
        id: 'loophole-detector',
        name: 'Loophole Detection Agent',
        description: 'Identifies legal loopholes and weaknesses',
        capabilities: ['loophole_detection', 'weakness_analysis'],
        endpoint: `${BACKEND_URL}/api/analyses/`,
        status: 'online',
        tools: ['analyze_loopholes_tool', 'rag_search_tool'],
      },
      {
        id: 'risk-assessor',
        name: 'Risk Assessment Agent',
        description: 'Evaluates legal risks and outcome probabilities',
        capabilities: ['risk_assessment', 'probability_estimation'],
        endpoint: `${BACKEND_URL}/api/analyses/`,
        status: 'online',
        tools: ['risk_assessment_tool'],
      },
      {
        id: 'contract-reviewer',
        name: 'Contract Review Agent',
        description: 'Reviews contracts for issues and compliance',
        capabilities: ['contract_review', 'compliance_check'],
        endpoint: `${BACKEND_URL}/api/analyses/`,
        status: 'online',
        tools: ['contract_review_tool', 'compliance_check_tool'],
      },
      {
        id: 'supervisor',
        name: 'Supervisor Agent',
        description: 'Coordinates multi-agent workflows and aggregates results',
        capabilities: ['orchestration', 'aggregation', 'routing'],
        endpoint: '',
        status: 'online',
        tools: [],
      },
    ];

    defaultAgents.forEach((agent) => this.agents.set(agent.id, agent));
    logger.info(`Registered ${defaultAgents.length} default agents`);
  }

  private setupRoutes() {
    // Get agent card / discovery
    this.router.get('/agents', (req, res) => {
      const agents = Array.from(this.agents.values());
      res.json({ agents });
    });

    this.router.get('/agents/:id', (req, res) => {
      const agent = this.agents.get(req.params.id);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }
      res.json(agent);
    });

    // Register new agent
    this.router.post('/agents/register', (req, res) => {
      const agent: A2AAgentCard = { ...req.body, id: req.body.id || uuidv4() };
      this.agents.set(agent.id, agent);
      logger.info(`Agent registered: ${agent.name} (${agent.id})`);
      res.status(201).json(agent);
    });

    // Deregister agent
    this.router.delete('/agents/:id', (req, res) => {
      const agent = this.agents.get(req.params.id);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }
      this.agents.delete(req.params.id);
      logger.info(`Agent deregistered: ${agent.name} (${agent.id})`);
      res.json({ message: 'Agent deregistered', id: req.params.id });
    });

    // Submit task
    this.router.post('/tasks', async (req, res) => {
      try {
        const { agentId, type, input } = req.body;
        const task: A2ATask = {
          id: uuidv4(),
          agentId,
          type,
          input,
          status: 'pending',
          createdAt: new Date(),
        };
        this.tasks.set(task.id, task);

        // Process task asynchronously
        this.processTask(task);

        res.status(201).json(task);
      } catch (error) {
        logger.error('Task submission error', error);
        res.status(500).json({ error: 'Failed to submit task' });
      }
    });

    // Get task status
    this.router.get('/tasks/:id', (req, res) => {
      const task = this.tasks.get(req.params.id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.json(task);
    });

    // List all tasks
    this.router.get('/tasks', (req, res) => {
      const tasks = Array.from(this.tasks.values());
      res.json({ tasks });
    });

    // Multi-agent orchestration endpoint
    this.router.post('/orchestrate', async (req, res) => {
      try {
        const { caseText, analysisTypes, caseId } = req.body;
        const result = await this.orchestrateAnalysis(
          caseText,
          analysisTypes || ['full_analysis'],
          caseId
        );
        res.json(result);
      } catch (error) {
        logger.error('Orchestration error', error);
        res.status(500).json({ error: 'Orchestration failed' });
      }
    });

    // Send message between agents
    this.router.post('/messages', async (req, res) => {
      const message: A2AMessage = {
        ...req.body,
        id: uuidv4(),
        timestamp: new Date(),
      };
      await this.redis.publish('a2a:messages', JSON.stringify(message));
      logger.info(`A2A message sent: ${message.fromAgent} -> ${message.toAgent}`);
      res.status(201).json(message);
    });
  }

  private async processTask(task: A2ATask): Promise<void> {
    try {
      task.status = 'in_progress';
      const agent = this.agents.get(task.agentId);
      if (!agent) throw new Error(`Agent not found: ${task.agentId}`);

      logger.info(`Processing task ${task.id} with agent ${agent.name}`);

      const serviceKey = process.env.SERVICE_API_KEY || 'legal-assistant-internal-service-key-2024';
      const response = await axios.post(`${BACKEND_URL}/api/analyses/`, {
        case_id: task.input.caseId,
        analysis_type: task.type || 'full_analysis',
        input_text: task.input.caseText || task.input.text || task.input,
      }, {
        headers: { 'X-Service-Key': serviceKey },
      });

      task.result = response.data;
      task.status = 'completed';
      task.completedAt = new Date();

      await this.redis.publish('a2a:task_complete', JSON.stringify(task));
      logger.info(`Task ${task.id} completed successfully`);
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.response?.data?.error || error.message;
      logger.error(`Task ${task.id} failed: ${task.error}`);
    }
  }

  private async orchestrateAnalysis(
    caseText: string,
    analysisTypes: string[],
    caseId?: string
  ) {
    const startTime = Date.now();
    const taskId = uuidv4();
    const results: Record<string, any> = {};

    logger.info(`Starting orchestration ${taskId} with types: ${analysisTypes.join(', ')}`);

    // Run analyses in parallel
    const promises = analysisTypes.map(async (type) => {
      try {
        const payload: any = { analysis_type: type };
        if (caseId) {
          payload.case_id = caseId;
        } else {
          payload.input_text = caseText;
        }

        const serviceKey = process.env.SERVICE_API_KEY || 'legal-assistant-internal-service-key-2024';
        const response = await axios.post(`${BACKEND_URL}/api/analyses/`, payload, {
          headers: { 'X-Service-Key': serviceKey },
        });
        results[type] = response.data;
      } catch (error: any) {
        logger.error(`Analysis type ${type} failed`, error);
        results[type] = { error: error.message };
      }
    });

    await Promise.all(promises);

    const processingTime = (Date.now() - startTime) / 1000;
    const toolsUsed = Object.values(results)
      .filter((r: any) => r.tools_used)
      .flatMap((r: any) => r.tools_used.map((t: any) => t.name));

    logger.info(`Orchestration ${taskId} completed in ${processingTime}s`);

    return {
      taskId,
      agents: analysisTypes,
      results,
      processingTime,
      toolsUsed,
    };
  }

  getAgentCount(): number {
    return this.agents.size;
  }

  getRouter(): Router {
    return this.router;
  }
}
