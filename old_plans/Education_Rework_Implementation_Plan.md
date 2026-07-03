# Education Rework — Implementation Plan (Handoff for Composer 2.5)

> **Audience:** an autonomous coding agent implementing this in the `Legacy-Vite` codebase. Read
> this whole document before writing code. Work **phase by phase, in order**. Each phase is
> independently shippable and has its own acceptance criteria. Do **not** start a phase until the
> previous phase's criteria pass.

---

## 0. Context & Locked Decisions

This reworks the school portion of the education system: a **grade system** (Primary + Secondary),
a generated **school cohort** (classmates + 3 staff filled from the world), an **Education UI
overhaul**, and **Study** mechanics (a decision and an interaction). Source of intent:
`Legacy_ToDo.txt:84-131`. Where that file is ambiguous, **this document wins.**

**Decisions already made (do not re-litigate):**

1. **Grade system applies to Primary + Secondary only.** University keeps its existing degree
   ladder (`baccalaureate`/`licentiate`/`doctorate`) untouched this pass.
2. **Grade ladder climbs F → D → C → B → A**, each band `0–100`. Starts at F/0, **resets per tier**,
   recorded in Memories on tier exit. Player-only (classmates do not have a grade).
3. **Grade inputs:** Study decision (+25), Study-with interaction (+34), school events (which
   **keep their existing stat bumps AND additionally grant grade**), and **Int-scaled passive
   accrual** each enrolled year: `clamp(round(1.4 × effectiveInt − 2), 0, 60)` (`// BALANCE: provisional`).
   Anchor points: Int 10 → ~12/yr (fails), Int ~30 → ~40/yr (coasts to C), Int 50 → capped.
4. **End-of-tier reward popup** (fires at the tier transition), by final letter:
   - **A** → +5 Int, +2 Insight, +1 Charisma
   - **B** → +3 Int, +1 Insight, +1 Charisma
   - **C** → +1 Int
   - **D** → nothing
   - **F** → −10 Health **and expelled**
5. **Expulsion ends formal schooling entirely.** Reuse the existing terminal `dropped_out` **stage**
   (it already blocks higher tiers + degree-gated careers) and add a display-only
   `education.expelled = true` flag so the tab reads "Expelled" rather than "Dropped Out".
   Fail Primary → no Secondary; fail Secondary → no University.
6. **Do NOT grant the `school_dropout` trait to the player anymore** — it's a hidden, **functionless**
   record (verified: only ever written, never read for any effect). Leave the NPC dropout path
   (`npcEducation.js`) as-is to avoid churn.
7. **Ages: Primary 6–11, Secondary 12–16 (completes at 17), University entry 17+.** Adjust the
   career-start / scholarship / university gates that currently assume 18.
8. **School staff = exactly 3 roles**, filled from the world: a **female Primary teacher**, a
   **female Secondary teacher**, and a **Headmaster** (any sex, rank-preferred). They are NPCs
   holding the existing `schoolmaster` career — **prefer an existing eligible NPC; generate only as
   fallback.** Self-healing on death.
9. **Cohort persists permanently** (lifelong acquaintances). A single very-high cap constant bounds
   generation so it can be tuned later without code changes.
10. **Focus/Lifestyle → grade is deferred** (decoupled this pass).

**Out of scope this pass** (your "Future"): University grade system/overhaul, cheating/bribing for
grade points, focus/Lifestyle → grade wiring. See "What We Have NOT Done This Pass".

---

## Phase Roadmap (execute strictly in order)

| Phase | Title | Risk | Notes |
|---|---|---|---|
| 1 | Grade state + Progress-bar UI | Med | Grade data model, helpers, save migration, the top-of-panel grade bar with Study shortcut + relocated Dropout. |
| 2 | Reusable family builder + Cohort generation + Staffing + Social View | **High** | Biggest piece: extract an NPC-family builder, generate/maintain the cohort, staff the 3 roles from the world, render the Social View. |
| 3 | Grade wiring + Study mechanics + rewards/expulsion + age changes + cleanups | Med | Connect events/Study/passive accrual to grade; end-of-tier rewards & expulsion; 12–16 ages; remove The Road Ahead etc. |

