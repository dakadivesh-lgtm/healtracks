const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const supportModel = {
  async createTicket({
    userId = null,
    name,
    email,
    category,
    subject,
    message,
    priority = 'Normal'
  }) {
    const id = uuidv4();
    const query = `
      INSERT INTO support_tickets (id, user_id, name, email, category, subject, message, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await db.query(query, [
      id,
      userId,
      name,
      email,
      category,
      subject,
      message,
      priority,
      'Open'
    ]);

    return supportModel.getTicketById(id);
  },

  async getTicketById(id) {
    const query = `SELECT * FROM support_tickets WHERE id = $1 LIMIT 1`;
    const res = await db.query(query, [id]);
    return res.rows[0] || null;
  },

  async getTicketsByUser(userId) {
    const query = `
      SELECT * FROM support_tickets 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const res = await db.query(query, [userId]);
    return res.rows;
  }
};

module.exports = supportModel;
