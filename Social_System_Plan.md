# Social System — Implementation Plan

Execution model: **feed one phase per Composer session**, same as the careers and
criminal plans. Read the *Context Primer* in `old_plans/Careers_HigherEd_Implementation_Plan.md`
first. Phases land in order S1 → S4.

**Prerequisites**: careers plan through Phase 4 (money, career catalog,
workplace/bosses). Criminal plan Phase A (Suspicion) is required before **S2**; if a
suspicion call appears in an earlier phase, route it through a helper that no-ops when
`sim/crime.js` is absent.

**Current state** (`sim/personInteractions.js`): six flat interactions — spend_time,
study_with, flirt, insult, have_sex, propose_marriage. This plan roughly triples the
set, so S1 builds the scaffolding first.

### Locked design decisions

1. **Hooks are the unifying mechanic** (CK3-inspired): cowed, debt, secrets, and owed
   favors are all one data shape on the relationship edge, differing in holder,
   lifetime, and reusability. The **Manipulate** category (player-held hooks) and NPC
   demands (NPC-held hooks) both read from it. Future vampire content (confiding your
   nature) is just another hook type — design nothing that would block that.
2. **Interaction categories**: the interact panel groups into chips — **Friendly /
   Intimate / Family / Hostile / Manipulate**. Family renders only for the player's
   **direct children** (any age — each interaction age-gates itself; wider kin is a
   future pass). Manipulate renders only when the player holds at least one usable
   hook on this person. Player-targeted matchmaking does NOT live on a chip — you
   can't Interact with yourself; it's a Journal Decision (S4.6).
3. **Attack check uses prowess only**: `currentProwess` already includes equipment
   bonuses. Do not build on the vestigial `meleeDamageBonus` field.
4. **Matchmaking is two features**: *Seek a Match* searches existing NPCs; *Commission
   a Match* generates candidates to criteria. Both serve the player AND the player's
   children. Commissioned candidates are generated **without** households
   (performance); the household (family of origin) generates lazily at betrothal /
   marriage — this amends the careers plan's locked decision #7: households may attach
   at the moment an NPC becomes important, not necessarily at first spawn.
5. **Apologize** is the repair tool: once per target per year, +10 disposition, +15
   when their disposition is negative, clears a `grievance` status if present.
6. Cut entirely (do not build): Beg/Ask for a loan; Ask About Someone (the world is
   already fully revealed to the player).
