import React, { useState } from 'react';

export default function TopBar({ 
  title, 
  user, 
  onLogout, 
  onNavigate, 
  mobileOpen, 
  setMobileOpen,
  onShowNotification
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const handleNotificationsClick = () => {
    if (onShowNotification) {
      onShowNotification('You have no unread clinical alerts.', 'info');
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          className="mobile-menu-btn" 
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        {/* Notifications button */}
        <button 
          className="topbar-btn" 
          id="btn-notifications" 
          aria-label="Notifications"
          onClick={handleNotificationsClick}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="topbar-badge"></span>
        </button>

        {/* User avatar with dropdown */}
        <div 
          className="topbar-avatar" 
          aria-label="User menu" 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          tabIndex={0}
        >
          {initial}
        </div>

        {dropdownOpen && (
          <div className="avatar-dropdown">
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-soft)', marginBottom: '4px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user?.email}</div>
            </div>
            <button 
              className="dropdown-item" 
              onClick={() => { onNavigate('settings'); setDropdownOpen(false); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Account Settings
            </button>
            <button 
              className="dropdown-item" 
              onClick={() => { onNavigate('records'); setDropdownOpen(false); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              </svg>
              My Records
            </button>
            <button 
              className="dropdown-item danger" 
              onClick={() => { setDropdownOpen(false); onLogout(); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
