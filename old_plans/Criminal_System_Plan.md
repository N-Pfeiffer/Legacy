# Criminal System — Implementation Plan

Execution model: **feed one phase per Composer session**, same as
`Careers_HigherEd_Implementation_Plan.md`. Read that plan's *Context Primer* first — it
covers the architecture (state, year tick, situations, AP, saves). This doc only adds
what's crime-specific.

**Prerequisite**: the Careers & Higher Ed plan through Phase 4 (money economy, new career
catalog, workplace/boss system). Phase A below also resolves the standing TODO at
`src/sim/hunting.js` (~line 129): `witnessChance` → *"roll consequence when crime/bounty
system exists."*

### Locked design decisions

1. **One meter only**: Suspicion (the law's interest in you). No underworld
   notoriety/infamy meter — criminal *skill* progression already lives in the Thieving
   hobby, Stalking, and the criminal careers.
2. **No succession handling.** Player death ends the run today (`killPerson` disables
   age-up), so there is no suspicion-on-succession rule to build — do not write one. No
   family-name mechanics. If heir-succession gameplay ever lands, decide then.
3. **Victims are real NPCs** drawn from the whole living world pool. Every **targeted**
   crime against a person — Thieving jobs (B), assassination contracts (C) — fires a
   **pre-crime choice event** revealing the mark (name + relationship context) with a
   Proceed / Back Out choice. Backing out while employed in a criminal career costs
   standing with the boss and crew. *Clarification*: opportunistic human prey on hunts
   (`moor_mortal`, `bandit_or_hunter` — anonymous creature entries, not `G.people`
   NPCs) gets **no reveal**; those are consequence-only per A.5. The reveal is for
   choosing a victim, not for encountering one.
4. **Stalking is the assassin's hobby**, not reconnaissance — stalking people and
   intelligent creatures. It gains a **Cunning gate** to align it with roguery, and its
   criminal expression (contracts, the quiet knife) lands in Phase C.
5. Hidden numbers, worded tiers — same philosophy as the careers plan's promotion bar.
   The player never sees the Suspicion value, only **The Watch's Eye** in words.
6. **Do not break saves.** The careers plan's schema-30 rejection was a one-off for the
   currency/education structural break; the standing policy from here on is **migrate,
   never reject**. All fields this plan adds (`suspicion`, `crimeLedger`, `G.magistrate`,
   the thieving hobby, `_casedDistrict`) get defaults via `PERSON_DEFAULTS` /
   `migratePerson` / load-time backfill. No `SAVE_SCHEMA` bump, no rejection — a
   schema-30 save from any careers phase loads cleanly into any crime phase.

---

## Phase A — Suspicion & The Watch

**Goal**: the shared consequence engine. Every criminal act in the game (now and future)
feeds one meter; the meter drives escalating attention, arrest, trial, gaol, and
transportation.

### A.1 State

- `PERSON_DEFAULTS`: `suspicion: 0` (0–100, player-only in practice) and
  `crimeLedger: []` — entries `{ year, type, severity, witnessed }`. Ledger is capped at
  the last 15 years (prune on tick); it exists for sentencing, not display.
- New module `src/sim/crime.js`:

```js
export function addSuspicion(player, n, { type, severity, witnessed } = {})
  // clamps 0–100, pushes a ledger entry when type is provided
export function suspicionTier(player)   // 'unnoticed'|'curious'|'watchful'|'warrant'
export function tickSuspicion(player)   // yearly decay + threshold events + arrest roll
export function ledgerSeverity(player)  // sum of severities in the last 10 years
```

### A.2 Tiers, decay, thresholds

| Suspicion | Tier | Label shown | Yearly effect |
|---|---|---|---|
| 0–24 | unnoticed | "Unnoticed" | — |
| 25–49 | curious | "The Watch is curious" | one-time `watch_questions` situation on entering tier |
| 50–74 | watchful | "The Watch is watchful" | **criminal rolls only** suffer −15 on the success roll — Thieving jobs (B.5) and assassination contracts (C.3); hunting, hobby endeavors, and all other checks are unaffected. Each year 20% chance of `watch_searches` situation (a constable turns out your rooms — if any hot goods (B.5) are held, they're confiscated and suspicion +10) |
| 75–100 | warrant | "A warrant is out" | yearly arrest roll: `chance = (suspicion − 70) / 80` (75 → ~6%, 100 → ~37%) |

- **Decay**: −10/year if **no suspicion was gained that year from any source**;
  −4/year otherwise. Passive career feeds count as "gained" — a Poacher year is never a
  clean year; holding the life keeps the Watch warm.
- **Passive career feed** (the crew-career scaling hooked in the careers plan Phase 4):
  Poacher +2/yr, River Pirate +4/yr, applied in `tickSuspicion`. Replace the
  `// HOOK: crime system` comments with these calls. **Passive feeds pass no `type` and
  therefore write NO ledger entry** — the ledger records acts, not lifestyle, so
  sentencing never counts quiet career years as crimes.
- **While incarcerated**: `tickSuspicion` must not run (prison years already tick via
  `tickPrisonYear`, not `runYearTick` — keep it that way). No decay, no threshold
  events, no warrant rolls: a prisoner cannot be re-arrested. Suspicion is settled at
  release, below.
- **On release from prison, any source** (crime, patron arc, anything future):
  `suspicion = min(suspicion, 20)` — served time cools heat, never raises it.
  Exception: transportation returns at **0** with the ledger cleared (A.4).

### A.3 UI — The Watch's Eye

Lives in the **HUD attributes sidebar, in the circumstances area directly under Purse**
(the same region that carries the wealth-tier label / prison state). Hidden until
suspicion has ever exceeded 0, then permanent for that character: an eye glyph and the
tier label only — never a number, never a bar. Tier transitions log an annals line
("You notice the same constable on your street two mornings running."). The Thieving
panel (B.6) echoes the same label; there is no Particulars card.

### A.4 Arrest & trial

Arrest (from the warrant roll, or scripted from a botched job) fires the blocking
`crime_trial` situation:

- **Evidence score** = `ledgerSeverity(player)`, **+3 flat** (never stacking) if any
  ledger entry with `witnessed: true` falls within the last **3 calendar years**
  (`G.year − entry.year ≤ 3`).
- **Defense math** (one roll, made when the player picks a defense):
  `defense = effectiveStat / 2 + d20 (+15 if a barrister is retained)`, acquitted when
  `defense ≥ DC = 20 + evidence × 2`. Petty charges charm away easily; a witnessed
  murder record (evidence 11 → DC 42) needs great stats, a barrister, or both — money
  buys justice, which is period-correct.
- Defense options (buttons; disabled where requirements unmet):
  - **Plead your character** (uses `effectiveCharisma`)
  - **Outwit the prosecution** (uses `effectiveCunning`)
  - **Retain a barrister** — costs £ = `10 × evidence score`; +15 to the roll (on top
    of either stat choice). If the player's own career is Barrister, the button becomes
    "Conduct your own defense" — free, same +15.
- Outcomes — conviction is **either/or by severity**, never stacked:
  - **Acquitted**: suspicion −30, annals.
  - **Convicted, `ledgerSeverity < 10`** → gaol:
    `incarceratePlayer(player, { years, source: 'crime' })`, with
    `years = clamp(round(ledgerSeverity / 2), 1, 7)`. Suspicion settled at release (A.2).
  - **Convicted, `ledgerSeverity ≥ 10`** → **transportation, always** (the gaol formula
    does not apply): a prison variant `source: 'transportation'`, fixed **7 years**, its
    own flavor ("the hulks at Woolwich, then the long passage south"). Release
    milestone: you return to London older, free, and forgotten — suspicion **0**, ledger
    cleared (this overrides the min(…, 20) release rule).
  - **The gallows** (capital ledger entries only — Phase C) overrides both. See C.4.

Trial flavor (1800s London):
> The Old Bailey smells of vinegar and unwashed wool. The judge does not look at you;
> the clerk reads the charges in a voice worn smooth by ten thousand repetitions.
> Twelve men who have never missed a meal will now weigh the worth of your word.

### A.5 Poaching — wildlife raids on the King's domain

**Framing (read this before implementing)**: "Poacher" the *career* and poaching the
*act* are different things that feed the same meter. The career (careers plan Phase 3)
is a job — income, yearly skill gain, and the passive +2/yr suspicion for living the
life; it never rolls hunts. The **act** of poaching is performed through the ordinary
Hunting hobby: under the Game Laws it is the *land*, not the hunter, that makes a hunt
illegal. Hunting in a royal-domain zone risks suspicion for **any** player — Poacher,
Baker, or Barrister alike. (This section also resolves the hunting.js `witnessChance`
TODO.)

**Zone assignments** (`data/huntingZones.js`):

- `the_moors` — **commons, stays clean** (no `royalDomain`). The starter zone's
  subsistence game (rabbits, sheep, pheasant) must remain legal — a farm boy hunting
  supper is not a criminal.
- `the_forest` — **`royalDomain: true`, zone-level**, with a zone-level
  `witnessChance: 0.10` applied to every **animal** hunt there. All game in the King's
  forest is protected — the rabbit as much as the Great White Stag (historically
  accurate: commoners were transported for less). Per-creature `witnessChance` may
  override the zone default where wanted, but no per-creature flags are needed.
- `the_deep_weald` — **not royal domain**. No gamekeeper walks where werewolves den;
  the danger is the deterrent, and the supernatural endgame stays clear of the mundane
  crime loop. No suspicion from Deep Weald hunts.

**Animal poaching consequence** (royal-domain zones, animal creatures only): a
triggered witness roll calls
`addSuspicion(player, 8, { type: 'poaching', severity: 1, witnessed: true })` and the
hunt message appends *"A gamekeeper saw you — and gamekeepers talk."*

**Human prey is murder, not poaching.** `moor_mortal` (existing `witnessChance: 0.08`)
and `bandit_or_hunter` (add `witnessChance: 0.05` — deeper cover than the open moor)
are people; killing them uses Phase C's kill consequences regardless of zone, and the
zone's poaching rules never apply to them:

- Unwitnessed: suspicion +10, ledger `{ type: 'murder', severity: 8 }` — the moor keeps
  its secrets, but a body is a body.
- Witnessed: suspicion +25, ledger `{ type: 'murder', severity: 8, witnessed: true }` —
  capital exposure once C.4 lands; until then these entries simply behave as high
  severity (transportation tier), which is correct interim behavior.

### A.6 The Magistrate — a bribe, and a relationship (Decisions tab)

Implements the long-standing `Legacy_ToDo.txt` item *"Decision: Bribe a local
Magistrate. Money to lower suspicion."* This is deliberately more than a money-for-meter
button: the magistrate is a **persistent, narratively load-bearing NPC**.

**Household generator.** Use `generateAdultWithHousehold` from `sim/npcFamilyGen.js` —
specced in the careers plan (section 2.4b, reused in 4.2) per its locked decision #7:
*important NPCs get households*, because families are where the story hooks live
(blackmail, leverage, courtship, grief). **Build scope**: whichever phase reaches this
first builds the helper to that spec (focal adult + spouse, opposite sex, age ±2–8,
married + 1–3 children aged `focal.age − randInt(20, 38)`, all pushed to `G.people`,
all ordinary interactable NPCs) — and then wire it into **every important-NPC
generation path that exists in the codebase at that time** (university patron, workplace
bosses, this magistrate), not just the magistrate. No save-level retrofit: an
already-generated singleton NPC in an existing save keeps no family; households attach
at generation time only.

**World state**: `G.magistrate = { personId, lastBribeYear, bribeCount }`, null until
first approached. If the magistrate has died when the decision is next used, generate a
successor (new household, fresh relationship — prior investment is lost):
*"The old magistrate is in the ground, and a new man holds the bench. Whatever
understanding you had is buried with him."*

**Decision entry** (`buildDecisions()` in `data/decisions.js`, mudlark pattern):

```js
{ id: 'approach_magistrate', title: 'Approach the Magistrate',
  eligible: (p) => p.isAlive && p.age >= 18 && !isInPrison(p) && suspicionTier(p) !== 'unnoticed',
  popup: 'magistrate_bribe' }
```

**The popup** (decision-popup pattern; 1 AP). First approach generates the NPC +
household and uses the introduction body; later approaches vary by his disposition.

First approach:
> They say Magistrate {surname} dines alone at the Grey Boar every Thursday, at the
> corner table with his back to the wall. They say he has a wife who wants a house in
> the country, a son at Cambridge, and a daughter in want of a dowry. They say many
> things about what a man in his position must weigh. You have coin enough to be worth
> weighing.

Repeat, disposition > 50:
> {firstName} {surname} greets you these days almost as a friend — which is to say, he
> lets you buy the wine before either of you mentions money.

Repeat, disposition < 0:
> The magistrate's clerk keeps you waiting an hour, and the great man does not rise
> when you enter. This will cost you, if he consents to be bought at all.

**Bribe mechanics** (base cost by current tier — curious **£8** / watchful **£20** /
warrant **£50**; each bribe within the last 5 years multiplies cost ×1.5, tracked via
`bribeCount`/`lastBribeYear`):

- **A modest purse** — base cost. Suspicion −15. Magistrate disposition +3.
- **A heavy purse** — base ×2.5. Suspicion −30. Disposition +8.
- **Withdraw** — no cost beyond the AP.

Relationship modifiers (he's a real NPC — dinners, gifts, and interactions move him like
anyone else):

- Disposition > 50: costs −25%, and each bribe clears an extra −5 suspicion (friends are
  discreet).
- Disposition < 0: he **refuses**; AP lost, suspicion +5 (*"a clumsy approach, noted in
  the wrong ledgers"*).
- Bribing at `warrant` tier carries a 15% refusal risk regardless of disposition — some
  heat is too public even for him.

**Trial synergy** (extend A.4): if the player has bribed this magistrate at least once
and his disposition > 25, the trial gains a defense button — **"A quiet word with an old
friend"** — costing £ = `15 × evidence score`. On success (automatic if disposition
> 50, else a Charisma check), the verdict improves by exactly **one step** on this map
(one application per trial):

- would-be **transportation** → gaol via the standard `< 10` formula (clamped 1–7);
- would-be **gaol of 3+ years** → years halved, rounded down (min 1);
- would-be **gaol of 1–2 years** → acquittal.

Never available for capital charges (C.4) — *no one hangs beside you for friendship.*

`// HOOK: blackmail` — leave a comment where his household is generated: the wife, the
Cambridge son, and the dowryless daughter exist precisely so a future
blackmail/leverage system has somewhere to bite.

### Phase A acceptance checks

- Committing no crimes: suspicion stays 0, no Watch's Eye card renders.
- Ledger prunes to 15 years; decay −10 clean years / −4 active years verified.
- A Poacher who commits no acts: suspicion +2 then −4 each year (net −2), and the
  ledger stays **empty** — passive feeds never add entries.
- At `watchful`, a Thieving roll is −15 but a royal-domain hunt's odds are unchanged.
- Tier transitions fire their situations exactly once per entry into the tier.
- While imprisoned: no decay, no threshold events, no warrant roll (no re-arrest);
  a crime-source release at suspicion 80 exits at 20, a patron-arc release at 5 stays 5.
- At suspicion 100, arrest fires within a few years; trial buttons gate correctly
  (barrister costs £, own-career-barrister free); conviction with ledgerSeverity 9 →
  gaol via the formula, with 10 → 7-year transportation (never gaol), returning at
  suspicion 0 with a cleared ledger.
- Loading a schema-30 save from before this phase backfills suspicion 0 / empty ledger
  and boots clean — no save rejection anywhere in this plan.
- Forest hunts (any animal, rabbit included) can trigger the gamekeeper line and +8
  poaching suspicion; Moors and Deep Weald animal hunts never do.
- Killing a `moor_mortal` adds a severity-8 murder ledger entry even unwitnessed
  (+10 suspicion); witnessed rolls +25 and flag `witnessed: true`;
  `bandit_or_hunter` behaves identically with its own 5% witness chance; neither ever
  produces a 'poaching' entry.
- Magistrate decision appears only at suspicion tier curious+; first use generates him
  with spouse and children, all present in `G.people` and interactable; bribe math
  (tier base, ×1.5 repeat escalation, disposition discount/refusal) verified; his death
  produces a successor with a fresh relationship; a befriended, previously-bribed
  magistrate unlocks the "quiet word" trial defense, and never on capital charges.
- Quiet-word step-down: severity-12 conviction lands as gaol (formula) instead of
  transportation; a would-be 2-year gaol term acquits; only one step per trial.
- The magistrate arrives with spouse and children even if the careers plan's household
  helper didn't exist yet (built here in that case), and any patron/boss generation
  paths present in the codebase are rewired to use it.

---

## Phase B — The Thieving Hobby

**Goal**: the player-facing criminal loop — districts, real NPC victims, the pre-crime
choice, loot, and the fence.

### B.1 Hobby definition (`data/hobbies.js`) — hidden until the player falls into crime

```js
{ id: 'thieving', label: 'Thieving', icon: '🗝️',
  description: 'Pockets, locks, and ledgers — relieve London of what it will not miss.',
  tags: ['gathering'],
  hidden: true,    // NEW flag: invisible (not merely locked) until unlocked
  endeavors: [],   // jobs run through the district UI, hunting-zones style
}
```

- **Engine change**: `hobbiesVisibleToPlayer` / `unlockedHobbies` in `sim/hobbies.js`
  must treat `hidden: true` hobbies as **absent** — no greyed card, no unlock hint —
  unless the player's `crimePath` flag is set. (A hint like "Requires: commit crimes"
  would break the fiction; the hobby simply doesn't exist until the player's life
  produces it.)
- **`player.crimePath`** (add to `PERSON_DEFAULTS`, default `false`; save backfill:
  `true` if suspicion > 0, a criminal career is held, **or the player has
  `marked_by_rookeries`**. Backfill unlocks **silently** — no `the_trade_opens` popup
  on load; someone already marked by the Rookeries needs no epiphany — but
  `thievingUnseen` is still set so the pulse leads them to the hobby). Once `true`,
  permanent. Set by ANY of these doors:
  1. **The law's attention** — the first time suspicion rises above 0, from any source
     (a witnessed poach, a passive criminal-career year).
  2. **The empty purse** — at year end, age ≥ 12 and `money === 0`. **Timing**: this
     check runs at the very end of `runYearTick`, after salary is paid and the 5 AP
     career upkeep is applied — "broke at year end" means payday couldn't save you; a
     player rescued by wages is not flagged. Poverty teaches the trade; a destitute
     childhood finds it almost immediately.
  3. **The wrong crowd** — gaining `marked_by_rookeries`, or joining a career with
     `socialGroup: 'criminal'`.
  4. **The victim's education** — new low-weight player event (`data/playerEvents.js`,
     age 12+, weight ~4): your pocket is dipped in a market crowd, `money −£1..3`
     (floor 0), log: *"A dip took your coin in the crowd at Covent Garden. You spent
     the walk home reconstructing exactly how it was done."* Sets `crimePath`. This is
     the catch-all door — any player, any class, eventually.
