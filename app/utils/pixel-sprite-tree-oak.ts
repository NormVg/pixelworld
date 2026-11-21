/**
 * Standalone 32x48 oak sprite for Willow Hollow.
 *
 * Authored as literal character grids, one string per row, each character
 * mapped through the sprite's own palette; '.' is transparent. The
 * renderer anchors sprites at the base row, so the trunk flare and its
 * ground shadow sit on the terrain.
 *
 * The oak reads 3/4 like its siblings: light falls from the top left, so
 * the glints collect on the crown's upper left while the deep-underside
 * greens pile along the canopy's lower rim, clearly visible between the
 * leaves and the ground. Below that rim a single broad trunk flares into
 * a rooted base.
 *
 * Sway cycle: calm, a breeze leaning right, a gust that bends the crown
 * two pixels while the lower canopy lags behind it, then a breeze to the
 * left before settling. Every frame is a full grid, so animation needs no
 * runtime transform; `frameMs` is how long one frame is held.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/* ------------------------------------------------------------------ */
/* Palette                                                            */
/* ------------------------------------------------------------------ */

const OAK_PALETTE: PixelPalette = {
  o: '#241f2b', // outline
  b: '#4f9a4e', // mid leaf
  n: '#6fb85e', // light-mid leaf
  h: '#8fce74', // light catch
  l: '#b4e096', // sunlit glint
  d: '#357a3c', // shaded leaf
  D: '#245a2e', // deep underside
  t: '#7a5232', // trunk bark
  k: '#a06e42', // bark light
  T: '#553a22', // trunk shade
  s: '#2c4a36', // ground shadow
}

/* ------------------------------------------------------------------ */
/* Frames: 32x48, four sway steps                                     */
/* ------------------------------------------------------------------ */

const OAK_CALM: PixelFrame = [
  '................................',
  '...............oo...............',
  '..............ohnhno............',
  '.............ohhnbhnnho.........',
  '............ohlhnnbhnnbho.......',
  '...........ohbnhnnhlbnhbdo......',
  '..........ohnbbnnhhnnbbdndo.....',
  '.........ohnbnnbhhnnbbddbdo.....',
  '........ohbnhhnnnbbhhnnbbddo....',
  '.......ohlhnnbbnnnnbbnnbbddbdo..',
  '......ohbhnbbnnhlbbnnbbnnbbddo..',
  '.....ohnbnhnnbbnnhhnnbbnnbbddo..',
  '....ohbnhbbnnbbhhnnnbbnnbbhddo..',
  '...ohlhnnbbnnhhbbnnnbhnnbdbdddo.',
  '..ohbhnbbnnbbhnnbnnnnbbnnbbdddo.',
  '..ohnnnbbnnhhnnbbnnnnbbnnbbddDo.',
  '.ohbnhbbnnbbnnhhnnbbnnbbnnbdddo.',
  '.ohhnnbbnnhhnnbblhnnbbnnbbbdddo.',
  '.ohnbbnnbbnnbbhnnbnnhhnnbbdddDo.',
  '.ohbnhbbnnhlnnbhnnbbnnbbnbddDdo.',
  '.ohhnnbbnnbbhnnbbnnhnnbbnnbdddo.',
  '.ohbnhnnbbnnhhnnbbnnnnbbnbddDdo.',
  '.ohnbbnnbbbnnbbnnnnbbnnbbnDDddo.',
  '.ohnbnnbbdnnbnnbbnnbbnnbbnDDddo.',
  '.ohbbnnbddnnbbnnbbnnbbnnbnbDDdo.',
  '.odbbnnbddnnbbnnbbnnbbnnbdbDDdo.',
  '..odbbnnbddnnbbnnbbnnbbnnbdDDdo.',
  '..odDbbnnbddnnbbnnnnbbnnbbDDddo.',
  '...odDbbnnbddnnbbnnbbnnbbDDddo..',
  '...oDDbbnnbddDnnbbnnbbnnDDddDo..',
  '....oDDdbbnnbddnnbbnnbbDDddo....',
  '.....oDDddbbnnbddnnbbnDDdddo....',
  '......oDDddbnnbddnnbbDDdddo.....',
  '.......oDDddDdbnnbddDDdddo......',
  '........oDDddDdbbddDDddo........',
  '.........oDDddDDbbDDddDo........',
  '..........oDDddDDDDDDdo.........',
  '............oktkttkTo...........',
  '..........oktkttttkTTo..........',
  '..........okttttttkTTo..........',
  '.........okttttttttkTTo.........',
  '.........okttttttttkTTo.........',
  '........okttttttttttkTTo........',
  '.......okttkttttttttkTTo........',
  '.......okttttttttttkTTTo........',
  '......okttttttttttttkTTTTo......',
  '.....okttttttttttttkTTTTo.......',
  '...sssssssssssssssssssssssssss..',
]

/* ------------------------------------------------------------------ */
/* Breeze right: the whole canopy leans one pixel, trunk planted        */
/* ------------------------------------------------------------------ */

