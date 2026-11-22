/**
 * Cozy village and meadow props for Willow Hollow.
 *
 * Four static dressing pieces for the village square and the meadow paths:
 *
 * - `bench`         30x20, a small park bench. Two honey-brown backrest slats
 *   with a see-through gap, a wide seat with grain dashes, and two squared
 *   supports. The silhouette is a backrest over a wider seat, so it reads as
 *   a bench before any detail does.
 * - `picnicBlanket` 26x18, a red-and-cream checkered blanket seen from above.
 *   The bottom-right corner is folded back to a lighter underside with a dark
 *   crease, and a tiny scored loaf and a corked jam jar sit on the pattern.
 * - `mailbox`       20x26, a cottage mailbox. A rounded-top timber box with a
 *   dark mail slot, a raised red flag on its right side, a square post, and a
 *   pair of daisies at the base.
 * - `beeSkep`       20x22, a woven straw skep. Alternating light and dark
 *   coil bands wrap a bell-shaped dome, a dark arched entrance opens at the
 *   base, and two single-pixel honey-gold bees hover beside it.
 * - `stoneWall`     32x22, a low grey fieldstone wall segment. Three staggered
 *   courses of rounded blocks in sunlit/mid/shade greys, dark mortar seams,
 *   a wide lighter capstone in the top course, and two moss tufts.
 * - `stonePost`     32x28, a matching gatepost. A 14px square pillar of four
 *   staggered stone courses under a shaped lighter capstone, with one moss
 *   tuft at the base.
 *
 * Conventions:
 * - Each frame is a grid of rows; every row is exactly the sprite's width.
 * - Each character maps to a color in that sprite's own palette; '.' is
 *   transparent.
 * - The bank shares one near-black plum outline (#2a2431), light from the
 *   top-left, and shade piling into the bottom-right.
 * - `frameMs` is how long one frame is held before advancing. These props
 *   are static, so each holds its single frame for 1000ms.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/* ------------------------------------------------------------------ */
/* Bench                                                              */
/* ------------------------------------------------------------------ */

const BENCH_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  H: '#d9a86e', // honey light
  h: '#b07a44', // honey base
  d: '#8a5a30', // honey shade
  k: '#5e3c20', // grain and deep shadow
}

/** 30x20 park bench: two slats, wide seat with grain, two squared supports. */
const BENCH: PixelFrame = [
  '..............................',
  '..............................',
  '....oooooooooooooooooooooo....',
  '....oHHHHHHHHHHHHHHHHHHHHo....',
  '....ohhhhhhhhhhhhhhhhhhhho....',
  '....okkkkkkkkkkkkkkkkkkkko....',
  '..............................',
  '....oooooooooooooooooooooo....',
  '....oHHHHHHHHHHHHHHHHHHHHo....',
  '....ohhhhhhhhhhhhhhhhhhhho....',
  '....okkkkkkkkkkkkkkkkkkkko....',
  '.oooooooooooooooooooooooooooo.',
  '.oHHHHHHHHHHHHHHHHHHHHHHHHHHo.',
  '.ohhhhhhkddhhhhhhhkddhhhhhhho.',
  '.okkkkkkkkkkkkkkkkkkkkkkkkkko.',
  '....ohdo..............ohdo....',
  '....ohdo..............ohdo....',
  '....ohdo..............ohdo....',
  '....ohdo..............ohdo....',
  '....oooo..............oooo....',
]

/* ------------------------------------------------------------------ */
/* Picnic blanket                                                     */
/* ------------------------------------------------------------------ */

const PICNIC_BLANKET_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  C: '#fbf3dd', // cream light
  c: '#f2e3c4', // cream base
  e: '#d9c49a', // cream shade
  R: '#d9695a', // red light
  r: '#c0503f', // red base
  d: '#9a3a30', // red shade
  B: '#d9a86e', // bread light
  b: '#b07a44', // bread base
  k: '#5e3c20', // bread score
  l: '#c9a06a', // cork base
  L: '#e0bc84', // cork light
  a: '#d99a4a', // jam amber
  A: '#f0c070', // jam amber light
  U: '#efd9b0', // folded underside light
  u: '#d9b98c', // folded underside base
}

