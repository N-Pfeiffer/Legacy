import { G } from '../state/gameState.js';
import {
  createPerson,
  inheritStats,
  snapshotBirthStats,
  applyInheritedStats,
} from '../state/personFactory.js';
import { randomName } from '../data/names.js';
import { assignRandomHumor } from './humorPersonality.js';
import { clearPregnancy, isDueForBirth } from './conception.js';

/**
 * Spawn a newborn and wire family links.
 * @returns {object|null} the new person
 */
export function spawnChild({ mother, father, year, surname, generation }, people = G.people) {
  if (!mother || !father) return null;
  if (!mother.isAlive && !father.isAlive) return null;

  const sex = Math.random() < 0.5 ? 'M' : 'F';
  const child = createPerson({
    firstName: randomName(sex),
    surname: surname ?? mother.surname ?? father.surname ?? '',
    sex,
    age: 0,
    generation: generation ?? mother.generation ?? 0,
    parentIds: [mother.id, father.id],
  });

  child.yearBorn = year;

  const a = mother.isAlive ? mother : father;
  const b = father.isAlive ? father : mother;
  applyInheritedStats(child, inheritStats(a, b));
  snapshotBirthStats(child);
  assignRandomHumor(child);

  people.push(child);
  if (mother.isAlive) mother.childIds.push(child.id);
  if (father.isAlive) father.childIds.push(child.id);

  clearPregnancy(mother);
  return child;
}

/**
 * Resolve births for all carriers due this year.
 * @param {object} opts
 * @param {function} opts.getPerson
 * @param {function} [opts.onPlayerChildBorn] - (child, mother, father) => void
 */
export function tickBirths(people, year, opts = {}) {
  const { getPerson, onPlayerChildBorn } = opts;
  if (!Array.isArray(people) || !getPerson) return;

  for (const carrier of people) {
    if (!carrier?.pregnant?.active || !isDueForBirth(carrier, year)) continue;

    const fatherId = carrier.pregnant.fatherId;
    const father = fatherId != null ? getPerson(fatherId) : null;
    if (!father) {
      clearPregnancy(carrier);
      continue;
    }

    const mother = carrier;
    if (!mother.isAlive && !father.isAlive) {
      clearPregnancy(mother);
      continue;
    }

    const playerParent = mother.isPlayer ? mother : (father.isPlayer ? father : null);
    const surname = playerParent?.surname ?? mother.surname ?? father.surname;

    const child = spawnChild(
      {
        mother,
        father,
        year,
        surname,
        generation: playerParent?.generation ?? mother.generation ?? 0,
      },
      people,
    );

    if (child && playerParent && typeof onPlayerChildBorn === 'function') {
      onPlayerChildBorn(child, mother, father);
    }
  }
}
