import React, { useState, useRef, useEffect, Component } from 'react';
import { getImageUrl } from '../services/api';

/* ─── Error Boundary ──────────────────────────────────────────────────── */
class CompareErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ImageCompareModal] Uncaught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32,
            maxWidth: 420, textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.18)'
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8, color: '#0F172A' }}>
              Couldn't display this comparison
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
              An unexpected error occurred while rendering the comparison view.
            </p>
            <button
              type="button"
              onClick={this.props.onClose}
              style={{
                padding: '8px 24px', borderRadius: 8, border: 'none',
                background: '#153C2E', color: '#fff', fontWeight: 700, cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

/** Format recorded values without defaulting missing clinical data to Normal/No/0 */
function formatRecordedValue(value) {
  if (value === undefined || value === null || value === '') {
    return 'Not recorded';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

/** Format pain score */
function formatPain(val) {
  if (val === undefined || val === null || val === '') return 'Not recorded';
  const num = Number(val);
  if (Number.isNaN(num)) return 'Not recorded';
  return `${num} / 10`;
}

/** Format wound size */
function formatSize(entry) {
  if (entry?.wound_area_cm2 != null && !Number.isNaN(Number(entry.wound_area_cm2)) && Number(entry.wound_area_cm2) > 0) {
    return `${Number(entry.wound_area_cm2).toFixed(1)} cm²`;
  }
  if (entry?.coverage_pct != null && !Number.isNaN(Number(entry.coverage_pct))) {
    return `${Number(entry.coverage_pct).toFixed(1)}%`;
  }
  return 'Not measured';
}

/** Defensive date formatter */
function formatDate(value) {
  if (!value) return 'Date unavailable';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Date unavailable';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Check if two date strings fall on the same calendar day */
function isSameCalendarDay(d1Str, d2Str) {
  if (!d1Str || !d2Str) return false;
  const d1 = new Date(d1Str);
  const d2 = new Date(d2Str);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return false;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/** Returns image URL only when filename is valid */
function getSafeImageUrl(entry) {
  const filename = entry?.image_filename;
  if (typeof filename !== 'string' || !filename.trim()) return null;
  return getImageUrl(filename);
}

/* ─── Photo Card ──────────────────────────────────────────────────────── */
function PhotoCard({ label, dateStr, dayLabel, entry, accentColor }) {
  const [imgError, setImgError] = useState(false);
  const src = getSafeImageUrl(entry);

  const sizeText = formatSize(entry);
  const painText = formatPain(entry?.pain_score);
  const rednessText = formatRecordedValue(entry?.redness_status);
  const swellingText = formatRecordedValue(entry?.swelling_level);

  return (
    <div className="compare-card" style={{
      background: '#F8FAF9', border: '1px solid #E2E8E3',
      borderRadius: 14, padding: 16
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, marginBottom: 8, textTransform: 'uppercase' }}>
        {dayLabel}
      </div>

      {src && !imgError ? (
        <img
          src={src}
          alt={label}
          className="compare-img"
          style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 10, display: 'block' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: '100%', height: 240, borderRadius: 10,
          background: '#EEF3EF', border: '1px dashed #CBD5E1',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#94A3B8', fontSize: 13
        }}>
          <span style={{ fontSize: 28, marginBottom: 8 }}>🖼️</span>
          Photo unavailable
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 13, color: '#334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div><strong>Size:</strong> {sizeText}</div>
        <div><strong>Pain:</strong> {painText}</div>
        <div><strong>Redness:</strong> {rednessText}</div>
        <div><strong>Swelling:</strong> {swellingText}</div>
      </div>
    </div>
  );
}

/* ─── Main Modal Inner ────────────────────────────────────────────────── */
function CompareModalInner({ onClose, entryA, entryB }) {
  const [showOverlayMode, setShowOverlayMode] = useState(false);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // Determine baseline vs follow-up
  const dayA = entryA?.followup_day ?? (entryA?.is_followup ? 3 : 1);
  const dayB = entryB?.followup_day ?? (entryB?.is_followup ? 3 : 1);
  const baseline = dayA <= dayB ? entryA : entryB;
  const followup  = baseline === entryA ? entryB : entryA;

  const followupDayNum = followup?.followup_day ?? (followup?.is_followup ? 3 : (dayA <= dayB ? dayB : dayA));
  const sameDayDemo = isSameCalendarDay(baseline?.entry_date || baseline?.created_at, followup?.entry_date || followup?.created_at);

  const baselineDayTag = 'DAY 1 — BASELINE';
  const followupDayTag = sameDayDemo
    ? `DAY ${followupDayNum} — DEMO FOLLOW-UP`
    : `DAY ${followupDayNum} — FOLLOW-UP`;

  // Parse segmentation data
  const parseSegData = (entry) => {
    if (!entry) return null;
    let seg = entry.segmentation_data;
    if (typeof seg === 'string') {
      try { seg = JSON.parse(seg); } catch { seg = null; }
    }
    return seg || null;
  };

  const segA = parseSegData(baseline);
  const segB = parseSegData(followup);

  const boundaryA = segA?.boundary || segA?.segmentation_boundary;
  const boundaryB = segB?.boundary || segB?.segmentation_boundary;

  const hasBoundaryA = Array.isArray(boundaryA) && boundaryA.length > 2;
  const hasBoundaryB = Array.isArray(boundaryB) && boundaryB.length > 2;
  const canCompareOutlines = hasBoundaryA && hasBoundaryB;

  // Draw canvas outlines with normalized scaling
  useEffect(() => {
    if (!showOverlayMode || !canCompareOutlines) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    canvas.width = img.clientWidth || img.naturalWidth || 640;
    canvas.height = img.clientHeight || img.naturalHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const imgW_A = segA?.imageWidth || (img.naturalWidth || canvas.width);
    const imgH_A = segA?.imageHeight || (img.naturalHeight || canvas.height);
    const scaleX_A = canvas.width / imgW_A;
    const scaleY_A = canvas.height / imgH_A;

    const imgW_B = segB?.imageWidth || (img.naturalWidth || canvas.width);
    const imgH_B = segB?.imageHeight || (img.naturalHeight || canvas.height);
    const scaleX_B = canvas.width / imgW_B;
    const scaleY_B = canvas.height / imgH_B;

    if (boundaryA && boundaryA.length > 2) {
      ctx.beginPath();
      ctx.moveTo(boundaryA[0].x * scaleX_A, boundaryA[0].y * scaleY_A);
      for (let i = 1; i < boundaryA.length; i++) {
        ctx.lineTo(boundaryA[i].x * scaleX_A, boundaryA[i].y * scaleY_A);
      }
      ctx.closePath();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (boundaryB && boundaryB.length > 2) {
      ctx.beginPath();
      ctx.moveTo(boundaryB[0].x * scaleX_B, boundaryB[0].y * scaleY_B);
      for (let i = 1; i < boundaryB.length; i++) {
        ctx.lineTo(boundaryB[i].x * scaleX_B, boundaryB[i].y * scaleY_B);
      }
      ctx.closePath();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }, [showOverlayMode, canCompareOutlines, segA, segB, boundaryA, boundaryB]);

  // Size change calculation
  let sizeChangeText = 'Size comparison unavailable';
  const cm2_A = baseline?.wound_area_cm2 != null ? Number(baseline.wound_area_cm2) : null;
  const cm2_B = followup?.wound_area_cm2 != null ? Number(followup.wound_area_cm2) : null;

  const cov_A = baseline?.coverage_pct != null ? Number(baseline.coverage_pct) : null;
  const cov_B = followup?.coverage_pct != null ? Number(followup.coverage_pct) : null;

  if (cm2_A && cm2_B && cm2_A > 0) {
    const pct = ((cm2_B - cm2_A) / cm2_A) * 100;
    const rounded = Math.round(Math.abs(pct));
    if (pct < 0) sizeChangeText = `↓ ${rounded}% smaller`;
    else if (pct > 0) sizeChangeText = `↑ ${rounded}% larger`;
    else sizeChangeText = 'No change';
  } else if (cm2_A == null && cm2_B == null && cov_A && cov_B && cov_A > 0) {
    const pct = ((cov_B - cov_A) / cov_A) * 100;
    const rounded = Math.round(Math.abs(pct));
    if (pct < 0) sizeChangeText = `↓ ${rounded}% smaller`;
    else if (pct > 0) sizeChangeText = `↑ ${rounded}% larger`;
    else sizeChangeText = 'No change';
  }

  // Pain Change
  const pain1 = baseline?.pain_score;
  const pain3 = followup?.pain_score;
  let painChangeVal = 'Not recorded';
  let painChangeStatus = null;

  if (pain1 != null && pain3 != null && !Number.isNaN(Number(pain1)) && !Number.isNaN(Number(pain3))) {
    const p1 = Number(pain1);
    const p3 = Number(pain3);
    painChangeVal = `${p1} → ${p3}`;
    painChangeStatus = p3 < p1 ? 'Improved' : p3 > p1 ? 'Worsened' : 'No change';
  } else if (pain1 != null || pain3 != null) {
    painChangeVal = `${formatPain(pain1)} → ${formatPain(pain3)}`;
  }

  // Redness Change
  const redness1 = formatRecordedValue(baseline?.redness_status);
  const redness3 = formatRecordedValue(followup?.redness_status);
  let rednessChangeVal = 'Not recorded';
  if (redness1 !== 'Not recorded' || redness3 !== 'Not recorded') {
    rednessChangeVal = `${redness1} → ${redness3}`;
  }

  // Swelling Change
  const swelling1 = formatRecordedValue(baseline?.swelling_level);
  const swelling3 = formatRecordedValue(followup?.swelling_level);
  let swellingChangeVal = 'Not recorded';
  let swellingChangeStatus = null;
  if (swelling1 !== 'Not recorded' || swelling3 !== 'Not recorded') {
    swellingChangeVal = `${swelling1} → ${swelling3}`;
    if (swelling1 === swelling3) {
      swellingChangeStatus = 'No change';
    }
  }

  const followupImgSrc = getSafeImageUrl(followup);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Wound Photo Comparison"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div style={{
        background: 'var(--card-bg, #fff)',
        borderRadius: 'var(--radius-lg, 20px)',
        width: '100%',
        maxWidth: 920,
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: 24,
        boxShadow: '0 16px 56px rgba(0,0,0,0.28)',
        position: 'relative'
      }}>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #0F172A)', margin: 0 }}>
              Wound Progression Comparison
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748B)', margin: '4px 0 0' }}>
              Day 1 Baseline vs Day {followupDayNum} Follow-up
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setShowOverlayMode(v => !v)}
              disabled={!canCompareOutlines}
              style={{
                opacity: canCompareOutlines ? 1 : 0.5,
                cursor: canCompareOutlines ? 'pointer' : 'not-allowed',
                background: showOverlayMode ? '#EFF6FF' : '#FFFFFF',
                borderColor: showOverlayMode ? '#2563EB' : 'var(--border, #E2E8E3)'
              }}
            >
              {showOverlayMode ? 'View Side-by-Side Photos' : 'Compare Wound Outlines'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Outline status warning */}
        {!canCompareOutlines && (
          <div style={{ padding: '8px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12, color: '#92400E', marginBottom: 16 }}>
            ⚠️ Wound outlines need to be confirmed in both photos to enable overlay mode.
          </div>
        )}

        {/* Photo View */}
        {showOverlayMode && canCompareOutlines ? (
          /* Canvas overlay */
          <div style={{ background: '#0F172A', borderRadius: 14, padding: 16, textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
              {followupImgSrc ? (
                <img
                  ref={imgRef}
                  src={followupImgSrc}
                  alt="Follow-up with overlay"
                  style={{ maxWidth: '100%', maxHeight: 480, objectFit: 'contain', borderRadius: 8 }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: 480, height: 320, background: '#1E293B', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                  Photo unavailable
                </div>
              )}
              <canvas
                ref={canvasRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, fontSize: 12, color: '#fff' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 14, height: 3, borderTop: '2.5px dashed #F59E0B', display: 'inline-block' }} />
                Day 1 Baseline (Dashed)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 14, height: 3, background: '#EF4444', display: 'inline-block' }} />
                Follow-up (Solid)
              </span>
            </div>
          </div>
        ) : (
          /* Side-by-side */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PhotoCard
              label={baselineDayTag}
              dayLabel={baselineDayTag}
              dateStr={baseline?.entry_date || baseline?.created_at}
              entry={baseline}
              accentColor="#153C2E"
            />
            <PhotoCard
              label={followupDayTag}
              dayLabel={followupDayTag}
              dateStr={followup?.entry_date || followup?.created_at}
              entry={followup}
              accentColor="#2563EB"
            />
          </div>
        )}

        {/* Longitudinal Changes */}
        <div style={{ marginTop: 24, background: '#F8FAF9', border: '1px solid #E2E8E3', borderRadius: 14, padding: 18 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#153C2E', marginBottom: 14, margin: '0 0 14px', textTransform: 'uppercase' }}>
            Longitudinal Changes (Day 1 → Day {followupDayNum})
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {/* WOUND SIZE */}
            <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #E2E8E3' }}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>WOUND SIZE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{sizeChangeText}</div>
            </div>

            {/* PAIN */}
            <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #E2E8E3' }}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>PAIN</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{painChangeVal}</div>
              {painChangeStatus && (
                <div style={{ fontSize: 12, color: painChangeStatus === 'Improved' ? '#2E7D32' : painChangeStatus === 'Worsened' ? '#DC2626' : '#64748B', fontWeight: 600, marginTop: 2 }}>
                  {painChangeStatus}
                </div>
              )}
            </div>

            {/* REDNESS */}
            <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #E2E8E3' }}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>REDNESS</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{rednessChangeVal}</div>
            </div>

            {/* SWELLING */}
            <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #E2E8E3' }}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>SWELLING</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{swellingChangeVal}</div>
              {swellingChangeStatus && (
                <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 2 }}>
                  {swellingChangeStatus}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Public Export ──────────────────────────────────────────────────── */
export default function ImageCompareModal({ isOpen, onClose, entryA, entryB }) {
  if (!isOpen) return null;
  if (!entryA || !entryB || typeof entryA !== 'object' || typeof entryB !== 'object') {
    return null;
  }

  return (
    <CompareErrorBoundary onClose={onClose}>
      <CompareModalInner onClose={onClose} entryA={entryA} entryB={entryB} />
    </CompareErrorBoundary>
  );
}
