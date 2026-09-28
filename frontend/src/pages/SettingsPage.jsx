import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';

export default function SettingsPage({ user, onUpdateUser, onShowNotification }) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [healingReminders, setHealingReminders] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    loadProfileAndPrefs();
  }, []);

  const loadProfileAndPrefs = async () => {
    try {
      const data = await userService.getProfile();
      if (data?.user) {
        setName(data.user.name || '');
        setPhone(data.user.phone || '');
      }
      if (data?.preferences) {
        setEmailNotifications(Boolean(data.preferences.email_notifications));
        setHealingReminders(Boolean(data.preferences.healing_reminders));
        setDarkMode(Boolean(data.preferences.dark_mode));
        if (data.preferences.dark_mode) {
          document.body.classList.add('dark-theme');
        } else {
          document.body.classList.remove('dark-theme');
        }
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const updated = await userService.updateProfile({ name, phone });
      onUpdateUser(updated);
      onShowNotification('Profile details updated successfully.', 'success');
    } catch (err) {
      onShowNotification(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    try {
      setSavingPrefs(true);
      await userService.updatePreferences({
        emailNotifications,
        healingReminders,
        darkMode
      });

      if (darkMode) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }

      onShowNotification('Preferences saved successfully.', 'success');
    } catch (err) {
      onShowNotification(err.message || 'Failed to update preferences.', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onShowNotification('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      onShowNotification('New password must be at least 6 characters long.', 'error');
      return;
    }

    try {
      setChangingPass(true);
      await userService.changePassword({ currentPassword, newPassword });
      onShowNotification('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      onShowNotification(err.message || 'Failed to update password.', 'error');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <section className="page-body">
      <div className="greeting-block">
        <h2 className="greeting-title">Account Settings</h2>
        <p className="greeting-sub">Manage your profile, clinical preferences, and security settings.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Profile Card */}
        <form className="form-card" style={{ marginTop: 0 }} onSubmit={handleSaveProfile}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: 16 }}>
            Personal Profile
          </h3>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Account Identifier)</label>
            <input 
              type="email" 
              className="form-input" 
              value={user?.email || ''} 
              disabled 
              style={{ background: 'var(--bg)', color: 'var(--text-muted)' }} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder="+1 (555) 000-0000"
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
            />
          </div>

          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>

        {/* Preferences Card */}
        <form className="form-card" style={{ marginTop: 0 }} onSubmit={handleSavePreferences}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: 16 }}>
            Tracking & Notification Preferences
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={emailNotifications} 
                onChange={(e) => setEmailNotifications(e.target.checked)} 
                style={{ width: 18, height: 18, accentColor: 'var(--blue)' }} 
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Email Notifications</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Receive assessment summaries and report confirmations
                </div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={healingReminders} 
                onChange={(e) => setHealingReminders(e.target.checked)} 
                style={{ width: 18, height: 18, accentColor: 'var(--blue)' }} 
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Healing Progression Reminders</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Remind me to take regular follow-up photos every 3 days
                </div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={darkMode} 
                onChange={(e) => setDarkMode(e.target.checked)} 
                style={{ width: 18, height: 18, accentColor: 'var(--blue)' }} 
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Dark Theme</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Switch to soothing dark clinical contrast mode
                </div>
              </div>
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={savingPrefs}>
            {savingPrefs ? 'Updating...' : 'Save Preferences'}
          </button>
        </form>

        {/* Change Password Card */}
        <form className="form-card" onSubmit={handleChangePassword}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: 16 }}>
            Security & Password
          </h3>

          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password (at least 6 characters)</label>
            <input 
              type="password" 
              className="form-input" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn-outline" disabled={changingPass}>
            {changingPass ? 'Updating Password...' : 'Change Password'}
          </button>
        </form>
      </div>
    </section>
  );
}
