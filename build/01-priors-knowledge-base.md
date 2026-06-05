# Helix Health — Priors Knowledge Base

**Purpose:** The curated library of physiological relationships that grounds Claude's reasoning. This is Helix's credibility moat — it keeps the AI anchored to real mechanisms instead of hallucinating. Cursor should seed these into the `priors` table verbatim.

**How it's used:** At query time, the engine selects the priors whose `cause`/`effect` signals overlap the user's active evidence, injects them into the prompt (prompt-cached), and Claude assembles them — weighted by the user's actual data — into a ranked causal chain.

---

## Entry schema

```
{
  id:            string   // stable slug, used as edge origin reference
  cause:         signal_key
  effect:        signal_key
  type:          "drives" | "reduces" | "increases" | "modulates"
  mechanism:     string   // one-sentence physiological rationale, plain language
  evidence_signals: signal_key[]   // what in the user's data corroborates this link
  confidence:    number   // 0–1, base plausibility of the relationship in general population
  domain:        "sleep" | "recovery" | "nutrition" | "biomarker" | "intervention" | "cycle" | "activity" | "symptom"
  requires_clinician: boolean   // true if acting on this edge touches clinical territory
}
```

> **Signal keys** referenced here must match the seed signal catalog in `02-seed-data-story-arc.md`. Keep them identical.

---

## A. Sleep → Recovery → Downstream (Demo Act 1 backbone)

```
P01  sleep_consistency  reduces  recovery_score
  mechanism: Irregular sleep timing disrupts circadian rhythm and autonomic recovery, lowering overnight HRV and recovery.
  evidence_signals: [sleep_consistency, hrv, recovery_score]
  confidence: 0.85  domain: sleep  requires_clinician: false

P02  sleep_duration  drives  recovery_score
  mechanism: Insufficient total sleep limits restorative deep and REM sleep needed for physiological recovery.
  evidence_signals: [sleep_duration, deep_sleep, recovery_score]
  confidence: 0.8  domain: sleep  requires_clinician: false

P03  recovery_score  drives  activity_level
  mechanism: Low recovery reduces readiness and training capacity, so daily activity and workout volume fall.
  evidence_signals: [recovery_score, activity_level, workout_performance]
  confidence: 0.75  domain: recovery  requires_clinician: false

P04  recovery_score  reduces  afternoon_fatigue   // note: low recovery INCREASES fatigue; modeled as reduces(energy)→fatigue, see P05
  mechanism: Poor overnight recovery leaves lower daytime energy reserves, surfacing as afternoon fatigue.
  evidence_signals: [recovery_score, hrv, afternoon_fatigue]
  confidence: 0.78  domain: recovery  requires_clinician: false

P05  sleep_consistency  drives  afternoon_fatigue
  mechanism: Variable sleep/wake timing causes circadian misalignment that manifests as predictable afternoon energy crashes.
  evidence_signals: [sleep_consistency, afternoon_fatigue]
  confidence: 0.7  domain: sleep  requires_clinician: false

P06  hrv  drives  recovery_score
  mechanism: Higher heart-rate variability reflects stronger parasympathetic recovery and underlies recovery scoring.
  evidence_signals: [hrv, recovery_score]
  confidence: 0.82  domain: recovery  requires_clinician: false

P07  resting_hr  reduces  recovery_score
  mechanism: Elevated resting heart rate signals incomplete recovery or accumulated strain, depressing recovery.
  evidence_signals: [resting_hr, recovery_score]
  confidence: 0.72  domain: recovery  requires_clinician: false

P08  sleep_consistency  drives  deep_sleep
  mechanism: Stable sleep timing increases the proportion of restorative deep sleep.
  evidence_signals: [sleep_consistency, deep_sleep]
  confidence: 0.68  domain: sleep  requires_clinician: false
```

## B. Activity / Training → Outcomes

