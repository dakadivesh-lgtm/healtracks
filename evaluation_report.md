# WoundWise Help Assistant Evaluation Report

**Date**: 2026-09-25T00:56:42.274Z  
**Total Evaluation Questions**: 55

> [!NOTE]
> **Scope Disclaimer**: This evaluation report exclusively tests and validates the conversational **Help Assistant Q&A system** (patient guidance regarding food, showering, dressing care, hydration, exercise, and general recovery questions). It does **NOT** evaluate or validate image-based wound measurement calculations, boundary segmentation, or clinical triage risk-assessment logic.

---

## Help Assistant Q&A Evaluation Summary

| Mode | Total Questions | Passed | Success Rate | Primary Source |
|---|---|---|---|---|
| **Mode A (AI API Enabled)** | 55 | 55 | **100.0%** | AI + RAG |
| **Mode B (Local KB Fallback)** | 55 | 55 | **100.0%** | Local Knowledge Base |

---

## Detailed Evaluation Test Results (Mode B - Offline/Fallback Resilience)

| ID | Question | Category | Urgent Flag | Source | Status |
|---|---|---|---|---|---|
| 1 | "Can I eat chicken while my wound is healing?" | `food` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 2 | "Can I eat eggs after an injury?" | `food` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 3 | "Is it okay to eat fish or beef?" | `food` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 4 | "Can I eat spicy foods?" | `food` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 5 | "Can I eat chickn?" | `food` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 6 | "What foods help wound healing?" | `food` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 7 | "Can I drink black coffee while recovering?" | `coffee/tea` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 8 | "Can I drink cofee?" | `coffee/tea` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 9 | "Can I drink tea during recovery?" | `coffee/tea` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 10 | "Can I drink green tea?" | `coffee/tea` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 11 | "How much water should I drink?" | `hydration` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 12 | "Is water good for wound recovery?" | `hydration` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 13 | "How often should I change the dressing?" | `dressing care` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 14 | "What should I do if the bandage gets wet?" | `dressing care` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 15 | "How to clean a wound bandage?" | `dressing care` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 16 | "Can I reuse a clean bandage?" | `dressing care` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 17 | "How to change dresing?" | `dressing care` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 18 | "How to remove a stuck bandage?" | `dressing care` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 19 | "Can I take a shower with a wound?" | `showering` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 20 | "Can I take a bath or soak in a tub?" | `showering` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 21 | "Can I shwer today?" | `showering` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 22 | "Can water get on my wound?" | `hydration` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 23 | "How to shower safely with a wound?" | `showering` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 24 | "Can I exercise while the wound is healing?" | `exercise` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 25 | "Can I do heavy lifting at the gym?" | `exercise` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 26 | "Can I go for a light walk?" | `general recovery` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 27 | "Can I do exersice?" | `exercise` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 28 | "When can I resume running?" | `exercise` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 29 | "Can I sleep on the injured side?" | `sleep` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 30 | "What is the best sleeping position?" | `sleep` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 31 | "How should I rest my injured leg?" | `sleep` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 32 | "Can I sleep on my back?" | `sleep` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 33 | "How do I reduce swelling in my arm?" | `swelling` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 34 | "Is mild swelling normal?" | `swelling` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 35 | "My leg is swoll and puffy" | `swelling` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 36 | "Should I elevate my injured leg?" | `swelling` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 37 | "Is mild soreness normal during recovery?" | `pain` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 38 | "How can I manage mild pain at home?" | `pain` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 39 | "My wound hurts a little, what can I do?" | `pain` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 40 | "Can I take pain relievers?" | `pain` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 41 | "Is a little pinkness around the edge normal?" | `general recovery` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 42 | "What does normal inflammation look like?" | `general recovery` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 43 | "Is slight redness normal after 2 days?" | `redness` | FALSE | `Local Knowledge Base` | ✅ PASS |
| 44 | "My wound is bleeding heavily and won't stop" | `bleeding` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |
| 45 | "I have a high fever and chills" | `fever` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |
| 46 | "There is spreading redness and red streaks going up my arm" | `redness` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |
| 47 | "The wound has thick yellow pus and a bad smell" | `discharge` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |
| 48 | "I have severe worsening throbbing pain that won't go away" | `pain` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |
| 49 | "I feel dizzy and fainted" | `general recovery` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |
| 50 | "I noticed black dead-looking tissue inside the wound" | `general recovery` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |
| 51 | "I got a deep animal bite from a stray dog" | `general recovery` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |
| 52 | "I have a diabetic foot wound with pus" | `discharge` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |
| 53 | "My wound is bleedng and I have feverr" | `bleeding` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |
| 54 | "Foul smell and green discharge coming from wound" | `discharge` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |
| 55 | "I am having difficulty breathing and high fever" | `food` | ⚠️ **TRUE** | `Local Knowledge Base` | ✅ PASS |

---

## Sample Responses Generated (Mode B)

### Q1: "Can I eat chicken while my wound is healing?"
- **Category**: `food`
- **Urgent Flag**: No
- **Source**: Local Knowledge Base
- **Answer**:
> Yes, protein-rich foods such as well-cooked chicken, eggs, fish, tofu, and legum...

### Q2: "Can I eat eggs after an injury?"
- **Category**: `food`
- **Urgent Flag**: No
- **Source**: Local Knowledge Base
- **Answer**:
> Yes, protein-rich foods such as well-cooked chicken, eggs, fish, tofu, and legum...

### Q3: "Is it okay to eat fish or beef?"
- **Category**: `food`
- **Urgent Flag**: No
- **Source**: Local Knowledge Base
- **Answer**:
> Yes, protein-rich foods such as well-cooked chicken, eggs, fish, tofu, and legum...

### Q4: "Can I eat spicy foods?"
- **Category**: `food`
- **Urgent Flag**: No
- **Source**: Local Knowledge Base
- **Answer**:
> Yes, protein-rich foods such as well-cooked chicken, eggs, fish, tofu, and legum...

### Q5: "Can I eat chickn?"
- **Category**: `food`
- **Urgent Flag**: No
- **Source**: Local Knowledge Base
- **Answer**:
> Yes, protein-rich foods such as well-cooked chicken, eggs, fish, tofu, and legum...

### Q6: "What foods help wound healing?"
- **Category**: `food`
- **Urgent Flag**: No
- **Source**: Local Knowledge Base
- **Answer**:
> Yes, protein-rich foods such as well-cooked chicken, eggs, fish, tofu, and legum...

### Q7: "Can I drink black coffee while recovering?"
- **Category**: `coffee/tea`
- **Urgent Flag**: No
- **Source**: Local Knowledge Base
- **Answer**:
> Moderate black coffee or tea is generally fine for most people during wound reco...

### Q8: "Can I drink cofee?"
- **Category**: `coffee/tea`
- **Urgent Flag**: No
- **Source**: Local Knowledge Base
- **Answer**:
> Moderate black coffee or tea is generally fine for most people during wound reco...

### Q9: "Can I drink tea during recovery?"
- **Category**: `coffee/tea`
- **Urgent Flag**: No
- **Source**: Local Knowledge Base
- **Answer**:
> Moderate black coffee or tea is generally fine for most people during wound reco...

### Q10: "Can I drink green tea?"
- **Category**: `coffee/tea`
- **Urgent Flag**: No
- **Source**: Local Knowledge Base
- **Answer**:
> Moderate black coffee or tea is generally fine for most people during wound reco...

