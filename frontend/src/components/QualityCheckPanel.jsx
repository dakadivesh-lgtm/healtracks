import React from 'react';

export default function QualityCheckPanel({ qualityMetrics }) {
  if (!qualityMetrics) {
    return (
      <div className="quality-panel" style={{ padding: '12px 14px', background: '#F8FAF9', borderRadius: '10px', border: '1px solid #E2E8E3', marginTop: 12 }}>
        <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
          📷 Photo Quality Status: <span style={{ color: '#475569', fontWeight: 500 }}>Photo quality check pending</span>
        </div>
      </div>
    );
  }

  const isSharpMeasured = qualityMetrics.sharpnessScore != null || qualityMetrics.sharpnessMeasured === true;
  const isLightingMeasured = qualityMetrics.lightingOk != null;

  return (
    <div className="quality-panel">
      <div className="quality-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Image Quality Verification
      </div>

      <div className="quality-grid">
        <div className="quality-item">
          <span>📐 Resolution:</span>
          <span className={qualityMetrics.resolutionOk ? 'quality-icon--ok' : 'quality-icon--warn'}>
            {qualityMetrics.width && qualityMetrics.height 
              ? `${qualityMetrics.width}×${qualityMetrics.height}px (${qualityMetrics.resolutionOk ? 'Sufficient' : 'Low Res'})`
              : 'Photo quality check pending'}
          </span>
        </div>

        <div className="quality-item">
          <span>🔍 Focus &amp; Clarity:</span>
          <span className={isSharpMeasured ? (qualityMetrics.sharp ? 'quality-icon--ok' : 'quality-icon--warn') : 'quality-icon--neutral'}>
            {isSharpMeasured 
              ? (qualityMetrics.sharp ? '✓ Measured Clear' : '⚠ Blur detected') 
              : 'Photo quality check pending'}
          </span>
        </div>

        <div className="quality-item">
          <span>💡 Lighting:</span>
          <span className={isLightingMeasured ? (qualityMetrics.lightingOk ? 'quality-icon--ok' : 'quality-icon--warn') : 'quality-icon--neutral'}>
            {isLightingMeasured 
              ? (qualityMetrics.lightingOk ? '✓ Balanced' : qualityMetrics.tooDark ? '⚠ Too dark' : '⚠ Too bright') 
              : 'Photo quality check pending'}
          </span>
        </div>
      </div>
    </div>
  );
}
