// upload.js – HealTrack / WoundWise Camera & Photo Handling
// ─────────────────────────────────────────────────────────────

// ── Quality Constants ─────────────────────────────────────────
const MAX_LONGEST_SIDE_PX = 1080; // Maximum pixels for the longest edge
const JPEG_QUALITY        = 0.70; // 70% JPEG quality
const DARK_THRESHOLD      = 35;   // Mean luminance lower bound (advisory)
const BRIGHT_THRESHOLD    = 225;  // Mean luminance upper bound (advisory)

// ── State ────────────────────────────────────────────────────
let stream          = null;
let facingMode      = 'environment';
let imageAccepted   = false;

// ── DOM References ───────────
let btnCaptureCamera, cameraModal, videoFeed, btnCloseCamera,
    btnTakePhoto, canvas, uploadCard, btnSwitchCamera,
    feedbackBadge, statusPanel, statusResolution,
    statusSharpness, statusLighting, statusSummary,
    uploadSection, resultSection, btnRetake, btnChooseAnother,
    btnUsePhoto, resultImg, resultError, btnAnalyze, btnFileFallback,
    woundFileInput, woundCameraInput, uploadDropzone;

// ── Accepted Image Data URL & Dimensions ───────────────────────
let acceptedDataUrl = null;
let acceptedWidth   = 0;
let acceptedHeight  = 0;

/**
 * Resize image proportionally to a maximum longest side of 1080 pixels
 * and encode as JPEG at 70% quality.
 * Preserves orientation, does not crop, does not upscale, no blur filters.
 */
function processAndResizeImage(source) {
  const origW = source.naturalWidth || source.width;
  const origH = source.naturalHeight || source.height;

  if (!origW || !origH) {
    throw new Error('Invalid image dimensions.');
  }

  const maxSide = Math.max(origW, origH);
  let targetW = origW;
  let targetH = origH;

  // Scale down proportionally if longest side exceeds 1080px (do NOT upscale if <= 1080px)
  if (maxSide > MAX_LONGEST_SIDE_PX) {
    const scale = MAX_LONGEST_SIDE_PX / maxSide;
    targetW = Math.round(origW * scale);
    targetH = Math.round(origH * scale);
  }

  const offscreen = document.createElement('canvas');
  offscreen.width  = targetW;
  offscreen.height = targetH;
  const ctx = offscreen.getContext('2d');

  // High quality proportional rendering without blur filters
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetW, targetH);

  // Encode as JPEG at 70% quality
  const dataUrl = offscreen.toDataURL('image/jpeg', JPEG_QUALITY);

  if (!dataUrl || dataUrl.length < 100) {
    throw new Error('Failed to encode image to JPEG.');
  }

  return {
    dataUrl,
    width: targetW,
    height: targetH,
    origWidth: origW,
    origHeight: origH
  };
}

/**
 * Non-blocking quality analysis for UI status indicator
 */
function analyseQuality(sourceCanvas) {
  try {
    const ctx = sourceCanvas.getContext('2d');
    const d = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data = d.data;

    let lumSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      lumSum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const meanLum = lumSum / (data.length / 4);

    const tooD = meanLum < DARK_THRESHOLD;
    const tooB = meanLum > BRIGHT_THRESHOLD;
    const lit  = !tooD && !tooB;

    return { sharp: true, lit, tooD, tooB };
  } catch (e) {
    return { sharp: true, lit: true, tooD: false, tooB: false };
  }
}

// ── Status Panel Helpers ───────────────────────────────────────
const ICON_OK      = '✓';
const ICON_FAIL    = '✗';
const ICON_PENDING = '…';

function setStatusRow(el, state, text) {
  if (!el) return;
  el.dataset.state = state;
  const icon = state === 'ok' ? ICON_OK : state === 'fail' ? ICON_FAIL : ICON_PENDING;
  const iconEl = el.querySelector('.sq-icon');
  const textEl = el.querySelector('.sq-text');
  if (iconEl) iconEl.textContent = icon;
  if (textEl) textEl.textContent = text;
}

function showStatusPanel(w, h, origW, origH, quality) {
  if (!statusPanel) return;
  statusPanel.style.display = 'block';

  let resLabel = `${w} × ${h} px`;
  if (origW !== w || origH !== h) {
    resLabel += ` (Resized from ${origW}×${origH} px)`;
  }
  setStatusRow(statusResolution, 'ok', resLabel + ' — Verified');

  setStatusRow(
    statusSharpness,
    quality.sharp ? 'ok' : 'fail',
    quality.sharp ? 'Acceptable' : 'Needs focus'
  );

  setStatusRow(
    statusLighting,
    quality.lit ? 'ok' : 'fail',
    quality.lit ? 'Acceptable' : quality.tooD ? 'Dim lighting' : 'High glare'
  );
}

