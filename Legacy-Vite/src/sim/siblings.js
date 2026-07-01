import { G, getPerson } from '../state/gameState.js';
import { createPerson, inheritStats, applyInheritedStats, snapshotBirthStats } from '../state/personFactory.js';
import { randomName } from '../data/names.js';
import { assignRandomHumor } from './humorPersonality.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';

let hooks = {
  personNameHtmlAnnals: (p) => String(p?.firstName ?? ''),
};

export function registerSiblingHooks(h) {
  hooks = { ...hooks, ...h };
}

export function spawnPendingSiblings(player) {
  // Work backwards so splicing doesn't skip entries
  for (let i = G.pendingSiblings.length - 1; i >= 0; i--) {
    const pending = G.pendingSiblings[i];
    if (player.age >= pending.yearsUntilBirth) {
      const father = getPerson(pending.fatherId);
      const mother = getPerson(pending.motherId);

      // Only spawn if at least one parent is still alive
      if (!father?.isAlive && !mother?.isAlive) {
        G.pendingSiblings.splice(i, 1);
        continue;
      }

      const sibling = createPerson({
        firstName:  randomName(pending.sex),
        surname:    G.surname,
        sex:        pending.sex,
        age:        0,
        generation: 0,
        parentIds:  [pending.fatherId, pending.motherId],
      });
      sibling.yearBorn = G.year;
      // Inherit stats from whichever parents are still around. If one
      // parent has died, we use whoever remains as both sides of the
      // inheritance — gives a believable trait pattern without breaking
      // when a partner is lost.
      const a = father || mother;
      const b = mother || father;
      const inherited = inheritStats(a, b);
      applyInheritedStats(sibling, inherited);
      snapshotBirthStats(sibling);
      assignRandomHumor(sibling);

      G.people.push(sibling);
      if (father) father.childIds.push(sibling.id);
      if (mother) mother.childIds.push(sibling.id);

      const rel = pending.sex === 'M' ? 'brother' : 'sister';
      proposeAnnals({
        msg: `Your ${rel} ${hooks.personNameHtmlAnnals(sibling)} has been born!`,
        type: 'good',
        html: true,
        priority: ANNALS_PRIORITY.LIFE,
        category: 'family_birth',
      });

      G.pendingSiblings.splice(i, 1);
    }
  }
}
