import { orchestratorApi } from './api';
import { A2AAgent } from '../types';

export const agentsService = {
  async listAgents(): Promise<A2AAgent[]> {
    const response = await orchestratorApi.get('/a2a/agents/');
    return response.data;
  },

  async orchestrateAnalysis(data: {
    case_id: string;
    analysis_type: string;
    input_text?: string;
  }): Promise<{ task_id: string; status: string }> {
    const response = await orchestratorApi.post('/mcp/analyze/', data);
    return response.data;
  },

  async getTaskStatus(taskId: string): Promise<{
    task_id: string;
    status: string;
    result?: any;
    error?: string;
  }> {
    const response = await orchestratorApi.get(`/mcp/tasks/${taskId}/`);
    return response.data;
  },

  async sendA2AMessage(agentId: string, message: any): Promise<any> {
    const response = await orchestratorApi.post(`/a2a/agents/${agentId}/message/`, message);
    return response.data;
  },
};

export default agentsService;
