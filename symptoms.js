// symptoms.js – WoundWise Symptom Review, Health Track Processing & Care Rules Assessment
// ─────────────────────────────────────────────────────────────

// ── Configurable Pacing & Timing Settings ────────────────────
// Minimum total time (in milliseconds) the Health Track processing screen remains visible
const MIN_PROCESSING_DURATION_MS = 6000;

// Sequential stage reveal interval in milliseconds (800–1,000ms pace)
const STAGE_INTERVAL_MS = 950;

document.addEventListener('DOMContentLoaded', () => {
  const symptomReviewView    = document.getElementById('symptom-review-view');
  const processingView       = document.getElementById('processing-view');
  const symptomResultView    = document.getElementById('symptom-result-view');
  const btnConfirmSymptoms   = document.getElementById('btn-confirm-symptoms');
  const btnNotSure           = document.getElementById('btn-not-sure');
  const btnEditSymptoms      = document.getElementById('btn-edit-symptoms');
  const symptomRows          = document.querySelectorAll('.symptom-row');

  // Processing Screen DOM Elements
  const processingHeading    = document.getElementById('processing-heading');
  const processingProgressbar= document.getElementById('processing-progressbar');
  const processingProgressFill= document.getElementById('processing-progress-fill');
  const processingError      = document.getElementById('processing-error');
  const btnRetryProcessing   = document.getElementById('btn-retry-processing');

  // Result Screen DOM Elements
  const resultBadgeContainer = document.getElementById('result-badge-container');
  const resultTitle          = document.getElementById('result-title');
  const resultGuidance       = document.getElementById('result-guidance');
  const resultPhotoImg       = document.getElementById('result-photo-img');
  const resultPhotoMetrics   = document.getElementById('result-photo-metrics');
  const resultSymptomsList   = document.getElementById('result-symptoms-list');

  // Helper utility for asynchronous sleep
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Stage icons
  const ICON_PENDING = '<span class="stage-icon-pending"></span>';
  const ICON_RUNNING = '<span class="stage-icon-running"></span>';
  const ICON_COMPLETED = `
    <span class="stage-icon-completed">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    </span>`;

  // Processing Stages Definition
  const STAGES = [
    { id: 1, title: 'Loading your completed photo assessment', progress: 16 },
    { id: 2, title: 'Reviewing your confirmed symptoms', progress: 33 },
    { id: 3, title: 'Checking urgent warning signs', progress: 50 },
    { id: 4, title: 'Combining assessment information', progress: 66 },
    { id: 5, title: 'Preparing next-step guidance', progress: 83 },
    { id: 6, title: 'Getting your results ready', progress: 100 }
  ];

  // Load completed photo analysis from sessionStorage if available
  let savedAnalysis = null;
  let savedScan     = null;
  let currentNotSureState = false;

  function loadStoredData() {
    try {
      const rawAnalysis = sessionStorage.getItem('ww_analysis');
      const rawScan     = sessionStorage.getItem('ww_scan');
      if (rawAnalysis) savedAnalysis = JSON.parse(rawAnalysis);
      if (rawScan)     savedScan     = JSON.parse(rawScan);
    } catch (e) {
      console.warn('Could not read sessionStorage analysis data:', e);
    }
  }
  loadStoredData();

  // ─────────────────────────────────────────────────────────────
  // 1. Toggle Button Strikethrough Logic
  // ─────────────────────────────────────────────────────────────
  symptomRows.forEach((row) => {
    const btn = row.querySelector('.symptom-toggle-btn');
    const textEl = row.querySelector('.symptom-text');

    if (!btn || !textEl) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCurrentlyExcluded = row.classList.contains('is-excluded');
      const newExcludedState = !isCurrentlyExcluded;

      if (newExcludedState) {
        row.classList.add('is-excluded');
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', `Include symptom: ${textEl.textContent.trim()}`);
      } else {
        row.classList.remove('is-excluded');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', `Exclude symptom: ${textEl.textContent.trim()}`);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Health Track Processing Pipeline
  // ─────────────────────────────────────────────────────────────
  function resetProcessingStages() {
    if (processingError) processingError.style.display = 'none';
    if (processingProgressFill) processingProgressFill.style.width = '0%';
    if (processingProgressbar) processingProgressbar.setAttribute('aria-valuenow', '0');
    if (processingHeading) processingHeading.textContent = 'Preparing your wound assessment';

    for (let i = 1; i <= 6; i++) {
      const stageEl = document.getElementById(`stage-${i}`);
      if (stageEl) {
        stageEl.className = 'stage-row stage-pending';
        const iconContainer = stageEl.querySelector('.stage-icon-container');
        if (iconContainer) iconContainer.innerHTML = ICON_PENDING;
      }
    }
  }

  function setStageState(stageId, state) {
    const stageEl = document.getElementById(`stage-${stageId}`);
    if (!stageEl) return;

    stageEl.className = `stage-row stage-${state}`;
    const iconContainer = stageEl.querySelector('.stage-icon-container');
    if (!iconContainer) return;

    if (state === 'pending') {
      iconContainer.innerHTML = ICON_PENDING;
    } else if (state === 'running') {
      iconContainer.innerHTML = ICON_RUNNING;
    } else if (state === 'completed') {
      iconContainer.innerHTML = ICON_COMPLETED;
    }
  }

  function updateProgress(percent) {
    if (processingProgressFill) processingProgressFill.style.width = `${percent}%`;
    if (processingProgressbar) processingProgressbar.setAttribute('aria-valuenow', `${percent}`);
  }

  async function runProcessingPipeline(isNotSure) {
    resetProcessingStages();
    loadStoredData();

    const startTime = performance.now();
    const stageTasksCompleted = [false, false, false, false, false, false, false];
    let backgroundError = null;

    // ── Actual Processing Runs in Background ───────────────────
    const backgroundPromise = (async () => {
      try {
        // Stage 1: Load completed photo assessment
        loadStoredData();
        stageTasksCompleted[1] = true;

        // Stage 2: Review confirmed symptoms
        getSymptomState();
        stageTasksCompleted[2] = true;

        // Stage 3: Check urgent warning signs
        const { activeSymptoms } = getSymptomState();
        const hasEmergency = !isNotSure && activeSymptoms.some(s => s.id === 1 || s.id === 7);
        if (hasEmergency) {
          // If urgent emergency discovered, notify immediately
          showFinalAssessment(false);
          return;
        }
        stageTasksCompleted[3] = true;

        // Stage 4: Combine assessment information
        stageTasksCompleted[4] = true;

        // Stage 5: Prepare next-step guidance
        stageTasksCompleted[5] = true;

        // Stage 6: Final results preparation
        stageTasksCompleted[6] = true;
      } catch (err) {
        backgroundError = err;
        throw err;
      }
    })();

    // ── Paced Visual Presentation ──────────────────────────────
    try {
      for (const stage of STAGES) {
        const stageId = stage.id;

        // If background processing encountered an error, show error immediately
        if (backgroundError) {
          throw backgroundError;
        }

        // Update main heading to current stage
        if (processingHeading) {
          processingHeading.textContent = stage.title;
        }

        // Mark stage as running
        setStageState(stageId, 'running');

        // Only mark stage complete after its actual task succeeds
        while (!stageTasksCompleted[stageId]) {
          if (backgroundError) throw backgroundError;
          await sleep(40);
        }

        // Pacing interval: keep stage active approximately 800–1,000ms for comfortable reading
        await sleep(STAGE_INTERVAL_MS);

        // Mark stage complete
        setStageState(stageId, 'completed');

        // Animate progress-bar smoothly (700ms ease-in-out in CSS)
        updateProgress(stage.progress);
      }

      // Ensure actual background processing is completely finished
      await backgroundPromise;

      // Ensure minimum display duration has elapsed (at least 6 seconds)
      const elapsedTime = performance.now() - startTime;
      const remainingTime = Math.max(0, MIN_PROCESSING_DURATION_MS - elapsedTime);
      if (remainingTime > 0) {
        await sleep(remainingTime);
      }

      // Smooth transition to final assessment
      showFinalAssessment(isNotSure);

    } catch (err) {
      console.error('Processing error:', err);
      // Show errors immediately, bypassing remaining animation
      if (processingError) {
        processingError.style.display = 'flex';
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Evaluate Care Rules & Render Final Results
  // ─────────────────────────────────────────────────────────────
  function getSymptomState() {
    const activeSymptoms   = [];
    const excludedSymptoms = [];

    symptomRows.forEach((row) => {
      const id = parseInt(row.dataset.symptomId, 10);
      const text = row.querySelector('.symptom-text').textContent.trim();
      const isExcluded = row.classList.contains('is-excluded');

      if (isExcluded) {
        excludedSymptoms.push({ id, text });
      } else {
        activeSymptoms.push({ id, text });
      }
    });

    return { activeSymptoms, excludedSymptoms };
  }

  function showFinalAssessment(isNotSureState = false) {
    const { activeSymptoms } = getSymptomState();

    const hasEmergency = !isNotSureState && activeSymptoms.some((s) => s.id === 1 || s.id === 7);
    const hasUrgent    = !isNotSureState && activeSymptoms.some((s) => s.id !== 1 && s.id !== 7);

    // Save final result object for result.html
    const resultPayload = {
      timestamp: Date.now(),
      hasEmergency,
      hasUrgent,
      isNotSure: isNotSureState,
      activeSymptoms,
      photoUrl: (savedScan && savedScan.imageDataUrl) || (savedAnalysis && savedAnalysis.photoUrl) || ''
    };

    try {
      sessionStorage.setItem('ww_result', JSON.stringify(resultPayload));
    } catch (e) {
      console.warn('Could not store ww_result in sessionStorage:', e);
      try {
        sessionStorage.setItem('ww_result', JSON.stringify({ ...resultPayload, photoUrl: '' }));
      } catch (err) {}
    }

    // Navigate to the complete Wound Health Result page
    window.location.href = 'result.html';
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Confirmation Event Handlers
  // ─────────────────────────────────────────────────────────────
  function handleConfirmation(isNotSure) {
    currentNotSureState = isNotSure;
    const { activeSymptoms } = getSymptomState();

    // Critical Patient Safety Rule:
    // Evaluate urgent-care rules immediately upon symptom confirmation.
    // If an immediate emergency is identified, show care alert immediately without animation delay.
    const hasEmergency = !isNotSure && activeSymptoms.some((s) => s.id === 1 || s.id === 7);
    if (hasEmergency) {
      showFinalAssessment(false);
      return;
    }

    // Otherwise, transition to the Health Track Processing Screen
    symptomReviewView.style.display = 'none';
    symptomResultView.style.display = 'none';
    processingView.style.display    = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    runProcessingPipeline(isNotSure);
  }

  if (btnConfirmSymptoms) {
    btnConfirmSymptoms.addEventListener('click', () => {
      handleConfirmation(false);
    });
  }

  if (btnNotSure) {
    btnNotSure.addEventListener('click', () => {
      handleConfirmation(true);
    });
  }

  if (btnRetryProcessing) {
    btnRetryProcessing.addEventListener('click', () => {
      runProcessingPipeline(currentNotSureState);
    });
  }

  if (btnEditSymptoms) {
    btnEditSymptoms.addEventListener('click', () => {
      symptomResultView.style.display = 'none';
      processingView.style.display    = 'none';
      symptomReviewView.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
