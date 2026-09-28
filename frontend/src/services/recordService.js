import { request, getImageUrl, getDownloadImageUrl, getDownloadReportUrl } from './api';

export const recordService = {
  async getRecords(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await request(`/records${query}`);
    return res.data;
  },

  getImageUrl,
  getDownloadImageUrl,
  getDownloadReportUrl
};
