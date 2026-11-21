/**
 * Standalone boulder sprite for the 2.5D world of Willow Hollow.
 *
 * Conventions:
 * - Every frame is a 32x32 grid: 32 rows of exactly 32 characters.
 * - Each character maps to a color in `ROCK_PALETTE`; '.' is transparent.
 * - The renderer anchors the sprite at its base row and centers it over its
 *   footprint, so the last row of contact shadow is what sits on the ground.
 * - Light falls from the top left: glints (`h`) crown the top face, the
 *   sunlit facet (`r`) wraps the upper left, the front facet (`R`) carries
 *   the middle, and shade (`d`/`D`) piles into the bottom right.
 * - The boulder reads as three-dimensional: a mossy top plateau, a broken
 *   front facet split by two wandering cracks (`k`), and side facets that
 *   pinch toward a dark, rubble-toothed base. Grass tufts (`g`) hug the
 *   contact line and the ground shadow (`s`) spreads beneath it.
 * - The three frames are a settle loop: rest, a subtle squash where the
 *   whole mass drops one row and the flanks bulge a pixel, then a rebound
 *   where the moss creeps one pixel and a crack deepens. `frameMs` is slow
 *   so the boulder feels rooted, not restless.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

const ROCK_PALETTE: PixelPalette = {
  o: '#241f2b', // outline
  h: '#d8d4e4', // facet glint
  r: '#b8b2c4', // sunlit facet
  R: '#8e879c', // front facet
  d: '#6a6478', // shaded facet
  D: '#4a4558', // deep facet
  k: '#3a3546', // crack
  m: '#6fae62', // moss
  M: '#4c8a48', // moss shade
  g: '#79cf9d', // grass tuft
  s: '#2c4a36', // ground shadow
}

/* ------------------------------------------------------------------ */
/* Frame 1: rest                                                       */
/* ------------------------------------------------------------------ */

const ROCK_SETTLE_REST: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '..............ohho..............',
  '............ohhrrrRo............',
  '..........ohhrrmmmrrRo..........',
  '........ohhrrmmmrrrrrRRo........',
  '.......ohhrrmmmmrrrrrRRdo.......',
  '......ohhrrrmmmrrrrrrrRdDo......',
  '......ohhrrrrmmmrrrrrrRddDo.....',
  '.....ohrrrrrmmmrrrrrrRdddDDo....',
  '.....ohrrrrrrmmrrrrrRRddDDDo....',
  '....oRrrrrrkrrrrRRRrkdddDDDo....',
  '....oRRrrrrkrrrrRRRrkddddDDDo...',
  '...ohRrrrrrkrrrRRRrkkrrdddDDo...',
  '...ohRrrrrrrkrrrRRRrkkrrdddDo...',
  '...omMrrrrrkrrrRRrrkkrrrddddo...',
  '...omMmrrrrkrrrrRRrkkrrrddddo...',
  '...omMrrrrrkrrrrRRrkkrrddddDo...',
  '...oMrrrrrrkrrrrRRrrkkrrddddo...',
  '...oMrrrrrrkrrrRRRrkkrrrddddo...',
  '...oRrrrrrrkkrrrRRrrkrrrddddo...',
  '....oRRrrrrkkrrrRRrrkrrrdddo....',
  '....oRrrrrrkkrrrRRrrkrrrdddo....',
  '.....oRrrrkkrrrRRrkrrddddddo....',
  '.....oRrrrkkrrrRrkrrrdddddo.....',
  '......oRrrkkrrrRrkrrrddddo......',
  '.......okDDkdDDdkDDkdDDdo.......',
  '.......oDDkkDDDDkkDDDDkko.......',
  '....g.ssssssssssssssssssss.g....',
  '..g.ssssssssssssssssssssssss.g..',
  '.....ssssssssssssssssssssss.....',
]

/* ------------------------------------------------------------------ */
/* Frame 2: settle squash                                              */
/*                                                                     */
/* The mass drops one row and the widest flank rows bulge a single     */
/* pixel on each side, the way heavy stone presses outward as it       */
/* settles. The contact shadow widens to meet it.                      */
/* ------------------------------------------------------------------ */

