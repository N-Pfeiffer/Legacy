# Careers & Higher Education — Implementation Plan

Execution model: **feed one phase per Composer session.** Each phase is self-contained;
start every session by having the agent read this file's *Context Primer* plus the phase
being executed. Phases must land in order (1 → 2 → 3 → 4) — each builds on the previous.

Source design doc: `Careers_HigherEd.txt` (repo root). Where this plan and that doc
disagree, this plan wins — it encodes decisions made after the doc was written.

---

## Context Primer (read first, every session)

The game is a Victorian-era (1800s) life/legacy sim in `Legacy-Vite/` (Vite + vanilla JS,
no framework). Key architecture:

- **State**: `src/state/gameState.js` exports the mutable world `G` (`G.year`, `G.people`,
  `G.school`, …) plus getters (`getPlayer()`, `getPerson(id)`). Person schema defaults +
  migration live in `src/state/person.js` (`PERSON_DEFAULTS`, `migratePerson`).
- **Year loop**: `src/sim/yearTick.js` → `runYearTick(deps)`. Order: year++/age++ →
  relationship decay → births → NPC career assignment → `tickCareerProgression()` →
  `tickEducation()` → player events → mortality → `refreshActionPoints(player)`.
- **AP**: `src/sim/actionPoints.js`. Budget 20/year, refreshed at the end of the year tick.
- **Situations/popups**: templates registered in a `SITUATIONS_BY_ID` registry (mostly built
  in `src/legacy.js` and `src/data/educationSituations.js`). Blocking cinematic popups are
  "immersive" templates (`src/sim/immersivePopup.js`, auto-opened from `renderGameHud`).
  Situations are fired via `hooks.fireSituation(player, templateId)`.
- **Inventory**: `src/sim/personItems.js`. Two stores: `person.materials` (stacking, keyed
  by item id) and `person.equipment` (instanced). Catalog: `src/data/items.js`.
- **Hobbies/skills**: `src/data/hobbies.js` + `src/sim/hobbies.js`. Player hobby levels live
  in `player.hobbies` (Metallurgy, Tailoring, Alchemy, Angling, Hunting, Performance, …).
- **Humors**: `src/data/humors.js` — ids `melancholic`, `sanguine`, `choleric`,
  `phlegmatic`; the player's humor is stored as a trait id in `player.traits`.
- **Relationships**: `src/sim/relationships.js` / `src/state/relationship.js`. Player↔NPC
  edges carry `disposition` (−100..100) and `intimacy`.
- **Saves**: `src/state/saveSystem.js`, `SAVE_SCHEMA = 29`, localStorage slots, migration
  chain in `migrateSave`.
- **Monolith**: `src/legacy.js` (~200KB) still owns character creation, the vocation/career
  UI (`renderVocation`, ~line 3383), the education panel (~line 3780), and wiring.
- **School-cohort precedent**: `src/sim/schoolCohort.js` + `src/sim/schoolStaff.js` generate
  and maintain classmates/teachers for the player. The Phase-4 workplace system copies this
  pattern.

### Locked global decisions

1. **Currency**: player money is a plain numeric field `player.money` (integer £). The
   Sovereign inventory item is a *mirror/display* of that number, never the source of truth.
   NPCs keep the old 0–100 `wealth` attribute unchanged.
2. **Higher ed**: full replacement. The Baccalaureate→Licentiate→Doctorate ladder, the five
   academic tracks, and their enrollment/scholarship situations are removed.
3. **Careers**: the catalog in this plan fully replaces `src/data/careers.js`. Victorian
   only — the `eras` / `nameByEra` machinery is deleted; every career has a single name
   (or a sex-dependent label pair).
4. **Saves**: compatibility is broken. Bump `SAVE_SCHEMA` to 30 and reject older saves with
   a clear message. Delete the pre-30 migration chain.
5. **AP economy (intentional harsh grind — do not soften)**: 20 AP/year. Career upkeep
   auto-deducts **5 AP** at the start of each year. Work Hard costs **5 AP** for **+5%**
   promotion progress, unlimited uses. University standard load costs 15 AP — school + work
   can consume an entire year. This is by design.
6. **Promotion gate (resolves a typo in the design doc)**: boss disposition **> 50** →
   promotion fires once the bar reaches **50%**; disposition **0–50** → bar must reach
   **100%**; disposition **< 0** → promotion impossible. Self-employed careers have no
   boss: bar must reach 100%.

---

## Phase 1 — Currency System (Sovereigns)

**Goal**: player wealth stops being a 0–100 stat and becomes literal pounds sterling,
displayed as a £ value in the HUD and mirrored as a stacking Sovereign item in Possessions.

### 1.1 New module `src/sim/money.js`

```js
export function getMoney(player)                    // integer ≥ 0
export function addMoney(player, n, { log } = {})   // n may be negative; clamps at 0
export function trySpendMoney(player, n)            // false + no-op if insufficient
export function formatMoney(n)                      // "£42"
export function syncSovereignMirror(player)         // materials.sovereign = floor(money)
```

- `player.money` added to `PERSON_DEFAULTS` (`money: 0`) — only meaningful on the player.
- `syncSovereignMirror` writes `player.materials.sovereign` **directly** (set
  `player.materialAcq.sovereign` once if absent). Do NOT route through
  `grantItem`/`addMaterial` — no per-coin annals spam, no acquisition-order churn. Call it
  from `addMoney`/`trySpendMoney` and once on load.
- If anything else mutates the sovereign stack (crafting, theft, future systems), the next
  sync overwrites it — the numeric field always wins.