7. **Save policy: migrate, never reject** (same as criminal plan decision #6). All new
   fields — `edge.hooks`, `edge.disciplinedUntilYear`, `plannedCareerId`,
   `householdPending`, `education.universityFunded`, `degrees` on NPC children — get
   silent backfill defaults; no `SAVE_SCHEMA` bump.
8. **S1 ships alone** in its own Composer session before any S2+ content lands.

---

## Phase S1 — Infrastructure

### S1.1 Contested check helper (`sim/socialChecks.js`, new)

```js
export function contestedRoll(aScore, bScore)   // { success, margin } — a d20 each side, ties favor the defender (b)
export function flatCheck(score, dc)            // { success, margin } — score/2 + d20 vs dc
```

All of Attack, duel, rumor, extortion, and matchmaker negotiation use these two — no
bespoke math per interaction.

### S1.2 The hook system (`sim/hooks.js`, new)

Stored on the relationship edge (player↔NPC edges already exist):

```js
edge.hooks = [{
  id,                         // unique
  type,                       // 'cowed' | 'debt' | 'secret' | 'favor_owed' | 'grievance'
  heldBy,                     // 'player' | 'npc'
  amount,                     // £ (debt only)
  secretKind,                 // 'crime' | 'affair' | 'shame' (secret only; 'vampiric_nature' reserved)
  createdYear, expiresYear,   // null = permanent
  lastUsedYear,               // reuse cooldown tracking
}]
```

Per-type rules (lifetime / reuse):

| type | held by | expires | reuse |
|---|---|---|---|
| cowed | player | +3 years | reusable, 1-year cooldown |
| debt | player | until repaid/forgiven/called | single use (consumed) |
| secret | either | never | reusable, 5-year cooldown |
| favor_owed | player | +10 years | single use |
| grievance | n/a (marker) | until apologized/expired +5y | not usable — dampens Friendly gains by half |

API: `addHook`, `getUsableHooks(player, targetId, heldBy)`, `useHook`, `removeHook`,
plus a yearly `tickHooks` (expiry pruning; NPC-held demand rolls — S3.5). Persisted
with the edge; backfill: `edge.hooks = []`.

Implementation notes:

- **`disciplined` is NOT a hook** — store `edge.disciplinedUntilYear` (plain field,
  default `null`). It isn't usable/manipulable like cowed or debt; it's a compliance
  window read by S4.
- **Persistence**: extend `normalizeEdge` in `state/relationship.js` to carry `hooks`
  (default `[]`) and `disciplinedUntilYear` (default `null`); backfill both in the
  person migration path.
- **AP costs**: register the new rows in `INTERACTION_AP_COSTS`
  (`sim/actionPoints.js`): attack 2, duel 2, tutor 3, direct_studies 2; everything
  else stays on the default 1.
- **Confidant cross-cuts** (rumor block, trial evidence −2, NPC demand rolls) are
  stubbed as `// HOOK: confidant` comments in S1 at their integration points and
  wired for real in S3.

### S1.3 Category chips + sub-choice pattern (`ui/personInteract.js`)

- Interact panel gains category chips (reuse the career-picker chip pattern):
  **Friendly** (spend time, gift, apologize, study with) · **Intimate** (flirt, make
  love, propose) · **Family** (S4 suite; kin only) · **Hostile** (insult, attack, duel,
  rumor) · **Manipulate** (S3.5; only when `getUsableHooks(...,'player').length > 0`).
- Generalize the propose-panel precedent (`openProposePanel`) into a reusable
  **sub-choice panel**: an interaction result may return
  `{ openSubChoices: [{ id, label, disabled?, title? }] }` and a follow-up call
  resolves the chosen branch. Attack's Intimidate/Injure/Slay, the duel's terms, gift
  tiers, and the Manipulate menu all use this one pattern.

### S1 acceptance checks

- Existing six interactions unchanged in behavior, now grouped under chips; Family and
  Manipulate chips absent for a stranger with no hooks.
- Hooks CRUD round-trips through save/load; expiry prunes on the year tick; grievance
  halves Friendly disposition gains while present.

---

## Phase S2 — The Hostile Suite

*Requires criminal plan Phase A (suspicion + ledger).*

### S2.1 Attack (standard interaction — anyone living, AP 2)

- Check: `contestedRoll(currentProwess(player), currentProwess(target))`.
- **Success → sub-choice** (the player picks the outcome):
  - **Intimidate** — adds `cowed` hook (player-held, 3y); target disposition −15;
    suspicion +2 if witnessed.
  - **Injure** — target health −(20 + margin, cap 40); target becomes enemy; each
    living **close kin** of the target — defined as spouse(s) + parents + children +
    siblings, via the existing `gameState.js` getters — disposition −15 toward the
    player; if witnessed: assault ledger entry `{ severity: 2 }`, suspicion +6.
  - **Slay** — confirm beat ("This cannot be undone."), then `killPerson`; murder
    ledger severity 8; suspicion +10 unwitnessed / +25 witnessed (matches crime plan
    C.3). No pre-crime reveal — the player chose this person deliberately; the
    reveal is for discovering marks, not for premeditation.
- **Failure** — player health −15, target disposition −40, target becomes enemy, 15%
  chance suspicion +4 (a brawl draws eyes).
- **Witness model**: base 25% chance, −10 points if Stalking ≥ 50; near-certain (90%)
  when the target is a coworker/boss attacked in a workplace context. Shared helper so
  crime-plan code can reuse it.

### S2.2 Challenge to a Duel (Hostile, AP 2)

The class-flavored sibling of Attack — formal, consensual, and the law winks.

- **Acceptance**: target accepts if their **wealth band** is Rich or Wealthy (per
  `wealthTierLabel` — NOT career socialGroup: dueling is about perceived station, and
  the wealthy poacher who will meet you at dawn is a feature), OR they hold a
  military-category career, OR prowess ≥ 40; otherwise they decline (annals: *"He
  laughed in your face. Gentlemen duel; dockworkers simply hit you."* — small mutual
  disposition loss and nothing else).
- **Terms sub-choice at challenge**: *first blood* or *to the death*.
- Contested prowess roll. First blood: loser health −15, and — dueling culture —
  **both** parties gain +5 disposition toward each other (honor satisfied). To the
  death: loser dies via `killPerson`; the winner takes a `duel_death` ledger entry
  `{ severity: 4 }` and suspicion +6 — society winks, the law only half-looks.
- Player may lose either duel — the same consequences apply to the player.
- `duel_death` is a new ledger `type`; `sim/crime.js` must treat ledger types
  **generically** (severity drives sentencing, type is flavor/capital-flagging only),
  so new types never require crime.js changes.

### S2.3 Spread a Rumor (Hostile, AP 1)

- `flatCheck(effectiveCunning, 25)`. Success: pick the target's highest-disposition
  living relation (spouse first, then boss, then a parent/child) — that relation's
  disposition toward the **target** drops −15; annals is vague by design. Failure: it
  traces back — target learns (disposition −20 toward player) and gains a `grievance`.
- Cannot target someone who holds a `secret` hook on the player (S3.4's passive
  protection — they know too much).

### S2 acceptance checks

- Attack success presents exactly three outcomes; Slay kills through the normal death
  machinery (widowing, inheritance); injuring a father drops his whole household's
  disposition.
- Duel declined by a poor non-military NPC, accepted by a soldier; first-blood duel
  ends with mutual +5; to-the-death win writes severity 4, not 8.
- Rumor success damages the target's marriage, not the player's edge; failure creates
  the grievance on the player's own edge.
- All suspicion/ledger writes route through `sim/crime.js`.

---

## Phase S3 — Coin, Confidence & Manipulation

### S3.1 Give a Gift (Friendly, AP 1) — money or items

- **Sub-choice**: £ tiers — trinket £2 (+4 disposition), generous £10 (+8), lavish £40
  (+15) — or **an item from the player's inventory** (equipment or materials; value =
  `fenceValue` if present, else by rarity: common £2 / uncommon £8 / rare £25 → same
  disposition table).
