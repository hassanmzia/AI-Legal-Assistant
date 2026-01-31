import api from './api';
import { AnalysisResult, PaginatedResponse } from '../types';

export const analysisService = {
  async list(params: {
    case_id?: string;
    analysis_type?: string;
    page?: number;
  } = {}): Promise<PaginatedResponse<AnalysisResult>> {
    const searchParams = new URLSearchParams();
    if (params.case_id) searchParams.append('case', params.case_id);
    if (params.analysis_type) searchParams.append('analysis_type', params.analysis_type);
    if (params.page) searchParams.append('page', String(params.page));

    const response = await api.get(`/analysis/?${searchParams.toString()}`);
    return response.data;
  },

  async get(id: string): Promise<AnalysisResult> {
    const response = await api.get(`/analysis/${id}/`);
    return response.data;
  },

  async create(data: {
    case_id: string;
    analysis_type: string;
    input_text?: string;
  }): Promise<AnalysisResult> {
    const response = await api.post('/analysis/', data);
    return response.data;
  },

  async getEvaluation(id: string): Promise<any> {
    const response = await api.get(`/analysis/${id}/evaluation/`);
    return response.data;
  },
};

export default analysisService;