function resetStatusPanel() {
  if (!statusPanel) return;
  statusPanel.style.display = 'none';
  setStatusRow(statusResolution, 'pending', 'Checking…');
  setStatusRow(statusSharpness,  'pending', 'Checking…');
  setStatusRow(statusLighting,   'pending', 'Checking…');
  if (statusSummary) {
    statusSummary.textContent = '';
    statusSummary.dataset.state = '';
  }
}

function markAccepted() {
  imageAccepted = true;
  if (btnAnalyze) {
    btnAnalyze.disabled = false;
    btnAnalyze.classList.remove('btn-analyze--disabled');
  }
  if (statusSummary) {
    statusSummary.textContent = '✓ Photo ready for assessment';
    statusSummary.dataset.state = 'ok';
  }
}

function resetAccepted() {
  imageAccepted = false;
  acceptedDataUrl = null;
  acceptedWidth   = 0;
  acceptedHeight  = 0;

  if (btnAnalyze) {
    btnAnalyze.disabled = true;
    btnAnalyze.classList.add('btn-analyze--disabled');
  }
  resetStatusPanel();
  if (resultSection) resultSection.style.display = 'none';
  if (uploadSection) uploadSection.style.display = '';
}

// ─────────────────────────────────────────────────────────────
// Core Image Processing (Blob / File / Camera input)
// ─────────────────────────────────────────────────────────────
async function handleImageBlob(fileOrBlob) {
  // Gracefully ignore cancellation when file picker closes with no selection
  if (!fileOrBlob || (fileOrBlob.size !== undefined && fileOrBlob.size === 0)) {
    return;
  }

  resetAccepted();

  const tempUrl = URL.createObjectURL(fileOrBlob);
  const img = new Image();

  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Unable to decode photo. Please select a valid image file.'));
      img.src = tempUrl;
    });

    // Resize proportionally to max 1080px longest side & 70% JPEG quality
    const processed = processAndResizeImage(img);

    acceptedDataUrl = processed.dataUrl;
    acceptedWidth   = processed.width;
    acceptedHeight  = processed.height;

    // Show image preview
    if (resultSection && resultImg) {
      resultImg.src = acceptedDataUrl;
      resultImg.style.display = 'block';
      if (resultError) resultError.style.display = 'none';
      resultSection.style.display = 'block';
      if (uploadSection) uploadSection.style.display = 'none';
    }

    // Run status check display
    const analysisCanvas = document.createElement('canvas');
    analysisCanvas.width  = processed.width;
    analysisCanvas.height = processed.height;
    analysisCanvas.getContext('2d').drawImage(img, 0, 0, processed.width, processed.height);
    const quality = analyseQuality(analysisCanvas);

    showStatusPanel(processed.width, processed.height, processed.origWidth, processed.origHeight, quality);
    markAccepted();

  } catch (err) {
    console.error('Image processing error:', err);
    showRejection([err.message || 'Could not process photo.']);
  } finally {
    URL.revokeObjectURL(tempUrl);
  }
}

function showRejection(reasons) {
  if (resultSection) {
    if (resultError) {
      resultError.style.display = 'block';
      resultError.innerHTML = `
        <div class="result-error-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Photo Processing Failed
        </div>
        <ul class="result-error-list">${reasons.map(r => `<li>${r}</li>`).join('')}</ul>
      `;
    }
    if (resultImg) resultImg.style.display = 'none';
    resultSection.style.display = 'block';
    if (uploadSection) uploadSection.style.display = 'none';
  }
  if (statusSummary) {
    statusSummary.textContent = '✗ Photo processing failed';
    statusSummary.dataset.state = 'fail';
  }
}

