/**
 * Deterministic Safety Rule Engine for Wound Triage
 * File: backend/src/services/triageService.js
 */

const triageService = {
  /**
   * Evaluate deterministic triage level and reasons
   * @param {Object} currentEntry - Current entry with symptoms and measurements
   * @param {Object|null} baselineEntry - Day 1 baseline entry if applicable
   * @param {Object|null} previousEntry - Immediate previous entry if applicable
   * @returns {Object} { level: 'green'|'amber'|'red', title: string, reasons: Array<string>, nextAction: string }
   */
  evaluateTriage(currentEntry, baselineEntry = null, previousEntry = null) {
    const reasons = [];
    let level = 'green';

    const s = currentEntry || {};
    const symptomData = typeof s.symptom_data === 'string'
      ? (JSON.parse(s.symptom_data || '{}'))
      : (s.symptom_data || {});

    // Check if current entry is baseline
    const isBaseline = !baselineEntry || (baselineEntry.id === s.id);

    // Helper checks
    const isSnakeBite = Boolean(s.snake_bite || symptomData.snakeBite);
    const isAnimalBite = Boolean(s.animal_bite || symptomData.animalBite);
    const isBleedingUncontrolled = Boolean(s.bleeding_uncontrolled || symptomData.bleedingUncontrolled);
    const hasFever = Boolean(s.fever || symptomData.fever);
    const isRednessSpreading = (s.redness_status === 'Spreading' || symptomData.rednessStatus === 'Spreading');
    const hasDischarge = Boolean(s.discharge || symptomData.discharge);
    const hasBadSmell = Boolean(s.bad_smell || symptomData.badSmell);
    const isWorseningPain = Boolean(s.worsening_pain || symptomData.worseningPain);
    const hasDiabetes = Boolean(s.diabetes || symptomData.diabetes);
    const isFootWound = Boolean(s.foot_wound || symptomData.footWound);
    const hasTetanusConcern = Boolean(s.tetanus_concern || symptomData.tetanusConcern);

    // --- RED CRITERIA (Safety Rules & Urgent Warning Signs) ---
    if (isSnakeBite) {
      level = 'red';
      reasons.push('Snake bite wound reported requiring immediate medical evaluation.');
    }
    if (isAnimalBite) {
      level = 'red';
      reasons.push('Animal bite wound reported with risk of rabies or severe bacterial infection.');
    }
    if (isBleedingUncontrolled) {
      level = 'red';
      reasons.push('Uncontrolled bleeding reported.');
    }
    if (hasFever && isRednessSpreading) {
      level = 'red';
      reasons.push('Systemic fever combined with spreading periwound redness (possible cellulitis).');
    }
    if (hasDischarge && isWorseningPain) {
      level = 'red';
      reasons.push('Pus/discharge accompanied by worsening pain level.');
    }
    if (hasBadSmell && isWorseningPain) {
      level = 'red';
      reasons.push('Foul odor accompanied by worsening symptoms.');
    }
    if (hasDiabetes && isFootWound) {
      level = 'red';
      reasons.push('Diabetic foot wound present requiring high-priority clinical oversight.');
    }
    if (hasTetanusConcern) {
      level = 'red';
      reasons.push('Deep/dirty wound with unknown or outdated tetanus vaccination.');
    }

    // Only evaluate longitudinal area change if NOT baseline entry!
    if (!isBaseline) {
      const hasPhysicalBoth = currentEntry.wound_area_cm2 != null && baselineEntry.wound_area_cm2 != null;
      const hasRelativeBoth = currentEntry.wound_area_cm2 == null && baselineEntry.wound_area_cm2 == null && currentEntry.coverage_pct != null && baselineEntry.coverage_pct != null;

      if (hasPhysicalBoth && baselineEntry.wound_area_cm2 > 0) {
        const areaChangePct = ((currentEntry.wound_area_cm2 - baselineEntry.wound_area_cm2) / baselineEntry.wound_area_cm2) * 100;
        if (areaChangePct > 15) {
          level = 'red';
          reasons.push(`Wound physical area increased significantly (${areaChangePct.toFixed(1)}% larger than Day 1 baseline).`);
        }
      } else if (hasRelativeBoth && baselineEntry.coverage_pct > 0) {
        const areaChangePct = ((currentEntry.coverage_pct - baselineEntry.coverage_pct) / baselineEntry.coverage_pct) * 100;
        if (areaChangePct > 15) {
          level = 'red';
          reasons.push(`Relative wound area increased significantly (${areaChangePct.toFixed(1)}% larger than Day 1 baseline).`);
        }
      }
    }

    if (level === 'red') {
      return {
        level: 'red',
        title: 'See a health center today',
        reasons,
        nextAction: 'Do not wait for the next scheduled check. Seek professional medical evaluation promptly.'
      };
    }

    // --- AMBER CRITERIA ---
    const isRednessSlightlyIncreased = (s.redness_status === 'Slightly Increased' || symptomData.rednessStatus === 'Slightly Increased');
    const painScore = s.pain_score != null ? Number(s.pain_score) : (symptomData.painScore != null ? Number(symptomData.painScore) : null);
    const prevPainScore = (previousEntry && previousEntry.pain_score != null) ? Number(previousEntry.pain_score) : null;
    const isPainWorsened = prevPainScore !== null && painScore !== null && painScore > prevPainScore;

    // Longitudinal area not decreasing (only for follow-up entries!)
    if (!isBaseline) {
      const hasPhysicalBoth = currentEntry.wound_area_cm2 != null && baselineEntry.wound_area_cm2 != null;
      const hasRelativeBoth = currentEntry.wound_area_cm2 == null && baselineEntry.wound_area_cm2 == null && currentEntry.coverage_pct != null && baselineEntry.coverage_pct != null;

      if (hasPhysicalBoth && baselineEntry.wound_area_cm2 > 0) {
        const areaChangePct = ((currentEntry.wound_area_cm2 - baselineEntry.wound_area_cm2) / baselineEntry.wound_area_cm2) * 100;
        if (areaChangePct >= 0) {
          level = 'amber';
          reasons.push('Wound physical area has not decreased compared to Day 1 baseline.');
        }
      } else if (hasRelativeBoth && baselineEntry.coverage_pct > 0) {
        const areaChangePct = ((currentEntry.coverage_pct - baselineEntry.coverage_pct) / baselineEntry.coverage_pct) * 100;
        if (areaChangePct >= 0) {
          level = 'amber';
          reasons.push('Relative wound area has not decreased compared to Day 1 baseline.');
        }
      }
    }

    if (isRednessSlightlyIncreased) {
      level = 'amber';
      reasons.push('Periwound redness has increased slightly.');
    }

    if (isPainWorsened) {
      level = 'amber';
      reasons.push(`Pain level increased from ${prevPainScore}/10 to ${painScore}/10.`);
    }

    if (level === 'amber') {
      return {
        level: 'amber',
        title: 'Watch closely',
        reasons: reasons.length > 0 ? reasons : ['Symptoms or measurements warrant closer monitoring.'],
        nextAction: 'Recheck tomorrow. Seek clinical care sooner if symptoms worsen.'
      };
    }

    // --- GREEN DEFAULT ---
    return {
      level: 'green',
      title: 'No urgent warning signs found',
      reasons: isBaseline ? [
        'Baseline assessment established cleanly',
        'No systemic fever or spreading redness reported',
        'No uncontrolled discharge or urgent risk factors reported'
      ] : [
        'Wound area is stable or improving compared to baseline',
        'No systemic fever or spreading redness reported',
        'No uncontrolled discharge or urgent risk factors reported'
      ],
      nextAction: 'Keep wound clean and covered. Continue monitoring progression as scheduled.'
    };
  }
};

module.exports = triageService;
