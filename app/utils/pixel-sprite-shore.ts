/**
 * High-resolution shore props for Willow Hollow.
 *
 * Three static props for the south sea coast and the river crossing:
 *
 * - `driftwood` 32x14, a sun-bleached log lying at a slight diagonal. Both
 *   cut faces show pale ring arcs, the body carries two long grain lines,
 *   and a single small knot sits in the lower half.
 * - `rowboat`   48x22, a beached wooden dinghy drawn from above at a slight
 *   angle. A warm plank hull with a lighter gunwale rim, two bench thwarts,
 *   a coiled rope in the bow, and a shadowed lower-right cockpit.
 * - `crate`     24x20, a shore crate with a sand-dusted top face, vertical
 *   slats, a cross-braced front, and nail dots at the corners.
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

/* ------------------------------------------------------------------ */
/* Driftwood                                                          */
/* ------------------------------------------------------------------ */

const DRIFTWOOD_PALETTE = {
  o: '#2a2431', // shared outline
  w: '#e0dbcf', // sun-bleached highlight
  g: '#c4bcaa', // weathered grey
  G: '#a89f8d', // grain and mid shade
  d: '#8a8272', // lower shade
  k: '#645d52', // crack and knot ring
  n: '#4a443a', // knot core
}

/** 32x14 weathered log: diagonal body, ringed cut faces, grain, one knot. */
const DRIFTWOOD = [
  '................................',
  '................................',
  '...........................ooo..',
  '......................oooooGwo..',
  '..................ooooggggGwGdo.',
  '..............ooooggggGGGGGwGdo.',
  '..........oooogGGGGGggggggGwGdo.',
  '......ooooGGGgggwkggggggggGwGdo.',
  '..ooooggggggggggknkgGGGGGggGoo..',
  '.oGwgggggggggGGGGGgggggggooo....',
  '.oGkkgGGGGGggggggggggoooo.......',
  '..oGwkgggggggggggoooo...........',
  '...oowggggggooooo...............',
  '.....ooooooo....................',
]

/* ------------------------------------------------------------------ */
/* Rowboat                                                            */
/* ------------------------------------------------------------------ */

const ROWBOAT_PALETTE = {
  o: '#2a2431', // shared outline
  W: '#d9a86a', // gunwale light
  w: '#b9854e', // gunwale base
  v: '#8f6238', // gunwale shade
  i: '#7d5432', // cockpit floor
  I: '#5c3c24', // cockpit shadow
  d: '#6b4224', // plank seam
  t: '#d6aa6e', // thwart light
  T: '#b48852', // thwart base
  u: '#8c6036', // thwart shade
  r: '#e3cfa4', // rope light
  R: '#b49a6e', // rope shade
}

/** 48x22 beached dinghy: pointed bow, transom stern, two thwarts, bow rope. */
const ROWBOAT = [
  '................................................',
  '................................................',
  '................................................',
  '................................................',
  '..................oooooooooooooooo..............',
  '.............ooooowwwwwwwwwwwwwwwwooooo.........',
  '.........oooowwwuuudddddiiiidduudddwwwwooo......',
  '......ooowwwwdddtttiiiiiiiiiiittddrrrddwwwoo....',
  '....oowwwddiiiiitttiiiidddddddttirRRRriiIdwwo...',
  'oooowwddiiiiiidddttddddiiiiiiittirRrRrrrrdwo....',
  'owwwdiiiidddddiiittiiiiiiiiiiiTTiirrrIdrwwo.....',
  'oiiiiiiiiiiiiiiiitTiiiiiiiiiidTTddddddwwoo......',
  'oiiiiiiiiiiiiiiiiTTidddddddddITTIIddwwoo........',
  'oiIIIiiiiidddddddTTdiiiiIIIIIITuuwwwoo..........',
  'oIIIIIIIIdIIIIIIITTIIIIIIIIddduwwooo............',
  'odddwdddIIIIIIIIITTTIIdddwwwwwooo...............',
  'owwwowwwwwwwwwwwwuuuwwwwwwoooo..................',
  'oooooooooooooooooooooooooo......................',
  '................................................',
  '................................................',
  '................................................',
  '................................................',
]

/* ------------------------------------------------------------------ */
/* Crate                                                              */
/* ------------------------------------------------------------------ */

const CRATE_PALETTE = {
  o: '#2a2431', // shared outline
  T: '#d8b078', // top face light
  t: '#c29a62', // top face base
  u: '#a37c4a', // top face shade and seam
  S: '#e8d7ae', // sand light
  s: '#cdb98c', // sand
  b: '#a8763f', // front rail light
  B: '#8a5c30', // front face base
  d: '#6b4524', // front shade and seam
  D: '#4e3019', // side face deep
  k: '#3a2a1c', // brace seam
  n: '#5a4a3a', // nail
  N: '#d9c9a8', // nail highlight
  r: '#c08a52', // brace face
}

/** 24x20 shore crate: sand-dusted top, slatted front, X brace, corner nails. */
const CRATE = [
  '........................',
  '........................',
  '.....ooooooooooooooo....',
  '....otttuttttuttttuto...',
  '....otttSttttuttStuto...',
  '....ottSutttsutttSuto...',
  '...otstutsStustttuSsSo..',
  '..otsSsttttuttsSuttttto.',
  '..ouuuuuuuuuuuuuuuuuuuo.',
  '..oddddddddddddddddddddo',
  '..onNbbbbbbbbbbbbbbbnNdo',
  '..oBrBdBBBdBBBdBBBdrBBdo',
  '..oBkrdBBBdBBBdBBBrkBBdo',
  '..oBBkrBBBdBBBdBBrkBBBdo',
  '..oBBBkrBBdBBBdBrkdBBBdo',
  '..oBBBdkrBdBBBdrkBdBBBdo',
  '..oBBBdBkrdBBBrkBBdBBBdo',
  '..onNBdBBkrBBrkBBBdBnNoo',
  '..oooooooooooooooooooo..',
  '........................',
]

/* ------------------------------------------------------------------ */
/* Bank                                                               */
/* ------------------------------------------------------------------ */

export const shoreSprites = {
  driftwood: { palette: DRIFTWOOD_PALETTE, frames: [DRIFTWOOD], frameMs: 1000 },
  rowboat: { palette: ROWBOAT_PALETTE, frames: [ROWBOAT], frameMs: 1000 },
  crate: { palette: CRATE_PALETTE, frames: [CRATE], frameMs: 1000 },
}
