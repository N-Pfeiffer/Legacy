import {
  getParents,
  getSiblings,
  getChildren,
  getCousins,
  getGrandchildren,
  getScions,
  getGrandparentsOnLine,
  getAuntsUnclesOnLine,
} from '../state/gameState.js';
import { hasTrait } from '../sim/traits.js';

export const FAMILY_PREVIEW_COUNT = 2;
export const FAMILY_AU_ROW_SIZE = 4;

/** Default collapse: true = collapsed, false = expanded. Orphans start with Your Roots collapsed. */
export const defaultFamilyCollapseState = (focal = null) => ({
  familySectionRoots: !!(focal && hasTrait(focal, 'orphaned')),
  familySectionGeneration: false,
  familySectionDescendants: false,
  familyFatherAU: false,
  familyMotherAU: false,
  familySiblings: !!focal?.isPlayer,
  familyCousins: !!focal?.isPlayer,
  familyChildren: true,
  familyGrandchildren: true,
  familyScions: true,
});

/** Top-level family band titles — "Your …" when focal is the player. */
function familyBandTitle(focal, band) {
  const titles = focal?.isPlayer
    ? { roots: 'Your Roots', generation: 'Your Generation', descendants: 'Descendants' }
    : { roots: 'Their Roots', generation: 'Their Generation', descendants: 'Their Descendants' };
  return titles[band];
}

/**
 * @param {object} focal
 * @param {{
 *   personCardHtml: (p: object, focal: object, opts?: object) => string,
 *   escapeHtml: (s: string) => string,
 *   collapseState: Record<string, boolean>,
 *   previewCount?: number,
 * }} ctx
 */
export function renderFamilyTab(focal, ctx) {
  const { personCardHtml, escapeHtml, collapseState } = ctx;
  const previewCount = ctx.previewCount ?? FAMILY_PREVIEW_COUNT;

  const parents = getParents(focal);
  const father = parents.find((p) => p.sex === 'M') ?? parents[0] ?? null;
  const mother = parents.find((p) => p.sex === 'F') ?? parents[1] ?? null;

  const renderList = (opts) =>
    renderFamilyList({ ...opts, focal, personCardHtml, escapeHtml, collapseState, previewCount });

  const paternalGPs = father ? getGrandparentsOnLine(father) : [];
  const maternalGPs = mother ? getGrandparentsOnLine(mother) : [];
  const fatherAUs = father ? getAuntsUnclesOnLine(father).sort((a, b) => b.age - a.age) : [];
  const motherAUs = mother ? getAuntsUnclesOnLine(mother).sort((a, b) => b.age - a.age) : [];

  const renderGrandparentWing = (grandparents, side) => {
    if (!grandparents.length) {
      return `<div class="family-roots-wing family-roots-wing--${side}">
        <div class="family-roots-unknown family-roots-unknown--gp">Unknown</div>
      </div>`;
    }
    const cards = grandparents
      .map((p) => personCardHtml(p, focal, { rootsGpCard: true }))
      .join('');
    return `<div class="family-roots-wing family-roots-wing--${side}">${cards}</div>`;
  };

  const renderParentSlot = (parent, role) => {
    if (!parent) {
      return `<div class="family-roots-parent-slot family-roots-parent-slot--empty">
        <div class="family-roots-unknown">${escapeHtml(role)} unknown</div>
      </div>`;
    }
    return `<div class="family-roots-parent-slot">${personCardHtml(parent, focal, { rootsCard: true })}</div>`;
  };

  const rootsRow = `<div class="family-roots-scroll">
    <div class="family-roots-row">
      ${renderGrandparentWing(paternalGPs, 'paternal')}
      <div class="family-roots-parents">
        ${renderParentSlot(father, 'Father')}
        ${renderParentSlot(mother, 'Mother')}
      </div>
      ${renderGrandparentWing(maternalGPs, 'maternal')}
    </div>
  </div>`;

  const auntsUnclesRow = `<div class="family-au-row">
    <div class="family-au-cell">${renderList({
      label: "Father's Siblings",
      people: fatherAUs,
      emptyText: 'None on this side',
      collapseKey: 'familyFatherAU',
      nest: true,
      auGrid: true,
      rowSize: FAMILY_AU_ROW_SIZE,
      pairedRow: true,
    })}</div>
    <div class="family-au-cell">${renderList({
      label: "Mother's Siblings",
      people: motherAUs,
      emptyText: 'None on this side',
      collapseKey: 'familyMotherAU',
      nest: true,
      auGrid: true,
      rowSize: FAMILY_AU_ROW_SIZE,
      pairedRow: true,
    })}</div>
  </div>`;

  return `<div class="family-panel">
    ${renderFamilySection(familyBandTitle(focal, 'roots'), `${rootsRow}${auntsUnclesRow}`, 'familySectionRoots', collapseState)}
    ${renderFamilySection(familyBandTitle(focal, 'generation'), `<div class="family-gen-row">
      <div class="family-gen-cell">${renderList({
        label: 'Siblings',
        people: getSiblings(focal),
        emptyText: 'An only child',
        collapseKey: 'familySiblings',
        pairedRow: true,
      })}</div>
      <div class="family-gen-cell">${renderList({
        label: 'Cousins',
        people: getCousins(focal).sort((a, b) => b.age - a.age),
        emptyText: 'None known',
        collapseKey: 'familyCousins',
        pairedRow: true,
      })}</div>
    </div>    `, 'familySectionGeneration', collapseState)}
    ${renderFamilySection(familyBandTitle(focal, 'descendants'), `
      ${renderList({
        label: 'Children',
        people: getChildren(focal),
        emptyText: 'No children yet',
        collapseKey: 'familyChildren',
        kinCards: true,
      })}
      ${renderList({
        label: 'Grandchildren',
        people: getGrandchildren(focal).sort((a, b) => b.age - a.age),
        emptyText: 'No grandchildren yet',
        collapseKey: 'familyGrandchildren',
        nest: true,
        kinCards: true,
      })}
      ${renderList({
        label: 'Scions',
        people: getScions(focal).sort((a, b) => b.age - a.age),
        emptyText: 'No scions yet',
        collapseKey: 'familyScions',
        nest: true,
        kinCards: true,
      })}
    `, 'familySectionDescendants', collapseState)}
  </div>`;
}

