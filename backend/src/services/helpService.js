const config = require('../config');
const { retrieveKnowledge, normalizeQueryText } = require('./helpKnowledgeBase');

/**
 * Contextual Urgent Symptom Detection
 * Ensures normal questions with keywords (e.g., "Is a little bleeding during dressing change normal?")
 * are NOT falsely flagged as urgent, while real urgent signs (fever, spreading redness, heavy bleeding, severe pain) are caught.
 */
function checkUrgentSymptoms(text) {
  if (!text) return false;
  const rawLower = text.toLowerCase();
  const q = normalizeQueryText(text);

  // 1. Contextual Bleeding Check
  const hasBleedingWord = /\b(bleeding|bleed|bled|blood)\b/i.test(q) || /\b(bleeding|bleed|bled|blood)\b/i.test(rawLower);
  if (hasBleedingWord) {
    const isUrgentBleeding = /(won\s*t\s*stop|will\s*not\s*stop|heavily|heavy|spurting|soaking|uncontrolled|non-stop|profuse|continuous)/i.test(q) ||
                             /(won\s*t\s*stop|will\s*not\s*stop|heavily|heavy|spurting|soaking|uncontrolled|non-stop|profuse|continuous)/i.test(rawLower);
    if (isUrgentBleeding) return true;
  }

  // 2. Contextual Redness Check
  const hasRednessWord = /\b(redness|red|pinkness|inflamed)\b/i.test(q) || /\b(redness|red|pinkness|inflamed)\b/i.test(rawLower);
  if (hasRednessWord) {
    const isUrgentRedness = /(spreading|red streak|rapidly worsening|fever|hot to touch|expanding|traveling)/i.test(q) ||
                            /(spreading|red streak|rapidly worsening|fever|hot to touch|expanding|traveling)/i.test(rawLower);
    if (isUrgentRedness) return true;
  }

  // 3. Contextual Discharge Check
  const hasDischargeWord = /\b(discharge|pus|ooze|drainage)\b/i.test(q) || /\b(discharge|pus|ooze|drainage)\b/i.test(rawLower);
  if (hasDischargeWord) {
    const isUrgentDischarge = /(bad smell|foul|worsening pain|fever|green pus|foul smell|foul discharge)/i.test(q) ||
                             /(bad smell|foul|worsening pain|fever|green pus|foul smell|foul discharge)/i.test(rawLower);
    if (isUrgentDischarge) return true;
  }

  // 4. Contextual Swelling Check
  const hasSwellingWord = /\b(swelling|swoll|swollen)\b/i.test(q) || /\b(swelling|swoll|swollen)\b/i.test(rawLower);
  if (hasSwellingWord) {
    const isUrgentSwelling = /(rapidly increasing|severe swelling|swelling and fever|swelling with fever|spreading redness|numbness)/i.test(q) ||
                            /(rapidly increasing|severe swelling|swelling and fever|swelling with fever|spreading redness|numbness)/i.test(rawLower);
    if (isUrgentSwelling) return true;
  }

  // 5. Severe Pain Check
  const hasSeverePain = /(severe.*pain|worsening.*pain|throbbing.*pain|intense.*pain)/i.test(q) ||
                        /(severe.*pain|worsening.*pain|throbbing.*pain|intense.*pain)/i.test(rawLower);
  if (hasSeverePain) return true;

  // 6. Standalone High-Risk Symptoms
  const HIGH_RISK_PATTERNS = [
    /\bfever\b/i,
    /high fever/i,
    /feverish/i,
    /\bchills\b/i,
    /\bfaint/i,
    /\bfainted\b/i,
    /\bdizziness\b/i,
    /passed out/i,
    /black tissue/i,
    /black skin/i,
    /black wound/i,
    /dead tissue/i,
    /dead-looking/i,
    /necrosis/i,
    /animal bite/i,
    /snake bite/i,
    /dog bite/i,
    /cat bite/i,
    /diabetic foot/i,
    /diabetic wound/i,
    /difficulty breathing/i,
    /shortness of breath/i,
    /breathing/i
  ];

  return HIGH_RISK_PATTERNS.some(pattern => pattern.test(q) || pattern.test(rawLower));
}

