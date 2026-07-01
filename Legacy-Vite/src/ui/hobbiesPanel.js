import { HOBBIES_BY_ID } from '../data/hobbies.js';
import { ITEMS_BY_ID } from '../data/items.js';

import { getGatheringConfig, hobbyHasGathering } from '../data/gatheringZones.js';
import { getHuntingConfig, hobbyHasHunting, isDeepWealdUnlocked } from '../data/huntingZones.js';

import { clamp } from '../utils/index.js';

import { escapeHtml } from './eventLog.js';

import {

  getHobbyLevel,

  isHobbyUnlocked,

  hobbiesVisibleToPlayer,

  getHobbyUnlockHint,

  getHobbyAdvancedCraftHint,

  runHobbyEndeavor,

  HOBBY_SKILL_MAX,

} from '../sim/hobbies.js';

import { recipesForHobby } from '../data/recipes.js';
import {
  canCraft,
  getRecipeLabel,
  inputDisplayName,
  inputOwnedCount,
  inputRequiredCount,
  recipeLockLabel,
  recipeRequiresItemLine,
  runCraft,
} from '../sim/crafting.js';
import { canGather, runGather } from '../sim/gathering.js';
import { canHunt, runHunt } from '../sim/hunting.js';

import { canSpendActionPoints } from '../sim/actionPoints.js';

import { proposeAnnals, ANNALS_PRIORITY } from '../sim/annals.js';

import { renderEntryArt, renderArt } from './renderArt.js';



let hooks = {

  render: () => {},

  isTestingCheatsEnabled: () => false,

};



export function registerHobbiesHooks(h) {

  hooks = { ...hooks, ...h };

}



export const hobbiesPanelState = {

  openHobbyId: null,

  subTab: 'endeavors',

};



/** Reset drill-down when leaving Particulars or switching away. */

export function closeHobbiesDrillDown() {

  hobbiesPanelState.openHobbyId = null;

  hobbiesPanelState.subTab = 'endeavors';

}



function renderSkillBar(level) {

  const displayLevel = Math.max(0, Math.round(level));

  const pct = clamp((displayLevel / HOBBY_SKILL_MAX) * 100, 0, 100);

  return `<div class="hobby-skill-row">

      <span class="hobby-skill-label">Skill</span>

      <span class="hobby-skill-value">${displayLevel} / ${HOBBY_SKILL_MAX}</span>

    </div>

    <div class="stat-bar hobby-skill-bar">

      <div class="stat-fill" style="width:${pct}%; background:var(--green);"></div>

    </div>`;

}



function renderHobbyDescriptionHtml(hobby) {

  const base = escapeHtml(hobby.description ?? '');

  const hint = getHobbyAdvancedCraftHint(hobby);

  if (!hint) return base;

  return `${base}<span class="hobby-advanced-craft-hint">${escapeHtml(hint)}</span>`;

}



function renderListView(player, panel) {

  const showLocked = hooks.isTestingCheatsEnabled?.() ?? false;

  const hobbies = hobbiesVisibleToPlayer(player, { includeLocked: showLocked });

  if (!hobbies.length) {

    panel.innerHTML = `<div class="hobbies-panel hobbies-panel--empty">

      <div class="placeholder-card">

        <div class="placeholder-emblem">♛</div>

        <div class="placeholder-text" data-vocab="estate.hobbies_empty">

          No pastimes taken up. Idle hands are the devil's workshop.

        </div>

      </div>

    </div>`;

    return;

  }



  const cards = hobbies.map((h) => {

    const level = getHobbyLevel(player, h.id);

    const unlocked = isHobbyUnlocked(player, h);

    const lockedClass = unlocked ? '' : ' hobby-card--locked';

    const hint = unlocked ? '' : `<div class="hobby-card-lock-hint">${escapeHtml(getHobbyUnlockHint(h))}</div>`;

    const tag = unlocked ? 'button' : 'div';

    const attrs = unlocked

      ? `type="button" class="hobby-card${lockedClass}" data-hobby-id="${escapeHtml(h.id)}"`

      : `class="hobby-card${lockedClass}" aria-disabled="true"`;



    return `<${tag} ${attrs}>

      <div class="hobby-card-header">

        <span class="hobby-card-icon" aria-hidden="true">${renderEntryArt(h, { size: 28, className: 'hobby-card-icon-art', escapeHtml })}</span>

        <span class="hobby-card-label">${escapeHtml(h.label)}</span>

      </div>

      <p class="hobby-card-desc">${renderHobbyDescriptionHtml(h)}</p>

      ${hint}

      <div class="hobby-card-skill-block">

        ${renderSkillBar(level)}

      </div>

    </${tag}>`;

  }).join('');



  panel.innerHTML = `<div class="hobbies-panel">

    <div class="hobby-list">${cards}</div>

  </div>`;



  panel.querySelectorAll('.hobby-card[data-hobby-id]').forEach((btn) => {

    btn.addEventListener('click', () => {

      hobbiesPanelState.openHobbyId = btn.dataset.hobbyId;

      hobbiesPanelState.subTab = 'endeavors';

      renderHobbiesPanel(player);

    });

  });

}



