import { request } from './api';

export const userService = {
  async getProfile() {
    const res = await request('/user/profile');
    return res.data;
  },

  async updateProfile(data) {
    const res = await request('/user/profile', {
      method: 'PUT',
      body: data
    });
    return res.data;
  },

  async updatePreferences(preferences) {
    const res = await request('/user/preferences', {
      method: 'PUT',
      body: preferences
    });
    return res.data;
  },

  async changePassword({ currentPassword, newPassword }) {
    const res = await request('/user/change-password', {
      method: 'PUT',
      body: { currentPassword, newPassword }
    });
    return res;
  }
};
