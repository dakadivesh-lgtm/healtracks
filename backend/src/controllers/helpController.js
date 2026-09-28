const helpService = require('../services/helpService');

class HelpController {
  async handleChat(req, res, next) {
    try {
      const { message, history } = req.body || {};

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid question.'
        });
      }

      const result = await helpService.processQuestion(message.trim(), history || []);

      if (!result.success && !result.answer) {
        return res.status(503).json({
          success: false,
          message: result.message || 'The help assistant is temporarily unavailable.'
        });
      }

      return res.json({
        success: true,
        answer: result.answer,
        hasUrgentSymptoms: result.hasUrgentSymptoms || false,
        category: result.category || 'general recovery',
        source: result.source || 'Local Knowledge Base'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new HelpController();
