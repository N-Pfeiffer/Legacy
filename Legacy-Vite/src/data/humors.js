/** Four Humors — chosen in an early-game situation; first trait once assigned. */

export const HUMORS = {
  melancholic: {
    id: 'melancholic',
    label: 'Melancholic',
    color: '#1e3a5f',
    nameTextColor: '#dce8f5',
    tagline: 'The Haunted.',
    mortalDescription:
      'Because of your raw aptitude and obsessive focus, you attract academic patrons. ' +
      'You can attend the University, Licentiate, and Doctorate tiers entirely for free. ' +
      'You excel at research and introspective situations.',
    vampireDescription:
      'Your dreary nature attracts spirits and improves the rate at which you build ' +
      'relationship with spirits and undead. Upon your Embrace, the spirits that haunted ' +
      'you appear as friends or enemies, depending on how you treated them.',
    personalityMods: {
      intimacyGainMult: 0.6,
      intimacyLossMult: 0.6,
      dispositionLossMult: 0.6,
    },
  },
  sanguine: {
    id: 'sanguine',
    label: 'Sanguine',
    color: '#8b2635',
    nameTextColor: '#fde8ec',
    tagline: 'The Paramour.',
    mortalDescription:
      'You are naturally seductive and magnetic. You cultivate romantic and ' +
      'platonic relationships faster than anyone else. ' +
      'Because you are flush with life, you also start with a higher natural Health baseline.',
    vampireDescription:
      'The Addictive Kiss. You transition into the Requiem with a larger maximum blood pool. ' +
      'However, your bite is intoxicating — mortals you feed upon become obsessed stalkers, ' +
      'appearing at your Haven and threatening the Masquerade if you do not deal with them.',
    statMods: { health: 50 },
    personalityMods: {
      intimacyGainMult: 1.4,
      dispositionLossMult: 1.4,
      sirenSusceptibilityMult: 2,
    },
  },
  choleric: {
    id: 'choleric',
    label: 'Choleric',
    color: '#b8860b',
    nameTextColor: '#1a1206',
    tagline: 'The Hasty.',
    mortalDescription:
      'You operate at a breakneck pace. Because you refuse to waste time, ' +
      'you complete goals and advance hobbies faster than anyone else. You are quick on your feet, ' +
      'and use it well in a fight.',
    vampireDescription:
      'The Blinding Strike. Your restless mortal energy translates into lethal, supernatural ' +
      'kinetic speed. In the Requiem, you become a terrifying duelist with a rapid-strike option ' +
      'and a permanent modifier that increases your melee damage.',
    personalityMods: {
      insultDispositionLossMult: 2,
      intimidationResist: 0.25,
    },
  },
  phlegmatic: {
    id: 'phlegmatic',
    label: 'Phlegmatic',
    color: '#2d5a3d',
    nameTextColor: '#e4f2e8',
    tagline: 'The Climber.',
    mortalDescription:
      'You view London’s society as a ladder and systematically build your network. ' +
      'Your professional ties naturally strengthen over time, granting a passive yearly increase ' +
      'to relationships with coworkers, superiors, and business contacts. Promotions require less ' +
      'time and effort across any career track.',
    vampireDescription:
      'The Puppeteer. Your mortal network transitions into a fiercely loyal stable of ghouls. ' +
      'Your Vitae is highly efficient when binding servants, allowing you to sustain more Ghouls ' +
      'without draining your blood reserves. Ghouling high-prestige mortals becomes much easier.',
    personalityMods: {
      dispositionGainMult: 0.6,
      dispositionLossMult: 0.6,
      enthrallmentGainMult: 0.8,
      enthrallmentLossMult: 0.8,
    },
  },
};

export const HUMOR_IDS = Object.keys(HUMORS);

export function getHumorDef(id) {
  return HUMORS[id] || null;
}