### 1.2 Sovereign item (`src/data/items.js`)

```js
{ id: 'sovereign', label: 'Sovereign', category: 'material', type: 'unique',
  uniqueItem: true, icon: '👛',
  description: 'A gold Sovereign with the face of King George on it. Worth £1' }
```

Stacks infinitely via the materials store (already unbounded). Exclude `sovereign` from any
generic "consume a random material" logic if such paths exist.

### 1.3 HUD (`src/ui/renderHud.js`, `Legacy-Vite/index.html` / `body-fragment.html`)

- Replace the player wealth stat bar with a £ readout: label **Purse**, value
  `formatMoney(player.money)`. Remove the bar fill for wealth (or repurpose the row).
- Replace `sv-wealth-tier` (currently `wealthTierLabel(player.wealth)`) with a tier label
  derived from money via the **standing band** table below.
- NPC displays (bloodline stat rows in `src/ui/bloodline.js`, person modal) keep showing
  0–100 wealth for NPCs; the *player's* row shows £ instead.

### 1.4 Standing bands (money → legacy-wealth equivalent)

Used wherever old code needs a 0–100 number for the player (child inheritance, labels):

| player.money | pseudo-wealth | label |
|---|---|---|
| £0–9 | 10 | Destitute |
| £10–49 | 25 | Poor |
| £50–199 | 40 | Middle Class |
| £200–599 | 55 | Rich |
| £600–1499 | 70 | Rich |
| £1500+ | 85 | Wealthy |

Implement as `moneyStandingBand(money)` in `money.js`. `player.wealth` itself is set to 0
and no longer read anywhere (verify with a repo-wide search for `player.wealth` /
`p.wealth` on player-only paths after conversion).

### 1.5 Conversion table — every legacy `player.wealth` touchpoint

