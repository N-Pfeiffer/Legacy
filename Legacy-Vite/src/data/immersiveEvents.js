import { HUMORS, HUMOR_IDS } from './humors.js';
import { grantTraitWithEffects } from '../sim/traits.js';

const DELIVERY_BODY =
  'The first sensation you register is the freezing air and the harsh glow of a whale-oil lamp. ' +
  'You are quickly swaddled in rough linen. A tall man in a blood-specked apron—the attending physician—' +
  'holds you up to the light, critically inspecting your small form. He turns to the exhausted midwife ' +
  'washing her hands at the porcelain basin.\n\n' +
  '"The lungs are clear," the physician murmurs, turning back to study your face. ' +
  '"But mark me, this one is most unusual. The child\'s constitution is undeniably..."';

const PROGNOSIS = {
  sanguine:
    '"...flush with blood," the doctor chuckles, wiping a smudge of soot from your cheek as you wail vibrantly. ' +
    '"A Sanguine temperament. They will be lively, no doubt, and quick to love. Keep a close eye on them when ' +
    'they come of age, or they shall charm the silver right out of your pockets."',
  choleric:
    '"...ruled by the yellow bile," the doctor sighs, struggling to maintain his grip on your thrashing form. ' +
    '"A Choleric humor. You have my sympathies. They run hot and impatient. They won\'t hesitate to pursue their whims. You\'ll have your work cut out for you."',
  melancholic:
    '"...dominated by the black bile." The doctor lowers you, a look of pity crossing his severe features. ' +
    '"Melancholic." He wraps the linen tighter against the London draft. "Keep them warm. They will be quiet, ' +
    'introspective, and terribly prone to the glooms. A scholar\'s mind, perhaps, but a heavy, haunted heart."',
  phlegmatic:
    '"...Phlegmatic," the doctor mutters, his brow furrowing as he gently shakes you. You do not cry; you only ' +
    'stare back at him. He hands you to the midwife with a slight shudder. "Undoubtedly calm and patient. ' +
    'This one may raise you as much as you raise them."',
};

function prognosisLogText(humorId) {
  const h = HUMORS[humorId];
  if (!h) return 'The physician records your constitution in the parish ledger.';
  return PROGNOSIS[humorId] || `The physician names you ${h.label}.`;
}

/** Immersive event templates — blocking popups with multi-step flows. */
export function buildImmersiveEvents() {
  return [
    {
      id: 'birth_humor',
      presentation: 'immersive',
      once: true,
      domain: 'family',
      record: 'milestone',
      memoryCategory: 'life',
      logContext: 'Birth',
      eyebrow: '1800',
      title: 'A Welcome to the World',
      steps: [
        {
          id: 'delivery',
          body: DELIVERY_BODY,
          choices: HUMOR_IDS.map((id) => ({
            id,
            label: HUMORS[id].label,
            tagline: HUMORS[id].tagline,
            description: HUMORS[id].mortalDescription,
            accent: HUMORS[id].color,
            labelColor: HUMORS[id].nameTextColor,
          })),
        },
        {
          id: 'prognosis',
          body: (ctx) => PROGNOSIS[ctx.humorId] || '',
          acquisition: (ctx) => {
            const h = HUMORS[ctx.humorId];
            return h ? `+ ${h.label} Trait Acquired` : '+ Trait Acquired';
          },
          choices: [{ id: 'continue', label: 'Continue' }],
        },
      ],
      onComplete(player, ctx) {
        const humorId = ctx.humorId;
        if (!humorId || !HUMORS[humorId]) return;
        if (!Array.isArray(player.traits)) player.traits = [];
        if (!player.traits.includes(humorId)) {
          grantTraitWithEffects(player, humorId);
        }
        player.humorPhase = 'mortal';
      },
      logText: (player, ctx) => prognosisLogText(ctx.humorId),
    },
  ];
}

export function isImmersiveTemplate(tpl) {
  return tpl?.presentation === 'immersive';
}
