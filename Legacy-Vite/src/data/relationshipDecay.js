/** Natural relationship decay rates and thresholds (per calendar year). */

export const DECAY_SOFT_CAP = 80;
export const DECAY_HIGH_BOND_THRESHOLD = 80;

export const DECAY_RATE_DISPOSITION = 1.5;
export const DECAY_RATE_INTIMACY = 3;
export const DECAY_RATE_BONDED = 0.5;
export const DECAY_RATE_ENTHRALLMENT = 5;

/** Above this enthrallment, disposition and intimacy decay are frozen (with exceptions). */
export const ENTHRALLMENT_DECAY_FREEZE = 15;
