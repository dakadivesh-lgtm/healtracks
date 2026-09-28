/**
 * WoundWise Curated Local Knowledge Base & Intent Matcher
 * Provides deterministic knowledge retrieval, typo normalization,
 * and local fallback answers for offline / API-less resilience.
 */

// Common typo corrections mapping
const TYPO_MAP = {
  'cofee': 'coffee',
  'cofe': 'coffee',
  'coffie': 'coffee',
  'coffe': 'coffee',
  'chickn': 'chicken',
  'chikn': 'chicken',
  'chikin': 'chicken',
  'shwer': 'shower',
  'showr': 'shower',
  'shouwer': 'shower',
  'exersice': 'exercise',
  'excercise': 'exercise',
  'exersize': 'exercise',
  'dresing': 'dressing',
  'bandg': 'bandage',
  'bandaid': 'bandage',
  'bleedng': 'bleeding',
  'bleding': 'bleeding',
  'feverr': 'fever',
  'feevr': 'fever',
  'protien': 'protein',
  'sweeling': 'swelling',
  'swelin': 'swelling',
  'puss': 'pus',
  'smelll': 'smell'
};

function normalizeQueryText(text) {
  if (!text) return '';
  let cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = cleaned.split(/\s+/).map(w => TYPO_MAP[w] || w);
  return words.join(' ');
}

