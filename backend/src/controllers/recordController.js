const woundEntryModel = require('../models/woundEntryModel');
const fileService = require('../services/fileService');
const reportService = require('../services/reportService');
const path = require('path');
const fs = require('fs');

const recordController = {
  /**
   * Get all wound records for current user
   */
  async getRecords(req, res, next) {
    try {
      const userId = req.user.id;
      const { search, status, sortBy } = req.query;

      let records = await woundEntryModel.getAllEntriesByUser(userId);

      // Search filtering by wound title, location, or notes
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        records = records.filter(r =>
          (r.wound_title && r.wound_title.toLowerCase().includes(q)) ||
          (r.wound_location && r.wound_location.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q))
        );
      }

      // Filter by wound status if provided
      if (status && status !== 'all') {
        records = records.filter(r => (r.wound_status || '').toLowerCase() === status.toLowerCase());
      }

      // Map private image urls
      const formatted = records.map(r => ({
        ...r,
        imageUrl: `/api/records/image/${r.image_filename}`,
        downloadImageUrl: `/api/records/download-image/${r.image_filename}`,
        downloadReportUrl: `/api/records/download-report/${r.id}`
      }));

      res.json({
        success: true,
        data: formatted,
        count: formatted.length
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Securely serve private image (checks user ownership)
   */
  async getPrivateImage(req, res, next) {
    try {
      const { filename } = req.params;
      const userId = req.user.id;

      // Verify the image belongs to an entry owned by the requesting user
      const userEntries = await woundEntryModel.getAllEntriesByUser(userId);
      const authorizedEntry = userEntries.find(e => e.image_filename === filename);

      if (!authorizedEntry) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to view this image.'
        });
      }

      const filePath = fileService.getFilePath(filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Image file was not found on the server.'
        });
      }

      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Securely download private image as an attachment
   */
  async downloadRecordImage(req, res, next) {
    try {
      const { filename } = req.params;
      const userId = req.user.id;

      const userEntries = await woundEntryModel.getAllEntriesByUser(userId);
      const authorizedEntry = userEntries.find(e => e.image_filename === filename);

      if (!authorizedEntry) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to download this image.'
        });
      }

      const filePath = fileService.getFilePath(filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Image file was not found on the server.'
        });
      }

      const downloadName = authorizedEntry.original_filename || filename;
      res.download(filePath, downloadName);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Download assessment log report
   */
  async downloadRecordReport(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const entry = await woundEntryModel.getEntryById(id, userId);
      if (!entry) {
        return res.status(404).json({
          success: false,
          message: 'Wound record not found.'
        });
      }

      const reportContent = reportService.generateEntryReport(entry, req.user);
      const filename = `woundwise_report_${entry.id.substring(0, 8)}.txt`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(reportContent);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = recordController;
