import api from './api';
import { Document, PaginatedResponse } from '../types';

export const documentsService = {
  async list(params: {
    case_id?: string;
    document_type?: string;
    search?: string;
    page?: number;
  } = {}): Promise<PaginatedResponse<Document>> {
    const searchParams = new URLSearchParams();
    if (params.case_id) searchParams.append('case', params.case_id);
    if (params.document_type) searchParams.append('document_type', params.document_type);
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', String(params.page));

    const response = await api.get(`/documents/?${searchParams.toString()}`);
    return response.data;
  },

  async get(id: string): Promise<Document> {
    const response = await api.get(`/documents/${id}/`);
    return response.data;
  },

  async upload(formData: FormData): Promise<Document> {
    const response = await api.post('/documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/documents/${id}/`);
  },

  async vectorize(id: string): Promise<any> {
    const response = await api.post(`/documents/${id}/vectorize/`);
    return response.data;
  },

  async search(query: string, caseId?: string): Promise<any[]> {
    const params = new URLSearchParams({ query });
    if (caseId) params.append('case_id', caseId);

    const response = await api.get(`/documents/search/?${params.toString()}`);
    return response.data;
  },
};

export default documentsService;
