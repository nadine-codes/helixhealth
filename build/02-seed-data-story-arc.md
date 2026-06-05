# Helix Health — Seed Data & Story Arc

**Purpose:** Define the demo user and the *deliberately engineered* dataset so the three demo acts produce correct, impressive causal chains. **This is the most important asset in the build** — the reasoning is only as good as the data it reasons over. Cursor seeds this into `signals`, `interventions`, and (for Act 2) prepares the bloodwork PDF.

**Anchor date:** "today" = **2026-06-04**. All relative dates below are computed from this.

---

## The demo persona — "Jane Doe"

- 34, product manager, health-engaged "quantified striver."
- Wears an Oura-style ring (sleep, HRV, recovery), logs nutrition and workouts, gets periodic bloodwork, takes a few supplements.
- **Started a GLP-1 (semaglutide) ~4 weeks ago** (2026-05-07) to lose ~10 lbs. It's working on weight — but something feels off.
- Menstruating (enables the optional cycle act); ~28-day cycle.
- **Her frustration (the pitch):** "I have more data than ever and I still don't understand why I feel worse. Weight's finally moving but my afternoons are wrecked and my workouts are tanking."

One seeded account. Provide a one-click **"Enter Demo"** that logs into Jane's account — judges never see an empty state.

---

## Signal catalog (keys must match the priors KB)

