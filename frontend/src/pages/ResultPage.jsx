import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../services/api';
import WoundSegmentationEditor from '../components/WoundSegmentationEditor';
import {
  calculateWoundCoverage,
  calculatePhysicalArea,
  calculateRelativeRedness
} from '../utils/measurementEngine';

export default function ResultPage({ resultData, onNavigate, onShowNotification }) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [segData, setSegData] = useState(resultData?.segmentationData || null);
  const [rednessInfo, setRednessInfo] = useState(null);
  
  // Interactive expand/collapse state for General Wound Care cards
  const [expandedCards, setExpandedCards] = useState({
    remedies: false,
    precautions: false,
    medications: false
  });

  const toggleCard = (cardKey) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }));
  };

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

  // Requirement 7: Swelling from user symptoms; otherwise "Not reported"
  const hasSymptomData = Array.isArray(resultData?.symptoms);
  const swellingSymptom = hasSymptomData
    ? resultData.symptoms.find(s => typeof s === 'string' && s.toLowerCase().includes('swell'))
    : null;

  const swellingLevel = resultData?.swellingLevel
    ? resultData.swellingLevel
    : swellingSymptom
    ? (swellingSymptom.toLowerCase().includes('severe') ? 'Severe' : swellingSymptom.toLowerCase().includes('moderate') ? 'Moderate' : 'Mild')
    : (hasSymptomData ? 'None' : 'Not reported');

  const swellingBadgeStyle = swellingLevel === 'None'
    ? { bg: '#E8F5E9', color: '#2E7D32', border: '#C8E6C9' }
    : swellingLevel === 'Mild'
    ? { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' }
    : swellingLevel === 'Moderate'
    ? { bg: '#FFEDD5', color: '#C76A00', border: '#FED7AA' }
    : swellingLevel === 'Severe'
    ? { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' }
    : { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' };

  // Requirement 7: Healing Progress from valid comparisonService; otherwise "Baseline" or "Not enough data"
  const isBaseline = resultData?.isBaseline === true || resultData?.hasPreviousAssessment === false;
  const rawProgress = resultData?.healingProgress;
  const healingProgress = isBaseline
    ? 'Baseline'
    : (['Improving', 'Stable', 'Worsening'].includes(rawProgress) ? rawProgress : 'Not enough data');

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

  // Perform CIELAB relative redness analysis on image load
  const runEngineAnalysis = (img) => {
    try {
      const off = document.createElement('canvas');
      const maxW = 1080;
      const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
      off.width = Math.round(img.naturalWidth * scale);
      off.height = Math.round(img.naturalHeight * scale);
      const ctx = off.getContext('2d');
      ctx.drawImage(img, 0, 0, off.width, off.height);

      const imgData = ctx.getImageData(0, 0, off.width, off.height);

      const refSkin = segData?.referenceSkinRegion || {
        x: Math.round(off.width * 0.05),
        y: Math.round(off.height * 0.05),
        w: Math.round(off.width * 0.15),
        h: Math.round(off.height * 0.15)
      };

      const res = calculateRelativeRedness({
        imageData: imgData,
        imageWidth: off.width,
        imageHeight: off.height,
        boundary: segData?.boundary || [],
        referenceSkinRegion: refSkin,
        isConfirmed: Boolean(segData?.isConfirmed),
        isNoWoundConfirmed: Boolean(segData?.isNoWoundConfirmed)
      });

      setRednessInfo(res);
    } catch (e) {
      setRednessInfo({
        rednessPct: null,
        displayText: 'Not measured (cross-origin restriction)',
        status: 'error'
      });
    }
  };

  const handleImageLoaded = () => {
    const img = imgRef.current;
    if (!img) return;

    runEngineAnalysis(img);

    // Render canvas overlay
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scaleX = img.width / (img.naturalWidth || img.width);
      const scaleY = img.height / (img.naturalHeight || img.height);

      if (segData?.roi) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(
          segData.roi.x * scaleX,
          segData.roi.y * scaleY,
          segData.roi.w * scaleX,
          segData.roi.h * scaleY
        );
        ctx.setLineDash([]);
      }

      if (!segData?.isNoWoundConfirmed && segData?.boundary && segData.boundary.length > 0) {
        ctx.beginPath();
        ctx.moveTo(segData.boundary[0].x * scaleX, segData.boundary[0].y * scaleY);
        for (let i = 1; i < segData.boundary.length; i++) {
          ctx.lineTo(segData.boundary[i].x * scaleX, segData.boundary[i].y * scaleY);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      if (segData?.referenceSkinRegion) {
        ctx.strokeStyle = '#0D9488';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          segData.referenceSkinRegion.x * scaleX,
          segData.referenceSkinRegion.y * scaleY,
          segData.referenceSkinRegion.w * scaleX,
          segData.referenceSkinRegion.h * scaleY
        );
        ctx.setLineDash([]);
      }
    }
  };

  useEffect(() => {
    handleImageLoaded();
  }, [segData, showOverlay]);

  const handleSaveEditor = (newSegData, savedResponse) => {
    setSegData(newSegData);
    if (newSegData.rednessData) {
      setRednessInfo(newSegData.rednessData);
    }
    if (savedResponse?.entry && resultData) {
      resultData.coveragePct = savedResponse.entry.coverage_pct;
      resultData.physicalAreaCm2 = savedResponse.entry.wound_area_cm2;
      resultData.segmentationData = savedResponse.entry.segmentation_data;
      resultData.comparisonData = savedResponse.comparison;
    }
    if (onShowNotification) {
      onShowNotification('Wound boundary and measurements confirmed and saved.', 'success');
    }
    setShowEditor(false);
  };

  // Determine measurement displays based on engine output
  const coverageData = calculateWoundCoverage({
    roi: segData?.roi,
    boundary: segData?.boundary,
    isConfirmed: Boolean(segData?.isConfirmed),
    isNoWoundConfirmed: Boolean(segData?.isNoWoundConfirmed)
  });

  const physicalData = calculatePhysicalArea({
    woundAreaPx: coverageData.woundAreaPx,
    scaleLine: segData?.scaleLine,
    isScaleConfirmed: Boolean(segData?.isScaleConfirmed),
    isNoWoundConfirmed: Boolean(segData?.isNoWoundConfirmed)
  });

  const rednessDisplayText = segData?.rednessDisplayText || rednessInfo?.displayText || 'Not measured — confirm wound boundary';

  return (
    <>
      {showEditor && (
        <WoundSegmentationEditor
          imageUrl={photoUrl}
          initialData={segData}
          entryId={resultData?.entryId || resultData?.id || resultData?.entry?.id}
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  className="btn-overlay-toggle" 
                  onClick={() => setShowOverlay(!showOverlay)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: showOverlay ? 'var(--blue-light)' : 'var(--card-bg)',
                    color: showOverlay ? 'var(--blue)' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span>{showOverlay ? 'Hide Overlay' : 'Show Overlay'}</span>
                </button>
                <button 
                  className="btn-review-boundary" 
                  onClick={() => setShowEditor(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--blue)',
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
                  <span style={{ width: 12, height: 12, border: '1.5px dashed #F59E0B', borderRadius: 2 }} />
                  Assessment ROI
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, background: 'rgba(239, 68, 68, 0.3)', border: '1.5px solid #EF4444', borderRadius: 2 }} />
                  Confirmed Wound
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, background: 'rgba(13, 148, 136, 0.2)', border: '1.5px dashed #0D9488', borderRadius: 2 }} />
                  Skin Reference
                </span>
              </div>
            )}

            <div className="result-photo-meta">
              <span>Image Resolution: Verified (1080px max)</span>
              <span>Coordinate Space: Native Source Pixels</span>
            </div>
          </div>

          {/* Right: Overview Panel */}
          <div className="result-overview-panel">
            <h2 className="result-overview-heading">Wound overview</h2>

            {/* 2 × 2 Metric Grid */}
            <div className="result-metric-grid">
              {/* 1. Wound size / area (Top-left) */}
              <div className="result-metric-card">
                <div>
                  <div className="result-metric-label">Wound size / area</div>
                  <div className="result-metric-value-num" style={{ fontSize: '18px' }}>
                    {physicalData.areaCm2 != null 
                      ? `${physicalData.areaCm2.toFixed(2)} cm²` 
                      : (coverageData.coveragePct != null 
                      ? `${coverageData.coveragePct.toFixed(1)}% ROI area`
                      : coverageData.displayText)}
                  </div>
                </div>
                <div className="result-metric-subtext">
                  {physicalData.areaCm2 != null 
                    ? 'Calibrated 2D physical area' 
                    : (coverageData.coveragePct != null 
                    ? coverageData.displayText 
                    : physicalData.displayText)}
                </div>
              </div>

              {/* 2. Estimated redness coverage (Top-right) */}
              <div className="result-metric-card">
                <div>
                  <div className="result-metric-label">Red-colour coverage (estimate)</div>
                  <div className="result-metric-value-num" style={{ fontSize: '18px' }}>
                    {rednessDisplayText}
                  </div>
                </div>
                <div className="result-metric-subtext">
                  CIELAB relative vs healthy skin reference
                </div>
              </div>

              {/* 3. Swelling level (Bottom-left) */}
              <div className="result-metric-card">
                <div>
                  <div className="result-metric-label">Swelling level</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 }}>
                    <span className="result-metric-value-num" style={{ fontSize: '20px', marginBottom: 0 }}>
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
                <div className="result-metric-subtext">Reported in symptom questionnaire</div>
              </div>

              {/* 4. Healing progress (Bottom-right) */}
              <div className="result-metric-card">
                <div>
                  <div className="result-metric-label">Healing progress</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 }}>
                    <span className="result-metric-value-num" style={{ fontSize: '20px', marginBottom: 0 }}>
                      {healingProgress}
                    </span>
                  </div>
                </div>
                <div className="result-metric-subtext">
                  {isBaseline ? 'No previous assessment available' : 'Validated comparison result'}
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
                alignItems: 'flex-start',
                gap: 12
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: hasUrgent ? '#FEE2E2' : '#D1FAE5',
                color: hasUrgent ? '#DC2626' : '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {hasUrgent ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: hasUrgent ? '#991B1B' : '#065F46', marginBottom: 2 }}>
                  {hasUrgent ? 'Urgent Symptom Flags Present' : 'Symptom Triage Complete'}
                </h3>
                <p style={{ fontSize: '12px', color: hasUrgent ? '#7F1D1D' : '#047857', lineHeight: 1.4 }}>
                  {hasUrgent 
                    ? 'One or more urgent signs reported. Seek prompt professional evaluation.' 
                    : 'No urgent triage flags recorded in questionnaire. Continue monitoring.'}
                </p>
              </div>
            </div>

            {showHospitalCTA && (
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={handleFindHospital}
                  disabled={isLocating}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: isLocating ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>{isLocating ? 'Locating Nearby Hospital...' : 'Find Nearest Hospital'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* General Wound Care Section (Positioned directly below the two panels) */}
        <div className="general-wound-care-section" style={{ marginTop: 36, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '22px' }}>🩹</span>
              <span>General Wound Care</span>
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
              General educational guidance for minor cuts and grazes. This information is for general reference and is separate from your individual assessment findings.
            </p>
          </div>

          {/* 3 Equal-width Feature Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            marginBottom: 20
          }}>
            {/* Card 1: Remedies (Green Accents) */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '12px',
                    background: '#E8F5E9',
                    color: '#059669',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="6" width="18" height="12" rx="2"/>
                      <circle cx="12" cy="12" r="2"/>
                      <line x1="8" y1="12" x2="8.01" y2="12"/>
                      <line x1="16" y1="12" x2="16.01" y2="12"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Remedies</h3>
                    <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>First Aid &amp; Care</span>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: 14 }}>
                  General care steps for minor cuts and grazes once active bleeding has stopped:
                </p>

                <ul style={{ paddingLeft: 18, margin: 0, fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Wash hands:</strong> Clean hands thoroughly with soap and water before touching the wound area.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Gently rinse:</strong> Rinse the wound gently with clean tap water or saline to clear dirt and debris.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Apply dressing:</strong> Cover with a clean, sterile plaster or dressing; keep dry and replace when wet.
                  </li>
                </ul>

                {expandedCards.remedies && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px stroke #E2E8F0', fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                    <p style={{ marginBottom: 6 }}>
                      • Avoid scrubbing the wound bed vigorously to protect new healing tissue.
                    </p>
                    <p style={{ marginBottom: 6 }}>
                      • Avoid harsh chemical antiseptics like hydrogen peroxide or undiluted alcohol, which can irritate delicate skin.
                    </p>
                    <p>
                      • Replace dressings daily or sooner if blood or fluid soaks through.
                    </p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => toggleCard('remedies')}
                  aria-expanded={expandedCards.remedies}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>{expandedCards.remedies ? 'Hide details' : 'View details'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedCards.remedies ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Card 2: Precautions (Amber Accents) */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '12px',
                    background: '#FEF3C7',
                    color: '#D97706',
                    border: '1px solid #FDE68A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Precautions</h3>
                    <span style={{ fontSize: '11.5px', color: '#D97706', fontWeight: 600 }}>Urgent Signs</span>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: 14 }}>
                  Key warning signs requiring prompt clinical evaluation or emergency medical attention:
                </p>

                <ul style={{ paddingLeft: 18, margin: 0, fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Infection warning signs:</strong> Watch for spreading redness, worsening pain, swelling, or fever.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Pus &amp; discharge:</strong> Yellow/green discharge or bad odor indicates infection requiring medical care.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Emergency red flags:</strong> Uncontrolled bleeding, gaping wounds, or bites require emergency care.
                  </li>
                </ul>

                {expandedCards.precautions && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px stroke #E2E8F0', fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                    <p style={{ marginBottom: 6 }}>
                      • Seek A&amp;E / emergency care if bleeding continues after 10 minutes of firm direct pressure.
                    </p>
                    <p style={{ marginBottom: 6 }}>
                      • Wounds caused by dirty/rusty objects or animal/human bites require urgent tetanus and antibiotic checks.
                    </p>
                    <p>
                      • High-risk patients (e.g., with diabetes) should seek medical review for any non-healing foot wound.
                    </p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => toggleCard('precautions')}
                  aria-expanded={expandedCards.precautions}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#D97706',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>{expandedCards.precautions ? 'Hide details' : 'View details'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedCards.precautions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Card 3: Medications (Blue Accents) */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '12px',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/>
                      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Medications</h3>
                    <span style={{ fontSize: '11.5px', color: '#2563EB', fontWeight: 600 }}>Pain &amp; Prescriptions</span>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: 14 }}>
                  General educational information regarding pain relief and prescription safety:
                </p>

                <ul style={{ paddingLeft: 18, margin: 0, fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Over-the-counter analgesics:</strong> Simple pain relief (e.g. paracetamol/ibuprofen) can help manage discomfort.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Pharmacist check:</strong> Always consult a pharmacist or clinician to verify suitability for your health.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Antibiotics require clinical prescription:</strong> Antibiotics require clinical assessment; never self-administer.
                  </li>
                </ul>

                {expandedCards.medications && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px stroke #E2E8F0', fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                    <p style={{ marginBottom: 6 }}>
                      • Never generate or take self-prescribed antibiotics without direct clinical examination.
                    </p>
                    <p style={{ marginBottom: 6 }}>
                      • Always read medication patient information leaflets for safe dosages and contraindications.
                    </p>
                    <p>
                      • <em>No prescriptions, dosages, or personalized medication recommendations are generated from wound photographs or image measurements.</em>
                    </p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => toggleCard('medications')}
                  aria-expanded={expandedCards.medications}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>{expandedCards.medications ? 'Hide details' : 'View details'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedCards.medications ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* NHS Educational Disclaimer Footer */}
          <div style={{
            textAlign: 'center',
            padding: '12px 16px',
            background: '#F8FAF9',
            borderRadius: '10px',
            border: '1px solid #E2E8E3',
            fontSize: '12px',
            color: '#64748B'
          }}>
            <span>
              General information only. Follow your healthcare professional’s advice. Content reference: {' '}
              <a 
                href="https://www.nhs.uk/conditions/cuts-and-grazes/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'underline' }}
              >
                NHS — Cuts and grazes
              </a>
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
