import {
  rgbToCielab,
  calculateMedian,
  calculateMAD,
  getPolygonArea,
  calculateWoundCoverage,
  calculatePhysicalArea,
  calculateRelativeRedness,
  legacyNaiveRedness
} from './frontend/src/utils/measurementEngine.js';

import comparisonService from './backend/src/services/comparisonService.js';

console.log('====================================================');
console.log('  RUNNING DETERMINISTIC MEASUREMENT ENGINE TESTS    ');
console.log('====================================================\n');

let passCount = 0;
let testCount = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    console.log(`[PASS] Test ${testCount}: ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] Test ${testCount}: ${message}`);
  }
}

// ----------------------------------------------------
// Test 1: Synthetic Regression Fixture (Tan Skin RGB 198, 142, 109)
// ----------------------------------------------------
const rTan = 198, gTan = 142, bTan = 109;
const legacyResult = legacyNaiveRedness(rTan, gTan, bTan);
assert(legacyResult === true, 'Legacy naive redness classifies tan skin RGB(198,142,109) as RED (False Positive bug verified)');

// Create 10x10 dummy image data filled with tan skin RGB(198,142,109)
const w = 10, h = 10;
const buffer = new Uint8ClampedArray(w * h * 4);
for (let i = 0; i < buffer.length; i += 4) {
  buffer[i] = rTan;
  buffer[i + 1] = gTan;
  buffer[i + 2] = bTan;
  buffer[i + 3] = 255;
}

const mockImgData = { data: buffer };
const boundary10x10 = [
  { x: 1, y: 1 },
  { x: 8, y: 1 },
  { x: 8, y: 8 },
  { x: 1, y: 8 }
];

const refSkinRegion = { x: 0, y: 0, w: 10, h: 10 };

const relRednessTanSkin = calculateRelativeRedness({
  imageData: mockImgData,
  imageWidth: w,
  imageHeight: h,
  boundary: boundary10x10,
  referenceSkinRegion: refSkinRegion,
  isConfirmed: true,
  isNoWoundConfirmed: false
});

assert(relRednessTanSkin.rednessPct === 0, `Relative CIELAB detector on uniform tan skin yields 0% excess red (Got ${relRednessTanSkin.rednessPct}%)`);

// ----------------------------------------------------
// Test 2: Reference of 2 cm spanning 200 pixels & 25,000 px² boundary -> 2.5 cm²
// ----------------------------------------------------
const scaleLine2cm = {
  p1: { x: 0, y: 0 },
  p2: { x: 200, y: 0 },
  physicalLength: 2.0 // 200 px = 2 cm -> 100 px/cm -> 10,000 px/cm²
};

const area25kRes = calculatePhysicalArea({
  woundAreaPx: 25000,
  scaleLine: scaleLine2cm,
  isScaleConfirmed: true,
  isNoWoundConfirmed: false
});

assert(area25kRes.areaCm2 === 2.5, `200px / 2cm scale with 25,000 px² boundary yields 2.5 cm² (Got ${area25kRes.areaCm2} cm²)`);

// ----------------------------------------------------
// Test 3: Scale Invariance Check (Scaling coordinates by factor of 2 leaves cm² unchanged)
// ----------------------------------------------------
const scaleFactor = 2;
const scaleLineScaled = {
  p1: { x: 0, y: 0 },
  p2: { x: 200 * scaleFactor, y: 0 },
  physicalLength: 2.0
};
const woundAreaScaled = 25000 * (scaleFactor * scaleFactor);

const areaScaledRes = calculatePhysicalArea({
  woundAreaPx: woundAreaScaled,
  scaleLine: scaleLineScaled,
  isScaleConfirmed: true,
  isNoWoundConfirmed: false
});

assert(areaScaledRes.areaCm2 === 2.5, `Scaling image coordinates by 2x preserves physical area at 2.5 cm² (Got ${areaScaledRes.areaCm2} cm²)`);