| File / system | Old behavior | New behavior |
|---|---|---|
| `sim/prison.js` `assignCellType` | private cell at wealth ≥ 63 | private cell at `money ≥ £75` |
| `sim/prison.js` turnkey | needs wealth > 30, costs 10 | needs `money ≥ £10`, costs `£5` via `trySpendMoney` |
| `sim/prison.js` `bumpWealth` deltas | ±0–100 points | same magnitudes as £ (`addMoney`) |
| `data/marriageProposal.js` ring tiers | silver 20 / gold 40 / diamond 60 wealth | **£8 / £25 / £80**; `canAffordProposalRingTier` reads money |
| `sim/personInteractions.js` ring purchase | deducts wealth | `trySpendMoney` |
| `sim/marriage.js` wealth pooling | spouses pool to max | **skip when either party is the player.** Instead, one-time dowry on player marriage: Destitute £0, Poor £5, Middle £30, Rich £80, Wealthy £200 (by spouse's `wealthTierLabel`), added via `addMoney` with an annals line |
| `state/saveSystem.js` `backfillMarriageWealth` | backfills pooling | delete (saves are broken anyway) |
| `data/playerEvents.js` `wealth_gain` | +5/10/15 wealth | `+max(£5, round(annual pay × pick([0.2, 0.4, 0.6])))` (annual pay = 0 pre-career → flat pick([£5,£10,£20])) |
| `data/playerEvents.js` `wealth_loss` | −5/10 wealth, cond wealth>15 | `−max(£3, round(annual pay × pick([0.1, 0.3])))`, cond `money > £10` |
| `data/rookeriesSituations.js` `bumpWealth` | small ± deltas | same magnitudes as £ |
| `sim/mudlarkLockbox.js` wealth delta | ± wealth | same magnitude as £ |
| `sim/careers.js` `tickWealthGravity` | drifts player wealth toward career target | **skip the player entirely** (salary replaces it — Phase 3) |
| `sim/situationLog.js` stat snapshot | records `wealth` | record `money` for the player |
| `data/educationSituations.js` gates/tuition | wealth ≥ 50/60 gates, ±wealth deltas | removed/replaced wholesale in Phase 2 — do not convert in Phase 1 (leave a `// PHASE2` comment) |
| `state/personFactory.js` child inheritance | child wealth = avg of parents' wealth | when a parent is the player, substitute `moneyStandingBand(player.money)` |
| `sim/npcEducationCurve.js`, `sim/npcFamilyGen.js` | NPC wealth reads | unchanged (NPC-only) |

### 1.6 Character creation (`src/legacy.js` ~lines 380–630, `data/socialClass.js`)

- The social-class option now sets **father AND mother** wealth from the tier (father
  already derives from `cc.wealth`; make the mother match with the same ±drift).
- **Point cost reduced 75%**: `pointCost = Math.ceil(tier.wealth * 0.25)` →
  Destitute 0, Poor 4, Middle 10, Rich 16. Update `formatSocialClassOptionLabel` output.
- Player starting purse by class: **Destitute £0, Poor £4, Middle £20, Rich £60**
  (set `player.money` at finalize; call `syncSovereignMirror`).
- `player.wealth` is set to 0 at creation.

### 1.7 Saves

- `SAVE_SCHEMA = 30`. In `loadSave`, reject `save.schema < 30` with a user-visible message
  ("This save predates the currency update and cannot be loaded."). Delete the old
  migration branches in `migrateSave` and the now-dead `registerSaveMigrationDeps` wiring
  if nothing else uses it.

### Phase 1 acceptance checks

- New game: HUD shows Purse £N matching class allowance; Possessions shows a Sovereign
  stack of N with the correct description.
- Spending (ring purchase) and gaining (windfall event) update both £ readout and stack.
- Marrying does not equalize player/spouse wealth; dowry lands once with an annals entry.
- Old save (schema 29) refuses to load with the message; new save round-trips.
- Repo-wide search: no remaining player-path reads of `.wealth` outside NPC code and the
  `// PHASE2` education markers.

---

## Phase 2 — University Replacement (Oxford / UCL, 6 degrees, progress system)

**Goal**: delete the Bacc/Licentiate/Doctorate ladder + tracks; add one University stage
with Oxford/UCL flavor, degree selection, a yearly class-load/tuition popup, and a
progress-bar path to graduation.

### 2.1 Remove

- `src/data/education.js`: `EDUCATION_LADDER` and derived exports (file is rewritten, see
  2.2). `src/data/educationTracks.js`: **delete file** and all imports.
- In `src/data/educationSituations.js`: the bacc/licentiate/doctorate enrollment
  situations, `shouldOfferScholarship`, `university_scholarship`, and the
  `BACC_WEALTH_GATE` constant. Keep the yearly pool (2.7).
- In `src/sim/educationTick.js`: `nextDegreeFor`, `canApplyForDegree`,
  `commitDegreeApplication`, the `HIGHER_ED_IN_PROGRESS_STAGES` block, the scholarship
  offer block. `playerHasDegree(player, id)` is rewritten: `player.degrees.includes(id)`
  (temporary shim for old callers: any legacy tier id → `player.degrees.length > 0`;
  removed in Phase 3).
- Education panel UI in `src/legacy.js` (~3780–3860): tier application card replaced (2.8).
- Old stage labels in `educationStageLabel` for the removed stages.

Primary/secondary school, the grade system (`sim/grade.js`), and NPC education
(`sim/npcEducation.js`) are **untouched**.

### 2.2 New data — rewrite `src/data/education.js`

```js
export const UNIVERSITIES = {
  oxford: { id: 'oxford', label: 'Oxford',
            tuition: { standard: 0, reduced: 0, few: 0 } },
  ucl:    { id: 'ucl', label: 'University College London',
            tuition: { standard: 40, reduced: 30, few: 15 } },
};

export const DEGREES = [
  { id: 'theology',     label: 'Theology',            schools: ['oxford'],        progressCost: 600 },
  { id: 'liberal_arts', label: 'Liberal Arts',        schools: ['oxford'],        progressCost: 400 },
  { id: 'medicine',     label: 'Medicine',            schools: ['oxford','ucl'],  progressCost: 800 },
  { id: 'law',          label: 'Law',                 schools: ['oxford','ucl'],  progressCost: 800 },
  { id: 'bsc',          label: 'Bachelor of Science', schools: ['ucl'],           progressCost: 400 },
  { id: 'ba',           label: 'Bachelor of Arts',    schools: ['oxford','ucl'],  progressCost: 400 },
];

export const CLASS_LOADS = [
  { id: 'standard', label: 'Standard Classes', ap: 15, progress: 100 },
  { id: 'reduced',  label: 'Reduced Classes',  ap: 10, progress: 75 },
  { id: 'few',      label: 'Few Classes',      ap: 5,  progress: 50 },
  { id: 'skip',     label: "Don't Participate This Year", ap: 0, progress: 0 },
];
```

### 2.3 Player schema

- `PERSON_DEFAULTS`: add `degrees: []` (earned degree ids).
- `player.education.stage` gains one new value: `'university'`. While enrolled:
  `player.education.university = { school, degreeId, progress, fatherFunded, sponsorship, enrolledYear }`.
  On graduation/dropout it's set back to `null` and stage returns to `'completed'`.
- Tuition is £0 when `isFreeRide(player)` — a helper returning
  `(university.fatherFunded && fatherIsAlive(player)) || university.sponsorship?.active`
  (`fatherFunded: true` only on the Oxford-choice acceptance path — never for UCL, never
  for melancholic sponsorship; `sponsorship` per 2.4b, `null` otherwise). Derived, not a
  stored boolean, so sponsorship revocation and the father's death (2.4d) take effect
  immediately.

### 2.4 Acceptance flow (fires once, from `tickEducation`, when stage is `'completed'`,
age ≥ 17, player has never enrolled and hasn't declined this year)

Three mutually exclusive acceptance situations (immersive templates). **Precedence:
melancholic beats Oxford-qualified** — a melancholic player with a rich living father
still gets the sponsorship path, and the patron pays, not the father.

Define `oxfordQualified(player)` = father alive AND `father.wealth > 70` AND
`player.sex === 'M'`.

1. **Melancholic player** (`player.traits.includes('melancholic')`): "A Peculiar
   Kindness" popup (flavor in 2.4c) — a professor offers patronage via the **University
   Sponsorship** mechanic (2.4b). Options: read at Oxford (only if `sex === 'M'`) or
   enrol at UCL — **patron-funded in both cases**, regardless of the father's wealth
   (`fatherFunded` stays false on this path). A female melancholic is offered UCL only.
   ⚠️ Do **not** touch `player.patronArc` — that field belongs to the unrelated
   "Peculiar Patron" questline in `data/particularsSituations.js`.
2. **Oxford-qualified, non-melancholic** (`oxfordQualified`): "Letters of Acceptance"
   popup (2.4c) offering a **choice of both schools**: Oxford → `fatherFunded: true`
   (free while the father lives — see 2.4d); UCL → **self-funded** (£40/£30/£15 — the
   father will not pay for Gower Street).
3. **Everyone else**: "A Letter from Gower Street" (2.4c) — UCL acceptance, self-funded;
   body text warns tuition is £40/year at standard load.

Each offers Accept / Decline. Decline re-offers next year (track
`education.universityDeclinedYear` to avoid same-year re-fire).

### 2.4c Acceptance flavor text (1800s London)

**"A Peculiar Kindness"** (melancholic — sponsorship offer):
> He introduces himself after a public lecture — an older gentleman in scholar's black,
> studying you the way an anatomist studies a specimen he suspects of being rare. He says
> he has watched you; that he recognizes the particular gravity that sits behind your
> eyes, for it sits behind his own. Great minds, he says, are seldom happy ones, and
> unhappy minds left idle devour themselves. He is a professor, and a man of some quiet
> means. He will stand as your patron — fees, books, and lodging — and asks only that
> you do not waste.

Buttons: `Accept — read at Oxford [Patron pays]` (male only) ·
`Accept — enrol at University College London [Patron pays]` · `Refuse his charity`.
(Female variant body closes instead: *"…He will stand as your patron at the new college
on Gower Street, which cares less than most who a mind belongs to."*)

**"Letters of Acceptance"** (Oxford-qualified, non-melancholic):
> Two letters arrive at the house in the same week. The first bears the arms of the
> University of Oxford — heavy cream paper, a seal pressed deep as a thumbprint. You are
> invited to matriculate among the sons of gentlemen. Your father reads it twice, says
> nothing, and instructs that his good claret be brought up from the cellar. He will pay
> your way, he announces, so long as there is breath in him — no son of his shall want
> for Latin. The second letter is thinner, from the new college on Gower Street, where a
> man may study the sciences without swearing to any articles of faith. It promises no
> dinners in hall — only lectures, at forty pounds the year. Your father sets it face
> down on the table. If it is Gower Street you want, it is your own purse that shall
> bleed for it.

Buttons: `Matriculate at Oxford [Father pays]` ·
`Enrol at University College London [£40 a year, your own purse]` · `Decline them both`.

**"A Letter from Gower Street"** (everyone else — UCL):
> A single letter finds you, postage paid in smudged pence rather than a gentleman's
> frank. University College London — the godless institution on Gower Street — will have
> you. They care nothing for your pedigree, your parish, or your professed faith; they
> care that the fees are met by Michaelmas. Forty pounds the year for a full course of
> lectures, less for fewer. It is not Oxford. But the men who built the railways, and the
> men who will build whatever comes after, are sitting in those lecture rooms — and there
> is a seat among them with your name upon it, if you can pay for it.

Buttons: `Enrol at University College London` · `Decline — the fees must wait`.

### 2.4d Father-funded Oxford — the funding dies with him

`fatherFunded: true` is only the record that the player was admitted on his father's
purse; whether tuition is actually free is checked live: `isFreeRide` counts
`fatherFunded` **only while the father is alive**. If the father dies mid-degree, the
next class-load popup charges the self-funded (UCL-table) rates and shows a one-time
notice:
> Your father's death has ended more than his life: the bursar's letters now come
> addressed to you.

### 2.4b University Sponsorship mechanic (new — melancholic path only)

A self-contained state object inside the enrollment (persists and clears with it):

```js
education.university.sponsorship = {
  patronId,          // the professor NPC's person id
  disappointments,   // 0–2
  active: true,
}
```

- **Patron generation** (on accepting the melancholic offer): professor NPC, age 45–60,
  high intelligence/insight, `career` = schoolmaster at a senior rank, generated with the
  `schoolStaff.js` pattern; relationship edge to the player starting at **+30
  disposition**. He is an ordinary interactable NPC thereafter.
- **While `active`**: tuition is £0 at either school via the `isFreeRide` helper (2.3).
  The sponsorship path never sets `fatherFunded` — the patron pays even when a rich
  father is alive.
- **Class-load reactions** (applied when the yearly popup resolves): standard →
  patron disposition **+5** and an approving annals line; reduced → no change; few →
  disposition **−10** and a warning line; skip → disposition **−20** and
  `disappointments += 1` ("Your patron's letters grow cold.").
- **Revocation** — sponsorship becomes `active: false` (permanent) when any of:
  `disappointments ≥ 2`, patron disposition < 0, or the patron dies. Annals bad entry;
  from then on the player pays their own way — the UCL price table (£40/£30/£15) applies
  at **either** school (self-funded Oxford uses the same rates).
- **Yearly patron situation**: while active, add `sponsor_patron_summons` to the
  university yearly pool (weight ~10, gated on sponsorship) — the patron requests help
  (transcription, cataloguing his library): accept costs 1–2 AP → disposition +5 and a
  small stat/skill nudge; decline → disposition −5. Keep this separate from the existing
  `univ_patron_offer` flavor situation (rename that one's title if the two read confusingly
  alike in play).
- **Graduation while active**: pride event — annals + `recordMilestone`, one-time
  `addMoney(player, 10)` gift, patron remains a high-disposition contact. Leave
  `// HOOK: patron recommendation` for a future career-referral perk.

### 2.5 Degree selection

Immediately after accepting, fire a degree-choice situation listing `DEGREES` filtered by
`schools.includes(school)`, showing progress cost. Selection sets
`education.university.degreeId`. Allow switching later via the education panel (progress
**keeps accumulating** — progress is per-enrollment, not per-degree; switching just changes
the target/cost).

### 2.6 Yearly class-load popup

- Fired from `tickEducation` each year while `stage === 'university'` (auto-open immersive
  template, like the yearly popups already fired via `hooks.fireSituation`). It must fire
  **after** `refreshActionPoints` — note `runYearTick` refreshes AP at the end of the tick,
  and situations render/open afterward, so firing from `tickEducation` and *deducting on
  choice* is correct.
- Options from `CLASS_LOADS`. For each: cost line "£N tuition · N AP" (tuition from
  `UNIVERSITIES[school].tuition[loadId]`, £0 if `isFreeRide(player)`; a self-funding
  player at Oxford — revoked sponsorship — pays the UCL price table, per 2.4b).
- On resolve, apply the sponsorship class-load reaction (2.4b) if a sponsorship exists.
- Disable options the player cannot afford (money or AP). `skip` is always available.
- On choose: `trySpendMoney(tuition)`, spend AP, `education.university.progress += progress`.
- After applying, check graduation: `progress >= DEGREES_BY_ID[degreeId].progressCost` →
  push degree id to `player.degrees`, `recordMilestone` (title "Degree: {label}",
  memoryCategory 'education'), annals entry, clear `education.university`, stage
  `'completed'`.

### 2.7 University situations retained

Keep the yearly flavor pool (`univ_debate_society`, `univ_lab_accident`,
`univ_thesis_crisis`, `univ_patron_offer`, `univ_academia_seminar`, `univ_tuition_strain`)
firing while `stage === 'university'` (~70%/yr as now). Adapt:

- Track filters → degree filters (`medicine`/`bsc` for lab accident; `univ_thesis_crisis`
  min-stage gate → require `progress > 300`).
- Wealth deltas inside these situations → £ via `addMoney` (same magnitudes).

### 2.8 UI

- Education panel (vocation section): while enrolled show school name, degree, class-load
  chosen this year, and a **progress bar** `progress / progressCost` (reuse
  `buildFocusPanelHtml` slot in `data/educationSituations.js` or replace it). Keep a
  "Leave University" (dropout) button — clears `education.university`, stage `'completed'`.
- `educationStageLabel`: add `'university'` → "At University"; degree display elsewhere
  reads from `player.degrees`.

### Phase 2 acceptance checks

- Male player with rich living father gets the two-letter choice: Oxford → tuition £0 at
  all loads; UCL → charged £40/£30/£15 (the father does not pay for Gower Street).
- Father dies while enrolled father-funded at Oxford → next class-load popup charges
  UCL-table rates and shows the bursar notice once.
- Poor/female/orphaned player gets the Gower Street letter only; standard year deducts
  £40 and 15 AP, adds 100 progress; skip year deducts nothing, adds nothing.
- Melancholic player — including one with a rich living father — gets "A Peculiar
  Kindness", not the Oxford letter; both school options are patron-funded
  (`fatherFunded` false); female melancholic is offered UCL only; a patron professor NPC
  exists with a +30 disposition edge; `player.patronArc` remains untouched (null).
- Sponsorship lifecycle: skipping two years (or dropping patron disposition below 0)
  revokes it permanently — the next class-load popup charges UCL-table tuition even at
  Oxford; graduating while active grants the £10 gift and pride milestone.
- BA at 400 progress graduates after 4 standard years (or e.g. 6 mixed years); milestone +
  `player.degrees` updated; panel progress bar tracks correctly.
- Theology only offered at Oxford; BSc only at UCL.
- No references remain to `EDUCATION_LADDER`, tracks, `licentiate`, `doctorate`,
  `baccalaureate` stages (search), and the game boots clean.

---

## Phase 3 — Career Catalog Replacement

**Goal**: replace `src/data/careers.js` with the social-class catalog below; add the
requirements engine, £ pay, and yearly salary; reconcile NPC assignment/promotion.

### 3.1 New career schema

```js
{ id, label,                        // single Victorian name; OR labelBySex: { M, F }
  socialGroup,                      // 'elite'|'rich'|'middle'|'poor'|'criminal'|'destitute'
  payTier,                          // 1–10, OR payTierRange: [min, max] (charisma-scaled)
  primary, secondary,               // stats — kept for NPC weighting + fit score
  npcOnly,                          // true → never in the player picker
  requirements: {                   // player gating only (see 3.3 for NPC handling)
    degrees, anyDegree, degreesAnyOf,
    educationStage,                 // 'primary'|'secondary' (completed at least)
    stats, statsAnyOf,              // { charisma: 40 } / [{ insight:20 },{ charisma:40 }]
    hobbySkills,                    // { tailoring: 40 } — reads player.hobbies levels
    fatherWealth,                   // father alive check NOT required; uses father.wealth
    sex,
  },
  yearlyEffects,                    // { hobbySkills: { metallurgy: 2 } } | { stdChance: 0.15 }
  rankLadder: [...],                // entry → peak
  workplace,                        // Phase 4 — include the data now, wire later
}
```

`SCHOOL_WORK_MIN_AGE` / `SCHOOL_WORK_HEALTH_COST_PER_YEAR` and the part-time-while-in-school
rules carry over unchanged.

### 3.2 Pay

```js
export const PAY_TIER_MAX = { 1:10, 2:25, 3:50, 4:85, 5:150, 6:300, 7:550, 8:700, 9:1000, 10:4000 };
```

- `annualPay(person) = round(tierMax × (0.5 + 0.5 × rank / (rankLadder.length − 1)))`
  (single-rank ladders pay full tierMax).
- `payTierRange` careers (Merchant 3–6, Performer 2–6, Courtesan 2–8): interpolate the
  effective tierMax between `PAY_TIER_MAX[min]` and `PAY_TIER_MAX[max]` by
  `effectiveCharisma / 100` **before** the rank curve.
- **Player salary**: in `runYearTick`, after `tickCareerProgression`, if the player has a
  career: `addMoney(player, annualPay(player))` + annals line
  `"Your year's wages: £N."` NPCs do not receive money (they keep wealth gravity).
- `careerWealthTarget` (NPC gravity) rewritten: `target = clamp(payTierEff × 9, 5, 95)`
  plus the existing small rank bonus and retirement dip. Delete `wealthTierLabel`'s
  dependence on careers if circular; keep the label function (HUD uses band labels from
  Phase 1 for the player).

### 3.3 NPC assignment & progression

- `pickCareerForNPC`: filter to non-`playerOnly` careers (there are none; `npcOnly` ones
  **are** eligible), enforce `requirements.sex` and any age floor for NPCs, and keep the
  primary/secondary stat weighting. Add a **class-match multiplier**: ×3 weight when the
  NPC's wealth band (Destitute ≤5, Poor ≤25, Middle ≤50, Rich ≤75, Elite >75 — matching
  `wealthTierLabel`) matches the career's `socialGroup` (criminal group matches
  destitute/poor bands at ×1.5).
