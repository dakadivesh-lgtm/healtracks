const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure upload directory exists
if (!fs.existsSync(config.uploads.directory)) {
  fs.mkdirSync(config.uploads.directory, { recursive: true });
}

class FileService {
  /**
   * Get file path safely within the upload directory
   */
  getFilePath(filename) {
    // Prevent path traversal
    const safeFilename = path.basename(filename);
    return path.join(config.uploads.directory, safeFilename);
  }

  /**
   * Check if file exists
   */
  fileExists(filename) {
    const filePath = this.getFilePath(filename);
    return fs.existsSync(filePath);
  }

  /**
   * Delete file
   */
  deleteFile(filename) {
    const filePath = this.getFilePath(filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}

module.exports = new FileService();
