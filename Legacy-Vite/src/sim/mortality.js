import { G, getAlive } from '../state/gameState.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { recordMilestone } from './situationLog.js';
import { isJournaled } from './journal.js';

let hooks = {
  personNameHtmlAnnals: (p) => String(p?.firstName ?? ''),
  disableAgeUp: () => {},
};

export function registerMortalityHooks(h) {
  hooks = { ...hooks, ...h };
}

export function mortalityChance(p) {
  let c = 0;
  if (p.age >= 85) c += 0.18;
  else if (p.age >= 75) c += 0.08;
  else if (p.age >= 65) c += 0.03;
  else if (p.age >= 50) c += 0.008;
  if (p.isPlayer && p.health < 20) c += 0.18;
  if (p.isPlayer && p.health < 10) c += 0.30;
  return c;
}

export function checkMortality() {
  for (const p of getAlive()) {
    if (Math.random() < mortalityChance(p)) killPerson(p);
  }
}

export function killPerson(p, opts = {}) {
  p.isAlive  = false;
  p.yearDied = G.year;
  if (p.isPlayer) {
    if (!opts.skipMilestone) {
      recordMilestone(p, {
        title: 'Death',
        narrative: `Your mortal life has ended at age ${p.age}. The bloodline endures.`,
        memoryCategory: 'family_death',
        type: 'bad',
        year: G.year,
      });
    }
    hooks.disableAgeUp();
  } else if (isJournaled(p)) {
    proposeAnnals({
      msg: `${hooks.personNameHtmlAnnals(p)} has passed away at age ${p.age}.`,
      type: 'bad',
      html: true,
      priority: ANNALS_PRIORITY.LIFE,
      category: 'family_death',
    });
  }
}
