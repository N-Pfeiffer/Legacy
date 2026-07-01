import { VOCAB } from '../data/vocab.js';
import {
  bl,
  getPerson,
  getPlayer,
  getSpouses,
  getLovers,
  getFriends,
  getEnemies,
  getSire,
  getCurrentSection,
} from '../state/gameState.js';
import { statCap } from '../utils/index.js';
import { currentProwess } from '../sim/prowess.js';
import { currentFertility } from '../sim/conception.js';
import { wealthTierLabel, careerDisplay } from '../sim/careers.js';
import {
  renderFamilyTab,
  defaultFamilyCollapseState,
  FAMILY_PREVIEW_COUNT,
} from './familyTab.js';
import { escapeHtml } from './eventLog.js';
import { relationLabel } from './relations.js';
import { relationshipBondPanelHtml, relationshipCardBarsHtml } from './relationshipBars.js';
import {
  renderPersonActionBarHtml,
  renderPersonTraitsPanelHtml,
  renderPersonItemsPanelHtml,
  wirePersonActionBar,
  wirePersonItemsPanel,
  wirePersonPanelBack,
} from './personPanels.js';
import { currentMode } from './theme.js';
import {
  SUBNAV,
  currentSubTab,
  renderSubNav,
  normalizeBloodlineSubTab,
} from './navigation.js';
import {
  canInteractWithPerson,
  interactPanelHtml,
  wireInteractPanel,
  handlePersonInteractAction,
} from './personInteract.js';

let hooks = {
  portrait: () => '👤',
  personNameHtml: () => '',
  getItemPopupOptions: () => ({}),
};

export function registerBloodlineHooks(h) {
  hooks = { ...hooks, ...h };
}

const BREADCRUMB_MAX = 50;

let blFocalView = 'profile';
let blFocalInteractSubView = null;

export function resetBlFocalInteractSubView() {
  blFocalInteractSubView = null;
}

const subsectionCollapseState = {
  ...defaultFamilyCollapseState(getPlayer()),
  relationsLovers: true,
  relationsFriends: true,
  relationsEnemies: true,
};

let lastFamilyCollapseFocalId = null;

const CLAN_MAX_DEPTH = 4;

const MINION_GROUPS = [
  { key: 'herd',    label: 'Herd',
    description: 'Mortals you regularly feed upon.' },
  { key: 'ghoul',   label: 'Ghouls',
    description: 'Mortals sustained on vampiric blood, partially undead.' },
  { key: 'bound',   label: 'Blood Bound',
    description: 'Those magically bound to you through repeated communion.' },
  { key: 'servant', label: 'Servants',
    description: 'Supernatural constructs in your thrall — wraiths, animated dead, summoned things.' },
];

export function ensureBloodlineTrail() {
  const player = getPlayer();
  if (!player) return;
  if (!bl.trail.length) {
    bl.trail = [bl.focalId ?? player.id];
    bl.focalIndex = 0;
    bl.focalId = bl.trail[0];
  } else if (bl.focalIndex < 0 || bl.focalIndex >= bl.trail.length) {
    bl.focalIndex = bl.trail.length - 1;
    bl.focalId = bl.trail[bl.focalIndex];
  }
}

export function setFocal(personId, { pushHistory = true } = {}) {
  if (personId == null) return;
  ensureBloodlineTrail();
  if (personId === bl.focalId) return;

  const existingIdx = bl.trail.indexOf(personId);
  if (existingIdx >= 0) {
    bl.focalIndex = existingIdx;
    bl.focalId = personId;
  } else if (pushHistory) {
    bl.trail.push(personId);
    while (bl.trail.length > BREADCRUMB_MAX) {
      bl.trail.shift();
      bl.focalIndex = Math.max(0, bl.focalIndex - 1);
    }
    bl.focalIndex = bl.trail.length - 1;
    bl.focalId = personId;
  } else {
    bl.focalId = personId;
  }

  normalizeBloodlineSubTab();
  renderSubNav();
  if (getCurrentSection() === 'bloodline') renderBloodline();
}

export function jumpToCrumb(idx) {
  ensureBloodlineTrail();
  if (idx < 0 || idx >= bl.trail.length) return;
  if (idx === bl.focalIndex) return;
  bl.focalIndex = idx;
  bl.focalId = bl.trail[idx];
  normalizeBloodlineSubTab();
  renderSubNav();
  if (getCurrentSection() === 'bloodline') renderBloodline();
}

