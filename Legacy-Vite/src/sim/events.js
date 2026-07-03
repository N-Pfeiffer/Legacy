import { G } from '../state/gameState.js';
import { eligibleEras } from '../data/eras.js';
import { PLAYER_EVENTS } from '../data/playerEvents.js';
import { pick, weightedPick } from '../utils/index.js';
import { ANNALS_PRIORITY, proposeAnnals } from './annals.js';
import { isInPrison } from './prison.js';
import { tickParticularsSituations } from '../data/particularsSituations.js';

let hooks = {
  fireSituation: () => {},
};

export function registerEventHooks(h) {
  hooks = { ...hooks, ...h };
}

export function resolveFlavor(event, era, mode) {
  return event.flavor?.[era]?.[mode] || null;
}

export function eventEligibleEras(event, eras, mode) {
  const gated = event.eras
    ? eras.filter(e => event.eras.includes(e))
    : eras;
  return gated.filter(e => resolveFlavor(event, e, mode) !== null);
}

export function processPlayerEvents(player) {
  if (isInPrison(player)) return;

  const eras = eligibleEras(G.year);
  const mode = player.isVampire ? 'vampire' : 'mortal';

  // Annotate each event with its own eligible-era subset so we don't
  // recompute it during flavor resolution.
  const eligible = PLAYER_EVENTS
    .map(ev => ({ ev, eligibleEras: eventEligibleEras(ev, eras, mode) }))
    .filter(({ ev, eligibleEras }) =>
      eligibleEras.length > 0 && ev.cond(player)
    );

  if (!eligible.length) return;

  const count = pick([0,0,1,1,1,2]);
  const fired = new Set();
  for (let i = 0; i < count; i++) {
    const pool = eligible.filter(({ ev }) => !fired.has(ev.id));
    if (!pool.length) break;

    // Map to the shape weightedPick expects, then run.
    const pickedEntry = weightedPick(pool.map(p => ({ weight: p.ev.weight, _entry: p })));
    const { ev, eligibleEras: evEras } = pickedEntry._entry;

    fired.add(ev.id);

    // Mechanics first (apply may stash _lastXxx scratch fields on player
    // for the flavor text — though current events embed their own numbers
    // directly in the log strings, this hook is here for future use).
    ev.apply(player);

    // Flavor: pick from this event's eligible eras (usually one; two in
    // overlap window). Weighted equally for simplicity.
    const era = evEras[Math.floor(Math.random() * evEras.length)];
    const flavor = resolveFlavor(ev, era, mode);
    if (flavor) {
      // Classify log color heuristically by event id. Could be a per-event
      // field later if we need finer control.
      const isBad  = ev.id.endsWith('_loss')      || ev.id.endsWith('_bad_year');
      const isGood = ev.id.endsWith('_gain')      || ev.id.endsWith('_good_year') ||
                     ev.id.endsWith('_growth')    || ev.id.endsWith('_training');
      const type = isBad ? 'bad' : isGood ? 'good' : 'info';
      proposeAnnals({ msg: flavor.log, type, priority: ANNALS_PRIORITY.FLAVOR });
    }
  }

  tickParticularsSituations(player, G.year, hooks.fireSituation);
}
