import React, { useState, useEffect } from 'react';
import ImageCompareModal from '../components/ImageCompareModal';
import { woundService } from '../services/woundService';
import { getImageUrl } from '../services/api';

export default function HistoryPage({ onNavigate, onShowNotification, targetWoundId }) {
  const [wounds, setWounds] = useState([]);
  const [selectedWoundId, setSelectedWoundId] = useState(targetWoundId || null);
  const [woundDetail, setWoundDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // Comparison State
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareEntryA, setCompareEntryA] = useState(null);
  const [compareEntryB, setCompareEntryB] = useState(null);

  useEffect(() => {
    loadWounds();
  }, []);

  useEffect(() => {
    if (selectedWoundId) {
      loadWoundTimeline(selectedWoundId);
    }
  }, [selectedWoundId]);

  const loadWounds = async () => {
    try {
      setLoading(true);
      const data = await woundService.getWounds();
      setWounds(data || []);

      if (data && data.length > 0) {
        const initialId = targetWoundId && data.find(w => w.id === targetWoundId)
          ? targetWoundId
          : data[0].id;
        setSelectedWoundId(initialId);
      }
    } catch (err) {
      console.error('Failed to load wounds for history:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWoundTimeline = async (id) => {
    try {
      const data = await woundService.getWoundDetail(id);
      setWoundDetail(data);

      // Default comparison if 2+ entries exist
      if (data.timeline && data.timeline.length >= 2) {
        setCompareEntryA(data.timeline[0]);
        setCompareEntryB(data.timeline[data.timeline.length - 1]);
      } else {
        setCompareEntryA(null);
        setCompareEntryB(null);
      }
    } catch (err) {
      console.error('Failed to load wound details:', err);
    }
  };

  const handleLaunchCompare = () => {
    const timeline = woundDetail?.timeline;
    if (!Array.isArray(timeline) || timeline.length < 2) {
      onShowNotification('You need at least 2 photos recorded for this wound to compare changes over time.', 'info');
      return;
    }
    const baseline = timeline[0];
    const latest   = timeline[timeline.length - 1];
    if (!baseline || !latest || typeof baseline !== 'object' || typeof latest !== 'object') {
      onShowNotification('Could not retrieve valid comparison entries. Please try again.', 'info');
      return;
    }
    setCompareEntryA(baseline);
    setCompareEntryB(latest);
    setCompareModalOpen(true);
  };

  return (
    <section className="page-body">
      <div className="greeting-block">
        <h2 className="greeting-title">History Tracker</h2>
        <p className="greeting-sub">Monitor wound progression over time with dated photos and assessments.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading history records...</p>
        </div>
      ) : wounds.length === 0 ? (
        <div className="no-tests-card" style={{ marginTop: 20 }}>
          <h3 className="no-tests-title">No Wound History Yet</h3>
          <p className="no-tests-desc">Upload your first wound photo to begin tracking healing history.</p>
          <button className="btn-primary" onClick={() => onNavigate('upload')}>
            Upload First Wound
          </button>
        </div>
      ) : (
        <>
          {/* Wound Selector Toolbar */}
          <div className="records-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ fontWeight: 600, fontSize: '13px' }}>Select Wound Case:</label>
              <select 
                className="form-select" 
                style={{ width: 'auto', minWidth: 260 }}
                value={selectedWoundId || ''}
                onChange={(e) => setSelectedWoundId(e.target.value)}
              >
                {wounds.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title} — {w.location} ({w.entryCount || 0} entries)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-outline"
                onClick={handleLaunchCompare}
                disabled={!woundDetail?.timeline || woundDetail.timeline.length < 2}
              >
                🔍 Compare Photos
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => onNavigate('upload', { initialWoundId: selectedWoundId })}
              >
                + Add Follow-up Photo
              </button>
            </div>
          </div>

          {/* Wound Summary Banner */}
          {woundDetail?.wound && (
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginRight: 10 }}>
                  {woundDetail.wound.title}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  📍 {woundDetail.wound.location}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="wound-badge wound-badge--active">
                  {woundDetail.timeline?.length || 0} Total Photo Entries
                </span>
              </div>
            </div>
          )}

          {/* Longitudinal Healing Trend Chart */}
          {woundDetail?.timeline && woundDetail.timeline.length > 0 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8E3', borderRadius: '16px', padding: '20px', marginBottom: 24, boxShadow: '0 4px 18px rgba(20,50,30,0.04)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#153C2E', marginBottom: 4 }}>
                Longitudinal Healing Trend Chart
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748B', marginBottom: 16 }}>
                Relative wound area change indexed to Day 1 baseline (100%)
              </p>

              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg width="600" height="180" viewBox="0 0 600 180" style={{ overflow: 'visible' }}>
                  {[30, 75, 120].map((y, idx) => (
                    <line key={idx} x1="50" y1={y} x2="570" y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4,4" />
                  ))}
                  <text x="40" y="34" fontSize="11" fill="#94A3B8" textAnchor="end">120%</text>
                  <text x="40" y="79" fontSize="11" fill="#94A3B8" textAnchor="end">100%</text>
                  <text x="40" y="124" fontSize="11" fill="#94A3B8" textAnchor="end">50%</text>
                  <text x="40" y="165" fontSize="11" fill="#94A3B8" textAnchor="end">0%</text>

                  {(() => {
                    const days = [1, 3, 5, 7];
                    const baselineEntry = woundDetail.timeline[0];
                    const baseArea = baselineEntry ? (baselineEntry.wound_area_cm2 || baselineEntry.coverage_pct || 1) : 1;

                    const points = days.map((day, idx) => {
                      const entry = woundDetail.timeline.find(e => (e.followup_day || (e.is_followup ? 3 : 1)) === day);
                      if (!entry) return null;
                      const area = entry.wound_area_cm2 || entry.coverage_pct;
                      if (area == null) return null;
                      const pct = (area / baseArea) * 100;
                      const x = 70 + idx * 150;
                      const y = Math.max(20, Math.min(160, 160 - (pct / 130) * 140));
                      return { day, pct: Math.round(pct), x, y, entry };
                    }).filter(Boolean);

                    const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');

                    return (
                      <>
                        {points.length > 1 && (
                          <polyline points={polylineStr} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                        {days.map((day, idx) => {
                          const x = 70 + idx * 150;
                          const pt = points.find(p => p.day === day);
                          return (
                            <g key={day}>
                              <text x={x} y="178" fontSize="12" fontWeight="600" fill="#475569" textAnchor="middle">Day {day}</text>
                              {pt ? (
                                <>
                                  <circle cx={pt.x} cy={pt.y} r="6" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                                  <text x={pt.x} y={pt.y - 12} fontSize="11" fontWeight="700" fill="#1E40AF" textAnchor="middle">{pt.pct}%</text>
                                </>
                              ) : (
                                <circle cx={x} cy="75" r="3" fill="#CBD5E1" />
                              )}
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}

          {/* Timeline of Dated Photos */}
          <div className="timeline-container">
            {woundDetail?.timeline?.map((entry, index) => {
              const rawDate = entry.entry_date || entry.created_at;
              const parsedDate = rawDate ? new Date(rawDate) : null;
              const dateFormatted = parsedDate && !Number.isNaN(parsedDate.getTime())
                ? parsedDate.toLocaleDateString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'short',
                    day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })
                : 'Date unavailable';

              const dayNumber = entry.followup_day || (index === 0 ? 1 : index === 1 ? 3 : index === 2 ? 5 : 7);
              const dayLabel = dayNumber === 1 ? 'Day 1 Baseline' : `Day ${dayNumber} Follow-up`;
              const isFirst = index === 0;
              const isLatest = index === woundDetail.timeline.length - 1;

              return (
                <div key={entry.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-card">
                    <img 
                      src={getImageUrl(entry.image_filename)} 
                      alt={`Wound check ${index + 1}`} 
                      className="timeline-thumb" 
                    />

                    <div className="timeline-info">
                      <div className="timeline-date">{dateFormatted}</div>
                      <h4 className="timeline-title">
                        {dayLabel}
                        {isLatest && index > 0 && ' (Latest)'}
                      </h4>

                      <div style={{ fontSize: '12.5px', color: '#334155', margin: '6px 0' }}>
                        <span><strong>Area:</strong> {entry.wound_area_cm2 ? `${entry.wound_area_cm2.toFixed(2)} cm²` : (entry.coverage_pct != null ? `${entry.coverage_pct.toFixed(1)}% ROI` : 'Not measured')}</span>
                        <span style={{ marginLeft: 12 }}><strong>Pain:</strong> {entry.pain_score != null ? `${entry.pain_score}/10` : 'Not recorded'}</span>
                        <span style={{ marginLeft: 12 }}><strong>Triage:</strong> <span style={{ textTransform: 'capitalize', fontWeight: 600, color: entry.triage_level === 'red' ? '#DC2626' : entry.triage_level === 'amber' ? '#D97706' : '#2E7D32' }}>{entry.triage_level || 'green'}</span></span>
                      </div>

                      <div className="timeline-notes">
                        {entry.notes || 'No observational notes logged for this entry.'}
                      </div>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--blue)' }}
                          onClick={() => {
                            onNavigate('result', {
                              woundId: woundDetail.wound.id,
                              woundTitle: woundDetail.wound.title,
                              imageFilename: entry.image_filename,
                              entryDate: entry.entry_date || entry.created_at,
                              notes: typeof entry.notes === 'string' ? entry.notes : '',
                              assessmentSummary: typeof entry.assessment_summary === 'string' ? entry.assessment_summary : '',
                              entryId: entry.id,
                              coveragePct: entry.coverage_pct,
                              physicalAreaCm2: entry.wound_area_cm2,
                              painScore: entry.pain_score,
                              swellingLevel: entry.swelling_level,
                              rednessStatus: entry.redness_status,
                              isBaseline: isFirst
                            });
                          }}
                        >
                          👁️ View Health Result
                        </button>

                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => {
                            const base = woundDetail.timeline[0];
                            if (!base || !entry || typeof base !== 'object' || typeof entry !== 'object') return;
                            setCompareEntryA(base);
                            setCompareEntryB(entry);
                            setCompareModalOpen(true);
                          }}
                          disabled={woundDetail.timeline.length < 2}
                        >
                          Compare with Day 1
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Modal */}
          <ImageCompareModal 
            isOpen={compareModalOpen} 
            onClose={() => setCompareModalOpen(false)} 
            entryA={compareEntryA} 
            entryB={compareEntryB} 
          />
        </>
      )}
    </section>
  );
}