Per-phase definition of done = acceptance criteria pass **+ CHANGELOG updated + `npm run build` +
`npm run test:smoke` + a pre-existing save loads without console errors.**

---

## 1. Current State (verified — read these files first)

| Concern | File | Current behavior |
|---|---|---|
| Stage machine + tick | `src/sim/educationTick.js` | `tickEducation()` drives `none→primary`(6)`→secondary`(12)`→completed`(18)`→` higher-ed; fires school situations at fixed ages; **explicitly no per-year stat drip** (comment ~L162). `educationStageLabel()` maps stages → labels. |
| School/uni situations | `src/data/educationSituations.js` | `school_started_primary` (has the "old, severe… pipe smoke" schoolmaster text), `primary_crossroads`, `graduation_fork` (= "The Road Ahead"; sets `education.intent`), `secondary_enrollment` (immersive, sets track pref), plus all university templates. Buttons apply stat bumps via `bumpStat`. |
| NPC dropout | `src/sim/npcEducation.js` | `tickNpcSchoolDropout` — Int-based; sets stage `dropped_out`, grants `school_dropout`, assigns early career. Keep as-is. |
| Higher-ed data | `src/data/education.js` | `EDUCATION_LADDER` + lookups. Leave alone. |
| UI panel + dropout | `src/legacy.js` ~3458–3700 | `renderEducationPanel()` (one big fn → `#voc-panel-education`), `dropOutOfSchool`/`dropOutOfUniversity`, `canDropOutOfSchool` (secondary-only). Higher-ed progress bar uses `.edu-progress-*` classes. |
| Player family gen | `src/legacy.js` ~2192–2470 | Inline `createPerson` calls build the player's parents/siblings/grandparents/aunts-uncles. **Not reusable** — Phase 2 extracts a builder. |
| Family helpers | `src/sim/familyGeneration.js`, `src/sim/siblings.js` | Sibling-count weights, age spreads, etc. Reuse. |
| Person factory | `src/state/personFactory.js` | `createPerson`, `inheritStats`, `rollAdultStats`, `applyInheritedStats`, `snapshotBirthStats`. |
| Careers | `src/data/careers.js` (`schoolmaster` ~L132, ranks `['Assistant','Teacher','Senior Teacher','Headmaster/Principal']`); `src/sim/careers.js` (`pickCareerForNPC`, `assignCareerToPersonWithAgeFit`, `assignEarlyCareerToNPC`) | Staff are `schoolmaster`-career NPCs. |
| Year tick order | `src/sim/yearTick.js` | `age++` → journal → relationship decay → siblings → births → NPC career assign → career progression → **`tickEducation()`** → player career nudge → player events → **`checkMortality()`** → refresh AP. (Mortality runs *after* education, so staffing self-heals one tick after a death.) |
| Decisions | `src/data/decisions.js`, `src/sim/decisionGates.js` | Decision defs + gating (`gateAll` etc.). Study decision plugs in here. |
| Interactions | `src/sim/personInteractions.js`, `src/ui/personInteract.js` | Person interaction defs + UI. "Study with" plugs in here. |
| AP | `src/sim/actionPoints.js` | `canSpendActionPoints`/`spendActionPoints`; 20 AP/yr. Study costs **2**. |
| Popups / logging | `src/sim/immersivePopup.js`, `src/sim/situationLog.js` (`recordMilestone`, `record` tiers), `src/sim/annals.js` (`proposeAnnals`) | End-of-tier reward + dropout confirm use these. |
| Save | `src/state/saveSystem.js` (`SAVE_SCHEMA`), mirror in `src/legacy.js:1059` | Ordered `if (save.schema < N)` migrations. |
| Nav container | `src/ui/navigation.js` | Estate/Vocation/etc. sub-tabs; education renders into `#voc-panel-education`. |

**Schema-number note:** the item/hobby plan also bumps `SAVE_SCHEMA`. **Use the next free number**
— if that plan's Phase 1 already landed (26→27), this rework's bump is **27→28**; otherwise 26→27.
Always update **both** `src/state/saveSystem.js` and the `src/legacy.js` mirror, with a doc comment.

---

## 2. Data Model (added across phases)

