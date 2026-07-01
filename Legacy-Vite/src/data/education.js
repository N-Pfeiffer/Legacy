/** Higher-education ladder and derived lookups. */

    export const EDUCATION_LADDER = [
      { id: 'baccalaureate', label: 'Baccalaureate', duration: 4, wealthGate: 50,
        stageName: 'baccalaureate', inProgress: 'baccalaureate_in_progress', prereq: null },
      { id: 'licentiate',    label: 'Licentiate',    duration: 2, wealthGate: 60,
        stageName: 'licentiate',    inProgress: 'licentiate_in_progress',    prereq: 'baccalaureate' },
      { id: 'doctorate',     label: 'Doctorate',     duration: 2, wealthGate: 60,
        stageName: 'doctorate',     inProgress: 'doctorate_in_progress',     prereq: 'licentiate' },
    ];

export const EDUCATION_LADDER_BY_ID = Object.fromEntries(EDUCATION_LADDER.map((d) => [d.id, d]));

export const HIGHER_ED_IN_PROGRESS_STAGES = new Set(EDUCATION_LADDER.map((d) => d.inProgress));

export const COMPLETED_DEGREE_STAGES = EDUCATION_LADDER.map((d) => d.stageName);

export const COMPLETED_DEGREE_INDEX = Object.fromEntries(
  COMPLETED_DEGREE_STAGES.map((s, i) => [s, i]),
);
