/**
 * Data-driven art layer for items, hobbies, and zones.
 * Supports emoji (fallback), SVG sprite symbols, and raster images.
 */

const DEFAULT_GLYPH = '◆';

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** Resolve catalog entry art descriptor; legacy `icon` string → emoji. */
export function resolveArtDescriptor(entry, fallbackGlyph = DEFAULT_GLYPH) {
  if (entry?.art?.kind) return entry.art;
  if (entry?.icon) return { kind: 'emoji', glyph: entry.icon };
  return { kind: 'emoji', glyph: fallbackGlyph };
}

/**
 * @param {object|null|undefined} art
 * @param {{ size?: number, className?: string, fallback?: string, escapeHtml?: (s: string) => string, entityId?: string, imageGroup?: string }} [opts]
 * @returns {string}
 */
export function renderArt(art, opts = {}) {
  const {
    size = 24,
    className = '',
    fallback = DEFAULT_GLYPH,
    escapeHtml = (s) => String(s),
    entityId = null,
    imageGroup = 'items',
  } = opts;

  const descriptor = art?.kind ? art : { kind: 'emoji', glyph: fallback };
  const cls = className ? ` ${className}` : '';

  if (descriptor.kind === 'svg' && descriptor.ref) {
    const ref = escapeAttr(descriptor.ref);
    return `<svg class="art art--svg${cls}" aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24"><use href="/art/sprite.svg#${ref}"/></svg>`;
  }

  if (descriptor.kind === 'image') {
    const src = descriptor.src
      || (entityId ? `/art/${imageGroup}/${entityId}.webp` : null);
    if (src) {
      return `<img class="art art--image${cls}" src="${escapeAttr(src)}" alt="" loading="lazy" decoding="async" width="${size}" height="${size}">`;
    }
  }

  const glyph = escapeHtml(descriptor.glyph ?? fallback);
  return `<span class="art art--emoji${cls}" aria-hidden="true">${glyph}</span>`;
}

/** Convenience: render art for a catalog entry (item, hobby, zone). */
export function renderEntryArt(entry, opts = {}) {
  const descriptor = resolveArtDescriptor(entry, opts.fallback);
  return renderArt(descriptor, {
    ...opts,
    entityId: entry?.id ?? opts.entityId,
  });
}
