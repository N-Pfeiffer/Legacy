# Changelog

All notable changes to **Legacy** (the `Legacy-Vite` game) are documented here.

Agents **must** append an entry under `[Unreleased]` whenever they modify game logic, data schemas, save format, UI behavior, or project structure. Keep entries brief and user-facing where possible.

## How to write entries

- **Date**: Use `YYYY-MM-DD` when merging to a dated section; `[Unreleased]` holds work-in-progress.
- **Categories**: `Added` · `Changed` · `Fixed` · `Removed`
- **⚠ High impact**: Prefix the bullet with `⚠ **High impact** —` when a change could break saves, imports, or expected runtime behavior. Explain *what to watch for* in one line.

### ⚠ High impact — when to flag it

Flag changes that touch any of:

- Save schema / `migratePerson` / `migrateSave`
- Person creation (`createPerson`, `PERSON_DEFAULTS`, inheritance)
- `G.people` structure or ID assignment
- Marriage, birth, pregnancy, or family graph wiring
- Import paths moved or modules split/merged
- Annals, year tick, or journal simulation order

---

## [Unreleased]

### Added

- **Stalking & assassination contracts (Criminal Phase C)** — Stalking gated on Hunting 50 and Cunning 20 (equipment counts); **Case a Mark** boosts the next Thieving job in a cased district; yearly underworld assassination contracts with pre-crime reveal, fee payout, botched/witnessed outcomes, and capital hanging at trial (`sim/stalking.js`, `data/crimeSituations.js`, `sim/crime.js`, `ui/hobbiesPanel.js`).

- **Thieving hobby (Criminal Phase B)** — hidden until `crimePath` unlocks (suspicion, poverty, criminal career / `marked_by_rookeries`, or pickpocket victim event); district jobs with pre-crime reveal, hot goods, fence, and syndicate fence errands (`sim/thieving.js`, `data/thievingDistricts.js`, `data/hotGoodsItems.js`, `sim/crimePath.js`, `ui/hobbiesPanel.js`).

- **Criminal system — Suspicion & The Watch (Phase A)** — hidden Suspicion meter (`player.suspicion`, `crimeLedger`), yearly decay and passive Poacher/River Pirate feeds, tier situations (`watch_questions`, `watch_searches`), arrest trial at the Old Bailey (`crime_trial`), transportation vs gaol sentencing, **Watch's Eye** HUD label, royal-domain poaching on forest hunts, human-prey murder consequences, and **Approach the Magistrate** bribe decision with household NPC (`sim/crime.js`, `sim/magistrate.js`, `data/crimeSituations.js`, `sim/hunting.js`).
- **`generateAdultWithHousehold`** — shared important-NPC generator (focal + spouse + children) wired into university patron, workplace boss, and magistrate (`sim/npcFamilyGen.js`).

- **Workplace & player promotion (Phase 4)** — joining a career spawns boss/coworkers/peers (`G.workplace`, `sim/workplace.js`); player promotion uses boss disposition + Promotion Chance bar; **Work Hard** (5 AP → +5%); 5 AP yearly career upkeep after AP refresh (`sim/careers.js`, `sim/yearTick.js`, `legacy.js`).

- **Career catalog replacement (Phase 3)** — Victorian social-class careers (Elite / Rich / Middle / Poor / Criminal + NPC-only destitute/poor/rich roles), requirements engine, £ pay tiers, yearly salary annals, hobby yearly effects, and Courtesan STD hook (`data/careers.js`, `sim/careers.js`, `legacy.js`).

- **University higher education (Phase 2)** — Oxford / UCL matriculation with immersive acceptance paths (melancholic patron, Oxford-qualified father, Gower Street default), degree choice, yearly class loads, sponsorship lifecycle, and progress-based graduation into `player.degrees[]` (`data/education.js`, `sim/university.js`, `data/educationSituations.js`, `sim/educationTick.js`).
- **Player currency (Phase 1)** — player wealth is now literal pounds (`player.money`) shown as **Purse** in the HUD, with a stacking **Sovereign** material mirror in Possessions (`sim/money.js`, `data/items.js`, `ui/renderHud.js`).
- **Marriage dowry** — player marriage no longer pools spouse wealth; a one-time dowry is paid from the spouse's social standing (`sim/marriage.js`).

### Changed

- **Character creation & particulars** — stat steppers show per-stat point costs (2 for Charisma/Intelligence, 4 for Insight/Prowess); Choleric tagline renamed to **The Hasty**; Sanguine humor grants **+50 max Health** (trait `statMods.health` now raises the health ceiling via `statCap`); Items panel always shows inventory UI even when empty (`index.html`, `data/humors.js`, `utils/statCap.js`, `ui/renderPossessions.js`).