- **The unlock moment**: when `crimePath` first flips, fire a one-time situation,
  `the_trade_opens` — otherwise the hobby appears silently and no one notices:
  > You have seen how it is done, now. The lifted latch, the sleeve that swallows a
  > watch, the crowd that closes like water behind a dip. London has been teaching you
  > all along; the only question left is whether you were taking notes.
  One button ("So it is") — pure announcement, no choice. Thieving then appears in the
  hobby list as if it had always been there.
- **New-hobby attention pulse**: when `crimePath` flips, also set
  `player.thievingUnseen = true`. While set: the Thieving hobby card gets the pulsing
  attention treatment (reuse the existing `has-pending` class/pattern the section tabs
  and situation cards already use — see `renderGameHud`'s badge wiring), and the pulse
  propagates up so the player is led to it: **Particulars section tab → hobbies area →
  the Thieving card**. Cleared the first time the player opens the Thieving hobby
  (clicks its card), never re-set.

Age-gated to 12+ by the existing hobby age rules (not in `HOBBIES_CHILDHOOD`).

### B.2 Districts (`data/thievingDistricts.js`, modeled on `huntingZones.js`)

| District | Skill req | AP | Job | Base take | Hot-goods chance | Suspicion (clean / witnessed) |
|---|---|---|---|---|---|---|
| The Rookeries | 0 | 1 | pickpocketing | £1–3 | — | +2 / +6 |
| The Docks | 15 | 2 | cargo pilfering | £3–8 | 25% | +4 / +10 |
| Mayfair | 35 | 2 | housebreaking | £8–20 | 60% | +8 / +16 |
| The Strand | 60 | 3 | the cracksman's art | £25–60 | 80% | +12 / +22 |

Severity for the ledger: 1 / 2 / 3 / 5 respectively.

### B.3 Victim selection — the whole world is the pool

On starting a job: pick a living NPC (`!isPlayer`, age ≥ 14) weighted toward the
district's wealth band (Rookeries → Destitute/Poor, Docks → Poor/Middle, Mayfair →
Rich/Wealthy, Strand → Rich/Wealthy institutions' officers — bankers, magistrates).

- **No exclusions, none.** Spouse, children, parents, boss, coworkers, school staff, the
  magistrate himself — anyone in the pool can come up. The pre-crime reveal (B.4) is the
  player's protection, not a blacklist.
- If no NPC fits the band, fall back to an anonymous stranger — and **still show the
  pre-crime reveal** with "a stranger to you" (one code path, and the who-will-it-be
  beat plays every time).

### B.4 The pre-crime choice event (fires for EVERY crime against a person — B, and C)

**AP timing**: AP is spent the moment the player starts the job (clicks the district's
job button), *then* the reveal fires. Backing out never refunds it — the nights spent
casing the place are gone either way.

Before the job resolves, a blocking situation reveals the mark:

> You've watched the house for three nights. Tonight the servants' door will be left on
> the latch. But crossing the lamplight you finally see the owner's face — **{name}**{,
> your wife's brother / , whom you drink with on Sundays / — a stranger to you}.

Show the relationship context (kinship label if related; disposition/intimacy summary if
an edge exists; "a stranger" otherwise). Buttons:

- **Proceed** — job resolves (B.5).
- **Back out** — AP already spent stays spent (you cased the place); no suspicion, no
  ledger entry. **If the player holds a criminal career** (`socialGroup === 'criminal'`
  — exactly Poacher and River Pirate; Courtesan is `poor`, since prostitution itself was
  not illegal in 1800s England): boss disposition −10, each coworker −5, annals: *"Word
  gets round the crew that your nerve failed at the door."*

### B.5 Job resolution

- Success roll: `thieving skill + effectiveCunning/2 + casedBonus (C.2) + d20` vs district
  difficulty; `watchful`+ tiers apply a flat −15 to the roll (A.2).
- **Clean success**: £ take via `addMoney` (scaled ×1.5 if the victim's wealth band
  exceeds the district's expectation), roll hot goods, suspicion (clean column), victim
  NPC `wealth −= 3..8`, skill +0.5 (`addHobbySkill`).
- **Success, witnessed**: as above, suspicion (witnessed column), ledger `witnessed:
  true`, and the victim (if not a stranger) knows: disposition with victim −40.
- **Failure**: nothing gained, suspicion (witnessed column), and the ledger entry for
  the failed job is written first; then 30% chance of immediate `crime_trial` (A.4).
  **The trial always uses the full `ledgerSeverity`**, not just this job — the court
  hears the man's whole record, as it did in 1800. Otherwise you fled — health −5
  scramble over the rooftops.
- **Hot goods**: new stolen items in `data/items.js` (category `material`,
  `hotGoods: true`, `fenceValue`): gentleman's pocket watch (£8), silver candlesticks
  (£12), lady's brooch (£6), silver plate (£15), banknote bundle (£20 — the Strand only).
  They render in the Items grid with a visual "hot" flag (small red corner tag) and are
  confiscated by `watch_searches` (A.2). Two ways to move them:
  - **The fence** (safe): see below.
  - **Pass it off** (the con): an action on the item — take it to an honest pawnbroker
    and claim provenance. Charisma check: `effectiveCharisma / 2 + d20 ≥ 28`. Success →
    full `fenceValue` and an annals line: *"You dabbed your eye and spoke of your late
    grandmother until the pawnbroker paid full price for the 'family heirloom.'"*
    Failure → he shows you the door and suspicion +4 (*"pawnbrokers talk to
    constables"*). Riskier than the fence but pays 2.5× — the charm build's crime
    niche.
- **The fence**: "Visit the Fence" action on the Thieving panel (1 AP) — converts all
  held hot goods to £ at **40%** of `fenceValue`. If the player has the
  `marked_by_rookeries` trait, the syndicate *is* the fence: 55% rate, but a 15% yearly
  chance they demand a job (a syndicate-flavored pre-crime event; backing out of THAT
  costs suspicion +5 — they make sure the Watch hears your name). This
  `syndicate_fence_job` is a **new, separate template** — do not merge it with the
  existing `syndicate_searches` / `syndicate_collects` debt arc in
  `rookeriesSituations.js`; it fires only in years the debt arc's `syndicate_collects`
  did not, and only once the player has actually used the syndicate as fence (business
  before errands).

### B.6 UI

Thieving panel follows the hunting panel pattern: district cards with skill locks, job
button, fence button, and the Watch's Eye tier echoed at the top of the panel (the one
place besides Particulars it shows).

### Phase B acceptance checks

- Thieving is invisible (no card, no hint) for a comfortable middle-class law-abiding
  character; it appears after exactly one of: first suspicion gain, a £0 year-end at
  12+, `marked_by_rookeries`/criminal career, or the pickpocket-victim event — each
  accompanied by `the_trade_opens`, exactly once, ever.
- On unlock, the Particulars tab and the Thieving card pulse until the card is first
  clicked; the pulse never returns afterward (including across save/load while unseen —
  `thievingUnseen` persists).
- Poverty door: a player at £0 mid-year whose salary lands at year end is NOT flagged;
  one who ends the tick at £0 (after salary and upkeep) is.
- Loading an old save with `marked_by_rookeries` and 0 suspicion: Thieving is visible
  and pulsing, but no `the_trade_opens` popup fires on load.
- Once visible: districts lock/unlock by skill as normal; `crimePath` survives
  save/load and never un-sets.
- Every job fires the pre-crime reveal — including anonymous strangers; kin, boss,
  coworkers, and school staff can all be drawn (no blacklist anywhere); AP is gone
  whether you proceed or back out.
- Backing out dings boss/coworkers only for Poacher/River Pirate; a Courtesan backs out
  free.
- Clean vs witnessed suspicion deltas match the table; victim disposition −40 on
  witnessed success against a known NPC.
- Hot goods flow: rendered with the hot flag → confiscated by a watch search, fenced at
  40% (55% rookeries), or passed off at full value on a successful charisma con
  (failure adds +4 suspicion and logs the pawnbroker line).
- `syndicate_fence_job` never fires in a year `syndicate_collects` fired, and never
  before the player has fenced with the syndicate.
- A failed job writes its ledger entry before the 30% trial roll, and that trial uses
  the full ledger.

---

## Phase C — Stalking, the Assassin's Craft

**Goal**: reframe Stalking as the predator's hobby (per design), gate it with Cunning,
and give it its criminal expressions: casing marks and killing them.

### C.1 Cunning gate (`data/hobbies.js` + `sim/hobbies.js`)

- Stalking `requires` becomes
  `{ all: [ { hobbyId: 'hunting', level: 50 }, { stat: 'cunning', level: 20 } ] }`.
- **Engine change**: `checkHobbyRequirement` / `formatRequirementPart` /
  `collectPrerequisiteIds` in `sim/hobbies.js` currently understand only
  `hobbyId`/`skill` parts — add a `{ stat, level }` part type reading
  `effectiveStat(player, stat)` (use the existing effective-stat helpers so equipment
  counts). Unlock hint renders "Requires Hunting 50 · Cunning 20".
- Update the hobby description to own the reframe: *"Stalk people and intelligent
  creatures — learn their habits, their routes, and the moment they are most alone."*

### C.2 Case a Mark (new Stalking endeavor)

```js
{ id: 'case_mark', label: 'Case a Mark', apCost: 2, skillGain: 0.5 }
```

- Player picks a district (unlocked Thieving districts only). Sets
  `player._casedDistrict = districtId` (cleared when used or at year end).
- Effect: next Thieving job in that district gets `casedBonus` (+15 to the success roll)
  and upgrades its take by one district row's range where sensible. The predator's
  shadowing and the thief's reconnaissance are the same skill — this is the designed
  overlap between the two hobbies.
- The existing `spy` endeavor stays as the skill-building practice action.

### C.3 Contracts — the quiet knife

- Gated: Stalking ≥ 50. Offers arrive, they are not solicited: once per year (40% chance;
  requires `marked_by_rookeries` OR a criminal career OR suspicion ≥ 25 — the underworld
  must know you exist), the `assassin_contract` situation offers a named target: a real
  NPC, weighted toward Rich/Wealthy bands and NPCs with many `enemyIds`. Fee: £30–150
  scaled by target wealth band. **Same pool rules as thieving (B.3): no exclusions.**
  A contract can name the player's spouse, kin, boss, or a journaled bloodline NPC —
  the pre-crime reveal and back-out are the player's protection, and declining a
  syndicate-brokered contract costs the usual +5 suspicion.
- Accepting leads to the **pre-crime reveal** (B.4 — same template, darker copy). Same
  back-out rules (criminal-career penalty applies; the syndicate variant costs +5
  suspicion).
- Resolution roll: `stalking skill + prowess/2 + d20` vs `target prowess + 15`:
  - **Clean kill**: target dies (route through the existing death handling so annals,
    widowhood, inheritance all fire normally), fee paid, suspicion +10, ledger
    `{ type: 'murder', severity: 8 }`. Skill +1.
  - **Witnessed kill**: as above but suspicion +25, `witnessed: true` — capital
    exposure (C.4).
  - **Botched**: target survives and knows (disposition → −100, becomes an enemy),
    health −15, suspicion +15, no fee.
- `// HOOK: vampire` — leave a comment where the kill resolves: the Embrace-era version
  of this endeavor (feeding, draining) attaches here later.

### C.4 Capital justice

A trial (A.4) where any ledger entry has `type: 'murder'` and `witnessed: true` adds the
gallows to the outcome table: conviction with evidence score ≥ 12 → death by hanging
via the normal `killPerson` path — **the run ends, and that is intended**. No special
resurrection, no succession carve-out; the gallows is the deliberate risk ceiling of
the assassin build, priced into the fee. Milestone: *"Hanged at Newgate before a paying
crowd."* Flag the stakes clearly in the contract flavor text so the player opts in
knowingly. Otherwise murder convictions transport (A.4) rather than gaol.

### Phase C acceptance checks

- Stalking locks until Hunting 50 AND Cunning 20; hint renders both; stat requirement
  respects equipment bonuses.
- Case a Mark boosts exactly one subsequent job in the chosen district, then clears.
- Contracts only arrive when the underworld knows you; fees scale with the target's
  band; a botched job creates a living enemy.
- A witnessed murder conviction at high evidence hangs the player; unwitnessed murder
  convictions transport.
- Killing a married NPC widows their spouse through the normal death machinery.

---

## Out of scope (deferred — leave `// HOOK:` comments only)

- Underworld notoriety meter, syndicate rank ladder.
- NPC-on-NPC crime; NPCs burgling the player.
- Smuggling (the Sailor/Docks third entry point into Suspicion).
- Constable/Magistrate career conflict content (playing both sides).
- Vampire integration (night bonuses, feeding via Stalking kills).
- Crew raid events for River Pirate (belongs with the careers plan's Phase 4 workplace
  events pass; they should call `addSuspicion` when built).