function renderFamilySection(title, innerHtml, collapseKey, collapseState) {
  const collapsed = collapseKey ? !!collapseState[collapseKey] : false;
  return `<section class="family-section${collapsed ? ' is-collapsed' : ''}"${collapseKey ? ` data-collapse-key="${collapseKey}"` : ''}>
    <button type="button" class="family-section-title" aria-expanded="${!collapsed}">${title}</button>
    <div class="family-section-body">${innerHtml}</div>
  </section>`;
}

/** Matched header chrome for paired family rows — avoids misalignment when
 *  one side is collapsible and the other is not. */
function renderSubsectionHeader({ label, countBadge, collapsible, collapsed, escapeHtml }) {
  const caret = collapsible
    ? '<span class="bl-sub-toggle-caret" aria-hidden="true">▾</span>'
    : '';
  const inner =
    `<span class="bl-sub-toggle-label">${escapeHtml(label)}</span>${countBadge || ''}${caret}`;
  if (collapsible) {
    return `<button type="button" class="bl-sub-toggle" aria-expanded="${!collapsed}">${inner}</button>`;
  }
  return `<div class="bl-sub-toggle bl-sub-toggle--static">${inner}</div>`;
}

function renderFamilyList({
  label,
  people,
  focal,
  emptyText,
  collapseKey,
  personCardHtml,
  escapeHtml,
  collapseState,
  previewCount,
  fixed = false,
  nest = false,
  mini = false,
  auGrid = false,
  rowSize,
  pairedRow = false,
  kinCards = false,
}) {
  const countBadge = people.length ? ` <span class="bl-count">${people.length}</span>` : '';
  const nestClass = nest ? ' family-nest' : '';
  const auClass = auGrid ? ' family-au-list' : '';
  const kinClass = kinCards ? ' family-kin-list' : '';
  const cardOpts = { compact: true, mini };
  const gridCols = rowSize ?? previewCount;
  const collapsibleMin = auGrid ? gridCols + 1 : previewCount + 1;
  const isCollapsible = people.length > 0 && !fixed && people.length >= collapsibleMin;
  const collapsed = collapseKey ? !!collapseState[collapseKey] : false;

  const headerHtml = (collapsible) => {
    if (pairedRow) {
      return renderSubsectionHeader({ label, countBadge, collapsible, collapsed, escapeHtml });
    }
    if (collapsible) {
      return renderSubsectionHeader({ label, countBadge, collapsible: true, collapsed, escapeHtml });
    }
    return `<div class="bl-sub-label bl-nest-label">${escapeHtml(label)}${countBadge}</div>`;
  };

  if (!people.length) {
    return `<div class="bl-subsection bl-sub-fixed${nestClass}${auClass}${kinClass}">
      ${headerHtml(false)}
      <div class="bl-sub-body"><div class="bl-empty">${emptyText}</div></div>
    </div>`;
  }

  const cards = people.map((p) => personCardHtml(p, focal, cardOpts)).join('');
  const bodyInner = auGrid
    ? `<div class="family-au-grid">${cards}</div>`
    : `<div class="bl-sub-cards"><div class="bl-row">${cards}</div></div>`;

  if (!isCollapsible) {
    return `<div class="bl-subsection bl-sub-fixed${nestClass}${auClass}${kinClass}">
      ${headerHtml(false)}
      <div class="bl-sub-body">${bodyInner}</div>
    </div>`;
  }

  return `<div class="bl-subsection bl-collapsible${collapsed ? ' is-collapsed' : ''}${nestClass}${auClass}${kinClass}"${collapseKey ? ` data-collapse-key="${collapseKey}"` : ''}${auGrid ? ` data-au-row-size="${gridCols}"` : ''}>
    ${headerHtml(true)}
    <div class="bl-sub-body">${bodyInner}</div>
  </div>`;
}