// ----------------------------------------------------
// Test 4: Winding Reversal Check (Reversing polygon winding preserves area)
// ----------------------------------------------------
const polyCW = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
const polyCCW = [...polyCW].reverse();

const areaCW = getPolygonArea(polyCW);
const areaCCW = getPolygonArea(polyCCW);
assert(areaCW === 10000 && areaCCW === 10000, `Reversing polygon winding preserves polygon area (CW=${areaCW}, CCW=${areaCCW})`);

// ----------------------------------------------------
// Test 5: Area Reduction Comparison Math (4 cm² -> 3 cm² = 25% reduction)
// ----------------------------------------------------
const baselineEntry4cm2 = { id: 'entry-1', wound_id: 'wound-1', wound_area_cm2: 4.0 };
const currentEntry3cm2 = { id: 'entry-2', wound_id: 'wound-1', wound_area_cm2: 3.0 };

const comp25PctReduction = comparisonService.calculateAreaChange(currentEntry3cm2, baselineEntry4cm2);
assert(comp25PctReduction.reductionPct === 25.0, `Baseline 4.0 cm² and current 3.0 cm² yields 25.0% reduction (Got ${comp25PctReduction.reductionPct}%)`);
assert(comp25PctReduction.formattedText === 'Estimated area decreased by 25%', `Formatted reduction text: "${comp25PctReduction.formattedText}"`);

// ----------------------------------------------------
// Test 6: Area Increase Comparison Math (4 cm² -> 5 cm² = 25% increase)
// ----------------------------------------------------
const currentEntry5cm2 = { id: 'entry-3', wound_id: 'wound-1', wound_area_cm2: 5.0 };

const comp25PctIncrease = comparisonService.calculateAreaChange(currentEntry5cm2, baselineEntry4cm2);
assert(comp25PctIncrease.reductionPct === -25.0, `Baseline 4.0 cm² and current 5.0 cm² yields -25.0% reduction (Got ${comp25PctIncrease.reductionPct}%)`);
assert(comp25PctIncrease.formattedText === 'Estimated area increased by 25%', `Formatted increase text: "${comp25PctIncrease.formattedText}"`);

// ----------------------------------------------------
// Test 7: Missing/Zero Baseline Area Comparison Math
// ----------------------------------------------------
const baselineEntryZero = { id: 'entry-0', wound_id: 'wound-1', wound_area_cm2: 0 };
const compZeroBaseline = comparisonService.calculateAreaChange(currentEntry3cm2, baselineEntryZero);
assert(compZeroBaseline.hasComparison === false, `Zero baseline area produces unavailable comparison`);
assert(compZeroBaseline.formattedText === 'Area comparison unavailable', `Zero baseline displays "Area comparison unavailable"`);

// ----------------------------------------------------
// Test 8: Separate Wounds Comparison Isolation
// ----------------------------------------------------
const separateWoundEntry = { id: 'entry-diff', wound_id: 'wound-2', wound_area_cm2: 3.0 };
const compSeparateWounds = comparisonService.calculateAreaChange(separateWoundEntry, baselineEntry4cm2);
assert(compSeparateWounds.hasComparison === false, `Separate wounds never get compared automatically`);
assert(compSeparateWounds.reason === 'Separate wounds cannot be compared', `Reason string confirms separate wounds restriction`);

// ----------------------------------------------------
// Test 9: First Assessment for Wound Case
// ----------------------------------------------------
const compBaselineFirst = comparisonService.calculateAreaChange(baselineEntry4cm2, baselineEntry4cm2);
assert(compBaselineFirst.isBaseline === true, `First assessment is marked as baseline`);
assert(compBaselineFirst.formattedText === 'Baseline recorded', `First assessment displays "Baseline recorded"`);

console.log('\n====================================================');
console.log(`  TEST RESULTS: ${passCount} / ${testCount} PASSED`);
console.log('====================================================\n');
