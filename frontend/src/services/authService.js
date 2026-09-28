import { request, setToken, removeToken } from './api';

export const authService = {
  async register({ name, email, password, phone }) {
    const res = await request('/auth/register', {
      method: 'POST',
      body: { name, email, password, phone }
    });
    if (res.data?.token) {
      setToken(res.data.token);
    }
    return res.data;
  },

  async login(email, password) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (res.data?.token) {
      setToken(res.data.token);
    }
    return res.data;
  },

  async getMe() {
    const res = await request('/auth/me');
    return res.data;
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      removeToken();
    }
  }
};