const ROCK_SETTLE_SQUASH: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '................................',
  '..............ohho..............',
  '............ohhrrrRo............',
  '..........ohhrrmmmrrRo..........',
  '........ohhrrmmmrrrrrRRo........',
  '.......ohhrrmmmmrrrrrRRdo.......',
  '......ohhrrrmmmrrrrrrrRdDo......',
  '......ohhrrrrmmmrrrrrrRddDo.....',
  '.....ohrrrrrmmmrrrrrrRdddDDo....',
  '.....ohrrrrrrmmrrrrrRRddDDDo....',
  '....oRrrrrrkrrrrRRRrkdddDDDo....',
  '....oRRrrrrkrrrrRRRrkddddDDDo...',
  '..orhRrrrrrkrrrRRRrkkrrdddDDDo..',
  '..ormMrrrrrkrrrRRrrkkrrrddddDo..',
  '..ormMmrrrrkrrrrRRrkkrrrddddDo..',
  '..ormMrrrrrkrrrrRRrkkrrddddDDo..',
  '..orMrrrrrrkrrrrRRrrkkrrddddDo..',
  '..orMrrrrrrkrrrRRRrkkrrrddddDo..',
  '..orRrrrrrrkkrrrRRrrkrrrddddDo..',
  '..orRrrrrrkkrrrRRrrkrrrddddDo...',
  '....oRRrrrrkkrrrRRrrkrrrdddo....',
  '....oRrrrrrkkrrrRRrrkrrrdddo....',
  '.....oRrrrkkrrrRRrkrrddddddo....',
  '.....oRrrrkkrrrRrkrrrdddddo.....',
  '......oRrrkkrrrRrkrrrddddo......',
  '.......okDDkdDDdkDDkdDDdo.......',
  '.......oDDkkDDDDkkDDDDkko.......',
  '.g.ssssssssssssssssssssssssss.g.',
  '...ssssssssssssssssssssssssss...',
]

/* ------------------------------------------------------------------ */
/* Frame 3: settle rebound                                             */
/*                                                                     */
/* The boulder rises back to its rest pose. The changes are minimal: a  */
/* third glint pixel catches the top face, the moss creeps one pixel    */
/* wider, and the lower crack deepens by one.                           */
/* ------------------------------------------------------------------ */

const ROCK_SETTLE_REBOUND: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '..............ohho..............',
  '............ohhhrrRo............',
  '..........ohhrrmmmrrRo..........',
  '........ohhrrmmmrrrrrRRo........',
  '.......ohhrrmmmmrrrrrRRdo.......',
  '......ohhrrrmmmrrrrrrrRdDo......',
  '......ohhrrrrmmmrrrrrrRddDo.....',
  '.....ohrrrrrmmmrrrrrrRdddDDo....',
  '.....ohrrrrrrmmrrrrrRRddDDDo....',
  '....oRrrrrrkrrrrRRRrkdddDDDo....',
  '....oRRrrrrkrrrrRRRrkddddDDDo...',
  '...ohRrrrrrkrrrRRRrkkrrdddDDo...',
  '...ohRrrrrrrkrrrRRRrkkrrdddDo...',
  '...omMmrrrrkrrrRRrrkkrrrddddo...',
  '...omMmrrrrkrrrrRRrkkrrrddddo...',
  '...omMrrrrrkrrrrRRrkkrrddddDo...',
  '...oMrrrrrrkrrrrRRrrkkrrddddo...',
  '...oMrrrrrrkkrrRRRrkkrrrddddo...',
  '...oRrrrrrrkkrrrRRrrkrrrddddo...',
  '....oRRrrrrkkrrrRRrrkrrrdddo....',
  '....oRrrrrrkkrrrRRrrkrrrdddo....',
  '.....oRrrrkkrrrRRrkrrddddddo....',
  '.....oRrrrkkrrrRrkrrrdddddo.....',
  '......oRrrkkrrrRrkrrrddddo......',
  '.......okDDkdDDdkDDkdDDdo.......',
  '.......oDDkkDDDDkkDDDDkko.......',
  '....g.ssssssssssssssssssss.g....',
  '..g.ssssssssssssssssssssssss.g..',
  '.....ssssssssssssssssssssss.....',
]

/* ------------------------------------------------------------------ */
/* Bank                                                                */
/* ------------------------------------------------------------------ */

export const rockSprite: PixelSprite = {
  palette: ROCK_PALETTE,
  frames: [ROCK_SETTLE_REST, ROCK_SETTLE_SQUASH, ROCK_SETTLE_REBOUND],
  frameMs: 900,
}