```
P09  activity_level  drives  weight_trend
  mechanism: Reduced activity lowers total energy expenditure, contributing to weight-loss plateaus.
  evidence_signals: [activity_level, weight_trend, calorie_intake]
  confidence: 0.7  domain: activity  requires_clinician: false

P10  recovery_score  drives  workout_performance
  mechanism: Training on low recovery limits output, so workout quality and progression decline.
  evidence_signals: [recovery_score, workout_performance]
  confidence: 0.76  domain: activity  requires_clinician: false

P11  activity_level  increases  recovery_score
  mechanism: Appropriate aerobic activity improves cardiovascular fitness and baseline HRV over time (U-shaped — excess strain reverses this).
  evidence_signals: [activity_level, recovery_score, hrv]
  confidence: 0.6  domain: activity  requires_clinician: false

P12  workout_performance  drives  weight_trend
  mechanism: Declining workout output reduces caloric burn and lean-mass stimulus, slowing fat loss.
  evidence_signals: [workout_performance, weight_trend]
  confidence: 0.55  domain: activity  requires_clinician: false
```

## C. Nutrition → Recovery / Body Composition

```
P13  protein_intake  drives  recovery_score
  mechanism: Adequate protein supplies amino acids for muscle repair; low intake impairs recovery and adaptation.
  evidence_signals: [protein_intake, recovery_score, workout_performance]
  confidence: 0.72  domain: nutrition  requires_clinician: false

P14  calorie_intake  drives  weight_trend
  mechanism: Sustained energy deficit drives weight loss; a closing deficit produces a plateau.
  evidence_signals: [calorie_intake, weight_trend, activity_level]
  confidence: 0.8  domain: nutrition  requires_clinician: false

P15  protein_intake  drives  workout_performance
  mechanism: Insufficient protein limits muscle repair and strength expression, degrading workout performance.
  evidence_signals: [protein_intake, workout_performance]
  confidence: 0.62  domain: nutrition  requires_clinician: false

P16  calorie_intake  drives  afternoon_fatigue
  mechanism: Very low energy intake or skipped meals can reduce available glucose, contributing to afternoon fatigue.
  evidence_signals: [calorie_intake, afternoon_fatigue]
  confidence: 0.55  domain: nutrition  requires_clinician: false

P17  hydration  drives  afternoon_fatigue
  mechanism: Mild dehydration reduces alertness and contributes to perceived fatigue.
  evidence_signals: [hydration, afternoon_fatigue]
  confidence: 0.45  domain: nutrition  requires_clinician: false
```

## D. Biomarkers → Energy / Recovery (Demo Act 2 backbone)

```
P18  ferritin  drives  energy_level
  mechanism: Low ferritin (iron stores) limits oxygen transport and cellular energy production, reducing energy.
  evidence_signals: [ferritin, energy_level, afternoon_fatigue]
  confidence: 0.82  domain: biomarker  requires_clinician: true

P19  energy_level  drives  exercise_capacity
  mechanism: Reduced systemic energy lowers tolerance for and output during exercise.
  evidence_signals: [energy_level, exercise_capacity, workout_performance]
  confidence: 0.75  domain: biomarker  requires_clinician: false

P20  exercise_capacity  drives  recovery_score
  mechanism: Diminished exercise capacity strains the body at lower workloads, slowing recovery.
  evidence_signals: [exercise_capacity, recovery_score]
  confidence: 0.65  domain: biomarker  requires_clinician: false

P21  ferritin  drives  recovery_score
  mechanism: Low iron stores impair oxygen delivery and recovery from training load.
  evidence_signals: [ferritin, recovery_score]
  confidence: 0.7  domain: biomarker  requires_clinician: true

P22  vitamin_d  drives  energy_level
  mechanism: Vitamin D insufficiency is associated with fatigue and reduced muscle function.
  evidence_signals: [vitamin_d, energy_level]
  confidence: 0.55  domain: biomarker  requires_clinician: true

P23  tsh  drives  energy_level
  mechanism: Elevated TSH (underactive thyroid) slows metabolism and commonly causes fatigue and weight changes.
  evidence_signals: [tsh, energy_level, weight_trend]
  confidence: 0.7  domain: biomarker  requires_clinician: true

P24  hs_crp  drives  recovery_score
  mechanism: Elevated inflammation (hs-CRP) impairs tissue recovery and elevates perceived fatigue.
  evidence_signals: [hs_crp, recovery_score, afternoon_fatigue]
  confidence: 0.6  domain: biomarker  requires_clinician: true

P25  fasting_glucose  drives  afternoon_fatigue
  mechanism: Dysregulated glucose produces post-prandial crashes experienced as afternoon fatigue.
  evidence_signals: [fasting_glucose, afternoon_fatigue]
  confidence: 0.55  domain: biomarker  requires_clinician: true

P26  testosterone  drives  recovery_score
  mechanism: Low testosterone reduces muscle recovery, drive, and energy.
  evidence_signals: [testosterone, recovery_score, energy_level]
  confidence: 0.55  domain: biomarker  requires_clinician: true

P27  vitamin_b12  drives  energy_level
  mechanism: B12 deficiency impairs red blood cell formation and energy metabolism, causing fatigue.
  evidence_signals: [vitamin_b12, energy_level]
  confidence: 0.55  domain: biomarker  requires_clinician: true

P28  magnesium  drives  sleep_quality
  mechanism: Low magnesium is associated with poorer sleep quality and more night waking.
  evidence_signals: [magnesium, sleep_quality]
  confidence: 0.45  domain: biomarker  requires_clinician: true
```

