import React, { useState, useEffect, useRef } from 'react';
import CameraModal from '../components/CameraModal';
import QualityCheckPanel from '../components/QualityCheckPanel';
import { woundService } from '../services/woundService';
import { calculateSkinToneCoverage } from '../utils/measurementEngine';

export default function UploadPage({ onNavigate, onShowNotification, initialWoundId }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [qualityMetrics, setQualityMetrics] = useState(null);
  const [proceedAnyway, setProceedAnyway] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Form State
  const [woundsList, setWoundsList] = useState([]);
  const [selectedWoundId, setSelectedWoundId] = useState(initialWoundId || 'new');
  const [woundTitle, setWoundTitle] = useState('');
  const [woundLocation, setWoundLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadExistingWounds();
  }, []);

  const loadExistingWounds = async () => {
    try {
      const data = await woundService.getWounds();
      setWoundsList(data || []);
      if (initialWoundId) {
        setSelectedWoundId(initialWoundId);
      }
    } catch (err) {
      console.warn('Failed to load wounds list:', err);
    }
  };

  // Analyze quality using canvas
  const processImageQuality = (imgSource, file) => {
    const origW = imgSource.naturalWidth || imgSource.width;
    const origH = imgSource.naturalHeight || imgSource.height;

    const canvas = document.createElement('canvas');
    canvas.width = Math.min(origW, 1080);
    canvas.height = Math.round(origH * (canvas.width / origW));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgSource, 0, 0, canvas.width, canvas.height);

    let lumSum = 0;
    let tooDark = false;
    let tooBright = false;
    let skinRes = { skinPercentage: 0, isSkinLikely: true };
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < imgData.length; i += 8) {
        lumSum += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
      }
      const meanLum = lumSum / (imgData.length / 8);
      tooDark = meanLum < 40;
      tooBright = meanLum > 220;

      skinRes = calculateSkinToneCoverage(imgData, canvas.width, canvas.height);
      console.log(`[UploadPage Quality Check] Skin coverage: ${skinRes.skinPercentage}% | Pass: ${skinRes.isSkinLikely}`);
    } catch (e) {
      // Ignored if cross-origin
    }

    const resolutionOk = Math.max(origW, origH) >= 480;
    const lightingOk = !tooDark && !tooBright;

    setQualityMetrics({
      width: origW,
      height: origH,
      resolutionOk,
      sharp: true,
      lightingOk,
      tooDark,
      tooBright,
      skinPercentage: skinRes.skinPercentage,
      skinCoverageOk: skinRes.isSkinLikely
    });
  };

  const handleFileChosen = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowNotification('Please select a valid image file (JPEG, PNG, WEBP).', 'error');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      processImageQuality(img, file);
    };
    img.src = url;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChosen(e.dataTransfer.files[0]);
    }
  };

  const handleCameraPhoto = (file, dataUrl) => {
    setSelectedFile(file);
    setPreviewUrl(dataUrl);

    const img = new Image();
    img.onload = () => {
      processImageQuality(img, file);
    };
    img.src = dataUrl;
  };

  const handleProceedToSymptoms = async () => {
    if (!selectedFile) {
      onShowNotification('Please capture or choose a wound image before proceeding.', 'error');
      return;
    }

    if (selectedWoundId === 'new' && (!woundTitle.trim() || !woundLocation.trim())) {
      onShowNotification('Please provide a name/title and anatomical location for this wound.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const isFollowup = selectedWoundId !== 'new';

      // Save upload to backend first
      const response = await woundService.uploadWound({
        file: selectedFile,
        woundId: selectedWoundId === 'new' ? null : selectedWoundId,
        title: woundTitle.trim() || 'Wound Assessment',
        location: woundLocation.trim() || 'Unspecified site',
        notes: notes.trim(),
        isFollowup,
        qualityMetrics
      });

      // Navigate to Symptoms check passing payload
      onNavigate('symptoms', {
        woundId: response.woundId,
        entryId: response.entry.id,
        photoUrl: previewUrl,
        imageFilename: response.entry.image_filename,
        woundTitle: woundTitle.trim() || 'Wound Assessment',
        woundLocation: woundLocation.trim() || 'Unspecified site',
        notes: notes.trim(),
        qualityMetrics
      });
    } catch (err) {
      onShowNotification(err.message || 'Failed to initialize assessment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      onShowNotification('Please capture or choose a wound image before submitting.', 'error');
      return;
    }

    if (selectedWoundId === 'new' && (!woundTitle.trim() || !woundLocation.trim())) {
      onShowNotification('Please provide a name/title and anatomical location for this new wound.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const isFollowup = selectedWoundId !== 'new';

      const response = await woundService.uploadWound({
        file: selectedFile,
        woundId: selectedWoundId === 'new' ? null : selectedWoundId,
        title: woundTitle.trim(),
        location: woundLocation.trim(),
        notes: notes.trim(),
        isFollowup,
        qualityMetrics
      });

      setSubmissionResult(response);
      onShowNotification('Wound record and assessment successfully saved!', 'success');
    } catch (err) {
      console.error('Upload error:', err);
      onShowNotification(err.message || 'Failed to save wound record.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setQualityMetrics(null);
    setSubmissionResult(null);
    setNotes('');
  };

  return (
    <section className="page-body">
      <div className="upload-container">
        {/* Header with back button */}
        <div className="back-btn-row">
          <button 
            className="back-btn" 
            onClick={() => onNavigate('dashboard')} 
            aria-label="Back to dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h2 className="greeting-title" style={{ margin: 0 }}>Upload Wound</h2>
            <p className="greeting-sub">Document an initial wound or attach a progress photo</p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileChosen(e.target.files[0]);
            }
          }}
        />

        {/* Camera Modal */}
        <CameraModal 
          isOpen={isCameraOpen} 
          onClose={() => setIsCameraOpen(false)} 
          onPhotoCaptured={handleCameraPhoto} 
          onSelectFile={() => {
            setIsCameraOpen(false);
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
        />

        {submissionResult ? (
          /* Success Screen */
          <div className="form-card" style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--green-light)',
              color: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px'
            }}>
              ✓
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 8 }}>
              Wound Image Saved Successfully
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: 20 }}>
              Your wound photo and documentation have been securely added to your medical records.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="btn-primary" 
                onClick={() => onNavigate('result', {
                  woundId: submissionResult.woundId,
                  imageFilename: submissionResult.entry.image_filename,
                  woundTitle: woundTitle || 'Wound Assessment',
                  entryDate: submissionResult.entry.entry_date
                })}
              >
                View Full Health Result
              </button>
              <button 
                className="btn-outline" 
                onClick={() => onNavigate('history', { woundId: submissionResult.woundId })}
              >
                View in History Tracker
              </button>
              <button className="btn-outline" onClick={resetForm}>
                Upload Another Photo
              </button>
            </div>
          </div>
        ) : (
          /* Upload & Form Section */
          <>
            {!previewUrl ? (
              <div 
                className={`upload-dropzone ${dragOver ? 'dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-icon-circle">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 className="upload-title">Drag and drop wound image here, or click to browse</h3>
                <p className="upload-sub">Supports JPG, PNG, WEBP · Max 15MB</p>

                <div className="upload-actions-row" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button"
                    className="btn-primary" 
                    onClick={() => setIsCameraOpen(true)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    Take Photo with Camera
                  </button>
                  <button 
                    type="button"
                    className="btn-outline" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                  </button>
                </div>
              </div>
            ) : (
              /* Photo Preview Card */
              <div className="form-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <img 
                    src={previewUrl} 
                    alt="Captured Wound" 
                    style={{
                      width: 220,
                      height: 220,
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)'
                    }} 
                  />

                  <div style={{ flex: 1, minWidth: 240 }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: 6 }}>
                      Captured Photo Preview
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: 14 }}>
                      Ensure the wound margins are visible, well-lit, and in focus.
                    </p>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button 
                        type="button" 
                        className="btn-outline" 
                        onClick={() => setIsCameraOpen(true)}
                      >
                        Retake Photo
                      </button>
                      <button 
                        type="button" 
                        className="btn-outline" 
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose Different Image
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quality Check Indicator */}
                <QualityCheckPanel qualityMetrics={qualityMetrics} />

                {/* Low Skin Coverage Warning Banner */}
                {qualityMetrics && qualityMetrics.skinCoverageOk === false && !proceedAnyway && (
                  <div style={{
                    padding: '14px 16px',
                    background: '#FFFBEB',
                    border: '1.5px solid #F59E0B',
                    borderRadius: '12px',
                    color: '#92400E',
                    fontSize: '13px',
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.12)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ fontSize: '18px', lineHeight: 1 }}>⚠️</span>
                      <div>
                        <strong style={{ color: '#92400E', fontSize: '13.5px' }}>Photo Content Advisory ({qualityMetrics.skinPercentage}% skin coverage):</strong>
                        <div style={{ marginTop: 2, fontSize: '12.5px', color: '#B45309', lineHeight: 1.4 }}>
                          This photo doesn't look like it shows skin or a wound. Please check the photo, or confirm you'd like to proceed anyway.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setProceedAnyway(true)}
                      style={{
                        background: '#FFFFFF',
                        borderColor: '#F59E0B',
                        color: '#B45309',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        padding: '8px 16px',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        flexShrink: 0
                      }}
                    >
                      Proceed anyway
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Wound Details & Follow-up Form */}
            <form className="form-card" onSubmit={handleDirectSubmit}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: 16 }}>
                Wound Tracking Information
              </h3>

              {/* Case Selection: New vs Follow-up */}
              <div className="form-group">
                <label className="form-label">Tracking Case</label>
                <select 
                  className="form-select"
                  value={selectedWoundId} 
                  onChange={(e) => setSelectedWoundId(e.target.value)}
                >
                  <option value="new">+ Start a New Wound Tracker</option>
                  {woundsList.map(w => (
                    <option key={w.id} value={w.id}>
                      Follow-up to: {w.title} ({w.location})
                    </option>
                  ))}
                </select>
                <span className="form-help">
                  Attach progress photos to the same wound over time to see the healing progression timeline.
                </span>
              </div>

              {selectedWoundId === 'new' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Wound Title / Identifier *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g., Post-op incision, Scraped knee, Forearm burn"
                      value={woundTitle}
                      onChange={(e) => setWoundTitle(e.target.value)}
                      required={selectedWoundId === 'new'}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Anatomical Location *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g., Right lower leg, Left forearm, Abdomen"
                      value={woundLocation}
                      onChange={(e) => setWoundLocation(e.target.value)}
                      required={selectedWoundId === 'new'}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Clinical Observations & Patient Notes</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Record symptoms such as redness, drainage, swelling, pain level (1-10), dressing change status, or notes for your doctor."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  disabled={isSubmitting || !selectedFile}
                  onClick={handleProceedToSymptoms}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 10 }}>
                    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isSubmitting ? 'Preparing Check...' : 'Analyze the Wound & Check Symptoms'}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 8 }}>
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button 
                  type="button" 
                  className="btn-outline" 
                  onClick={() => onNavigate('dashboard')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
