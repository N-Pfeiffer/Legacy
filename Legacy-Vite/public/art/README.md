# Legacy — Art Pipeline & Prompt Library

This folder holds **painted raster art** (zone scenes, vampire haven scenes, optional item/portrait
art) for the game. It is the deferred "Option 3" raster track described in the implementation plan
(§2A.8). SVG emblems + per-zone CSS themes ship first; painted `.webp` files drop in here later with
**zero code changes**.

> An AI *coding* agent cannot paint these. Generate them with an image model (or commission an
> artist) using the prompts below, export to `.webp`, and place them at the documented path.

---

## How the art layer works (recap)

Every zone/item/hobby entry carries an `art` descriptor resolved by `src/ui/renderArt.js`:

```js
art: { kind: 'emoji', glyph: '🏞️' }                          // fallback
art: { kind: 'svg',   ref:  'zone-the_outlands' }            // sprite emblem (default)
art: { kind: 'image', src:  '/art/zones/the_outlands.webp' } // painted raster (this folder)
```

**To switch a zone/haven to painted art:** drop the `.webp` here at the documented path, then change
that entry's descriptor to `{ kind: 'image', src: '/art/<group>/<id>.webp' }` (or just
`{ kind: 'image' }` if the renderer derives the path from `id`). Nothing else changes. Until the file
exists, leave the entry on `svg`/`emoji` so it never blanks.

---

## Folder structure & naming

```
public/art/
  sprite.svg          # code-authored SVG symbols (zone-*, hobby-*, item-*) — NOT raster
  zones/<id>.webp     # gathering & hunting zone scenes
  havens/<id>.webp    # vampire haven scenes
  items/<id>.webp     # optional: hero/relic item art
  README.md           # this file
```

- **Filename === the entity `id`** exactly (e.g. `the_cornwall_deeps.webp`). This is what lets the
  renderer derive paths and what keeps the manifest checkable.
- Lowercase, underscores, no spaces — match the `id` strings used in the data files.

## File specs

- **Format:** `.webp`, sRGB color, quality ~80 (visually lossless at these sizes, small payload).
- **Sizes** (`ART: provisional` — adjust once UI is final):
  - Zone **card thumbnail** — `320 × 320` (1:1). Used in the zone-picker grid.
  - Zone **banner** — `960 × 540` (16:9). Used in the zone detail/header.
  - Haven **scene** — `1280 × 720` (16:9). Larger set-piece.
  - *Generate the banner/scene first; the thumbnail can be a center-crop if you don't want a
    separate square composition.*
- Always keep the matching `width`/`height` on the `<img>` (renderer handles this) to avoid layout
  shift. Files are lazy-loaded.
- **No baked-in text, UI, frames, watermarks, or borders** — the UI provides the frame and vignette.

## How files blend into the UI

The renderer wraps raster art in a CSS vignette/gradient and applies a `body.vampire-mode` tint, so
deliver **clean, evenly-lit-but-moody** scenes without heavy vignettes of their own — let the UI add
the framing. Compositions should keep the visually important content **away from the extreme edges**
(the vignette darkens them).

---

## The house style (use on EVERY prompt)

Append this **style suffix** verbatim to every prompt for a cohesive set. Then prepend the
per-subject prompt.

> **STYLE SUFFIX —** *19th-century painterly oil illustration, atmospheric Victorian gothic mood,
> muted palette of parchment cream, candlelit amber, tarnished gold, soot grey and deep shadow;
> soft volumetric light, fine painterly brushwork, romantic and slightly melancholic; environmental
> establishing shot, no people, no text, no lettering, no UI, no frame or border, no modern objects,
> no watermark; cohesive game-art set, cinematic depth, eye-level composition.*

**Negative prompt (if your tool supports one):** *people, figures, faces, text, words, letters,
logos, watermark, signature, UI, frame, border, modern objects, cars, electricity, neon, cartoon,
anime, low quality, oversaturated.*

