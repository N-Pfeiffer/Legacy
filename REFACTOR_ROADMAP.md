# Legacy Refactor Roadmap

Decision record for centralizing and reorganizing the Legacy codebase. This follows the [codebase assessment](.cursor/plans/legacy_codebase_assessment_01f154b2.plan.md) (May 2026).

## Chosen execution order

| Phase | Focus | Risk | Status |
|-------|--------|------|--------|
| **0** | Safety net (smoke test) | Low | **Done** — `npm run test:smoke` |
| **1** | Stop the bleeding (landmines + dupes) | Low | **Done** |
| **2** | Centralize data | Low | **Done** |
| **3** | Centralize simulation | Medium | **Done** |
| **4** | Centralize UI | High | **Next** |

**Rationale:** Fix dependency landmines and duplication before moving large blocks out of `legacy.js`. Data extraction is safest (no DOM, minimal state coupling). Simulation depends on stable data modules. UI is the most DOM-coupled and should move last.

## Phase 0 — Safety net (complete)

- **`Legacy-Vite/scripts/smoke-test.mjs`** — Playwright headless test: `?smoke=1` skips creation, starts game, ages 40 years, save/load + JSON round-trip.
- **`window.__LEGACY_TEST__`** — exposed only when `?smoke=1` is in the URL (not in normal play).
- Run before/after every extraction: `cd Legacy-Vite && npm run test:smoke`

## Phase 1 — Stop the bleeding (complete)

### 1a. Quarantine barrel landmines

- [`data/index.js`](Legacy-Vite/src/data/index.js) — removed `export *` from incomplete `careers.js` and `education.js`.
- [`sim/index.js`](Legacy-Vite/src/sim/index.js) — documented excluded broken modules; exports only finished sim files.

### 1b. Duplication / bugs fixed

- Removed duplicate `loadFromSlot` in `legacy.js`.
- `weightedPick` now imported from `utils/weightedPick.js` (inline copy removed).
- Local `escapeHtml` shadow removed; uses re-export from `ui/eventLog.js` → `utils/escapeHtml.js`.

### 1c. Barrel hygiene

- [`state/index.js`](Legacy-Vite/src/state/index.js) now exports `personFactory` and `relationship`.

**Exit criteria met:** `npm run test:smoke` green; barrels import-safe; duplicate helpers removed.

Per-domain: when extracting careers/education/events in Phase 2, **replace** the fragment files rather than wiring the broken stubs.

**Allowed exception:** `state/person.js` and `state/saveSystem.js` import from `sim/*` for save-time migrations only.

**Exit criteria met:** `legacy.js` imports data modules; smoke test green; inline tables removed from monolith.

## Phase 2 — Centralize data (complete)

Moved inline tables from `legacy.js` into `data/*`:

1. **`ERAS` / `currentEra` / `eligibleEras`** — wired from [`data/eras.js`](Legacy-Vite/src/data/eras.js).
2. **`CAREERS` / `CAREERS_BY_ID`** — [`data/careers.js`](Legacy-Vite/src/data/careers.js) (replaced broken fragment).
3. **`EDUCATION_LADDER`** + derived lookups — [`data/education.js`](Legacy-Vite/src/data/education.js).
4. **`PLAYER_EVENTS`** — [`data/playerEvents.js`](Legacy-Vite/src/data/playerEvents.js).

[`data/index.js`](Legacy-Vite/src/data/index.js) re-exports all four. Helper scripts: `scripts/extract-phase2-data.mjs`, `scripts/patch-legacy-phase2.mjs`.

## Phase 3 — Centralize simulation (complete)

Year-tick bodies moved from `legacy.js` into `sim/*`:

- [`sim/careers.js`](Legacy-Vite/src/sim/careers.js) — assignment, progression, wealth gravity, display helpers
- [`sim/educationTick.js`](Legacy-Vite/src/sim/educationTick.js) — `tickEducation`, degree gates, stage labels
- [`sim/events.js`](Legacy-Vite/src/sim/events.js) — `processPlayerEvents`
- [`sim/mortality.js`](Legacy-Vite/src/sim/mortality.js) — `checkMortality`, `killPerson` (annals-based)
- [`sim/siblings.js`](Legacy-Vite/src/sim/siblings.js) — `spawnPendingSiblings`
- [`sim/conception.js`](Legacy-Vite/src/sim/conception.js) — added `currentFertility`
- [`sim/journal.js`](Legacy-Vite/src/sim/journal.js) — added `isJournaled`

`legacy.js` registers hooks for `fireSituation`, `personNameHtmlAnnals`, `render`, and age-up disable. `runYearTick` deps now come from sim modules.

**Deferred (before large population features):** `peopleById` index; relationship bucket demotion in `syncSocialBuckets`.

Helper scripts: `scripts/extract-phase3-sim.mjs`, `scripts/patch-legacy-phase3.mjs`.

## Phase 4 — Centralize UI (done)

Extracted from `legacy.js` into UI modules:

- [`ui/theme.js`](Legacy-Vite/src/ui/theme.js) — `applyVocab`, `currentMode`, `setMode`, `toggleEmbrace`.
- [`ui/navigation.js`](Legacy-Vite/src/ui/navigation.js) — `SUBNAV`, sub-tab routing, `showSection`.
- [`ui/renderHud.js`](Legacy-Vite/src/ui/renderHud.js) — HUD stat bars, section panel orchestration.
- [`ui/relations.js`](Legacy-Vite/src/ui/relations.js) — `relationLabel`, search relation tags.
- [`ui/searchPanel.js`](Legacy-Vite/src/ui/searchPanel.js) — Memories people search.
- [`ui/personInteract.js`](Legacy-Vite/src/ui/personInteract.js) — focal/modal interact actions.
- [`ui/personModal.js`](Legacy-Vite/src/ui/personModal.js) — person info overlay.
- [`ui/bloodline.js`](Legacy-Vite/src/ui/bloodline.js) — bloodline tree, clan/minions/relations tabs.

`legacy.js` (~4,577 lines) registers UI hooks for render, portraits, item popups, and panel callbacks. Smoke test green.

Helper scripts: `scripts/extract-phase4-ui.mjs`, `scripts/patch-legacy-phase4.mjs`.

## Phase 5 — Further extractions (next)

Remaining inline in `legacy.js`: character creation, vocation/career UI, situations/decisions panels, save/settings overlay.

**Exit criteria:** `legacy.js` is bootstrap + wiring only (~500–1000 lines target); smoke test green.

## Known issues to track (not blocking Phase 1)

- **`migrateSave` schemas 13–15** — ladder jumps 12 → 16; confirm intentional or backfill comments.
- **Prison year** — full world tick skipped while player is incarcerated (document or revisit).
- **Abandoned hooks** — sim hook registrars are now wired from `legacy.js` at startup.

## Workflow for each change

1. Run `npm run test:smoke` (baseline).
2. Make one focused extraction or fix.
3. Run smoke test again.
4. Add entry under `[Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md).
5. Flag **High impact** if touching save schema, `migrateSave`, `createPerson`, or `G.people`.
