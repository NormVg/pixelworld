/**
 * High-resolution bush sprite for Willow Hollow, tree-family scale.
 *
 * Authored as literal character grids like the rest of the tree bank: one
 * string per row, each character mapped through the sprite's own palette,
 * '.' transparent, 1px plum outline around the silhouette. The renderer
 * anchors the sprite at its base row, so the shadow rows sit on the ground.
 *
 * The bush reads for the same 3/4 light as its neighbours: glints catch the
 * top-left crown, mid greens roll through the belly, and shade pools into a
 * deep skirt at the bottom right. Six berries are tucked into the leaf
 * clusters, each drawn as a red pixel with a pale highlight above-left and a
 * darker shade below-right. Below the skirt a short woody stem flares at the
 * ground, with grass tufts and a flat shadow band grounding the whole plant.
 *
 * Four sway frames: calm, crown leaning right, a stronger gust, then a
 * settle back to the left. Only the foliage shear; the stem, tufts, and
 * shadow stay planted. `frameMs` is offset from the neighbouring sprites so
 * nothing in the world moves in lockstep.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

const BUSH_PALETTE: PixelPalette = {
  o: '#241f2b', // outline
  b: '#45b173', // mid leaf
  n: '#63c98a', // light-mid leaf
  h: '#86df9f', // light catch
  l: '#b0f0c0', // glint
  d: '#2e8553', // shaded leaf
  D: '#1f5e3a', // deep underside
  r: '#e05a5a', // berry
  R: '#b03a3a', // berry shade
  y: '#ffb0a0', // berry highlight
  t: '#8a5a34', // stem bark
  k: '#b07a48', // bark light
  T: '#5f3d24', // stem shade
  g: '#79cf9d', // grass tuft
  s: '#2c4a36', // ground shadow
}

/* ------------------------------------------------------------------ */
/* Bush: 32x32, four sway frames                                       */
/* ------------------------------------------------------------------ */

const BUSH_SWAY_CALM: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '................................',
  '.............ooooo..............',
  '...........oolllnboo............',
  '..........onllylbbllo...........',
  '.........onnlllrbbllhoo.........',
  '.......oolnnhhhhRdddbbnoo.......',
  '......ohllbbhnhhddddbbnnho......',
  '.....onnllnnnnbbnnnndyhhddo.....',
  '....olbbllnbnnbbbbnnddrhddDo....',
  '...ollllyhbbnnhhhhdDbbdRddDDo...',
  '...ollllhrbbnbhhnnDDbbdDddDDo...',
  '..olllhhnnRbbbhhllbbhhnbydnnno..',
  '..olllhnnbbbbbhhhhbbhhbbdrnnbo..',
  '..ohbrbbhhhhbbnnddDDDDddbbbbno..',
  '..ohbbRbhhhhbbnndDDyDDddbbbbno..',
  '...onbhhdDhhhnnnbbbbrnDDddnbo...',
  '...obbnnDDhhnnnnddbbnRDDddbbo...',
  '....ohdDhhhnDDDDddnnDDDDddDo....',
  '.....oDDbbbbDDDDddbbDDDDdDo.....',
  '......obbbDDbdDDDDddDDdDbo......',
  '.......obbDDddDDDDddDDDDo.......',
  '........odddddDDDDddddDo........',
  '.........oddddDDDDdddDo.........',
  '........g.oooodddDdooo.g........',
  '.......g......oktTo.....g.......',
  '........g....okttTTo............',
  '.....ssssssssssssssssssssss.....',
  '....ssssssssssssssssssssssss....',
  '......ssssssssssssssssssss......',
]

const BUSH_SWAY_RIGHT: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '................................',
  '..............ooooo.............',
  '............oolllnboo...........',
  '...........onllylbbllo..........',
  '..........onnlllrbbllhoo........',
  '........oolnnhhhhRdddbbnoo......',
  '.......ohllbbhnhhddddbbnnho.....',
  '......onnllnnnnbbnnnndyhhddo....',
  '.....olbbllnbnnbbbbnnddrhddDo...',
  '....ollllyhbbnnhhhhdDbbdRddDDo..',
  '....ollllhrbbnbhhnnDDbbdDddDDo..',
  '..oollhhnnRbbbhhllbbhhnbydnnno..',
  '..olllhnnbbbbbhhhhbbhhbbdrnnbo..',
  '..ohbrbbhhhhbbnnddDDDDddbbbbno..',
  '..ohbbRbhhhhbbnndDDyDDddbbbbno..',
  '...onbhhdDhhhnnnbbbbrnDDddnbo...',
  '...obbnnDDhhnnnnddbbnRDDddbbo...',
  '....ohdDhhhnDDDDddnnDDDDddDo....',
  '.....oDDbbbbDDDDddbbDDDDdDo.....',
  '......obbbDDbdDDDDddDDdDbo......',
  '.......obbDDddDDDDddDDDDo.......',
  '........odddddDDDDddddDo........',
  '.........oddddDDDDdddDo.........',
  '........g.oooodddDdooo.g........',
  '.......g......oktTo.....g.......',
  '........g....okttTTo............',
  '.....ssssssssssssssssssssss.....',
  '....ssssssssssssssssssssssss....',
  '......ssssssssssssssssssss......',
]

