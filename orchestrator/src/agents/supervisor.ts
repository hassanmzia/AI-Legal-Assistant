import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { AgentConfig, OrchestrationResult, A2AAgentCard } from '../types';
import { logger } from '../services/logger';
import { RedisService } from '../services/redis';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

export class SupervisorAgent {
  private config: AgentConfig;
  private redis: RedisService;

  constructor(redis: RedisService) {
    this.redis = redis;
    this.config = {
      id: 'supervisor',
      name: 'Supervisor Agent',
      type: 'supervisor',
      model: 'gpt-4',
      systemPrompt:
        'You are a supervisor agent that coordinates multi-agent legal analysis workflows. ' +
        'You route tasks to specialized agents, aggregate their results, and ensure comprehensive analysis.',
      tools: [],
      maxIterations: 10,
    };
  }

  /**
   * Determine which agents should handle a given analysis request
   * based on the analysis type and case content.
   */
  routeTask(analysisType: string): string[] {
    const routingMap: Record<string, string[]> = {
      full_analysis: [
        'legal-analyst',
        'research-agent',
        'loophole-detector',
        'risk-assessor',
      ],
      case_analysis: ['legal-analyst', 'research-agent'],
      loophole_detection: ['loophole-detector', 'research-agent'],
      risk_assessment: ['risk-assessor', 'legal-analyst'],
      contract_review: ['contract-reviewer', 'risk-assessor'],
      compliance_check: ['contract-reviewer'],
      legal_research: ['research-agent'],
      precedent_search: ['research-agent'],
    };

    return routingMap[analysisType] || ['legal-analyst'];
  }

  /**
   * Execute a full orchestrated analysis by delegating to multiple agents
   * and aggregating their results.
   */
  async orchestrate(
    caseText: string,
    analysisType: string,
    caseId?: string
  ): Promise<OrchestrationResult> {
    const taskId = uuidv4();
    const startTime = Date.now();
    const assignedAgents = this.routeTask(analysisType);

    logger.info(
      `Supervisor orchestrating task ${taskId}: type=${analysisType}, agents=${assignedAgents.join(', ')}`
    );

    const results: Record<string, any> = {};
    const toolsUsed: string[] = [];

    // Delegate to each assigned agent in parallel
    const promises = assignedAgents.map(async (agentId) => {
      try {
        const payload: any = { analysis_type: analysisType };
        if (caseId) {
          payload.case_id = caseId;
        } else {
          payload.input_text = caseText;
        }

        const serviceKey = process.env.SERVICE_API_KEY || 'legal-assistant-internal-service-key-2024';
        logger.info(`Supervisor delegating to agent: ${agentId}`);
        const response = await axios.post(`${BACKEND_URL}/api/analyses/`, payload, {
          headers: { 'X-Service-Key': serviceKey },
        });
        results[agentId] = response.data;

        // Collect tools used
        if (response.data.tools_used) {
          response.data.tools_used.forEach((tool: any) => {
            if (!toolsUsed.includes(tool.name)) {
              toolsUsed.push(tool.name);
            }
          });
        }

        // Publish progress via Redis
        await this.redis.publish(
          'a2a:task_progress',
          JSON.stringify({
            taskId,
            agentId,
            status: 'completed',
            timestamp: new Date(),
          })
        );
      } catch (error: any) {
        logger.error(`Agent ${agentId} failed for task ${taskId}`, error);
        results[agentId] = { error: error.message, status: 'failed' };
      }
    });

    await Promise.all(promises);

    const processingTime = (Date.now() - startTime) / 1000;

    // Aggregate analysis from all agent results
    const aggregatedAnalysis = this.aggregateResults(results, analysisType);

    const orchestrationResult: OrchestrationResult = {
      taskId,
      agents: assignedAgents,
      results,
      aggregatedAnalysis,
      processingTime,
      toolsUsed,
    };

    // Cache the result
    await this.redis.cacheSet(`orchestration:${taskId}`, orchestrationResult, 3600);

    // Publish completion event
    await this.redis.publish(
      'a2a:orchestration_complete',
      JSON.stringify({
        taskId,
        processingTime,
        agentCount: assignedAgents.length,
      })
    );

    logger.info(
      `Supervisor completed orchestration ${taskId} in ${processingTime}s with ${assignedAgents.length} agents`
    );

    return orchestrationResult;
  }

  /**
   * Aggregate results from multiple agents into a cohesive summary.
   */
  private aggregateResults(
    results: Record<string, any>,
    analysisType: string
  ): string {
    const sections: string[] = [];
    const successfulAgents = Object.entries(results).filter(
      ([_, result]) => !result.error
    );
    const failedAgents = Object.entries(results).filter(
      ([_, result]) => result.error
    );

    sections.push(`## Multi-Agent ${analysisType} Analysis Summary`);
    sections.push(
      `**Agents consulted:** ${Object.keys(results).length} (${successfulAgents.length} successful, ${failedAgents.length} failed)`
    );
    sections.push('');

    for (const [agentId, result] of successfulAgents) {
      sections.push(`### ${agentId}`);
      if (result.analysis) {
        sections.push(
          typeof result.analysis === 'string'
            ? result.analysis
            : JSON.stringify(result.analysis, null, 2)
        );
      } else if (result.result) {
        sections.push(
          typeof result.result === 'string'
            ? result.result
            : JSON.stringify(result.result, null, 2)
        );
      }
      sections.push('');
    }

    if (failedAgents.length > 0) {
      sections.push('### Failed Agents');
      for (const [agentId, result] of failedAgents) {
        sections.push(`- **${agentId}**: ${result.error}`);
      }
    }

    return sections.join('\n');
  }

  getConfig(): AgentConfig {
    return this.config;
  }
}
