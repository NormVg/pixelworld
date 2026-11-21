/**
 * Lone pine for the world tree bank: 32x48, three overlapping needle
 * tiers over a visible trunk, four sway frames.
 *
 * Frame 0 is authored by hand as a literal character grid: one string per
 * row, each character mapped through the palette below, '.' transparent.
 * The renderer anchors sprites at their base row, so the root flare and
 * ground shadow sit on the ground line.
 *
 * The three motion frames are derived from the calm frame by shearing the
 * canopy: every row above the trunk slides horizontally by an offset that
 * grows with its height, so the tree bends in the wind instead of skating
 * side to side. The trunk, root flare, and ground shadow never move, and
 * the dark droop rows keep their hanging tips attached because each tip
 * row's offset matches the tier edge above it.
 *
 * Light falls from the top left: glints and light needles cluster on the
 * left edge of each tier, shade piles into the right and into the dark
 * underside row that finishes every tier.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

const PINE_PALETTE: PixelPalette = {
  o: '#241f2b', // outline
  l: '#a8e6b8', // needle glint
  h: '#7fd39a', // light needle
  n: '#58b87c', // light-mid needle
  b: '#3f9e68', // mid needle
  d: '#2a7449', // shaded needle
  D: '#1d5735', // deep tier underside
  k: '#b07a48', // bark light
  t: '#8a5a34', // bark
  T: '#5f3d24', // bark shade
  r: '#6b4a2e', // root
  s: '#2c4a36', // ground shadow
}

/* ------------------------------------------------------------------ */
/* Calm frame: 48 rows of 32 characters                                */
/* ------------------------------------------------------------------ */

const PINE_CALM: PixelFrame = [
  '...............oo...............',
  '..............ohho..............',
  '.............ohlhno.............',
  '............ohlhnbho............',
  '............ohnbbdho............',
  '...........ohlhnbbdho...........',
  '...........ohnbbddbdo...........',
  '..........ohlhnbhhdbdo..........',
  '..........ohnbdbDdbbdo..........',
  '.........ohlhnbbhddbndo.........',
  '.........ohnbbdhDdbbbdo.........',
  '........oDdbddDbbDddDddo........',
  '........oD.ohlhnnbdho.Do........',
  '..........ohhnbdbhDddo..........',
  '.........ohhnbbdhDddnbo.........',
  '........ohlhnbbhDdbDdddo........',
  '........ohnbbdhbDdbbdddo........',
  '.......ohlhnbhhDdbbDddddo.......',
  '......ohlhnbbhhDdbbDdddddo......',
  '......ohnbbdhhbDddbbDddddo......',
  '.....ohlhnbhhbDdbbbDddddbdo.....',
  '....ohlhnbbhhDddbbDddbbddddo....',
  '....ohnbbdhhbDddDdbbDddddbdo....',
  '...oDdbddDbbDdbddbbDddddDdbdo...',
  '...oD.....ohlhnnbbddho.....Do...',
  '.........ohlhnbbdhDdnbo.........',
  '........ohlhnbbdhDdbDdbo........',
  '.......ohlhnbbdhDdbbDdddo.......',
  '......ohlhnbbdhhDdbbbDdddo......',
  '.....ohlhnbbdhbDdbbbDddddbo.....',
  '....ohlhnbbdhbDddbbbDddddbdo....',
  '...ohnbbdhhbDddDdbbDddddddbdo...',
  '..ohlhnbbdhhhbDddDdbbDddddbddo..',
  '..ohnbbdhhbbDddDdbbbDddddDbbdo..',
  '.ohlhnbbdhhhbDddDdbbbDddddDbbdo.',
  '.ohnbbdhhbbbDddDdbbbDdddddDbbdo.',
  '.oDdbddDbbDddbddbbDdddDdbDddDdo.',
  '.oDdbddDbbDddDdbbDdddDdbDdDdddo.',
  '.oD..........okttTo..........Do.',
  '.............oktTto.............',
  '.............okTtTo.............',
  '.............oktTTo.............',
  '.............okttTo.............',
  '.............okTtTo.............',
  '...........oktttrtTTo...........',
  '..........oktttrrttTTo..........',
  '......ssssssssssssssssssss......',
  '...ssssssssssssssssssssssssss...',
]

/* ------------------------------------------------------------------ */
/* Sway: shear the canopy, plant the trunk                            */
/* ------------------------------------------------------------------ */

const SPRITE_WIDTH = 32
const TRUNK_TOP_ROW = 38

/**
 * Copy of `base` with every canopy row slid horizontally. `lean` is how far
 * the topmost row moves, in whole pixels; rows nearer the trunk move less,
 * the trunk and shadow not at all.
 */
function swayFrame(base: PixelFrame, lean: number): PixelFrame {
  return base.map((row, y) => {
    if (y >= TRUNK_TOP_ROW) return row
    const shift = Math.round((lean * (TRUNK_TOP_ROW - y)) / TRUNK_TOP_ROW)
    if (shift === 0) return row
    if (shift > 0) return '.'.repeat(shift) + row.slice(0, SPRITE_WIDTH - shift)
    return row.slice(-shift) + '.'.repeat(-shift)
  })
}

export const pineSprite: PixelSprite = {
  palette: PINE_PALETTE,
  frames: [
    PINE_CALM,
    swayFrame(PINE_CALM, 2), // breeze nudges the crown right
    swayFrame(PINE_CALM, 3), // gust bends it further
    swayFrame(PINE_CALM, -2), // settle back through the left
  ],
  frameMs: 900,
}