- **Stalking hobby** — reframed as predator recon; requires Cunning 20 alongside Hunting 50; stat requirements respect equipped gear (`data/hobbies.js`, `sim/hobbies.js`).

- ⚠ **High impact** — **`player.crimePath` / `thievingUnseen` on load** — backfills from suspicion, criminal career, or `marked_by_rookeries` without firing `the_trade_opens`; new unlocks still get the one-time popup (`sim/crimePath.js`, `state/person.js`).

- ⚠ **High impact** — **`player.suspicion` / `crimeLedger` / `G.magistrate` on load** — schema 30 saves backfill via `migratePerson`; no schema bump. *Watch for:* existing patron/boss singletons keep no retroactive family; new generations get households.
- ⚠ **High impact** — **Prison release cools Suspicion** — non-transportation release sets `suspicion = min(suspicion, 20)`; transportation clears ledger and resets suspicion to 0 (`sim/prison.js`, `sim/crime.js`).

- ⚠ **High impact** — **`G.workplace` persisted in saves** — boss, coworkers, peer roles, and `promotionProgress` round-trip with schema 30 saves; missing workplace backfills on load (`state/saveSystem.js`, `sim/workplace.js`). *Watch for:* first load after update may generate fresh colleagues.
- **Player career shape** — `promotionProgress` replaces `yearsAtRank` for the player; NPCs keep the old promotion cadence (`sim/careers.js`).

