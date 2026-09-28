const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const woundEntryModel = {
  async createEntry({
    woundId,
    userId,
    imageFilename,
    originalFilename = '',
    mimeType = 'image/jpeg',
    fileSize = 0,
    notes = '',
    isFollowup = false,
    followupDay = null,
    qualityMetrics = null,
    entryDate = new Date().toISOString()
  }) {
    const id = uuidv4();
    
    // Auto-calculate followupDay if not specified
    let calcFollowupDay = followupDay;
    if (!calcFollowupDay) {
      const existingEntries = await woundEntryModel.getEntriesByWound(woundId, userId);
      if (existingEntries.length === 0) {
        calcFollowupDay = 1;
      } else {
        const count = existingEntries.length;
        calcFollowupDay = count === 1 ? 3 : count === 2 ? 5 : count === 3 ? 7 : (count * 2 + 1);
      }
    }

    const query = `
      INSERT INTO wound_entries (
        id, wound_id, user_id, image_filename, original_filename,
        mime_type, file_size, notes, is_followup, followup_day, quality_metrics, entry_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    const qualityStr = typeof qualityMetrics === 'object' && qualityMetrics !== null
      ? JSON.stringify(qualityMetrics)
      : qualityMetrics;

    await db.query(query, [
      id,
      woundId,
      userId,
      imageFilename,
      originalFilename,
      mimeType,
      fileSize,
      notes,
      Boolean(isFollowup),
      calcFollowupDay,
      qualityStr,
      entryDate
    ]);

    return woundEntryModel.getEntryById(id, userId);
  },

  async updateMeasurements(id, userId, measurementData = {}) {
    const coveragePct = measurementData.coveragePct ?? measurementData.coverage_pct ?? null;
    const physicalAreaCm2 = measurementData.physicalAreaCm2 ?? measurementData.wound_area_cm2 ?? null;
    const woundAreaPx = measurementData.woundAreaPx ?? measurementData.wound_area_px ?? null;
    const segConfidence = measurementData.segConfidence ?? measurementData.seg_confidence ?? null;

    const query = `
      UPDATE wound_entries
      SET coverage_pct = $1,
          wound_area_cm2 = $2,
          wound_area_px = $3,
          segmentation_data = $4
      WHERE id = $5 AND user_id = $6
    `;
    const segStr = typeof measurementData === 'object' && measurementData !== null
      ? JSON.stringify(measurementData)
      : measurementData;

    await db.query(query, [
      coveragePct,
      physicalAreaCm2,
      woundAreaPx,
      segStr,
      id,
      userId
    ]);
    return woundEntryModel.getEntryById(id, userId);
  },

  async updateSymptoms(id, userId, symptomData = {}) {
    const s = symptomData || {};

    const painScore = s.painScore ?? s.pain_score ?? null;
    const swellingLevel = s.swellingLevel ?? s.swelling_level ?? null;
    const rednessStatus = s.rednessStatus ?? s.redness_status ?? null;
    const fever = s.fever !== undefined ? Boolean(s.fever) : null;
    const discharge = s.discharge !== undefined ? Boolean(s.discharge) : null;
    const badSmell = (s.badSmell ?? s.bad_smell) !== undefined ? Boolean(s.badSmell ?? s.bad_smell) : null;
    const bleedingUncontrolled = (s.bleedingUncontrolled ?? s.bleeding_uncontrolled) !== undefined ? Boolean(s.bleedingUncontrolled ?? s.bleeding_uncontrolled) : null;
    const diabetes = s.diabetes !== undefined ? Boolean(s.diabetes) : null;
    const footWound = (s.footWound ?? s.foot_wound) !== undefined ? Boolean(s.footWound ?? s.foot_wound) : null;
    const animalBite = (s.animalBite ?? s.animal_bite) !== undefined ? Boolean(s.animalBite ?? s.animal_bite) : null;
    const snakeBite = (s.snakeBite ?? s.snake_bite) !== undefined ? Boolean(s.snakeBite ?? s.snake_bite) : null;
    const tetanusConcern = (s.tetanusConcern ?? s.tetanus_concern) !== undefined ? Boolean(s.tetanusConcern ?? s.tetanus_concern) : null;
    const worseningPain = (s.worseningPain ?? s.worsening_pain) !== undefined ? Boolean(s.worseningPain ?? s.worsening_pain) : null;

    const query = `
      UPDATE wound_entries
      SET pain_score = $1,
          swelling_level = $2,
          redness_status = $3,
          fever = $4,
          discharge = $5,
          bad_smell = $6,
          bleeding_uncontrolled = $7,
          diabetes = $8,
          foot_wound = $9,
          animal_bite = $10,
          snake_bite = $11,
          tetanus_concern = $12,
          worsening_pain = $13,
          symptom_data = $14
      WHERE id = $15 AND user_id = $16
    `;
    const symStr = typeof symptomData === 'object' && symptomData !== null
      ? JSON.stringify(symptomData)
      : symptomData;

    await db.query(query, [
      painScore,
      swellingLevel,
      rednessStatus,
      fever,
      discharge,
      badSmell,
      bleedingUncontrolled,
      diabetes,
      footWound,
      animalBite,
      snakeBite,
      tetanusConcern,
      worseningPain,
      symStr,
      id,
      userId
    ]);
    return woundEntryModel.getEntryById(id, userId);
  },

  async updateTriageAndComparison(id, userId, { triageLevel, triageReasons, comparisonData }) {
    const query = `
      UPDATE wound_entries
      SET triage_level = $1,
          triage_reasons = $2,
          comparison_data = $3
      WHERE id = $4 AND user_id = $5
    `;
    const reasonsStr = typeof triageReasons === 'object' ? JSON.stringify(triageReasons) : triageReasons;
    const compStr = typeof comparisonData === 'object' ? JSON.stringify(comparisonData) : comparisonData;
    await db.query(query, [
      triageLevel,
      reasonsStr,
      compStr,
      id,
      userId
    ]);
    return woundEntryModel.getEntryById(id, userId);
  },

  async getBaselineEntry(woundId, userId) {
    const query = `
      SELECT e.*
      FROM wound_entries e
      WHERE e.wound_id = $1 AND e.user_id = $2
      ORDER BY e.entry_date ASC
      LIMIT 1
    `;
    const res = await db.query(query, [woundId, userId]);
    return res.rows[0] || null;
  },

  async getEntryById(id, userId) {
    const query = `
      SELECT e.*, w.title as wound_title, w.location as wound_location, w.status as wound_status
      FROM wound_entries e
      JOIN wounds w ON e.wound_id = w.id
      WHERE e.id = $1 AND e.user_id = $2
      LIMIT 1
    `;
    const res = await db.query(query, [id, userId]);
    return res.rows[0] || null;
  },

  async getEntriesByWound(woundId, userId) {
    const query = `
      SELECT e.*, a.status as assessment_status, a.summary as assessment_summary, a.details as assessment_details
      FROM wound_entries e
      LEFT JOIN assessments a ON a.entry_id = e.id
      WHERE e.wound_id = $1 AND e.user_id = $2
      ORDER BY e.entry_date ASC
    `;
    const res = await db.query(query, [woundId, userId]);
    return res.rows;
  },

  async getAllEntriesByUser(userId) {
    const query = `
      SELECT e.*, w.title as wound_title, w.location as wound_location, w.status as wound_status,
             a.status as assessment_status, a.summary as assessment_summary, a.details as assessment_details
      FROM wound_entries e
      JOIN wounds w ON e.wound_id = w.id
      LEFT JOIN assessments a ON a.entry_id = e.id
      WHERE e.user_id = $1
      ORDER BY e.entry_date DESC
    `;
    const res = await db.query(query, [userId]);
    return res.rows;
  },

  async getRecentEntriesByUser(userId, limit = 5) {
    const query = `
      SELECT e.*, w.title as wound_title, w.location as wound_location, w.status as wound_status,
             a.status as assessment_status, a.summary as assessment_summary
      FROM wound_entries e
      JOIN wounds w ON e.wound_id = w.id
      LEFT JOIN assessments a ON a.entry_id = e.id
      WHERE e.user_id = $1
      ORDER BY e.entry_date DESC
      LIMIT $2
    `;
    const res = await db.query(query, [userId, limit]);
    return res.rows;
  },

  async deleteEntry(id, userId) {
    const query = `DELETE FROM wound_entries WHERE id = $1 AND user_id = $2`;
    const res = await db.query(query, [id, userId]);
    return res.rowCount > 0;
  }
};

module.exports = woundEntryModel;