function renderDetailHeader(hobby, player) {

  const level = getHobbyLevel(player, hobby.id);



  return `<div class="hobby-detail-header">

    <div class="hobby-detail-icon" aria-hidden="true">${renderEntryArt(hobby, { size: 36, className: 'hobby-detail-icon-art', escapeHtml })}</div>

    <div class="hobby-detail-identity">

      <div class="hobby-detail-name">${escapeHtml(hobby.label)}</div>

      <div class="hobby-detail-desc">${renderHobbyDescriptionHtml(hobby)}</div>

      <div class="hobby-detail-skill-block">

        ${renderSkillBar(level)}

      </div>

    </div>

  </div>`;

}



function renderSectionNav(hobby) {

  const sections = [{ key: 'endeavors', label: 'Endeavors' }];

  if (hobby.hasCrafting) sections.push({ key: 'crafting', label: 'Crafting' });



  const active = hobbiesPanelState.subTab;

  if (!sections.some((s) => s.key === active)) {

    hobbiesPanelState.subTab = 'endeavors';

  }



  const navClass = hobby.hasCrafting

    ? 'hobby-section-nav hobby-section-nav--split'

    : 'hobby-section-nav hobby-section-nav--single';



  return `<div class="${navClass}">${sections.map((s) => {

    const cls = 'hobby-section-btn' + (s.key === hobbiesPanelState.subTab ? ' active' : '');

    return `<button type="button" class="${cls}" data-hobby-sub="${escapeHtml(s.key)}">${escapeHtml(s.label)}</button>`;

  }).join('')}</div>`;

}



function renderGatherZonesBody(hobby, player) {

  const config = getGatheringConfig(hobby.id);

  const zones = config?.zones ?? [];

  if (!zones.length) {

    return `<div class="hobby-tab-body"><div class="hobby-empty">No gathering sites are available yet.</div></div>`;

  }



  const skill = getHobbyLevel(player, hobby.id);

  const actionLabel = config.actionLabel || 'Gather';



  const rows = zones.map((zone) => {

    const themeAttr = zone.theme ? ` data-theme="${escapeHtml(zone.theme)}"` : '';

    const locked = skill < (zone.skillReq ?? 0);

    const apCost = zone.apCost ?? 1;

    const zoneArt = renderArt(zone.art, {

      size: 32,

      className: 'gather-zone-art',

      escapeHtml,

      entityId: zone.id,

      imageGroup: 'zones',

    });



    if (locked) {

      return `<div class="gather-zone-row gather-zone-row--locked"${themeAttr}>

        <div class="gather-zone-leading">${zoneArt}</div>

        <div class="gather-zone-main">

          <span class="gather-zone-name">${escapeHtml(zone.label)}</span>

          <span class="gather-zone-meta">${apCost} AP</span>

        </div>

        <span class="gather-zone-locked">🔒 Req ${zone.skillReq}</span>

      </div>`;

    }



    const canDo = canGather(player, hobby.id, zone.id);

    const apDisabled = !canSpendActionPoints(player, apCost) ? ' disabled' : '';

    const title = canDo.ok ? zone.flavor || zone.label : '';



    return `<div class="gather-zone-row"${themeAttr} title="${escapeHtml(title)}">

      <div class="gather-zone-leading">${zoneArt}</div>

      <div class="gather-zone-main">

        <span class="gather-zone-name">${escapeHtml(zone.label)}</span>

        <span class="gather-zone-meta">${apCost} AP</span>

      </div>

      <button type="button" class="career-confirm-btn gather-zone-btn${apDisabled}"

        data-gather-zone="${escapeHtml(zone.id)}">${escapeHtml(actionLabel)} ▸</button>

    </div>`;

  }).join('');



  return `<div class="hobby-tab-body"><div class="gather-zone-list">${rows}</div></div>`;

}



