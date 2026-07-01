/** Career taxonomy — Layer 1 data. */
export const SCHOOL_WORK_MIN_AGE = 14;
export const SCHOOL_WORK_HEALTH_COST_PER_YEAR = 10;

    export const CAREERS = [
      // ─── GROUNDED (21) ────────────────────────────────────────

      // Universal across all eras — feeding people never goes out of style.
      // Era-flavored from Husbandman (1800) → Farmer (modern).
      { id: 'farmer',
        nameByEra: { 1800: 'Husbandman', 1850: 'Farmer', 1900: 'Farmer', 1950: 'Farmer', 2000: 'Farmer' },
        primary: 'prowess', secondary: 'health', prestige: 0, category: 'labor',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [12, 22],
        schoolCompatible: true,
        rankLadder: ['Farmhand', 'Tenant', 'Smallholder', 'Landed Farmer'],
      },

      // The catch-all working-class career. Always available, never prestigious.
      { id: 'laborer',
        nameByEra: { 1800: 'Day Labourer', 1850: 'Labourer', 1900: 'Labourer', 1950: 'Labourer', 2000: 'Labourer' },
        primary: 'prowess', secondary: 'health', prestige: 0, category: 'labor',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [12, 22],
        schoolCompatible: true,
        rankLadder: ['Unskilled', 'Hand', 'Foreman'],
      },

      // Skilled smithing. Industrial revolution eats this career — it survives
      // into 1900 in rural areas, vanishes by 1950 except as a hobby/specialty.
      { id: 'blacksmith',
        nameByEra: { 1800: 'Blacksmith', 1850: 'Blacksmith', 1900: 'Blacksmith' },
        primary: 'prowess', secondary: 'intelligence', prestige: 1, category: 'trade',
        eras: [1800, 1850, 1900], startAge: [14, 24],
        schoolCompatible: true,
        rankLadder: ['Apprentice', 'Journeyman', 'Master Smith'],
      },

      // Replaces blacksmith in modern eras. Same mechanical role — a tradesperson
      // who fixes mechanical things — different costume.
      { id: 'mechanic',
        nameByEra: { 1900: 'Mechanic', 1950: 'Mechanic', 2000: 'Mechanic' },
        primary: 'prowess', secondary: 'intelligence', prestige: 1, category: 'trade',
        eras: [1900, 1950, 2000], startAge: [14, 24],
        schoolCompatible: true,
        rankLadder: ['Apprentice', 'Mechanic', 'Master Mechanic'],
      },

      { id: 'miller',
        nameByEra: { 1800: 'Miller', 1850: 'Miller', 1900: 'Miller' },
        primary: 'intelligence', secondary: 'prowess', prestige: 1, category: 'trade',
        eras: [1800, 1850, 1900], startAge: [14, 25],
        schoolCompatible: true,
        rankLadder: ['Hand', 'Miller', 'Master Miller'],
      },

      // The public-facing hospitality career. Different building, same job
      // across centuries.
      { id: 'innkeeper',
        nameByEra: { 1800: 'Innkeeper', 1850: 'Innkeeper', 1900: 'Publican', 1950: 'Bar Owner', 2000: 'Bar Owner' },
        primary: 'charisma', secondary: 'wealth', prestige: 1, category: 'service',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [22, 30],
        rankLadder: ['Helper', 'Innkeeper', 'Established Host'],
      },

      { id: 'cook',
        nameByEra: { 1800: 'Cook', 1850: 'Cook', 1900: 'Cook', 1950: 'Cook', 2000: 'Chef' },
        primary: 'charisma', secondary: 'intelligence', prestige: 1, category: 'service',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [14, 24],
        schoolCompatible: true,
        rankLadder: ['Kitchen Hand', 'Cook', 'Head Cook', 'Chef'],
      },

      { id: 'tailor',
        nameByEra: { 1800: 'Tailor', 1850: 'Tailor', 1900: 'Tailor', 1950: 'Tailor', 2000: 'Designer' },
        primary: 'charisma', secondary: 'intelligence', prestige: 1, category: 'trade',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [14, 24],
        schoolCompatible: true,
        rankLadder: ['Apprentice', 'Tailor', 'Master Tailor'],
      },

      // Domestic service. Common in 1800-1900, declines sharply post-1950.
      // Kept available through 2000 as "Housekeeper" since the modern form
      // still exists for wealthy households.
      { id: 'servant',
        nameByEra: { 1800: 'House Servant', 1850: 'House Servant', 1900: 'Maid', 1950: 'Housekeeper', 2000: 'Housekeeper' },
        primary: 'charisma', secondary: 'health', prestige: 0, category: 'service',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [12, 22],
        schoolCompatible: true,
        rankLadder: ['Scullery', 'Maid', 'Housekeeper', 'Butler/Steward'],
      },

      // Military service — universally available, era-flavored.
      { id: 'soldier',
        nameByEra: { 1800: 'Soldier', 1850: 'Soldier', 1900: 'Soldier', 1950: 'Soldier', 2000: 'Soldier' },
        primary: 'prowess', secondary: 'health', prestige: 1, category: 'military',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [18, 22],
        rankLadder: ['Private', 'Corporal', 'Sergeant', 'Lieutenant', 'Captain'],
      },

      // Sailing fades as a major employer after WWII; kept through 1950.
      { id: 'sailor',
        nameByEra: { 1800: 'Sailor', 1850: 'Sailor', 1900: 'Sailor', 1950: 'Sailor' },
        primary: 'prowess', secondary: 'health', prestige: 0, category: 'military',
        eras: [1800, 1850, 1900, 1950], startAge: [12, 22],
        schoolCompatible: true,
        rankLadder: ['Deckhand', 'Sailor', 'Mate', 'Captain'],
      },

      { id: 'merchant',
        nameByEra: { 1800: 'Merchant', 1850: 'Merchant', 1900: 'Merchant', 1950: 'Businessman', 2000: 'Entrepreneur' },
        primary: 'wealth', secondary: 'charisma', prestige: 2, category: 'mercantile',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [22, 28],
        rankLadder: ['Trader', 'Merchant', 'Established Merchant', 'Magnate'],
      },

      { id: 'shopkeeper',
        nameByEra: { 1800: 'Shopkeeper', 1850: 'Shopkeeper', 1900: 'Shopkeeper', 1950: 'Shop Owner', 2000: 'Shop Owner' },
        primary: 'charisma', secondary: 'wealth', prestige: 1, category: 'mercantile',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [22, 28],
        rankLadder: ['Assistant', 'Shopkeeper', 'Established Shop Owner'],
      },

      { id: 'clerk',
        nameByEra: { 1800: 'Clerk', 1850: 'Clerk', 1900: 'Clerk', 1950: 'Office Worker', 2000: 'Office Worker' },
        primary: 'intelligence', secondary: 'charisma', prestige: 1, category: 'civic',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [18, 24],
        rankLadder: ['Junior Clerk', 'Clerk', 'Senior Clerk', 'Office Manager'],
      },

      // Teaching. Era-flavored only mildly — schools change shape but the role is steady.
      // Requires Baccalaureate — teaching is a credentialed profession in our
      // slightly-modernized education frame.
      { id: 'schoolmaster',
        nameByEra: { 1800: 'Schoolmaster', 1850: 'Schoolmaster', 1900: 'Teacher', 1950: 'Teacher', 2000: 'Teacher' },
        primary: 'intelligence', secondary: 'charisma', prestige: 2, category: 'academic',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [22, 28],
        requiresDegree: 'baccalaureate',
        rankLadder: ['Assistant', 'Teacher', 'Senior Teacher', 'Headmaster/Principal'],
      },

      // Clergy. Across all eras but flavored: a 2000 Minister isn't quite a
      // 1800 Parson, but they fill the same social role.
      // Requires Doctorate (D.D., Theology) — one of the classic elite
      // professions.
      { id: 'priest',
        nameByEra: { 1800: 'Parson', 1850: 'Parson', 1900: 'Minister', 1950: 'Minister', 2000: 'Minister' },
        primary: 'charisma', secondary: 'insight', prestige: 2, category: 'religious',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [24, 30],
        requiresDegree: 'doctorate',
        rankLadder: ['Curate', 'Parson', 'Vicar', 'Bishop'],
      },

      // Medicine. Era-flavored heavily — a Surgeon in 1800 is barely the same
      // person as a Doctor in 1950. Universal across all eras as an essential role.
      // Requires Doctorate (M.D.) — classic elite profession.
      { id: 'doctor',
        nameByEra: { 1800: 'Physician', 1850: 'Physician', 1900: 'Doctor', 1950: 'Doctor', 2000: 'Doctor' },
        primary: 'intelligence', secondary: 'insight', prestige: 3, category: 'medical',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [24, 30],
        requiresDegree: 'doctorate',
        rankLadder: ['Resident', 'Doctor', 'Senior Physician', 'Specialist'],
      },

      // Nursing. Distinct from doctor as a separate, lower-prestige medical role.
      // Earlier eras call it something different (Midwife / Sister of Mercy).
      // Requires Baccalaureate — formal nursing programs (Nightingale-era and
      // after) are post-secondary.
      { id: 'nurse',
        nameByEra: { 1850: 'Sick-nurse', 1900: 'Nurse', 1950: 'Nurse', 2000: 'Nurse' },
        primary: 'intelligence', secondary: 'charisma', prestige: 1, category: 'medical',
        eras: [1850, 1900, 1950, 2000], startAge: [20, 26],
        requiresDegree: 'baccalaureate',
        rankLadder: ['Trainee', 'Nurse', 'Senior Nurse', 'Matron'],
      },

      // Law. Mostly the same shape across eras.
      // Requires Doctorate (LL.D.) — classic elite profession.
      { id: 'lawyer',
        nameByEra: { 1800: 'Barrister', 1850: 'Solicitor', 1900: 'Lawyer', 1950: 'Lawyer', 2000: 'Lawyer' },
        primary: 'intelligence', secondary: 'charisma', prestige: 3, category: 'legal',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [24, 30],
        requiresDegree: 'doctorate',
        rankLadder: ['Junior Associate', 'Associate', 'Senior Associate', 'Partner'],
      },

      // Factory work didn't exist in 1800 as we know it. Becomes a major
      // employer 1850-1950, declines as industry hollows out post-2000
      // but remains.
      { id: 'factory_worker',
        nameByEra: { 1850: 'Mill Hand', 1900: 'Factory Worker', 1950: 'Factory Worker', 2000: 'Factory Worker' },
        primary: 'prowess', secondary: 'health', prestige: 0, category: 'labor',
        eras: [1850, 1900, 1950, 2000], startAge: [12, 22],
        schoolCompatible: true,
        rankLadder: ['Worker', 'Senior Worker', 'Foreman'],
      },

      // Law enforcement. Era-flavored: Watchman (1800) → Constable (1850-1900)
      // → Police Officer (modern).
      // Requires Baccalaureate — modern police training is post-secondary.
      // (Anachronistic in 1800 where watchmen had no formal credentials, but
      // we agreed to skew slightly modern for system consistency.)
      { id: 'police',
        nameByEra: { 1800: 'Watchman', 1850: 'Constable', 1900: 'Constable', 1950: 'Police Officer', 2000: 'Police Officer' },
        primary: 'prowess', secondary: 'intelligence', prestige: 1, category: 'civic',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [20, 26],
        requiresDegree: 'baccalaureate',
        rankLadder: ['Recruit', 'Officer', 'Sergeant', 'Detective', 'Captain'],
      },

      // ─── DRAMATIC (6) ────────────────────────────────────────

      // Sitting in judgment. Universally elite, era-flavored.
      // Requires Licentiate — judicial office demands more than a Bacc
      // but isn't necessarily a Doctorate (judges and lawyers are distinct
      // career paths in this taxonomy; Lawyer is the doctorate-tier path).
      { id: 'magistrate',
        nameByEra: { 1800: 'Magistrate', 1850: 'Magistrate', 1900: 'Judge', 1950: 'Judge', 2000: 'Judge' },
        primary: 'intelligence', secondary: 'charisma', prestige: 3, category: 'legal',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [28, 30],
        requiresDegree: 'licentiate',
        rankLadder: ['Junior Judge', 'Judge', 'Senior Judge', 'Chief Justice'],
      },

      // Statecraft. Always available, always elite.
      // Requires Baccalaureate — career civic service starts post-secondary.
      { id: 'diplomat',
        nameByEra: { 1800: 'Envoy', 1850: 'Diplomat', 1900: 'Diplomat', 1950: 'Diplomat', 2000: 'Diplomat' },
        primary: 'charisma', secondary: 'intelligence', prestige: 3, category: 'civic',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [26, 30],
        requiresDegree: 'baccalaureate',
        rankLadder: ['Attaché', 'Diplomat', 'Senior Diplomat', 'Ambassador'],
      },

      // Investigation as a profession. Emerges mid-19th century with the
      // birth of professional detective work — locked to 1850+.
      { id: 'detective',
        nameByEra: { 1850: 'Investigator', 1900: 'Detective', 1950: 'Detective', 2000: 'Detective' },
        primary: 'intelligence', secondary: 'insight', prestige: 2, category: 'civic',
        eras: [1850, 1900, 1950, 2000], startAge: [25, 30],
        rankLadder: ['Junior', 'Detective', 'Senior Detective', 'Lead'],
      },

      // Espionage. Always elite, always shadowed. The flavor differs wildly
      // (a Napoleonic-era spy vs a Cold War operative) but the mechanical
      // role is the same.
      { id: 'spy',
        nameByEra: { 1800: 'Agent', 1850: 'Agent', 1900: 'Intelligence Officer', 1950: 'Spy', 2000: 'Operative' },
        primary: 'charisma', secondary: 'insight', prestige: 2, category: 'military',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [25, 30],
        rankLadder: ['Asset', 'Agent', 'Senior Agent', 'Spymaster'],
      },

      // Courtesan-style careers across eras: a high-society demimondaine
      // is a 19th century specific role, "Socialite" is the 20th/21st century
      // equivalent.
      { id: 'courtesan',
        nameByEra: { 1800: 'Courtesan', 1850: 'Demimondaine', 1900: 'Socialite', 1950: 'Socialite', 2000: 'Socialite' },
        primary: 'charisma', secondary: 'wealth', prestige: 2, category: 'arts',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [20, 26],
        rankLadder: ['Newcomer', 'Notable', 'Celebrated', 'Legend'],
      },

      // "Career" by inheritance. Mechanically slight, narratively rich.
      // The "career" is being independently wealthy — no employer.
      { id: 'heir',
        nameByEra: { 1800: 'Gentry', 1850: 'Gentry', 1900: 'Heir', 1950: 'Heir', 2000: 'Heir' },
        primary: 'wealth', secondary: 'charisma', prestige: 3, category: 'mercantile',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [22, 28],
        rankLadder: ['Inheritor', 'Established', 'Patriarch/Matriarch'],
      },

      // ─── MYSTICAL (3) ────────────────────────────────────────

      // Universal across eras with strong era-flavored names.
      // Connects to Insight as primary — gives mortals a reason to care
      // about that stat before any vampire content lands for them.
      { id: 'fortune_teller',
        nameByEra: { 1800: 'Wise-woman', 1850: 'Spiritualist', 1900: 'Spiritualist', 1950: 'Astrologer', 2000: 'Psychic' },
        primary: 'insight', secondary: 'charisma', prestige: 1, category: 'mystical',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [22, 30],
        rankLadder: ['Apprentice', 'Reader', 'Sought-after', 'Celebrated'],
      },

      // 1850+ — archaeology as a profession crystallized in the mid-19th
      // century with the great expeditions. Lower-prestige than expected:
      // it's a respected academic role but rarely lucrative.
      // Requires Licentiate — academic research field.
      { id: 'archaeologist',
        nameByEra: { 1850: 'Antiquarian', 1900: 'Archaeologist', 1950: 'Archaeologist', 2000: 'Archaeologist' },
        primary: 'intelligence', secondary: 'insight', prestige: 2, category: 'mystical',
        eras: [1850, 1900, 1950, 2000], startAge: [26, 30],
        requiresDegree: 'licentiate',
        rankLadder: ['Field Assistant', 'Archaeologist', 'Senior', 'Renowned'],
      },

      // Universal. Reads as scholarship to outsiders, as something stranger
      // to those who know. Probably overlaps with the vampire world more
      // than they'd like.
      // Requires Licentiate — formal academic occult scholarship, not folk
      // practice. (Fortune Teller is the no-degree mystical career.)
      { id: 'occult_scholar',
        nameByEra: { 1800: 'Alchemist', 1850: 'Occultist', 1900: 'Occult Scholar', 1950: 'Occult Scholar', 2000: 'Occult Scholar' },
        primary: 'insight', secondary: 'intelligence', prestige: 1, category: 'mystical',
        eras: [1800, 1850, 1900, 1950, 2000], startAge: [25, 30],
        requiresDegree: 'licentiate',
        rankLadder: ['Student', 'Practitioner', 'Adept', 'Master'],
      },
    ];

export const CAREERS_BY_ID = Object.fromEntries(CAREERS.map((c) => [c.id, c]));
