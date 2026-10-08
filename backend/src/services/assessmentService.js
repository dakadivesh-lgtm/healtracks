const fs = require('fs');
const config = require('../config');

/**
 * AI Assessment Service
 * Provides integration interface for AI-powered wound assessment.
 * When not configured or no API key is supplied, returns a strict, non-fabricated
 * "Analysis not configured" status while keeping uploads and tracking functional.
 */
class AssessmentService {
  /**
   * Calculate skin/wound pixel coverage using YCbCr & HSV color-space ranges.
   * This is a simple, explainable heuristic check.
   */
  calculateSkinCoverage(imagePath, qualityMetrics) {
    if (qualityMetrics && typeof qualityMetrics.skinPercentage === 'number') {
      const skinPercentage = Math.round(qualityMetrics.skinPercentage);
      const isSkinLikely = skinPercentage >= 12;
      return { skinPercentage, isSkinLikely };
    }

    try {
      if (imagePath && fs.existsSync(imagePath)) {
        const buffer = fs.readFileSync(imagePath);
        let skinCount = 0;
        let sampleCount = 0;

        // Sample up to 1000 byte triplets across buffer
        const step = Math.max(3, Math.floor(buffer.length / 3000));
        for (let i = 0; i < buffer.length - 3; i += step) {
          const r = buffer[i];
          const g = buffer[i + 1];
          const b = buffer[i + 2];

          const y  =  0.299  * r + 0.587  * g + 0.114  * b;
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5    * b;
          const cr = 128 + 0.5      * r - 0.418688 * g - 0.081312 * b;

          const rN = r / 255, gN = g / 255, bN = b / 255;
          const maxC = Math.max(rN, gN, bN);
          const minC = Math.min(rN, gN, bN);
          const diff = maxC - minC;

          let hDeg = 0;
          if (diff > 0) {
            if (maxC === rN) hDeg = 60 * (((gN - bN) / diff) % 6);
            else if (maxC === gN) hDeg = 60 * (((bN - rN) / diff) + 2);
            else hDeg = 60 * (((rN - gN) / diff) + 4);
          }
          if (hDeg < 0) hDeg += 360;

          const sat = maxC === 0 ? 0 : diff / maxC;
          const val = maxC;

          const isYCbCrSkin = (cb >= 77 && cb <= 127) && (cr >= 133 && cr <= 173) && (y >= 15);
          const isHSVSkin = ((hDeg >= 0 && hDeg <= 50) || (hDeg >= 330 && hDeg <= 360)) &&
                            (sat >= 0.10 && sat <= 0.85) &&
                            (val >= 0.15 && val <= 0.98);

          sampleCount++;
          if (isYCbCrSkin || isHSVSkin) skinCount++;
        }

        if (sampleCount > 0) {
          const skinPercentage = Math.round((skinCount / sampleCount) * 100);
          const isSkinLikely = skinPercentage >= 12;
          return { skinPercentage, isSkinLikely };
        }
      }
    } catch (err) {
      console.warn('[AssessmentService] Skin coverage calculation error:', err.message);
    }

    return { skinPercentage: 100, isSkinLikely: true };
  }

  /**
   * Run assessment on a wound entry image
   * @param {Object} params
   * @param {string} params.imagePath - Server path to stored image
   * @param {string} params.notes - User notes
   * @param {Object} params.qualityMetrics - Image quality metrics from capture
   * @returns {Promise<Object>} Assessment outcome
   */
  async assessWound({ imagePath, notes, qualityMetrics }) {
    // SECTION 2: Apply skin-content heuristic pre-check prior to AI analysis, independent of Gemini
    const skinCoverage = this.calculateSkinCoverage(imagePath, qualityMetrics);
    console.log(`[Backend Quality Pre-Check] Skin coverage: ${skinCoverage.skinPercentage}% | Pass: ${skinCoverage.isSkinLikely}`);

    // If external AI model is not configured with a valid API key
    if (!config.ai.isEnabled) {
      return {
        configured: false,
        status: 'not_configured',
        summary: 'Analysis not configured',
        details: {
          statusMessage: 'AI-assisted analysis is not currently enabled on this instance.',
          configurationStatus: 'API key not configured in backend environment.',
          trackingActive: true,
          clinicalNote: 'Wound documentation and progression tracking remain active. Please consult a qualified medical professional for clinical wound assessment and diagnosis.',
          recordedNotes: notes || '',
          qualityChecked: Boolean(qualityMetrics),
          skinCoveragePct: skinCoverage.skinPercentage,
          isSkinLikely: skinCoverage.isSkinLikely,
          skinWarning: skinCoverage.isSkinLikely ? null : "This photo doesn't look like it shows skin or a wound. Please check the photo, or confirm you'd like to proceed anyway."
        }
      };
    }

    try {
      // Integration interface for external AI model (e.g., Google Gemini or custom clinical API)
      console.log(`[AI Assessment] Calling configured model: ${config.ai.modelName}`);
      
      // If an external key is configured, invoke the model endpoint
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.modelName}:generateContent?key=${config.ai.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analyze this wound image from an objective clinical documentation standpoint.
DO NOT fabricate arbitrary percentages or definite diagnoses.
Provide objective visible features, signs of inflammation if visible, and recommended follow-up questions for a clinician.
User note: "${notes || 'None'}"`
                  }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`AI model endpoint error: ${response.statusText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned from model.';

      return {
        configured: true,
        status: 'analyzed',
        summary: 'Preliminary AI Observation',
        details: {
          observations: rawText,
          model: config.ai.modelName,
          timestamp: new Date().toISOString()
        }
      };
    } catch (err) {
      console.error('[AI Assessment Error]:', err.message);
      // Graceful fallback without fabricating any diagnosis
      return {
        configured: false,
        status: 'not_configured',
        summary: 'Analysis not configured',
        details: {
          error: 'External AI service could not be reached.',
          fallbackReason: err.message,
          trackingActive: true
        }
      };
    }
  }

  /**
   * Get service status and configuration info
   */
  getStatus() {
    return {
      enabled: config.ai.isEnabled,
      model: config.ai.isEnabled ? config.ai.modelName : null,
      statusText: config.ai.isEnabled ? 'AI Analysis Available' : 'Analysis not configured'
    };
  }
}

module.exports = new AssessmentService();
