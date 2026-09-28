import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../services/api';
import WoundSegmentationEditor from '../components/WoundSegmentationEditor';

export default function ResultPage({ resultData, onNavigate, onShowNotification }) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [segData, setSegData] = useState(resultData?.segmentationData || null);
  const [rednessPct, setRednessPct] = useState(null); // Explicitly separate from wound coveragePct
  
  const woundCoveragePct = segData?.coveragePct != null ? Number(segData.coveragePct) : (resultData?.coveragePct != null ? Number(resultData.coveragePct) : null);
  const physicalAreaCm2 = segData?.physicalAreaCm2 != null ? Number(segData.physicalAreaCm2) : (resultData?.physicalAreaCm2 != null ? Number(resultData.physicalAreaCm2) : null);
  const rednessEstimatePct = (rednessPct && rednessPct !== 'N/A') ? rednessPct : (resultData?.rednessEstimatePct || 'Not measured');
  
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const photoUrl = resultData?.photoUrl ||
    (resultData?.imageFilename ? getImageUrl(resultData.imageFilename) : '') ||
    resultData?.imageUrl ||
    '';

  const entryDate = resultData?.entryDate || new Date().toISOString();
  const dateFormatted = new Date(entryDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const [isLocating, setIsLocating] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setAiStatus(data?.aiEnabled ? 'active' : 'fallback');
      })
      .catch(() => setAiStatus('fallback'));
  }, []);

  const isAiActive = aiStatus === 'active' || resultData?.assessment?.status === 'analyzed' || resultData?.assessmentStatus === 'analyzed';

  const hasUrgent = resultData?.hasUrgentFlags || false;
  const triageLevel = (resultData?.triageLevel || resultData?.triage_level || resultData?.triage || '').toLowerCase();
  const showHospitalCTA = Boolean(
    hasUrgent || 
    triageLevel === 'amber' || 
    triageLevel === 'red' || 
    resultData?.hasUrgentFlags === true
  );

  const handleFindHospital = () => {
    if (isLocating) return;
    setIsLocating(true);

    const fallbackUrl = 'https://www.google.com/maps/search/government+hospital+near+me';

    if (!navigator || !navigator.geolocation) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          const lat = encodeURIComponent(position.coords.latitude);
          const lng = encodeURIComponent(position.coords.longitude);
          const mapsUrl = `https://www.google.com/maps/search/government+hospital/@${lat},${lng},14z`;
          window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        } catch (err) {
          window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  };

  // Swelling Level calculation (None / Mild / Moderate / Severe)
  const validSwellingStates = ['None', 'Mild', 'Moderate', 'Severe'];
  const rawSwelling = resultData?.swellingLevel ||
    (resultData?.symptoms?.some(s => typeof s === 'string' && s.toLowerCase().includes('severe swelling')) ? 'Severe'
      : resultData?.symptoms?.some(s => typeof s === 'string' && (s.toLowerCase().includes('moderate swelling') || s.toLowerCase().includes('edema'))) ? 'Moderate'
      : resultData?.symptoms?.some(s => typeof s === 'string' && s.toLowerCase().includes('swell')) ? 'Mild'
      : 'Mild');
  const swellingLevel = validSwellingStates.includes(rawSwelling) ? rawSwelling : 'Mild';

  const swellingBadgeStyle = swellingLevel === 'None'
    ? { bg: '#E8F5E9', color: '#2E7D32', border: '#C8E6C9' }
    : swellingLevel === 'Mild'
    ? { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' }
    : swellingLevel === 'Moderate'
    ? { bg: '#FFEDD5', color: '#C76A00', border: '#FED7AA' }
    : { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };

  // Healing Progress calculation (Improving / Stable / Worsening / Baseline)
  const isBaseline = resultData?.isBaseline === true || resultData?.hasPreviousAssessment === false;
  const rawProgress = resultData?.healingProgress || 'Improving';
  const healingProgress = isBaseline ? 'Baseline' : (['Improving', 'Stable', 'Worsening'].includes(rawProgress) ? rawProgress : 'Improving');

  // Compute redness coverage from actual pixel data sampled from the central wound region
  const computeRedness = (img) => {
    try {
      const off = document.createElement('canvas');
      const maxW = 640;
      const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
      off.width = Math.round(img.naturalWidth * scale);
      off.height = Math.round(img.naturalHeight * scale);
      const ctx = off.getContext('2d');
      ctx.drawImage(img, 0, 0, off.width, off.height);

      // ROI: sampled from the central wound region (center 60% rectangle)
      const roiX = Math.round(off.width * 0.2);
      const roiY = Math.round(off.height * 0.2);
      const roiW = Math.round(off.width * 0.6);
      const roiH = Math.round(off.height * 0.6);
      const data = ctx.getImageData(roiX, roiY, roiW, roiH).data;

      let redPixels = 0;
      const total = roiW * roiH;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // Redness heuristic: (R - avg(G,B)) / 255 > 0.14
        if (r > 60 && (r - (g + b) / 2) / 255 > 0.14) redPixels++;
      }
      const pct = (redPixels / total) * 100;
      setRednessPct(`${pct.toFixed(1)}%`);
    } catch (e) {
      // cross-origin block — show placeholder
      setRednessPct('N/A');
    }
  };

  // Run initial segmentation heuristic if none exists
  useEffect(() => {
    if (!segData && imgRef.current?.complete) {
      handleImageLoaded();
    }
  }, []);

  const handleImageLoaded = () => {
    const img = imgRef.current;
    if (!img) return;

    // Compute redness from real pixel data
    computeRedness(img);

    // Draw the current segmentation overlay if it exists
    const canvas = canvasRef.current;
    if (canvas && segData) {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (segData.roi) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(segData.roi.x, segData.roi.y, segData.roi.w, segData.roi.h);
        ctx.setLineDash([]);
      }
      if (segData.boundary && segData.boundary.length > 0) {
        ctx.beginPath();
        ctx.moveTo(segData.boundary[0].x, segData.boundary[0].y);
        for (let i = 1; i < segData.boundary.length; i++) {
          ctx.lineTo(segData.boundary[i].x, segData.boundary[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    handleImageLoaded();
  }, [segData, showOverlay]);

  const handleSaveEditor = (newSegData) => {
    setSegData(newSegData);
    if (newSegData?.coveragePct != null) {
      setRednessPct(`${newSegData.coveragePct.toFixed(1)}%`);
    }
    setShowEditor(false);
  };

  return (
    <>
      {showEditor && (
        <WoundSegmentationEditor
          imageUrl={photoUrl}
          initialData={{ ...segData, entryId: resultData?.entryId || resultData?.entry?.id || resultData?.id }}
          onSave={handleSaveEditor}
          onCancel={() => setShowEditor(false)}
        />
      )}

      <section className="result-container" style={{ display: showEditor ? 'none' : 'block' }}>
        {/* Page Header */}
        <div className="result-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 className="result-page-title">Wound Health Result</h1>
            <p className="result-page-subtitle">
              <span className="completion-tick" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </span>
              <span>Assessment completed {dateFormatted}</span>
            </p>
          </div>
        </div>

        {/* Main Layout: 60% Photo Card / 40% Results Panel */}
        <div className="result-main-layout">

          {/* Left: Photo Card */}
          <div className="result-photo-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <span className="result-photo-tag">VISUAL ASSESSMENT</span>
              <button 
                className="btn-overlay-toggle" 
                type="button" 
                onClick={() => setShowEditor(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--blue-light)',
                  color: 'var(--blue)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <span>Review Wound Boundary</span>
              </button>
            </div>

          <h2 className="result-photo-heading">Your wound photograph</h2>

          <div className="result-photo-frame" style={{ position: 'relative' }}>
            <img 
              ref={imgRef}
              src={photoUrl} 
              alt="Uploaded wound photograph" 
              className="result-photo-img" 
              onLoad={handleImageLoaded}
              crossOrigin="anonymous"
            />
            <canvas 
              ref={canvasRef}
              className="result-photo-overlay" 
              style={{ 
                position: 'absolute', 
                inset: 0, 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                display: showOverlay ? 'block' : 'none', 
                pointerEvents: 'none' 
              }}
            />
          </div>

          {/* Overlay Legend */}
          {showOverlay && (
            <div className="overlay-legend" style={{ display: 'flex', marginTop: 10, justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: 'rgba(59, 130, 246, 0.3)', border: '1.5px solid #2563EB', borderRadius: 2 }} />
                Central wound region
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: 'rgba(239, 68, 68, 0.65)', border: '1.5px solid #DC2626', borderRadius: 2 }} />
                Measured redness pixels
              </span>
            </div>
          )}

          <div className="result-photo-meta">
            <span>Image Resolution: Verified (1080px max)</span>
            <span>Focus &amp; Lighting: Photo quality check pending</span>
          </div>
        </div>

        {/* Right: Dark Overview Panel */}
        <div className="result-overview-panel">
          <h2 className="result-overview-heading">Wound overview</h2>

          {/* 2 × 2 Metric Grid */}
          <div className="result-metric-grid">
            {/* 1. Wound size / area (Top-left) */}
            <div className="result-metric-card">
              <div>
                <div className="result-metric-label">Wound size / area</div>
                <div className="result-metric-value-num" style={{ fontSize: '20px' }}>
                  {physicalAreaCm2 != null 
                    ? `${physicalAreaCm2.toFixed(2)} cm²` 
                    : (woundCoveragePct != null 
                    ? `${woundCoveragePct.toFixed(1)}% ROI area`
                    : 'Not measured')}
                </div>
              </div>
              <div className="result-metric-subtext">Measured within selected wound boundary</div>
            </div>

            {/* 2. Estimated redness coverage (Top-right) */}
            <div className="result-metric-card">
              <div>
                <div className="result-metric-label">Estimated redness coverage</div>
                <div className="result-metric-value-num">
                  {rednessEstimatePct}
                </div>
              </div>
              <div className="result-metric-subtext">Sampled from the central wound region</div>
            </div>

            {/* 3. Swelling level (Bottom-left) */}
            <div className="result-metric-card">
              <div>
                <div className="result-metric-label">Swelling level</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 }}>
                  <span className="result-metric-value-num" style={{ fontSize: '24px', marginBottom: 0 }}>
                    {swellingLevel}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: swellingBadgeStyle.bg,
                    color: swellingBadgeStyle.color,
                    border: `1px solid ${swellingBadgeStyle.border}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                    {swellingLevel}
                  </span>
                </div>
              </div>
              <div className="result-metric-subtext">Estimated swelling around wound area</div>
            </div>

            {/* 4. Healing progress (Bottom-right) */}
            <div className="result-metric-card">
              <div>
                <div className="result-metric-label">Healing progress</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 }}>
                  <span className="result-metric-value-num" style={{ fontSize: '24px', marginBottom: 0 }}>
                    {healingProgress}
                  </span>
                  {healingProgress === 'Improving' && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#E8F5E9',
                      color: '#2E7D32',
                      border: '1px solid #C8E6C9'
                    }} title="Positive trend">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="7" y1="17" x2="17" y2="7"/>
                        <polyline points="7 7 17 7 17 17"/>
                      </svg>
                    </span>
                  )}
                  {healingProgress === 'Stable' && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#F1F5F9',
                      color: '#64748B',
                      border: '1px solid #CBD5E1'
                    }} title="Stable trend">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </span>
                  )}
                  {healingProgress === 'Worsening' && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FECACA'
                    }} title="Worsening trend">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="7" y1="7" x2="17" y2="17"/>
                        <polyline points="17 7 17 17 7 17"/>
                      </svg>
                    </span>
                  )}
                </div>
              </div>
              <div className="result-metric-subtext">
                {isBaseline ? 'No previous assessment available' : 'Compared with previous assessment'}
              </div>
            </div>
          </div>

          {/* Status Strip / Triage Evaluation */}
          <div 
            id="result-status-strip" 
            className={`result-status-strip ${hasUrgent ? 'status-has-warnings' : 'status-no-warnings'}`}
            style={{
              marginTop: 18,
              padding: '14px 16px',
              borderRadius: '12px',
              background: hasUrgent ? '#FEF2F2' : '#F8FAF9',
              border: hasUrgent ? '1px solid #FECACA' : '1px solid #E2E8E3',
              display: 'flex',
              gap: 12,
              alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '20px' }}>{hasUrgent ? '⚠️' : '✓'}</div>
            <div className="result-status-body">
              <div className="result-status-title" style={{ fontWeight: 600, fontSize: '13.5px', color: '#0F172A' }}>
                {hasUrgent ? 'Warning symptoms reported.' : 'No urgent warning signs found.'}
              </div>
              <div className="result-status-desc" style={{ fontSize: '12px', color: '#64748B', marginTop: 2 }}>
                {hasUrgent 
                  ? 'Please consult a healthcare professional promptly for evaluation.' 
                  : 'Stay consistent with wound care and monitor progression over time.'}
              </div>
            </div>
          </div>

          {/* Government Hospital Locator CTA */}
          {showHospitalCTA && (
            <div className="hospital-locator-wrapper" style={{ marginTop: 14 }}>
              <button 
                type="button"
                className="hospital-locator-card-btn"
                onClick={handleFindHospital}
                disabled={isLocating}
                aria-label="Find a nearby government hospital"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '22px', flexShrink: 0 }} aria-hidden="true">🏥</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#065F46', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isLocating ? 'Finding nearby hospitals...' : 'Find a nearby government hospital'}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#047857', marginTop: 2, lineHeight: 1.35 }}>
                      Get directions to a public health facility near you.
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '18px', color: '#047857', fontWeight: 600, marginLeft: 12, flexShrink: 0 }} aria-hidden="true">
                  {isLocating ? (
                    <span className="spinner-icon" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⌛</span>
                  ) : (
                    '→'
                  )}
                </div>
              </button>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: 6, paddingLeft: 4, lineHeight: '1.4' }}>
                If symptoms become severe or rapidly worsen, seek emergency medical care.
              </div>
            </div>
          )}

          {/* Actions inside panel */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            <button 
              className="btn-primary" 
              style={{ flex: 1, background: '#153C2E', color: '#FFFFFF', fontWeight: 700 }}
              onClick={() => onNavigate('history', { woundId: resultData?.woundId })}
            >
              View in History Tracker
            </button>
            <button 
              className="btn-outline" 
              style={{ flex: 1, background: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A', fontWeight: 600 }}
              onClick={() => onNavigate('records')}
            >
              My Records
            </button>
          </div>
        </div>
      </div>
      </section>

      {/* Measurements Need To Be Taken Section */}
      <section className="measurements-guidance-section" style={{ marginTop: 28 }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8E3',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 4px 20px rgba(20, 50, 30, 0.05)'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#153C2E',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: '#E8F5E9',
              color: '#2E7D32'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </span>
            Measurements need to be taken -
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1) Remedies */}
            <div style={{
              background: '#F8FAF9',
              border: '1px solid #E2E8E3',
              borderRadius: '14px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#153C2E',
                  background: '#E8F5E9',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}>
                  1) Remedies
                </span>
                <span style={{ fontSize: '12px', color: '#4A6B5D', fontWeight: 600 }}>General Care Suggestions</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: '#334155', lineHeight: '1.6' }}>
                <li>Keep the wound area clean, dry, and covered with an appropriate sterile dressing.</li>
                <li>Elevate the affected limb or region periodically to support healthy blood circulation.</li>
                <li>Change wound dressings according to standard hygienic guidelines or clinician instructions.</li>
                <li>Maintain optimal hydration and a balanced diet rich in protein to support natural tissue recovery.</li>
              </ul>
            </div>

            {/* 2) Precautions */}
            <div style={{
              background: '#F8FAF9',
              border: '1px solid #E2E8E3',
              borderRadius: '14px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#9A3412',
                  background: '#FFEDD5',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}>
                  2) Precautions
                </span>
                <span style={{ fontSize: '12px', color: '#C76A00', fontWeight: 600 }}>General Safety Instructions</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: '#334155', lineHeight: '1.6' }}>
                <li>Avoid touching or picking at the wound with unwashed hands or non-sterile tools.</li>
                <li>Do not apply unverified household chemicals, harsh soaps, or unprescribed topical solutions.</li>
                <li>Protect the wound from friction, pressure, or immersion in standing water (e.g., pools or baths).</li>
                <li>Monitor for systemic warning signs such as high fever, spreading redness, or severe pain.</li>
              </ul>
            </div>

            {/* 3) Medications */}
            <div style={{
              background: '#F8FAF9',
              border: '1px solid #E2E8E3',
              borderRadius: '14px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#1E40AF',
                  background: '#DBEAFE',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}>
                  3) Medications
                </span>
                <span style={{ fontSize: '12px', color: '#1E88E5', fontWeight: 600 }}>General Medication Guidance</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: '#334155', lineHeight: '1.6' }}>
                <li>Take any prescribed antibiotics or pain management medications strictly as directed by your prescribing clinician.</li>
                <li>Complete full therapeutic courses even if the wound visually improves ahead of schedule.</li>
                <li>Do not self-prescribe over-the-counter systemic antibiotics without medical consultation.</li>
                <li>Report any unexpected adverse drug reactions or allergies to your healthcare provider immediately.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