const OAK_BREEZE_RIGHT: PixelFrame = [
  '................................',
  '................oo..............',
  '...............ohnhno...........',
  '..............ohhnbhnnho........',
  '.............ohlhnnbhnnbho......',
  '............ohbnhnnhlbnhbdo.....',
  '...........ohnbbnnhhnnbbdndo....',
  '..........ohnbnnbhhnnbbddbdo....',
  '.........ohbnhhnnnbbhhnnbbddo...',
  '........ohlhnnbbnnnnbbnnbbddbdo.',
  '.......ohbhnbbnnhlbbnnbbnnbbddo.',
  '......ohnbnhnnbbnnhhnnbbnnbbddo.',
  '.....ohbnhbbnnbbhhnnnbbnnbbhddo.',
  '....ohlhnnbbnnhhbbnnnbhnnbdbdddo',
  '...ohbhnbbnnbbhnnbnnnnbbnnbbdddo',
  '...ohnnnbbnnhhnnbbnnnnbbnnbbddDo',
  '..ohbnhbbnnbbnnhhnnbbnnbbnnbdddo',
  '..ohhnnbbnnhhnnbblhnnbbnnbbbdddo',
  '..ohnbbnnbbnnbbhnnbnnhhnnbbdddDo',
  '..ohbnhbbnnhlnnbhnnbbnnbbnbddDdo',
  '..ohhnnbbnnbbhnnbbnnhnnbbnnbdddo',
  '..ohbnhnnbbnnhhnnbbnnnnbbnbddDdo',
  '..ohnbbnnbbbnnbbnnnnbbnnbbnDDddo',
  '..ohnbnnbbdnnbnnbbnnbbnnbbnDDddo',
  '..ohbbnnbddnnbbnnbbnnbbnnbnbDDdo',
  '..odbbnnbddnnbbnnbbnnbbnnbdbDDdo',
  '...odbbnnbddnnbbnnbbnnbbnnbdDDdo',
  '...odDbbnnbddnnbbnnnnbbnnbbDDddo',
  '....odDbbnnbddnnbbnnbbnnbbDDddo.',
  '....oDDbbnnbddDnnbbnnbbnnDDddDo.',
  '.....oDDdbbnnbddnnbbnnbbDDddo...',
  '......oDDddbbnnbddnnbbnDDdddo...',
  '.......oDDddbnnbddnnbbDDdddo....',
  '........oDDddDdbnnbddDDdddo.....',
  '.........oDDddDdbbddDDddo.......',
  '..........oDDddDDbbDDddDo.......',
  '...........oDDddDDDDDDdo........',
  '............oktkttkTo...........',
  '..........oktkttttkTTo..........',
  '..........okttttttkTTo..........',
  '.........okttttttttkTTo.........',
  '.........okttttttttkTTo.........',
  '........okttttttttttkTTo........',
  '.......okttkttttttttkTTo........',
  '.......okttttttttttkTTTo........',
  '......okttttttttttttkTTTTo......',
  '.....okttttttttttttkTTTTo.......',
  '...sssssssssssssssssssssssssss..',
]

/* ------------------------------------------------------------------ */
/* Gust: the crown bends hardest, the lower canopy lags                 */
/* ------------------------------------------------------------------ */

const OAK_GUST: PixelFrame = [
  '................................',
  '.................oo.............',
  '................ohnhno..........',
  '...............ohhnbhnnho.......',
  '..............ohlhnnbhnnbho.....',
  '.............ohbnhnnhlbnhbdo....',
  '............ohnbbnnhhnnbbdndo...',
  '...........ohnbnnbhhnnbbddbdo...',
  '..........ohbnhhnnnbbhhnnbbddo..',
  '.........ohlhnnbbnnnnbbnnbbddbdo',
  '........ohbhnbbnnhlbbnnbbnnbbddo',
  '.......ohnbnhnnbbnnhhnnbbnnbbddo',
  '......ohbnhbbnnbbhhnnnbbnnbbhddo',
  '....ohlhnnbbnnhhbbnnnbhnnbdbdddo',
  '...ohbhnbbnnbbhnnbnnnnbbnnbbdddo',
  '...ohnnnbbnnhhnnbbnnnnbbnnbbddDo',
  '..ohbnhbbnnbbnnhhnnbbnnbbnnbdddo',
  '..ohhnnbbnnhhnnbblhnnbbnnbbbdddo',
  '..ohnbbnnbbnnbbhnnbnnhhnnbbdddDo',
  '..ohbnhbbnnhlnnbhnnbbnnbbnbddDdo',
  '..ohhnnbbnnbbhnnbbnnhnnbbnnbdddo',
  '..ohbnhnnbbnnhhnnbbnnnnbbnbddDdo',
  '..ohnbbnnbbbnnbbnnnnbbnnbbnDDddo',
  '..ohnbnnbbdnnbnnbbnnbbnnbbnDDddo',
  '..ohbbnnbddnnbbnnbbnnbbnnbnbDDdo',
  '.odbbnnbddnnbbnnbbnnbbnnbdbDDdo.',
  '..odbbnnbddnnbbnnbbnnbbnnbdDDdo.',
  '..odDbbnnbddnnbbnnnnbbnnbbDDddo.',
  '...odDbbnnbddnnbbnnbbnnbbDDddo..',
  '...oDDbbnnbddDnnbbnnbbnnDDddDo..',
  '....oDDdbbnnbddnnbbnnbbDDddo....',
  '.....oDDddbbnnbddnnbbnDDdddo....',
  '......oDDddbnnbddnnbbDDdddo.....',
  '.......oDDddDdbnnbddDDdddo......',
  '........oDDddDdbbddDDddo........',
  '.........oDDddDDbbDDddDo........',
  '..........oDDddDDDDDDdo.........',
  '............oktkttkTo...........',
  '..........oktkttttkTTo..........',
  '..........okttttttkTTo..........',
  '.........okttttttttkTTo.........',
  '.........okttttttttkTTo.........',
  '........okttttttttttkTTo........',
  '.......okttkttttttttkTTo........',
  '.......okttttttttttkTTTo........',
  '......okttttttttttttkTTTTo......',
  '.....okttttttttttttkTTTTo.......',
  '...sssssssssssssssssssssssssss..',
]