- Degree-gated careers for NPCs: NPCs don't hold degrees — approximate: only assignable
  when NPC `education.stage === 'completed'` and `wealth ≥ 50`.
- **Dowager special-case**: requires `sex: 'F'`, age ≥ 45, and a deceased spouse
  (`spouseIds`/`exSpouseIds` resolves to a dead person). Check in `pickCareerForNPC`'s
  filter.
- NPC promotion: keep `progressCareerOneYear` exactly as is (fit score, 10-year cadence,
  demotion) — it only needs `primary`/`secondary`/`rankLadder`, all retained. **The player
  is removed from this path in Phase 4** (until then the player keeps using it — fine for
  one phase).
- `assignEarlyCareerToNPC` / `schoolCompatible`: mark these careers `schoolCompatible: true`:
  dockworker, sailor, house_servant, baker, artisan, blacksmith, factory_hand, farmhand,
  street_sweeper, bone_grubber, beggar, fisherman.

### 3.4 Player picker UI (`renderVocation` in `legacy.js`)

- Reorganize the category chips into social groups: **Elite / Rich / Middle Class / Poor /
  Criminal** (npcOnly careers never render).
- Career cards show: pay (entry £ → peak £), requirement lines (met in green / unmet in
  red — degree names, stat thresholds, hobby levels, "Father's Wealth 80", education), and
  lock state from the requirements engine.