**Aspect ratio:** set `16:9` for banners/scenes, `1:1` for thumbnails. **Seed tip:** reuse one seed
family / the same model + suffix across the whole set to keep lighting and texture consistent.

**Era note:** default look is early-to-mid 1800s Britain. The game spans later eras; if you later
want era-variant art, regenerate with an era cue (e.g. "1920s") swapped into the per-subject line —
the filename/path convention can carry an era suffix (`the_thames__1920.webp`) if needed.

---

## ZONE PROMPTS

Each entry: **`id`** → file path → ready prompt (prepend to the STYLE SUFFIX). Drops/skill-gates are
in the game data; here we only care about the *look*.

### Botany — foraging

**`the_thames`** → `zones/the_thames.webp`
> A misty tidal marsh along the River Thames at dawn, reed beds and rushes swaying over muddy
> riverbanks, willow trees trailing into still grey-green water, low fog hanging over the flats,
> a faint silhouette of old London rooftops far on the horizon, cold damp morning light. —
> *[STYLE SUFFIX]*

**`the_outlands`** → `zones/the_outlands.webp`
> Open rolling English plains and dusty cart trails stretching toward distant hills, wild foxglove
> and yarrow scattered through dry amber grass, a lone weathered roadside hedgerow, warm late-summer
> afternoon haze, big quiet sky. — *[STYLE SUFFIX]*

**`the_deep_forest`** → `zones/the_deep_forest.webp`
> A dense, dark primeval forest far from any town, towering ancient oaks and tangled undergrowth,
> belladonna and wolfsbane in the shadowed loam, shafts of pale green light barely piercing the
> canopy, cool and silent and a little foreboding. — *[STYLE SUFFIX]*

### Metallurgy — gathering

**`industrial_scrapyards`** → `zones/industrial_scrapyards.webp`
> A grimy 19th-century industrial scrapyard on London's edge, heaps of rusted copper and tin, broken
> machinery and slag, soot-stained brick walls and a smoking chimney behind, overcast iron-grey sky,
> coal dust in the air. — *[STYLE SUFFIX]*

**`chalk_and_clay_pits`** → `zones/chalk_and_clay_pits.webp`
> A pale chalk and clay quarry cut into a hillside, terraces of white limestone and grey clay,
> shallow rain pools reflecting a flat sky, scattered tools and a wooden cart, raw exposed earth,
> muted overcast daylight. — *[STYLE SUFFIX]*

**`the_weald`** → `zones/the_weald.webp`
> The ancient Wealden iron country, a wooded valley of old growth over ore-rich earth, a mossy rocky
> outcrop streaked with iron and a glint of silver and quartz, dappled forest light, deep green and
> mineral tones. — *[STYLE SUFFIX]*

**`the_cornwall_deeps`** → `zones/the_cornwall_deeps.webp`
> The mouth of a deep Cornish tin-and-gold mine, a dark rough-hewn tunnel descending into the cliff
> rock, veins of quartz and bismuth catching faint lantern glow, cold damp slate-blue stone, a sliver
> of stormy coast visible at the entrance. — *[STYLE SUFFIX]*

### Hunting

**`the_moors`** → `zones/the_moors.webp`
> Windswept open English moorland of low heather and shrub, grey rocky outcrops, a faint deer track
> winding through bracken, distant rain clouds dragging over rolling hills, cold muted green-and-grey
> light, lonely and wild. — *[STYLE SUFFIX]*

**`the_forest`** → `zones/the_forest.webp`
> A mixed temperate woodland deeper inland, sun-dappled clearings between elk and boar trails, fallen
> logs and fern, warm amber light filtering through autumn leaves, alive but secluded. —
> *[STYLE SUFFIX]*

**`the_deep_weald`** → `zones/the_deep_weald.webp`
> The deepest primordial weald, an extremely hidden and almost mythic old forest, colossal gnarled
> trees draped in moss and mist, near-darkness with eerie pale light pooling in a hollow, a sense of
> something watching, dire and ancient. — *[STYLE SUFFIX]*

