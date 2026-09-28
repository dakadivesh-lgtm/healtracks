import React from 'react';

export default function Sidebar({ currentPage, setCurrentPage, user, mobileOpen, setMobileOpen, onLogout }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#4A90D9"/>
          <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#4A90D9" opacity="0.45"/>
          <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#4A90D9" opacity="0.45"/>
          <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#4A90D9" opacity="0.45"/>
        </svg>
      )
    },
    {
      id: 'upload',
      label: 'Upload Wound',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#7EB4E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="17 8 12 3 7 8" stroke="#7EB4E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="3" x2="12" y2="15" stroke="#7EB4E8" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: 'history',
      label: 'History Tracker',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="#7EB4E8" strokeWidth="2"/>
          <polyline points="12 7 12 12 15 15" stroke="#7EB4E8" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: 'records',
      label: 'My Records',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#7EB4E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="14 2 14 8 20 8" stroke="#7EB4E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="16" y1="13" x2="8" y2="13" stroke="#7EB4E8" strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="17" x2="8" y2="17" stroke="#7EB4E8" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="#7EB4E8" strokeWidth="2"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#7EB4E8" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="17" r="0.5" fill="#7EB4E8" stroke="#7EB4E8" strokeWidth="1"/>
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="3" stroke="#7EB4E8" strokeWidth="2"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="#7EB4E8" strokeWidth="2"/>
        </svg>
      )
    }
  ];

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <div 
        className="sidebar-brand" 
        onClick={() => { setCurrentPage('landing'); setMobileOpen(false); }}
      >
        <div className="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4A90D9" opacity="0.18"/>
            <path d="M12 6v6l4 2" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 12h6M12 9v6" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="brand-name">WoundWise</span>
      </div>

      {/* Nav list */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              id={`nav-${item.id}`}
              onClick={() => {
                setCurrentPage(item.id);
                setMobileOpen(false);
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer User Chip */}
      <div className="sidebar-footer">
        <div 
          className="user-chip"
          onClick={() => { setCurrentPage('settings'); setMobileOpen(false); }}
          title="Account Settings"
        >
          <div className="user-avatar" aria-hidden="true">{initial}</div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Patient User'}</span>
            <span className="user-role">{user?.role || 'Patient'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