## E. Interventions → Cascades (Demo Act 3 backbone)

```
P29  glp1  reduces  appetite
  mechanism: GLP-1 receptor agonists slow gastric emptying and increase satiety, sharply reducing appetite.
  evidence_signals: [glp1, appetite, calorie_intake]
  confidence: 0.9  domain: intervention  requires_clinician: true

P30  appetite  drives  protein_intake
  mechanism: Reduced appetite disproportionately lowers protein intake, which is satiating and harder to consume in deficit.
  evidence_signals: [appetite, protein_intake, calorie_intake]
  confidence: 0.7  domain: intervention  requires_clinician: false

P31  glp1  reduces  calorie_intake
  mechanism: Appetite suppression lowers overall energy intake, the intended effect that also risks under-fueling.
  evidence_signals: [glp1, calorie_intake, weight_trend]
  confidence: 0.85  domain: intervention  requires_clinician: true

P32  glp1  drives  weight_trend
  mechanism: Reduced energy intake produces weight loss — the therapeutic goal.
  evidence_signals: [glp1, weight_trend, calorie_intake]
  confidence: 0.85  domain: intervention  requires_clinician: true

P33  magnesium_supplement  increases  sleep_quality
  mechanism: Evening magnesium supplementation can improve sleep quality in deficient individuals.
  evidence_signals: [magnesium_supplement, sleep_quality]
  confidence: 0.4  domain: intervention  requires_clinician: false

P34  iron_supplement  increases  ferritin
  mechanism: Oral iron supplementation raises ferritin/iron stores over weeks to months.
  evidence_signals: [iron_supplement, ferritin, energy_level]
  confidence: 0.7  domain: intervention  requires_clinician: true

P35  caffeine_late  reduces  sleep_quality
  mechanism: Caffeine consumed late blocks adenosine and delays/lightens sleep, reducing quality.
  evidence_signals: [caffeine_late, sleep_quality, deep_sleep]
  confidence: 0.6  domain: intervention  requires_clinician: false

P36  alcohol  reduces  recovery_score
  mechanism: Alcohol suppresses HRV and disrupts sleep architecture, lowering overnight recovery.
  evidence_signals: [alcohol, recovery_score, hrv, deep_sleep]
  confidence: 0.7  domain: intervention  requires_clinician: false

P37  creatine  increases  workout_performance
  mechanism: Creatine supplementation improves strength and high-intensity output.
  evidence_signals: [creatine, workout_performance]
  confidence: 0.5  domain: intervention  requires_clinician: false
```

## F. Cycle (additive modifier — Demo "nice to have")