function renderHuntZonesBody(hobby, player) {
  const config = getHuntingConfig(hobby.id);
  const zones = config?.zones ?? [];
  if (!zones.length) {
    return `<div class="hobby-tab-body"><div class="hobby-empty">No hunting grounds are available yet.</div></div>`;
  }

  const skill = getHobbyLevel(player, hobby.id);
  const actionLabel = config.actionLabel || 'Hunt';

  const rows = zones.map((zone) => {
    const themeAttr = zone.theme ? ` data-theme="${escapeHtml(zone.theme)}"` : '';
    const questLocked = zone.questLocked && !isDeepWealdUnlocked(player);
    const skillLocked = skill < (zone.skillReq ?? 0);
    const locked = skillLocked || questLocked;
    const apCost = zone.apCost ?? 1;
    const zoneArt = renderArt(zone.art, {
      size: 32,
      className: 'gather-zone-art',
      escapeHtml,
      entityId: zone.id,
      imageGroup: 'zones',
    });

    if (locked) {
      const lockText = questLocked
        ? (zone.lockHint || 'Quest required')
        : `Req ${zone.skillReq}`;
      return `<div class="gather-zone-row gather-zone-row--locked"${themeAttr}>
        <div class="gather-zone-leading">${zoneArt}</div>
        <div class="gather-zone-main">
          <span class="gather-zone-name">${escapeHtml(zone.label)}</span>
          <span class="gather-zone-meta">${apCost} AP</span>
        </div>
        <span class="gather-zone-locked">🔒 ${escapeHtml(lockText)}</span>
      </div>`;
    }

    const canDo = canHunt(player, zone.id);
    const apDisabled = !canSpendActionPoints(player, apCost) ? ' disabled' : '';
    const huntDisabled = !canDo.ok ? ' disabled' : '';
    const title = canDo.ok ? zone.flavor || zone.label : '';

    return `<div class="gather-zone-row"${themeAttr} title="${escapeHtml(title)}">
      <div class="gather-zone-leading">${zoneArt}</div>
      <div class="gather-zone-main">
        <span class="gather-zone-name">${escapeHtml(zone.label)}</span>
        <span class="gather-zone-meta">${apCost} AP</span>
      </div>
      <button type="button" class="career-confirm-btn gather-zone-btn hunt-zone-btn${apDisabled}${huntDisabled}"
        data-hunt-zone="${escapeHtml(zone.id)}">${escapeHtml(actionLabel)} ▸</button>
    </div>`;
  }).join('');

  return `<div class="hobby-tab-body"><div class="gather-zone-list">${rows}</div></div>`;
}



function renderEndeavorsBody(hobby, player) {

  if (hobbyHasHunting(hobby.id)) {

    return renderHuntZonesBody(hobby, player);

  }

  if (hobbyHasGathering(hobby.id)) {

    return renderGatherZonesBody(hobby, player);

  }



  const endeavors = hobby.endeavors || [];

  if (!endeavors.length) {

    return `<div class="hobby-tab-body"><div class="hobby-empty">No endeavors are available yet. Check back as your skills grow.</div></div>`;

  }



  const buttons = endeavors.map((e) => {

    const cost = e.apCost ?? 1;

    const disabled = canSpendActionPoints(player, cost) ? '' : ' disabled';

    return `<button type="button" class="career-confirm-btn hobby-endeavor-btn${disabled}" data-hobby-endeavor="${escapeHtml(e.id)}">${escapeHtml(e.label)} (${cost} AP)</button>`;

  }).join('');



  return `<div class="hobby-tab-body"><div class="hobby-endeavors">${buttons}</div></div>`;

}



