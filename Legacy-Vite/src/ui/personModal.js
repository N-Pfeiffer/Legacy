import { getPerson, getPlayer, getCurrentSection } from '../state/gameState.js';
import { escapeHtml } from './eventLog.js';
import { careerDisplay } from '../sim/careers.js';
import { relationLabel } from './relations.js';
import { focalStatsHtml } from './bloodline.js';
import { showSection, setSubTab } from './navigation.js';
import {
  renderPersonActionBarHtml,
  renderPersonTraitsPanelHtml,
  renderPersonItemsPanelHtml,
  wirePersonActionBar,
  wirePersonItemsPanel,
  wirePersonPanelBack,
} from './personPanels.js';
import { relationshipBondPanelHtml } from './relationshipBars.js';
import {
  canInteractWithPerson,
  interactPanelHtml,
  wireInteractPanel,
  handlePersonInteractAction,
} from './personInteract.js';

let hooks = {
  portrait: () => '👤',
  personNameHtml: () => '',
  setFocal: (_id) => {},
  getItemPopupOptions: () => ({}),
};

export function registerPersonModalHooks(h) {
  hooks = { ...hooks, ...h };
}

export const personInfoState = { personId: null, view: 'details', interactSubView: null };

export function wirePersonInfoInteractEvents(content, p, personId) {
  const player = getPlayer();
  const subView = personInfoState.interactSubView;
  wireInteractPanel(content, player, p, 'person-info-action', {
    subView,
    onBack: () => {
      if (subView === 'propose') {
        personInfoState.interactSubView = null;
        renderPersonInfoInteractView(personId);
        return;
      }
      renderPersonInfoDetailsView(personId);
    },
    onAction: (actionId) => handlePersonInteractAction(p, actionId, {
      refreshPopup: true,
      onProposePanel: () => {
        personInfoState.interactSubView = 'propose';
        renderPersonInfoInteractView(personId);
      },
    }),
  });
}

export function closePersonInfoModal() {
  personInfoState.personId = null;
  personInfoState.view = 'details';
  personInfoState.interactSubView = null;
  document.getElementById('person-info-overlay')?.classList.remove('active');
}

export function personInfoHeaderHtml(p, player) {
  const relLabel = relationLabel(p, player, {
    prefix:    'Your ',
    fallback:  'Kin',
    selfLabel: 'Yourself',
  });
  const career = careerDisplay(p);
  const metaParts = [`Age ${p.age}`, `b. ${p.yearBorn}`];
  if (p.yearDied) metaParts.push(`d. ${p.yearDied}`);

  const portraitClasses = [
    'person-info-portrait',
    p.isVampire  ? 'is-vampire'  : '',
    !p.isAlive   ? 'is-deceased' : '',
  ].filter(Boolean).join(' ');

  return `<div class="person-info-top">
      <div class="person-info-header">
        <div class="person-info-portrait-col">
          <button type="button" class="${portraitClasses}" data-person-id="${p.id}" title="View their bloodline">
            ${hooks.portrait(p)}
          </button>
          <div class="person-info-hint">Click portrait to view their bloodline</div>
        </div>
        <div class="person-info-identity">
          <div class="person-info-name">${hooks.personNameHtml(p)}${p.isVampire ? ' <span class="nature-mark">Vampire</span>' : ''}</div>
          <div class="person-info-meta">${escapeHtml(metaParts.join(' · '))}</div>
          <div class="person-info-rel">${escapeHtml(relLabel)}</div>
          ${career ? `<div class="person-info-career">${escapeHtml(career)}</div>` : ''}
        </div>
      </div>
      ${renderPersonActionBarHtml(p, player, {
        actionAttr: 'person-info-action',
        showInteract: canInteractWithPerson(player, p),
      })}
    </div>`;
}

export function wirePersonInfoPortrait(content, p) {
  content.querySelector('.person-info-portrait')?.addEventListener('click', () => {
    closePersonInfoModal();
    if (getCurrentSection() !== 'bloodline') showSection('bloodline');
    hooks.setFocal(p.id);
  });
}

export function wirePersonInfoActionBar(content, p) {
  const personId = p.id;
  wirePersonActionBar(content, 'person-info-action', {
    onTraits: () => {
      if (personInfoState.view === 'traits' && personInfoState.personId === personId) {
        renderPersonInfoDetailsView(personId);
      } else {
        renderPersonInfoTraitsView(personId);
      }
    },
    onItems: () => {
      if (personInfoState.view === 'items' && personInfoState.personId === personId) {
        renderPersonInfoDetailsView(personId);
      } else {
        renderPersonInfoItemsView(personId);
      }
    },
    onInteract: () => {
      if (personInfoState.view === 'interact' && personInfoState.personId === personId) {
        renderPersonInfoDetailsView(personId);
      } else {
        personInfoState.interactSubView = null;
        renderPersonInfoInteractView(personId);
      }
    },
  });
}

