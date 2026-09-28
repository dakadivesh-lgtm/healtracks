import React from 'react';
import { getImageUrl } from '../services/api';

export default function WoundCard({ upload, onSelect }) {
  const formattedDate = upload.entryDate
    ? new Date(upload.entryDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Recent';

  const imageUrl = getImageUrl(upload.imageFilename);

  return (
    <div className="wound-card" onClick={() => onSelect(upload.woundId)}>
      <div className="wound-card-img-wrap">
        <img 
          src={imageUrl} 
          alt={upload.woundTitle} 
          className="wound-card-img"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <span className="wound-badge wound-badge--neutral">
          {upload.assessmentSummary || 'Analysis not configured'}
        </span>
      </div>

      <div className="wound-card-body">
        <h4 className="wound-card-title">{upload.woundTitle}</h4>
        <div className="wound-card-loc">📍 {upload.woundLocation || 'Unspecified site'}</div>
        {upload.notes ? (
          <p className="wound-card-notes">{upload.notes}</p>
        ) : (
          <p className="wound-card-notes" style={{ color: 'var(--text-muted)' }}>No notes provided</p>
        )}

        <div className="wound-card-footer">
          <span>{upload.isFollowup ? 'Follow-up Photo' : 'Baseline Photo'}</span>
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
}
