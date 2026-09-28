import React, { useState } from 'react';
import { woundService } from '../services/woundService';

const PROCESSING_STAGES = [
  { id: 1, title: 'Loading your completed photo assessment', progress: 16 },
  { id: 2, title: 'Reviewing your confirmed symptoms', progress: 33 },
  { id: 3, title: 'Saving symptoms to record store', progress: 50 },
  { id: 4, title: 'Evaluating safety rule engine', progress: 66 },
  { id: 5, title: 'Calculating longitudinal progression', progress: 83 },
  { id: 6, title: 'Getting your results ready', progress: 100 }
];

export default function SymptomsPage({ assessmentPayload, onComplete, onNavigate }) {
  // Explicit symptom states starting as NULL (Unanswered state)
  const [painScore, setPainScore] = useState(null);
  const [swellingLevel, setSwellingLevel] = useState(null); // 'None', 'Mild', 'Moderate', 'Severe'
  const [rednessStatus, setRednessStatus] = useState(null); // 'Normal', 'Slightly Increased', 'Spreading'

  const [fever, setFever] = useState(null);
  const [discharge, setDischarge] = useState(null);
  const [badSmell, setBadSmell] = useState(null);
  const [worseningPain, setWorseningPain] = useState(null);
  const [bleedingUncontrolled, setBleedingUncontrolled] = useState(null);
  const [diabetes, setDiabetes] = useState(null);
  const [footWound, setFootWound] = useState(null);
  const [animalBite, setAnimalBite] = useState(null);
  const [snakeBite, setSnakeBite] = useState(null);
  const [tetanusConcern, setTetanusConcern] = useState(null);

  const [validationError, setValidationError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [processingError, setProcessingError] = useState('');

  const validateSymptoms = () => {
    const unanswered = [];
    if (painScore === null) unanswered.push('Pain Score');
    if (swellingLevel === null) unanswered.push('Swelling Level');
    if (rednessStatus === null) unanswered.push('Redness Spreading');
    if (fever === null) unanswered.push('Fever');
    if (discharge === null) unanswered.push('Discharge/Pus');
    if (badSmell === null) unanswered.push('Bad Smell');
    if (worseningPain === null) unanswered.push('Worsening Pain');
    if (bleedingUncontrolled === null) unanswered.push('Bleeding Status');

    if (unanswered.length > 0) {
      setValidationError(`Please answer all required symptom questions: ${unanswered.slice(0, 3).join(', ')}${unanswered.length > 3 ? '...' : ''}`);
      return false;
    }

    setValidationError('');
    return true;
  };

  const startProcessing = async () => {
    if (!validateSymptoms()) return;

    setIsProcessing(true);
    setProcessingError('');
    setCurrentStageIndex(0);
    setProgressPct(16);

    const symptomData = {
      painScore: painScore !== null ? Number(painScore) : null,
      pain_score: painScore !== null ? Number(painScore) : null,
      swellingLevel: swellingLevel || 'Not recorded',
      swelling_level: swellingLevel || 'Not recorded',
      rednessStatus: rednessStatus || 'Not recorded',
      redness_status: rednessStatus || 'Not recorded',
      fever: fever === true,
      discharge: discharge === true,
      badSmell: badSmell === true,
      bad_smell: badSmell === true,
      worseningPain: worseningPain === true,
      worsening_pain: worseningPain === true,
      bleedingUncontrolled: bleedingUncontrolled === true,
      bleeding_uncontrolled: bleedingUncontrolled === true,
      diabetes: diabetes === true,
      footWound: footWound === true,
      foot_wound: footWound === true,
      animalBite: animalBite === true,
      animal_bite: animalBite === true,
      snakeBite: snakeBite === true,
      snake_bite: snakeBite === true,
      tetanusConcern: tetanusConcern === true,
      tetanus_concern: tetanusConcern === true
    };

    try {
      // Step 1: Loading photo assessment
      setCurrentStageIndex(0);
      setProgressPct(16);
      await new Promise(r => setTimeout(r, 400));

      // Step 2: Reviewing symptoms
      setCurrentStageIndex(1);
      setProgressPct(33);
      await new Promise(r => setTimeout(r, 400));

      // Step 3: Saving symptoms to backend
      setCurrentStageIndex(2);
      setProgressPct(50);
      const entryId = assessmentPayload?.entry?.id || assessmentPayload?.entryId;
      if (entryId) {
        await woundService.updateSymptoms(entryId, symptomData);
      }
      await new Promise(r => setTimeout(r, 400));

      // Step 4: Safety rules & triage
      setCurrentStageIndex(3);
      setProgressPct(66);
      const hasUrgentFlags = Boolean(
        snakeBite === true || animalBite === true || bleedingUncontrolled === true ||
        (fever === true && rednessStatus === 'Spreading') ||
        (discharge === true && worseningPain === true) ||
        (badSmell === true && worseningPain === true) ||
        (diabetes === true && footWound === true) ||
        tetanusConcern === true
      );
      await new Promise(r => setTimeout(r, 400));

      // Step 5 & 6: Longitudinal progression & completion
      setCurrentStageIndex(4);
      setProgressPct(83);
      await new Promise(r => setTimeout(r, 300));

      setCurrentStageIndex(5);
      setProgressPct(100);
      await new Promise(r => setTimeout(r, 300));

      onComplete({
        ...assessmentPayload,
        symptomData,
        hasUrgentFlags
      });
    } catch (err) {
      console.error('Symptom save error:', err);
      setProcessingError(err.message || 'Failed to process symptoms. Please try again.');
    }
  };

  const yesNoQuestions = [
    { label: 'Do you have a fever?', state: fever, setter: setFever, required: true },
    { label: 'Is there pus or discharge?', state: discharge, setter: setDischarge, required: true },
    { label: 'Is there a bad smell?', state: badSmell, setter: setBadSmell, required: true },
    { label: 'Is pain getting worse?', state: worseningPain, setter: setWorseningPain, required: true },
    { label: 'Is bleeding difficult to stop?', state: bleedingUncontrolled, setter: setBleedingUncontrolled, required: true },
    { label: 'Do you have diabetes?', state: diabetes, setter: setDiabetes, required: true },
    { label: 'Is this wound on the foot?', state: footWound, setter: setFootWound, required: true },
    { label: 'Was it caused by an animal bite?', state: animalBite, setter: setAnimalBite, required: false },
    { label: 'Was it caused by a snake bite?', state: snakeBite, setter: setSnakeBite, required: false },
    { label: 'Tetanus concern (deep/dirty)?', state: tetanusConcern, setter: setTetanusConcern, required: false }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px' }}>
      {!isProcessing ? (
        <div className="symptom-card" style={{ maxWidth: '640px', width: '100%' }}>
          <div className="symptom-status-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Photo assessment complete</span>
          </div>

          <h2 className="symptom-heading">Patient Symptom Check</h2>
          <p className="symptom-instructions">
            Please select explicit answers for all symptom fields. Unanswered questions must be completed before proceeding.
          </p>

          {validationError && (
            <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', color: '#991B1B', fontSize: '13px', marginTop: '14px', fontWeight: 600 }}>
              ⚠️ {validationError}
            </div>
          )}

          <form style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }} onSubmit={(e) => { e.preventDefault(); startProcessing(); }}>
            
            {/* 1. Pain Score */}
            <div style={{
              background: painScore === null ? '#FFFBEB' : '#F8FAF9',
              border: painScore === null ? '1.5px solid #F59E0B' : '1px solid #E2E8E3',
              borderRadius: '12px',
              padding: '16px',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: 600, color: '#153C2E', fontSize: '14px' }}>
                  Current Pain Level (0 — 10) *
                </label>
                <span style={{
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: painScore === null ? '#FEF3C7' : '#EFF6FF',
                  color: painScore === null ? '#D97706' : '#2563EB'
                }}>
                  {painScore === null ? 'Not recorded' : `${painScore} / 10`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={painScore === null ? 0 : painScore}
                onChange={(e) => setPainScore(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#2563EB', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                <span>0 (No pain)</span>
                <span>5 (Moderate)</span>
                <span>10 (Severe)</span>
              </div>
            </div>

            {/* 2. Swelling Level */}
            <div style={{
              background: swellingLevel === null ? '#FFFBEB' : '#F8FAF9',
              border: swellingLevel === null ? '1.5px solid #F59E0B' : '1px solid #E2E8E3',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontWeight: 600, color: '#153C2E', fontSize: '14px' }}>
                  Swelling Level around wound area *
                </label>
                {swellingLevel === null && (
                  <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>Unanswered</span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {['None', 'Mild', 'Moderate', 'Severe'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSwellingLevel(lvl)}
                    style={{
                      padding: '9px 6px',
                      borderRadius: '8px',
                      border: swellingLevel === lvl ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      background: swellingLevel === lvl ? '#EFF6FF' : '#FFFFFF',
                      color: swellingLevel === lvl ? '#1E40AF' : '#334155',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Redness Spreading */}
            <div style={{
              background: rednessStatus === null ? '#FFFBEB' : '#F8FAF9',
              border: rednessStatus === null ? '1.5px solid #F59E0B' : '1px solid #E2E8E3',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontWeight: 600, color: '#153C2E', fontSize: '14px' }}>
                  Is redness spreading beyond the wound edge? *
                </label>
                {rednessStatus === null && (
                  <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>Unanswered</span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { label: 'No (Normal)', val: 'Normal' },
                  { label: 'Slightly Increased', val: 'Slightly Increased' },
                  { label: 'Spreading', val: 'Spreading' }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setRednessStatus(opt.val)}
                    style={{
                      padding: '9px 6px',
                      borderRadius: '8px',
                      border: rednessStatus === opt.val ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      background: rednessStatus === opt.val ? '#EFF6FF' : '#FFFFFF',
                      color: rednessStatus === opt.val ? '#1E40AF' : '#334155',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '12.5px'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Yes/No Questions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {yesNoQuestions.map((q, idx) => {
                const isUnanswered = q.required && q.state === null;
                return (
                  <div key={idx} style={{
                    background: isUnanswered ? '#FFFBEB' : '#F8FAF9',
                    border: isUnanswered ? '1.5px solid #F59E0B' : '1px solid #E2E8E3',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#153C2E' }}>{q.label} {q.required && '*'}</span>
                      {isUnanswered && <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 700 }}>REQD</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => q.setter(true)}
                        style={{
                          flex: 1,
                          padding: '7px 4px',
                          borderRadius: '6px',
                          border: q.state === true ? '2px solid #DC2626' : '1px solid #CBD5E1',
                          background: q.state === true ? '#FEF2F2' : '#FFFFFF',
                          color: q.state === true ? '#991B1B' : '#334155',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '12.5px'
                        }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => q.setter(false)}
                        style={{
                          flex: 1,
                          padding: '7px 4px',
                          borderRadius: '6px',
                          border: q.state === false ? '2px solid #2563EB' : '1px solid #CBD5E1',
                          background: q.state === false ? '#EFF6FF' : '#FFFFFF',
                          color: q.state === false ? '#1E40AF' : '#334155',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '12.5px'
                        }}
                      >
                        No
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              className="btn-confirm-symptoms"
              style={{ marginTop: '10px' }}
            >
              Confirm symptoms & calculate results
            </button>
          </form>
        </div>
      ) : (
        /* Health Track Processing Card */
        <div className="processing-card" role="region" aria-label="Health Track Analysis" style={{ display: 'block' }}>
          {processingError ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
              <div style={{ fontWeight: 700, color: '#991B1B', marginBottom: '8px' }}>Processing Failed</div>
              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>{processingError}</div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsProcessing(false)}
              >
                Back to Symptoms Form
              </button>
            </div>
          ) : (
            <>
              <div className="processing-header">
                <div className="processing-loader-box" aria-hidden="true">
                  <div className="processing-spinner"></div>
                </div>
                <div className="processing-header-text">
                  <span className="processing-brand-label">HEALTH TRACK ANALYSIS</span>
                  <h2 className="processing-heading">Preparing your wound assessment</h2>
                  <p className="processing-supporting-text">
                    Reviewing your photo assessment and confirmed symptoms to prepare next-step guidance.
                  </p>
                </div>
              </div>

              <div className="processing-progress-track">
                <div
                  className="processing-progress-fill"
                  style={{ width: `${progressPct}%`, transition: 'width 0.5s ease' }}
                />
              </div>

              <div className="processing-stages-list">
                {PROCESSING_STAGES.map((stg, idx) => {
                  const isPast    = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  let rowClass = 'stage-pending';
                  if (isCurrent) rowClass = 'stage-running';
                  if (isPast)    rowClass = 'stage-completed';

                  return (
                    <div key={stg.id} className={`stage-row ${rowClass}`}>
                      <span className="stage-icon-container">
                        {isPast && (
                          <span className="stage-icon-completed">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="9"/>
                              <polyline points="9 12 11 14 15 10"/>
                            </svg>
                          </span>
                        )}
                        {isCurrent && <span className="stage-icon-running" />}
                        {!isPast && !isCurrent && <span className="stage-icon-pending" />}
                      </span>
                      <span className="stage-label">{stg.title}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