function renderCraftingBody(hobby, player) {
  const recipes = recipesForHobby(hobby.id);
  if (!recipes.length) {
    return `<div class="hobby-tab-body"><div class="hobby-empty">No crafting recipes are available yet.</div></div>`;
  }

  const skill = getHobbyLevel(player, hobby.id);
  const rows = recipes.map((recipe) => {
    const label = getRecipeLabel(recipe);
    const outItem = recipe.outputs?.[0];
    const itemDef = outItem
      ? ITEMS_BY_ID[outItem.id]
      : (recipe.requiresItem ? ITEMS_BY_ID[recipe.requiresItem] : null);
    const icon = itemDef
      ? renderEntryArt(itemDef, { size: 24, className: 'craft-recipe-icon-art', escapeHtml })
      : '';

    const skillLocked = skill < (recipe.skillReq ?? 0)
      || (recipe.extraSkillReqs || []).some((extra) => {
        const key = extra.hobbyId || extra.skill;
        return getHobbyLevel(player, key) < (extra.level ?? 0);
      });

    if (skillLocked) {
      const lockText = recipeLockLabel(recipe);
      return `<div class="craft-recipe-row craft-recipe-row--locked">
        <div class="craft-recipe-leading">${icon}</div>
        <div class="craft-recipe-main">
          <span class="craft-recipe-name">${escapeHtml(label)}</span>
          <span class="craft-recipe-locked">🔒 Requires ${escapeHtml(lockText)}</span>
        </div>
      </div>`;
    }

    const inputSpans = recipe.inputs.map((input) => {
      const owned = inputOwnedCount(player, input);
      const required = inputRequiredCount(input);
      const shortClass = owned < required ? ' craft-input--short' : '';
      const name = inputDisplayName(input);
      return `<span class="craft-input${shortClass}">${escapeHtml(name)} ${owned}/${required}</span>`;
    }).join('<span class="craft-input-sep"> · </span>');

    const reqItem = recipeRequiresItemLine(player, recipe);
    const reqItemSpan = reqItem
      ? `<span class="craft-input${reqItem.owned < reqItem.required ? ' craft-input--short' : ''}">${escapeHtml(reqItem.name)} ${reqItem.owned}/${reqItem.required}</span>`
      : '';
    const allInputSpans = [inputSpans, reqItemSpan].filter(Boolean).join('<span class="craft-input-sep"> · </span>');

    const apCost = recipe.apCost ?? 1;
    const canDo = canCraft(player, recipe.id);
    const apDisabled = !canSpendActionPoints(player, apCost) ? ' disabled' : '';
    const craftDisabled = !canDo.ok ? ' disabled' : '';

    return `<div class="craft-recipe-row">
      <div class="craft-recipe-leading">${icon}</div>
      <div class="craft-recipe-main">
        <span class="craft-recipe-name">${escapeHtml(label)}</span>
        <div class="craft-recipe-inputs">${allInputSpans || '<span class="craft-input">—</span>'}</div>
        <div class="craft-recipe-meta">
          <span class="craft-recipe-chip">Skill ${recipe.skillReq ?? 0}</span>
          <span class="craft-recipe-chip">${apCost} AP</span>
        </div>
      </div>
      <button type="button" class="career-confirm-btn craft-recipe-btn${apDisabled}${craftDisabled}"
        data-craft-recipe="${escapeHtml(recipe.id)}">Craft ▸</button>
    </div>`;
  }).join('');

  return `<div class="hobby-tab-body"><div class="craft-recipe-list">${rows}</div></div>`;
}



function wireGatherButtons(panel, player, hobby) {

  panel.querySelectorAll('.gather-zone-btn[data-gather-zone]').forEach((btn) => {

    btn.addEventListener('click', () => {

      if (btn.disabled) return;

      const zoneId = btn.dataset.gatherZone;

      const result = runGather(player, hobby.id, zoneId);

      if (result.reason === 'no_action_points') {

        proposeAnnals({

          msg: 'You have no action points left this year.',

          type: 'info',

          priority: ANNALS_PRIORITY.FLAVOR,

        });

        hooks.render();

        return;

      }

      if (result.ok && result.message) {

        proposeAnnals({

          msg: result.message,

          type: result.type || 'good',

          priority: ANNALS_PRIORITY.FLAVOR,

        });

      }

      hooks.render();

    });

  });

}



