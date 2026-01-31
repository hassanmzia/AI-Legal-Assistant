import api from './api';
import { User, AuthTokens } from '../types';

export const authService = {
  async login(username: string, password: string): Promise<{ tokens: AuthTokens; user: User }> {
    const tokenResponse = await api.post('/auth/token/', { username, password });
    const tokens: AuthTokens = tokenResponse.data;

    localStorage.setItem('auth_tokens', JSON.stringify(tokens));

    const userResponse = await api.get('/auth/me/');
    const user: User = userResponse.data;

    localStorage.setItem('user', JSON.stringify(user));

    return { tokens, user };
  },

  async register(data: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
  }): Promise<User> {
    const response = await api.post('/auth/register/', data);
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('user');
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me/');
    return response.data;
  },

  getStoredUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getStoredTokens(): AuthTokens | null {
    const tokens = localStorage.getItem('auth_tokens');
    return tokens ? JSON.parse(tokens) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_tokens');
  },
};

export default authService;