export function clearBloodlineTrail() {
  const player = getPlayer();
  if (!player) return;
  bl.trail = [player.id];
  bl.focalIndex = 0;
  bl.focalId = player.id;
  normalizeBloodlineSubTab();
  renderSubNav();
  if (getCurrentSection() === 'bloodline') renderBloodline();
}

export function renderBloodline() {
  const focal = getPerson(bl.focalId);
  if (!focal) return;

  syncFamilyCollapseDefaults(focal);

  // Focal card -------------------------------------------------
  const focalEl = document.getElementById('bl-focal');
  focalEl.classList.toggle('is-vampire', focal.isVampire);
  focalEl.classList.toggle('is-deceased', !focal.isAlive);

  document.getElementById('bl-focal-portrait').textContent = hooks.portrait(focal);

  const hintEl = document.getElementById('bl-focal-hint');
  if (hintEl) hintEl.textContent = 'Click portrait to view their bloodline';

  const nameEl = document.getElementById('bl-focal-name');
  nameEl.innerHTML =
    hooks.personNameHtml(focal) +
    (focal.isVampire ? ` <span class="nature-mark">Vampire</span>` : '');

  const metaParts = [
    `Age ${focal.age}`,
    `b. ${focal.yearBorn}`,
  ];
  if (focal.yearDied) metaParts.push(`d. ${focal.yearDied}`);
  document.getElementById('bl-focal-meta').textContent = metaParts.join(' · ');

  // Relation under the focal name — relative to the player, prefixed with
  // "Your " (e.g. "Your Father", "Your Sister"). Unknown relations
  // collapse to "Kin" so we never have an empty label. The "Yourself"
  // selfLabel handles the case where the focal is the player.
  const player = getPlayer();
  const relLabel = relationLabel(focal, player, {
    prefix:    'Your ',
    fallback:  'Kin',
    selfLabel: 'Yourself',
  });
  document.getElementById('bl-focal-rel').textContent = relLabel;

  // Career line. Uses the current game year for era-appropriate naming —
  // a Constable in 1880 reads as "Police Officer" in 1950 when you visit
  // them again. Empty (and CSS-collapsed) for children, non-adults, the
  // player, or anyone whose career has no entry in the current era.
  // Includes rank ("Senior Associate, Lawyer") when meaningful.
  const career = careerDisplay(focal);
  document.getElementById('bl-focal-career').textContent = career || '';

  renderFocalPartner(focal);

  renderBlFocalActions(focal, player);
  renderBlFocalStats(focal, player);

  // Breadcrumb -------------------------------------------------
  renderBreadcrumb();

  // Panel content for the currently-active bloodline sub-tab.
  // (The sub-nav strip and panel visibility are managed by renderSubNav.)
  const active = currentSubTab.bloodline;
  if (active === 'family') {
    document.getElementById('bl-panel-family').innerHTML = renderFamilyTab(focal, {
      personCardHtml,
      escapeHtml,
      collapseState: subsectionCollapseState,
      previewCount: FAMILY_PREVIEW_COUNT,
    });
  }
  if (active === 'relations') document.getElementById('bl-panel-relations').innerHTML = renderRelationsTab(focal);
  if (active === 'childer')   document.getElementById('bl-panel-childer').innerHTML   = renderClanTab(focal);
  if (active === 'minions')   document.getElementById('bl-panel-minions').innerHTML   = renderMinionsTab(focal);
}

export function renderFocalPartner(focal) {
  const el = document.getElementById('bl-focal-partner');
  if (!el) return;

  const spouses = getSpouses(focal);
  if (!spouses.length) {
    el.innerHTML = `<div class="bl-partner-panel is-empty">
      <div class="bl-partner-label">Partner</div>
      <div class="bl-partner-empty-text">Unwed</div>
    </div>`;
    return;
  }

  const label = spouses.length === 1 ? 'Spouse' : 'Spouses';
  const cards = spouses
    .map((s) => personCardHtml(s, focal, { partnerCard: true }))
    .join('');
  el.innerHTML = `<div class="bl-partner-panel">
    <div class="bl-partner-label">${escapeHtml(label)}</div>
    <div class="bl-partner-cards">${cards}</div>
  </div>`;
}