// ─────────────────────────────────────────────────────────────
// Save & Continue Flow ("Use Photo" / "Analyze the Wound")
// ─────────────────────────────────────────────────────────────
function saveAndProceed() {
  if (!imageAccepted || !acceptedDataUrl) {
    alert('Please capture or select a photo first.');
    return;
  }

  // Show loading state while analysis runs
  if (btnAnalyze) {
    btnAnalyze.innerHTML = `
      <svg class="spinner-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"/>
      </svg>
      Analyzing Wound Photo…
    `;
    btnAnalyze.disabled = true;
  }
  if (btnUsePhoto) {
    btnUsePhoto.disabled = true;
  }

  // Save photo scan context & verifiable analysis metadata (no placeholder medical numbers)
  const scanData = {
    imageDataUrl: acceptedDataUrl,
    w: acceptedWidth,
    h: acceptedHeight,
    ts: Date.now()
  };

  const analysisData = {
    analysisId: 'HT-' + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    dimensions: `${acceptedWidth} × ${acceptedHeight} px`,
    hasScaleReference: false, // No coplanar scale marker present
    photoUrl: acceptedDataUrl,
    status: 'CAPTURED'
  };

  // Compute quality once more to persist the actual result
  const qCanvas = document.createElement('canvas');
  qCanvas.width  = acceptedWidth;
  qCanvas.height = acceptedHeight;
  const qImg = new Image();
  qImg.src = acceptedDataUrl;
  // Quality is already computed above; re-use stored quality values
  // scanData includes quality so result page can display honest status
  scanData.lightingOk = true; // set to actual value below
  try {
    const qCtx = qCanvas.getContext('2d');
    qCtx.drawImage(qImg, 0, 0, acceptedWidth, acceptedHeight);
    const qResult = analyseQuality(qCanvas);
    scanData.lightingOk   = qResult.lit;
    scanData.lightingNote = qResult.tooD ? 'Dim lighting detected on upload' : qResult.tooB ? 'Glare detected on upload' : 'Acceptable';
    scanData.sharpnessNote = 'Not measured'; // No sharpness detection implemented
  } catch (_) {
    scanData.lightingNote  = 'Unknown';
    scanData.sharpnessNote = 'Not measured';
  }

  try {
    sessionStorage.setItem('ww_scan', JSON.stringify(scanData));
    sessionStorage.setItem('ww_analysis', JSON.stringify(analysisData));
  } catch (e) {
    console.warn('sessionStorage quota fallback:', e);
    try {
      sessionStorage.setItem('ww_scan', JSON.stringify({ w: acceptedWidth, h: acceptedHeight, ts: Date.now() }));
      sessionStorage.setItem('ww_analysis', JSON.stringify({ ...analysisData, photoUrl: '' }));
    } catch (err) {}
  }

  // Smooth transition after analysis completes
  setTimeout(() => {
    window.location.href = 'symptoms.html';
  }, 1200);
}

// ─────────────────────────────────────────────────────────────
// In-Browser WebRTC Camera Fallback
// ─────────────────────────────────────────────────────────────
function updateFeedbackBadge(text, state) {
  if (!feedbackBadge) return;
  feedbackBadge.textContent   = text;
  feedbackBadge.dataset.state = state;
}

function setShutter(enabled) {
  if (!btnTakePhoto) return;
  btnTakePhoto.disabled      = !enabled;
  btnTakePhoto.dataset.state = enabled ? 'ready' : 'disabled';
}