- ⚠ **High impact** — **Career schema replaced** — removed era-flavored `nameByEra`, `prestige`, `requiresDegree`, and `category`; careers now use `socialGroup`, `payTier` / `payTierRange`, and `requirements` (degrees, stats, hobbies, father's wealth). Stale career ids clear on load (`migrateStaleCareer`). *Watch for:* old saves lose prior career assignment; NPC world re-rolls careers.
- **Player wages** — year tick pays `annualPay()` into the purse with an annals line; NPC wealth gravity uses pay tier (`sim/careers.js`).
- **Career picker UI** — social-class filter chips, pay range, met/unmet requirement lines, confirm modal shows starting/peak £ (`legacy.js`, `styles/legacy.css`).

- ⚠ **High impact** — **Higher-ed ladder replaced** — baccalaureate/licentiate/doctorate stages removed; university is a single `education.stage === 'university'` with per-school degrees and progress costs. `player.degrees[]` holds earned titles; legacy `requiresDegree: 'baccalaureate'` careers still gate via shim (`sim/university.js`, `legacy.js`). *Watch for:* old in-progress degree saves (schema 30+) may show odd education state until you start fresh.
- **Careers during university** — players may hold a career while enrolled; AP costs gate class loads instead of a hard career block (`legacy.js`).
- **Study at university** — Study decision remains available at university (grade trickle only) (`data/decisions.js`).
- ⚠ **High impact** — **`SAVE_SCHEMA` 30** — saves below schema 30 are rejected on load with a clear message. Pre-30 migration chain removed (`state/saveSystem.js`, `legacy.js`). *Watch for:* old saves cannot be loaded until you start fresh.
- **Social class point costs** — creation point buy for social class reduced to 25% of the old wealth values (`data/socialClass.js`).
- **Starting purse** — new games grant class-based starting £ (Destitute £0, Poor £4, Middle £20, Rich £60); `player.wealth` stays 0 for the player (`legacy.js`).
- **Parent household wealth** — mother now shares father's household wealth at character creation (`legacy.js`).
- **Player wealth touchpoints** — prison, marriage rings, windfall events, mudlark/rookeries rewards, child inheritance, and situation snapshots use £ for the player; NPCs keep 0–100 wealth (`sim/prison.js`, `data/playerEvents.js`, `data/marriageProposal.js`, etc.).
- **NPC wealth gravity** — career wealth drift no longer applies to the player (`sim/careers.js`).

### Fixed

- **"Kin" on unrelated profiles** — people with no tie to the player (classmates, in-laws, colleagues, strangers) no longer show the relation label "Kin"; the relation line is now blank for them (matching person cards and search). Known family/social relations are unchanged (`ui/personModal.js`, `ui/bloodline.js`).

- **Player Items button** — fixed a runtime error (`clearInventoryItemHighlight is not defined`) that prevented the Items button from navigating to Particulars → Items (`ui/itemAnnalsNav.js`).

- **Secondary school population** — generated classmates no longer all count as "destitute": `generateNpcWithFamily` now rolls a per-family household wealth across social classes (skewed middle-class) and children inherit it, so the wealth-based school-dropout curve doesn't cull nearly the whole cohort. Secondary now holds a proper class (~10–14 roster classmates while the player is enrolled) instead of a couple who leave within a year or two (`sim/npcFamilyGen.js`).

### Removed

- **Legacy career taxonomy** — pre-Phase-3 careers (farmer, laborer, doctor, lawyer, etc.) and education track stubs (`data/careers.js`, `data/education.js`).
- **Education ladder data** — `educationTracks.js` and `EDUCATION_LADDER` / scholarship enrollment situations deleted; stubs remain in `data/education.js` until Phase 3 career-track cleanup (`data/educationTracks.js`, `data/educationSituations.js`).

- **A Lesson in the Alley** — removed the secondary-school age-13 popup event and its year-tick trigger (`data/educationSituations.js`, `sim/educationTick.js`).

### Changed

- **Pass the Year placement** — sidebar year-advance button now sits above the **You** player card (`index.html`).

- **Crafting recipe visibility** — hobby crafting lists now only show recipes when you hold at least one required material (or the required relic item for scholarship studies) (`sim/crafting.js`, `ui/hobbiesPanel.js`).

- **Humors annals entries** — birth humor resolution now logs a short line ending when the physician names your temperament; the full prognosis still appears in the immersive popup (`data/immersiveEvents.js`).

- **Annals show mechanical gains** — person interactions (Spend time, Flirt, Insult, Make Love, Study with), Education **Study**, and school/situation events now append an italic outcome line (e.g. *(+34 Grade, +5 Disposition)*) to annals entries (`sim/situationLog.js`, `sim/personInteractions.js`, `ui/personInteract.js`, `data/decisions.js`, `legacy.js`, `sim/immersivePopup.js`, `styles/legacy.css`).

- **School Social View toggle is bidirectional** — the tier toggle now works in both directions: primary schoolers can "View Secondary" and secondary schoolers can "View Primary" (defaults to the player's own tier). Previously only secondary students could view the primary school (`legacy.js`).

- **Grade panel flavor text** — primary and secondary Education panels now show tier-specific copy above the grade bar (`legacy.js`, `styles/legacy.css`).

- ⚠ **High impact** — **Inventory rework** — Particulars → **Items** now shows **all inventory in one grid** by default; category buttons are **multi-select filters** (Equipment, Consumables, Unique Items, Materials, Components); sort dropdown on the Inventory header (**Recently added** default, Alphabetical, By category). **Unique Items** filter added; Mudlark's Lockbox is unique-only. Acquisition order tracked via `equipment[].acq` and `materialAcq` (save schema **29**). **Watch for:** old saves backfill acquisition order best-effort (`ui/renderPossessions.js`, `sim/personItems.js`, `data/items.js`, `state/saveSystem.js`, `styles/legacy-items.css`).

- **Estate → Particulars rename** — internal section key, DOM IDs (`section-particulars`, `part-panel-*`), vocab keys, situation domain, and `estateSituations.js` → `particularsSituations.js` aligned with the player-facing **Particulars** label (`navigation.js`, `index.html`, `data/vocab.js`, `data/particularsSituations.js`, and related imports).

- **Equipped item clicks open popup** — clicking a filled equipment slot now opens the item info popup instead of unequipping; **Unequip** remains available as a button in the popup (`ui/renderPossessions.js`).

- **School event balance pass** — retuned primary/secondary popup rewards: **You Begin School** (Eager +10 grade; Dragged +4 prowess, no grade), **Sharp Eyes in the Yard** (no grade on Watch; Keep Head Down +2 Int), **A Crossroads at School** (Teacher's Pet +2 Int/+40 grade; Rule the Playground +4 prowess, no grade; Skip Class +6 Cha/−30 grade), and **Secondary School** enrollment (no grade on any track; Arts +2 Cha/+1 prowess) (`data/educationSituations.js`).

- **Study uses a dismissible popup** — the Education panel **Study** button opens a modal with the study flavor text; click outside or **Study (2 AP)** to confirm (`ui/studyPopup.js`, `legacy.js`, `index.html`).

- **Study moved out of Decisions** — the Education panel **Study** button now opens an in-panel confirm prompt (2 AP → +25 grade, +0.25 Int) instead of routing to Journal → Decisions; annals flavor text is chosen at random from four study-session lines (`data/decisions.js`, `legacy.js`).

### Added

- ⚠ **High impact** — **Extended family / cousins** — at game start the player's aunts and uncles now marry (≈75% of settled adults) and have children, giving the player a family of cousins. Married-in spouses take the family surname convention and get careers; cousins inherit their parents' stats. Also fixed `getCousins` — it previously looked one generation too high and always returned empty; it now correctly returns the children of the player's aunts/uncles (so the Family tab's **Cousins** section and the "Cousin" relation label finally populate). **Watch for:** more NPCs generated at game start (~15–30), and any code relying on the old (empty) `getCousins` behavior (`legacy.js`, `state/gameState.js`).

- **Persons of Note (pin/bookmark people)** — a ★ toggle beside the name in the person-info modal marks anyone worth tracking; marked people collect in a new **"Persons of Note"** category at the top of the Relations tab (player only). Dead pins stay listed (with †) until removed; you can't pin yourself. Stored on `player.pinnedIds` (added to `PERSON_DEFAULTS`, auto-backfilled on old saves — no schema bump) (`sim/pins.js`, `state/person.js`, `ui/bloodline.js`, `ui/personModal.js`, `styles/legacy.css`).

- **Player Items button** — **Items** on the player (person modal or bloodline focal) now opens Particulars → Items instead of an inline inventory panel; NPCs still use the in-panel item grid (`ui/personModal.js`, `ui/bloodline.js`, `ui/itemAnnalsNav.js`).

- **Annals item quicklinks** — item names in annals (acquisitions, gathering, hunting) are clickable like person links; they open Particulars → Items, scroll to the item, and pulse a journal-style indicator on the top-left of the matching inventory card until you open it (`utils/itemAnnalsLink.js`, `ui/itemAnnalsNav.js`, `ui/possessionsState.js`, `sim/personItems.js`, `sim/gathering.js`, `sim/hunting.js`, `ui/renderPossessions.js`, `styles/legacy.css`, `styles/legacy-items.css`).

- **School grades wired up** — grade now moves via **passive intelligence accrual** each enrolled year (Int ~30 coasts to a C, Int ~10 fails), school-event choices (which keep their stat effects and now also show/grant a grade delta), a repeatable **Study** action in the Education panel (2 AP → +25 grade, +0.25 Int; in university grants only the Int trickle), and a **Study with** classmate interaction (2 AP, needs disposition > 19 with an enrolled classmate → +34 grade, +5 disposition). At the end of each tier the grade is cashed out: A → +5 Int/+2 Insight/+1 Cha, B → +3/+1/+1, C → +1 Int, D → nothing, **F → −10 Health and expulsion** (ends formal schooling — no higher tier). The Education panel's Study button opens an in-panel confirm prompt (`sim/grade.js`, `sim/educationTick.js`, `data/decisions.js`, `data/educationSituations.js`, `sim/personInteractions.js`, `sim/actionPoints.js`, `sim/situationLog.js`, `legacy.js`).

- ⚠ **High impact** — **School cohort & Social View** — entering primary now generates a living school: classmates (3–5 students per age 6–11), each with a full nuclear family, plus exactly 3 staff (two female teachers + a headmaster) **filled from existing `schoolmaster`-career NPCs** when available (e.g. a relative already in the role), generating new ones only as a fallback and self-healing when a staff member dies. New 6-year-olds arrive yearly; the roster prunes students who leave; the cohort persists permanently in the world. The Education panel shows a **Social View** of staff + classmates sorted by age, with a secondary→primary toggle; cards open the person modal. Adds reusable `generateNpcWithFamily` and new `G.school` world state. **Watch for:** `G.school` is new top-level state added to the save object (old saves load with it null and repopulate on the next year tick); the player's school years now add ~100+ NPCs to `G.people` (bounded by `SCHOOL_COHORT_CAP`, currently very high) (`sim/npcFamilyGen.js`, `sim/schoolStaff.js`, `sim/schoolCohort.js`, `sim/educationTick.js`, `state/gameState.js`, `state/saveSystem.js`, `legacy.js`, `styles/legacy.css`).

- **School grade system (foundation)** — new per-tier grade ladder climbing F → D → C → B → A (each band 0–100), player-only, reset on entering primary/secondary; helpers in `sim/grade.js` (lazy/ephemeral on `player.education.grade`, no save-schema change). Education panel now shows a grade progress bar at the top with a **Study** shortcut and the **relocated Drop Out** control (with an in-panel confirm prompt) (`sim/grade.js`, `sim/educationTick.js`, `legacy.js`, `styles/legacy.css`). *Grade is not yet moved by Study/events — that wiring lands in a later phase.*

- **Prerequisite hobby hints** — hobbies required by another append an in-character italic line on its own row below the description (no hobby name in the hint) (`sim/hobbies.js`, `ui/hobbiesPanel.js`, `styles/legacy.css`).
- **Testing (cheats) setting** — new toggle in Settings (default off) above the Debug section; when off, the entire Debug category is hidden (`legacy.js`).
- **Hybrid inventory stores** — `person.materials` (stacked fungibles), `person.equipment` (instanced gear with `uid`), and `person.equipped` slot map; equip/unequip API (`sim/equipment.js`, `sim/personItems.js`).
- **Item catalog taxonomy** — four categories (`equipment`, `material`, `component`, `consumable`), equipment slots, and `whileEquipped` stat fields on gear (`data/items.js`).
- **Equipped slots + inventory UI** — Estate → Items shows 13 equipment slots (click filled slot to unequip), category tabs (Equipment / Materials / Components / Consumables), stack badges on fungibles, and Equip/Unequip in the item popup (`ui/renderPossessions.js`, `ui/itemPopup.js`, `styles/legacy-items.css`).
- **Art layer** — `renderArt()` helper with emoji, SVG sprite, and raster image kinds; `public/art/sprite.svg` with hobby and item symbols; empty `public/art/{zones,havens,items}/` folders for future painted art (`ui/renderArt.js`, `public/art/`).
- **Gathering engine** — zone tables for Botany, Metallurgy, and Angling; weighted material drops, AP + skill costs, annals lines listing gains; zone picker UI with per-zone themes (`data/gatheringZones.js`, `sim/gathering.js`, `data/materialItems.js`, `ui/hobbiesPanel.js`).
- **Crafting engine** — recipe catalog for Alchemy, Metallurgy, Artificing, Tailoring, and Scholarship (Candles); `canCraft` / `runCraft` sim; Crafting tab UI with owned/required inputs and skill gates (`data/recipes.js`, `data/componentItems.js`, `data/craftEquipmentItems.js`, `data/craftConsumableItems.js`, `data/huntingMaterialItems.js`, `sim/crafting.js`, `ui/hobbiesPanel.js`).
- **Consumables use flow** — `onUse` effect descriptors on crafted consumables and Vial of Blood; `canUse` / `useConsumable` sim; **Use** / **Drink** button in item popup with disabled reasons (`sim/consumables.js`, `ui/itemPopup.js`).
- **Hunting engine** — creature-based zones (Moors, Forest, Deep Weald stub), weighted prey, requirement gates (Stalking, Prowess, Cunning, Hunting skill), chance drops including Noble's Longbow (`data/huntingZones.js`, `sim/hunting.js`, `ui/hobbiesPanel.js`).
- **Stalking spy endeavor**, **Mysticism endeavors** (Read the Stars, Séance with ingredient cost, Dark Ritual stub), and **Scholarship study/tome recipes** (`sim/stalking.js`, `sim/mysticism.js`, `sim/scholarship.js`, `data/scholarshipItems.js`, `data/recipes.js`).

### Changed

- **Secondary school now ends at 17** (ages 12–16), down from 18; university is reachable from 17. Backfill for very old saves adjusted to match (`sim/educationTick.js`, `legacy.js`).
- **Removed "The Road Ahead"** graduation-fork event and the unused `education.intent` field; **removed the schoolmaster's physical description** from the "You Begin School" event (`data/educationSituations.js`, `sim/educationTick.js`).
- **Expulsion vs dropout** — failing a tier sets an `education.expelled` flag; the Education tab now reads "Expelled" (not "Dropped Out") for that case (`sim/educationTick.js`, `legacy.js`).
- **School dropout** — dropping out of school no longer grants the player the hidden, functionless `school_dropout` trait (the `dropped_out` stage already gates progression); the NPC dropout path is unchanged (`legacy.js`).
- **Trait list order** — newly gained traits appear at the top of the Traits panel (`sim/traits.js`).
- **Equipment tab inventory** — equipment grid below equipped slots, separated by a solid divider with extra spacing (`styles/legacy-items.css`).
- **Equipment slot sizing** — main hand/body slots scale up on wide screens; jewelry and artifact slots stay compact (`styles/legacy-items.css`).
- **Equipment tab** — new Particulars / Relics & Pursuits sub-tab; equipped slots moved out of Items (`navigation.js`, `renderPossessions.js`, `index.html`, `vocab.js`, `renderHud.js`).
- **Hobby list visibility** — requirement-locked hobbies are hidden until unlocked; **Testing (cheats)** shows them greyed out with unlock hints (`sim/hobbies.js`, `ui/hobbiesPanel.js`, `legacy.js`).
- **Items tab padding** — responsive outer inset on the Items panel so content breathes on larger screens (`styles/legacy-items.css`).
- **Hobbies list intro** — removed the top-of-panel descriptor line (`ui/hobbiesPanel.js`, `styles/legacy.css`).
- **Sidebar layout** — Action Points moved to the bottom of the **You** panel; **Pass the Year** sits above the Attributes panel (`index.html`, `styles/legacy.css`).
- **Settings menu hints** — description text under each setting row no longer uses italics (`styles/legacy.css`).
- ⚠ **High impact** — **Save schema 28** — new **Cunning** core stat (`person.cunning`, inheritance, adult rolls, HUD/person displays). Pre-28 saves backfill Cunning from age/insight. **Watch for:** loaded adults may show small non-zero Cunning; hunting Cunning gates (Phase 7) now resolve against this stat (`state/saveSystem.js`, `state/person.js`, `state/personFactory.js`, `legacy.js`).
- **School Cunning events** — immersive **Headmaster's Office** chain (Primary, age 8) plus **Sharp Eyes in the Yard** and **A Lesson in the Alley**; choice buttons show stat effect previews (`data/educationSituations.js`, `sim/educationTick.js`, `sim/situationPopup.js`, `sim/immersivePopup.js`).
- **Hobby lineup** — Woodworking removed; Archery renamed to **Stalking** (requires Hunting 50); Artificing requires Metallurgy 50 **and** Mysticism 25; locked hobbies show greyed on the list with unlock hints (`data/hobbies.js`, `sim/hobbies.js`, `styles/legacy.css`).

- ⚠ **High impact** — **Save schema 27** — legacy `items[]` migrates into hybrid stores **unequipped**; item stat bonuses apply from **equipped gear only** (`whileOwned` → `whileEquipped`). **Watch for:** loaded saves may show lower prowess/insight until gear is re-equipped; `grantItem` stacks materials and allows multiple equipment instances (`state/saveSystem.js`, `sim/itemEffects.js`, `state/person.js`).

### Fixed

- **Journal Decisions indicator** — opening the Decisions sub-tab now clears the pending pulse on Journal and Decisions (`sim/decisionAttention.js`, `legacy.js`).
- **Choleric humor tagline readability** — "The Swift Ascent." on birth humor cards no longer inherits dark header text on the dark card body; taglines use an accent-tinted cream instead (`styles/legacy-immersive.css`).

- **Phase 8 polish** — World-setting copy (title tagline, parish registry subtitles, London closing line) no longer uses italics (`styles/legacy.css`, `styles/legacy-creation.css`). Gathering annals already list exact material drops and rounded skill level (e.g. Botany skill now 7); locked hobbies stay visible greyed with unlock hints on the list (`sim/gathering.js`, `ui/hobbiesPanel.js`, `sim/hobbies.js`).

### Changed

- **Particulars sub-nav** — Hobbies is now the first/default tab; Items is second (`ui/navigation.js`).

- **Hobbies UI** — Panel padding; list is a two-column grid of compact cards (description, 0/100 skill bar); detail Endeavors/Crafting sit side-by-side (50/50) when crafting applies, else Endeavors spans the row (`ui/hobbiesPanel.js`, `styles/legacy.css`).

- **Hobby skill gain** — Endeavors use low base gain (e.g. Forage `0.5`); diminishing returns no longer floor at 0.5 per action (`data/hobbies.js`, `sim/hobbies.js`).

- **Childhood hobbies** — No hobbies under age 6; ages 6–11 only Angling, Botany, and Performance; full hobby list at 12 (`sim/hobbies.js`).

- ⚠ **High impact** — **Event recording framework (`record` tiers)** — `recordSituationResolution` now routes by a template/button `record` tier instead of `logTo`: `'flavor'` → Annals only, `'milestone'` → Annals + Memories, `'silent'` → ledger only (template self-logs). `record` may be a `(player) => tier` evaluated after `apply()`. Milestones are self-describing: the memory body appends an outcome line from the auto stat/trait diff plus an optional `reward` descriptor (string or `(player) => string`) for items/arc rewards; a milestone with neither warns in dev. Schooling (You Begin School, Secondary School, The Road Ahead) and prison (Prison Fever, Turnkey Extortion) record as **milestones**; the patron arc is **flavor** per delivery and **milestone** on completion (`+ Mysterious Relic` reward); the mudlark find is **flavor**, its successful open a **milestone**; birth (A Welcome to the World) is now a **milestone**. **Watch for:** templates still using the old `logTo` field no longer route — convert them to `record`; the doc block in `sim/situationLog.js` is the source of truth (`sim/situationLog.js`, `data/educationSituations.js`, `data/prisonSituations.js`, `data/estateSituations.js`, `data/immersiveEvents.js`, `ui/decisionPopup.js`, `sim/immersivePopup.js`, `legacy.js`).

- ⚠ **High impact** — **Save schema 26 / `resolvedSituations` ledger** — `player.situationLog[]` is replaced by a gating-only `resolvedSituations` map (keyed by templateId: `{ firstYear, lastYear, count }`). `migrateSave`/`migratePerson` fold old `situationLog` entries into the ledger and delete the array. All `once`/offer gates (`peculiar_patron_offer`, immersive `once`, debug re-fire) now read the ledger. **Watch for:** any new code reading `player.situationLog` will find it gone — use `hasResolvedSituation(player, id)` / `recordResolvedSituation` from `sim/situationLog.js`. `PERSON_DEFAULTS` changed in three mirrors (`state/person.js`, `state/personFactory.js`, `legacy.js`) and `SAVE_SCHEMA` bumped to **26** in `state/saveSystem.js` + the `legacy.js` mirror.

- ⚠ **High impact** — **Unified event core (`recordEvent` / `recordMilestone`)** — One routing core in `sim/situationLog.js` now owns tier semantics, memory outcome-line composition, and the dev guardrail. `recordSituationResolution` (situations) and the new `recordMilestone()` (standalone life events) both delegate to it. `recordMilestone(player, { record, title, narrative, reward, memoryCategory, type, apply, effects })` runs `apply()` and auto-diffs effects so the memory self-describes its result. Added an optional annals `type` passthrough (`button.annalsType` / `tpl.annalsType`) so framework-owned annals lines keep good/bad coloring, and a `warnIfEmpty` flag (off for `recordMilestone`, on for situations). **Watch for:** standalone milestones that embed live HTML person-links (births, marriage, NPC deaths) intentionally stay on `proposeAnnals` — the milestone framework writes plain narrative only.

- **Phase 2 — university situations onto the framework** — The six recurring yearly university events (debate, lab accident, thesis crisis, patron offer, seminar, tuition) are now `record: 'flavor'` (chronicle-only) with their per-button `proposeAnnals` removed; the framework writes the annals line (typed via `annalsType`). The four enrollment templates are unchanged (their `enrollInDegree` helper already writes annals + an education memory). Fixed a chronicle gap: the Rookeries `syndicate_collects` ambush now logs to Annals (was silent) (`data/educationSituations.js`, `data/rookeriesSituations.js`).

- **Phase 3 — standalone milestones onto `recordMilestone`** — Degree completions and "Schooling Complete" (`sim/educationTick.js`), prison sentence/release (`sim/prison.js`), player death (`sim/mortality.js`), career-begun and school/university dropout (`legacy.js`) now route through `recordMilestone`, so they share the framework's memory outcome line + category. The doctorate's `+5 Intelligence` now surfaces as the memory's outcome line. Retired the bespoke `sim/educationChoiceMemory.js` (`applyEducationChoice`); **A Crossroads at School** (`primary_crossroads`) is now a framework `milestone`. Career promotions/demotions, NPC deaths/births, and marriage stay on `proposeAnnals` (HTML person-links / NPC chronicle).

### Removed

- **NSFW mode** — Removed settings toggle, new-game age-gate prompt, trait gating, and dual interaction copy. Siren is always selectable at creation when `beguiling` is chosen; intimacy interaction is always labeled **Make Love** (`legacy.js`, `index.html`, `sim/traits.js`, `sim/personInteractions.js`, `ui/personInteract.js`, `data/traits.js`, `styles/legacy.css`).

- **Situation Log panel** — The Situations sub-tab no longer renders a resolved-situations list; minor beats live in the chronicle (Annals) and milestones in Memories. Dropped `renderSituationLogHtml` and the panel's log section (`sim/situationLog.js`, `legacy.js`).

- **`sim/educationChoiceMemory.js`** — Folded into the unified `recordMilestone` framework; its `applyEducationChoice` had no remaining callers.

### Added

- **Hobby system (v1)** — `data/hobbies.js` defines 12 hobbies with unlock requirements; player `hobbies` skill map (1–100, diminishing gains); drill-down Hobbies UI with Endeavors/Crafting tabs; Botany **Forage** endeavor (1 AP). Shares yearly action-point pool (`sim/hobbies.js`, `ui/hobbiesPanel.js`).

- ⚠ **High impact** — **Save schema 24** — adds `hobbies: {}` on persons. **Watch for:** older saves migrate to empty hobby skills; mid-year levels persist until next year.

- **Action points** — player gets 20 AP per calendar year for character interactions (1 AP each); Circumstance sidebar bar; interact buttons show cost and disable at 0 AP; refills on Pass the Year and prison years (`sim/actionPoints.js`).
- **`Legacy-Vite/scripts/smoke-test.mjs`** and **`npm run test:smoke`** — Playwright headless regression check: new game, 40-year age-up, save/load and JSON round-trip (schema 23).
- **`?smoke=1` test mode** — skips character creation and exposes `window.__LEGACY_TEST__` for automation only (not active in normal play).
- **`REFACTOR_ROADMAP.md`** — phased centralization plan (Phase 1 landmines/dupes next, then data → sim → UI).

- **`CHANGELOG.md`** — agent-maintained change log (this file).
- **`.cursor/rules/changelog.mdc`** — rule requiring agents to update the changelog.
- **`state/personFactory.js`** — centralized person creation and stat inheritance.
- **`data/names.js`** — Victorian first-name and surname pools.
- **`utils/random.js`** — shared `rollNormal()` helper.
- **`data/relationshipDecay.js`**, **`sim/relationshipDecay.js`**, **`sim/humorRelationshipMods.js`** — yearly relationship decay and Four Humors gain/loss modifiers.
- Relationship edge field **`enthrallmentFloor`** (save schema 21) for future vampire enthrallment minimums.
- **`G.memories`** curated milestone log and **Journal → Memories** panel (births, marriages, deaths, education/career starts, story beats, items, traits).
- **`data/memoryCategories.js`**, **`sim/memories.js`**, **`ui/memoriesPanel.js`** — memory recording and rendering.

- Marriage proposal result popups (success, decline, insufficient bond refusal, cannot afford ring).
- NSFW mode toggle (settings + new-game prompt); Siren trait gated behind NSFW.
- **Scions** family tab section (great-grandchildren and beyond).

### Changed

- ⚠ **High impact** — **Save schema 23** — adds `actionPoints` / `actionPointsMax` on persons (default 20). **Watch for:** older saves gain full AP on load via `migratePerson`; mid-year AP persists until the next year tick.

- **Phase 4 refactor** — moved theme/vocab, section navigation, HUD render orchestration, relations labeling, people search, person info modal, bloodline tree UI, and person interact wiring from `legacy.js` into `ui/theme.js`, `ui/navigation.js`, `ui/renderHud.js`, `ui/relations.js`, `ui/searchPanel.js`, `ui/personInteract.js`, `ui/personModal.js`, and `ui/bloodline.js`; `legacy.js` registers UI hooks for render, portraits, and panel callbacks.

- **Phase 3 refactor** — moved year-tick simulation from `legacy.js` into `sim/careers.js`, `sim/educationTick.js`, `sim/events.js`, `sim/mortality.js`, and `sim/siblings.js`; added `currentFertility` to `sim/conception.js` and `isJournaled` to `sim/journal.js`; `legacy.js` registers sim hooks for situations, annals HTML, and UI refresh.

- **Phase 2 refactor** — moved `ERAS`, `CAREERS`/`CAREERS_BY_ID`, `EDUCATION_LADDER` (+ derived lookups), and `PLAYER_EVENTS` from `legacy.js` into `data/eras.js`, `data/careers.js`, `data/education.js`, and `data/playerEvents.js`; updated `data/index.js` barrel.

- **Phase 1 refactor** — quarantined broken `data/index.js` exports (`careers.js`, `education.js`); documented safe `sim/index.js` barrel; extended `state/index.js` with `personFactory` and `relationship`; removed duplicate `loadFromSlot`, inline `weightedPick`, and shadow `escapeHtml` from `legacy.js` (now uses `utils/*`).

- **School earned traits reworked** — `studious`, `charismatic_youth`, `troublemaker`, and `thesis_laureate` removed; crossroads choices and doctorate completion apply stats directly and write **Journal → Memories** entries (situation title, choice summary, stat line). Dropout and university **track** traits remain as hidden record-keeping on the person (`hidden: true`, not shown in trait UI). (append-only, up to 200 entries), not one winner per year. **`G.annalsCandidate` removed.** **Watch for:** older saves keep prior one-line-per-year annals; new years log multiple sidebar entries.
- ⚠ **High impact** — **Save schema 22** — adds `G.memories[]`; drops `annalsCandidate`. **Watch for:** loaded saves start with an empty Memories tab until new milestones occur.
- ⚠ **High impact** — **Relationship natural decay.** Each year, player↔NPC disposition, intimacy, and enthrallment drift toward 0 at configured rates (1.5 / 3 / 5 per year), with soft caps at 80 disposition, bonded slowdown when both stats exceed 80, and enthrallment >15 freezing disp/int decay. **Parents and grandparents are exempt.** **Watch for:** non-family bonds fading without interaction; save schema 21 migration adds `enthrallmentFloor`.
- ⚠ **High impact** — **Humor-scaled relationship changes.** `bumpDisposition` / `bumpIntimacy` / `bumpEnthrallment` now apply NPC humor `personalityMods` (Sanguine +40% intimacy gain, Choleric 2× insult disposition loss, etc.). **Watch for:** interact outcomes feeling stronger/weaker vs. before; new optional `context` argument on bump functions.
- Marriage proposals with intimacy below 50 now show a **Declined** refusal popup (with −5 disposition), not a passive “not yet” message; ring cost is deducted before the bond check.
- Family tab aunt/uncle headers: **Father's Siblings** / **Mother's Siblings** (no longer parent first names).
- Interact panel: Traits / Items / Interact toggle closes the sub-panel when clicked again (popup + bloodline focal).

### Fixed

- Marriage proposal popups not appearing for low-intimacy or unaffordable-ring attempts (now routed through `showProposalResult`).
- Main menu break when NSFW settings ran before `G_SETTINGS` existed (trait grid init moved after `loadSettings()`).
- Vampire “force refusal” flow: vampire-only button, two-step popup with narrative on second screen.

---

## Template (copy for new entries)

```markdown
### Added
- ...

### Changed
- ⚠ **High impact** — ... **Watch for:** ...

### Fixed
- ...
```
