import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from './logger';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

export class BackendService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${BACKEND_URL}/api`,
      timeout: 120000, // 2 minutes for long analysis tasks
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Backend request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Backend request error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Backend response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          logger.error(
            `Backend error: ${error.response.status} ${error.config?.url}`,
            { data: error.response.data }
          );
        } else if (error.request) {
          logger.error(`Backend no response: ${error.config?.url}`);
        } else {
          logger.error('Backend request setup error', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // Analysis endpoints
  async submitAnalysis(payload: {
    case_id?: string;
    case_text?: string;
    analysis_type: string;
  }) {
    const response = await this.client.post('/analysis/', payload);
    return response.data;
  }

  async getAnalysisStatus(taskId: string) {
    const response = await this.client.get(`/analysis/${taskId}/`);
    return response.data;
  }

  // Case endpoints
  async getCases() {
    const response = await this.client.get('/cases/');
    return response.data;
  }

  async getCase(caseId: string) {
    const response = await this.client.get(`/cases/${caseId}/`);
    return response.data;
  }

  // MCP endpoints
  async listTools() {
    const response = await this.client.get('/mcp/tools/');
    return response.data;
  }

  async callTool(name: string, args: Record<string, any>) {
    const response = await this.client.post('/mcp/tools/call/', { name, arguments: args });
    return response.data;
  }

  async listResources() {
    const response = await this.client.get('/mcp/resources/');
    return response.data;
  }

  async readResource(uri: string) {
    const response = await this.client.post('/mcp/resources/read/', { uri });
    return response.data;
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health/', { timeout: 5000 });
      return { status: 'connected', data: response.data };
    } catch (error) {
      return { status: 'disconnected', error: 'Backend unreachable' };
    }
  }
}