- Band scaling: gift value vs target's wealth band — a band poorer than the gift's
  tier: ×1.5 disposition; a band richer: ×0.5 (*a sovereign moves a beggar and insults
  a magistrate*).
- Item transfers to the target's inventory. Hot goods (`hotGoods: true`) **cannot be
  gifted** this pass — `// HOOK: gifting heat` for the future "constable finds the
  candlesticks in HIS rooms" content.

### S3.2 NPC auto-equip (`sim/equipment.js`)

`autoEquipBest(npc)`: per slot, equip the owned item with the highest summed stat
mods. Run (a) immediately when an NPC receives a gifted equipment item, (b) once per
year in the year tick for all living NPCs (cheap — NPC inventories are small). Your
brother wears the rapier you gave him.

### S3.3 Lend Money (Friendly, AP 1) → the debt pipeline

- Sub-choice: £5 / £20 / £50 (disabled beyond purse). Creates a `debt` hook
  (player-held, amount).
- Each year, borrower repays with probability by wealth band + disposition (roughly
  30–70%): purse +amount, disposition +5, hook removed.
- An unpaid debt is leverage: it appears in **Manipulate** as *Call in the Debt* —
  sub-choices: **Demand repayment** (`flatCheck(charisma, 20)`; success → £ back;
  failure → −10 disposition, hook remains), **Forgive it** (+12 disposition, hook
  removed), or **"You owe me instead"** (consume the debt → open the favor menu,
  S3.5).

### S3.4 Confide a Secret (Intimate, AP 1) — the reverse hook

The player *gives* leverage to buy closeness. Secret kind auto-selected from player
state, most severe first:

- `crime` — any crimeLedger entry exists ("you tell them what you did")
- `affair` — player has a lover while married
- `shame` — fallback ("a private disgrace, told at last")
- (`vampiric_nature` — reserved kind for the future vampire plan; the data shape and
  NPC-demand machinery below must work unchanged for it)

Effects: intimacy +15, disposition +10, and the target gains a **`secret` hook on the
player** (permanent, 5-year reuse cooldown). The target becomes a **confidant**:

- **Passive (their grip on you)**: the player cannot Spread Rumors about them (S2.3),
  and Attacking them carries a 100% exposure clause — if they survive, the secret
  spills (below).