### Angling *(provisional starter zone)*

**`the_riverbank`** → `zones/the_riverbank.webp`
> A quiet sunlit riverbank bend with calm reflective water, overhanging willows and tall reeds, a
> mossy fishing spot among smooth stones, gentle warm afternoon light, peaceful and restful. —
> *[STYLE SUFFIX]*

---

## HAVEN PROMPTS (vampire)

Interior/exterior set-pieces for the vampire Haven system. Vibe words are taken verbatim from the
design (`Legacy_ToDo.txt:274-280`). Use the **scene** size (`1280 × 720`, 16:9). These may lean
darker than the zones — candlelit interiors, deep shadow.

**`high_class_townhouse`** → `havens/high_class_townhouse.webp`
> The interior of an opulent high-society Victorian townhouse parlour, velvety drapes and deep
> mahogany panelling, gilt-framed portraits, a marble fireplace, crystal decanters glinting by
> candlelight, compact but exquisitely rich, refined aristocratic luxury, warm amber glow against
> deep shadow. — *[STYLE SUFFIX]*

**`crypt_cellar`** → `havens/crypt_cellar.webp`
> An ancient underground crypt cellar, hybrid stone-and-dirt catacomb tunnels, weathered carved
> sarcophagi and iron sconces, cobwebbed archways disappearing into darkness, cold damp stone, a
> single guttering candle, sepulchral and timeless. — *[STYLE SUFFIX]*

**`private_estate`** → `havens/private_estate.webp`
> A grand secluded private estate at dusk, a stately manor with tall windows half-swallowed by
> overgrown ivy, sprawling neglected gardens and a stone terrace, blend of interior warmth and wild
> exterior grandeur, private and imposing, last violet light fading behind the house. —
> *[STYLE SUFFIX]*

**`the_warren`** → `havens/the_warren.webp`
> A filthy sprawling underground warren beneath the slums, cramped low brick tunnels and rotting
> timber props, dripping grime and refuse, faint eyes glinting in the dark recesses, dangerous and
> secretive, sickly dim light from a far-off lantern. — *[STYLE SUFFIX]*

---

## Optional: item / relic art (`items/<id>.webp`)

Most items stay on SVG emblems. For a few hero items (unique relics, legendary weapons) you may want
painted art. Use the **thumbnail** size (`320 × 320`, 1:1), centered object on a dark neutral
backdrop, dramatic single-source lighting, e.g.:

> *(example — `items/bloodstone_amulet.webp`)* A single ornate bloodstone amulet on dark velvet,
> deep red gem set in tarnished silver filigree, dramatic candlelit highlight, museum-object framing,
> centered. — *[STYLE SUFFIX]*

---

## Art manifest / checklist

Track what's been generated. Unchecked = still using SVG/emoji fallback.

**Zones**
- [ x] `zones/the_thames.webp`
- [ ] `zones/the_outlands.webp`
- [ ] `zones/the_deep_forest.webp`
- [ ] `zones/industrial_scrapyards.webp`
- [ ] `zones/chalk_and_clay_pits.webp`
- [ ] `zones/the_weald.webp`
- [ ] `zones/the_cornwall_deeps.webp`
- [ ] `zones/the_moors.webp`
- [ ] `zones/the_forest.webp`
- [ ] `zones/the_deep_weald.webp`
- [ ] `zones/the_riverbank.webp`

**Havens**
- [ ] `havens/high_class_townhouse.webp`
- [ ] `havens/crypt_cellar.webp`
- [ ] `havens/private_estate.webp`
- [ ] `havens/the_warren.webp`

**Items (optional)**
- [ ] _(add hero items as desired)_

> When you tick a box, also flip that entry's `art` descriptor to `{ kind: 'image', … }` in the data.
