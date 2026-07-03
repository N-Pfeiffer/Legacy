import { G, getAlive, getPlayer } from '../state/gameState.js';
import { refreshActionPoints } from './actionPoints.js';
import { recomputeJournalFlags } from './journal.js';
import { tickRelationshipDecay } from './relationshipDecay.js';
import { deductCareerUpkeep } from './workplace.js';
import { isInPrison } from './prison.js';
import { tickSuspicion } from './crime.js';
import { checkPovertyCrimePath } from './crimePath.js';
import { tickSyndicateFenceJob } from './thieving.js';
import { tickAssassinContracts } from './stalking.js';

/**
 * Advance the simulation by one calendar year (no DOM).
 * Returns false only if the tick could not run (e.g. dead player guard).
 */
export function runYearTick(deps) {
  const {
    spawnPendingSiblings,
    tickBirths,
    assignCareerToPersonWithAgeFit,
    tickCareerProgression,
    tickEducation,
    processPlayerEvents,
    checkMortality,
    onPlayerCareerNudge,
  } = deps;

  G.year++;
  for (const p of getAlive()) p.age++;
  const player = getPlayer();

  recomputeJournalFlags();
  if (player?.isAlive) {
    tickRelationshipDecay(player);
  }
  spawnPendingSiblings(player);
  if (typeof tickBirths === 'function') tickBirths();

  for (const p of getAlive()) {
    if (p.isPlayer) continue;
    if (p.career) continue;
    if (p.age < p.careerPickAge) continue;
    assignCareerToPersonWithAgeFit(p, G.year);
  }

  tickCareerProgression();
  tickEducation();

  if (player?.isAlive && !player.career && onPlayerCareerNudge) {
    onPlayerCareerNudge(player);
  }

  if (player?.isAlive) {
    processPlayerEvents(player);
  }
  checkMortality();
  if (player?.isAlive && !isInPrison(player)) {
    tickSuspicion(player, { fireSituation: deps.fireSituation });
  }
  if (player?.isAlive) {
    delete player._casedDistrict;
    delete player._assassinContractOffer;
    refreshActionPoints(player);
    deductCareerUpkeep(player);
    checkPovertyCrimePath(player, { fireSituation: deps.fireSituation });
    if (!isInPrison(player)) {
      tickSyndicateFenceJob(player, { fireSituation: deps.fireSituation });
      tickAssassinContracts(player, { fireSituation: deps.fireSituation });
    }
  }
  return true;
}