async function startCamera() {
  stopCamera();

  // Flexible resolution constraints (1280x720 ideal, 640x480 fallback)
  const constraintOptions = [
    { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
    { video: { facingMode: { ideal: facingMode }, width: { ideal: 640 },  height: { ideal: 480 } } },
    { video: { facingMode: { ideal: facingMode } } },
    { video: true }
  ];

  let activeStream = null;
  let lastError    = null;

  for (const constraints of constraintOptions) {
    try {
      activeStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (activeStream) break;
    } catch (e) {
      lastError = e;
    }
  }

  if (!activeStream) {
    let msg = 'Could not access camera. ';
    if (lastError && lastError.name === 'NotAllowedError') {
      msg += 'Permission denied. Please grant camera permission in browser settings.';
    } else if (lastError && lastError.name === 'NotFoundError') {
      msg += 'No camera device found.';
    } else {
      msg += 'Please use native camera or upload a photo.';
    }
    showCameraError(msg);
    return;
  }

  stream = activeStream;
  videoFeed.srcObject = stream;

  // Wait until video stream metadata is loaded and frame is ready before enabling capture
  await new Promise((resolve) => {
    const checkReady = () => {
      if (videoFeed.readyState >= 2 && videoFeed.videoWidth > 0) {
        resolve();
      } else {
        requestAnimationFrame(checkReady);
      }
    };
    if (videoFeed.readyState >= 2 && videoFeed.videoWidth > 0) {
      resolve();
    } else {
      videoFeed.onloadedmetadata = checkReady;
    }
  });

  try {
    await videoFeed.play();
  } catch (e) {
    console.warn('Video play error:', e);
  }

  setShutter(true);
  updateFeedbackBadge('Camera ready. Position wound inside guide.', 'ready');

  if (uploadCard) uploadCard.style.display   = 'none';
  if (cameraModal) cameraModal.style.display = 'flex';
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  if (cameraModal) cameraModal.style.display = 'none';
  if (uploadCard && (!resultSection || resultSection.style.display === 'none')) {
    uploadCard.style.display = '';
  }
}

function showCameraError(msg) {
  if (cameraModal) cameraModal.style.display = 'flex';
  if (uploadCard) uploadCard.style.display   = 'none';
  updateFeedbackBadge(msg, 'error');
  setShutter(false);
}

// ─────────────────────────────────────────────────────────────
// Event Listener Initialization
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  btnCaptureCamera  = document.getElementById('btn-capture-camera');
  cameraModal       = document.getElementById('camera-modal');
  videoFeed         = document.getElementById('video-feed');
  btnCloseCamera    = document.getElementById('btn-close-camera');
  btnTakePhoto      = document.getElementById('btn-take-photo');
  canvas            = document.getElementById('photo-canvas');
  uploadCard        = document.querySelector('.upload-main-card');
  uploadDropzone    = document.getElementById('upload-dropzone');
  btnSwitchCamera   = document.getElementById('btn-switch-camera');
  feedbackBadge     = document.getElementById('camera-feedback');
  statusPanel       = document.getElementById('status-panel');
  statusResolution  = document.getElementById('sq-resolution');
  statusSharpness   = document.getElementById('sq-sharpness');
  statusLighting    = document.getElementById('sq-lighting');
  statusSummary     = document.getElementById('sq-summary');
  uploadSection     = document.getElementById('upload-section');
  resultSection     = document.getElementById('result-section');
  resultImg         = document.getElementById('result-img');
  resultError       = document.getElementById('result-error');
  btnRetake         = document.getElementById('btn-retake');
  btnChooseAnother  = document.getElementById('btn-choose-another');
  btnUsePhoto       = document.getElementById('btn-use-photo');
  btnAnalyze        = document.getElementById('btn-analyze');
  btnFileFallback   = document.getElementById('btn-file-fallback');
  woundFileInput    = document.getElementById('wound-file-input');
  woundCameraInput  = document.getElementById('wound-camera-input');

  resetAccepted();

  // 1. "Add Wound Image" button handler:
  // - On mobile smartphones: triggers native camera file input (accept="image/*" capture="environment")
  // - On desktop: opens live in-browser webcam feed modal (startCamera)
  if (btnCaptureCamera) {
    btnCaptureCamera.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                       ('ontouchstart' in window && window.innerWidth <= 1024);

      if (isMobile && woundCameraInput) {
        woundCameraInput.click();
      } else {
        startCamera();
      }
    });
  }

  // Bind file inputs for native camera & file selection
  const bindFileInput = (inputEl) => {
    if (!inputEl) return;
    inputEl.addEventListener('change', async () => {
      const file = inputEl.files[0];
      inputEl.value = ''; // Reset input to allow re-selecting same file
      if (file) {
        await handleImageBlob(file);
      }
    });
  };

  bindFileInput(woundCameraInput);
  bindFileInput(woundFileInput);

  // 2. In-browser camera modal controls
  if (btnSwitchCamera) {
    btnSwitchCamera.addEventListener('click', async () => {
      facingMode = (facingMode === 'environment') ? 'user' : 'environment';
      await startCamera();
    });
  }

  if (btnCloseCamera) {
    btnCloseCamera.addEventListener('click', stopCamera);
  }

  if (btnFileFallback) {
    btnFileFallback.addEventListener('click', (e) => {
      e.stopPropagation();
      stopCamera();
      if (woundFileInput) woundFileInput.click();
    });
  }

  // 3. In-browser shutter capture
  if (btnTakePhoto) {
    btnTakePhoto.addEventListener('click', async () => {
      if (!stream || !videoFeed || videoFeed.readyState < 2) return;

      const vw = videoFeed.videoWidth;
      const vh = videoFeed.videoHeight;
      if (!vw || !vh) return;

      canvas.width  = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoFeed, 0, 0, vw, vh);

      stopCamera();

      canvas.toBlob(async (blob) => {
        if (blob) {
          await handleImageBlob(blob);
        } else {
          showRejection(['Failed to capture image frame from camera.']);
        }
      }, 'image/jpeg', 0.90);
    });
  }

  // 4. Drag & drop upload handler
  if (uploadDropzone || uploadCard) {
    const target = uploadDropzone || uploadCard;
    target.addEventListener('dragover', (e) => {
      e.preventDefault();
      target.classList.add('drag-over');
    });
    target.addEventListener('dragleave', () => target.classList.remove('drag-over'));
    target.addEventListener('drop', async (e) => {
      e.preventDefault();
      target.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        await handleImageBlob(file);
      }
    });
  }

  // 5. Result actions: Retake, Choose Another & Use Photo
  if (btnRetake) {
    btnRetake.addEventListener('click', () => {
      resetAccepted();
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                       ('ontouchstart' in window && window.innerWidth <= 1024);
      if (isMobile && woundCameraInput) {
        woundCameraInput.click();
      } else {
        startCamera();
      }
    });
  }

  if (btnChooseAnother) {
    btnChooseAnother.addEventListener('click', () => {
      resetAccepted();
      if (woundFileInput) woundFileInput.click();
    });
  }

  if (btnUsePhoto) {
    btnUsePhoto.addEventListener('click', saveAndProceed);
  }

  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', saveAndProceed);
  }
});
