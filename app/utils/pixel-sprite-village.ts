/**
 * High-resolution village props for Willow Hollow.
 *
 * Two street props that used to come from the 16px legacy bank, redrawn at
 * native 32px so they no longer render chunky at 2x:
 *
 * - `lamp` 32x44, two frames. A dark iron lamppost on a stepped stone plinth,
 *   with a crossbar, a scroll bracket, and a hanging lantern whose amber panes
 *   and lit top finial breathe between a bright and a dim frame. The renderer's
 *   existing `lampGlow` schedule drives the two frames.
 * - `sign` 32x32, one frame. A short timber post with a beveled top and a
 *   two-board sign panel, carved arrows, and two nail heads. The wood tones
 *   match the farm gate.
 *
 * Conventions:
 * - Each frame is a grid of rows; every row is exactly the sprite's width.
 * - Each character maps to a color in that sprite's own palette; '.' is
 *   transparent.
 * - The bank shares one near-black plum outline (#2a2431), light from the
 *   top-left, and shade piling into the bottom-right.
 * - `frameMs` is 1000ms for static props; the lamp's glow is paced by the
 *   renderer's shared schedule.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/* ------------------------------------------------------------------ */
/* Lamp                                                               */
/* ------------------------------------------------------------------ */

const LAMP_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  i: '#4a4048', // iron
  I: '#5e525c', // iron light
  d: '#332b36', // iron shade
  k: '#8a8078', // plinth stone
  K: '#b0a89e', // plinth stone light
  m: '#6a625c', // plinth stone shade
  y: '#e8b45a', // amber pane, dim
  Y: '#ffe9a8', // amber pane, bright
  g: '#d99a4a', // glow spill, dim
  G: '#ffd98c', // glow spill, bright
}

/** 32x44 lamppost, lantern glow at its brightest. */
const LAMP_BRIGHT: PixelFrame = [
  '................................',
  '................................',
  '...........oooooooo.............',
  '..........oIIiiidddo............',
  '..........ooooooooooooooooooo...',
  '...........oIiiiddoIIIiiiiddo...',
  '...........oIiiiddooooooooooo...',
  '...........oIiiiddoii...ii......',
  '...........oIiiiddoi.i.GYYG.....',
  '...........oIiiiddoi.i.oYYo.....',
  '...........oIiiiddoii.oiiiio....',
  '...........oIiiiddo..oiiiiiio...',
  '...........oIIIiddo..oiiiiiio...',
  '...........oIiiiddo..oiiiiiio...',
  '...........oIiiiddo..oYYiiYYo...',
  '...........oIiiiddo.GoYYiiYYoG..',
  '...........oIiiiddo.GoiiiiiioG..',
  '...........oIiiiddo.GoYYiiYYoG..',
  '...........oIiiiddo.GoYYiiYYoG..',
  '...........oIiiiddo..oYYiiYYo...',
  '...........oIIIiddo..oiiiiiio...',
  '...........oIiiiddo..oiiiiiio...',
  '...........oIiiiddo...oiiiio....',
  '...........oIiiiddo....oiio.....',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIIIiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIIIiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '..........oooooooooo............',
  '.........oKkkkkkkkkmo...........',
  '.........oKkkkkkkkkmo...........',
  '........oKkkkkkkkkkkmo..........',
  '........oKkkkkkkkkkkmo..........',
  '........oooooooooooooo..........',
]

/** 32x44 lamppost, lantern glow settled to its dim ember. */
const LAMP_DIM: PixelFrame = [
  '................................',
  '................................',
  '...........oooooooo.............',
  '..........oIIiiidddo............',
  '..........ooooooooooooooooooo...',
  '...........oIiiiddoIIIiiiiddo...',
  '...........oIiiiddooooooooooo...',
  '...........oIiiiddoii...ii......',
  '...........oIiiiddoi.i.gyyg.....',
  '...........oIiiiddoi.i.oyyo.....',
  '...........oIiiiddoii.oiiiio....',
  '...........oIiiiddo..oiiiiiio...',
  '...........oIIIiddo..oiiiiiio...',
  '...........oIiiiddo..oiiiiiio...',
  '...........oIiiiddo..oyyiiyyo...',
  '...........oIiiiddo..oyyiiyyo...',
  '...........oIiiiddo.goiiiiiiog..',
  '...........oIiiiddo.goyyiiyyog..',
  '...........oIiiiddo..oyyiiyyo...',
  '...........oIiiiddo..oyyiiyyo...',
  '...........oIIIiddo..oiiiiiio...',
  '...........oIiiiddo..oiiiiiio...',
  '...........oIiiiddo...oiiiio....',
  '...........oIiiiddo....oiio.....',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIIIiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIIIiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '...........oIiiiddo.............',
  '..........oooooooooo............',
  '.........oKkkkkkkkkmo...........',
  '.........oKkkkkkkkkmo...........',
  '........oKkkkkkkkkkkmo..........',
  '........oKkkkkkkkkkkmo..........',
  '........oooooooooooooo..........',
]

/* ------------------------------------------------------------------ */
/* Sign                                                               */
/* ------------------------------------------------------------------ */

const SIGN_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  p: '#9a6b43', // post wood
  P: '#c89a6e', // post light
  q: '#6f4a2c', // post shade
  r: '#b07a4a', // board wood
  R: '#d9a86e', // board light
  Q: '#7a5230', // board shade
  n: '#e8d3a8', // nail
  x: '#5a3a22', // carved arrow
}

/** 32x32 signpost: beveled post, two boards, carved arrows and two nails. */
const SIGN: PixelFrame = [
  '................................',
  '................................',
  '...............oo...............',
  '..............oPPo..............',
  '.............oPPPPo.............',
  '.............oppppo.............',
  '...oooooooooooooooooooooooooo...',
  '...oRRRRRRRRRRRRRRRRRRRRRRRRo...',
  '...oRrrrrrrrrrrrxxxrrrrrrrrQo...',
  '...oRrrxxxxxxxxxxxxxrnrrrrrQo...',
  '...oRrrrrrrrrrrrxxxrrrrrrrrQo...',
  '...oQQQQQQQQQQQQQQQQQQQQQQQQo...',
  '...oooooooooooooooooooooooooo...',
  '.............oPppqo.............',
  '...oooooooooooooooooooooooooo...',
  '...oRRRRRRRRRRRRRRRRRRRRRRRRo...',
  '...oRrrrrrxxxrrrrrrrrrrrrrrQo...',
  '...oRrrrxxxxxxxxxxxxxnrrrrrQo...',
  '...oRrrrrrxxxrrrrrrrrrrrrrrQo...',
  '...oQQQQQQQQQQQQQQQQQQQQQQQQo...',
  '...oooooooooooooooooooooooooo...',
  '.............oPppqo.............',
  '.............oPppqo.............',
  '.............oPppqo.............',
  '.............oPppqo.............',
  '.............oPppqo.............',
  '.............oPppqo.............',
  '.............oPppqo.............',
  '.............oPppqo.............',
  '............oPppppqo............',
  '............oPppppqo............',
  '............oooooooo............',
]

/* ------------------------------------------------------------------ */
/* Bank                                                               */
/* ------------------------------------------------------------------ */

export const villageSprites: {
  lamp: PixelSprite
  sign: PixelSprite
} = {
  lamp: { palette: LAMP_PALETTE, frames: [LAMP_BRIGHT, LAMP_DIM], frameMs: 1000 },
  sign: { palette: SIGN_PALETTE, frames: [SIGN], frameMs: 1000 },
}
