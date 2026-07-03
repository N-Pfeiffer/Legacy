import { G, getPlayer, getPerson } from '../state/gameState.js';
import { ANNALS_PRIORITY, proposeAnnals } from '../sim/annals.js';
import { appendAnnalsOutcomeHtml } from '../sim/situationLog.js';
import { currentFertility } from '../sim/conception.js';
import {
  getAvailableInteractChoices,
  performPersonInteraction,
} from '../sim/personInteractions.js';
import { isProposalAttemptAction } from '../data/marriageProposal.js';
import {
  renderPersonInteractPanelHtml,
  renderProposeMarriagePanelHtml,
  wirePersonInteractPanel,
  wireProposeMarriagePanel,
} from './personPanels.js';
import { relationshipBondPanelHtml } from './relationshipBars.js';
import { openMarriageProposalResultPopup } from './marriageProposalPopup.js';
import { escapeHtml } from './eventLog.js';

let hooks = {
  render: () => {},
  renderBloodline: () => {},
  renderPersonInfoInteractView: (_id) => {},
  personNameHtml: () => '',
  personNameHtmlAnnals: () => '',
  clearInteractSubViews: () => {},
};

export function registerPersonInteractHooks(h) {
  hooks = { ...hooks, ...h };
}

export function canInteractWithPerson(player, target) {
  if (!player || !target) return false;
  if (target.isPlayer) return false;
  if (!target.isAlive) return false;
  return true;
}

export function interactPanelHtml(player, target, actionAttr, subView = null) {
  const bondHtml = relationshipBondPanelHtml(player, target);
  if (subView === 'propose') {
    return renderProposeMarriagePanelHtml(player, { actionAttr, bondHtml });
  }
  return renderPersonInteractPanelHtml({
    player,
    actionAttr,
    bondHtml,
    choices: getAvailableInteractChoices(player, target),
  });
}

export function wireInteractPanel(container, player, target, actionAttr, {
  subView = null,
  onBack,
  onAction,
}) {
  if (subView === 'propose') {
    wireProposeMarriagePanel(container, actionAttr, { onBack, onAction });
    return;
  }
  wirePersonInteractPanel(container, actionAttr, { onBack, onAction });
}

export function handlePersonInteractAction(p, actionId, { refreshPopup, refreshFocal, onProposePanel }) {
  const player = getPlayer();
  if (!canInteractWithPerson(player, p)) return;

  const result = performPersonInteraction(player, p, actionId, G.year, {
    personNameHtml: hooks.personNameHtmlAnnals,
    currentFertility,
  });

  if (result.reason === 'no_action_points') {
    proposeAnnals({
      msg: 'You have no action points left this year.',
      type: 'info',
      priority: ANNALS_PRIORITY.FLAVOR,
    });
    hooks.render();
    return;
  }

  if (result.openProposePanel) {
    onProposePanel?.();
    return;
  }

  if (!result.ok) return;

  if (isProposalAttemptAction(actionId)) {
    hooks.clearInteractSubViews();
  }

  if (result.showProposalResult) {
    const target = getPerson(result.targetId) || p;
    openMarriageProposalResultPopup(player, target, result.showProposalResult, {
      escapeHtml,
      personNameHtml: hooks.personNameHtml,
      personNameHtmlAnnals: hooks.personNameHtmlAnnals,
      ringLabel: result.ringLabel,
      onAnnals: (entry) => {
        proposeAnnals({
          ...entry,
          priority: ANNALS_PRIORITY.LIFE,
          category: 'family_marriage',
        });
      },
      onComplete: () => {
        hooks.render();
        if (refreshPopup) hooks.renderPersonInfoInteractView(p.id);
        if (refreshFocal) hooks.renderBloodline();
      },
    });
    return;
  }

  if (result.message) {
    const msg = result.effects?.length
      ? appendAnnalsOutcomeHtml(result.message, result.effects)
      : result.message;
    proposeAnnals({
      msg,
      type: result.type || 'info',
      html: true,
      priority: ANNALS_PRIORITY.LIFE,
    });
  }

  hooks.render();
  if (refreshPopup) hooks.renderPersonInfoInteractView(p.id);
  if (refreshFocal) hooks.renderBloodline();
}
