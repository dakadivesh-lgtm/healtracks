import { request } from './api';

export const helpService = {
  /**
   * Send a general recovery question to the backend AI assistant
   * @param {string} message
   * @param {Array<{ sender: string, text: string }>} [history=[]]
   * @returns {Promise<{ success: boolean, answer: string, hasUrgentSymptoms?: boolean, category?: string, source?: string }>}
   */
  async askQuestion(message, history = []) {
    const res = await request('/help/chat', {
      method: 'POST',
      body: { message, history }
    });
    return res;
  }
};
