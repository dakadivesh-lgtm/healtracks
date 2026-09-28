import { request } from './api';

export const woundService = {
  async getDashboard() {
    const res = await request('/wounds/dashboard');
    return res.data;
  },

  async getWounds() {
    const res = await request('/wounds');
    return res.data;
  },

  async getWoundDetail(id) {
    const res = await request(`/wounds/${id}`);
    return res.data;
  },

  async uploadWound({ file, woundId, title, location, notes, isFollowup, qualityMetrics }) {
    const formData = new FormData();
    formData.append('image', file);
    if (woundId) formData.append('woundId', woundId);
    if (title) formData.append('title', title);
    if (location) formData.append('location', location);
    if (notes) formData.append('notes', notes);
    if (isFollowup !== undefined) formData.append('isFollowup', String(isFollowup));
    if (qualityMetrics) formData.append('qualityMetrics', JSON.stringify(qualityMetrics));

    const res = await request('/wounds/upload', {
      method: 'POST',
      body: formData
    });
    return res.data;
  },

  async deleteWound(id) {
    const res = await request(`/wounds/${id}`, {
      method: 'DELETE'
    });
    return res;
  },

  async updateMeasurements(entryId, measurementData) {
    const res = await request(`/wounds/entries/${entryId}/measurements`, {
      method: 'PATCH',
      body: measurementData
    });
    return res.data;
  },

  async updateSymptoms(entryId, symptomData) {
    const res = await request(`/wounds/entries/${entryId}/symptoms`, {
      method: 'PATCH',
      body: symptomData
    });
    return res.data;
  },

  async getWoundComparison(woundId, entryId) {
    const res = await request(`/wounds/${woundId}/comparison/${entryId}`);
    return res.data;
  }
};
