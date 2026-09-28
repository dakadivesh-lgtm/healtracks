const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const userModel = {
  async createUser({ name, email, passwordHash, role = 'Patient', phone = '' }) {
    const id = uuidv4();
    const query = `
      INSERT INTO users (id, name, email, password_hash, role, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await db.query(query, [id, name, email.toLowerCase().trim(), passwordHash, role, phone]);

    // Initialize default preferences
    await userModel.initPreferences(id);

    return userModel.findById(id);
  },

  async findByEmail(email) {
    const query = `SELECT * FROM users WHERE email = $1 LIMIT 1`;
    const res = await db.query(query, [email.toLowerCase().trim()]);
    return res.rows[0] || null;
  },

  async findById(id) {
    const query = `SELECT id, name, email, role, phone, created_at, updated_at FROM users WHERE id = $1 LIMIT 1`;
    const res = await db.query(query, [id]);
    return res.rows[0] || null;
  },

  async updateProfile(id, { name, phone }) {
    const query = `
      UPDATE users 
      SET name = $1, phone = $2 
      WHERE id = $3
    `;
    await db.query(query, [name, phone, id]);
    return userModel.findById(id);
  },

  async updatePassword(id, passwordHash) {
    const query = `
      UPDATE users 
      SET password_hash = $1 
      WHERE id = $2
    `;
    await db.query(query, [passwordHash, id]);
    return true;
  },

  async initPreferences(userId) {
    const query = `
      INSERT INTO user_preferences (user_id, email_notifications, healing_reminders, dark_mode)
      VALUES ($1, $2, $3, $4)
    `;
    await db.query(query, [userId, true, true, false]);
  },

  async getPreferences(userId) {
    const query = `SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1`;
    const res = await db.query(query, [userId]);
    return res.rows[0] || {
      user_id: userId,
      email_notifications: true,
      healing_reminders: true,
      dark_mode: false
    };
  },

  async updatePreferences(userId, { emailNotifications, healingReminders, darkMode }) {
    // Check if preferences row exists
    const existing = await userModel.getPreferences(userId);
    if (!existing || !existing.user_id) {
      await userModel.initPreferences(userId);
    }
    const query = `
      UPDATE user_preferences 
      SET email_notifications = $1, healing_reminders = $2, dark_mode = $3 
      WHERE user_id = $4
    `;
    await db.query(query, [
      emailNotifications !== undefined ? emailNotifications : true,
      healingReminders !== undefined ? healingReminders : true,
      darkMode !== undefined ? darkMode : false,
      userId
    ]);
    return userModel.getPreferences(userId);
  }
};

module.exports = userModel;