export function focalStatsHtml(p) {
  const vocab    = VOCAB[currentMode()] || {};
  const insightLabel = vocab['stat.insight'] || 'Insight';
  const prowess   = currentProwess(p);
  const fertility = currentFertility(p);

  const rows = [
    { key: 'health',         label: 'Health',         value: p.health,         color: 'var(--green)'   },
    { key: 'prowess',        label: 'Prowess',        value: prowess,          color: 'var(--red)'     },
    { key: 'charisma', label: 'Charisma',        value: p.charisma, color: 'var(--accent2)' },
    { key: 'intelligence',   label: 'Intelligence',   value: p.intelligence,   color: 'var(--blue)'    },
    { key: 'wealth',         label: 'Wealth',         value: p.wealth,         color: 'var(--green)'   },
    { key: 'insight',        label: insightLabel,     value: p.insight,        color: 'var(--gold)'    },
    { key: 'cunning',        label: 'Cunning',        value: p.cunning ?? 0,   color: 'var(--accent2)' },
    { key: 'fertility',      label: 'Fertility',      value: fertility,        color: 'var(--accent2)' },
  ];

  const rowsHtml = rows.map(r => {
    const cap = statCap(r.key, p.isVampire);
    const value = Math.max(0, Math.round(r.value));
    const pct = Math.max(0, Math.min(100, (value / cap) * 100));
    // NPC wealth: tier label only (no raw number). Player keeps number + tier.
    let valueHtml;
    if (r.key === 'wealth' && !p.isPlayer) {
      valueHtml = `<span class="focal-stat-tier focal-stat-tier--primary">${escapeHtml(wealthTierLabel(value))}</span>`;
    } else if (r.key === 'wealth') {
      valueHtml = `${value} <span class="focal-stat-tier">${escapeHtml(wealthTierLabel(value))}</span>`;
    } else {
      valueHtml = String(value);
    }
    return `<div class="focal-stat">
      <div class="focal-stat-label">${escapeHtml(r.label)}</div>
      <div class="focal-stat-bar"><div class="focal-stat-fill" style="width:${pct}%; background:${r.color};"></div></div>
      <div class="focal-stat-value">${valueHtml}</div>
    </div>`;
  }).join('');

  return `<div class="focal-stats-grid">${rowsHtml}</div>`;
}

export function renderBreadcrumb() {
  ensureBloodlineTrail();
  const el = document.getElementById('bl-breadcrumb');
  const scrollEl = document.getElementById('bl-breadcrumb-scroll');
  if (!el || !bl.trail.length) return;

  const parts = [];

  bl.trail.forEach((id, idx) => {
    const p = getPerson(id);
    if (!p) return;
    const isCurrent = idx === bl.focalIndex;
    if (isCurrent) {
      parts.push(`<span class="bl-crumb current">${hooks.personNameHtml(p)}</span>`);
    } else {
      parts.push(`<span class="bl-crumb" data-idx="${idx}">${hooks.personNameHtml(p)}</span>`);
    }
    if (idx < bl.trail.length - 1) {
      parts.push(`<span class="bl-crumb-sep">›</span>`);
    }
  });

  el.innerHTML = parts.join('');

  el.querySelectorAll('.bl-crumb[data-idx]').forEach((c) => {
    c.addEventListener('click', () => jumpToCrumb(parseInt(c.dataset.idx, 10)));
  });

  if (scrollEl) {
    requestAnimationFrame(() => {
      scrollEl.scrollLeft = scrollEl.scrollWidth;
    });
  }
}

export function wireBreadcrumbControls() {
  const btn = document.getElementById('bl-breadcrumb-clear');
  if (!btn || btn._breadcrumbWired) return;
  btn._breadcrumbWired = true;
  btn.addEventListener('click', clearBloodlineTrail);
}

export function syncFamilyCollapseDefaults(focal) {
  if (!focal || focal.id === lastFamilyCollapseFocalId) return;
  lastFamilyCollapseFocalId = focal.id;
  blFocalView = 'profile';
  blFocalInteractSubView = null;
  Object.assign(subsectionCollapseState, defaultFamilyCollapseState(focal));
}

