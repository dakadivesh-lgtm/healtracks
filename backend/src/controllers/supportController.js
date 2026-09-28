const supportModel = require('../models/supportModel');

const supportController = {
  /**
   * Submit a new support request
   */
  async submitTicket(req, res, next) {
    try {
      const { name, email, category, subject, message, priority } = req.body;
      const userId = req.user ? req.user.id : null;

      const ticket = await supportModel.createTicket({
        userId,
        name: name.trim(),
        email: email.trim(),
        category: category || 'General Support',
        subject: subject.trim(),
        message: message.trim(),
        priority: priority || 'Normal'
      });

      res.status(201).json({
        success: true,
        message: 'Your support request has been submitted. Our team will review it shortly.',
        data: ticket
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get tickets submitted by current user
   */
  async getTickets(req, res, next) {
    try {
      const userId = req.user.id;
      const tickets = await supportModel.getTicketsByUser(userId);

      res.json({
        success: true,
        data: tickets
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = supportController;
