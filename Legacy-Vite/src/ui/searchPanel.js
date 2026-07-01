import { G, getPlayer } from '../state/gameState.js';
import { escapeHtml } from './eventLog.js';
import { careerDisplay } from '../sim/careers.js';
import { relationLabel } from './relations.js';
import { showSection, setSubTab } from './navigation.js';

let hooks = {
  portrait: () => '👤',
  personNameHtml: () => '',
};

export function registerSearchHooks(h) {
  hooks = { ...hooks, ...h };
}

export const searchState = {
  expanded: false,
  query:    '',
  sex:      'any',
  status:   'any',
  relation: new Set(['any']),
};

export function wireSearch() {
  const toggle  = document.getElementById('search-toggle');
  const body    = document.getElementById('search-body');
  const input   = document.getElementById('search-input');
  const clear   = document.getElementById('search-clear');

  toggle.addEventListener('click', () => setSearchExpanded(!searchState.expanded));

  input.addEventListener('input', () => {
    searchState.query = input.value;
    renderSearchResults();
  });

  // Keyboard niceties: Escape clears + collapses; Enter focuses first result.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (searchState.query) {
        clearSearchInput();
      } else {
        setSearchExpanded(false);
      }
    } else if (e.key === 'Enter') {
      const firstCard = document.querySelector('#search-results .person-card[data-id]');
      if (firstCard) firstCard.click();
    }
  });

  clear.addEventListener('click', clearSearchInput);

  // Chip groups. Single-select for sex/status, multi-select for relation.
  document.querySelectorAll('.search-chips').forEach(group => {
    const filter = group.dataset.filter;
    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.search-chip');
      if (!chip) return;
      const value = chip.dataset.value;
      if (filter === 'relation') {
        toggleRelationChip(value);
      } else {
        searchState[filter] = value;
      }
      paintChipGroup(group);
      renderSearchResults();
    });
  });

  // Header shortcut: routes to Memories tab with search pre-opened.
  document.getElementById('header-search-btn').addEventListener('click', openSearchFromHeader);

  // Initial paint so the chip ACTIVE states match initial state.
  document.querySelectorAll('.search-chips').forEach(paintChipGroup);
}

export function clearSearchInput() {
  const input = document.getElementById('search-input');
  input.value = '';
  searchState.query = '';
  renderSearchResults();
  input.focus();
}

export function setSearchExpanded(open) {
  searchState.expanded = !!open;
  const body   = document.getElementById('search-body');
  const toggle = document.getElementById('search-toggle');
  body.hidden = !open;
  toggle.setAttribute('aria-expanded', String(!!open));
  if (open) {
    renderSearchResults();
    // Defer focus until after the body is shown.
    setTimeout(() => document.getElementById('search-input').focus(), 0);
  }
}

export function openSearchFromHeader() {
  showSection('decisions');
  setSubTab('decisions', 'memories');
  setSearchExpanded(true);
}

export function toggleRelationChip(value) {
  const set = searchState.relation;
  if (value === 'any') {
    set.clear();
    set.add('any');
    return;
  }
  set.delete('any');
  if (set.has(value)) {
    set.delete(value);
    if (set.size === 0) set.add('any');
  } else {
    set.add(value);
  }
}

export function paintChipGroup(group) {
  const filter = group.dataset.filter;
  group.querySelectorAll('.search-chip').forEach(chip => {
    const value = chip.dataset.value;
    const active = (filter === 'relation')
      ? searchState.relation.has(value)
      : searchState[filter] === value;
    chip.classList.toggle('active', active);
  });
}

export function matchesRelationFilter(person) {
  if (searchState.relation.has('any')) return true;
  const tags = relationsForPerson(person);
  for (const wanted of searchState.relation) {
    if (tags.has(wanted)) return true;
  }
  return false;
}

export function renderSearchResults() {
  const results = document.getElementById('search-results');
  const meta    = document.getElementById('search-meta');
  if (!results || !meta) return;

  const q = searchState.query.trim().toLowerCase();

  const matched = G.people.filter(p => {
    // Don't show the player in their own search results.
    if (p.isPlayer) return false;

    if (searchState.sex !== 'any' && p.sex !== searchState.sex) return false;

    if (searchState.status === 'alive' && !p.isAlive) return false;
    if (searchState.status === 'dead'  &&  p.isAlive) return false;

    if (!matchesRelationFilter(p)) return false;

    if (q) {
      const haystack = `${p.firstName} ${p.surname} ${p.maidenName || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Sort: deceased to the back; within those, recent (younger or recently
  // died) before older. A more sophisticated ordering by recency-of-contact
  // can replace this once interactions are tracked.
  matched.sort((a, b) => {
    if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
    return (b.yearBorn || 0) - (a.yearBorn || 0);
  });

  meta.textContent = matched.length === 0
    ? 'No matches.'
    : `${matched.length} ${matched.length === 1 ? 'match' : 'matches'}`;

  if (matched.length === 0) {
    results.innerHTML = `<div class="search-empty">No one fits that description.</div>`;
    return;
  }

  results.innerHTML = matched.map(p => searchPersonCardHtml(p)).join('');
}

export function searchPersonCardHtml(p) {
  const classes = [
    'person-card',
    p.isVampire  ? 'is-vampire'  : '',
    !p.isAlive   ? 'is-deceased' : '',
  ].filter(Boolean).join(' ');

  // Relation label relative to player. No prefix here (cards are
  // compact and "Father" reads better than "Your Father" in a list).
  const player = getPlayer();
  const rel = relationLabel(p, player);
  // Career: always shown when present (per design — we don't gate by
  // "have you interacted with this NPC", because there isn't really
  // an interaction-tracking system yet, and showing career labels makes
  // the world feel populated).
  const career = careerDisplay(p);

  return `<div class="${classes}" data-id="${p.id}">
    <div class="pc-emoji">${hooks.portrait(p)}</div>
    <div class="pc-name">${hooks.personNameHtml(p)}</div>
    <div class="pc-age">Age ${p.age}${!p.isAlive ? ' †' : ''}</div>
    ${rel ? `<div class="pc-rel">${rel}</div>` : ''}
    ${career ? `<div class="pc-career">${escapeHtml(career)}</div>` : ''}
    ${!p.isAlive ? '<div class="pc-dead">†</div>' : ''}
  </div>`;
}