class HelpService {
  /**
   * Process a general wound recovery question with contextual safety rules,
   * RAG context, conversation memory, and local fallback.
   */
  async processQuestion(userMessage, history = []) {
    const rawQuery = (userMessage || '').trim();
    if (!rawQuery) {
      return {
        success: false,
        answer: 'Please provide a valid question.',
        hasUrgentSymptoms: false,
        category: 'none',
        source: 'Validation'
      };
    }

    // 1. Contextual Urgent Symptom Rule (with typo normalization)
    const hasUrgent = checkUrgentSymptoms(rawQuery);

    // 2. Resolve Context & Retrieval (including history for follow-ups)
    let fullQuery = rawQuery;
    if (history && history.length > 0) {
      const recentUserMsgs = history.filter(m => m.sender === 'user' || m.role === 'user').slice(-2);
      if (recentUserMsgs.length > 0) {
        fullQuery = `${recentUserMsgs.map(m => m.text).join(' ')} ${rawQuery}`;
      }
    }

    const retrieved = retrieveKnowledge(fullQuery);
    const category = retrieved.category || 'general recovery';

    // 3. AI Generation with RAG Context if AI is enabled
    if (config.ai.isEnabled) {
      try {
        const historyText = (history || []).slice(-4).map(m => 
          `${(m.sender || m.role) === 'user' ? 'User' : 'WoundWise'}: ${m.text}`
        ).join('\n');

        const systemInstruction = `You are the WoundWise general recovery assistant.

Answer general questions about wound care, nutrition, hydration, everyday activity, dressing care, hygiene, and recovery.

Use simple language suitable for patients and families.
Give general educational information only.

Do not diagnose wounds (never say "you have an infection", "this is infected", "your wound is safe", "you do not need a doctor", or "you are fully healed").
Do not claim a person is safe.
Do not prescribe medication, drug names, or medication doses.

When a question describes severe urgent symptoms (such as uncontrolled heavy bleeding, high fever with spreading redness, foul pus with worsening pain, fainting, animal bites, or black tissue), advise the user to seek medical attention promptly.
For mild non-urgent symptoms or questions like "My swelling came back", provide helpful educational guidance and ask concise follow-up questions if needed.

Keep responses concise, clear, and practical (2 to 4 short paragraphs or bullet points).`;

        const promptText = `${systemInstruction}

Retrieved Knowledge Base Context:
${retrieved.item.answer}

${historyText ? `Recent Conversation History:\n${historyText}\n` : ''}
User Question: "${rawQuery}"`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.modelName}:generateContent?key=${config.ai.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: promptText }]
                }
              ]
            })
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const rawAnswer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawAnswer && rawAnswer.trim()) {
            return {
              success: true,
              answer: rawAnswer.trim(),
              hasUrgentSymptoms: hasUrgent,
              category,
              source: 'AI'
            };
          }
        }
      } catch (err) {
        console.warn('[Help AI Warning - Falling back to local knowledge base]:', err.message);
      }
    }

    // 4. Local Knowledge Base Fallback
    let fallbackAnswer = retrieved.item.answer;
    if (hasUrgent) {
      fallbackAnswer = `⚠️ Warning symptoms detected.\n\n${retrieved.item.answer}\n\nThese symptoms (such as heavy bleeding that won't stop, high fever, spreading redness, foul-smelling pus, or severe worsening pain) can be urgent warning signs requiring medical evaluation. Please consult a healthcare professional or visit a health facility.`;
    }

    return {
      success: true,
      answer: fallbackAnswer,
      hasUrgentSymptoms: hasUrgent,
      category,
      source: 'Local Knowledge Base'
    };
  }
}

module.exports = new HelpService();