/** 26x18 checkered blanket: folded corner, scored loaf, corked jam jar. */
const PICNIC_BLANKET: PixelFrame = [
  '..........................',
  '..........................',
  '...oooooooooooooooooooo...',
  '..oCCCCRRRRCCoooRRRCCeeo..',
  '..oCCCoooooColLloRRCCeeo..',
  '..occoBBBBBooAaaorrcceeo..',
  '..orroBkbkBooAaaoccrrddo..',
  '..orrobbbbbooaaaoccrrddo..',
  '..orrrooooorrooocccrrddo..',
  '..occccrrrrccccrrrrcceeo..',
  '..occccrrrrccccrrrrcceeo..',
  '..occccrrrrccccrrrrcceeo..',
  '..orrrrccccrrrrcccUUUUUo..',
  '..orrrrccccrrrrcccUUuuoo..',
  '..orrrrccccrrrrcccUuuodo..',
  '..oeeeeddddeeeedddUuoeeo..',
  '..oeeeeddddeeeedddUoeeeo..',
  '...oooooooooooooooooooo...',
]

/* ------------------------------------------------------------------ */
/* Mailbox                                                            */
/* ------------------------------------------------------------------ */

const MAILBOX_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  W: '#d9a86e', // wood light
  w: '#b07a44', // wood base
  d: '#8a5a30', // wood shade
  k: '#5e3c20', // mail slot and deep shadow
  r: '#c0503f', // flag base
  R: '#d9695a', // flag light
  F: '#f7c9d8', // petal light
  y: '#f0c84a', // flower center
  g: '#6a9a4a', // leaf base
  G: '#8ab86a', // leaf light
}

/** 20x26 cottage mailbox: rounded box, mail slot, raised flag, daisies. */
const MAILBOX: PixelFrame = [
  '....................',
  '....................',
  '......oooooo........',
  '....ooooooooooooo...',
  '....oWWWWWWWWWWoorRR',
  '....oWWWWWWWWWWoorRR',
  '....oWwwwwwwwwdoorRR',
  '....oWwwwwwwwwdoo...',
  '....oWwkkkkkkwdoo...',
  '....oWwwwwwwwwdo....',
  '....oWwwwwwwwwdo....',
  '....oddddddddddo....',
  '....oooooooooooo....',
  '........oWdo........',
  '........oWdo........',
  '........oWdo........',
  '........oWdo........',
  '........oWdo........',
  '........oWdo........',
  '.....o..oWdoo.......',
  '....oFo.oWdo.oFo....',
  '...oFyFooWdooFyFo...',
  '....oFo.oWdo.oFo....',
  '.....o..oWdoo.......',
  '.....G.oWWddo.g.....',
  '.....o.oooooo.o.....',
]

/* ------------------------------------------------------------------ */
/* Bee skep                                                           */
/* ------------------------------------------------------------------ */

const BEE_SKEP_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  S: '#f0d9a0', // straw highlight
  s: '#d9b878', // straw light
  t: '#b8934e', // straw base
  T: '#9a7638', // straw shade
  d: '#7a5a2a', // straw deep
  k: '#3a2a1c', // entrance dark
  y: '#f0b84a', // bee honey gold
}

/** 20x22 woven skep: coil bands, dark arched entrance, two single-pixel bees. */
const BEE_SKEP: PixelFrame = [
  '....................',
  '....................',
  '........oooo........',
  '.......otttto.......',
  '......osttttTo....y.',
  '.....otTTTTTTdo.....',
  '....oSSsssssstto....',
  '....ossttttttTTo....',
  '...ossttttttttTTo...',
  '.y.ottTTTTTTTTddo...',
  '..oSSsssssssssstto..',
  '..ossttttttttttTTo..',
  '..ossttttttttttTTo..',
  '.otttTTTTTTTTTTdddo.',
  '.oSSSssssssssssttto.',
  '.osssttttttttttTTTo.',
  '.osssttttttttttTTTo.',
  '.otttTTTTooTTTTdddo.',
  '.oSSSsssokkosssttto.',
  '.ossstttokkotttTTTo.',
  '.ossstttokkotttTTTo.',
  '..oooooookkooooooo..',
]

/* ------------------------------------------------------------------ */
/* Stone wall                                                         */
/* ------------------------------------------------------------------ */

const STONE_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  C: '#b8bec6', // capstone light
  L: '#9aa2ac', // sunlit grey
  m: '#7d848e', // mid grey
  s: '#5b616b', // shade
  d: '#4a4f57', // mortar seam
  g: '#6f8a4e', // moss base
  G: '#8fae62', // moss light
}

