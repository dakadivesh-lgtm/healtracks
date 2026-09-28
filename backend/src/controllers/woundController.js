const woundModel = require('../models/woundModel');
const woundEntryModel = require('../models/woundEntryModel');
const assessmentModel = require('../models/assessmentModel');
const assessmentService = require('../services/assessmentService');
const triageService = require('../services/triageService');
const comparisonService = require('../services/comparisonService');
const fileService = require('../services/fileService');

const woundController = {
  /**
   * Dashboard data: user name, recent wound uploads, and assessment statuses
   */
  async getDashboard(req, res, next) {
    try {
      const userId = req.user.id;
      const wounds = await woundModel.getWoundsByUser(userId);
      const recentEntries = await woundEntryModel.getRecentEntriesByUser(userId, 6);

      // Get all entries for accurate total count
      let totalEntries = 0;
      let urgentCount = 0;
      for (const wound of wounds) {
        const entries = await woundEntryModel.getEntriesByWound(wound.id, userId);
        totalEntries += entries.length;
        // Count entries where assessment notes include urgent flags
        urgentCount += entries.filter(e => e.has_urgent_flags).length;
      }

      // Check if user has zero records
      const hasRecords = totalEntries > 0;

      res.json({
        success: true,
        data: {
          userName: req.user.name,
          role: req.user.role || 'Patient',
          hasRecords,
          totalWounds: wounds.length,
          totalEntries,
          urgentCount,
          recentUploads: recentEntries.map(entry => ({
            id: entry.id,
            woundId: entry.wound_id,
            woundTitle: entry.wound_title,
            woundLocation: entry.wound_location,
            imageFilename: entry.image_filename,
            imageUrl: `/api/records/image/${entry.image_filename}`,
            entryDate: entry.entry_date,
            isFollowup: Boolean(entry.is_followup),
            notes: entry.notes,
            assessmentStatus: entry.assessment_status || 'not_configured',
            assessmentSummary: entry.assessment_summary || 'Analysis not configured'
          }))
        }
      });
    } catch (err) {
      next(err);
    }
  },


  /**
   * List all wounds for user
   */
  async listWounds(req, res, next) {
    try {
      const userId = req.user.id;
      const wounds = await woundModel.getWoundsByUser(userId);

      // Fetch entries for each wound
      const woundsWithEntries = await Promise.all(
        wounds.map(async wound => {
          const entries = await woundEntryModel.getEntriesByWound(wound.id, userId);
          return {
            ...wound,
            entryCount: entries.length,
            latestEntry: entries.length > 0 ? entries[entries.length - 1] : null,
            firstEntry: entries.length > 0 ? entries[0] : null
          };
        })
      );

      res.json({
        success: true,
        data: woundsWithEntries
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single wound details including full timeline
   */
  async getWoundDetail(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const wound = await woundModel.getWoundById(id, userId);
      if (!wound) {
        return res.status(404).json({
          success: false,
          message: 'Wound record not found.'
        });
      }

      const entries = await woundEntryModel.getEntriesByWound(id, userId);

      res.json({
        success: true,
        data: {
          wound,
          timeline: entries.map(entry => ({
            ...entry,
            imageUrl: `/api/records/image/${entry.image_filename}`
          }))
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Upload wound image (either a new wound or follow-up to existing wound)
   */
  async uploadWound(req, res, next) {
    try {
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid wound image file.'
        });
      }

      const {
        woundId,
        title,
        location,
        notes,
        isFollowup,
        qualityMetrics
      } = req.body;

      let targetWoundId = woundId;

      // If no existing wound specified, create a new wound case
      if (!targetWoundId || targetWoundId === 'new') {
        const woundTitle = (title && title.trim()) || 'Wound Assessment';
        const woundLocation = (location && location.trim()) || 'Unspecified';

        const newWound = await woundModel.createWound({
          userId,
          title: woundTitle,
          location: woundLocation,
          status: 'Active'
        });
        targetWoundId = newWound.id;
      } else {
        // Verify wound belongs to user
        const existingWound = await woundModel.getWoundById(targetWoundId, userId);
        if (!existingWound) {
          return res.status(404).json({
            success: false,
            message: 'Target wound case not found.'
          });
        }
      }

      let parsedQuality = null;
      if (qualityMetrics) {
        try {
          parsedQuality = typeof qualityMetrics === 'string' ? JSON.parse(qualityMetrics) : qualityMetrics;
        } catch (e) {
          parsedQuality = null;
        }
      }

      // Create entry record
      const entry = await woundEntryModel.createEntry({
        woundId: targetWoundId,
        userId,
        imageFilename: file.filename,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        notes: notes ? notes.trim() : '',
        isFollowup: isFollowup === 'true' || isFollowup === true,
        qualityMetrics: parsedQuality,
        entryDate: new Date().toISOString()
      });

      // Run AI assessment integration (safe check: returns 'Analysis not configured' if not enabled)
      const assessmentResult = await assessmentService.assessWound({
        imagePath: file.path,
        notes: entry.notes,
        qualityMetrics: parsedQuality
      });

      // Store assessment record
      const savedAssessment = await assessmentModel.createAssessment({
        entryId: entry.id,
        woundId: targetWoundId,
        userId,
        status: assessmentResult.status,
        summary: assessmentResult.summary,
        details: assessmentResult.details
      });

      res.status(201).json({
        success: true,
        message: 'Wound photo and assessment record saved successfully.',
        data: {
          entry: {
            ...entry,
            imageUrl: `/api/records/image/${entry.image_filename}`
          },
          assessment: savedAssessment,
          woundId: targetWoundId
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete a wound
   */
  async deleteWound(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const entries = await woundEntryModel.getEntriesByWound(id, userId);
      // Clean up files
      entries.forEach(entry => {
        fileService.deleteFile(entry.image_filename);
      });

      const deleted = await woundModel.deleteWound(id, userId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Wound record not found.' });
      }

      res.json({ success: true, message: 'Wound record and associated entries deleted successfully.' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Persist wound segmentation measurements
   */
  async updateEntryMeasurements(req, res, next) {
    try {
      const { entryId } = req.params;
      const userId = req.user.id;
      const measurementData = req.body || {};

      const existing = await woundEntryModel.getEntryById(entryId, userId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Wound entry not found.' });
      }

      const updated = await woundEntryModel.updateMeasurements(entryId, userId, measurementData);

      // Recalculate triage and comparison
      const baseline = await woundEntryModel.getBaselineEntry(existing.wound_id, userId);
      const allEntries = await woundEntryModel.getEntriesByWound(existing.wound_id, userId);
      const comparison = comparisonService.buildWoundComparison(updated, baseline, allEntries);

      await woundEntryModel.updateTriageAndComparison(entryId, userId, {
        triageLevel: comparison.triage.level,
        triageReasons: comparison.triage.reasons,
        comparisonData: comparison
      });

      res.json({
        success: true,
        message: 'Measurements updated successfully.',
        data: {
          entry: await woundEntryModel.getEntryById(entryId, userId),
          comparison
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Persist patient symptom answers
   */
  async updateEntrySymptoms(req, res, next) {
    try {
      const { entryId } = req.params;
      const userId = req.user.id;
      const symptomData = req.body || {};

      const existing = await woundEntryModel.getEntryById(entryId, userId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Wound entry not found.' });
      }

      const updated = await woundEntryModel.updateSymptoms(entryId, userId, symptomData);

      // Recalculate triage and comparison
      const baseline = await woundEntryModel.getBaselineEntry(existing.wound_id, userId);
      const allEntries = await woundEntryModel.getEntriesByWound(existing.wound_id, userId);
      const comparison = comparisonService.buildWoundComparison(updated, baseline, allEntries);

      await woundEntryModel.updateTriageAndComparison(entryId, userId, {
        triageLevel: comparison.triage.level,
        triageReasons: comparison.triage.reasons,
        comparisonData: comparison
      });

      res.json({
        success: true,
        message: 'Symptoms updated successfully.',
        data: {
          entry: await woundEntryModel.getEntryById(entryId, userId),
          comparison
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get longitudinal comparison data for a wound entry vs Day 1 baseline
   */
  async getWoundComparison(req, res, next) {
    try {
      const { id, entryId } = req.params;
      const userId = req.user.id;

      const entry = await woundEntryModel.getEntryById(entryId, userId);
      if (!entry) {
        return res.status(404).json({ success: false, message: 'Wound entry not found.' });
      }

      const baseline = await woundEntryModel.getBaselineEntry(id, userId);
      const allEntries = await woundEntryModel.getEntriesByWound(id, userId);
      const comparison = comparisonService.buildWoundComparison(entry, baseline, allEntries);

      res.json({
        success: true,
        data: comparison
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = woundController;
