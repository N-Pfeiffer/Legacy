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
2. **Suspicion does not inherit across generations.** Succession wipes it. No family-name
   mechanics.
3. **Victims are real NPCs** drawn from the whole living world pool. Every crime against a
   person fires a **pre-crime choice event** revealing the mark (name + relationship
   context) with a Proceed / Back Out choice. Backing out while employed in a criminal
   career costs standing with the boss and crew.
4. **Stalking is the assassin's hobby**, not reconnaissance — stalking people and
   intelligent creatures. It gains a **Cunning gate** to align it with roguery, and its
   criminal expression (contracts, the quiet knife) lands in Phase C.
5. Hidden numbers, worded tiers — same philosophy as the careers plan's promotion bar.
   The player never sees the Suspicion value, only **The Watch's Eye** in words.

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
| 50–74 | watchful | "The Watch is watchful" | jobs suffer −15% success; each year 20% chance of `watch_searches` situation (a constable turns out your rooms — if any hot goods (B.5) are held, they're confiscated and suspicion +10) |
| 75–100 | warrant | "A warrant is out" | yearly arrest roll: `chance = (suspicion − 70) / 80` (75 → ~6%, 100 → ~37%) |

- **Decay**: −10/year if the player committed no crime that year (no ledger entry);
  −4/year otherwise. In prison: suspicion set to 20 on release ("you've served your
  time").
- **Passive career feed** (the crew-career scaling hooked in the careers plan Phase 4):
  Poacher +2/yr, River Pirate +4/yr, applied in `tickSuspicion`. Replace the
  `// HOOK: crime system` comments with these calls.

### A.3 UI — The Watch's Eye

Panel card in the **Particulars** section (alongside hobbies/possessions), visible once
suspicion has ever exceeded 0: an eye icon and the tier label only — never a number, never
a bar. Tier transitions log an annals line ("You notice the same constable on your street
two mornings running.").

### A.4 Arrest & trial

Arrest (from the warrant roll, or scripted from a botched job) fires the blocking
`crime_trial` situation:

- **Evidence score** = `ledgerSeverity(player)` + 3 if any recent entry was `witnessed`.
- Defense options (buttons; disabled where requirements unmet):
  - **Plead your character** (Charisma check vs evidence)
  - **Outwit the prosecution** (Cunning check vs evidence)
  - **Retain a barrister** — costs £ = `10 × evidence score`; adds a large flat bonus.
    If the player's own career is Barrister, the button becomes "Conduct your own
    defense" — free, same bonus.
- Outcomes:
  - **Acquitted**: suspicion −30, annals.
  - **Convicted**: `incarceratePlayer(player, { years, source: 'crime' })`, with
    `years = clamp(round(ledgerSeverity / 2), 1, 7)`. Suspicion handled at release (A.2).
  - **Transportation** (conviction with `ledgerSeverity ≥ 10`): sentence served as a
    prison variant `source: 'transportation'` of 7 years, its own flavor ("the hulks at
    Woolwich, then the long passage south"). Release milestone: you return to London
    older, free, and forgotten (suspicion 0, ledger cleared).
  - **The gallows** (capital ledger entries only — Phase C): death. See C.4.

Trial flavor (1800s London):
> The Old Bailey smells of vinegar and unwashed wool. The judge does not look at you;
> the clerk reads the charges in a voice worn smooth by ten thousand repetitions.
> Twelve men who have never missed a meal will now weigh the worth of your word.

### A.5 Poaching — wildlife raids on the King's domain

Reframe existing hunting `witnessChance` as the poaching risk (this is the hunting.js
TODO):

- Add `royalDomain: true` to the appropriate hunting zones in `data/huntingZones.js`
  (the deep/rich zones; keep at least one commons zone clean). Royal-domain hunts keep
  their existing loot but a triggered `witnessChance` now calls
  `addSuspicion(player, 8, { type: 'poaching', severity: 1, witnessed: true })` and the
  message becomes "A gamekeeper saw you — and gamekeepers talk."
- Poacher career: its yearly hunting skill gain stays; the passive +2/yr suspicion (A.2)
  represents the life, not individual hunts.

### Phase A acceptance checks

- Committing no crimes: suspicion stays 0, no Watch's Eye card renders.
- Ledger prunes to 15 years; decay −10 clean years / −4 active years verified.
- Tier transitions fire their situations exactly once per entry into the tier.
- At suspicion 100, arrest fires within a few years; trial buttons gate correctly
  (barrister costs £, own-career-barrister free); conviction years match the formula.
- Transportation path triggers at ledgerSeverity ≥ 10 and clears ledger + suspicion on
  return.
- Royal-domain hunt with witness roll adds suspicion and logs the gamekeeper line;
  commons zones never do.

---

## Phase B — The Thieving Hobby

**Goal**: the player-facing criminal loop — districts, real NPC victims, the pre-crime
choice, loot, and the fence.

### B.1 Hobby definition (`data/hobbies.js`)

```js
{ id: 'thieving', label: 'Thieving', icon: '🗝️',
  description: 'Pockets, locks, and ledgers — relieve London of what it will not miss.',
  tags: ['gathering'],
  endeavors: [],   // jobs run through the district UI, hunting-zones style
}
```

No unlock requirement (like Hunting); age-gated to 12+ by the existing hobby age rules
(not in `HOBBIES_CHILDHOOD`).

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
Rich/Wealthy, Strand → Rich/Wealthy institutions' officers — bankers, magistrates). If no
NPC fits the band, fall back to an anonymous stranger (no relationship stakes, plain
flavor).

### B.4 The pre-crime choice event (fires for EVERY crime against a person — B, and C)

Before the job resolves, a blocking situation reveals the mark:

> You've watched the house for three nights. Tonight the servants' door will be left on
> the latch. But crossing the lamplight you finally see the owner's face — **{name}**{,
> your wife's brother / , whom you drink with on Sundays / — a stranger to you}.

Show the relationship context (kinship label if related; disposition/intimacy summary if
an edge exists; "a stranger" otherwise). Buttons:

- **Proceed** — job resolves (B.5).
- **Back out** — AP already spent stays spent (you cased the place); no suspicion, no
  ledger entry. **If the player holds a criminal career** (Poacher, River Pirate — check
  `socialGroup === 'criminal'`): boss disposition −10, each coworker −5, annals: *"Word
  gets round the crew that your nerve failed at the door."*

### B.5 Job resolution

- Success roll: `thieving skill + effectiveCunning/2 + casedBonus (C.2) + d20` vs district
  difficulty; `watchful` tier applies its −15%.
- **Clean success**: £ take via `addMoney` (scaled ×1.5 if the victim's wealth band
  exceeds the district's expectation), roll hot goods, suspicion (clean column), victim
  NPC `wealth −= 3..8`, skill +0.5 (`addHobbySkill`).
- **Success, witnessed**: as above, suspicion (witnessed column), ledger `witnessed:
  true`, and the victim (if not a stranger) knows: disposition with victim −40.
- **Failure**: nothing gained, suspicion (witnessed column), 30% chance of immediate
  `crime_trial` (A.4) with this job as the evidence; otherwise you fled — health −5
  scramble over the rooftops.
- **Hot goods**: new stolen items in `data/items.js` (category `material`,
  `hotGoods: true`, `fenceValue`): gentleman's pocket watch (£8), silver candlesticks
  (£12), lady's brooch (£6), silver plate (£15), banknote bundle (£20 — the Strand only).
  Hot goods cannot be sold at face value and are confiscated by `watch_searches` (A.2).
- **The fence**: "Visit the Fence" action on the Thieving panel (1 AP) — converts all
  held hot goods to £ at **40%** of `fenceValue`. If the player has the
  `marked_by_rookeries` trait, the syndicate *is* the fence: 55% rate, but a 15% yearly
  chance they demand a job (a syndicate-flavored pre-crime event; backing out of THAT
  costs suspicion +5 — they make sure the Watch hears your name).

### B.6 UI

Thieving panel follows the hunting panel pattern: district cards with skill locks, job
button, fence button, and the Watch's Eye tier echoed at the top of the panel (the one
place besides Particulars it shows).

### Phase B acceptance checks

- Thieving appears at 12+, districts lock/unlock by skill.
- Every job against a person fires the pre-crime reveal; kin/friends show relationship
  context; backing out with a criminal career dings boss/coworkers, without one it's
  free.
- Clean vs witnessed suspicion deltas match the table; victim disposition −40 on
  witnessed success against a known NPC.
- Hot goods flow: acquired → confiscated by a watch search, or fenced at 40% (55%
  rookeries), and never sellable otherwise.
- Failure can cascade straight into a trial.

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
  scaled by target wealth band.
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
(player death via the normal death path; milestone: *"Hanged at Newgate before a paying
crowd."*). Otherwise murder convictions transport (A.4) rather than gaol. This is the
risk ceiling of the assassin build — flag it clearly in the contract flavor text so the
player opts into it knowingly.

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