- **Passive (their loyalty to you)**: rumors against the player automatically fail if
  the chosen relation is a confidant; if a `crime`-secret confidant would be the trial
  witness context, evidence −2 (*they saw nothing, your honor*).
- **NPC demands** (in `tickHooks`, 10%/year per NPC-held usable hook): a situation
  fires — they want **£ by their wealth band**, or **a favor_owed hook** on the
  player. Refuse: disposition −20 and a spill roll (40%): `crime` secret → suspicion
  +8; `affair` → spouse disposition −40; `shame` → −10 disposition with the player's
  closest three relations. This is the CK3 texture: someone who knows is someone you
  keep close, pay off, or… (Hostile options remain available, at the price above.)

### S3.5 The Manipulate category

Lists each usable player-held hook on this person with its actions:

| Hook | Action | Effect |
|---|---|---|
| cowed | **Extort** | £ by their wealth band; disposition −10 |
| cowed / favor_owed / debt-converted | **Demand a favor** | role-filtered menu below |
| debt | **Call in the Debt** | S3.3 |
| secret (player-held on NPC — future source) | as cowed, stronger | reserved |

**The favor menu** (small vocabulary of existing levers; show only applicable rows —
this is why favors don't explode combinatorially):

- *"Put in a word"* (target is the player's boss) → promotionProgress +15
- *"Look the other way"* (magistrate/constable career) → suspicion −10
- *"See to my marks"* (schoolmaster/professor context) → grade +25 or uni progress +25
- *"A better rate"* (merchant/shopkeeper/fence) → +15% sale prices for one year
- *"Coin, then"* (anyone) → £ by wealth band
- Each favor consumes the hook (or starts the cowed cooldown) and costs −5 disposition.

### S3.6 Apologize (Friendly, AP 1)

Per locked decision #5: once per target per year; +10 disposition, +15 if their
disposition is negative; clears `grievance`.

### S3 acceptance checks

- Gifting a rapier to a poor brother: big disposition, rapier appears equipped on him
  within the same render cycle; gifting the same to a magistrate yields the halved
  gain; hot goods are not offered in the gift picker.
- Debt lifecycle: repaid (money back +5), forgiven (+12), converted (favor menu
  opens); each path removes the hook.
- Confide with a criminal record creates a `crime` secret; the confidant's demand can
  fire, refusal can spill (+8 suspicion); rumors *by* the player against the confidant
  are blocked; Manipulate chip appears only with usable hooks.
- Favor menu shows "Put in a word" only when the target is the current boss, "Look
  the other way" only for magistrate/constable careers.

---

## Phase S4 — The Family Suite

All interactions under the **Family** chip; render only for the player's kin (children
unless noted). "Compliance" below = child disposition ≥ 0 **or** an active
`disciplined` status.

### S4.1 Direct Their Studies (child in primary/secondary, AP 2)

**Confirmed: the player's children ARE NPCs** — the grade ladder is player-only, so
there is no grade to boost. Compliance → the child **skips this year's school-dropout
roll** (`tickNpcSchoolDropout`) and gains +1 intelligence; disposition −3 (children
resent homework). Refusal → nothing, annals: *"They will not be governed this year."*

### S4.2 Tutor Them (child age 6+, AP 3)

Pick a stat you hold ≥ 40 (int/charisma/insight/cunning/prowess). Child gains
+2 in it, +3 if the player holds ≥ 70 — your barrister raises a sharper barrister.
Diminishing: −1 effect per repeat on the same stat in the same 5 years.

### S4.3 Arrange an Apprenticeship (child 14–17, AP 1 + £10)

Compliance → sets a `plannedCareerId` on the child (any middle/poor-group career whose
NPC requirements the child can meet); at `careerPickAge` the child takes it instead of
the weighted roll. Refusal → £ kept, child disposition −5 (*"I will not be a baker."*)

### S4.4 Fund Their University (popup, not an interaction)

When a player's child turns 17 with `education.stage === 'completed'`: popup — pay
**£120** (disabled if unaffordable) → sets `child.education.universityFunded = G.year`,
disposition +10. Decline → disposition −10. Fires once per child.

**What lands on the child** (so S4 matches what careers code recognizes): a yearly
tick check finds funded children at `G.year − universityFunded ≥ 4` and pushes `'ba'`
into `child.degrees` (**same array shape as the player's** `degrees`), with an annals
line if journaled. Then amend the careers plan's NPC degree approximation where
implemented: a career's degree gate is satisfied by
`npc.degrees?.length > 0 || (stage === 'completed' && wealth ≥ 50)` — a funded degree
is first-class, the wealth heuristic remains the fallback for world-generated NPCs.

### S4.5 Discipline (child under 18, AP 1)

Disposition −5; adds `disciplined` status (edge-status, 2 years) during which parental
interventions auto-comply. Trading warmth for control — the honest 1800s model.
`// HOOK: adult resentment` — count of lifetime disciplines, for future adult-child
personality drift.

### S4.6 Matchmaking — two features, both for player AND child

**Where they live** (resolves the you-can't-Interact-with-yourself gap):

- **For the player**: a Journal → Decisions entry, **"Engage a Marriage Broker"**
  (mudlark/magistrate pattern) — eligible when adult, alive, unmarried, and not in
  prison. Its popup offers both features below.
- **For a child**: on the child's Interact panel under the Family chip, same two
  features, subject = the child.
- **Candidate selection UI** (both features, both subjects): an **inline sub-choice
  panel** (the S1.3 pattern) listing the candidates — name, age, wealth band, and the
  standout stat. Picking one triggers the introduction (or, for a child, the
  negotiation). Unpicked candidates persist as ordinary NPCs, browsable in Bloodline
  like anyone else. No dedicated matchmaking panel this pass.

**Seek a Match** (AP 1, £2): lists existing eligible NPCs (alive, unmarried, adult,
age within ±10 of the subject), ranked by wealth band + primary stats. Choosing one
grants an introduction: edge created with +10 disposition, +5 intimacy.

**Commission a Match** (AP 1, £10): criteria — wealth band, age range, priority
(wealth / charm / intellect → stat skew). Generates **2–3 candidates without
households** (`householdPending: true`), stats skewed to the priority, quality scaling
with the subject's family standing. Candidates persist as ordinary NPCs; unpicked ones
simply live on.

- **Lazy household** (locked decision #4): at betrothal/marriage of a
  `householdPending` NPC, generate their family of origin via `generateNpcWithFamily`
  (they are the focal; it builds parents + siblings) and clear the flag.
- **For the player**: introductions only — courtship still runs through the normal
  intimacy-gated proposal. The broker is an accelerant, never a purchase.
- **For a child**: negotiation with the candidate's side —
  `flatCheck(player charisma, 20 + band difference × 5)`. Dowry by band differential:
  marrying the child **up** one band costs £30, equal bands £5 token, **down** one band
  the player *receives* £15. Compliance rules apply — a refusing child (disposition
  < 0, no `disciplined`) blocks the match (*"I would sooner take the veil."*). On
  success the pair marries through the normal `marryPersons` machinery.

### S4 acceptance checks

- Family chip renders on the player's child, not on a friend.
- Discipline forces a refused apprenticeship to succeed on retry within 2 years.
- Tutoring at stat 70+ gives +3; the same stat twice in 5 years gives less.
- University popup fires exactly once at 17, gates on £120, and the degree marker
  qualifies the adult child for `requiresDegree`-style NPC careers.
- Commissioned candidates arrive without families; the family generates at betrothal
  and the `householdPending` flag clears; Seek-a-Match never generates NPCs.
- Player matchmaking grants the introduction but the proposal still requires intimacy
  ≥ 50.
- "Engage a Marriage Broker" appears in Journal → Decisions for an unmarried adult
  player and never on the interact panel; the child version appears only under the
  child's Family chip.
- A funded child's `degrees` contains `'ba'` at +4 years and they qualify for a
  degree-gated NPC career even at wealth < 50.

---

## Out of scope (deferred — `// HOOK:` comments only)

- **Workplace politics** (flatter the boss, request a raise, undermine a coworker,
  cover a shift) and **Pay Court** to elderly relatives (inheritance weighting) — next
  social pass; they ride on S1's infrastructure unchanged.
- **Vampire secrets** (`vampiric_nature` confide, Entrust the Secret content) — the
  hook type is reserved and the demand/spill machinery must already work for it.
- Gifting hot goods (heat transfer).
- NPC-on-NPC hooks; NPCs manipulating each other.
- Adult-child resentment drift from Discipline history.
