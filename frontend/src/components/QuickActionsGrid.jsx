import React from 'react';

export default function QuickActionsGrid({ onNavigate }) {
  const cards = [
    {
      id: 'qcard-upload',
      target: 'upload',
      iconClass: 'qcard-icon--blue',
      title: 'Upload Wound',
      desc: 'Capture or upload a photo of your wound for documentation and analysis.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="17 8 12 3 7 8" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="3" x2="12" y2="15" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: 'qcard-history',
      target: 'history',
      iconClass: 'qcard-icon--teal',
      title: 'History Tracker',
      desc: 'Review your past assessments and monitor healing progress over time.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#38B2AC" strokeWidth="2"/>
          <polyline points="12 7 12 12 15 15" stroke="#38B2AC" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: 'qcard-records',
      target: 'records',
      iconClass: 'qcard-icon--purple',
      title: 'My Records',
      desc: 'Access your medical records, reports, and private wound documentation.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="14 2 14 8 20 8" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="16" y1="13" x2="8" y2="13" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="17" x2="8" y2="17" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: 'qcard-help',
      target: 'help',
      iconClass: 'qcard-icon--orange',
      title: 'Help & Support',
      desc: 'Get answers, contact support, or browse the help centre resources.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#F59E0B" strokeWidth="2"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="17" r="0.5" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1"/>
        </svg>
      )
    }
  ];

  return (
    <div className="quick-grid" role="list" aria-label="Quick actions">
      {cards.map((card) => (
        <div
          key={card.id}
          className="quick-card"
          id={card.id}
          role="listitem"
          onClick={() => onNavigate(card.target)}
        >
          <div className={`qcard-icon ${card.iconClass}`} aria-hidden="true">
            {card.icon}
          </div>
          <div className="qcard-body">
            <h4 className="qcard-title">{card.title}</h4>
            <p className="qcard-desc">{card.desc}</p>
          </div>
          <div className="qcard-arrow" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