function wireHuntButtons(panel, player) {
  panel.querySelectorAll('.hunt-zone-btn[data-hunt-zone]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const zoneId = btn.dataset.huntZone;
      const result = runHunt(player, zoneId);
      if (result.reason === 'no_action_points') {
        proposeAnnals({
          msg: 'You have no action points left this year.',
          type: 'info',
          priority: ANNALS_PRIORITY.FLAVOR,
        });
        hooks.render();
        return;
      }
      if (result.ok && result.message) {
        proposeAnnals({
          msg: result.message,
          type: result.type || 'good',
          priority: ANNALS_PRIORITY.FLAVOR,
        });
      }
      hooks.render();
    });
  });
}

function wireCraftButtons(panel, player, hobby) {
  panel.querySelectorAll('.craft-recipe-btn[data-craft-recipe]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const recipeId = btn.dataset.craftRecipe;
      const result = runCraft(player, recipeId);
      if (result.reason === 'no_action_points') {
        proposeAnnals({
          msg: 'You have no action points left this year.',
          type: 'info',
          priority: ANNALS_PRIORITY.FLAVOR,
        });
        hooks.render();
        return;
      }
      if (result.ok && result.message) {
        proposeAnnals({
          msg: result.message,
          type: result.type || 'good',
          priority: ANNALS_PRIORITY.FLAVOR,
        });
      }
      hooks.render();
    });
  });
}

function renderDetailView(player, panel) {

  const hobby = HOBBIES_BY_ID[hobbiesPanelState.openHobbyId];

  if (!hobby || !isHobbyUnlocked(player, hobby)) {

    closeHobbiesDrillDown();

    renderListView(player, panel);

    return;

  }



  const body = hobbiesPanelState.subTab === 'crafting' && hobby.hasCrafting

    ? renderCraftingBody(hobby, player)

    : renderEndeavorsBody(hobby, player);



  panel.innerHTML = `<div class="hobbies-panel hobbies-detail">

    <button type="button" class="hobby-back-btn">← Back</button>

    ${renderDetailHeader(hobby, player)}

    ${renderSectionNav(hobby)}

    ${body}

  </div>`;



  panel.querySelector('.hobby-back-btn')?.addEventListener('click', () => {

    closeHobbiesDrillDown();

    renderHobbiesPanel(player);

  });



  panel.querySelectorAll('.hobby-section-btn[data-hobby-sub]').forEach((btn) => {

    btn.addEventListener('click', () => {

      hobbiesPanelState.subTab = btn.dataset.hobbySub;

      renderHobbiesPanel(player);

    });

  });



  wireGatherButtons(panel, player, hobby);

  wireHuntButtons(panel, player);

  wireCraftButtons(panel, player, hobby);



  panel.querySelectorAll('.hobby-endeavor-btn[data-hobby-endeavor]').forEach((btn) => {

    btn.addEventListener('click', () => {

      if (btn.disabled) return;

      const endeavorId = btn.dataset.hobbyEndeavor;

      const result = runHobbyEndeavor(player, hobby.id, endeavorId);

      if (result.reason === 'no_action_points') {

        proposeAnnals({

          msg: 'You have no action points left this year.',

          type: 'info',

          priority: ANNALS_PRIORITY.FLAVOR,

        });

        hooks.render();

        return;

      }

      if (!result.ok && result.message) {
        proposeAnnals({
          msg: result.message,
          type: 'info',
          priority: ANNALS_PRIORITY.FLAVOR,
        });
        hooks.render();
        return;
      }

      if (result.ok && result.message) {

        proposeAnnals({

          msg: result.message,

          type: result.type || 'info',

          priority: ANNALS_PRIORITY.FLAVOR,

        });

      }

      hooks.render();

    });

  });

}



export function renderHobbiesPanel(player) {

  const panel = document.getElementById('est-panel-hobbies');

  if (!panel || !player) return;



  if (hobbiesPanelState.openHobbyId) {

    renderDetailView(player, panel);

  } else {

    renderListView(player, panel);

  }

}


