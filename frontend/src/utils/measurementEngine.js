/**
 * Measurement Engine for WoundWise
 * Reproducible 2D area estimation, CIELAB relative redness detection,
 * coordinate-system consistency, and honest missing-data states.
 */

// 1. sRGB to CIELAB Conversion (D65 Reference White)
export function rgbToCielab(r, g, b) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const rLin = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
  const gLin = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
  const bLin = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

  const x = (rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375) * 100;
  const y = (rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.0721750) * 100;
  const z = (rLin * 0.0193339 + gLin * 0.1191920 + bLin * 0.9503041) * 100;

  const Xn = 95.047;
  const Yn = 100.000;
  const Zn = 108.883;

  const xr = x / Xn;
  const yr = y / Yn;
  const zr = z / Zn;

  const fx = xr > 0.008856 ? Math.cbrt(xr) : (7.787 * xr) + (16 / 116);
  const fy = yr > 0.008856 ? Math.cbrt(yr) : (7.787 * yr) + (16 / 116);
  const fz = zr > 0.008856 ? Math.cbrt(zr) : (7.787 * zr) + (16 / 116);

  const L = (116 * fy) - 16;
  const a = 500 * (fx - fy);
  const bLab = 200 * (fy - fz);

  return { L, a, b: bLab };
}

