import api from './api';
import { Case, CaseTimeline, BillingEntry, PaginatedResponse } from '../types';

export interface CaseFilters {
  search?: string;
  status?: string;
  case_type?: string;
  priority?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const casesService = {
  async list(filters: CaseFilters = {}): Promise<PaginatedResponse<Case>> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.case_type) params.append('case_type', filters.case_type);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.ordering) params.append('ordering', filters.ordering);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));

    const response = await api.get(`/cases/?${params.toString()}`);
    return response.data;
  },

  async get(id: string): Promise<Case> {
    const response = await api.get(`/cases/${id}/`);
    return response.data;
  },

  async create(data: Partial<Case>): Promise<Case> {
    const response = await api.post('/cases/', data);
    return response.data;
  },

  async update(id: string, data: Partial<Case>): Promise<Case> {
    const response = await api.patch(`/cases/${id}/`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/cases/${id}/`);
  },

  async getTimeline(caseId: string): Promise<CaseTimeline[]> {
    const response = await api.get(`/cases/${caseId}/timeline/`);
    return response.data;
  },

  async getBilling(caseId: string): Promise<BillingEntry[]> {
    const response = await api.get(`/cases/${caseId}/billing/`);
    return response.data;
  },

  async analyze(caseId: string, analysisType: string): Promise<any> {
    const response = await api.post(`/cases/${caseId}/analyze/`, { analysis_type: analysisType });
    return response.data;
  },
};

export default casesService;
