const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const woundModel = {
  async createWound({ userId, title, location, status = 'Active' }) {
    const id = uuidv4();
    const query = `
      INSERT INTO wounds (id, user_id, title, location, status)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await db.query(query, [id, userId, title, location, status]);
    return woundModel.getWoundById(id, userId);
  },

  async getWoundsByUser(userId) {
    const query = `
      SELECT * FROM wounds 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const res = await db.query(query, [userId]);
    return res.rows;
  },

  async getWoundById(id, userId) {
    const query = `
      SELECT * FROM wounds 
      WHERE id = $1 AND user_id = $2 
      LIMIT 1
    `;
    const res = await db.query(query, [id, userId]);
    return res.rows[0] || null;
  },

  async updateWound(id, userId, { title, location, status }) {
    const existing = await woundModel.getWoundById(id, userId);
    if (!existing) return null;

    const newTitle = title !== undefined ? title : existing.title;
    const newLocation = location !== undefined ? location : existing.location;
    const newStatus = status !== undefined ? status : existing.status;

    const query = `
      UPDATE wounds 
      SET title = $1, location = $2, status = $3 
      WHERE id = $4 AND user_id = $5
    `;
    await db.query(query, [newTitle, newLocation, newStatus, id, userId]);
    return woundModel.getWoundById(id, userId);
  },

  async deleteWound(id, userId) {
    const query = `DELETE FROM wounds WHERE id = $1 AND user_id = $2`;
    const res = await db.query(query, [id, userId]);
    return res.rowCount > 0;
  }
};

module.exports = woundModel;
