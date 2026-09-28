/**
 * Longitudinal Comparison Service for Wound Progression
 * File: backend/src/services/comparisonService.js
 */

const triageService = require('./triageService');

const comparisonService = {
  /**
   * Calculate area change strictly ensuring compatible measurement types
   * Returns: { hasComparison, measurementType, text, changePct }
   */
  calculateAreaChange(currentEntry, baselineEntry) {
    if (!currentEntry || !baselineEntry) {
      return {
        hasComparison: false,
        measurementType: 'unavailable',
        text: 'Size comparison unavailable',
        changePct: null
      };
    }

    const currCm2 = currentEntry.wound_area_cm2 != null ? Number(currentEntry.wound_area_cm2) : null;
    const baseCm2 = baselineEntry.wound_area_cm2 != null ? Number(baselineEntry.wound_area_cm2) : null;

    const currCov = currentEntry.coverage_pct != null ? Number(currentEntry.coverage_pct) : null;
    const baseCov = baselineEntry.coverage_pct != null ? Number(baselineEntry.coverage_pct) : null;

    // Both have confirmed physical cm2 measurements
    if (currCm2 != null && baseCm2 != null && baseCm2 > 0) {
      const pct = ((currCm2 - baseCm2) / baseCm2) * 100;
      const isSmaller = pct < 0;
      const absPct = Math.abs(Math.round(pct));
      const formattedText = isSmaller 
        ? `↓ ${absPct}% smaller than Day 1` 
        : (pct === 0 ? 'Stable physical size since Day 1' : `↑ ${absPct}% larger than Day 1`);

      return {
        hasComparison: true,
        measurementType: 'physical_cm2',
        currentValue: `${currCm2.toFixed(2)} cm²`,
        baselineValue: `${baseCm2.toFixed(2)} cm²`,
        changePct: pct,
        formattedText,
        label: 'physical area'
      };
    }

    // Both have relative ROI area measurements ONLY (neither has physical cm2)
    if (currCm2 == null && baseCm2 == null && currCov != null && baseCov != null && baseCov > 0) {
      const pct = ((currCov - baseCov) / baseCov) * 100;
      const isSmaller = pct < 0;
      const absPct = Math.abs(Math.round(pct));
      const formattedText = isSmaller 
        ? `↓ ${absPct}% smaller than Day 1` 
        : (pct === 0 ? 'Stable relative area since Day 1' : `↑ ${absPct}% larger than Day 1`);

      return {
        hasComparison: true,
        measurementType: 'relative_roi',
        currentValue: `${currCov.toFixed(1)}% ROI area`,
        baselineValue: `${baseCov.toFixed(1)}% ROI area`,
        changePct: pct,
        formattedText,
        label: 'relative wound area'
      };
    }

    // Incompatible units (e.g. one cm2, one relative_roi) or missing values
    return {
      hasComparison: false,
      measurementType: 'unavailable',
      text: 'Size comparison unavailable',
      changePct: null
    };
  },

  /**
   * Compare pain scores (0-10) with explicit null checks
   */
  comparePain(currentPain, baselinePain) {
    if (currentPain == null || baselinePain == null) {
      return { text: 'Not recorded', status: 'neutral' };
    }
    const curr = Number(currentPain);
    const base = Number(baselinePain);
    const diff = curr - base;

    if (diff < 0) return { text: `Improved (${base}/10 → ${curr}/10)`, status: 'improved' };
    if (diff > 0) return { text: `Worsened (${base}/10 → ${curr}/10)`, status: 'worsened' };
    return { text: `Unchanged (${curr}/10)`, status: 'unchanged' };
  },

  /**
   * Compare swelling levels with explicit null checks
   */
  compareSwelling(currentSwelling, baselineSwelling) {
    if (!currentSwelling || !baselineSwelling || currentSwelling === 'Not recorded' || baselineSwelling === 'Not recorded') {
      return { text: 'Not recorded', status: 'neutral' };
    }

    const order = { 'none': 0, 'mild': 1, 'moderate': 2, 'severe': 3 };
    const currRank = order[String(currentSwelling).toLowerCase()] ?? -1;
    const baseRank = order[String(baselineSwelling).toLowerCase()] ?? -1;

    if (currRank === -1 || baseRank === -1) {
      return { text: 'Not recorded', status: 'neutral' };
    }

    if (currRank < baseRank) return { text: `Decreased (${baselineSwelling} → ${currentSwelling})`, status: 'improved' };
    if (currRank > baseRank) return { text: `Increased (${baselineSwelling} → ${currentSwelling})`, status: 'worsened' };
    return { text: `No change (${currentSwelling})`, status: 'unchanged' };
  },

  /**
   * Compare redness status with explicit null checks
   */
  compareRedness(currentRedness, baselineRedness) {
    if (!currentRedness || !baselineRedness || currentRedness === 'Not recorded' || baselineRedness === 'Not recorded') {
      return { text: 'Not recorded', status: 'neutral' };
    }

    if (currentRedness === baselineRedness) {
      return { text: `Unchanged (${currentRedness})`, status: 'unchanged' };
    }
    if (currentRedness === 'Spreading' || currentRedness === 'Slightly Increased') {
      return { text: `Increased (${baselineRedness} → ${currentRedness})`, status: 'worsened' };
    }
    return { text: `Reduced (${baselineRedness} → ${currentRedness})`, status: 'improved' };
  },

  /**
   * Build longitudinal comparison payload (clean & non-recursive storage structure)
   */
  buildWoundComparison(currentEntry, baselineEntry = null, allEntries = []) {
    const isBaseline = !baselineEntry || (baselineEntry.id === currentEntry.id);
    const followupDay = currentEntry.followup_day || (isBaseline ? 1 : (allEntries.findIndex(e => e.id === currentEntry.id) * 2 + 1));

    // Evaluate deterministic safety rules (passing null for baseline if current is baseline)
    const triage = triageService.evaluateTriage(currentEntry, isBaseline ? null : baselineEntry, null);

    if (isBaseline) {
      return {
        isBaseline: true,
        followupDay: 1,
        dayLabel: 'Day 1 Baseline',
        measurementType: currentEntry.wound_area_cm2 != null ? 'physical_cm2' : (currentEntry.coverage_pct != null ? 'relative_roi' : 'unavailable'),
        area: currentEntry.wound_area_cm2 != null 
          ? `${Number(currentEntry.wound_area_cm2).toFixed(2)} cm²` 
          : (currentEntry.coverage_pct != null ? `${Number(currentEntry.coverage_pct).toFixed(1)}% ROI area` : 'Not measured'),
        pain: currentEntry.pain_score != null ? `${currentEntry.pain_score} / 10` : 'Not recorded',
        redness: currentEntry.redness_status || 'Not recorded',
        swelling: currentEntry.swelling_level || 'Not recorded',
        message: "We'll use this check as the baseline for future comparisons.",
        triage,
        compactStore: {
          baselineEntryId: currentEntry.id,
          currentEntryId: currentEntry.id,
          isBaseline: true,
          triageLevel: triage.level
        }
      };
    }

    const areaDiff = comparisonService.calculateAreaChange(currentEntry, baselineEntry);
    const painDiff = comparisonService.comparePain(currentEntry.pain_score, baselineEntry.pain_score);
    const swellingDiff = comparisonService.compareSwelling(currentEntry.swelling_level, baselineEntry.swelling_level);
    const rednessDiff = comparisonService.compareRedness(currentEntry.redness_status, baselineEntry.redness_status);

    // Timeline state array for Day 1, Day 3, Day 5, Day 7
    const timelineStates = [1, 3, 5, 7].map(day => {
      const match = allEntries.find(e => e.followup_day === day);
      return {
        day,
        label: day === 1 ? 'Day 1 (Baseline)' : `Day ${day}`,
        isCompleted: Boolean(match),
        isCurrent: day === followupDay,
        entryId: match ? match.id : null,
        entryDate: match ? match.entry_date : null
      };
    });

    // Healing Progress Determination
    let healingProgress = 'Stable';
    if (areaDiff.hasComparison && areaDiff.changePct !== null && areaDiff.changePct < -5 && painDiff.status !== 'worsened') {
      healingProgress = 'Improving';
    } else if (areaDiff.hasComparison && areaDiff.changePct !== null && areaDiff.changePct > 5) {
      healingProgress = 'Worsening';
    } else if (rednessDiff.status === 'worsened' || swellingDiff.status === 'worsened') {
      healingProgress = 'Worsening';
    }

    // Format clean display values
    const baseAreaStr = baselineEntry.wound_area_cm2 != null 
      ? `${Number(baselineEntry.wound_area_cm2).toFixed(2)} cm²` 
      : (baselineEntry.coverage_pct != null ? `${Number(baselineEntry.coverage_pct).toFixed(1)}% ROI area` : 'Not measured');

    const currAreaStr = currentEntry.wound_area_cm2 != null 
      ? `${Number(currentEntry.wound_area_cm2).toFixed(2)} cm²` 
      : (currentEntry.coverage_pct != null ? `${Number(currentEntry.coverage_pct).toFixed(1)}% ROI area` : 'Not measured');

    // Compact storage object (no full nested entry recursion!)
    const compactStore = {
      baselineEntryId: baselineEntry.id,
      currentEntryId: currentEntry.id,
      isBaseline: false,
      measurementType: areaDiff.measurementType,
      areaChangePct: areaDiff.changePct,
      painChange: painDiff.text,
      rednessChange: rednessDiff.text,
      swellingChange: swellingDiff.text,
      triageLevel: triage.level,
      healingProgress
    };

    return {
      isBaseline: false,
      followupDay,
      dayLabel: `Day ${followupDay} Follow-up`,
      measurementType: areaDiff.measurementType,
      areaDiff,
      painDiff,
      swellingDiff,
      rednessDiff,
      healingProgress,
      timelineStates,
      whatChanged: [
        { label: 'Wound size', from: baseAreaStr, to: currAreaStr, summary: areaDiff.hasComparison ? areaDiff.formattedText : 'Size comparison unavailable' },
        { label: 'Pain score', from: baselineEntry.pain_score != null ? `${baselineEntry.pain_score}/10` : 'Not recorded', to: currentEntry.pain_score != null ? `${currentEntry.pain_score}/10` : 'Not recorded', summary: painDiff.text },
        { label: 'Redness', from: baselineEntry.redness_status || 'Not recorded', to: currentEntry.redness_status || 'Not recorded', summary: rednessDiff.text },
        { label: 'Swelling', from: baselineEntry.swelling_level || 'Not recorded', to: currentEntry.swelling_level || 'Not recorded', summary: swellingDiff.text },
        { label: 'Fever', from: baselineEntry.fever === true ? 'Yes' : (baselineEntry.fever === false ? 'No' : 'Not recorded'), to: currentEntry.fever === true ? 'Yes' : (currentEntry.fever === false ? 'No' : 'Not recorded'), summary: currentEntry.fever === true ? 'Reported' : (currentEntry.fever === false ? 'No' : 'Not recorded') },
        { label: 'Discharge', from: baselineEntry.discharge === true ? 'Yes' : (baselineEntry.discharge === false ? 'No' : 'Not recorded'), to: currentEntry.discharge === true ? 'Yes' : (currentEntry.discharge === false ? 'No' : 'Not recorded'), summary: currentEntry.discharge === true ? 'Reported' : (currentEntry.discharge === false ? 'No' : 'Not recorded') }
      ],
      triage,
      compactStore
    };
  }
};

module.exports = comparisonService;
