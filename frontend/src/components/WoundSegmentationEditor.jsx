import React, { useRef, useState, useEffect } from 'react';
import { woundService } from '../services/woundService';

// A simple 2D geometry helper to calculate polygon area
function getPolygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

// Real image quality validation using canvas pixel data
function validateImageQuality(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;

  const issues = [];
  let lumSum = 0;
  let edgeScore = 0;
  let prevRow = null;

  for (let y = 0; y < h; y += 4) {
    const row = [];
    for (let x = 0; x < w; x += 4) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      lumSum += lum;
      row.push(lum);
    }
    if (prevRow) {
      for (let k = 0; k < row.length; k++) edgeScore += Math.abs(row[k] - prevRow[k]);
    }
    prevRow = row;
  }

  const totalSamples = Math.floor(w / 4) * Math.floor(h / 4);
  const meanLum = lumSum / totalSamples;
  const meanEdge = edgeScore / totalSamples;

  if (meanLum < 40)  issues.push('poor lighting (too dark)');
  if (meanLum > 225) issues.push('overexposed');
  if (meanEdge < 3)  issues.push('blur detected');
  if (w < 200 || h < 200) issues.push('low resolution');

  const confidence = issues.length === 0 ? 'high'
    : issues.length === 1 ? 'medium'
    : 'poor';

  return { valid: confidence !== 'poor', issues, confidence };
}

// Computer-assisted boundary proposal around a target point
function segmentWoundAroundPoint(canvas, targetX, targetY) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const roiW = Math.round(W * 0.45);
  const roiH = Math.round(H * 0.45);
  const roiX = Math.max(0, Math.min(W - roiW, Math.round(targetX - roiW / 2)));
  const roiY = Math.max(0, Math.min(H - roiH, Math.round(targetY - roiH / 2)));

  const data = ctx.getImageData(roiX, roiY, roiW, roiH).data;
  const scores = new Float32Array(roiW * roiH);
  let totalScore = 0, weightedX = 0, weightedY = 0;

  for (let py = 0; py < roiH; py++) {
    for (let px = 0; px < roiW; px++) {
      const i = (py * roiW + px) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const redness = r > 0 ? (r - (g + b) / 2) / 255 : 0;
      const darkness = 1 - lum / 255;
      const score = Math.max(0, redness * 0.6 + darkness * 0.4 - 0.05);
      scores[py * roiW + px] = score;
      totalScore += score;
      weightedX += px * score;
      weightedY += py * score;
    }
  }

  const cx = totalScore > 0 ? weightedX / totalScore : roiW / 2;
  const cy = totalScore > 0 ? weightedY / totalScore : roiH / 2;

  const NUM_RAYS = 12;
  const threshold = 0.12;
  const boundary = [];

  for (let a = 0; a < NUM_RAYS; a++) {
    const angle = (a / NUM_RAYS) * Math.PI * 2;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let lastGoodR = 0;

    for (let r = 0; r < Math.min(roiW, roiH) * 0.5; r += 1) {
      const sx = Math.round(cx + dx * r);
      const sy = Math.round(cy + dy * r);
      if (sx < 0 || sx >= roiW || sy < 0 || sy >= roiH) break;
      if (scores[sy * roiW + sx] >= threshold) lastGoodR = r;
      else if (r > lastGoodR + 12) break;
    }

    const radius = Math.max(lastGoodR, Math.min(roiW, roiH) * 0.08);
    boundary.push({
      x: roiX + cx + Math.cos(angle) * radius,
      y: roiY + cy + Math.sin(angle) * radius
    });
  }

  let woundPixCount = 0;
  for (let i = 0; i < scores.length; i++) if (scores[i] >= threshold) woundPixCount++;
  const woundFraction = woundPixCount / (roiW * roiH);
  const segConfidence = woundFraction > 0.05 ? 'good' : woundFraction > 0.01 ? 'low' : 'none';

  return { roi: { x: roiX, y: roiY, w: roiW, h: roiH }, boundary, segConfidence, woundFraction };
}