Each signal has a **baseline** (Jane's healthy norm) and a **timeline** with deliberate perturbations. Seed ~60–90 daily datapoints per time-series signal (2026-03-06 → 2026-06-04). Biomarkers are point-in-time. Symptoms are daily self-reports (0–10).

| key | type | unit | baseline | direction of story |
|---|---|---|---|---|
| sleep_duration | sleep | hours | 7.4 | mild dip recently |
| **sleep_consistency** | sleep | score 0–100 | 82 | **drops to ~58 starting ~3 wks ago** (the Act 1 root cause) |
| sleep_quality | sleep | score 0–100 | 80 | declines with consistency |
| deep_sleep | sleep | min | 95 | declines with consistency |
| hrv | physiology | ms | 62 | trends down last 3–4 wks |
| resting_hr | physiology | bpm | 54 | creeps up last 3–4 wks |
| **recovery_score** | recovery | score 0–100 | 78 | **falls to ~58 over last 3–4 wks** (the shared outcome) |
| activity_level | activity | steps/day | 9,200 | falls as recovery falls |
| workout_performance | activity | score 0–100 | 75 | declines last 3 wks (Act 2 & 3 reinforce) |
| weight_trend | activity | lbs (7-day avg) | 162 | **steadily down since GLP-1** (working!) |
| calorie_intake | nutrition | kcal | 2,050 | **drops to ~1,450 since GLP-1** |
| **protein_intake** | nutrition | g | 115 | **drops to ~70 since GLP-1** (Act 3 root cause) |
| hydration | nutrition | L | 2.4 | flat |
| **afternoon_fatigue** | symptom | 0–10 | 3 | **rises to ~7 last 3 wks** (Act 1 outcome) |
| energy_level | symptom | 0–10 | 7 | falls last 3–4 wks (Act 2 mediator) |
| brain_fog | symptom | 0–10 | 2 | mild rise |
| mood | symptom | 0–10 | 7 | slight decline |
| cravings | symptom | 0–10 | 3 | low (GLP-1 suppresses) — rises in luteal phase |
| exercise_capacity | biomarker* | score 0–100 | 72 | declines (Act 2 mediator) |
| cycle_phase | cycle | enum | — | follicular/ovulation/luteal cycling, ~28d |

\* `exercise_capacity` is modeled as a derived/observed signal, not a lab value.

### Biomarkers (point-in-time, revealed via Act 2 PDF upload)
Two lab panels: an older baseline (2026-02-10, in-range) and the **uploaded** panel (dated ~2026-05-28) that introduces the problem.

| biomarker | baseline (Feb) | **uploaded panel (May)** | reference range | flag |
|---|---|---|---|---|
| **ferritin** | 48 ng/mL | **18 ng/mL** | 30–200 (F) | **LOW** ← Act 2 root cause |
| vitamin_d | 42 ng/mL | 34 ng/mL | 30–100 | low-normal |
| tsh | 2.1 mIU/L | 2.4 mIU/L | 0.4–4.0 | normal |
| hs_crp | 0.8 mg/L | 1.1 mg/L | <1.0 | borderline |
| fasting_glucose | 88 mg/dL | 91 mg/dL | 70–99 | normal |
| vitamin_b12 | 520 pg/mL | 480 pg/mL | 200–900 | normal |
| hemoglobin | 13.6 g/dL | 12.4 g/dL | 12.0–15.5 (F) | low-normal (corroborates low iron) |

> Only **ferritin** (plus supporting low-normal hemoglobin) is meaningfully off. Keep the rest normal so the engine confidently isolates ferritin — a clean story beats a noisy one.

---

## The three engineered story arcs (timeline)

All three problems converge on **recovery_score** and **fatigue**, so different questions surface different *root causes* of the same felt experience. This is what makes the demo feel intelligent — same symptoms, three distinct causal explanations depending on what the user asks and what data is present.

### Arc 1 — The sleep-consistency cascade (always present)
- **~2026-05-14 (3 weeks ago):** work crunch begins. `sleep_consistency` drops 82 → ~58 (bedtime swings 2–2.5h night to night), though `sleep_duration` stays okay-ish (~7h). This is the subtle, hidden root cause.
- Cascade over the following 3 weeks: `deep_sleep` ↓, `hrv` ↓, `recovery_score` 78 → 58, `activity_level` ↓ (~9,200 → ~7,400 steps), `afternoon_fatigue` 3 → 7, `weight_trend` plateau *would* show here if not for the GLP-1 deficit (good nuance: activity-driven plateau is masked by intake-driven loss).
- **Powers Act 1.** Root cause the engine must find: **sleep_consistency**, because it's upstream of recovery, activity, AND fatigue simultaneously (highest leverage).

### Arc 2 — The ferritin decline (revealed by bloodwork upload)
- Hidden until the **May lab panel** is uploaded during the demo. Before upload, the engine can't see ferritin and explains recovery via sleep. **After upload, ferritin (18, low) becomes available** and the engine re-reasons.
- Cascade: `ferritin` low → `energy_level` 7 → 4 → `exercise_capacity` 72 → 55 → `recovery_score` and `workout_performance` decline.
- **Powers Act 2.** The wow: an explanation that *changed because Helix read the labs* and fused them with wearable data.

### Arc 3 — The GLP-1 protein cascade (revealed by logging the intervention)
- `interventions` row: **GLP-1 (semaglutide), started 2026-05-07 (4 weeks ago).**
- Cascade from start date: `appetite` ↓, `calorie_intake` 2,050 → 1,450, **`protein_intake` 115 → 70** (the critical under-fueling), `weight_trend` steadily down (the intended win), but `recovery_score`/`workout_performance` ↓ from protein deficit, `afternoon_fatigue` ↑.
- **Powers Act 3.** Root cause: **GLP-1-induced low protein intake.** Action framed carefully: "prioritize protein toward ~1.6 g/kg while on a GLP-1 — discuss with your physician" (`requires_clinician: true`).

### Bonus arc — Cycle (optional)
- `cycle_phase` cycles ~28 days; Jane is in **late luteal** in the days before 2026-06-04. Seed slightly worse `sleep_quality`, `recovery_score`, and higher `cravings` during late-luteal windows.
- Powers the optional cycle question and shows the modifier layer.

---

## Why the three arcs must coexist (the demo's secret)
All three depress recovery and raise fatigue. That means:
- **Before any uploads/logs**, "why am I exhausted?" → sleep-consistency story (Arc 1 only visible data).
- **After bloodwork upload**, "why is recovery declining?" → ferritin enters and competes/combines.
- **After logging GLP-1**, "why is recovery worse this month?" → protein-deficit story.

The engine should surface the **top** chain plus **1–2 "other contributors,"** so judges see Helix weighing *multiple real drivers* — not a single hardcoded answer. Tune the seed magnitudes so each act's intended root cause clearly wins *for its question* while the others appear as secondary contributors.

---

## Daily-briefing seed (dashboard "intelligent on arrival")
Pre-generate (and cache in `insights`) a one-paragraph briefing for Jane, e.g.:

> "Over the past three weeks your recovery has slipped from 78 to 58, and afternoon fatigue has roughly doubled. The strongest driver appears to be **inconsistent sleep timing** — your bedtime has varied by over two hours most nights since mid-May, dragging down deep sleep, HRV, and daytime energy. Your weight is trending down nicely on your current plan, but lower activity from poor recovery is starting to work against you. **Highest-impact step: stabilize your sleep window.**"

---

## Generation guidance for Cursor
- Write a **deterministic seed script** (no randomness that breaks reruns) producing daily rows from 2026-03-06 to 2026-06-04.
- Use smooth transitions (linear/eased ramps) at the perturbation dates, not step functions — trends should look organic on the tiles and in evidence.
- Add light day-to-day noise (±5%) for realism, but keep the *trends* unambiguous.
- Keep all numbers internally consistent (e.g., recovery should track HRV/RHR/sleep; weight should track the calorie deficit). Judges may scrutinize the tiles.
- **Prepare the Act 2 bloodwork PDF** as a realistic-looking lab report (any clean PDF generator/template) containing the May panel above, so the upload→extract demo is live, not faked.
