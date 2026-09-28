const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const assessmentModel = {
  async createAssessment({
    entryId,
    woundId,
    userId,
    status = 'not_configured',
    summary = 'Analysis not configured',
    details = null
  }) {
    const id = uuidv4();
    const query = `
      INSERT INTO assessments (id, entry_id, wound_id, user_id, status, summary, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const detailsStr = typeof details === 'object' && details !== null
      ? JSON.stringify(details)
      : details;

    await db.query(query, [id, entryId, woundId, userId, status, summary, detailsStr]);
    return assessmentModel.getAssessmentByEntryId(entryId, userId);
  },

  async getAssessmentByEntryId(entryId, userId) {
    const query = `
      SELECT * FROM assessments 
      WHERE entry_id = $1 AND user_id = $2 
      LIMIT 1
    `;
    const res = await db.query(query, [entryId, userId]);
    return res.rows[0] || null;
  }
};

module.exports = assessmentModel;