export default function WoundSegmentationEditor({ imageUrl, initialData, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const offscreenRef = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [quality, setQuality] = useState({ valid: true, issues: [], confidence: 'high' });
  const [segConfidence, setSegConfidence] = useState('good');
  const [roi, setRoi] = useState({ x: 10, y: 10, w: 100, h: 100 });
  const [boundary, setBoundary] = useState([]);
  
  // Confirmed Scale Reference State (Task 10)
  const [refObjectType, setRefObjectType] = useState('Coin'); // 'Coin', 'Ruler', 'Other'
  const [isScaleConfirmed, setIsScaleConfirmed] = useState(false);
  const [scaleLine, setScaleLine] = useState({ p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 }, physicalLength: 2.0 });

  // Interaction state
  const [draggingItem, setDraggingItem] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      const maxW = 1080;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const offW = Math.round(img.width * scale);
      const offH = Math.round(img.height * scale);
      const off = document.createElement('canvas');
      off.width = offW;
      off.height = offH;
      off.getContext('2d').drawImage(img, 0, 0, offW, offH);
      offscreenRef.current = off;

      const q = validateImageQuality(off);
      setQuality(q);

      if (initialData && initialData.roi && initialData.boundary) {
        setRoi(initialData.roi);
        setBoundary(initialData.boundary);
        if (initialData.scaleLine) {
          setScaleLine(initialData.scaleLine);
          setIsScaleConfirmed(Boolean(initialData.isScaleConfirmed));
        }
        setSegConfidence(initialData.segConfidence || 'good');
      } else {
        // Computer-assisted wound boundary proposal around image center
        const seg = segmentWoundAroundPoint(off, offW / 2, offH / 2);
        setRoi(seg.roi);
        setBoundary(seg.boundary);
        setSegConfidence(seg.segConfidence);
        setScaleLine({
          p1: { x: offW * 0.7, y: offH * 0.88 },
          p2: { x: offW * 0.7 + Math.round(offW * 0.15), y: offH * 0.88 },
          physicalLength: 2.0
        });
      }
      setIsLoaded(true);
    };
    img.onerror = () => {
      setQuality({ valid: false, issues: ['failed to load image'], confidence: 'poor' });
      setIsLoaded(true);
    };
  }, [imageUrl, initialData]);

  const draw = () => {
    const canvas = canvasRef.current;
    const off = offscreenRef.current;
    if (!canvas || !off || !isLoaded) return;
    const ctx = canvas.getContext('2d');

    canvas.width = off.width;
    canvas.height = off.height;

    // Draw base image
    ctx.drawImage(off, 0, 0);

    // Draw ROI
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(roi.x, roi.y, roi.w, roi.h);
    ctx.setLineDash([]);
    
    // Draw ROI handles
    ctx.fillStyle = '#F59E0B';
    const corners = [
      { x: roi.x, y: roi.y },
      { x: roi.x + roi.w, y: roi.y },
      { x: roi.x + roi.w, y: roi.y + roi.h },
      { x: roi.x, y: roi.y + roi.h }
    ];
    corners.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Computer-Assisted Boundary Polygon
    if (boundary.length > 0) {
      ctx.beginPath();
      ctx.moveTo(boundary[0].x, boundary[0].y);
      for (let i = 1; i < boundary.length; i++) {
        ctx.lineTo(boundary[i].x, boundary[i].y);
      }
      ctx.closePath();
      
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw boundary vertices
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      boundary.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Draw Scale Reference Line
    if (isScaleConfirmed) {
      ctx.strokeStyle = '#059669'; // Emerald green when confirmed
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(scaleLine.p1.x, scaleLine.p1.y);
      ctx.lineTo(scaleLine.p2.x, scaleLine.p2.y);
      ctx.stroke();

      ctx.fillStyle = '#059669';
      [scaleLine.p1, scaleLine.p2].forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  useEffect(() => {
    draw();
  }, [isLoaded, roi, boundary, isScaleConfirmed, scaleLine]);

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const HIT_RADIUS = 22;

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);

    // Check scale marker points
    if (isScaleConfirmed) {
      if (Math.hypot(pos.x - scaleLine.p1.x, pos.y - scaleLine.p1.y) < HIT_RADIUS) {
        setDraggingItem({ type: 'scale', index: 1 });
        return;
      }
      if (Math.hypot(pos.x - scaleLine.p2.x, pos.y - scaleLine.p2.y) < HIT_RADIUS) {
        setDraggingItem({ type: 'scale', index: 2 });
        return;
      }
    }

    // Check boundary vertices
    for (let i = 0; i < boundary.length; i++) {
      if (Math.hypot(pos.x - boundary[i].x, pos.y - boundary[i].y) < HIT_RADIUS) {
        setDraggingItem({ type: 'boundary', index: i });
        return;
      }
    }

    // Check ROI corners
    const corners = [
      { x: roi.x, y: roi.y, id: 'tl' },
      { x: roi.x + roi.w, y: roi.y, id: 'tr' },
      { x: roi.x + roi.w, y: roi.y + roi.h, id: 'br' },
      { x: roi.x, y: roi.y + roi.h, id: 'bl' }
    ];
    for (let i = 0; i < corners.length; i++) {
      if (Math.hypot(pos.x - corners[i].x, pos.y - corners[i].y) < HIT_RADIUS) {
        setDraggingItem({ type: 'roi', id: corners[i].id });
        return;
      }
    }

    // Tap-to-seed: User tapped photo to generate boundary around tapped point!
    if (offscreenRef.current) {
      const seg = segmentWoundAroundPoint(offscreenRef.current, pos.x, pos.y);
      setRoi(seg.roi);
      setBoundary(seg.boundary);
      setSegConfidence(seg.segConfidence);
    }
  };

  const handleMouseMove = (e) => {
    if (!draggingItem) return;
    const pos = getMousePos(e);

    if (draggingItem.type === 'boundary') {
      const newBound = [...boundary];
      newBound[draggingItem.index] = pos;
      setBoundary(newBound);
    } else if (draggingItem.type === 'scale') {
      const newLine = { ...scaleLine };
      if (draggingItem.index === 1) newLine.p1 = pos;
      else newLine.p2 = pos;
      setScaleLine(newLine);
    } else if (draggingItem.type === 'roi') {
      const newRoi = { ...roi };
      if (draggingItem.id === 'tl') {
        newRoi.w += newRoi.x - pos.x;
        newRoi.h += newRoi.y - pos.y;
        newRoi.x = pos.x;
        newRoi.y = pos.y;
      } else if (draggingItem.id === 'tr') {
        newRoi.w = pos.x - newRoi.x;
        newRoi.h += newRoi.y - pos.y;
        newRoi.y = pos.y;
      } else if (draggingItem.id === 'br') {
        newRoi.w = pos.x - newRoi.x;
        newRoi.h = pos.y - newRoi.y;
      } else if (draggingItem.id === 'bl') {
        newRoi.w += newRoi.x - pos.x;
        newRoi.h = pos.y - newRoi.y;
        newRoi.x = pos.x;
      }
      if (newRoi.w < 20) newRoi.w = 20;
      if (newRoi.h < 20) newRoi.h = 20;
      setRoi(newRoi);
    }
  };

  const handleMouseUp = () => {
    setDraggingItem(null);
  };

  // Calculations
  const woundAreaPx = boundary.length > 2 ? getPolygonArea(boundary) : 0;
  const roiAreaPx = roi.w * roi.h;
  const coveragePct = roiAreaPx > 0 ? (woundAreaPx / roiAreaPx) * 100 : 0;

  // Task 10: Calculate physicalAreaCm2 ONLY when scale is explicitly confirmed
  let physicalAreaCm2 = null;
  if (isScaleConfirmed) {
    const distPx = Math.hypot(scaleLine.p1.x - scaleLine.p2.x, scaleLine.p1.y - scaleLine.p2.y);
    if (distPx > 0 && scaleLine.physicalLength > 0) {
      const pixelsPerCm = distPx / scaleLine.physicalLength;
      const pxPerCm2 = pixelsPerCm * pixelsPerCm;
      physicalAreaCm2 = woundAreaPx / pxPerCm2;
    }
  }

  const handleConfirm = async () => {
    const offW = offscreenRef.current?.width || 640;
    const offH = offscreenRef.current?.height || 480;

    // Task 11: Store normalized boundary coordinates relative to source image
    const normalizedBoundary = boundary.map(pt => ({
      x: pt.x / offW,
      y: pt.y / offH
    }));

    const dataToSave = {
      coveragePct,
      coverage_pct: coveragePct,
      physicalAreaCm2: isScaleConfirmed ? physicalAreaCm2 : null,
      wound_area_cm2: isScaleConfirmed ? physicalAreaCm2 : null,
      woundAreaPx,
      wound_area_px: woundAreaPx,
      roi,
      boundary,
      normalizedBoundary,
      sourceImageWidth: offW,
      sourceImageHeight: offH,
      isScaleConfirmed,
      hasScaleMarker: isScaleConfirmed,
      scaleLine,
      quality,
      segConfidence,
      seg_confidence: segConfidence
    };

    const entryId = initialData?.entryId || initialData?.id;
    if (entryId) {
      try {
        await woundService.updateMeasurements(entryId, dataToSave);
      } catch (err) {
        console.warn('Could not persist measurements to server:', err.message);
      }
    }

    onSave(dataToSave);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      {/* Header bar */}
      <div style={{ padding: '16px 24px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Computer-Assisted Wound Boundary</h2>
          <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: 2 }}>Tap photo to re-seed boundary or drag handles to refine outline.</p>
        </div>
        <div>
          <button className="btn-outline" onClick={onCancel} style={{ marginRight: 12 }}>Cancel</button>
          <button className="btn-primary" onClick={handleConfirm} disabled={quality.confidence === 'poor'}>Confirm Boundary &amp; Save</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas Area */}
        <div 
          ref={containerRef} 
          style={{ flex: 1, padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0F172A', position: 'relative' }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              cursor: draggingItem ? 'grabbing' : 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}
          />
        </div>

        {/* Right Controls Panel */}
        <div style={{ width: 340, background: 'var(--card-bg)', borderLeft: '1px solid var(--border)', padding: 24, overflowY: 'auto' }}>
          
          {quality.confidence === 'poor' && (
            <div style={{ padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, marginBottom: 20 }}>
              <h4 style={{ color: '#991B1B', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Quality Warning</h4>
              <p style={{ fontSize: 12, color: '#7F1D1D' }}>
                Image issues detected: {quality.issues.join(', ')}. Please retake or adjust boundary manually.
              </p>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>Calculated Metrics</h3>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748B' }}>Relative Wound Area</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#2563EB' }}>
                {quality.confidence === 'poor' ? '--' : `${coveragePct.toFixed(1)}% ROI area`}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>Percentage of selected assessment region</div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Physical Wound Area (cm²)</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: isScaleConfirmed ? '#059669' : '#94A3B8' }}>
                {quality.confidence === 'poor' 
                  ? '--' 
                  : (isScaleConfirmed && physicalAreaCm2 != null ? `${physicalAreaCm2.toFixed(2)} cm²` : 'Scale unconfirmed (cm² unavailable)')}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>Scale Reference Setup</h3>
            
            <div style={{ background: '#F8FAF9', border: '1px solid #E2E8E3', borderRadius: '12px', padding: '14px', marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
                Reference Object
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                {[
                  { label: 'Coin', type: 'Coin', defLen: 2.0 },
                  { label: 'Ruler', type: 'Ruler', defLen: 1.0 },
                  { label: 'Other', type: 'Other', defLen: 2.5 }
                ].map(obj => (
                  <button
                    key={obj.type}
                    type="button"
                    onClick={() => {
                      setRefObjectType(obj.type);
                      setScaleLine(prev => ({ ...prev, physicalLength: obj.defLen }));
                    }}
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: refObjectType === obj.type ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      background: refObjectType === obj.type ? '#EFF6FF' : '#FFFFFF',
                      color: refObjectType === obj.type ? '#1E40AF' : '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    {obj.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Known Width:</span>
                <input 
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={scaleLine.physicalLength} 
                  onChange={(e) => setScaleLine({ ...scaleLine, physicalLength: parseFloat(e.target.value) || 1.0 })}
                  style={{ width: 70, padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, fontWeight: 600 }}
                />
                <span style={{ fontSize: 13, fontWeight: 600 }}>cm</span>
              </div>

              <button
                type="button"
                onClick={() => setIsScaleConfirmed(prev => !prev)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: isScaleConfirmed ? '#059669' : '#153C2E',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                {isScaleConfirmed ? '✓ Scale Confirmed' : 'Confirm Reference Scale'}
              </button>
            </div>

            <p style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.4 }}>
              Tap anywhere on the photo to seed boundary around a wound point. Drag red handles to refine boundary vertices.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
