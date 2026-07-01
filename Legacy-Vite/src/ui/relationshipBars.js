import { escapeHtml } from '../utils/escapeHtml.js';
import { clampDisposition, clampEnthrallment, clampIntimacy } from '../state/relationship.js';
import {
  dispositionTierLabel,
  enthrallmentTierLabel,
  intimacyTierLabel,
} from '../data/relationshipThresholds.js';
import { getRelationshipOrDefault } from '../sim/relationships.js';

function formatSigned(value) {
  const n = Math.round(Number(value) || 0);
  return n > 0 ? `+${n}` : String(n);
}

function bipolarFill(value, clampFn, { minWidthPct = 0 } = {}) {
  const v = clampFn(value);
  if (v > 0) {
    return {
      side: 'pos',
      left: 50,
      width: Math.max(minWidthPct, (v / 100) * 50),
    };
  }
  if (v < 0) {
    const width = Math.max(minWidthPct, (-v / 100) * 50);
    return {
      side: 'neg',
      left: 50 - width,
      width,
    };
  }
  return null;
}

function bipolarBarHtml(fill, negColor, posColor, extraClass = '') {
  const clsExtra = extraClass ? ` ${extraClass}` : '';
  if (!fill) {
    return `<div class="relationship-bar relationship-bar--bipolar${clsExtra}">
      <div class="relationship-bar-center"></div>
    </div>`;
  }
  const cls = fill.side === 'neg' ? 'relationship-bar-fill--neg' : 'relationship-bar-fill--pos';
  const color = fill.side === 'neg' ? negColor : posColor;
  return `<div class="relationship-bar relationship-bar--bipolar${clsExtra}">
    <div class="relationship-bar-center"></div>
    <div class="relationship-bar-fill ${cls}" style="left:${fill.left}%; width:${fill.width}%; background:${color};"></div>
  </div>`;
}

/** 0–100 from center-right; full bipolar track for visual parity with other bars. */
function enthrallmentFill(value, { minWidthPct = 0 } = {}) {
  const v = clampEnthrallment(value);
  if (v <= 0) return null;
  return {
    side: 'pos',
    left: 50,
    width: Math.max(minWidthPct, (v / 100) * 50),
  };
}

function enthrallmentBarHtml(value, color, extraClass = '', { minWidthPct = 0 } = {}) {
  const fill = enthrallmentFill(value, { minWidthPct });
  return bipolarBarHtml(fill, color, color, extraClass);
}

function formatPlain(value) {
  return String(Math.round(Number(value) || 0));
}

function detailStatRow({ label, value, tier, barHtml, formatValue = formatSigned, kind }) {
  const kindCls = kind ? ` relationship-stat-detail--${kind}` : '';
  return `<div class="relationship-stat-detail${kindCls}">
    <div class="relationship-stat-name">${escapeHtml(label)}</div>
    <div class="relationship-stat-meta">
      <span class="relationship-stat-tier">${escapeHtml(tier)}</span>
      <span class="relationship-stat-value">${formatValue(value)}</span>
    </div>
    ${barHtml}
  </div>`;
}

function edgeBarSpecs(player, edge) {
  const specs = [
    {
      type: 'bipolar',
      kind: 'disposition',
      label: 'Disposition',
      value: edge.disposition,
      tier: dispositionTierLabel(edge.disposition),
      negColor: 'var(--bond-sage-dim)',
      posColor: 'var(--bond-sage)',
      clampFn: clampDisposition,
    },
    {
      type: 'bipolar',
      kind: 'intimacy',
      label: 'Intimacy',
      value: edge.intimacy,
      tier: intimacyTierLabel(edge.intimacy),
      negColor: 'var(--bond-burgundy-dim)',
      posColor: 'var(--bond-burgundy)',
      clampFn: clampIntimacy,
    },
  ];

  if (player.isVampire) {
    specs.push({
      type: 'enthralment',
      kind: 'enthrallment',
      label: 'Enthrallment',
      value: edge.enthrallment,
      tier: enthrallmentTierLabel(edge.enthrallment),
      color: 'var(--bond-crimson)',
    });
  }

  return specs;
}

/**
 * Player-centric bond bars for an NPC.
 * @param {'detail'|'compact'} [mode]
 */
export function relationshipBarsHtml(player, npc, { mode = 'detail' } = {}) {
  if (!player || !npc || npc.isPlayer) return '';

  const edge = getRelationshipOrDefault(player, npc.id);
  const specs = edgeBarSpecs(player, edge);

  if (mode === 'compact') {
    const minFill = 10;
    const bars = specs.map((spec) => {
      if (spec.type === 'bipolar') {
        const fill = bipolarFill(spec.value, spec.clampFn, { minWidthPct: minFill });
        return bipolarBarHtml(fill, spec.negColor, spec.posColor, 'relationship-bar--card');
      }
      return enthrallmentBarHtml(spec.value, spec.color, 'relationship-bar--card', { minWidthPct: 8 });
    });
    return `<div class="pc-bond-bars">${bars.join('')}</div>`;
  }

  const rows = specs.map((spec) => {
    const detailBarClass = 'relationship-bar--detail';
    if (spec.type === 'bipolar') {
      const fill = bipolarFill(spec.value, spec.clampFn, { minWidthPct: 6 });
      return detailStatRow({
        kind: spec.kind,
        label: spec.label,
        value: spec.value,
        tier: spec.tier,
        barHtml: bipolarBarHtml(fill, spec.negColor, spec.posColor, detailBarClass),
      });
    }
    return detailStatRow({
      kind: spec.kind,
      label: spec.label,
      value: spec.value,
      tier: spec.tier,
      formatValue: formatPlain,
      barHtml: enthrallmentBarHtml(spec.value, spec.color, detailBarClass, { minWidthPct: 6 }),
    });
  });

  return `<div class="relationship-bars-grid relationship-bars-grid--detail">${rows.join('')}</div>`;
}

/** Label-free bars for person cards. */
export function relationshipCardBarsHtml(player, npc) {
  return relationshipBarsHtml(player, npc, { mode: 'compact' });
}

/** Bond panel wrapper for modal / focal views. */
export function relationshipBondPanelHtml(player, npc) {
  const bars = relationshipBarsHtml(player, npc, { mode: 'detail' });
  if (!bars) return '';
  return `<div class="person-info-bond">${bars}</div>`;
}