/** 32x22 low fieldstone wall: three staggered courses, capstone, moss tufts. */
const STONE_WALL: PixelFrame = [
  '................................',
  '................................',
  '.oooooooooooooooooooooooooooooo.',
  '.odgGLLLd.CCCCCCCCCCCC.dLLLLLdo.',
  '.oLGgmmms.Cmmmmmmmmmms.Lmmmmmso.',
  '.oLmmmmms.Cmmmmmmmmmms.Lmmmmmso.',
  '.oLmmmmms.Cmmmmmmmmmms.Lmmmmmso.',
  '.odsssssd.dssssssssssd.dsssssdo.',
  '.oddddddddddddddddddddddddddddo.',
  '.odLLd.dLLLLLLLd.dLLLLLLd.dLLdo.',
  '.oLmms.Lmmmmmmms.Lmmmmmms.Lmmso.',
  '.oLmms.Lmmmmmmms.Lmmmmmms.Lmmso.',
  '.oLmms.Lmmmmmmms.Lmmmmmms.Lmmso.',
  '.odssd.dsssssssd.dssssssd.dssdo.',
  '.oddddddddddddddddddddddddddddo.',
  '.odLLLLLLd.dLLLLLLd.dLLLLLLLLdo.',
  '.oLmmmmmms.Lmmmmmms.Lmmmmmmmmso.',
  '.oLmmmmmms.Lmmmmmms.Lmmmmmmmmso.',
  '.oLmmmmmms.Lmmmmmms.Lmmmmmmmmso.',
  '.odssssssd.dssssssd.dsssssgGsdo.',
  '.oddddddddddddddddddddddddGgddo.',
  '.oooooooooooooooooooooooooooooo.',
]

/* ------------------------------------------------------------------ */
/* Stone post                                                         */
/* ------------------------------------------------------------------ */

/** 32x28 gatepost: 14px pillar, four staggered courses, shaped capstone. */
const STONE_POST: PixelFrame = [
  '................................',
  '..........oooooooooooo..........',
  '........oCCCCCCCCCCCCCCo........',
  '.......oCCCCCCCCCCCCCCCCo.......',
  '........osssssssssssssso........',
  '.........oooooooooooooo.........',
  '.........odLLLLd.dLLLdo.........',
  '.........oLmmmms.Lmmmso.........',
  '.........oLmmmms.Lmmmso.........',
  '.........odssssd.dsssdo.........',
  '.........oddddddddddddo.........',
  '.........odLLLLLLLLLLdo.........',
  '.........oLmmmmmmmmmmso.........',
  '.........oLmmmmmmmmmmso.........',
  '.........oLmmmmmmmmmmso.........',
  '.........odssssssssssdo.........',
  '.........oddddddddddddo.........',
  '.........odLLLd.dLLLLdo.........',
  '.........oLmmms.Lmmmmso.........',
  '.........oLmmms.Lmmmmso.........',
  '.........oLmmms.Lmmmmso.........',
  '.........odsssd.dssssdo.........',
  '.........oddddddddddddo.........',
  '.........odLLLLLLLLLLdo.........',
  '.........oLmmmmmmmmmmso.........',
  '.........oLgGmmmmmmmmso.........',
  '.........odGgssssssssdo.........',
  '.........oooooooooooooo.........',
]

/* ------------------------------------------------------------------ */
/* Bank                                                               */
/* ------------------------------------------------------------------ */

export const cozySprites: {
  bench: PixelSprite
  picnicBlanket: PixelSprite
  mailbox: PixelSprite
  beeSkep: PixelSprite
  stoneWall: PixelSprite
  stonePost: PixelSprite
} = {
  bench: { palette: BENCH_PALETTE, frames: [BENCH], frameMs: 1000 },
  picnicBlanket: { palette: PICNIC_BLANKET_PALETTE, frames: [PICNIC_BLANKET], frameMs: 1000 },
  mailbox: { palette: MAILBOX_PALETTE, frames: [MAILBOX], frameMs: 1000 },
  beeSkep: { palette: BEE_SKEP_PALETTE, frames: [BEE_SKEP], frameMs: 1000 },
  stoneWall: { palette: STONE_PALETTE, frames: [STONE_WALL], frameMs: 1000 },
  stonePost: { palette: STONE_PALETTE, frames: [STONE_POST], frameMs: 1000 },
}
