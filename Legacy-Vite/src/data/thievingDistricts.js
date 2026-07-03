/** Thieving districts — jobs, payouts, suspicion, and difficulty. */

export const THIEVING_CONFIG = {
  hobbyId: 'thieving',
  actionLabel: 'Work',
  fenceApCost: 1,
  districts: [
    {
      id: 'the_rookeries',
      label: 'The Rookeries',
      skillReq: 0,
      apCost: 1,
      jobLabel: 'pickpocketing',
      takeMin: 1,
      takeMax: 3,
      hotGoodsChance: 0,
      suspicionClean: 2,
      suspicionWitnessed: 6,
      ledgerSeverity: 1,
      difficulty: 18,
      wealthBands: ['destitute', 'poor'],
      hotGoodsPool: ['stolen_brooch', 'stolen_pocket_watch'],
      flavor: 'Crowds, alleys, and pockets that forget to button.',
      theme: 'rookeries',
    },
    {
      id: 'the_docks',
      label: 'The Docks',
      skillReq: 15,
      apCost: 2,
      jobLabel: 'cargo pilfering',
      takeMin: 3,
      takeMax: 8,
      hotGoodsChance: 0.25,
      suspicionClean: 4,
      suspicionWitnessed: 10,
      ledgerSeverity: 2,
      difficulty: 22,
      wealthBands: ['poor', 'middle'],
      hotGoodsPool: ['stolen_pocket_watch', 'stolen_candlesticks'],
      flavor: 'Warehouses, rope, and customs men who look the other way for a price.',
      theme: 'docks',
    },
    {
      id: 'mayfair',
      label: 'Mayfair',
      skillReq: 35,
      apCost: 2,
      jobLabel: 'housebreaking',
      takeMin: 8,
      takeMax: 20,
      hotGoodsChance: 0.6,
      suspicionClean: 8,
      suspicionWitnessed: 16,
      ledgerSeverity: 3,
      difficulty: 28,
      wealthBands: ['rich', 'wealthy'],
      hotGoodsPool: ['stolen_candlesticks', 'stolen_brooch', 'stolen_silver_plate'],
      flavor: 'Servants\' doors, gaslight, and houses that lock from the inside.',
      theme: 'mayfair',
    },
    {
      id: 'the_strand',
      label: 'The Strand',
      skillReq: 60,
      apCost: 3,
      jobLabel: "the cracksman's art",
      takeMin: 25,
      takeMax: 60,
      hotGoodsChance: 0.8,
      suspicionClean: 12,
      suspicionWitnessed: 22,
      ledgerSeverity: 5,
      difficulty: 35,
      wealthBands: ['rich', 'wealthy'],
      preferCareers: ['banker', 'magistrate', 'barrister'],
      hotGoodsPool: ['stolen_silver_plate', 'stolen_banknotes', 'stolen_pocket_watch'],
      flavor: 'Safes, ledgers, and institutions that believe themselves untouchable.',
      theme: 'strand',
    },
  ],
};

export function getThievingConfig(hobbyId = 'thieving') {
  return THIEVING_CONFIG.hobbyId === hobbyId ? THIEVING_CONFIG : null;
}

export function getThievingDistrict(districtId) {
  return THIEVING_CONFIG.districts.find((d) => d.id === districtId) ?? null;
}

export function hobbyHasThieving(hobbyId) {
  return hobbyId === 'thieving' && THIEVING_CONFIG.districts.length > 0;
}
