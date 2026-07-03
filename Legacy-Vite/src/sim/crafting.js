import { ITEMS_BY_ID } from '../data/items.js';
import { HOBBIES_BY_ID } from '../data/hobbies.js';
import { RECIPES_BY_ID } from '../data/recipes.js';
import {
  addEquipment,
  addMaterial,
  hasItem,
  materialCount,
  removeItem,
  removeMaterial,
} from './personItems.js';
import {
  canSpendActionPoints,
  spendActionPoints,
} from './actionPoints.js';
import { addHobbySkill, getHobbyLevel, isHobbyUnlocked } from './hobbies.js';
import { grantScholarshipRoll } from './scholarship.js';

function inputsMet(person, inputs) {
  for (const input of inputs) {
    if (input.oneOf) {
      const ok = input.oneOf.some((opt) => materialCount(person, opt.id) >= opt.n);
      if (!ok) return false;
    } else if (materialCount(person, input.id) < input.n) {
      return false;
    }
  }
  return true;
}

function consumeInputs(person, inputs) {
  for (const input of inputs) {
    if (input.oneOf) {
      const chosen = input.oneOf.find((opt) => materialCount(person, opt.id) >= opt.n);
      if (chosen) removeMaterial(person, chosen.id, chosen.n);
    } else {
      removeMaterial(person, input.id, input.n);
    }
  }
}

function grantOutput(person, { id, n }) {
  const item = ITEMS_BY_ID[id];
  if (!item || n <= 0) return;
  if (item.category === 'equipment') {
    for (let i = 0; i < n; i++) addEquipment(person, id);
  } else {
    addMaterial(person, id, n);
  }
}

function extraRequirementsMet(player, recipe) {
  for (const extra of recipe.extraSkillReqs || []) {
    const hobbyKey = extra.hobbyId || extra.skill;
    if (getHobbyLevel(player, hobbyKey) < (extra.level ?? 0)) return false;
  }
  return true;
}

export function recipeHasAnyIngredient(player, recipe) {
  if (!player || !recipe) return false;

  for (const input of recipe.inputs || []) {
    if (input.oneOf) {
      if (input.oneOf.some((opt) => materialCount(player, opt.id) >= 1)) return true;
    } else if (materialCount(player, input.id) >= 1) {
      return true;
    }
  }

  if (recipe.requiresItem && hasItem(player, recipe.requiresItem)) return true;

  return false;
}

export function getRecipeLabel(recipe) {
  if (recipe?.label) return recipe.label;
  const out = recipe?.outputs?.[0];
  return ITEMS_BY_ID[out?.id]?.label || recipe?.id || '';
}

export function canCraft(player, recipeId) {
  const recipe = RECIPES_BY_ID[recipeId];
  if (!player?.isPlayer || !recipe) return { ok: false, reason: 'invalid' };

  const hobby = HOBBIES_BY_ID[recipe.hobbyId];
  if (!hobby || !isHobbyUnlocked(player, hobby)) return { ok: false, reason: 'locked' };

  const skill = getHobbyLevel(player, recipe.hobbyId);
  if (skill < (recipe.skillReq ?? 0)) return { ok: false, reason: 'skill' };
  if (!extraRequirementsMet(player, recipe)) return { ok: false, reason: 'extra_skill' };

  if (!inputsMet(player, recipe.inputs)) return { ok: false, reason: 'inputs' };
  if (recipe.requiresItem && !hasItem(player, recipe.requiresItem)) {
    return { ok: false, reason: 'inputs' };
  }

  const cost = recipe.apCost ?? 1;
  if (!canSpendActionPoints(player, cost)) return { ok: false, reason: 'no_action_points' };

  return { ok: true };
}

export function runCraft(player, recipeId) {
  const check = canCraft(player, recipeId);
  if (!check.ok) return { ok: false, reason: check.reason };

  const recipe = RECIPES_BY_ID[recipeId];
  const hobby = HOBBIES_BY_ID[recipe.hobbyId];
  const cost = recipe.apCost ?? 1;

  if (!spendActionPoints(player, cost)) {
    return { ok: false, reason: 'no_action_points' };
  }

  consumeInputs(player, recipe.inputs);
  if (recipe.requiresItem) removeItem(player, recipe.requiresItem);
  addHobbySkill(player, recipe.hobbyId, recipe.skillGain ?? 0.5);
  const level = Math.round(getHobbyLevel(player, recipe.hobbyId));

  let outputLabel = '';
  if (recipe.outputRoll) {
    outputLabel = grantScholarshipRoll(player, recipe.outputRoll) || 'something unexpected';
  } else {
    for (const output of recipe.outputs || []) {
      grantOutput(player, output);
    }
    outputLabel = (recipe.outputs || [])
      .map(({ id, n }) => {
        const label = ITEMS_BY_ID[id]?.label || id;
        return n > 1 ? `${n} ${label}` : label;
      })
      .join(' and ');
  }

  const action = recipe.outputRoll ? 'completed' : 'crafted';
  const message = recipe.outputRoll
    ? `You completed ${getRecipeLabel(recipe)} and uncovered ${outputLabel}. (${hobby.label} skill now ${level}.)`
    : `You crafted ${outputLabel}. (${hobby.label} skill now ${level}.)`;

  return { ok: true, message, type: 'good', level };
}

/** Owned count for a recipe input (handles oneOf as best available option). */
export function inputOwnedCount(player, input) {
  if (input.oneOf) {
    return Math.max(...input.oneOf.map((opt) => materialCount(player, opt.id)));
  }
  return materialCount(player, input.id);
}

export function inputRequiredCount(input) {
  if (input.oneOf) return input.oneOf[0]?.n ?? 1;
  return input.n ?? 1;
}

export function inputDisplayName(input) {
  if (input.oneOf) {
    return input.oneOf
      .map((opt) => ITEMS_BY_ID[opt.id]?.label || opt.id)
      .join(' OR ');
  }
  return ITEMS_BY_ID[input.id]?.label || input.id;
}

export function recipeRequiresItemLine(player, recipe) {
  if (!recipe?.requiresItem) return null;
  const id = recipe.requiresItem;
  const name = ITEMS_BY_ID[id]?.label || id;
  const owned = hasItem(player, id) ? 1 : 0;
  return { name, owned, required: 1 };
}

export function recipeLockLabel(recipe) {
  const hobby = HOBBIES_BY_ID[recipe.hobbyId];
  const parts = [];
  if ((recipe.skillReq ?? 0) > 0) {
    parts.push(`${hobby?.label || recipe.hobbyId} ${recipe.skillReq}`);
  }
  for (const extra of recipe.extraSkillReqs || []) {
    const key = extra.hobbyId || extra.skill;
    const label = HOBBIES_BY_ID[key]?.label || key;
    parts.push(`${label} ${extra.level ?? 0}`);
  }
  return parts.join(', ');
}
