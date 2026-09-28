import { request } from './api';

export const supportService = {
  async submitTicket(data) {
    const res = await request('/support', {
      method: 'POST',
      body: data
    });
    return res;
  },

  async getMyTickets() {
    const res = await request('/support/my-tickets');
    return res.data;
  }
};