### 2.1 Player grade (Phase 1) — on `player.education`
```js
education.grade = { letter: 'F', points: 0 }   // letter ∈ 'F'|'D'|'C'|'B'|'A'; points 0–100
education.expelled = false                       // display-only flag (Phase 3)
```
- Present only while `stage ∈ {'primary','secondary'}`. Created on tier entry (reset to F/0),
  consumed + cleared at tier exit.
- **Grade order array:** `const GRADE_ORDER = ['F','D','C','B','A'];` (index 0 = floor, 4 = top).

### 2.2 School world state (Phase 2) — new top-level `G.school`
```js
G.school = {
  active: false,            // true while player.education.stage ∈ primary/secondary
  primaryTeacherId: null,
  secondaryTeacherId: null,
  headmasterId: null,
  studentIds: [],           // currently-enrolled cohort member ids (ages 6–16)
};
```
- `studentIds` is the **current roster** (members leave it when they reach 17 / leave school, but
  persist in `G.people` forever). Group for display by each member's `education.stage`.
- Lives in game state (`src/state/gameState.js` `G`), persisted in the save, migrated in Phase 2.

### 2.3 Tuning constants (single source, all `// BALANCE: provisional`)
```js
SCHOOL_STUDENTS_PER_AGE_MIN = 3, SCHOOL_STUDENTS_PER_AGE_MAX = 5;
SCHOOL_COHORT_CAP = 1000;                 // very high now; lower later if perf demands
GRADE_PASSIVE = (int) => clamp(Math.round(1.4*int - 2), 0, 60);
STUDY_DECISION_GRADE = 25, STUDY_DECISION_INT = 0.25;
STUDY_INTERACTION_GRADE = 34, STUDY_INTERACTION_DISPOSITION = 5;
STUDY_AP_COST = 2, STUDY_INTERACTION_DISPOSITION_REQ = 20; // ">19"
```

---

## PHASE 1 — Grade State + Progress-Bar UI

**Goal:** Introduce the grade data model, its helpers, the save migration, and the new top-of-panel
grade bar (with a Study shortcut and the relocated Dropout button + confirm popup). **No cohort,
no Study effects wired yet** — the bar can display and the Dropout flow works; grade only changes
via a temporary debug path or stays at F/0 until Phase 3.

### 1.1 Grade helpers (new: `src/sim/grade.js`)
```
GRADE_ORDER = ['F','D','C','B','A']
ensureGrade(player)                  // create {letter:'F',points:0} if missing & in a graded tier
resetGrade(player)                   // set to F/0 (call on tier entry)
addGrade(player, n)                  // add points; roll over letters (100→next letter at 0);
                                     // hard cap at 'A'/100; returns {letter, points, lettersGained}
gradeLabel(player)                   // e.g. "C (62/100)"
gradeFraction(player)                // 0..1 across the WHOLE ladder for the bar fill (optional)
finalGradeLetter(player)             // current letter, for end-of-tier reward
clearGrade(player)                   // delete education.grade (call after tier exit reward)
```
- `addGrade` overflow: while `points >= 100` and letter < 'A', `points -= 100; letter = next`.
  At 'A', clamp `points` to 100. Never go below F/0.

### 1.2 Save migration
- Bump `SAVE_SCHEMA` (next free number; see note) in `saveSystem.js` + `legacy.js` mirror.
- Migration block: if a loaded player has `stage ∈ {'primary','secondary'}` and no
  `education.grade`, initialize `{ letter:'F', points:0 }`. Add `education.expelled` default
  `false` for all. (Cohort/`G.school` migration is Phase 2.)
- Add the human-readable comment in the migration list (match existing style).

### 1.3 Education panel — grade bar (modify `renderEducationPanel()` in `legacy.js`)
- When `stage ∈ {'primary','secondary'}`, render **at the very top of the panel** a grade block,
  styled like the hobby skill bar (reuse `.hobby-skill-bar` / `.stat-bar`/`.stat-fill`, or the
  existing `.edu-progress-*`): big current **letter**, the `points/100` within the letter, and a
  fill bar. Label e.g. `Grade: C — 62 / 100`.