export function renderBlFocalActions(focal, player) {
  const actionsEl = document.getElementById('bl-focal-actions');
  if (!actionsEl) return;

  actionsEl.innerHTML = renderPersonActionBarHtml(focal, player, {
    actionAttr: 'bl-focal-action',
    showInteract: canInteractWithPerson(player, focal),
    cssClass: 'bl-focal-action-bar person-info-action-bar',
  });

  wirePersonActionBar(actionsEl, 'bl-focal-action', {
    onTraits: () => {
      blFocalView = blFocalView === 'traits' ? 'profile' : 'traits';
      renderBloodline();
    },
    onItems: () => {
      blFocalView = blFocalView === 'items' ? 'profile' : 'items';
      renderBloodline();
    },
    onInteract: () => {
      if (blFocalView === 'interact') {
        blFocalView = 'profile';
        blFocalInteractSubView = null;
      } else {
        blFocalView = 'interact';
        blFocalInteractSubView = null;
      }
      renderBloodline();
    },
  });
}

export function renderBlFocalStats(focal, player) {
  const statsEl = document.getElementById('bl-focal-stats');
  if (!statsEl) return;

  if (blFocalView === 'interact' && canInteractWithPerson(player, focal)) {
    statsEl.style.display = '';
    statsEl.innerHTML = interactPanelHtml(
      player,
      focal,
      'bl-focal-action',
      blFocalInteractSubView,
    );
    wireInteractPanel(statsEl, player, focal, 'bl-focal-action', {
      subView: blFocalInteractSubView,
      onBack: () => {
        if (blFocalInteractSubView === 'propose') {
          blFocalInteractSubView = null;
          renderBloodline();
          return;
        }
        blFocalView = 'profile';
        blFocalInteractSubView = null;
        renderBloodline();
      },
      onAction: (actionId) => handlePersonInteractAction(focal, actionId, {
        refreshFocal: true,
        onProposePanel: () => {
          blFocalInteractSubView = 'propose';
          renderBloodline();
        },
      }),
    });
    return;
  }

  if (blFocalView === 'traits') {
    statsEl.style.display = '';
    statsEl.innerHTML = renderPersonTraitsPanelHtml(focal, { actionAttr: 'bl-focal-action' });
    wirePersonPanelBack(statsEl, 'bl-focal-action', () => {
      blFocalView = 'profile';
      renderBloodline();
    });
    return;
  }

  if (blFocalView === 'items') {
    statsEl.style.display = '';
    statsEl.innerHTML = renderPersonItemsPanelHtml(
      focal,
      escapeHtml,
      hooks.getItemPopupOptions(),
      { actionAttr: 'bl-focal-action' },
    );
    wirePersonItemsPanel(statsEl, player, escapeHtml, hooks.getItemPopupOptions());
    wirePersonPanelBack(statsEl, 'bl-focal-action', () => {
      blFocalView = 'profile';
      renderBloodline();
    });
    return;
  }

  if (focal.isPlayer) {
    statsEl.style.display = 'none';
    statsEl.innerHTML = '';
    return;
  }

  statsEl.style.display = '';

  const bondPanel = relationshipBondPanelHtml(player, focal);
  statsEl.innerHTML =
    (bondPanel ? `<div class="bl-focal-bond">${bondPanel}</div>` : '')
    + `<div class="bl-focal-attributes">
        <div class="focal-stats-title">Attributes</div>
        ${focalStatsHtml(focal)}
      </div>`;
}

export function wireSubsectionCollapse() {
  const host = document.getElementById('bloodline-container');
  if (!host || host._subsectionCollapseWired) return;
  host._subsectionCollapseWired = true;
  host.addEventListener('click', (e) => {
    const btn = e.target.closest('.bl-sub-toggle, .family-section-title');
    if (!btn) return;
    const section = btn.closest('[data-collapse-key]');
    if (!section) return;
    const key = section.dataset.collapseKey;
    if (!key || !(key in subsectionCollapseState)) return;
    subsectionCollapseState[key] = !subsectionCollapseState[key];
    const collapsed = subsectionCollapseState[key];
    section.classList.toggle('is-collapsed', collapsed);
    btn.setAttribute('aria-expanded', String(!collapsed));
  });
}

