const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

const userController = {
  async getProfile(req, res, next) {
    try {
      const user = await userModel.findById(req.user.id);
      const preferences = await userModel.getPreferences(req.user.id);

      res.json({
        success: true,
        data: {
          user,
          preferences
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const { name, phone } = req.body;

      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid name (at least 2 characters).'
        });
      }

      const updatedUser = await userModel.updateProfile(req.user.id, {
        name: name.trim(),
        phone: phone ? phone.trim() : ''
      });

      res.json({
        success: true,
        message: 'Profile updated successfully.',
        data: updatedUser
      });
    } catch (err) {
      next(err);
    }
  },

  async updatePreferences(req, res, next) {
    try {
      const { emailNotifications, healingReminders, darkMode } = req.body;

      const updated = await userModel.updatePreferences(req.user.id, {
        emailNotifications,
        healingReminders,
        darkMode
      });

      res.json({
        success: true,
        message: 'Preferences updated successfully.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Both current password and new password are required.'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.'
        });
      }

      // Check current password
      const fullUser = await userModel.findByEmail(req.user.email);
      const isMatch = await bcrypt.compare(currentPassword, fullUser.password_hash);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'The current password you entered is incorrect.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);
      await userModel.updatePassword(req.user.id, newPasswordHash);

      res.json({
        success: true,
        message: 'Password changed successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = userController;