// 2. Statistical Helpers (Median and MAD)
export function calculateMedian(array) {
  if (!array || array.length === 0) return 0;
  const sorted = [...array].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateMAD(array, medianVal) {
  if (!array || array.length === 0) return 0;
  const med = medianVal !== undefined ? medianVal : calculateMedian(array);
  const diffs = array.map(val => Math.abs(val - med));
  return 1.4826 * calculateMedian(diffs);
}

// 3. Polygon Area Calculation (Shoelace Formula)
export function getPolygonArea(points) {
  if (!points || points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

// 4. Point-in-Polygon Check (Ray-Casting)
export function isPointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// 5. Calculate Wound Coverage Percentage
export function calculateWoundCoverage({ roi, boundary, isNoWoundConfirmed, isConfirmed }) {
  if (isNoWoundConfirmed) {
    return {
      coveragePct: 0.0,
      woundAreaPx: 0,
      roiAreaPx: roi ? roi.w * roi.h : 0,
      status: 'no_wound',
      displayText: 'Wound coverage: 0.0% of selected region',
      reason: 'Confirmed no wound visible'
    };
  }

  if (!isConfirmed || !boundary || boundary.length < 3 || !roi || roi.w <= 0 || roi.h <= 0) {
    return {
      coveragePct: null,
      woundAreaPx: 0,
      roiAreaPx: roi ? roi.w * roi.h : 0,
      status: 'unconfirmed',
      displayText: 'Please review the wound boundary',
      reason: 'Wound boundary unconfirmed'
    };
  }

  const woundAreaPx = getPolygonArea(boundary);
  const roiAreaPx = roi.w * roi.h;
  const coveragePct = roiAreaPx > 0 ? (woundAreaPx / roiAreaPx) * 100 : 0;

  return {
    coveragePct: Number(coveragePct.toFixed(1)),
    woundAreaPx,
    roiAreaPx,
    status: 'confirmed',
    displayText: `Wound coverage: ${coveragePct.toFixed(1)}% of selected region`,
    reason: null
  };
}

// 6. Calculate Calibrated Physical Area (cm²)
export function calculatePhysicalArea({ woundAreaPx, scaleLine, isScaleConfirmed, isNoWoundConfirmed }) {
  if (isNoWoundConfirmed) {
    return {
      areaCm2: 0.0,
      status: 'no_wound',
      displayText: isScaleConfirmed ? '0.00 cm²' : '0.00 cm²',
      reason: 'Confirmed no wound visible'
    };
  }

  if (!isScaleConfirmed || !scaleLine || !scaleLine.p1 || !scaleLine.p2) {
    return {
      areaCm2: null,
      status: 'uncalibrated',
      displayText: 'Not measured — add a scale reference',
      reason: 'Scale reference not confirmed'
    };
  }

  const distPx = Math.hypot(scaleLine.p2.x - scaleLine.p1.x, scaleLine.p2.y - scaleLine.p1.y);
  const physLenCm = Number(scaleLine.physicalLength) || 0;

  if (distPx <= 0 || physLenCm <= 0) {
    return {
      areaCm2: null,
      status: 'invalid_scale',
      displayText: 'Not measured — invalid scale reference',
      reason: 'Zero pixel distance or length'
    };
  }

  const pixelsPerCm = distPx / physLenCm;
  const areaCm2 = woundAreaPx / (pixelsPerCm * pixelsPerCm);

  return {
    areaCm2: Number(areaCm2.toFixed(2)),
    pixelsPerCm: Number(pixelsPerCm.toFixed(1)),
    status: 'calibrated',
    displayText: `${areaCm2.toFixed(2)} cm²`,
    reason: null
  };
}

// 7. CIELAB Relative Redness Estimator
export function calculateRelativeRedness({
  imageData,
  imageWidth,
  imageHeight,
  boundary,
  referenceSkinRegion, // { x, y, w, h } or points array
  isNoWoundConfirmed,
  isConfirmed,
  minDeltaA = 3.0,
  k = 2.0
}) {
  if (isNoWoundConfirmed) {
    return {
      rednessPct: null,
      status: 'not_applicable',
      displayText: 'Not applicable (no wound)',
      reason: 'No wound present to assess redness',
      assessableCount: 0,
      redPixelCount: 0
    };
  }

  if (!isConfirmed || !boundary || boundary.length < 3) {
    return {
      rednessPct: null,
      status: 'unconfirmed',
      displayText: 'Not measured — confirm wound boundary',
      reason: 'Wound boundary unconfirmed',
      assessableCount: 0,
      redPixelCount: 0
    };
  }

  if (!imageData || !imageData.data || !referenceSkinRegion) {
    return {
      rednessPct: null,
      status: 'missing_reference',
      displayText: 'Not measured — select healthy skin reference',
      reason: 'Healthy skin reference not selected',
      assessableCount: 0,
      redPixelCount: 0
    };
  }

  const data = imageData.data;
  const w = imageWidth;
  const h = imageHeight;

  // Extract reference skin CIELAB a* values
  const refAValues = [];
  const refX = Math.round(referenceSkinRegion.x);
  const refY = Math.round(referenceSkinRegion.y);
  const refW = Math.round(referenceSkinRegion.w);
  const refH = Math.round(referenceSkinRegion.h);

  for (let y = Math.max(0, refY); y < Math.min(h, refY + refH); y++) {
    for (let x = Math.max(0, refX); x < Math.min(w, refX + refW); x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const lab = rgbToCielab(r, g, b);
      
      // Filter out specular highlights (L > 95) and deep shadows (L < 15)
      if (lab.L >= 15 && lab.L <= 95) {
        refAValues.push(lab.a);
      }
    }
  }

  if (refAValues.length < 10) {
    return {
      rednessPct: null,
      status: 'insufficient_skin_samples',
      displayText: 'Not measured — reference skin sample invalid',
      reason: 'Too few valid pixels in skin reference',
      assessableCount: 0,
      redPixelCount: 0
    };
  }

  const baselineA = calculateMedian(refAValues);
  const spreadA = calculateMAD(refAValues, baselineA);
  const threshold = Math.max(minDeltaA, k * spreadA);

  // Evaluate assessable pixels within wound boundary
  let assessableCount = 0;
  let redPixelCount = 0;

  // Bounding box of boundary polygon for efficiency
  let minX = w, maxX = 0, minY = h, maxY = 0;
  boundary.forEach(p => {
    if (p.x < minX) minX = Math.floor(p.x);
    if (p.x > maxX) maxX = Math.ceil(p.x);
    if (p.y < minY) minY = Math.floor(p.y);
    if (p.y > maxY) maxY = Math.ceil(p.y);
  });

  minX = Math.max(0, minX);
  maxX = Math.min(w - 1, maxX);
  minY = Math.max(0, minY);
  maxY = Math.min(h - 1, maxY);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (isPointInPolygon({ x, y }, boundary)) {
        const idx = (y * w + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const lab = rgbToCielab(r, g, b);

        // Exclude clipped highlights and deep shadows
        if (lab.L >= 15 && lab.L <= 95 && (r < 250 || g < 250 || b < 250)) {
          assessableCount++;
          const deltaA = lab.a - baselineA;
          if (deltaA > threshold) {
            redPixelCount++;
          }
        }
      }
    }
  }

  if (assessableCount < 5) {
    return {
      rednessPct: null,
      status: 'insufficient_target_pixels',
      displayText: 'Not measured — target region too small',
      reason: 'Fewer than 5 assessable pixels in wound mask',
      assessableCount,
      redPixelCount
    };
  }

  const rednessPct = (redPixelCount / assessableCount) * 100;

  return {
    rednessPct: Number(rednessPct.toFixed(1)),
    status: 'complete',
    displayText: `${rednessPct.toFixed(1)}%`,
    reason: null,
    assessableCount,
    redPixelCount,
    baselineA: Number(baselineA.toFixed(2)),
    threshold: Number(threshold.toFixed(2))
  };
}

// 8. Legacy / Naive Heuristic for comparison in regression tests
export function legacyNaiveRedness(r, g, b) {
  if (r > 60 && (r - (g + b) / 2) / 255 > 0.14) {
    return true;
  }
  return false;
}