- Confirm modal: replace "Expected Wealth" with "Starting Pay £N / year (peak £M)".

### 3.5 Player career catalog

| id | label | group | pay | requirements | yearly effects | rank ladder |
|---|---|---|---|---|---|---|
| barrister | Barrister | elite | 9 | degree law | — | Pupil, Junior Barrister, Barrister, King's Counsel |
| clergy | Clergyman | elite | 8 | degree theology | — | Curate, Parson, Vicar, Bishop |
| physician | Physician | elite | 9 | degree medicine | — | Resident, Physician, Senior Physician, Royal Physician |
| diplomat | Diplomat | rich | 6 | anyDegree + charisma 40 | — | Attaché, Diplomat, Senior Diplomat, Ambassador |
| foreign_agent | Foreign Discretionary Agent | rich | 7 | anyDegree + cunning 40 + charisma 40 | — | Asset, Agent, Senior Agent, Spymaster |
| gentry | Gentry | rich | 6 | fatherWealth 80 | — | Inheritor, Established, Patriarch/Matriarch |
| engineer | Engineer | rich | 6 | degree bsc | — | Draughtsman, Engineer, Chief Engineer |
| banker | Banker | rich | 6 | anyDegree | — | Clerk, Banker, Manager, Partner |
| antiquarian | Antiquarian | rich | 6 | degreesAnyOf [ba, liberal_arts] | — | Assistant, Antiquarian, Renowned Antiquarian |
| blacksmith | Blacksmith | middle | 4 | educationStage secondary | +2 metallurgy | Apprentice, Journeyman, Master Smith |
| house_servant | House Servant | middle | 4 | charisma 30 | — | Scullery, Servant, Head of Staff |
| butler_maid | labelBySex { M: Butler, F: Maid } | middle | 3 | educationStage secondary | — | Junior, Butler/Maid, Head Butler/Housekeeper |
| artisan | Artisan | middle | 4 | educationStage secondary | — | Apprentice, Artisan, Master Artisan |
| tailor | Tailor | middle | 4 | hobbySkills tailoring 40 | +2 tailoring | Apprentice, Tailor, Master Tailor |
| schoolmaster | Schoolmaster | middle | 6 | anyDegree | — | Assistant, Schoolmaster, Senior Master, Headmaster |
| alchemist | Alchemist | middle | 6 | hobbySkills alchemy 15 | — | Student, Practitioner, Adept, Master |
| merchant | Merchant | middle | 3–6 (cha) | educationStage secondary | — | Trader, Merchant, Established Merchant, Magnate |
| baker | Baker | middle | 4 | educationStage primary | — | Hand, Baker, Master Baker |
| medium | Medium | middle | 4 | statsAnyOf [insight 20, charisma 40] | — | Novice, Medium, Sought-after |
| dockworker | Dockworker | poor | 3 | — | — | Casual Hand, Dockworker, Foreman |
| sailor | Sailor | poor | 3 | — | — | Deckhand, Sailor, Mate, Captain |
| soldier | Soldier | poor | 3 | — | — | Private, Corporal, Sergeant, Lieutenant, Captain |
| performer | Performer | poor | 2–6 (cha) | charisma 50 | +2 performance | Busker, Performer, Celebrated, Legend |
| courtesan | Courtesan | poor | 2–8 (cha) | charisma 40 | stdChance 0.15 | Newcomer, Notable, Celebrated, Legend |
| constable | Constable | poor | 3 | prowess 30 | — | Recruit, Constable, Sergeant, Inspector |
| fisherman | Fisherman | poor | 3 | hobbySkills angling 20 | +2 angling | Deckhand, Fisherman, Boat Owner |
| poacher | Poacher | criminal | 5 | hobbySkills hunting 15 | +2 hunting | Snarer, Poacher, Master Poacher |
| river_pirate | River Pirate | criminal | 5 | — | — | Deckhand, Cutthroat, Quartermaster, Captain |