```
P38  luteal_phase  modulates  sleep_quality
  mechanism: The late luteal phase raises core temperature and progesterone shifts, commonly reducing sleep quality.
  evidence_signals: [cycle_phase, sleep_quality, deep_sleep]
  confidence: 0.6  domain: cycle  requires_clinician: false

P39  luteal_phase  reduces  recovery_score
  mechanism: Hormonal shifts in the late luteal phase elevate resting HR and lower HRV, reducing recovery.
  evidence_signals: [cycle_phase, recovery_score, resting_hr, hrv]
  confidence: 0.55  domain: cycle  requires_clinician: false

P40  luteal_phase  increases  cravings
  mechanism: Late-luteal hormonal changes increase appetite and carbohydrate cravings.
  evidence_signals: [cycle_phase, cravings, calorie_intake]
  confidence: 0.55  domain: cycle  requires_clinician: false

P41  luteal_phase  drives  afternoon_fatigue
  mechanism: Reduced sleep quality and recovery in the late luteal phase surface as increased daytime fatigue.
  evidence_signals: [cycle_phase, afternoon_fatigue, recovery_score]
  confidence: 0.5  domain: cycle  requires_clinician: false
```

## G. Symptom / Mood cross-links

```
P42  recovery_score  drives  mood
  mechanism: Chronic low recovery and poor sleep degrade mood and emotional regulation.
  evidence_signals: [recovery_score, mood, sleep_quality]
  confidence: 0.6  domain: symptom  requires_clinician: false

P43  afternoon_fatigue  drives  cravings
  mechanism: Energy dips drive compensatory cravings for quick-energy foods.
  evidence_signals: [afternoon_fatigue, cravings]
  confidence: 0.5  domain: symptom  requires_clinician: false

P44  sleep_quality  drives  brain_fog
  mechanism: Poor sleep quality impairs next-day cognitive clarity and focus.
  evidence_signals: [sleep_quality, brain_fog, deep_sleep]
  confidence: 0.65  domain: symptom  requires_clinician: false

P45  protein_intake  reduces  cravings
  mechanism: Higher protein increases satiety and stabilizes appetite, reducing cravings.
  evidence_signals: [protein_intake, cravings]
  confidence: 0.5  domain: nutrition  requires_clinician: false
```

---

## Demo chains assembled from these priors

These are the exact causal chains the demo should produce. Cursor can use them to sanity-check that the engine surfaces the right priors.

- **Act 1 — "Why am I exhausted every afternoon?"**
  `sleep_consistency` —P01→ `recovery_score` —P03→ `activity_level` … with `sleep_consistency` —P05→ `afternoon_fatigue` as the direct link. Root driver = **sleep_consistency**. (Bonus weight-plateau branch via P03→P09→`weight_trend`.)

- **Act 2 — "Why is my recovery declining?"** (after bloodwork)
  `ferritin` —P18→ `energy_level` —P19→ `exercise_capacity` —P20→ `recovery_score`. Root driver = **ferritin**. (P21 gives a direct ferritin→recovery reinforcing edge.)

- **Act 3 — "Why is my recovery worse this month?"** (after logging GLP-1)
  `glp1` —P29→ `appetite` —P30→ `protein_intake` —P13→ `recovery_score`, with P13→`afternoon_fatigue` tail. Root driver = **glp1 → protein under-fueling**.

- **Cycle bonus — "Why do I feel worse in the late luteal phase?"**
  `luteal_phase` —P38→ `sleep_quality` —(reduced)→ `recovery_score` —→ `afternoon_fatigue`.

---

## Authoring notes for Cursor
- Store as JSON or a seed SQL insert; the engine reads them as plain objects.
- `confidence` is a *base* prior weight; final edge confidence shown in the UI = `prior.confidence × strength_of_user_evidence` (computed in the engine, not stored here).
- The `type` field maps directly to edge styling in the visualization (drives/increases = solid arrow; reduces = dashed/red-tinted; modulates = dotted).
- Keep this list to ~45 — enough for rich reasoning, small enough to fit comfortably in the cached system prompt.
