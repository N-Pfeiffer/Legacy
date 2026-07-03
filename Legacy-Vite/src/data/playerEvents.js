/** Yearly random player events — static registry. */
import { clamp, pick } from '../utils/index.js';
import { statCap } from '../utils/statCap.js';
import { addMoney, getMoney } from '../sim/money.js';
import { unlockCrimePath } from '../sim/crimePath.js';

    export const PLAYER_EVENTS = [
      // ─── HEALTH: a healthy year ──────────────────────────────
      // Universal beat across eras and modes. Fires whenever health has slack
      // to gain. Mortals gain genuine vigor; vampires register the year as
      // "uneventful" since their health doesn't drift much without harm.
      {
        id: 'health_good_year',
        weight: 20,
        cond: p => p.health < statCap('health', p.isVampire, p) - 5,
        apply: p => {
          p.health = clamp(p.health + pick([5,8,10]), 0, statCap('health', p.isVampire, p));
        },
        flavor: {
          1800: {
            mortal:  { log: 'A healthy year — the London air served you well.' },
            vampire: { log: 'A quiet year. The Beast slept easily.' },
          },
          1850: {
            mortal:  { log: 'A healthy year — your constitution held firm.' },
            vampire: { log: 'A quiet year. The Beast slept easily.' },
          },
          1900: {
            mortal:  { log: 'A healthy year — you felt strong and rested.' },
            vampire: { log: 'A quiet year. No hungers stirred unmastered.' },
          },
          1950: {
            mortal:  { log: 'A healthy year — modern medicine and good fortune both held.' },
            vampire: { log: 'A quiet year. No hungers stirred unmastered.' },
          },
          2000: {
            mortal:  { log: 'A healthy year — you felt strong.' },
            vampire: { log: 'A quiet year. No hungers stirred unmastered.' },
          },
        },
      },

      // ─── HEALTH: illness ─────────────────────────────────────
      // Mortal-flavored across all eras (illness reads very differently by era).
      // Vampire flavor present in all but 1800 — to demonstrate the "skip if
      // missing" rule, a vampire in 1800 simply won't draw this event.
      {
        id: 'health_bad_year',
        weight: 12,
        cond: p => p.health > 15,
        apply: p => {
          const d = pick([5,10,15]);
          p._lastIllnessSeverity = d;   // stashed for flavor text below
          p.health = clamp(p.health - d, 0, statCap('health', p.isVampire, p));
        },
        flavor: {
          1800: {
            mortal:  { log: 'Fever swept the parish. You survived, but weakened.' },
          },
          1850: {
            mortal:  { log: 'A bout of consumption left you frail for months.' },
            vampire: { log: 'Tainted blood. The hunt was harder this year.' },
          },
          1900: {
            mortal:  { log: 'Influenza laid you low for weeks.' },
            vampire: { log: 'Tainted blood. The hunt was harder this year.' },
          },
          1950: {
            mortal:  { log: 'A serious illness sent you to the hospital.' },
            vampire: { log: 'Tainted blood. Modern poisons reach further than they should.' },
          },
          2000: {
            mortal:  { log: 'A rough season — flu, then complications.' },
            vampire: { log: 'Tainted blood. Modern poisons reach further than they should.' },
          },
        },
      },

      // ─── INTELLIGENCE: studious year ─────────────────────────
      // The shape of "learning" changes wildly across eras: tutors, schools,
      // universities, the internet. The mechanical effect is identical.
      {
        id: 'intellect_growth',
        weight: 10,
        cond: p => p.age >= 5 && p.intelligence > 50,
        apply: p => {
          p.intelligence = clamp(p.intelligence + 3, 0, statCap('intelligence', p.isVampire));
        },
        flavor: {
          1800: {
            mortal:  { log: 'You pored over borrowed books by candlelight.' },
          },
          1850: {
            mortal:  { log: 'Your studies advanced — Latin, philosophy, the natural sciences.' },
          },
          1900: {
            mortal:  { log: 'You excelled at your studies this year.' },
            vampire: { log: 'Centuries of accumulated knowledge began to feel within reach.' },
          },
          1950: {
            mortal:  { log: 'You excelled academically.' },
            vampire: { log: 'Centuries of accumulated knowledge began to feel within reach.' },
          },
          2000: {
            mortal:  { log: 'You went deep on something — books, courses, late nights of research.' },
            vampire: { log: 'The information age makes scholarship effortless. You drank it in.' },
          },
        },
      },

      // ─── WEALTH: windfall ────────────────────────────────────
      {
        id: 'wealth_gain',
        weight: 8,
        cond: p => p.age >= 18,
        apply: p => {
          // annualPay wired in Phase 3; pre-career uses flat £ picks.
          const annualPay = 0;
          const g = annualPay > 0
            ? Math.max(5, Math.round(annualPay * pick([0.2, 0.4, 0.6])))
            : pick([5, 10, 20]);
          p._lastWealthDelta = g;
          addMoney(p, g);
        },
        flavor: {
          1800: {
            mortal:  { log: 'A small inheritance came down through the family.' },
            vampire: { log: 'You arranged for some old debts to be quietly settled in your favor.' },
          },
          1850: {
            mortal:  { log: 'A profitable venture put coin in your purse.' },
            vampire: { log: 'A mortal pawn handled the ledgers; you took your share.' },
          },
          1900: {
            mortal:  { log: 'You came into some money this year.' },
            vampire: { log: 'You moved old wealth into newer instruments. It compounded.' },
          },
          1950: {
            mortal:  { log: 'A good year financially — promotion, bonus, or both.' },
            vampire: { log: 'You moved old wealth into newer instruments. It compounded.' },
          },
          2000: {
            mortal:  { log: 'A windfall — work paid, or the market did.' },
            vampire: { log: 'Quiet returns from holdings nobody alive remembers you arranging.' },
          },
        },
      },

      // ─── WEALTH: loss ────────────────────────────────────────
      {
        id: 'wealth_loss',
        weight: 6,
        cond: p => getMoney(p) > 10 && p.age >= 18,
        apply: p => {
          const annualPay = 0;
          const l = annualPay > 0
            ? Math.max(3, Math.round(annualPay * pick([0.1, 0.3])))
            : pick([3, 5, 10]);
          p._lastWealthDelta = -l;
          addMoney(p, -l);
        },
        flavor: {
          1800: { mortal: { log: 'Crop failure or a bad debt — the year cost you.' } },
          1850: { mortal: { log: 'An investment soured. You lost more than you should have.' } },
          1900: { mortal: { log: 'Markets shifted against you this year.' } },
          1950: { mortal: { log: 'Unexpected expenses dented your savings.' } },
          2000: { mortal: { log: 'A bad year financially — bills outpaced income.' } },
        },
      },

      // ─── CHILDHOOD: ambient ──────────────────────────────────
      {
        id: 'childhood_play',
        weight: 15,
        cond: p => p.age < 13,
        flavor: {
          1800: { mortal: { log: 'You spent the year underfoot and outdoors.' } },
          1850: { mortal: { log: 'You spent the year playing in lanes and fields.' } },
          1900: { mortal: { log: 'You spent the year playing and growing.' } },
          1950: { mortal: { log: 'You spent the year on bikes and street games.' } },
          2000: { mortal: { log: 'You spent the year playing and growing.' } },
        },
        apply: () => {},
      },

      // ─── SCHOOL-AGE: ambient ─────────────────────────────────
      {
        id: 'schoolyears',
        weight: 3,
        cond: p => p.age >= 6 && p.age < 18 && (!p.isPlayer || !['primary', 'secondary'].includes(p.education?.stage)),
        flavor: {
          1800: { mortal: { log: 'You learned your letters under a strict schoolmaster.' } },
          1850: { mortal: { log: 'You learned your letters under a strict schoolmaster.' } },
          1900: { mortal: { log: 'School life carries on.' } },
          1950: { mortal: { log: 'School life carries on.' } },
          2000: { mortal: { log: 'School life carries on.' } },
        },
        apply: () => {},
      },

      // ─── CRIME: pickpocket victim (Thieving unlock) ───────────
      {
        id: 'pickpocket_victim',
        weight: 4,
        cond: (p) => p.isPlayer && (p.age ?? 0) >= 12 && !p.crimePath,
        apply: (p) => {
          const loss = pick([1, 2, 3]);
          const cur = getMoney(p);
          addMoney(p, -Math.min(cur, loss));
          unlockCrimePath(p);
        },
        flavor: {
          1800: {
            mortal: {
              log: 'A dip took your coin in the crowd at Covent Garden. You spent the walk home reconstructing exactly how it was done.',
            },
          },
          1850: {
            mortal: {
              log: 'A dip took your coin in the crowd at Covent Garden. You spent the walk home reconstructing exactly how it was done.',
            },
          },
          1900: {
            mortal: {
              log: 'A dip took your coin in the crowd at Covent Garden. You spent the walk home reconstructing exactly how it was done.',
            },
          },
          1950: {
            mortal: {
              log: 'A dip took your coin in the crowd at Covent Garden. You spent the walk home reconstructing exactly how it was done.',
            },
          },
          2000: {
            mortal: {
              log: 'A dip took your coin in the crowd at Covent Garden. You spent the walk home reconstructing exactly how it was done.',
            },
          },
        },
      },

      // ─── ERA-LOCKED PROOF-OF-CONCEPT ─────────────────────────
      // Demonstrates the `eras:` gate. Only fires when at least one of the
      // player's eligible eras is in the locked list. A 1900-locked event
      // can fire in 1890–1899 (because 1899 has 1900 in eligibleEras due to
      // the overlap window) — which is exactly what we want for "the future
      // is arriving early."
      {
        id: 'era_locked_telegraph',
        weight: 4,
        cond: p => p.age >= 15,
        eras: [1850],
        apply: () => {},
        flavor: {
          1850: {
            mortal:  { log: 'You sent your first telegram. The world had shrunk overnight.' },
            vampire: { log: 'Wires hum with mortal news. You learn to listen between them.' },
          },
        },
      },
    ];