Stat pairs (`primary`/`secondary`) — assign sensibly: physical labor prowess/health;
charm careers charisma/insight; scholarly intelligence/insight; criminal cunning/prowess;
merchant/banker wealth-free now → use charisma/intelligence (the old `wealth`-as-stat
weighting is dropped since the player has no wealth stat; NPCs: use charisma/cunning for
merchant-likes).

- `yearlyEffects.hobbySkills`: apply in the year tick via the hobbies system's level-add
  helper (`sim/hobbies.js`) — player only.
- `stdChance` (Courtesan): 15%/yr roll in the player's career tick → health −15
  (clamped), annals bad entry "You have contracted a disease." Leave a `// HOOK:` comment
  for the future disease system.

### 3.6 NPC-only catalog

| id | label | group | pay | NPC requirements | ladder |
|---|---|---|---|---|---|
| street_sweeper | Street Sweeper | destitute | 1 | — | Sweeper |
| bone_grubber | Bone Grubber | destitute | 1 | — | Grubber |
| beggar | Beggar | destitute | 1 | — | Beggar |
| factory_hand | Factory Hand | poor | 2 | — | Hand, Senior Hand, Foreman |
| farmhand | Farmhand | poor | 2 | — | Farmhand, Senior Hand |
| clerk | Clerk | middle | 4 | sex M | Junior Clerk, Clerk, Senior Clerk |
| workhouse_manager | Workhouse Manager | middle | 5 | sex M, age ≥ 30 | Overseer, Manager |
| shopkeeper | Shopkeeper | middle | 4 | — | Assistant, Shopkeeper, Established |
| tollgate_keeper | Toll-Gate Keeper | middle | 3 | sex M | Keeper |
| magistrate | Magistrate | rich | 8 | sex M, age ≥ 35 | Magistrate, Senior Magistrate |
| landholder | Landholder | rich | 8 | sex M, age ≥ 30 | Landholder |
| estate_manager | Estate Manager | rich | 6 | sex M | Under-Steward, Estate Manager |
| dowager | Dowager | rich | 7 | sex F, age ≥ 45, widowed | Dowager |

