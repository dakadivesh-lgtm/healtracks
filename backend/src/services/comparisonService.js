/**
 * Longitudinal Comparison Service for Wound Progression
 * File: backend/src/services/comparisonService.js
 */

const triageService = require('./triageService');

const comparisonService = {
  /**
   * Calculate physical area change strictly ensuring same wound case and valid calibration
   */
  calculateAreaChange(currentEntry, baselineEntry) {
    if (!currentEntry || !baselineEntry || String(currentEntry.wound_id) !== String(baselineEntry.wound_id)) {
      return {
        hasComparison: false,
        measurementType: 'unavailable',
        formattedText: 'Area comparison unavailable',
        reason: 'Separate wounds cannot be compared',
        changePct: null
      };
    }

    if (currentEntry.id === baselineEntry.id) {
      return {
        hasComparison: false,
        isBaseline: true,
        measurementType: 'baseline',
        formattedText: 'Baseline recorded',
        reason: 'First assessment recorded for this wound case',
        changePct: 0
      };
    }

    const currCm2 = currentEntry.wound_area_cm2 != null ? Number(currentEntry.wound_area_cm2) : null;
    const baseCm2 = baselineEntry.wound_area_cm2 != null ? Number(baselineEntry.wound_area_cm2) : null;

    if (currCm2 != null && baseCm2 != null && baseCm2 > 0) {
      const reductionPct = ((baseCm2 - currCm2) / baseCm2) * 100;
      const absPct = Math.abs(Number(reductionPct.toFixed(1)));
      
      const formattedText = reductionPct > 0
        ? `Estimated area decreased by ${absPct}%`
        : (reductionPct < 0 ? `Estimated area increased by ${absPct}%` : 'Estimated area unchanged');

      return {
        hasComparison: true,
        measurementType: 'physical_cm2',
        currentValue: `${currCm2.toFixed(2)} cm²`,
        baselineValue: `${baseCm2.toFixed(2)} cm²`,
        reductionPct: Number(reductionPct.toFixed(1)),
        changePct: Number((-reductionPct).toFixed(1)),
        formattedText,
        label: 'physical area'
      };
    }

    return {
      hasComparison: false,
      measurementType: 'unavailable',
      formattedText: 'Area comparison unavailable',
      reason: 'Calibration missing on baseline or follow-up assessment',
      changePct: null
    };
  },

  /**
   * Compare pain scores (0-10) with explicit null checks
   */
  comparePain(currentPain, baselinePain) {
    if (currentPain === null || currentPain === undefined || baselinePain === null || baselinePain === undefined) {
      return { text: 'Not reported', status: 'neutral' };
    }
    const curr = Number(currentPain);
    const base = Number(baselinePain);
    const diff = curr - base;

    if (diff < 0) return { text: `Decreased (${base}/10 → ${curr}/10)`, status: 'improved' };
    if (diff > 0) return { text: `Increased (${base}/10 → ${curr}/10)`, status: 'worsened' };
    return { text: `Unchanged (${curr}/10)`, status: 'unchanged' };
  },

  /**
   * Compare swelling levels with explicit null checks
   */
  compareSwelling(currentSwelling, baselineSwelling) {
    if (!currentSwelling || !baselineSwelling || currentSwelling === 'Not reported' || baselineSwelling === 'Not reported') {
      return { text: 'Not reported', status: 'neutral' };
    }

    const order = { 'none': 0, 'mild': 1, 'moderate': 2, 'severe': 3 };
    const currRank = order[String(currentSwelling).toLowerCase()] ?? -1;
    const baseRank = order[String(baselineSwelling).toLowerCase()] ?? -1;

    if (currRank === -1 || baseRank === -1) {
      return { text: 'Not reported', status: 'neutral' };
    }

    if (currRank < baseRank) return { text: `Decreased (${baselineSwelling} → ${currentSwelling})`, status: 'improved' };
    if (currRank > baseRank) return { text: `Increased (${baselineSwelling} → ${currentSwelling})`, status: 'worsened' };
    return { text: `Unchanged (${currentSwelling})`, status: 'unchanged' };
  },

  /**
   * Compare spreading redness status
   */
  compareRedness(currentRedness, baselineRedness) {
    if (!currentRedness || !baselineRedness || currentRedness === 'Not reported' || baselineRedness === 'Not reported') {
      return { text: 'Not reported', status: 'neutral' };
    }

    if (currentRedness === baselineRedness) {
      return { text: `Unchanged (${currentRedness})`, status: 'unchanged' };
    }
    if (currentRedness === 'Spreading' || currentRedness === 'Yes') {
      return { text: `Increased (${baselineRedness} → ${currentRedness})`, status: 'worsened' };
    }
    return { text: `Reduced (${baselineRedness} → ${currentRedness})`, status: 'improved' };
  },

  /**
   * Build longitudinal comparison payload for a wound entry
   */
  buildWoundComparison(currentEntry, baselineEntry = null, allEntries = []) {
    const isBaseline = !baselineEntry || (baselineEntry.id === currentEntry.id);
    const followupDay = currentEntry.followup_day || (isBaseline ? 1 : (allEntries.findIndex(e => e.id === currentEntry.id) * 2 + 1));

    const triage = triageService.evaluateTriage(currentEntry, isBaseline ? null : baselineEntry, null);

    if (isBaseline) {
      return {
        isBaseline: true,
        followupDay: 1,
        dayLabel: 'Day 1 Baseline',
        measurementType: currentEntry.wound_area_cm2 != null ? 'physical_cm2' : 'unavailable',
        area: currentEntry.wound_area_cm2 != null 
          ? `${Number(currentEntry.wound_area_cm2).toFixed(2)} cm²` 
          : 'Physical size unavailable—add a scale reference',
        pain: currentEntry.pain_score != null ? `${currentEntry.pain_score} / 10` : 'Not reported',
        redness: currentEntry.redness_status || 'Not reported',
        swelling: currentEntry.swelling_level || 'Not reported',
        message: 'Baseline recorded for this wound case.',
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

    const baseAreaStr = baselineEntry.wound_area_cm2 != null 
      ? `${Number(baselineEntry.wound_area_cm2).toFixed(2)} cm²` 
      : 'Physical size unavailable';

    const currAreaStr = currentEntry.wound_area_cm2 != null 
      ? `${Number(currentEntry.wound_area_cm2).toFixed(2)} cm²` 
      : 'Physical size unavailable';

    return {
      isBaseline: false,
      followupDay,
      dayLabel: `Day ${followupDay} Follow-up`,
      measurementType: areaDiff.measurementType,
      areaDiff,
      painDiff,
      swellingDiff,
      rednessDiff,
      healingProgress: areaDiff.hasComparison && areaDiff.reductionPct > 0 ? 'Improving' : (areaDiff.hasComparison && areaDiff.reductionPct < 0 ? 'Worsening' : 'Stable'),
      whatChanged: [
        { label: 'Estimated 2D area', from: baseAreaStr, to: currAreaStr, summary: areaDiff.formattedText },
        { label: 'Pain score', from: baselineEntry.pain_score != null ? `${baselineEntry.pain_score}/10` : 'Not reported', to: currentEntry.pain_score != null ? `${currentEntry.pain_score}/10` : 'Not reported', summary: painDiff.text },
        { label: 'Spreading redness', from: baselineEntry.redness_status || 'Not reported', to: currentEntry.redness_status || 'Not reported', summary: rednessDiff.text },
        { label: 'Swelling', from: baselineEntry.swelling_level || 'Not reported', to: currentEntry.swelling_level || 'Not reported', summary: swellingDiff.text }
      ],
      triage,
      compactStore: {
        baselineEntryId: baselineEntry.id,
        currentEntryId: currentEntry.id,
        isBaseline: false,
        measurementType: areaDiff.measurementType,
        areaChangePct: areaDiff.reductionPct,
        painChange: painDiff.text,
        rednessChange: rednessDiff.text,
        swellingChange: swellingDiff.text,
        triageLevel: triage.level
      }
    };
  }
};

module.exports = comparisonService;