// Curated Knowledge Base Entries
const KNOWLEDGE_BASE = [
  {
    id: 'coffee_tea',
    category: 'coffee/tea',
    keywords: ['coffee', 'caffeine', 'tea', 'black coffee', 'green tea', 'espresso', 'decaf', 'chai'],
    answer: "Moderate black coffee or tea is generally fine for most people during wound recovery. Coffee does not directly stop healing, but try not to let caffeine replace water, nutritious meals, or sleep. Good hydration, protein intake, and restful sleep are key for tissue repair. If caffeine has been restricted by your clinician due to another condition or medication, follow their advice."
  },
  {
    id: 'food_nutrition',
    category: 'food',
    keywords: ['food', 'eat', 'chicken', 'egg', 'eggs', 'diet', 'poultry', 'meat', 'meal', 'eating', 'nutrition', 'fish', 'tofu', 'beans'],
    answer: "Yes, protein-rich foods such as well-cooked chicken, eggs, fish, tofu, and legumes are excellent during recovery. Protein provides essential amino acids your body needs to rebuild tissue and synthesize collagen. Combine protein with fresh vegetables, fruits, whole grains, and plenty of water for optimal recovery. Follow any specific dietary guidelines provided by your doctor."
  },
  {
    id: 'protein_healing',
    category: 'protein',
    keywords: ['protein', 'foods help healing', 'good foods', 'healing foods', 'best food', 'nutrients', 'vitamins', 'vitamin c', 'zinc', 'build tissue'],
    answer: "Key nutrients that accelerate wound healing include:\n1. Protein (chicken, eggs, fish, beans, dairy) - essential for tissue repair and cell creation.\n2. Vitamin C (citrus fruits, berries, bell peppers) - aids collagen formation.\n3. Zinc (seeds, nuts, whole grains) - supports cell multiplication and skin integrity.\n4. Healthy Fats (olive oil, avocados) - provide sustained energy for healing."
  },
  {
    id: 'foods_to_avoid',
    category: 'food',
    keywords: ['avoid', 'avoid eating', 'foods to avoid', 'what to avoid', 'bad food', 'junk food', 'sugar', 'alcohol', 'salty', 'spicy'],
    answer: "During wound recovery, try to limit:\n• Excess refined sugars and sugary drinks, which can impair immune function and slow healing.\n• Alcohol, which dehydrates tissues and may interact with pain medications.\n• Highly processed or ultra-salty foods.\nInstead, focus on nutrient-dense whole foods, clean water, and lean protein."
  },
  {
    id: 'hydration',
    category: 'hydration',
    keywords: ['water', 'hydration', 'drink', 'fluids', 'how much water', 'dehydration', 'hydrated'],
    answer: "Staying well-hydrated is crucial for wound recovery. Water transports essential nutrients and oxygen to repairing tissue and helps flush away cellular waste. Aim for approximately 8 to 10 glasses (2 to 2.5 liters) of water daily, unless your clinician has placed you on a fluid restriction for a medical condition."
  },
  {
    id: 'showering_hygiene',
    category: 'showering',
    keywords: ['shower', 'showering', 'bath', 'bathing', 'wash', 'washing', 'water on wound', 'wet wound', 'clean wound'],
    answer: "Showering recommendations depend on your wound type and doctor's advice:\n1. Keep surgical or acute wounds dry for the first 24–48 hours or as instructed.\n2. When permitted to shower, allow warm water to gently wash over the area without direct high-pressure spraying or harsh scrubbing.\n3. Pat the area dry gently with a clean towel.\n4. Avoid soaking in baths, hot tubs, or pools until skin is closed."
  },
  {
    id: 'dressing_care',
    category: 'dressing care',
    keywords: ['dressing', 'bandage', 'change dressing', 'cover wound', 'change bandage', 'gauze', 'bandaid', 'clean dressing', 'bandage change'],
    answer: "General guidelines for dressing care:\n1. Wash hands thoroughly with soap and water before and after touching the dressing.\n2. Change the dressing as scheduled by your doctor, or whenever it becomes wet, dirty, or loose.\n3. Remove old dressing gently (moisten with sterile saline or clean water if stuck to skin).\n4. Apply clean, sterile dressing as instructed."
  },
  {
    id: 'activity_exercise',
    category: 'exercise',
    keywords: ['exercise', 'workout', 'gym', 'running', 'activity', 'walking', 'heavy lifting', 'movement', 'strenuous'],
    answer: "Light walking is generally beneficial to promote circulation and prevent stiffness. However, avoid heavy lifting, vigorous workouts, or movements that stretch or strain the wound area. Overexertion can open healing wound edges or cause bleeding. Consult your healthcare provider before resuming intense physical exercise."
  },
  {
    id: 'sleep_positioning',
    category: 'sleep',
    keywords: ['sleep', 'sleeping', 'position', 'sleep on side', 'rest', 'lying down', 'bed', 'sleeping position'],
    answer: "Restful sleep is essential for cell repair and immune recovery. Position yourself so that no direct pressure, friction, or weight rests on the injured area. If the wound is on an arm or leg, elevating it with a pillow while resting or sleeping can help minimize throbbing and swelling."
  },
  {
    id: 'swelling_elevation',
    category: 'swelling',
    keywords: ['swelling', 'swoll', 'swollen', 'edema', 'puffy', 'elevate', 'puffiness', 'swelling came back', 'swelling returned'],
    answer: "Mild swelling can return after increased walking or standing. Is the swelling increasing quickly, and do you also have spreading redness, worsening pain, fever, or discharge?\n\nIf there are no warning signs:\n1. Elevate the injured area above heart level when resting.\n2. Rest the limb and avoid prolonged standing.\n3. Keep clothing loose around the area.\nIf swelling is severe, rapidly increasing, or accompanied by fever or spreading redness, seek medical evaluation promptly."
  },
  {
    id: 'pain_management',
    category: 'pain',
    keywords: ['pain', 'hurts', 'sore', 'throbbing', 'pain relief', 'painkillers', 'ache', 'hurting'],
    answer: "Mild to moderate pain is common during early healing and should steadily decrease over time. Rest, elevation, and recommended over-the-counter or prescribed pain relievers can help. If pain suddenly worsens, becomes severe and throbbing, or does not respond to medication, contact your doctor for evaluation."
  },
  {
    id: 'redness_inflammation',
    category: 'redness',
    keywords: ['redness', 'red skin', 'pink skin', 'inflamed', 'red'],
    answer: "A thin, mild pink edge (1–2 mm) around a fresh wound is normal early inflammation. However, if redness begins expanding outward, feels increasingly hot to the touch, or shows red streaks traveling up the limb, this can be a warning sign of spreading infection that needs prompt medical evaluation."
  },
  {
    id: 'discharge_pus',
    category: 'discharge',
    keywords: ['discharge', 'pus', 'fluid', 'oozing', 'yellow pus', 'green pus', 'foul discharge', 'smell', 'drainage'],
    answer: "Small amounts of clear or light pink fluid (serous fluid) are normal early in recovery. However, thick, opaque yellow/green pus or foul-smelling discharge indicates potential bacterial infection. Please consult a healthcare professional for clinical evaluation."
  },
  {
    id: 'fever_systemic',
    category: 'fever',
    keywords: ['fever', 'chills', 'temperature', 'hot skin', 'sweats', 'feverish'],
    answer: "A fever (temperature over 100.4°F / 38°C), chills, nausea, or feeling generally sick alongside a wound is an urgent warning sign of systemic infection. Please seek prompt medical evaluation at a healthcare facility."
  },
  {
    id: 'bleeding_emergency',
    category: 'bleeding',
    keywords: ['bleeding', 'blood', 'bleed', 'uncontrolled bleeding', 'soaking bandage'],
    answer: "For minor bleeding: apply firm, continuous direct pressure with a clean cloth or sterile gauze for 10–15 minutes without lifting. If bleeding is heavy, spurting, or does not stop after 15 minutes of firm pressure, seek emergency medical care immediately."
  },
  {
    id: 'general_recovery',
    category: 'general recovery',
    keywords: ['recovery', 'healing time', 'how long to heal', 'recovery time', 'heal faster', 'general care', 'healing process'],
    answer: "General wound recovery principles:\n1. Keep the wound clean, protected, and dry according to instructions.\n2. Eat a protein-rich, balanced diet with adequate vitamins C and zinc.\n3. Stay well-hydrated with water.\n4. Get 7-9 hours of sleep nightly to support tissue repair.\n5. Avoid smoking and alcohol, which restrict blood flow.\n6. Follow up with your healthcare provider as scheduled."
  }
];

/**
 * Retrieve matching knowledge item for a question using keyword scoring & typo normalization.
 * @param {string} userQuery
 * @returns {{ item: Object|null, category: string, confidence: number }}
 */
function retrieveKnowledge(userQuery) {
  const normalized = normalizeQueryText(userQuery);
  if (!normalized) {
    return { item: KNOWLEDGE_BASE[KNOWLEDGE_BASE.length - 1], category: 'general recovery', confidence: 0 };
  }

  let bestMatch = null;
  let highestScore = 0;

  for (const item of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of item.keywords) {
      const kwNorm = kw.toLowerCase();
      if (normalized.includes(kwNorm)) {
        // Multi-word exact phrase match gets higher score
        score += kwNorm.includes(' ') ? 3 : 1.5;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && highestScore > 0) {
    return { item: bestMatch, category: bestMatch.category, confidence: highestScore };
  }

  // Default fallback to general recovery
  const defaultItem = KNOWLEDGE_BASE.find(k => k.id === 'general_recovery') || KNOWLEDGE_BASE[0];
  return { item: defaultItem, category: defaultItem.category, confidence: 0 };
}

module.exports = {
  KNOWLEDGE_BASE,
  normalizeQueryText,
  retrieveKnowledge
};