const BUSH_SWAY_GUST: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '................................',
  '...............ooooo............',
  '.............oolllnboo..........',
  '............onllylbbllo.........',
  '...........onnlllrbbllhoo.......',
  '.........oolnnhhhhRdddbbnoo.....',
  '.......oollbbhnhhddddbbnnho.....',
  '......onnllnnnnbbnnnndyhhddo....',
  '.....olbbllnbnnbbbbnnddrhddDo...',
  '....ollllyhbbnnhhhhdDbbdRddDDo..',
  '....ollllhrbbnbhhnnDDbbdDddDDo..',
  '...olllhhnnRbbbhhllbbhhnbydnnno.',
  '...olllhnnbbbbbhhhhbbhhbbdrnnbo.',
  '..ohbrbbhhhhbbnnddDDDDddbbbbno..',
  '..ohbbRbhhhhbbnndDDyDDddbbbbno..',
  '...onbhhdDhhhnnnbbbbrnDDddnbo...',
  '...obbnnDDhhnnnnddbbnRDDddbbo...',
  '....ohdDhhhnDDDDddnnDDDDddDo....',
  '.....oDDbbbbDDDDddbbDDDDdDo.....',
  '......obbbDDbdDDDDddDDdDbo......',
  '.......obbDDddDDDDddDDDDo.......',
  '........odddddDDDDddddDo........',
  '.........oddddDDDDdddDo.........',
  '........g.oooodddDdooo.g........',
  '.......g......oktTo.....g.......',
  '........g....okttTTo............',
  '.....ssssssssssssssssssssss.....',
  '....ssssssssssssssssssssssss....',
  '......ssssssssssssssssssss......',
]

const BUSH_SWAY_LEFT: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '................................',
  '............ooooo...............',
  '..........oolllnboo.............',
  '.........onllylbbllo............',
  '........onnlllrbbllhoo..........',
  '......oolnnhhhhRdddbbnoo........',
  '.....ohllbbhnhhddddbbnnho.......',
  '....onnllnnnnbbnnnndyhhddo......',
  '...olbbllnbnnbbbbnnddrhddDo.....',
  '..ollllyhbbnnhhhhdDbbdRddDDo....',
  '..ollllhrbbnbhhnnDDbbdDddDDo....',
  '..olllhhnnRbbbhhllbbhhnbydnnoo..',
  '..olllhnnbbbbbhhhhbbhhbbdrnnbo..',
  '..ohbrbbhhhhbbnnddDDDDddbbbbno..',
  '..ohbbRbhhhhbbnndDDyDDddbbbbno..',
  '...onbhhdDhhhnnnbbbbrnDDddnbo...',
  '...obbnnDDhhnnnnddbbnRDDddbbo...',
  '....ohdDhhhnDDDDddnnDDDDddDo....',
  '.....oDDbbbbDDDDddbbDDDDdDo.....',
  '......obbbDDbdDDDDddDDdDbo......',
  '.......obbDDddDDDDddDDDDo.......',
  '........odddddDDDDddddDo........',
  '.........oddddDDDDdddDo.........',
  '........g.oooodddDdooo.g........',
  '.......g......oktTo.....g.......',
  '........g....okttTTo............',
  '.....ssssssssssssssssssssss.....',
  '....ssssssssssssssssssssssss....',
  '......ssssssssssssssssssss......',
]

/* ------------------------------------------------------------------ */
/* Bank                                                                */
/* ------------------------------------------------------------------ */

export const bushSprite: PixelSprite = {
  palette: BUSH_PALETTE,
  frames: [BUSH_SWAY_CALM, BUSH_SWAY_RIGHT, BUSH_SWAY_GUST, BUSH_SWAY_LEFT],
  frameMs: 850,
}
