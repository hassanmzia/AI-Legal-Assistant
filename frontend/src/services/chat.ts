import api from './api';
import { ChatSession, ChatMessage, PaginatedResponse } from '../types';

export const chatService = {
  async listSessions(): Promise<PaginatedResponse<ChatSession>> {
    const response = await api.get('/chat-sessions/');
    return response.data;
  },

  async getSession(id: string): Promise<ChatSession> {
    const response = await api.get(`/chat-sessions/${id}/`);
    return response.data;
  },

  async createSession(data: { title?: string; case_id?: string }): Promise<ChatSession> {
    const response = await api.post('/chat-sessions/', data);
    return response.data;
  },

  async deleteSession(id: string): Promise<void> {
    await api.delete(`/chat-sessions/${id}/`);
  },

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const response = await api.get(`/chat-sessions/${sessionId}/messages/`);
    return response.data.results || response.data;
  },

  async sendMessage(sessionId: string, content: string): Promise<ChatMessage> {
    const response = await api.post(`/chat-sessions/${sessionId}/send_message/`, {
      content,
    });
    return response.data;
  },
};

export default chatService;