### 3.7 Cleanup

- Delete `nameByEra`, `eras`, `startAge`, `prestige`, `requiresDegree`, `category` fields
  and every consumer (`careerName` era lookup → simple `label`/`labelBySex`; the prestige
  dots in the picker/modal → replace with the pay line; `currentEra` imports from career
  code). Grep for `requiresDegree`, `nameByEra`, `prestige` and clear all hits in career
  paths (era system itself stays for prison flavor etc.).
- Remove the Phase-2 `playerHasDegree` legacy shim; the requirements engine reads
  `player.degrees` directly.
- Retired career ids on save load: not an issue (schema 30 saves post-date this if phases
  ship together); if a schema-30 save from Phase 1/2 loads with an old career id, clear the
  NPC's career and let next tick reassign.

### Phase 3 acceptance checks

- Picker shows five class groups; requirements render met/unmet correctly (test: no degree
  → Barrister locked; tailoring 40 via hobby → Tailor unlocked).
- Joining Merchant with charisma 50 yields starting pay ≈ round(lerp(50, 300, 0.5) × 0.5).
- Year tick pays wages into the purse with an annals line; Blacksmith year adds +2
  metallurgy.
- New game NPC world: destitute NPCs end up sweepers/grubbers/beggars, rich male NPCs
  magistrates/landholders, at least one widowed older woman can roll Dowager; no NPC holds
  an npcOnly-violating career (female clerk, young magistrate).
- No references to removed fields; game boots and NPC promotions still log for journaled
  NPCs.

---

## Phase 4 — Workplace, Bosses & Player Promotion

**Goal**: joining a career generates a workplace (boss/coworkers/peers); the player
promotion loop becomes boss-disposition + promotion-progress; Work Hard and the 5 AP
career upkeep land.

### 4.1 Workplace data (per career — added to the catalog in Phase 3, wired here)

```js
workplace: {
  type: 'hierarchical' | 'solo' | 'crew',
  coworkers: [min, max],            // hierarchical/crew
  grandBoss: 'Master of the House', // optional flavor superior (hierarchical only)
  peers: [ { role: 'Fish Merchant' }, ... ],  // solo only, 1–3 custom to the career
}
```

Assignments:

- **hierarchical**: barrister (coworkers [2,3], grandBoss "Head of Chambers" → actually
  make the direct boss "Head of Chambers"; no grandBoss), clergy ([1,2], grandBoss
  "Bishop"), physician ([2,3]), diplomat ([2,3], grandBoss "Ambassador"), foreign_agent
  ([0,1] — a handler-boss, near-solo), engineer ([2,3]), banker ([2,4]), antiquarian
  ([1,2]), blacksmith ([1,2]), house_servant ([2,4], grandBoss "Master of the House"),
  butler_maid ([2,4], grandBoss "Master of the House"), artisan ([1,2]), tailor ([1,2]),
  schoolmaster ([2,3], grandBoss "Board of Governors" — represent as a single NPC),
  baker ([1,2]), dockworker ([3,5]), soldier ([4,5]), constable ([2,4]).
- **crew**: river_pirate ([3,5], boss title "Captain"), sailor ([3,5], boss "Captain").
  Mechanically identical to hierarchical; `type:'crew'` is a marker for the future
  suspicion/crime system (leave `// HOOK: crime system` comments where crew-specific
  events would attach).
- **solo** (+ custom peers): merchant (peers: Warehouse Owner, Rival Merchant), fisherman
  (peers: Fish Merchant, Old Deckhand), medium (peers: Grieving Patron, Skeptical
  Journalist), alchemist (peers: Apothecary Supplier), performer (peers: Theatre Manager,
  Rival Performer), courtesan (peers: Wealthy Patron, Rival), poacher (peers: Fence,
  Gamekeeper — hostile flavor), gentry (peers: Estate Steward, Society Rival).

### 4.2 Workplace generation (`src/sim/workplace.js`, new — model on `schoolCohort.js`/`schoolStaff.js`)

- `G.workplace = { careerId, bossId, grandBossId, coworkerIds: [], peerIds: [], isBoss: false }`
  (null when the player has no career). Persisted in saves like `G.school`.
- On player career join (`commitPlayerCareer`): generate via the npc-generation helpers
  (`npcFamilyGen.js` patterns): boss age 35–55, stats skewed toward the career's
  primary stat, same career at `rank = player.rank + 1` (capped at top); coworkers within
  `coworkers` range, ages 18–50, same career at rank 0–1; solo peers get the `role` string
  stored on the workplace entry (they keep whatever career fits or none — role is display
  flavor). All get relationship edges to the player (neutral disposition, small random
  spread) and are interactable like any NPC.
- On leaving a career, generation change, or death: clear `G.workplace` (people persist in
  `G.people` as ordinary NPCs).

### 4.3 Player promotion loop (replaces `progressCareerOneYear` for the player only)

- `player.career = { id, since, rank, promotionProgress: 0 }` (drop `yearsAtRank` for the
  player). NPCs keep the old shape and the old function.
- **Work Hard**: button on the career detail panel. Cost **5 AP**, effect
  `promotionProgress += 5` (cap 100), unlimited uses per year. Uses
  `spendActionPoints(player, 5)`.
- Yearly check (player branch of `tickCareerProgression`): read boss disposition from the
  relationship edge (solo careers: no boss → threshold 100):
  - disposition > 50 → promote when `promotionProgress ≥ 50`
  - disposition 0–50 → promote when `promotionProgress ≥ 100`
  - disposition < 0 → promotion impossible (UI shows "Your superior blocks your path.")
- On promotion: `rank += 1`, `promotionProgress = 0`, annals entry with new rank + new
  £ pay, **regenerate the boss** (old boss departs or becomes a peer-coworker — pick
  randomly; fire a small annals line either way). Passive drift: +5 promotionProgress per
  year worked (so promotion is reachable without Work Hard, slowly).
- **Becoming the boss** (hierarchical/crew at top rank): remove the boss, set
  `G.workplace.isBoss = true`, coworkers remain as subordinates, promotion bar hidden,
  pay = full tierMax. Annals: "You now run the {workplace}." Leave `// HOOK: elite career
  upgrades` for the future Constable→Royal Guard style content.
- UI: career detail panel shows salary, rank ladder position, **Promotion Chance** bar
  (`promotionProgress`%, the disposition math stays hidden per the design doc), Work Hard
  button (disabled < 5 AP), and boss/coworker cards reusing the person-card/relationship
  affordances (clickable → person modal).

### 4.4 Career upkeep

- In `runYearTick`, immediately after `refreshActionPoints(player)`: if the player has a
  career, deduct **5 AP** (floor 0). This is the "maintain any career" cost — annals-silent
  (visible AP just starts at 15). Applies at university too; combined with standard
  classes (15 AP) that's a full year — intended.

### Phase 4 acceptance checks

- Joining Soldier spawns 1 boss (rank 1 title) + 4–5 coworkers, all interactable with
  relationship bars; joining Fisherman spawns Fish Merchant / Old Deckhand peers, no boss.
- New year with a career: AP shows 15/20 after refresh.
- Work Hard: 5 AP → bar +5%; at disposition 60 and bar 50%, next year tick promotes; at
  disposition −10, no promotion at any bar value.
- Promotion regenerates the boss and resets the bar; reaching top rank sets isBoss,
  removes the boss card, hides the bar.
- Save/load round-trips `G.workplace` and `promotionProgress`.

---

## Out of scope (explicitly deferred — do not build)

- Career events (1–2 per career), sailor marooning, soldier events, schoolmaster
  opportunities, elite career upgrades (Constable → Royal Guard etc.) — future content.
- Suspicion/crime system (crew hooks only here) — now specced separately in
  `Criminal_System_Plan.md`; execute it after Phase 4 of this plan.
- Disease system (Courtesan STD is a flat health hit + annals for now).
- Living expenses / cost-of-living — salary is pure income this pass.
