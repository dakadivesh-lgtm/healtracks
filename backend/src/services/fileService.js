const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure upload directory exists
if (!fs.existsSync(config.uploads.directory)) {
  fs.mkdirSync(config.uploads.directory, { recursive: true });
}

class FileService {
  /**
   * Get file path safely within the upload directory.
   * If the file is missing from uploads but exists in bundled seed_assets, restores it automatically.
   */
  getFilePath(filename) {
    // Prevent path traversal
    const safeFilename = path.basename(filename);
    const targetPath = path.join(config.uploads.directory, safeFilename);

    if (!fs.existsSync(targetPath)) {
      const seedAssetPath = path.resolve(__dirname, '../seed_assets', safeFilename);
      if (fs.existsSync(seedAssetPath)) {
        try {
          if (!fs.existsSync(config.uploads.directory)) {
            fs.mkdirSync(config.uploads.directory, { recursive: true });
          }
          fs.copyFileSync(seedAssetPath, targetPath);
          console.log(`📦 Restored bundled seed asset: ${safeFilename} -> ${targetPath}`);
        } catch (err) {
          console.warn(`Failed to restore seed asset ${safeFilename}:`, err.message);
        }
      }
    }

    return targetPath;
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