export function renderClanTab(focal) {
  // Build generations[0..3] arrays via BFS from the focal through childerIds.
  const generations = [];
  generations[0] = [focal];

  for (let g = 1; g < CLAN_MAX_DEPTH; g++) {
    const prev = generations[g - 1];
    const next = [];
    for (const ancestor of prev) {
      if (!ancestor) continue;
      for (const childeId of (ancestor.childerIds || [])) {
        const childe = getPerson(childeId);
        if (childe) next.push(childe);
      }
    }
    if (next.length === 0) break;   // no point in trailing empty rows
    generations[g] = next;
  }

  const sire = getSire(focal);

  // Each tier is a row in the clan-tree. The row label sits at the
  // left as a column; the cards scroll horizontally on the right.
  const tiers = [];

  if (sire) {
    tiers.push(clanTierHtml({
      labelTop:    'Your',
      labelBottom: 'Sire',
      labelClass:  'sire',
      people:      [sire],
      focal:       focal,
      compact:     true,
    }));
  }

  const ROMAN = ['I', 'II', 'III', 'IV'];
  for (let g = 0; g < generations.length; g++) {
    if (!generations[g] || !generations[g].length) continue;
    tiers.push(clanTierHtml({
      labelTop:    'Generation',
      labelBottom: ROMAN[g] || String(g + 1),
      labelClass:  g === 0 ? 'focal' : 'descent',
      people:      generations[g],
      focal:       focal,
      compact:     g > 0,   // gen I full-size; gens II–IV compact
    }));
  }

  if (tiers.length === 0 || (tiers.length === 1 && !sire && generations[0].length === 1)) {
    // Only the focal exists with no sire and no childer.
    return `<div class="bl-empty">No childer have been embraced. The line ends with you.</div>`;
  }

  return `<div class="clan-tree">${tiers.join('')}</div>`;
}

export function clanTierHtml({ labelTop, labelBottom, labelClass, people, focal, compact }) {
  const cards = people.map(p => personCardHtml(p, focal, { compact })).join('');
  return `<div class="clan-tier ${labelClass}">
    <div class="clan-tier-label">
      <div class="clan-tier-label-top">${escapeHtml(labelTop)}</div>
      <div class="clan-tier-label-bottom">${escapeHtml(labelBottom)}</div>
    </div>
    <div class="clan-tier-cards">${cards}</div>
  </div>`;
}

export function minionsByType(focal) {
  const groups = Object.fromEntries(MINION_GROUPS.map(g => [g.key, []]));
  if (!focal || !focal.minionIds) return groups;

  for (const id of focal.minionIds) {
    const m = getPerson(id);
    if (!m) continue;
    const type = m.minionType || 'herd';   // fall back to herd if untyped
    if (groups[type]) groups[type].push(m);
  }
  return groups;
}

export function renderMinionsTab(focal) {
  const groups = minionsByType(focal);
  const total  = MINION_GROUPS.reduce((n, g) => n + groups[g.key].length, 0);

  if (total === 0) {
    return `<div class="bl-empty">${focal.isPlayer
      ? 'No minions answer to you. The night is yours alone.'
      : 'They keep no minions — or none that you have seen.'}</div>`;
  }

  const rows = MINION_GROUPS.map(g => {
    const people = groups[g.key];
    return minionGroupHtml({
      label:       g.label,
      description: g.description,
      count:       people.length,
      people,
      focal,
    });
  });

  return `<div class="minions-panel">${rows.join('')}</div>`;
}

export function minionGroupHtml({ label, description, count, people, focal }) {
  const countText = count === 0 ? '—' : String(count);
  const cards = people.length === 0
    ? `<div class="minion-empty">${escapeHtml(description)}</div>`
    : people.map(p => personCardHtml(p, focal, { compact: true })).join('');

  return `<div class="minion-group">
    <div class="minion-group-label">
      <div class="minion-group-name">${escapeHtml(label)}</div>
      <div class="minion-group-count">${countText}</div>
    </div>
    <div class="minion-group-cards">${cards}</div>
  </div>`;
}

export function renderRelationsTab(focal) {
  const lovers  = getLovers(focal);
  const friends = getFriends(focal);
  const enemies = getEnemies(focal);

  return [
    subsectionCollapsibleHtml('Lovers', lovers, focal, 'No known lovers.', 'relationsLovers'),
    subsectionCollapsibleHtml('Friends', friends, focal, 'No close friends.', 'relationsFriends'),
    subsectionCollapsibleHtml('Enemies', enemies, focal, 'No known enemies.', 'relationsEnemies'),
  ].join('');
}