export function wirePersonInfoDetailsEvents(content, p) {
  wirePersonInfoPortrait(content, p);
  wirePersonInfoActionBar(content, p);
}

export function renderPersonInfoDetailsView(personId) {
  const p = getPerson(personId);
  if (!p) return;

  const overlay = document.getElementById('person-info-overlay');
  const content = document.getElementById('person-info-content');
  if (!overlay || !content) return;

  const player = getPlayer();
  personInfoState.personId = personId;
  personInfoState.view = 'details';

  content.innerHTML = `${personInfoHeaderHtml(p, player)}
    ${relationshipBondPanelHtml(player, p)}
    <div class="person-info-stats">
      <div class="person-info-stats-title">Attributes</div>
      ${focalStatsHtml(p)}
    </div>`;

  wirePersonInfoDetailsEvents(content, p);
}

export function renderPersonInfoTraitsView(personId) {
  const p = getPerson(personId);
  if (!p) return;

  const content = document.getElementById('person-info-content');
  if (!content) return;

  const player = getPlayer();
  personInfoState.personId = personId;
  personInfoState.view = 'traits';

  content.innerHTML = personInfoHeaderHtml(p, player)
    + renderPersonTraitsPanelHtml(p, { actionAttr: 'person-info-action' });

  wirePersonInfoPortrait(content, p);
  wirePersonInfoActionBar(content, p);
  wirePersonPanelBack(content, 'person-info-action', () => renderPersonInfoDetailsView(personId));
}

export function renderPersonInfoItemsView(personId) {
  const p = getPerson(personId);
  if (!p) return;

  const content = document.getElementById('person-info-content');
  if (!content) return;

  const player = getPlayer();
  personInfoState.personId = personId;
  personInfoState.view = 'items';

  content.innerHTML = personInfoHeaderHtml(p, player)
    + renderPersonItemsPanelHtml(p, escapeHtml, hooks.getItemPopupOptions(), { actionAttr: 'person-info-action' });

  wirePersonInfoPortrait(content, p);
  wirePersonInfoActionBar(content, p);
  wirePersonItemsPanel(content, player, escapeHtml, hooks.getItemPopupOptions());
  wirePersonPanelBack(content, 'person-info-action', () => renderPersonInfoDetailsView(personId));
}

export function renderPersonInfoInteractView(personId) {
  const p = getPerson(personId);
  if (!p) return;

  const player = getPlayer();
  if (!canInteractWithPerson(player, p)) {
    renderPersonInfoDetailsView(personId);
    return;
  }

  const content = document.getElementById('person-info-content');
  if (!content) return;

  personInfoState.personId = personId;
  personInfoState.view = 'interact';
  if (personInfoState.interactSubView !== 'propose') {
    personInfoState.interactSubView = null;
  }

  content.innerHTML = personInfoHeaderHtml(p, player)
    + interactPanelHtml(player, p, 'person-info-action', personInfoState.interactSubView);

  wirePersonInfoPortrait(content, p);
  wirePersonInfoActionBar(content, p);
  wirePersonInfoInteractEvents(content, p, personId);
}

export function openPersonInfoModal(personId) {
  const p = getPerson(personId);
  if (!p) return;

  const overlay = document.getElementById('person-info-overlay');
  if (!overlay) return;

  renderPersonInfoDetailsView(personId);
  overlay.classList.add('active');
}

export function wirePersonInfoOverlay() {
  const overlay = document.getElementById('person-info-overlay');
  if (!overlay || overlay._personInfoWired) return;
  overlay._personInfoWired = true;

  document.getElementById('person-info-close')?.addEventListener('click', closePersonInfoModal);
  overlay.addEventListener('click', (e) => {
    if (e.target.id === 'person-info-overlay') closePersonInfoModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !overlay.classList.contains('active')) return;
    if (personInfoState.view !== 'details' && personInfoState.personId != null) {
      renderPersonInfoDetailsView(personInfoState.personId);
      return;
    }
    closePersonInfoModal();
  });

  document.getElementById('bloodline-container')?.addEventListener('click', (e) => {
    const card = e.target.closest('.person-card[data-id]');
    if (!card) return;
    openPersonInfoModal(parseInt(card.dataset.id, 10));
  });

  document.getElementById('search-results')?.addEventListener('click', (e) => {
    const card = e.target.closest('.person-card[data-id]');
    if (!card) return;
    openPersonInfoModal(parseInt(card.dataset.id, 10));
  });

  function handleLogPersonLinkClick(e) {
    const link = e.target.closest('.log-person-link[data-person-id]');
    if (!link) return;
    e.preventDefault();
    openPersonInfoModal(parseInt(link.dataset.personId, 10));
  }

  document.getElementById('event-log')?.addEventListener('click', handleLogPersonLinkClick);
  document.getElementById('memories-list')?.addEventListener('click', handleLogPersonLinkClick);
}