- Beside/under the bar, two controls:
  - **Study** shortcut button → opens/raises the Study decision (Phase 3 wires the effect; in
    Phase 1 it can navigate to the Decisions section / be inert-but-present).
  - **Drop Out** button (secondary+ only via `canDropOutOfSchool`) → **confirm popup** (see 1.4).
    Remove the old `edu-dropout-card`/`uniDropoutHtml` dropout buttons from their current location
    (keep the university "Leave University" control where it is, or also move it — keep school
    dropout here). The relocated button replaces the old school-dropout card.

### 1.4 Dropout confirm popup (flavor + confirm)
- Clicking Drop Out opens a confirm dialog (reuse the immersive/confirm popup pattern in
  `sim/immersivePopup.js` or a simple overlay like `itemPopup`) with **flavor text** and
  **Confirm / Cancel**. Only on Confirm call `dropOutOfSchool(player)`.
- Update `dropOutOfSchool` to **not** grant `school_dropout` to the player (decision #6); it still
  sets `stage='dropped_out'`, `since=G.year`, `track=null`, records the memory, re-renders.

### 1.5 Acceptance criteria (Phase 1)
- [ ] `education.grade` is created on entering primary/secondary and the bar shows letter + points.
- [ ] `addGrade` rolls F→D→C→B→A correctly and caps at A/100; never drops below F/0 (unit-exercise
      via a temporary debug button or console is fine).
- [ ] Pre-existing in-school save loads with a grade backfilled to F/0; no console errors.
- [ ] Drop Out is now at the grade-bar area, shows a flavor confirm popup, and only drops on Confirm.
- [ ] Player no longer receives the `school_dropout` trait on dropout.
- [ ] CHANGELOG `[Unreleased]` updated (⚠ High impact — schema bump + `education` shape). Build + smoke pass.

---

## PHASE 2 — Family Builder + Cohort Generation + Staffing + Social View

**Goal:** A living school: a reusable NPC-family builder, a generated student cohort that maintains
itself yearly, the 3 staff roles filled from the world (generate as fallback, self-heal on death),
and the Social View UI. **The biggest and riskiest phase.**

### 2.1 Reusable NPC-family builder (new: `src/sim/npcFamilyGen.js`)
Extract and generalize the inline player-family logic (`legacy.js` ~2192–2470). Signature:
```
generateNpcWithFamily({ age, sex?, surname?, includeSiblings=true, includeParents=true })
  → { focal, members[] }   // members includes focal + parents + siblings
```
- Builds a focal person + **2 parents + 1–N siblings** (use `siblingCountWeights`/`rollSiblingCount`
  and the age-spread helpers in `familyGeneration.js`). **No grandparents, no aunts/uncles**
  (per design). Uses `createPerson`, `inheritStats`/`rollAdultStats`, `applyInheritedStats`,
  `snapshotBirthStats` exactly as the player builder does.
- Wires `parentIds`/`childIds`/`spouseIds` consistently; pushes all members to `G.people`.
- Refactor the player-family code to call this builder where practical (de-dupe), **without
  changing player-family output** — verify a new game still produces the same family shape.

### 2.2 Staffing (new: `src/sim/schoolStaff.js`)
```
fillSchoolStaff()   // ensure all 3 slots reference a living, valid schoolmaster NPC
```
For each slot (`primaryTeacherId`, `secondaryTeacherId`, `headmasterId`) that is empty **or points
to a dead/missing person**:
1. **Prefer an existing eligible NPC** in `G.people`: `isAlive`, adult, `career?.id === 'schoolmaster'`,
   not the player, not already in another slot.
   - Teacher slots: **prefer `sex === 'F'`**. Headmaster: **prefer highest schoolmaster rank**
     (Senior Teacher / Headmaster-Principal); any sex.
   - If multiple, pick the best rank/age fit; deterministic-ish (e.g. oldest suitable).
2. **Fallback — generate** via `generateNpcWithFamily({ age: rollAdult, sex })`, then assign the
   `schoolmaster` career using the existing career helpers (`assignCareerToPersonWithAgeFit` /
   `pickCareerForNPC`), forcing `career.id='schoolmaster'` at the slot-appropriate rank.
- Never reassign a living staffer out of their slot (keep until death). Idempotent; safe to call
  every tick.

### 2.3 Cohort generation & maintenance (new: `src/sim/schoolCohort.js`, called from `tickEducation`)
- **On player entering primary** (the `none→primary` transition for the player): set
  `G.school.active = true`, `fillSchoolStaff()`, and generate the initial student body:
  **3–5 students at each age 6–11** via `generateNpcWithFamily`, each enrolled
  (`education.stage='primary'`, `since=G.year`), pushed to `G.school.studentIds`. Respect
  `SCHOOL_COHORT_CAP` (stop generating new families if the cap is hit; never hard-crash).
- **Each year while `G.school.active`:**
  - Existing students age via the normal tick; the existing `primary→secondary` transition (age 12)
    moves them between display groups automatically (they stay in `studentIds`).
  - **Add 3–5 new age-6 students** (subject to cap).
  - **Remove from `studentIds`** any member who has reached `stage='completed'`/left school
    (age ≥ 17) — they remain in `G.people` permanently as the lifelong cohort.
  - `fillSchoolStaff()` (self-heals any deaths from the prior tick).
- **Deactivate** (`G.school.active=false`) when the player leaves secondary (reaches `completed`/
  university/dropped/expelled). Per design, the school keeps running **until the player graduates to
  university** — so generation continues through the player's primary AND secondary years.
- NPC dropout (`npcEducation.js`) keeps working on cohort members (they can leave school early).

### 2.4 Save migration (extend Phase 1 block or a new one)
- Initialize `G.school` scaffold on load. If the loaded **player is currently in primary/secondary**
  and `G.school` is empty, **populate a fresh cohort + staff** so the Social View isn't blank
  (acceptable approximation for old saves). Otherwise leave `active=false`.

### 2.5 Social View UI (in the Education panel, under the grade bar)
- Render a **"Primary School" / "Secondary School"** roster from `G.school.studentIds`:
  - **Top row:** the 3 staff (Headmaster + the two teachers), visually distinct.
  - **Student rows:** sorted by **age descending** (oldest at top), grouped/labeled by age.
  - Each person is a clickable card opening the existing **person modal** (reuse
    `ui/personModal.js` / person-card markup from `ui/relations.js`/`personPanels.js` — do not
    invent a new card style).
- **Secondary toggle:** when the player is in secondary, show a toggle to also view the still-running
  **primary** school (filter `studentIds` by `education.stage`). Default shows the player's current
  tier.
- Empty/again-safe: if `!G.school.active`, render nothing (or a quiet placeholder).

### 2.6 Acceptance criteria (Phase 2)
- [ ] Entering primary generates 3–5 students per age 6–11, each with parents + siblings, all in
      `G.people`; the 3 staff slots are filled (existing schoolmaster NPCs preferred, generated only
      as fallback).
- [ ] Killing a staff NPC (debug) results in the slot being refilled on the next tick (existing NPC
      first, else generated).
- [ ] An existing eligible relative/NPC with the `schoolmaster` career is chosen for a slot when one
      exists (verify the "aunt becomes the teacher" path).
- [ ] Each year: ~3–5 new 6-year-olds appear; 12-year-olds show in the Secondary group; 17+ leave
      the roster but still exist in the world.
- [ ] Social View lists staff on top and students by descending age; cards open the person modal;
      the secondary→primary toggle works.
- [ ] Player-family generation output is unchanged after the builder refactor (new game sanity check).
- [ ] `SCHOOL_COHORT_CAP` is a single constant; generation respects it without errors.
- [ ] CHANGELOG `[Unreleased]` updated (⚠ High impact — new `G.school` state + save migration + new
      person generation). Build + smoke pass.

---

## PHASE 3 — Grade Wiring, Study Mechanics, Rewards/Expulsion, Age Changes, Cleanups

**Goal:** Make grades actually move, add the Study decision & interaction, fire end-of-tier rewards
and expulsion, shift the ages to 12–16, and remove the deprecated events.

### 3.1 Passive accrual + event grade (modify `tickEducation` + `educationSituations.js`)
- In `tickEducation`, for the **player** while `stage ∈ {'primary','secondary'}`, each year:
  `addGrade(player, GRADE_PASSIVE(effectiveStat(player,'intelligence')))`. (This is the deliberate
  reversal of the old "no per-year drip" rule — leave a comment noting it.)
- School-event buttons (`school_started_primary`, `primary_crossroads`, any new primary events):
  **keep their existing `bumpStat` calls** and **additionally** call `addGrade(player, N)` per
  choice (`// BALANCE: provisional`, e.g. 15–40 by how studious the choice is). **Show the grade
  delta (and stat effects) in the option button labels/sublabels** (`Legacy_ToDo.txt:94,96,102`).

### 3.2 Study decision (data: `src/data/decisions.js`; gate: `src/sim/decisionGates.js`)
- New decision **"Study"**, cost **2 AP**, gate: `stage ∈ {'primary','secondary','*university in-progress*'}`.
  *(Include university-in-progress stages in the gate per the ToDo text, but since university has no
  grade bar this pass, in university it only grants the Int trickle — see note.)*
- Effect: `spendActionPoints(player,2)`; `addGrade(player, 25)`; `bumpStat(player,'intelligence',0.25)`;
  annals line. Follow the existing decision-definition pattern exactly.
- **University note:** with no university grade bar, in a university stage "Study" applies only the
  `+0.25 Int` (skip `addGrade`). Keep the gate but branch the effect on whether a grade exists.

### 3.3 Study-with interaction (`src/sim/personInteractions.js` + `src/ui/personInteract.js`)
- New interaction **"Study with"**, cost **2 AP**, visible when: player `stage ∈ {primary,secondary}`,
  target is an **enrolled classmate** (in `G.school.studentIds`), and `disposition > 19`.
- Effect: `spendActionPoints(player,2)`; `addGrade(player, 34)`; raise disposition toward the target
  by **+5** (use the existing disposition/relationship API). NPC gains disposition only (no stat).
- Mirror the structure/feedback of existing interactions; respect AP gating + annals.

### 3.4 End-of-tier rewards & expulsion (modify `tickEducation` transitions)
- **Primary → (age 12):** before flipping stage, compute `finalGradeLetter(player)` and fire the
  **reward popup** (immersive popup; `record: 'milestone'`, memoryCategory `education`) applying the
  reward table (#0.4). Record the letter in the memory. Then:
  - If letter **F** → apply −10 Health, set `stage='dropped_out'`, `education.expelled=true`,
    `clearGrade(player)`; **do not enter secondary.** Flavor: "the teacher smacks you with a ruler…".
  - Else → `stage='secondary'`, `since=G.year`, `resetGrade(player)` (fresh F/0 for secondary).
- **Secondary → (age 17):** same pattern; non-F → `stage='completed'`; **F → expelled** (no
  university). `clearGrade` after the reward either way.
- Replace the current age-18 completion with **age-17** completion (see 3.5).
- These rewards stack with event/Study stat gains by design (decision #3/#0.4).

### 3.5 Age changes (Secondary 12–16, completes at 17)
- In `tickEducation`: keep `primary` at 6, `secondary` at 12, but **`secondary → completed/expelled`
  now triggers at age 17** (not 18).
- Audit and update **all 18-assumptions** for school→adult timing: scholarship offer
  (`shouldOfferScholarship` fires off `stage==='completed'`, fine), `university_enrollment` entry,
  early-career assignment, and any `age >= 18` school checks in `legacy.js`
  (e.g. ~3124/3172/3455 in/near `renderEducationPanel` and career gating). University entry should
  be reachable from 17. Leave the higher-ed durations unchanged.

### 3.6 Cleanups (`educationSituations.js`, `educationTick.js`, `legacy.js`)
- **Remove "The Road Ahead"** (`graduation_fork`) entirely and stop firing it; **remove all
  `education.intent`** reads/writes.
- **Remove the schoolmaster physical description** ("old, severe… pipe smoke") from
  `school_started_primary`'s body; keep the rest.
- Ensure **stat + grade effects are shown in option buttons** for You Begin School, Primary
  Crossroads, and Secondary enrollment (`Legacy_ToDo.txt:94,96,102`).
- `educationStageLabel`: when `education.expelled`, the Education tab shows **"Expelled"** instead of
  "Dropped Out" (display-only; stage stays `dropped_out`).

### 3.7 Acceptance criteria (Phase 3)
- [ ] Idle Int-10 player trends to F and is **expelled** at tier end (−10 Health, no next tier);
      idle Int-30 player reaches ~C without studying.
- [ ] Study decision (2 AP) adds 25 grade + 0.25 Int; Study-with (2 AP, disposition>19, classmate)
      adds 34 grade + 5 disposition; both gated correctly and consume AP.
- [ ] School events raise grade **and** keep their stat bumps; option buttons show the effects.
- [ ] End-of-tier reward popup fires with the correct table per letter and writes a graded memory;
      grade resets for the next tier.
- [ ] Expulsion (F) ends schooling: fail primary → no secondary; fail secondary → no university;
      tab shows "Expelled".
- [ ] Secondary completes at **17**; university is reachable at 17+; no lingering age-18 school
      assumptions.
- [ ] "The Road Ahead" and `education.intent` are gone; schoolmaster physical description removed.
- [ ] CHANGELOG `[Unreleased]` updated. Build + smoke pass.

---

## What We Have NOT Done This Pass (explicit out-of-scope)

If a phase tempts you toward any of these, **stop and leave a `// TODO`**.

- **University grade system / overhaul.** University keeps the existing 3-degree ladder; no grade
  bar, no end-of-tier grade rewards there. (Study in university grants only the small Int trickle.)
- **Cheating / bribing for grade points.** Not implemented.
- **Focus / Lifestyle → grade.** Deferred until the separate Focus→Lifestyle rework lands; grade is
  driven only by Study, events, and passive Int accrual this pass.
- **Classmate grades.** Grade is player-only; classmates are social NPCs (+ NPC dropout as today).
- **`school_dropout` trait functionality.** It remains a functionless hidden record; we simply stop
  granting it to the player. We do **not** build any effect for it.
- **Staff beyond the 3 roles**, substitute teachers, or staff career progression tied to the school.
- **Tuning.** All numbers (passive slope/cap, per-age counts, `SCHOOL_COHORT_CAP`, event grade
  values) are `// BALANCE: provisional`.

---

## Global Conventions for the Implementing Agent

- **Match surrounding code style:** ES modules, JSDoc (no TS), `escapeHtml` for UI strings,
  `proposeAnnals`/`recordMilestone` for messages/memories, `clamp`/`statCap` from utils,
  `weightedPick` + `src/utils/random.js` for rolls. Reuse existing CSS classes (`.edu-progress-*`,
  `.career-page`, `.hobby-skill-bar`/`.stat-bar`/`.stat-fill`, person-card/modal markup) before
  inventing; new classes namespaced `.edu-*`/`.school-*`.
- **Year-tick ordering matters:** cohort/staff maintenance runs inside `tickEducation` (before
  `checkMortality`), so staffing self-heals one tick after a death. Don't reorder `runYearTick`.
- **Schema bumps** update BOTH `src/state/saveSystem.js` and the `src/legacy.js:1059` mirror, add an
  ordered migration block + doc comment, and use the **next free** schema number (coordinate with
  the item/hobby plan if both are in flight).
- **All tunables** get `// BALANCE: provisional`. **All deferred deps** get explicit `// TODO`.
- After each phase: `npm run build` + `npm run test:smoke` pass; a pre-existing save loads clean.

## CHANGELOG — MANDATORY every phase
Append to `CHANGELOG.md` `[Unreleased]` before each phase's PR is done. Follow the file's rules
(categories `Added/Changed/Fixed/Removed`; file refs in parens; `⚠ **High impact** —` for save
schema / `PERSON_DEFAULTS` / `G` structure / person creation). Mandatory high-impact entries:
**Phase 1** (schema + `education` shape), **Phase 2** (`G.school` + save migration + new person
generation). Each phase's acceptance list already includes a CHANGELOG checkbox.

## Suggested commit/PR boundaries
One PR per phase (1→3). **Phase 2 is the riskiest** (new world state, mass NPC generation, save
migration) — review population growth + save round-tripping carefully before Phase 3.
