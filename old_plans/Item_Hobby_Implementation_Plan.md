# Item & Hobby System — Implementation Plan (Handoff for Composer 2.5)

> **Audience:** an autonomous coding agent (Composer 2.5) implementing this in the
> `Legacy-Vite` codebase. Read this whole document before writing code. Work **phase by
> phase, in order**. Each phase is independently shippable and has its own acceptance
> criteria. Do **not** start a phase until the previous phase's acceptance criteria pass.

---

## 0. Context & Locked Decisions

This expands the existing item/hobby foundation into a full gather → craft → equip/consume loop.
The design source-of-truth is `Items_and_Hobbies.txt` (catalog/recipes) and
`Legacy_ToDo.txt` lines 10–16 & 37–56 (system requirements). This plan supersedes any
ambiguity in those files; where they conflict, **follow this document**.

**Decisions already made (do not re-litigate):**

1. **Inventory model = hybrid (two stores).**
   - `person.materials = { [itemId]: count }` — counted map for **fungible** items
     (categories `material`, `component`, `consumable`).
   - `person.equipment = [ { uid, id } ]` — array of **instances** for `equipment`-category items.
     `uid` is a unique string per instance. **Leave room for future `durability`/`enchant`
     fields but DO NOT build them now** — instances carry only `{ uid, id }`.
   - `person.equipped = { mainHand, offhand, body, head, back, jewelry:[4], artifacts:[4] }` —
     slots reference equipment instances by `uid` (or `null`).
2. **Stats come from EQUIPPED gear only**, not ownership. (Today they come from ownership;
   this is a deliberate reversal — see Phase 1.)
3. **Save migration: start everything unequipped.** On migrate, move owned items into the
   correct new store; equipment instances go into `person.equipment` with **no slot filled**.
   Players re-equip manually. (Accept a one-time visible stat drop after update.)
4. **Plan is phased** (this document).
5. **Hidden attribute system (yield/social/enthrallment modifiers) is OUT OF SCOPE.** Do not
   add it, not even schema stubs.
6. **Durability/enchantment are OUT OF SCOPE** (only "leave room" per #1).

**Dependency note:**
- The **Cunning** attribute (e.g. Hunting "40 Cunning") **does not exist yet** — it is built
  **in this pass as Phase 6**, sequenced *before* Hunting (Phase 7) so its gates function.
- The **Blood/Hunger** vampire stat **does not exist yet and is OUT OF SCOPE this pass** (it
  will be wired later). Wherever a gate or effect references it (Drain-for-Blood hunting branch,
  Blood Vial vampire effect), implement the non-Blood side and guard the Blood side with an
  explicit `// TODO: Blood/Hunger stat` — never half-build it.
- The **minion system** has display infrastructure (`minionIds`, `minionType` herd/ghoul in
  `ui/bloodline.js`) but **no creation helper** — Séance is therefore **stubbed** (Phase 7).
- **Witness events** for hunting mortals are **deferred/stubbed** (Phase 7).

---

## Phase Roadmap (execute strictly in order)

| Phase | Title | Risk | Why this order |
|---|---|---|---|
| 1 | Inventory Data Model + Migration | **High** | Keystone; everything depends on the hybrid stores + equip-based stats. |
| 2 | Inventory & Equipment UI | Med | Makes the new stores visible/manipulable. |
| 3 | Gathering Engine (Botany/Metallurgy/Angling) | Med | Produces materials the rest consumes; includes hobby cleanup. |
| 4 | Crafting Engine | Med | Consumes materials → components/equipment. |
| 5 | Consumables (Use Flow) | Low | Closes the basic loop (use potions). |
| 6 | **Cunning Attribute (+ school events)** | **High** | New core stat + migration; must precede Hunting so its Cunning gates work. |
| 7 | Hunting, Stalking, Scholarship & Mysticism | Med | Advanced subsystems; depends on Cunning (P6) + crafting (P4). |
| 8 | Polish & ToDo cleanup | Low | Greyed locked hobbies, forage flavor, etc. |

Do **not** begin a phase until the prior phase's acceptance criteria (incl. CHANGELOG + build +
smoke) pass.

---

## 1. Current State (verified — read these files first)

| Concern | File | Current behavior |
|---|---|---|
| Item catalog | `src/data/items.js` | Flat `ITEMS[]`; each item `{id,label,type(rarity),category('weapon'\|'relic'\|'other'),whileOwned,...}`. `ITEMS_BY_ID`, `WEAPON_ITEMS`, `itemsByCategory()`. |
| Item ownership API | `src/sim/personItems.js` | `person.items: string[]`. `hasItem/ownedItemIds/grantItem/removeItem/itemIsSingleUse/consumeSingleUseItem/clearItems`. **Single-instance** (`grantItem` returns false if already owned). |
| Back-compat shim | `src/sim/playerItems.js` | Re-exports `personItems.js`. Many callers import from here. |
| Stat bonuses | `src/sim/itemEffects.js` | `itemBonusesFromOwnership()` sums `whileOwned` over **owned** items → `effectiveStat()`. |
| Prowess | `src/sim/prowess.js` | `currentProwess()` adds `itemBonus(p,'prowess')` (ownership-based). |
| Hobby data | `src/data/hobbies.js` | `HOBBIES[]` w/ `{id,label,icon,description,tags,requires,endeavors,hasCrafting}`. Includes **Woodworking** and **Archery** (to be changed). Only Botany has one endeavor (`forage`). |
| Hobby sim | `src/sim/hobbies.js` | `person.hobbies:{id:level}`. Skill gain w/ diminishing returns. Age gates. `runHobbyEndeavor()` spends AP + raises skill; **yields no items**. |
| Hobby UI | `src/ui/hobbiesPanel.js` | List→detail w/ **Endeavors / Crafting** subtabs. `renderCraftingBody()` is a literal placeholder. |
| Possessions UI | `src/ui/renderPossessions.js` | Flat grid of owned items; opens `itemPopup`. |
| Item popup | `src/ui/itemPopup.js` | Modal: icon/name/type/effect/description/vampireUse + optional decision link. |
| Person schema | `src/state/person.js` | `PERSON_DEFAULTS` includes `items:[]`, `hobbies:{}`. `migratePerson()` backfills. |
| Save system | `src/state/saveSystem.js` | `SAVE_SCHEMA = 26` (also duplicated in `src/legacy.js:1059`). `migrateSave()` runs ordered `if (save.schema < N)` blocks, stamps `save.schema = SAVE_SCHEMA` at end. |
| AP | `src/sim/actionPoints.js` | `canSpendActionPoints/spendActionPoints`; 20 AP/year. |
| Item API consumers (must keep working) | `src/legacy.js` (~137, 1594, 2315, 3786, 3810), `src/sim/decisionGates.js`, `src/data/rookeriesSituations.js`, `src/ui/personPanels.js`, `src/sim/mudlarkLockbox.js` | Use `hasItem/grantItem/removeItem/ownedItemIds/consumeSingleUseItem`. |

**Implication:** The public functions `hasItem/grantItem/removeItem/ownedItemIds/
consumeSingleUseItem` are used widely. **Keep their names and semantics working** through
the migration (they should transparently handle both stores). New material-specific APIs are
added alongside.

---

## 2. Catalog & Taxonomy Conventions (used by all phases)

### 2.1 Item schema (extend `src/data/items.js`)

Every catalog entry gains a **`category`** on a new 4-value axis (replaces the old
`weapon|relic|other`):

```js
/** @typedef {'equipment'|'material'|'component'|'consumable'} ItemCategory */
```

Per-category required/optional fields:

- **All items:** `id, label, category, type (rarity), description`, and **`art`** (the descriptor
  from §2A.8 — `{kind:'emoji'|'svg'|'image', …}`; a legacy `icon` string is still read as an emoji
  fallback). Optional `vampireUse`.
- **`equipment`:**
  - `slot`: one of `'mainHand'|'offhand'|'body'|'head'|'back'|'jewelry'|'artifact'`.
  - `twoHanded: true` (optional) — occupies BOTH `mainHand` and `offhand` (bows).
  - `whileEquipped: { stat: delta }` — stat bonuses **applied only when equipped**
    (rename of today's `whileOwned`; see Phase 1 migration).
  - `effectSummary` (display string).
- **`material` / `component`:** no stats; these are crafting inputs/outputs. Optional `zone`
  metadata is NOT stored on the item (zones live in the gathering tables, §Phase 3).
- **`consumable`:** `onUse: { ... }` effect descriptor (see Phase 5). Optional `singleUse`
  semantics fold into consumables.

Keep `ITEM_TYPES` (rarity) as-is. Add:

```js
export const ITEM_CATEGORIES = { equipment:'Equipment', material:'Materials',
  component:'Components', consumable:'Consumables' };
export function itemsByCategory(category) { /* keep, now uses .category 4-axis */ }
```

**Back-compat:** existing items `skinny_dagger/rapier/.../longbow` had `category:'weapon'`.
Re-tag them `category:'equipment', slot:'mainHand'` (bows `slot:'mainHand', twoHanded:true`).
Relics (`ominous_relic/mysterious_relic/artifact`) → `category:'equipment', slot:'artifact'`.
`mudlarks_lockbox` → keep its `decisionId`; tag `category:'consumable'` (it's opened/consumed
via decision) OR `equipment` with no stats — **use `consumable`** so it lands in the materials
store and the existing mudlark decision flow still finds it via `hasItem`.

### 2.2 Equipment slots (authoritative list)

From `Legacy_ToDo.txt:41-42`:

| Slot key | Count | Accepts |
|---|---|---|
| `mainHand` | 1 | weapons; two-handed bows occupy this + `offhand` |
| `offhand` | 1 | offhand weapons/shields; blocked while a `twoHanded` mainHand is equipped |
| `body` | 1 | robes, armor |
| `head` | 1 | hood, circlet, helmet |
| `back` | 1 | cloak, backpack |
| `jewelry` | 4 | necklace, ring (array of 4 uid-or-null) |
| `artifacts` | 4 | relics, tomes (array of 4 uid-or-null) |

### 2.3 New items to add (full catalog)

Add **every** item referenced by the recipes/zones below. Source: `Items_and_Hobbies.txt`.
Group them by category. Pick sensible `icon` emoji and `type` (rarity) matching the zone
rarity where specified. (Composer: generate the full list; the tables in Phases 3–6 enumerate
every name. Each name that isn't already in `items.js` becomes a catalog entry.)

- **Materials (raw, from gathering):** Rushes, Flax, Willow Bark, Valerian Root, Foxglove,
  Yarrow, Mugwort, Belladonna, Wolfsbane, Copper Scrap, Tin Scrap, Clay, Lead, Limestone,
  Wrought Iron Ore, Silver Ore, Quartz, Lodestone, Raw Gold, Raw Gemstone, Bismuth,
  Quicksilver, Simple Pelt, Fine Pelt, Exceptional Pelt, Legendary White Pelt,
  Legendary Wolf Pelt, Bone, Raw Wool, Feather, Badger Claw, Tusk, Animal Heart,
  Great Animal Heart, Human Heart, Lycanthrope Heart, Bear Fat, Werewolf Fang, Vial of Blood,
  Blank Vellum. *(Note: "Grass" appears in the design's example annals string — add it as a
  common Botany filler material.)*
- **Components (tier-2, from crafting):** Apothecary's Solvent, Analgesic Extract,
  Yarrow Tincture, Neurotoxin Alkaloid, Bronze, Iron, Vessel, Glass, Steel, Silver, Gold,
  Liquid Silver, Polished Bismuth, Polished Gem, Jewel Setting, Cured Leather, Thick Hide,
  Pristine Leather, Bone Meal, Bone Fasteners, Insulating Down, Parchment, Linen Thread,
  Wool Yarn, Buckles, Leather Straps, Bone Needle, Notes, Candles, Tallow.
- **Consumables:** Oneiric Resin, Elixir of Comprehension, Stalker's Brew, Blood Vial,
  Wolfsbane Poison.
- **Equipment (craftable):** Ornate Cane (Concealed Sword), Noble Signet Ring, Telescope,
  Bismuth Aegis Ring, Bloodstone Amulet, Leather Armor, Footpad's Cloak. Plus existing weapons.

> **Unresolved costs flagged in the design** (resolve with the placeholder values given in
> Phases 3–6; mark each `// BALANCE: provisional`):
> `Steel` uses vague "AlchemyIngredient" → use **Apothecary's Solvent**.
> `Wolfsbane Poison` ends in "+ ?" → use **+ Yarrow Tincture**.
> `Create Tome` cost "5 Blank Vellum + ?" → use **5 Blank Vellum + Notes**.
> `Apothecary's Solvent` "4 Rushes (adapt for balance)" → **4 Rushes**.
> Any other `?` → pick the cheapest thematically-fitting input and flag it.

---

## 2A. UI Conventions & Specifications (read before any UI phase)

All UI phases (2, 3, 4, 6) build into the **existing** hand-built CSS system. Match it; do not
introduce a framework, utility-class library, or inline-style soup.

### 2A.1 House conventions (mandatory)
- **Theme variables only** for color/typography — never hardcode hex in new rules. Palette lives
  in `src/styles/legacy.css` `:root` (and a vampire override block). Use:
  `--gold` (accent/filigree), `--raised` (card bg), `--border-strong` (card border),
  `--text` / `--text-dim` / `--muted` (text tiers), `--green` (skill/positive),
  fonts `--display` (Cinzel, ALL-CAPS labels), `--heading` (Cormorant, names), `--body` (EB Garamond, prose).
- **Vampire mode**: theme vars auto-swap via the root theme; only add a `body.vampire-mode .foo`
  rule when a component needs a *different treatment* than a recolor (see `.item-modal` example
  in `legacy-items.css`). Default to letting variables do the work.
- **New CSS goes in `src/styles/legacy-items.css`** (item/equip/inventory) and the existing hobby
  blocks in `src/styles/legacy.css` (gathering/crafting, to sit beside `.hobby-*`). Don't create
  new stylesheets.
- **Markup is built in JS render fns** (string templates), wired with `addEventListener` after
  `innerHTML`. **Always pass user/data strings through `escapeHtml`** (import from `ui/eventLog.js`).
- **Re-render through the existing hook** (`hooks.render()` in panels; see `hobbiesPanel.js`).
  After any mutation (equip, craft, gather, use), re-render the panel so counts/bars update.
- **Reuse existing classes** before inventing: `.items-panel`, `.items-grid`, `.item-grid-card`,
  `.item-grid-icon|label|type`; `.hobby-card`, `.hobby-detail-*`, `.hobby-section-nav|btn`,
  `.hobby-skill-bar`/`.stat-bar`/`.stat-fill`; `.career-confirm-btn` (the standard action button,
  already reused for endeavors); `.placeholder-card`/`.placeholder-emblem`/`.placeholder-text`
  (empty states).
- **Responsive**: relative units; grids use `repeat(auto-fill, minmax(min(Npx,100%),1fr))` like
  `.items-grid`; add a `@media (max-width:480px)` tightening pass mirroring the existing one.
- **Containers already exist in `index.html`**: `#est-panel-hobbies`, `#est-panel-possessions`
  (Estate → Hobbies/Items sub-tabs, see `ui/navigation.js`), and the popup
  `#item-overlay > #item-modal`. New panels render *into* these — don't add new top-level sections.

### 2A.2 Possessions screen — Equipped Slots + Inventory (Phase 2, `ui/renderPossessions.js`)
Renders into `#est-panel-possessions`. Two stacked regions:

```
┌ EQUIPMENT ─────────────────────────────────────────────┐
│  [Main Hand] [Off Hand] [Body] [Head] [Back]           │   ← single slots
│  Jewelry:  [J1][J2][J3][J4]                             │   ← 4-slot row
│  Artifacts:[A1][A2][A3][A4]                             │   ← 4-slot row
├ INVENTORY ─────────────────────────────────────────────┤
│  ‹Equipment› ‹Materials› ‹Components› ‹Consumables›     │   ← category tabs (or sticky groups)
│  ┌────┐ ┌────┐ ┌────┐   grid of .item-grid-card        │
│  │ 🗡 │ │ ◆ │ │🌿×3│   (stack badge ×N on fungibles)   │
│  └────┘ └────┘ └────┘                                   │
└─────────────────────────────────────────────────────────┘
```
- **Slots block**: a `.equip-slots` grid; each slot is a `.equip-slot` button with a
  `data-slot="mainHand"` (and `data-slot-index` for jewelry/artifacts arrays). Filled slot shows
  the item `.item-grid-icon`; empty slot shows a dim slot glyph + slot name (use `--muted`).
  Two-handed weapon equipped → render the `offhand` slot in a visibly **disabled/locked** state
  (e.g. `.equip-slot--locked`) with a small "held in both hands" affordance.
  - Click filled slot → `unequipItem(player, uid)` → re-render.
  - Hover/focus → tooltip with item name (reuse `title=` for now).
- **Inventory block**: grouped by `ITEM_CATEGORIES`. Either 4 category tabs (mirror
  `.hobby-section-nav`/`.hobby-section-btn`) or 4 labeled groups; **tabs preferred** for parity
  with the hobby detail UI. Each item is an `.item-grid-card`; fungibles add a corner
  `.item-stack-badge` showing `×N` (new class, small, `--display` font, top-right absolute).
  - Click an `equipment` card → open item popup (which now has an Equip button), OR direct-equip
    on click with the popup as the detail view — **use the popup** for consistency.
- **Empty states**: keep the existing `.placeholder-card` markup already in `renderPossessions.js`.

### 2A.3 Item popup additions (Phases 2 & 5, `ui/itemPopup.js` + `legacy-items.css`)
The modal structure exists (`.item-popup-name/meta/type/effect/description`, close button,
decision link). Add, between meta and description:
- **Category + quantity line** for fungibles (e.g. `Materials · ×3`) using `.item-popup-meta` style.
- **Equip/Unequip button** for `equipment` (reuse `.item-popup-decision-link` styling or a new
  `.item-popup-action-btn`): label toggles on `isEquipped`; on click call equip/unequip + refresh
  the popup (`refreshOpenItemPopup`) and the possessions panel.
- **Use button** for `consumables` (Phase 5): label e.g. "Use" / "Drink"; disabled with reason
  when `!canUse` (e.g. vampire-only on a mortal). On use → `useConsumable` → annals → refresh.

### 2A.4 Gathering — zone picker + result (Phase 3, `ui/hobbiesPanel.js`)
Reachable from a hobby's **Endeavors** tab (the gathering hobbies). Replace the single Forage
button with a **zone list**:
```
Endeavors ▸ Forage
  ┌─────────────────────────────────────────┐
  │ The Thames            1 AP   [Forage ▸] │   ← enabled
  │ The Outlands          2 AP   [Forage ▸] │
  │ The Deep Forest       3 AP   [Forage ▸] │
  │ The Cornwall Deeps    4 AP   🔒 Req 75   │   ← locked: greyed + req text
  └─────────────────────────────────────────┘
```
- Each row `.gather-zone-row`: name (`--heading`), AP cost chip, and a `.career-confirm-btn`
  action (disabled when AP insufficient OR skill req unmet; locked rows show the requirement in
  `--muted` instead of a button).
- On gather → run sim → re-render → the **result is an annals line** (existing `proposeAnnals`
  flow, like endeavors today). Do **not** build a separate results modal; the annals enumerating
  "gained 2 Rushes and 1 Willow Bark" is the feedback. (Hunting Phase 7 reuses this zone-row UI.)

### 2A.5 Crafting — recipe list (Phase 4, `ui/hobbiesPanel.js`, replaces `renderCraftingBody()`)
Renders in the existing **Crafting** sub-tab of a crafting hobby's detail view:
```
Crafting
  ┌───────────────────────────────────────────────┐
  │ ⚗ Apothecary's Solvent                         │
  │    Rushes 2/4   ·   Skill 0   ·   1 AP         │   ← red on shortfalls
  │                                   [Craft]      │   ← disabled if !canCraft
  ├───────────────────────────────────────────────┤
  │ ⚗ Yarrow Tincture                              │
  │    Yarrow 1/1 · Apothecary's Solvent 0/1 …     │
  └───────────────────────────────────────────────┘
```
- Each recipe `.craft-recipe-row`: output name+icon; an inputs line listing each
  `name owned/required` (wrap each in a span; add `.craft-input--short` → `--muted`/red when
  `owned < required`); skill-req and AP chips; a `.career-confirm-btn` **Craft** disabled when
  `!canCraft(player, recipeId)`. On craft → re-render (counts/bars update live).
- Recipes whose `skillReq` exceeds current skill render **locked** (greyed + "Requires <hobby> N").

### 2A.6 Cunning stat bar (Phase 6, `ui/renderHud.js` + stat-list UIs)
Add a Cunning bar adjacent to the existing Insight/Charisma bars using the **same `bar()` helper**
already in `renderHud.js` (`bar('cunning', effectiveStat(player,'cunning'))`). Match the existing
bar markup/classes exactly — no new bar styling. Ensure `ui/personPanels.js` and the person modal
enumerate Cunning wherever they list the other attributes (charisma/intelligence/insight).

### 2A.7 UI acceptance bar (applies to every UI phase)
- [ ] No hardcoded colors/fonts — theme variables only; verify in both mortal and vampire mode.
- [ ] Reuses existing classes where they fit; new classes namespaced (`.equip-*`, `.gather-*`,
      `.craft-*`, `.item-stack-badge`).
- [ ] All dynamic strings escaped; all controls keyboard-focusable (`<button>`, not clickable div).
- [ ] Re-renders through the panel hook after every mutation; counts/bars/slots update live.
- [ ] `@media (max-width:480px)` pass added; grids wrap; no horizontal scroll at 360px width.

### 2A.8 Art & Iconography (zones, items, hobbies)

**Current reality:** there is **no icon system** — `icon: '🌿'` strings are emoji rendered as
text (`<span>${escapeHtml(h.icon)}</span>`). `public/icons.svg` is unused Vite-template
boilerplate (social logos); `src/assets/hero.png` etc. are unused. The game's *actual* art
technique is **code-authored inline SVG** (the `feTurbulence` paper-noise data-URIs in
`legacy.css`). Emoji can't be recolored, render inconsistently per-OS, and can't give a zone "its
own look." This pass introduces a **data-driven, swappable art layer** so zones/items/hobbies get
real art now (SVG + per-zone CSS) and can escalate to painted raster later with **no call-site
changes**.

#### (a) The `art` descriptor + `renderArt()` helper — build this first (new: `src/ui/renderArt.js`)
Replace bare `icon:'…'` strings with a small descriptor that supports three `kind`s. Keep `icon`
as a back-compat fallback during migration.
```js
// On a zone / item / hobby entry:
art: { kind: 'emoji', glyph: '🏞️' }                         // status quo (fallback)
art: { kind: 'svg',   ref: 'zone-outlands' }                // sprite symbol (default this pass)
art: { kind: 'image', src: '/art/zones/the_outlands.webp' } // painted raster (later)
theme: 'outlands'   // optional CSS hook → .*-card[data-theme="outlands"]
```
`renderArt(art, { size, className, fallback })` returns a string:
- `emoji`  → `<span class="art art--emoji ${className}" aria-hidden="true">${escapeHtml(glyph)}</span>`
- `svg`    → `<svg class="art art--svg ${className}" aria-hidden="true" width=… height=…><use href="/art/sprite.svg#${ref}"/></svg>`
- `image`  → `<img class="art art--image ${className}" src="${src}" alt="" loading="lazy" decoding="async" width=… height=…>`
- Missing/unknown → render `fallback` (an emoji glyph) so nothing ever blanks out.
**Resolution order is just the explicit `kind`** — no magic. All current `.item-grid-icon` /
`.hobby-card-icon` / `.item-popup-icon` / zone-row / craft-row render sites call `renderArt`
instead of inlining the glyph.

#### (b) SVG track (default this pass — Composer authors these)
- One sprite file, `public/art/sprite.svg`, of `<symbol id="…" viewBox="0 0 24 24">` entries
  (mirror the existing `public/icons.svg` structure). Namespace ids: `zone-*`, `item-*`, `hobby-*`.
- Author **monochrome/duotone** symbols using `fill="currentColor"` (and at most one accent) so
  they inherit the theme via CSS `color` — works in both mortal and vampire palettes for free.
- Composer should generate a starter symbol for **every hobby**, **every gathering/hunting zone**,
  and **each crafted equipment item**; materials/components may keep emoji initially (`fallback`).
- Reference once via `<use href="/art/sprite.svg#…">` (the file is in `public/`, served at root —
  no import, no bundling).

#### (c) Per-zone CSS theme (pairs with SVG to give each zone a distinct *look*)
- Add a `data-theme="<zone>"` attribute to the zone card/row and define per-theme tokens in
  `legacy.css` beside the hobby blocks:
  `.gather-zone-row[data-theme="outlands"] { --zone-accent: …; background: …; }`.
- Reuse the existing `feTurbulence` data-URI texture, **tinted per zone** (swap the
  `feColorMatrix` values) for ambient paper/fog overlays. Keep it subtle (low opacity) so text
  stays legible. Suggested per-zone moods (from the design's own vibe words): Thames = cold green
  marsh; Outlands = dusty amber plains; Deep Forest/Weald = dark moss; Scrapyards = soot/iron;
  Cornwall Deeps = cold slate/quartz; Moors = grey-green shrub.

#### (d) Raster pipeline spec (deferred art, but wired now so drop-in is zero-code)
For painted set-pieces (zone banners, vampire **havens**) an AI *coding* agent can't paint — these
come from an **image model or artist**. Establish the convention now so adding files later needs no
code change:
- **Location & serving:** `public/art/<group>/<id>.webp` → served at `/art/<group>/<id>.webp`.
  Groups: `zones/`, `havens/`, `items/`. (Use `public/`, not `src/assets` imports, so art is
  add-by-convention and never bundled.)
- **Naming:** filename === the entity `id` (e.g. `public/art/zones/the_outlands.webp`). `renderArt`
  with `{kind:'image', src:'/art/zones/the_outlands.webp'}` — or derive the path from `id` if the
  entry sets `art:{kind:'image'}` with no `src`.
- **Format / size:** `.webp`, sRGB. Targets (`// BALANCE/ART: provisional`): zone **card thumb**
  320×320; zone **banner** 960×540 (16:9); haven scene 1280×720. Always set `width`/`height`
  on `<img>` to prevent layout shift; `loading="lazy"` + `decoding="async"`.
- **Blend with UI:** apply a CSS vignette/gradient overlay (and a `body.vampire-mode` tint) over
  raster art so it sits inside the gothic frame instead of looking pasted in.
- **Generation guidance — ALREADY WRITTEN at `public/art/README.md`** (full prompt-library: house
  style suffix, file specs, and a ready prompt for every zone + haven, plus a manifest checklist).
  Composer should **not** recreate it — just create the empty `public/art/{zones,havens,items}/`
  folders and ensure `renderArt`'s `image` kind resolves `/art/<group>/<id>.webp`. For reference,
  the README centers on: one consistent style suffix for cohesion,
  e.g. *"19th-century painterly oil illustration, moody candlelit Victorian gothic, muted
  parchment-and-tarnished-gold palette, no text, no people unless specified."* Per-image prompt =
  that suffix + the entity's design vibe words (the haven vibes are already written verbatim in
  `Legacy_ToDo.txt:274-280`; zone moods in §2A.8c). Keep a checklist of needed art in the README.
- **Fallback:** until a `.webp` exists, the entry keeps `kind:'svg'` (or emoji) — switching to
  `kind:'image'` is the only edit when art arrives.

#### (e) Migration of existing emoji
- Convert the existing `hobbies.js` and `items.js` `icon` fields to `art:{kind:'emoji',glyph}`
  (or author SVG symbols for them). Keep reading a legacy `icon` string as an emoji fallback in
  `renderArt` so nothing breaks mid-migration. No save-schema impact (art lives in catalog data,
  not on the person).

#### (f) Acceptance criteria (Art)
- [ ] `renderArt()` exists and is the single render path for all zone/item/hobby art; emoji,
      svg, and image kinds all render; missing art falls back to a glyph (never blank).
- [ ] `public/art/sprite.svg` exists with `zone-*`/`hobby-*`/`item-*` symbols using
      `currentColor`; they recolor correctly in both mortal and vampire mode.
- [ ] Each gathering/hunting zone has a distinct `data-theme` look (accent + tinted texture).
- [ ] Raster path works end-to-end: dropping `public/art/zones/the_outlands.webp` and flipping the
      entry to `kind:'image'` shows the painting with no other code change; layout doesn't shift.
- [ ] `public/art/README.md` (already authored) is present; `public/art/{zones,havens,items}/`
      folders exist.
- [ ] Build + smoke pass.

> **Phasing:** build (a)+(e) and the SVG sprite (b) as part of **Phase 2** (they underpin every
> item/zone render). The per-zone CSS themes (c) land with **Phase 3** (zones). The raster
> pipeline (d) is **spec + folder + README only** this pass — actual paintings are deferred (see
> "What We Have NOT Done").

---

## PHASE 1 — Inventory Data Model + Migration

**Goal:** Replace the flat `items: string[]` with the hybrid stores, flip stats to equip-based,
migrate saves, keep all existing callers working. **No new gameplay yet.**

### 1.1 Schema (`src/state/person.js`)
- Add to `PERSON_DEFAULTS`: `materials: {}`, `equipment: []`,
  `equipped: { mainHand:null, offhand:null, body:null, head:null, back:null,
  jewelry:[null,null,null,null], artifacts:[null,null,null,null] }`.
- **Keep `items: []`** in defaults during the transition (migration reads it, then it is
  emptied — do not delete the key, to avoid breaking any stray reader).

### 1.2 Inventory API (`src/sim/personItems.js`) — rewrite, keep exports stable

Add a `uid` generator (reuse `nextId()` from `gameState.js`, prefixed e.g. `eq_`).

New canonical functions:
```
addMaterial(person, id, n=1)        // materials map; clamps >=0
removeMaterial(person, id, n=1)     // returns false if insufficient
materialCount(person, id)           // number
addEquipment(person, id)            // pushes {uid,id}; returns uid
removeEquipmentByUid(person, uid)   // also clears any slot referencing it
listEquipment(person)               // [{uid,id}]
```
Keep + adapt existing exports so callers don't break:
- `grantItem(person, id, opts)` → looks up category: `equipment` → `addEquipment`;
  else → `addMaterial(...,1)`. Preserves the mudlark special-case + `logPlayerItemGained`.
  **Remove the "already owned returns false" behavior for materials** (stacking must work).
- `hasItem(person, id)` → true if `materialCount>0` OR any equipment instance has that id.
- `ownedItemIds(person)` → distinct ids across both stores (used by UI/personPanels).
- `removeItem(person, id)` → remove one: material decrement, else remove first equipment uid.
- `consumeSingleUseItem` / `itemIsSingleUse` → keep (now category `consumable` + `singleUse`).
- `clearItems(person)` → clears all three stores + equipped.

### 1.3 Equip/Unequip API (new: `src/sim/equipment.js`)
```
equipItem(person, uid)      // validates slot; handles twoHanded (fills mainHand+offhand,
                            // blocks if offhand occupied / unequips conflicts); for
                            // jewelry/artifacts fills first empty array index, else fails.
unequipItem(person, uid)    // clears the slot(s) holding uid
equippedUids(person)        // flat list of equipped uids (expand arrays)
equippedItems(person)       // [{uid,id,slot}]
isEquipped(person, uid)
slotForItem(itemId)         // from catalog .slot
```
Rules: an item type must match its slot; two-handed occupies both hand slots; if a slot is
full, equipping returns `{ok:false, reason}` (UI surfaces it). No auto-swap unless target is
the single-occupancy slot (then swap is fine).

### 1.4 Flip stats to equip-based (`src/sim/itemEffects.js`)
- Rename catalog field `whileOwned` → `whileEquipped` across `items.js`.
- `itemBonusesFromOwnership` → **`itemBonusesFromEquipped(player)`**: iterate
  `equippedItems(player)`, sum `whileEquipped`. Keep an exported alias of the old name for one
  release pointing at the new fn (or update all importers — there are few).
- `itemBonus`, `effectiveStat`, `effectiveInsight/Charisma/MeleeDamage` now read equipped.
- `traitWeaponProwessBonus`: only count weapons that are **equipped** (not merely owned).
- **Delete `migrateLegacyItemAcquireBonuses`** call path is replaced by the Phase 1 save
  migration; keep the function only if still referenced, else remove. `currentProwess`
  (`src/sim/prowess.js`) needs no change — it already calls `itemBonus`.

### 1.5 Save migration (`src/state/saveSystem.js` + mirror const in `src/legacy.js:1059`)
- Bump `SAVE_SCHEMA` 26 → **27** in BOTH locations.
- Add block `if (save.schema < 27) { for (const p of save.people) migrateInventory(p); }`.
- `migrateInventory(p)`:
  - Ensure `materials/equipment/equipped` exist (defaults).
  - For each id in legacy `p.items`: if catalog category `equipment` → `addEquipment` (UNequipped);
    else → `addMaterial(p,id,1)`. Preserve mudlark/relic specials.
  - Set `p.items = []`.
  - Because old stats were stored from ownership in some legacy saves, run the existing
    `migrateLegacyItemAcquireBonuses` logic ONCE here if `_possessionItemBonuses` is unset, so
    base stats aren't double-counted, THEN rely purely on equipped bonuses going forward.
- Add the human-readable comment block in the migration list (follow the existing style at
  `saveSystem.js:23-59`).

### 1.6 Update direct `.items` readers
- `src/legacy.js:1166,1343` (`if(!Array.isArray(p.items)) p.items=[]`) — leave (harmless) but
  ensure new stores are also initialized via `migratePerson`.
- `src/legacy.js:1594-1595` (debug grant/remove), `:2315` (start items), `:3786,:3810`
  (item grant UI) — route through `grantItem`/`removeItem` (already do) → now correct.
- `src/ui/personPanels.js` `ownedItemIds` count — now spans both stores; verify display reads
  sensibly (NPCs will mostly have equipment only).

### 1.7 Acceptance criteria (Phase 1)
- [ ] New game: player has empty `materials/equipment/equipped`; HUD stats unaffected.
- [ ] Loading a pre-27 save: owned weapons/relics appear in `equipment` **unequipped**; HUD
      prowess/insight drop by exactly the previously-applied item bonus; no console errors.
- [ ] `grantItem(player,'rapier')` twice → 2 entries in `equipment` (distinct uids).
- [ ] `grantItem(player,'rushes')` ×3 → `materials.rushes === 3`.
- [ ] Equipping the rapier raises prowess by its `whileEquipped.prowess`; unequipping reverts.
- [ ] Two-handed bow blocks offhand; jewelry/artifacts cap at 4.
- [ ] Mudlark lockbox decision + flintlock rookeries situation still function.
- [ ] CHANGELOG `[Unreleased]` updated (⚠ High impact — hybrid stores, schema 27, equip-based stats).
- [ ] `npm run build` and `npm run test:smoke` pass.

---

## PHASE 2 — Inventory & Equipment UI

**Goal:** Make the new stores visible and manipulable. No gathering/crafting yet.
**→ Build to the detailed specs in §2A.2 (possessions/slots) and §2A.3 (item popup). Honor the
§2A.1 conventions and the §2A.7 UI acceptance bar. Also build the art foundation here:
§2A.8(a) `renderArt` helper, §2A.8(b) SVG sprite, §2A.8(e) emoji migration, and stand up the
§2A.8(d) raster folder + `art/README.md`.**

### 2.1 Possessions panel (`src/ui/renderPossessions.js`)
- Render an **Equipped Slots** section at the top (per `Legacy_ToDo.txt:40`): a labeled grid
  of the 13 slots showing equipped item icon or an empty-slot affordance; click a filled slot
  → unequip; click an item in inventory → equip into its slot.
- Below it, an **Inventory** section grouped by `ITEM_CATEGORIES` (Equipment / Materials /
  Components / Consumables) as collapsible groups or tabs. Materials/components/consumables
  show a **quantity badge** (`×N`); equipment lists each instance.
- Reuse existing `.item-grid-card` styles; add slot styles in `src/styles/legacy-items.css`.

### 2.2 Item popup (`src/ui/itemPopup.js`)
- Add an **Equip/Unequip** button for `equipment` items (calls Phase 1 API, re-renders).
- Add a **Use** button stub for `consumables` (wired in Phase 5; hidden until then).
- Show category + quantity for stackables.

### 2.3 Acceptance criteria (Phase 2)
- [ ] Equipped slots section renders all 13 slots with correct fill state.
- [ ] Equipping/unequipping from the UI updates HUD stats live.
- [ ] Materials show stack counts; categories grouped correctly.
- [ ] Mobile/responsive: slots wrap (use existing relative-unit conventions, see
      `Legacy_ToDo.txt:214-229`).
- [ ] CHANGELOG `[Unreleased]` updated.
- [ ] Build + smoke pass.

---

## PHASE 3 — Gathering Engine (Botany / Metallurgy / Angling)

**Goal:** Endeavors yield items. Reusable weighted-drop engine. (Hunting is Phase 6 — different shape.)

### 3.1 Hobby data cleanup (`src/data/hobbies.js`) — do this first
Per `Legacy_ToDo.txt:10-16`:
- **Cut Woodworking** (remove entry; add save handling so anyone with a `woodworking` level
  just keeps a dead key — harmless, or delete the key in a migration).
- **Rename Archery → Stalking**: `id:'stalking'`, `label:'Stalking'`, `requires:{hobbyId:'hunting',
  level:50}` (was Hunting 25). Description per `Items_and_Hobbies.txt:13`.
- **Artificing** `requires` → `{ all: [{hobbyId:'metallurgy',level:50}, {skill:'mysticism', level:25}] }`.
  (Extend `isHobbyUnlocked` to support an `all:[...]` array and a `skill` ref to another hobby
  level. `Items_and_Hobbies.txt:11`.)
- **Alchemy** requires Botany 50 (already correct).

### 3.2 Gathering tables (new: `src/data/gatheringZones.js`)
Model:
```js
{ hobbyId:'botany', zones:[
  { id:'the_thames', label:'The Thames', apCost:1, skillReq:0, flavor:'...',
    art:{ kind:'svg', ref:'zone-the_thames' }, theme:'thames',   // §2A.8 — per-zone art + CSS look
    drops:[ {id:'rushes', rarity:'common'}, {id:'flax', rarity:'common'},
            {id:'willow_bark', rarity:'uncommon'}, {id:'valerian_root', rarity:'rare'} ] },
  ... ] }
```
Encode every zone from `Items_and_Hobbies.txt`:
- **Botany:** The Thames (1AP, req0), The Outlands (2AP, req?—use 0), The Deep Forest (3AP, req?—use 0).
- **Metallurgy:** Industrial Scrapyards (1AP,0), Chalk & Clay Pits (1AP,25), The Weald (2AP,50),
  The Cornwall Deeps (4AP,75).
- **Angling:** (design lists no zones yet) → create **one** starter zone "The Riverbank"
  (1AP, req0) dropping a couple of common fish materials you invent (e.g. River Fish, Eel) +
  a small Health restore as its hobby flavor (Angling tag includes `health`). Mark
  `// BALANCE: provisional, Angling underspecified in design`.

### 3.3 Rarity → drop weights & quantity (new: `src/sim/gathering.js`)
Provisional, tune later (mark `// BALANCE`):
- Per gather, roll **1–3 drop attempts** (scale with skill: +1 attempt at skill ≥50, +1 at ≥80).
- Per attempt, pick a drop via weighted rarity: `common:60, uncommon:28, rare:10, unique:2`,
  filtered to that zone's drop list.
- Quantity per hit: `common: 1–3, uncommon:1–2, rare:1, unique:1` (use `weightedPick`/`random`
  utils already in `src/utils/`).
- Higher hobby skill slightly upweights rarer drops (e.g. shift weights by `+skill*0.2` toward
  uncommon/rare). Keep it gentle.

### 3.4 Wire endeavors
- Replace Botany's single generic `forage` with **per-zone endeavors** generated from
  `gatheringZones.js`, OR keep one "Forage" endeavor that opens a **zone picker** sub-view.
  **Recommended:** zone picker (cleaner UI, scales to Metallurgy). Add a `zonePicker` render in
  `hobbiesPanel.js` reachable from the Endeavors tab. **→ UI detail in §2A.4.**
- `runGather(player, hobbyId, zoneId)` (in `sim/gathering.js`): check skill req + AP, spend AP,
  `addHobbySkill`, roll drops, `addMaterial` each, build annals line.
- **Annals message** (`Legacy_ToDo.txt:28-29`, `Items_and_Hobbies.txt:20`): list items gained,
  e.g. `"You foraged The Thames and gained 2 Rushes and 1 Willow Bark. (Botany skill now 7.)"`.
  Fix the existing bug where forage shows "botany skill now _" — show the gained items + the
  **rounded new level**. Update forage flavor to reflect the outcome.

### 3.5 Acceptance criteria (Phase 3)
- [ ] Woodworking gone; Archery is now Stalking (req Hunting 50); Artificing needs Metallurgy
      50 + Mysticism 25; locked hobbies still display (greyed — see Phase 8 note).
- [ ] Foraging The Thames spends AP, raises Botany, adds materials to the map, and the annals
      line enumerates exactly what dropped + new level.
- [ ] Zone skill requirements gate access (Cornwall Deeps hidden/disabled under Metallurgy 75).
- [ ] Each zone renders its `art` (SVG via `renderArt`) and a distinct `data-theme` look (§2A.8c).
- [ ] CHANGELOG `[Unreleased]` updated.
- [ ] Build + smoke pass.

---

## PHASE 4 — Crafting Engine

**Goal:** Turn the Crafting tab from placeholder into a working recipe system.

### 4.1 Recipe data (new: `src/data/recipes.js`)
```js
{ id:'apothecarys_solvent', hobbyId:'alchemy', outputs:[{id:'apothecarys_solvent', n:1}],
  inputs:[{id:'rushes', n:4}], skillReq:0, apCost:1, skillGain:0.5 }
```
Encode **all** Components + Crafting recipes from `Items_and_Hobbies.txt` for: Alchemy,
Metallurgy, Artificing, Tailoring, Scholarship (recipe-shaped parts). Apply the unresolved-cost
resolutions from §2.3. Provisional defaults (mark `// BALANCE`): `apCost:1`, `skillGain:0.5`,
`skillReq` = the design's stated req or 0. Recipes with an explicit req (e.g. Ornate Cane
Artificing 30) use it. An output that is `equipment` calls `addEquipment`; else `addMaterial`.

### 4.2 Crafting sim (extend `src/sim/hobbies.js` or new `src/sim/crafting.js`)
```
canCraft(player, recipeId)   // skillReq met? AP available? all inputs in materials?
runCraft(player, recipeId)   // spend AP, consume inputs (removeMaterial), addHobbySkill,
                             // produce outputs, return annals line
```
Annals: `"You crafted Apothecary's Solvent. (Alchemy skill now 12.)"`.

### 4.3 Crafting UI (`src/ui/hobbiesPanel.js`) — **UI detail in §2A.5**
- Replace `renderCraftingBody()` placeholder: list this hobby's recipes. Each row shows output,
  inputs with **owned/required counts** (e.g. `Rushes 2/4` in red if short), skill req, AP cost,
  and a **Craft** button disabled when `!canCraft`. On craft, re-render so counts update.

### 4.4 Acceptance criteria (Phase 4)
- [ ] Crafting tab lists recipes for crafting-tagged hobbies; non-crafting hobbies show none.
- [ ] Craft consumes exact inputs, produces output to the correct store, spends AP, raises skill.
- [ ] Insufficient materials / skill / AP correctly disables the button with a clear reason.
- [ ] Cross-hobby chains work end-to-end (gather Quartz+Limestone → craft Glass → craft Telescope).
- [ ] CHANGELOG `[Unreleased]` updated.
- [ ] Build + smoke pass.

---

## PHASE 5 — Consumables (Use Flow)

**Goal:** Generic "use a consumable → apply effect → decrement" path.

### 5.1 Effect descriptor (`onUse` on consumable catalog entries)
```js
onUse: { stat:'intelligence', delta:1, permanent:true }   // Elixir of Comprehension
onUse: { stat:'prowess', delta:1, permanent:true }        // Stalker's Brew
onUse: { restore:'health', amount:50 }                    // Blood Vial (mortal)
onUse: { restore:'blood', amount:50, vampireOnly:true }   // Blood Vial (vampire) — Blood stat
                                                          // does not exist yet → TODO guard
```
Decision needed was: **permanent vs temporary**. **Use permanent stat bumps** for the
Elixir/Brew (matches "+1 Intelligence"). Mark temporary-buff support as future.

### 5.2 Use API (`src/sim/consumables.js`)
```
canUse(player, itemId)   // owns ≥1, not vampireOnly-blocked
useConsumable(player, itemId)  // apply onUse, removeMaterial(...,1), annals line
```
Health/Blood: clamp to caps. If `vampireOnly` and player not vampire (or Blood stat absent),
disable with reason. Fold the existing `singleUse` (flintlock) concept — flintlock stays
equipment+single-use in combat, not a consumable; do not break `consumeSingleUseItem`.

### 5.3 UI: enable the **Use** button in `itemPopup.js` (Phase 2 stub) and/or a use action in
the Consumables inventory group. **→ UI detail in §2A.3.**

### 5.4 Acceptance criteria (Phase 5)
- [ ] Using Elixir of Comprehension raises Intelligence by 1 permanently and removes one.
- [ ] Blood Vial heals a mortal; vampire branch is guarded behind the missing Blood stat (TODO).
- [ ] CHANGELOG `[Unreleased]` updated.
- [ ] Build + smoke pass.

---

## PHASE 6 — Cunning Attribute (full, with school events)

**Goal:** Add **Cunning** as a real core stat and give the player ways to raise it, so Hunting's
Cunning gates (Phase 7) actually function. Per `Legacy_ToDo.txt:20` ("Add Cunning attribute and
add events into school years to support it"). This phase is independent of the item loop and must
land **before** Phase 7.

### 6.1 Stat plumbing (mirror the existing pattern for `insight`)
- `src/utils/statCap.js` — add `cunning` to BOTH `STAT_CAPS.mortal` (e.g. `100`) and
  `.vampire` (e.g. `200`), matching `insight`/`charisma` ceilings.
- `src/state/person.js` `PERSON_DEFAULTS` — add `cunning: 0` (insight-like; starts low).
  Mirror in the other two defaults locations: `src/state/personFactory.js` and
  `src/legacy.js` (~line 1076, the inline person template).
- `src/state/personFactory.js` — add Cunning to `snapshotBirthStats`, `inheritStats`
  (e.g. `cunning: stat(aBirth.cunning, bBirth.cunning, 8)`), `rollAdultStats`
  (e.g. `rollNormal(8, 10)` like insight), `applyInheritedStats`, and `FALLBACK_BIRTH_STATS`.
- `src/sim/itemEffects.js` — `effectiveStat(player,'cunning')` already works generically; add an
  `effectiveCunning(player)` convenience export if other stats have one.

### 6.2 HUD display (`src/ui/renderHud.js`) — **UI detail in §2A.6**
- Add a Cunning bar next to insight/charisma (`bar('cunning', effectiveStat(player,'cunning'))`).
- Verify any stat-list UIs (`ui/personPanels.js`, person modal) include Cunning where the other
  attributes are enumerated.

### 6.3 Save migration
- Bump `SAVE_SCHEMA` (whatever Phase 1 left it at, e.g. 27 → **28**) in both
  `src/state/saveSystem.js` and `src/legacy.js`.
- Add `if (save.schema < 28)`: backfill `p.cunning` (default `0`; optionally a small
  age/insight-derived value so existing adults aren't all zero — `// BALANCE: provisional`).
  Add the documentation comment block in the migration list per existing style.

### 6.4 School events to raise Cunning (`Legacy_ToDo.txt:20,33-34`)
- Add **Cunning-granting school events** to the education situations
  (`src/data/educationSituations.js`) so the attribute is actually trainable during school years.
  Implement at least the named **"The Headmaster's Office"** Cunning event (`Legacy_ToDo.txt:33-34`)
  plus 1–2 generic Cunning crossroads in primary/secondary, granting small Cunning amounts via the
  existing situation `apply()`/reward framework. Follow the `record` tier conventions documented in
  `sim/situationLog.js` (milestone vs flavor).
- These events should show stat effects in their option buttons (consistent with the school-event
  polish already requested in `Legacy_ToDo.txt`).

### 6.5 Acceptance criteria (Phase 6)
- [ ] Cunning appears in HUD and person stat displays; clamps to its caps.
- [ ] New children inherit Cunning; new adult NPCs roll a believable Cunning.
- [ ] Loading a pre-migration save backfills Cunning without console errors.
- [ ] At least "The Headmaster's Office" school event grants Cunning, with stat effects shown.
- [ ] CHANGELOG `[Unreleased]` updated (⚠ High impact — schema + PERSON_DEFAULTS + inheritance).
- [ ] Build + smoke pass.

---

## PHASE 7 — Hunting, Stalking, Scholarship & Mysticism (Advanced)

**Goal:** The non-uniform subsystems. Largest phase; can ship piecemeal. Hunting's Cunning gates
now resolve against the real stat from Phase 6.

### 7.1 Hunting engine (distinct from gathering — `src/data/huntingZones.js` + `src/sim/hunting.js`)
Hunting zones yield **creatures**, each with: a per-creature **drop table**, **requirements**
(Hunting level, Prowess, **Cunning — now real from Phase 6**, Stalking), rarity, and
**chance-based** sub-drops (e.g. Bandit "25% each of …"). Encode all zones/creatures from
`Items_and_Hobbies.txt:157-242`: The Moors (1AP), The Forest (2AP, Hunting 25), The Deep Weald
(4AP, Hunting 100 quest-gated).
- `runHunt(player, zoneId)`: pick an **eligible** creature (filter by met requirements — Cunning
  gates evaluate against `effectiveStat(player,'cunning')`), spend AP, raise Hunting, roll its
  drops (guaranteed + chance rolls), `addMaterial`.
- **Mortals/Stalking branch:** creatures flagged `requiresStalking` only appear if Stalking
  unlocked. Implement the **drop side now**. The **Vampire "Drain for Blood" choice** is
  **stubbed** behind `// TODO: Blood/Hunger stat` (out of scope this pass). The **Witness Event**
  is **deferred**: roll the small chance but leave the consequence as `// TODO: witness event`
  (no event fired this pass).

### 7.2 Stalking endeavors (`hobbies.js` — currently empty)
Per design: "Stalk and kill people and monsters, spy on NPCs." Implement the **spy** endeavor
minimally (reveal an NPC's hidden info / a flavor annals line); the kill side reuses Hunting's
mortal creatures. Keep scope tight; mark deeper features TODO.

### 7.3 Scholarship (`recipes.js` + decisions)
- **Study Mysterious Relic / Ominous Relic:** consume the relic material, grant a semi-random
  relic/trinket/jewelry (Ominous req Scholarship 75 → unique). Reuse existing relic items.
- **Translate Tome / Create Tome:** recipe-shaped (Notes/Vellum inputs) producing tome items;
  the multi-year "translate over time to fluency" loop is a **future TODO** — implement the
  one-shot craft now.

### 7.4 Mysticism mechanics (`src/sim/mysticism.js` — high-level, guard heavy deps)
- **Divination → Read the Stars** (req Telescope equipped/owned): flavor + small Insight nudge.
- **Séance** (Mysticism 50): implement the **gate + ingredient cost** (consume Bone Meal +
  Oneiric Resin + Tallow). **Stub the spirit-spawning** — the minion system has display
  (`minionIds`, herd/ghoul in `ui/bloodline.js`) but **no creation helper**, so leave a clear
  `// TODO: minion creation (spirit type, 5-year expiry)` and do NOT half-build it. Spending the
  ingredients with a flavor annals line is acceptable for this pass.
- **Dark Ritual** (Mysticism 75): leave as a clearly-marked **stub/TODO** (design says WIP).

### 7.5 Acceptance criteria (Phase 7)
- [ ] Hunting The Moors yields creature-appropriate drops; requirement-gated creatures don't
      appear when reqs unmet; chance drops fire probabilistically.
- [ ] Cunning-gated creatures correctly resolve against the real Cunning stat (Phase 6).
- [ ] Stalking unlocks at Hunting 50 and has at least its spy endeavor.
- [ ] Study Relic and Translate/Create Tome produce items and consume inputs.
- [ ] Séance is gated at Mysticism 50, consumes its ingredients, and cleanly stubs spawning.
- [ ] Blood/minion/witness dependencies are stubbed with explicit TODOs, not half-built.
- [ ] CHANGELOG `[Unreleased]` updated.
- [ ] Build + smoke pass.

---

## PHASE 8 — Polish & ToDo cleanup (small, can fold into earlier phases)

From `Legacy_ToDo.txt` general section:
- [ ] **Show hidden/locked hobbies greyed out** (`:16`) — `hobbiesPanel.js` list view: render
      locked hobbies disabled with their unlock requirement as tooltip/subtext (currently
      `unlockedHobbies` filters them out entirely).
- [ ] Remove italics from setting descriptions (`:8`) — unrelated but trivial; optional.
- [ ] Confirm forage flavor reflects post-item-system outcome (`:29`).
- [ ] CHANGELOG `[Unreleased]` updated; Build + smoke pass.

---

## What We Have NOT Done This Pass (explicit out-of-scope)

This list is authoritative. If a phase tempts you toward any of the below, **stop and leave a
`// TODO`** instead — these are deliberate omissions, not oversights. Each is a candidate for a
future plan.

### Deliberately deferred (stubbed with TODOs in this pass)
- **Vampire Blood/Hunger stat** and everything depending on it: the Hunting **"Drain for Blood"**
  branch and the **Blood Vial** vampire effect. Build the mortal/non-Blood side only; guard the
  Blood side. *(Per your direction — wired later.)*
- **Séance spirit spawning.** Gate + ingredient consumption are built; actual minion creation is
  stubbed because the minion system has display (`minionIds`/herd/ghoul) but **no creation helper,
  no 'spirit' type, no expiry tick**. (Whole-minion-system work is its own effort.)
- **Witness events** on hunting mortals — chance is rolled, consequence is a TODO.
- **Dark Ritual** (Mysticism 75) — design says WIP; stub only.

### Explicitly excluded from this plan (not even stubbed)
- **Hidden attribute system** (yield modifiers, social/disposition/enthrallment modifiers, max
  herd/ghoul counts — `Legacy_ToDo.txt:46-49`). Per your decision, **left out entirely**, including
  schema fields. Catalog entries carry only the stats they need for the equip/craft loop.
- **Durability & enchantment.** The hybrid `equipment:[{uid,id}]` model **leaves room** for these
  as future field additions, but no durability decay, repair, enchant sources, or UI are built.
- **Temporary buffs.** Consumable effects are **permanent stat bumps only** (e.g. Elixir of
  Comprehension = permanent +1 Int). No timed/expiring buff framework.
- **Multi-year tome translation-to-fluency loop** (`Items_and_Hobbies.txt:316-319`). Translate/
  Create Tome are one-shot crafts this pass; the language-progression loop is future work.
- **Vampire daytime hobby gating / ghoul delegation** (`Items_and_Hobbies.txt:3` — "for daytime
  hobbies they will be required to build out/ghoul for the relevant hobby decision"). Not modeled;
  vampires use hobbies the same as mortals for now. Flag as a known future mechanic.
- **NPCs gathering/crafting/equipping.** This pass is **player-only** for the new loop. NPCs keep
  their existing item interactions; they do not run endeavors, craft, or equip from these systems.
- **Painted raster art.** The raster pipeline (folder convention, `renderArt` `image` kind, sizes,
  `art/README.md` + prompt guidance) is **built and wired** (§2A.8d), but the actual painted
  `.webp` files (zone banners, vampire haven scenes) are **not produced this pass** — they need an
  image model/artist. Zones/items ship with SVG + per-zone CSS art; flipping an entry to
  `kind:'image'` later is the only edit needed.
- **Angling depth.** Only one provisional starter zone is added; the full Angling catalog/zones,
  and the "ease your stress / Health" framing, are left thin and marked provisional.
- **Balance tuning.** All drop weights, quantities, AP/skill costs, and resolved `?` recipe costs
  are **provisional** (`// BALANCE: provisional`). This pass makes the loop *functional*, not tuned.
- **Education/University overhaul, careers, social/criminal systems, mobile conversion** and other
  `Legacy_ToDo.txt` items unrelated to items/hobbies — out of scope except the specific Cunning
  school events (Phase 6) and the small hobby/forage polish (Phase 8).

---

## Global Conventions for the Implementing Agent

- **Match surrounding code style**: ES modules, no TypeScript (JSDoc typedefs only), the
  existing `escapeHtml` usage in UI, `proposeAnnals`/`logEvent` for messages, `weightedPick`
  and `src/utils/random.js` for rolls, `clamp` from `src/utils`.
- **Every save-schema-affecting change** bumps `SAVE_SCHEMA` in BOTH `src/state/saveSystem.js`
  and `src/legacy.js:1059`, adds an ordered migration block + the documentation comment.
- **Don't break the public item API** (`hasItem/grantItem/removeItem/ownedItemIds/
  consumeSingleUseItem`) — callers in `legacy.js`, `decisionGates.js`, `rookeriesSituations.js`,
  `personPanels.js`, `mudlarkLockbox.js` must keep working.
- **All new tunable numbers** get a `// BALANCE: provisional` comment so they're easy to find.
- **Every dependency on a not-yet-built system** (Blood/Hunger stat, minion creation, witness
  events) is a guarded `// TODO`, never a half-implementation. (Cunning is **no longer** in this
  list — it is built in Phase 6.)
- After each phase: `npm run build` (`vite build`) and `npm run test:smoke` must pass; load a
  pre-existing save without console errors.

## CHANGELOG — MANDATORY every phase

`CHANGELOG.md` (repo root) is the required record of work. **Each phase MUST append entries to
the `[Unreleased]` section before that phase's PR is considered done.** Follow the file's own
rules (documented at the top of `CHANGELOG.md`):

- Use the categories **`Added` · `Changed` · `Fixed` · `Removed`**.
- Keep bullets brief and user-facing; **end each bullet with the touched file(s) in parentheses**,
  matching the existing style, e.g. `(sim/gathering.js, data/gatheringZones.js)`.
- **Prefix with `⚠ **High impact** —`** for anything touching: save schema / `migrateSave` /
  `migratePerson`, `PERSON_DEFAULTS` / `createPerson` / inheritance, `G.people` or ID assignment,
  or the public item API. Explain *what to watch for* in one line.
- **Mandatory high-impact entries by phase:** Phase 1 (hybrid stores + schema bump + equip-based
  stats — note `whileOwned`→`whileEquipped` and that loaded saves start unequipped), Phase 6
  (Cunning stat + schema bump + inheritance). Other phases are usually `Added`/`Changed`.
- Each phase's acceptance criteria include a "CHANGELOG `[Unreleased]` updated" checkbox — do not
  tick the phase complete until it's done.

## Suggested commit/PR boundaries
One PR per phase (1→8). Phase 1 (data model + migration) and Phase 6 (new core stat + migration)
are the riskiest — review them carefully and confirm save round-tripping before proceeding.
