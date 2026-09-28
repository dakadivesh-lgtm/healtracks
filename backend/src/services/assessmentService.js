const config = require('../config');

/**
 * AI Assessment Service
 * Provides integration interface for AI-powered wound assessment.
 * When not configured or no API key is supplied, returns a strict, non-fabricated
 * "Analysis not configured" status while keeping uploads and tracking functional.
 */
class AssessmentService {
  /**
   * Run assessment on a wound entry image
   * @param {Object} params
   * @param {string} params.imagePath - Server path to stored image
   * @param {string} params.notes - User notes
   * @param {Object} params.qualityMetrics - Image quality metrics from capture
   * @returns {Promise<Object>} Assessment outcome
   */
  async assessWound({ imagePath, notes, qualityMetrics }) {
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
          qualityChecked: Boolean(qualityMetrics)
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
