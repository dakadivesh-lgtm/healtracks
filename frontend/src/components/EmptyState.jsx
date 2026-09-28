import React from 'react';

export default function EmptyState({ onUploadClick }) {
  return (
    <div className="no-tests-wrapper">
      <div className="no-tests-card" role="status" aria-label="No tests available">
        <div className="no-tests-icon" aria-hidden="true">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#EBF3FC"/>
            <path d="M9 12h6M12 9v6" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="no-tests-title">No Tests</h3>
        <p className="no-tests-desc">
          You have no wound assessments yet.<br />
          Upload your first wound image to get started.
        </p>
        <button 
          className="btn-primary" 
          id="btn-start-upload"
          onClick={onUploadClick}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Upload Wound Image
        </button>
      </div>
    </div>
  );
}