export function subsectionCollapsibleHtml(label, people, focal, emptyText, collapseKey, opts = {}) {
  const previewCount = opts.previewCount ?? FAMILY_PREVIEW_COUNT;
  const fixed = !!opts.fixed;
  const compact = opts.compact !== false;
  const countBadge = people.length
    ? ` <span class="bl-count">${people.length}</span>`
    : '';

  if (!people.length) {
    return `<div class="bl-subsection bl-sub-fixed">
      <div class="bl-sub-label">${escapeHtml(label)}</div>
      <div class="bl-sub-body"><div class="bl-empty">${emptyText}</div></div>
    </div>`;
  }

  const cards = people.map((p) => personCardHtml(p, focal, { compact })).join('');
  const bodyInner = `<div class="bl-sub-cards"><div class="bl-row">${cards}</div></div>`;

  if (fixed || people.length <= previewCount) {
    return `<div class="bl-subsection bl-sub-fixed">
      <div class="bl-sub-label">${escapeHtml(label)}${countBadge}</div>
      <div class="bl-sub-body">${bodyInner}</div>
    </div>`;
  }

  const collapsed = !!subsectionCollapseState[collapseKey];
  return `<div class="bl-subsection bl-collapsible${collapsed ? ' is-collapsed' : ''}" data-collapse-key="${collapseKey}">
    <button type="button" class="bl-sub-toggle" aria-expanded="${!collapsed}">
      <span class="bl-sub-toggle-label">${escapeHtml(label)}</span>${countBadge}
      <span class="bl-sub-toggle-caret" aria-hidden="true">▾</span>
    </button>
    <div class="bl-sub-body">${bodyInner}</div>
  </div>`;
}

export function personCardHtml(p, focal, opts = {}) {
  const isFocal = p.id === focal.id;
  const stackedName = opts.rootsCard || opts.rootsGpCard || opts.partnerCard || opts.compact || opts.mini;
  const classes = [
    'person-card',
    p.isPlayer    ? 'is-player'   : '',
    p.isVampire   ? 'is-vampire'  : '',
    !p.isAlive    ? 'is-deceased' : '',
    isFocal       ? 'is-focal'    : '',
    opts.rootsCard ? 'roots-card' : '',
    opts.rootsGpCard ? 'roots-gp-card' : '',
    opts.partnerCard ? 'partner-card' : '',
    opts.compact  ? 'compact'     : '',
    opts.mini     ? 'mini'        : '',
  ].filter(Boolean).join(' ');

  const relOpts = opts.rootsCard && focal.isPlayer ? { prefix: 'Your ' } : {};
  const rel = relationLabel(p, focal, relOpts);
  const career = (opts.compact || opts.mini || opts.rootsGpCard) ? null : careerDisplay(p);
  const nameHtml = stackedName
    ? hooks.personNameHtml(p, { stacked: true })
    : hooks.personNameHtml(p);

  const showBondBars = !p.isPlayer && !opts.partnerCard;

  return `<div class="${classes}" data-id="${p.id}">
    ${isFocal ? '<div class="pc-here">You are here</div>' : ''}
    <div class="pc-emoji">${hooks.portrait(p)}</div>
    <div class="pc-name">${nameHtml}</div>
    <div class="pc-age">Age ${p.age}${!p.isAlive ? ' †' : ''}</div>
    ${rel ? `<div class="pc-rel">${rel}</div>` : ''}
    ${career ? `<div class="pc-career">${escapeHtml(career)}</div>` : ''}
    ${!p.isAlive ? '<div class="pc-dead">†</div>' : ''}
    ${showBondBars ? relationshipCardBarsHtml(getPlayer(), p) : ''}
  </div>`;
}

export function initBloodlineFocus() {
  const player = getPlayer();
  bl.trail = [player.id];
  bl.focalIndex = 0;
  bl.focalId = player.id;
  // Orphaned players: collapse empty "Your Roots" until they expand it.
  lastFamilyCollapseFocalId = null;
  blFocalView = 'profile';
  syncFamilyCollapseDefaults(player);
  // Reset all sub-tabs to their defaults (first item in each section).
  for (const [section, items] of Object.entries(SUBNAV)) {
    if (items.length) currentSubTab[section] = items[0].key;
  }
}