/* ------------------------------------------------------------------ */
/* Breeze left: the canopy leans back, trunk planted                  */
/* ------------------------------------------------------------------ */

const OAK_BREEZE_LEFT: PixelFrame = [
  '................................',
  '..............oo................',
  '.............ohnhno.............',
  '............ohhnbhnnho..........',
  '...........ohlhnnbhnnbho........',
  '..........ohbnhnnhlbnhbdo.......',
  '.........ohnbbnnhhnnbbdndo......',
  '........ohnbnnbhhnnbbddbdo......',
  '.......ohbnhhnnnbbhhnnbbddo.....',
  '......ohlhnnbbnnnnbbnnbbddbdo...',
  '.....ohbhnbbnnhlbbnnbbnnbbddo...',
  '....ohnbnhnnbbnnhhnnbbnnbbddo...',
  '...ohbnhbbnnbbhhnnnbbnnbbhddo...',
  '..ohlhnnbbnnhhbbnnnbhnnbdbdddo..',
  '.ohbhnbbnnbbhnnbnnnnbbnnbbdddo..',
  '.ohnnnbbnnhhnnbbnnnnbbnnbbddDo..',
  'ohbnhbbnnbbnnhhnnbbnnbbnnbdddo..',
  'ohhnnbbnnhhnnbblhnnbbnnbbbdddo..',
  'ohnbbnnbbnnbbhnnbnnhhnnbbdddDo..',
  'ohbnhbbnnhlnnbhnnbbnnbbnbddDdo..',
  'ohhnnbbnnbbhnnbbnnhnnbbnnbdddo..',
  'ohbnhnnbbnnhhnnbbnnnnbbnbddDdo..',
  'ohnbbnnbbbnnbbnnnnbbnnbbnDDddo..',
  'ohnbnnbbdnnbnnbbnnbbnnbbnDDddo..',
  'ohbbnnbddnnbbnnbbnnbbnnbnbDDdo..',
  'odbbnnbddnnbbnnbbnnbbnnbdbDDdo..',
  '.odbbnnbddnnbbnnbbnnbbnnbdDDdo..',
  '.odDbbnnbddnnbbnnnnbbnnbbDDddo..',
  '..odDbbnnbddnnbbnnbbnnbbDDddo...',
  '..oDDbbnnbddDnnbbnnbbnnDDddDo...',
  '...oDDdbbnnbddnnbbnnbbDDddo.....',
  '....oDDddbbnnbddnnbbnDDdddo.....',
  '.....oDDddbnnbddnnbbDDdddo......',
  '......oDDddDdbnnbddDDdddo.......',
  '.......oDDddDdbbddDDddo.........',
  '........oDDddDDbbDDddDo.........',
  '.........oDDddDDDDDDdo..........',
  '............oktkttkTo...........',
  '..........oktkttttkTTo..........',
  '..........okttttttkTTo..........',
  '.........okttttttttkTTo.........',
  '.........okttttttttkTTo.........',
  '........okttttttttttkTTo........',
  '.......okttkttttttttkTTo........',
  '.......okttttttttttkTTTo........',
  '......okttttttttttttkTTTTo......',
  '.....okttttttttttttkTTTTo.......',
  '...sssssssssssssssssssssssssss..',
]

/* ------------------------------------------------------------------ */
/* Sprite                                                             */
/* ------------------------------------------------------------------ */

export const oakSprite: PixelSprite = {
  palette: OAK_PALETTE,
  frames: [OAK_CALM, OAK_BREEZE_RIGHT, OAK_GUST, OAK_BREEZE_LEFT],
  frameMs: 1050,
}
