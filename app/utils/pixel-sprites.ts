/**
 * Hand-authored pixel-sprite data for the GBA-era world of Willow Hollow.
 *
 * Conventions (for the renderer):
 * - Tiles are 16x16 grids: each frame is 16 rows of 16 characters.
 *   Upright props may be taller (pine 16x24, lamp 16x26, cottage 32x32,
 *   player 16x20); the renderer anchors every sprite at its base row.
 * - Each character maps to a color in that sprite's own palette; '.' is
 *   transparent.
 * - The whole bank shares one near-black plum outline (#2a2431) drawn as a
 *   hard 1px line around every silhouette, GBA style: crisp outlines, light
 *   catching the top and left edges, shade piling into the bottom right.
 * - `frameMs` is how long one frame is held before advancing. Tempos are
 *   deliberately different per sprite so nothing moves in lockstep.
 * - The player `side` sprite faces LEFT; mirror it horizontally for right.
 * - Water edge overlays (waterEdgeN/W/E/S) are 16x16 frames that are mostly
 *   transparent; the renderer composes them over a base water tile when the
 *   neighboring tile is land, which gives the pond its darker shoreline.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/** The one outline color every silhouette in the bank shares. */
const OUT = '#2a2431'

/* ------------------------------------------------------------------ */
/* Player                                                              */
/* ------------------------------------------------------------------ */

const PLAYER_PALETTE: PixelPalette = {
  o: OUT,
  h: '#7a4a2a', // chestnut hair
  H: '#9a6238', // hair highlight
  s: '#f5cfa0', // skin
  e: '#3a2a24', // eye
  m: '#e8b04b', // mustard scarf
  t: '#d85846', // terracotta tunic
  T: '#b03e30', // tunic shade
  p: '#4a5a8c', // muted indigo pants
  b: '#7a4e2e', // leather boots
  B: '#5a3a22', // boot soles
}

/* Facing the camera. Gait: stand, left step, stand, right step. */
const PLAYER_DOWN_REST: PixelFrame = [
  '................',
  '.....oooooo.....',
  '....ohHHHHho....',
  '...ohHHHHHHho...',
  '...ohhhhhhhho...',
  '...ohssssssho...',
  '...ohsessesho...',
  '...ohssssssho...',
  '....osssssso....',
  '....ommmmmmo....',
  '...ottmmmmTto...',
  '...ostmmmmTso...',
  '...ottmmmmTto...',
  '...ottttttTto...',
  '....otttttTo....',
  '....oppppppo....',
  '....oppppppo....',
  '....opp..ppo....',
  '....obb..bbo....',
  '....oBB..BBo....',
]

const PLAYER_DOWN_STEP_ONE: PixelFrame = [
  '................',
  '.....oooooo.....',
  '....ohHHHHho....',
  '...ohHHHHHHho...',
  '...ohhhhhhhho...',
  '...ohssssssho...',
  '...ohsessesho...',
  '...ohssssssho...',
  '....osssssso....',
  '....ommmmmmo....',
  '...ottmmmmTto...',
  '...ostmmmmTso...',
  '...ottmmmmTto...',
  '...ottttttTto...',
  '....otttttTo....',
  '....oppppppo....',
  '....oppppppo....',
  '....obb..ppo....',
  '........obbo....',
  '........oBBo....',
]

const PLAYER_DOWN_STEP_TWO: PixelFrame = [
  '................',
  '.....oooooo.....',
  '....ohHHHHho....',
  '...ohHHHHHHho...',
  '...ohhhhhhhho...',
  '...ohssssssho...',
  '...ohsessesho...',
  '...ohssssssho...',
  '....osssssso....',
  '....ommmmmmo....',
  '...ottmmmmTto...',
  '...ostmmmmTso...',
  '...ottmmmmTto...',
  '...ottttttTto...',
  '....otttttTo....',
  '....oppppppo....',
  '....oppppppo....',
  '....opp..bbo....',
  '....obbo........',
  '....oBBo........',
]

/* Seen from behind: all hair, scarf knot, sleeve seams, same gait. */
const PLAYER_UP_REST: PixelFrame = [
  '................',
  '.....oooooo.....',
  '....ohHHHHho....',
  '...ohHHHHHHho...',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...ohhHHhhhho...',
  '...ohhhhhhhho...',
  '....osssssso....',
  '....ommmmmmo....',
  '...ottmmmmTto...',
  '...oTtmmmmTTo...',
  '...ottmmmmTto...',
  '...ottttttTto...',
  '....otttttTo....',
  '....oppppppo....',
  '....oppppppo....',
  '....opp..ppo....',
  '....obb..bbo....',
  '....oBB..BBo....',
]

const PLAYER_UP_STEP_ONE: PixelFrame = [
  '................',
  '.....oooooo.....',
  '....ohHHHHho....',
  '...ohHHHHHHho...',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...ohhHHhhhho...',
  '...ohhhhhhhho...',
  '....osssssso....',
  '....ommmmmmo....',
  '...ottmmmmTto...',
  '...oTtmmmmTTo...',
  '...ottmmmmTto...',
  '...ottttttTto...',
  '....otttttTo....',
  '....oppppppo....',
  '....oppppppo....',
  '....obb..ppo....',
  '........obbo....',
  '........oBBo....',
]

const PLAYER_UP_STEP_TWO: PixelFrame = [
  '................',
  '.....oooooo.....',
  '....ohHHHHho....',
  '...ohHHHHHHho...',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...ohhHHhhhho...',
  '...ohhhhhhhho...',
  '....osssssso....',
  '....ommmmmmo....',
  '...ottmmmmTto...',
  '...oTtmmmmTTo...',
  '...ottmmmmTto...',
  '...ottttttTto...',
  '....otttttTo....',
  '....oppppppo....',
  '....oppppppo....',
  '....opp..bbo....',
  '....obbo........',
  '....oBBo........',
]

/* Profile, facing LEFT (mirror for right). Stride and passing step. */
const PLAYER_SIDE_REST: PixelFrame = [
  '................',
  '.....oooooo.....',
  '....ohHHHHho....',
  '...ohHHHHHHho...',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...osssshhhho...',
  '...osesshhhho...',
  '....osshhhho....',
  '....ommmmmmo....',
  '...otmmmmmmto...',
  '...ostmmmmTto...',
  '...ottmmmmTto...',
  '...ottttttTto...',
  '....otttttTo....',
  '....oppppppo....',
  '....oppppppo....',
  '.....opppo......',
  '.....obbbo......',
  '.....oBBBo......',
]

const PLAYER_SIDE_STEP_ONE: PixelFrame = [
  '................',
  '.....oooooo.....',
  '....ohHHHHho....',
  '...ohHHHHHHho...',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...osssshhhho...',
  '...osesshhhho...',
  '....osshhhho....',
  '....ommmmmmo....',
  '...otmmmmmmto...',
  '...ostmmmmTto...',
  '...ottmmmmTto...',
  '...ottttttTto...',
  '....otttttTo....',
  '....oppppppo....',
  '....oppppppo....',
  '...oppo..oppo...',
  '...obbo..obbo...',
  '...oBBo..oBBo...',
]

const PLAYER_SIDE_STEP_TWO: PixelFrame = [
  '................',
  '.....oooooo.....',
  '....ohHHHHho....',
  '...ohHHHHHHho...',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...osssshhhho...',
  '...osesshhhho...',
  '....osshhhho....',
  '....ommmmmmo....',
  '...otmmmmmmto...',
  '...ostmmmmTto...',
  '...ottmmmmTto...',
  '...ottttttTto...',
  '....otttttTo....',
  '....oppppppo....',
  '....oppppppo....',
  '......oppo......',
  '......obbo......',
  '......oBBo......',
]

export const legacyPlayerSprites: {
  down: PixelSprite
  up: PixelSprite
  side: PixelSprite
} = {
  down: {
    palette: PLAYER_PALETTE,
    frames: [PLAYER_DOWN_REST, PLAYER_DOWN_STEP_ONE, PLAYER_DOWN_REST, PLAYER_DOWN_STEP_TWO],
    frameMs: 130,
  },
  up: {
    palette: PLAYER_PALETTE,
    frames: [PLAYER_UP_REST, PLAYER_UP_STEP_ONE, PLAYER_UP_REST, PLAYER_UP_STEP_TWO],
    frameMs: 130,
  },
  side: {
    palette: PLAYER_PALETTE,
    frames: [PLAYER_SIDE_REST, PLAYER_SIDE_STEP_ONE, PLAYER_SIDE_REST, PLAYER_SIDE_STEP_TWO],
    frameMs: 130,
  },
}

/* ------------------------------------------------------------------ */
/* Terrain                                                             */
/* ------------------------------------------------------------------ */

const GRASS_PALETTE: PixelPalette = {
  g: '#79cf9d', // saturated mint base
  G: '#4fae7c', // darker blade speckles
  l: '#a9e9bd', // light blade speckles
  n: '#5fbf8a', // faint 16px grid line, one shade down
}

/* Mint lawn with fine speckles and a faint grid on the bottom and right
 * edges, so the whole meadow reads as a mowed GBA lattice. */
const GRASS: PixelFrame = [
  'gggggGggglgggggn',
  'gGgggggggggGgggn',
  'gggggglggggggggn',
  'gggggggggGgggggn',
  'glgggGgggggggggn',
  'ggggggggggglgggn',
  'gggGgggggggggggn',
  'ggggggglgggGgggn',
  'gggggggggggggggn',
  'gGgggggGggggglgn',
  'gggggggggggggggn',
  'glgggggggGgggggn',
  'ggggGgggggggGggn',
  'ggggggglgggggggn',
  'ggGgggggggggggln',
  'nnnnnnnnnnnnnnnn',
]

const PATH_PALETTE: PixelPalette = {
  e: '#d9b678', // tan base
  E: '#bd9455', // darker tan patches
  d: '#a3793f', // pebbles
  L: '#eed7a0', // light grit
}

/* Trodden dirt with hand-scattered pebbles and grit. */
const PATH: PixelFrame = [
  'eeLeeeeeeeeeeeee',
  'eeeeeeeeeeEeeeee',
  'eeEeeeeeeeeeeeee',
  'eeeddeeeeeeeddee',
  'eeeeEEeeeeeeeeee',
  'eeeeeeeeeLeeeeee',
  'eEeeeeeeeeeeeeee',
  'eeeeeeeeeeeeEeee',
  'eeeeeeeeeeeeeEee',
  'eeeeeeEeeeeeLeee',
  'eeeLEeeeeeeeEeee',
  'eeeeeeeeddeeeeeE',
  'eeEeeeeeeeeLeeee',
  'eeeeeeeeeEeeeeee',
  'eeeeeeeeeeeeLeee',
  'eEeeeeeeeddeeeee',
]

const SAND_PALETTE: PixelPalette = {
  a: '#ecd9a0', // pale sand base
  A: '#d9bf7d', // sand shade
  h: '#f7ebb9', // light grains
}

const SAND: PixelFrame = [
  'aaaaaaaaaaaaaaaa',
  'aaaAaaaaaaaaaaaa',
  'aaaaaaaaaaAaaaaa',
  'aaahaaaaaaaaaaaa',
  'aaaaaaaaaaaaahaa',
  'aaaaAaaaaaaaaaaa',
  'aaaaaaaaaaAaaaaa',
  'aaaaaaaaaaaaaaaa',
  'aaAaaaaaaaaaaaaa',
  'aaaaaaaaaahaaaaa',
  'aaaaaaaaAaaaaaaa',
  'ahaaaaaaaaaaaaaa',
  'aaaaaaaaaaaAaaaa',
  'aaaaaaaaaaaaaaAh',
  'aaAaaaaaaaaaaaaa',
  'aaaaaaaaahaaaaaa',
]

const WATER_PALETTE: PixelPalette = {
  w: '#3a6fd4', // cobalt base
  W: '#2a55b4', // deeper cobalt
  c: '#aee8f2', // pale-cyan wave crests
  k: '#e6faff', // glints
}

/* Four frames of scalloped wave crests. Each crest is a pale-cyan arc with
 * a deep-cobalt belly and a glint at its tip; the two crest systems drift
 * right by 4px per frame, wrapping across tile edges. */
const WATER_ONE: PixelFrame = [
  'wwwwwwwwwwwwwwww',
  'wwwwwwWwwwwwwwww',
  'wwwWwwwwwwwwwwww',
  'wwccccwwwwwwwwww',
  'wwWWWWkwwwwwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwWwwww',
  'wwwwwwkwwwwwwwww',
  'wwwwwwwwwwwwwwww',
  'wWwwwwwwwwwwwwww',
  'wwwwwwwwwwccccww',
  'wwwwwwwwwwWWWWkw',
  'wwwwwwwwwwwwwwww',
  'wwwwwWwwwwwwwwww',
  'wwwwwwwwwkwwwwww',
  'wwwwwwwwwwwwwwww',
]

const WATER_TWO: PixelFrame = [
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwWwwwww',
  'wwwwwwwWwwwwwwww',
  'wwwwwwccccwwwwww',
  'wwwwwwWWWWkwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwwW',
  'wwwwwwwwwwkwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwWwwwwwwwwww',
  'ccwwwwwwwwwwwwcc',
  'WWkwwwwwwwwwwwWW',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwWwwwwww',
  'wwwwwwwwwwwwwkww',
  'wwwwwwwwwwwwwwww',
]

const WATER_THREE: PixelFrame = [
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwWw',
  'wwwwwwwwwwwWwwww',
  'wwwwwwwwwwccccww',
  'wwwwwwwwwwWWWWkw',
  'wwwwwwwwwwwwwwww',
  'wwwWwwwwwwwwwwww',
  'wwwwwwwwwwwwwwkw',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwWwwwwww',
  'wwccccwwwwwwwwww',
  'wwWWWWkwwwwwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwWww',
  'wkwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
]

const WATER_FOUR: PixelFrame = [
  'wwwwwwwwwwwwwwww',
  'wwWwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwwW',
  'ccwwwwwwwwwwwwcc',
  'WWkwwwwwwwwwwwWW',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwWwwwwwwww',
  'wwkwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwWww',
  'wwwwwwccccwwwwww',
  'wwwwwwWWWWkwwwww',
  'wwwwwwwwwwwwwwww',
  'wWwwwwwwwwwwwwww',
  'wwwwwkwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
]

const WATER_EDGE_PALETTE: PixelPalette = {
  k: '#e6faff', // foam line
  c: '#aee8f2', // shallow pale-cyan
  S: '#26509e', // darker shoreline drop-off
}

/* North shore: foam line, shallow rim, then the darker drop-off band with
 * scalloped foam bumps dipping into it. Rows below 5 stay transparent so
 * the animated water shows through. */
const WATER_EDGE_N: PixelFrame = [
  'kkkkkkkkkkkkkkkk',
  'cccccccccccccccc',
  'SSSSSSSSSSSSSSSS',
  'SSccSSSSccSSSScc',
  'SSSSSSSSSSSSSSSS',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]

/* West shore: shallow rim against the land, foam scallops poking east. */
const WATER_EDGE_W: PixelFrame = [
  'kSS.............',
  'cSS.............',
  'cSS.............',
  'cSS.............',
  'cSSc............',
  'cSS.............',
  'cSS.............',
  'cSS.............',
  'cSS.............',
  'cSSc............',
  'cSS.............',
  'cSS.............',
  'cSS.............',
  'cSSc............',
  'cSS.............',
  'cSS.............',
]

/* East shore: mirror of the west. */
const WATER_EDGE_E: PixelFrame = [
  '.............SSk',
  '.............SSc',
  '.............SSc',
  '.............SSc',
  '............cSSc',
  '.............SSc',
  '.............SSc',
  '.............SSc',
  '.............SSc',
  '............cSSc',
  '.............SSc',
  '.............SSc',
  '.............SSc',
  '............cSSc',
  '.............SSc',
  '.............SSc',
]

/* South shore: the darker depth band where water meets the beach. */
const WATER_EDGE_S: PixelFrame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  'SSSSSSSSSSSSSSSS',
  'SSSSSSSSSSSSSSSS',
]

const FLOWER_PALETTE: PixelPalette = {
  g: '#79cf9d',
  G: '#4fae7c',
  l: '#a9e9bd',
  n: '#5fbf8a',
  o: OUT,
  r: '#e05a5a', // red petals
  w: '#f5f0ff', // white petals
  y: '#ffd966', // golden hearts
}

/* A lawn tile with three outlined daisies; the second frame sways every
 * bloom one pixel west. */
const FLOWER_A: PixelFrame = [
  'gggggGggglgggggn',
  'gggggggggggggggn',
  'gg.ooo.ggggggggn',
  'ggorrroggggggggn',
  'ggoryroggggggggn',
  'ggorrroggggggggn',
  'gg.ooo.ggggggggn',
  'gggggggggggggggn',
  'gggggggggg.ooo.n',
  'ggggggggggorrron',
  'ggggg.ooo.oryron',
  'gggggowwwoorrron',
  'gggggowywoorrron',
  'gggggowwwo.ooo.n',
  'ggggg.ooo.gggggn',
  'nnnnnnnnnnnnnnnn',
]

const FLOWER_B: PixelFrame = [
  'gggggGggglgggggn',
  'gggggggggggggggn',
  'g.ooo..ggggggggn',
  'gorrro.ggggggggn',
  'goryro.ggggggggn',
  'gorrro.ggggggggn',
  'g.ooo..ggggggggn',
  'gggggggggggggggn',
  'gggggggggg.ooo.n',
  'ggggggggggorrron',
  'gggg.ooo..oryron',
  'ggggowwwo.orrron',
  'ggggowywo.orrron',
  'ggggowwwo..ooo.n',
  'gggg.ooo..gggggn',
  'nnnnnnnnnnnnnnnn',
]

const TALL_GRASS_PALETTE: PixelPalette = {
  g: '#79cf9d',
  G: '#4fae7c',
  l: '#a9e9bd',
  n: '#5fbf8a',
  o: OUT,
  D: '#35915f', // deep blade tufts
}

/* Three outlined grass tufts; frame two leans them a pixel east. */
const TALL_GRASS_A: PixelFrame = [
  'gggggggggggggggn',
  'gGgggggggggggggn',
  'ggggggg..oo..ggn',
  'ggggggg.oDDo.ggn',
  'g..oo..oDDDDo.gn',
  'g.oDDo.oDDDDo.gn',
  'goDDDDooDDDDo.gn',
  'goDDDDoggggggggn',
  'gggggggggggggggn',
  'glgggggggggggggn',
  'gggg..oo..gggggn',
  'gggg.oDDo.gggggn',
  'ggggoDDDDogggggn',
  'ggggoDDDDogggggn',
  'gggggggggggggggn',
  'nnnnnnnnnnnnnnnn',
]

const TALL_GRASS_B: PixelFrame = [
  'gggggggggggggggn',
  'gGgggggggggggggn',
  'ggggggg..oo..ggn',
  'ggggggg.oDDo.ggn',
  'gg..oo..oDDDDogn',
  'gg.oDDo.oDDDDogn',
  'ggoDDDDooDDDDogn',
  'ggoDDDDogggggggn',
  'gggggggggggggggn',
  'glgggggggggggggn',
  'ggggg..oo..ggggn',
  'ggggg.oDDo.ggggn',
  'gggggoDDDDoggggn',
  'gggggoDDDDoggggn',
  'gggggggggggggggn',
  'nnnnnnnnnnnnnnnn',
]

const CLIFF_PALETTE: PixelPalette = {
  g: '#79cf9d', // grass lip, same mint as the lawn above
  G: '#4fae7c',
  l: '#a9e9bd',
  o: OUT,
  b: '#b0793f', // sunlit rock face
  B: '#8a5a2e', // strata lines
  d: '#6e4526', // cracks
  L: '#c8955a', // face glints
  D: '#4a3020', // base shadow
}

/* A ledge tile: mint lip on top, dark rim, then a segmented brown face
 * with strata and cracks, ending in a two-tone base shadow. */
const CLIFF: PixelFrame = [
  'gglggggggggggggg',
  'gGggggggglgggggg',
  'gggggGgggggggggg',
  'oooooooooooooooo',
  'obbbbbbbbbbbbbbo',
  'obLLbbbbbbbbbbbo',
  'obbBbbbbbbbBbbbo',
  'obbbbbbdbbbbbbbo',
  'obbbbbbbbbbbLLbo',
  'obbBbbbbbbbbBbbo',
  'obbbbbBbbbbbbbbo',
  'obbbbbbbdbbbbbbo',
  'obbBbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbo',
  'oooooooooooooooo',
  'DDDDDDDDDDDDDDDD',
]

export const legacyTerrainSprites: {
  grass: PixelSprite
  path: PixelSprite
  sand: PixelSprite
  water: PixelSprite
  waterEdgeN: PixelSprite
  waterEdgeW: PixelSprite
  waterEdgeE: PixelSprite
  waterEdgeS: PixelSprite
  flower: PixelSprite
  tallGrass: PixelSprite
  cliff: PixelSprite
} = {
  grass: { palette: GRASS_PALETTE, frames: [GRASS], frameMs: 1000 },
  path: { palette: PATH_PALETTE, frames: [PATH], frameMs: 1000 },
  sand: { palette: SAND_PALETTE, frames: [SAND], frameMs: 1000 },
  water: {
    palette: WATER_PALETTE,
    frames: [WATER_ONE, WATER_TWO, WATER_THREE, WATER_FOUR],
    frameMs: 640,
  },
  waterEdgeN: { palette: WATER_EDGE_PALETTE, frames: [WATER_EDGE_N], frameMs: 1000 },
  waterEdgeW: { palette: WATER_EDGE_PALETTE, frames: [WATER_EDGE_W], frameMs: 1000 },
  waterEdgeE: { palette: WATER_EDGE_PALETTE, frames: [WATER_EDGE_E], frameMs: 1000 },
  waterEdgeS: { palette: WATER_EDGE_PALETTE, frames: [WATER_EDGE_S], frameMs: 1000 },
  flower: { palette: FLOWER_PALETTE, frames: [FLOWER_A, FLOWER_B], frameMs: 950 },
  tallGrass: { palette: TALL_GRASS_PALETTE, frames: [TALL_GRASS_A, TALL_GRASS_B], frameMs: 700 },
  cliff: { palette: CLIFF_PALETTE, frames: [CLIFF], frameMs: 1000 },
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

const COTTAGE_PALETTE: PixelPalette = {
  o: OUT,
  R: '#c8563e', // terracotta roof
  h: '#e8825e', // ridge highlight
  D: '#96402e', // eaves and roof shade
  w: '#ecd9b0', // cream wall
  t: '#8a5a34', // timber frame
  d: '#9a6b43', // door wood
  k: '#ffd966', // door knob
  y: '#ffd98c', // window glow, dim
  Y: '#ffe9b3', // window glow, bright
  c: '#8a7a6e', // chimney stone
  s: '#e8eef4', // smoke
}

/* A 32x32 cottage: terracotta roof with a chimney, cream walls with
 * timber corners, a warm window and a red-trimmed door. Frame two lets
 * the window glow brighter and the chimney puff drift. */
const COTTAGE_A: PixelFrame = [
  '...................ss...........',
  '............ooooooooocco........',
  '...........oRhRRRRRRocco........',
  '..........oRhRRRRRRRocco........',
  '.........oRhRRRRRRRRocco........',
  '........oRhRRRRRRRRRocco........',
  '.......oRhRRRRRRRRRRocco........',
  '......oRhRRRRRRRRRRRoooo........',
  '.....' + 'oRh' + 'R'.repeat(13) + 'o' + '..........',
  '....' + 'oRh' + 'R'.repeat(20) + 'o' + '....',
  '...' + 'oRh' + 'R'.repeat(22) + 'o' + '...',
  '..' + 'oRh' + 'R'.repeat(24) + 'o' + '..',
  '.' + 'oRh' + 'R'.repeat(26) + 'o' + '.',
  'oD' + 'R'.repeat(28) + 'Do',
  'o' + 'w'.repeat(30) + 'o',
  'ot' + 'w'.repeat(28) + 'to',
  'ot' + 'w'.repeat(19) + 'oooooo' + 'wwww' + 'o',
  'otww' + 'oooooooo' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'otww' + 'ottyytto' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'otww' + 'otyyyyto' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'otww' + 'otyyyyto' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'otww' + 'otyyyyto' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'otww' + 'ottyytto' + 'wwwwwwwww' + 'odddko' + 'wwww' + 'o',
  'otww' + 'oooooooo' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oooooo' + 'wwww' + 'o',
  'o' + 't'.repeat(30) + 'o',
  'oooooooooooooooooooooooooooooooo',
]

const COTTAGE_B: PixelFrame = [
  '..................sss...........',
  '............ooooooooocco........',
  '...........oRhRRRRRRocco........',
  '..........oRhRRRRRRRocco........',
  '.........oRhRRRRRRRRocco........',
  '........oRhRRRRRRRRRocco........',
  '.......oRhRRRRRRRRRRocco........',
  '......oRhRRRRRRRRRRRoooo........',
  '.....' + 'oRh' + 'R'.repeat(13) + 'o' + '..........',
  '....' + 'oRh' + 'R'.repeat(20) + 'o' + '....',
  '...' + 'oRh' + 'R'.repeat(22) + 'o' + '...',
  '..' + 'oRh' + 'R'.repeat(24) + 'o' + '..',
  '.' + 'oRh' + 'R'.repeat(26) + 'o' + '.',
  'oD' + 'R'.repeat(28) + 'Do',
  'o' + 'w'.repeat(30) + 'o',
  'ot' + 'w'.repeat(28) + 'to',
  'ot' + 'w'.repeat(19) + 'oooooo' + 'wwww' + 'o',
  'otww' + 'oooooooo' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'otww' + 'ottYYtto' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'otww' + 'otYYYYto' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'otww' + 'otYYYYto' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'otww' + 'otYYYYto' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'otww' + 'ottYYtto' + 'wwwwwwwww' + 'odddko' + 'wwww' + 'o',
  'otww' + 'oooooooo' + 'wwwwwwwww' + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oddddo' + 'wwww' + 'o',
  'ot' + 'w'.repeat(19) + 'oooooo' + 'wwww' + 'o',
  'o' + 't'.repeat(30) + 'o',
  'oooooooooooooooooooooooooooooooo',
]

const PINE_PALETTE: PixelPalette = {
  o: OUT,
  b: '#379a63', // needle green
  d: '#25714a', // shaded needles, right and underside
  h: '#7ed697', // top-left light catch
  t: '#8a5a34', // trunk
  T: '#5f3d24', // trunk shade
}

/* A 16x24 conifer: three stepped canopy layers over a visible trunk,
 * every layer outlined, light catching the top-left of each step. */
const PINE_CALM: PixelFrame = [
  '.......oo.......',
  '......ohbo......',
  '.....ohbbo......',
  '.....ohbbdo.....',
  '....ohbbbdo.....',
  '....ohbbbbdo....',
  '...ohbbbbddo....',
  '...ohbbbbbddo...',
  '..ohbbbbbbddo...',
  '..ohbbbbbbdddo..',
  '..ohbbbbbbdddo..',
  '.ohbbbbbbbdddo..',
  '.ohbbbbbbbbdddo.',
  'ohbbbbbbbbbbdddo',
  'ohbbbbbbbbbbdddo',
  'ohbbbbbbbbbbdddo',
  'ohbbbbbbbbbbdddo',
  '.odbbbbbbbbdddo.',
  '.....oddddo.....',
  '.....otttto.....',
  '.....ottTto.....',
  '.....otTTto.....',
  '.....oTTTto.....',
  '....oTTTTTTo....',
]

/* Breeze frame: the top two canopy steps lean one pixel east. */
const PINE_SWAY: PixelFrame = [
  '........oo......',
  '.......ohbo.....',
  '......ohbbo.....',
  '......ohbbdo....',
  '.....ohbbbdo....',
  '.....ohbbbbdo...',
  '....ohbbbbddo...',
  '....ohbbbbbddo..',
  '...ohbbbbbbddo..',
  '...ohbbbbbbdddo.',
  '..ohbbbbbbdddo..',
  '.ohbbbbbbbdddo..',
  '.ohbbbbbbbbdddo.',
  'ohbbbbbbbbbbdddo',
  'ohbbbbbbbbbbdddo',
  'ohbbbbbbbbbbdddo',
  'ohbbbbbbbbbbdddo',
  '.odbbbbbbbbdddo.',
  '.....oddddo.....',
  '.....otttto.....',
  '.....ottTto.....',
  '.....otTTto.....',
  '.....oTTTto.....',
  '....oTTTTTTo....',
]

const BUSH_PALETTE: PixelPalette = {
  o: OUT,
  b: '#45b173',
  d: '#2e8553',
  h: '#86df9f',
  r: '#e05a5a', // little berries
}

const BUSH_A: PixelFrame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '....oooooo......',
  '...ohbbbbbo.....',
  '..ohbbbbbbbo....',
  '..ohbbbrbbbbo...',
  '.ohbbbbbrbbbbo..',
  '.ohbbbbbbbbbbo..',
  '.ohbbbbbbbbddo..',
  '.obrbbbbbbddo...',
  '.obbbbbbbbdddo..',
  '.odbbbbbbdddo...',
  '.odddddddddddo..',
]

const BUSH_B: PixelFrame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '...oooooo.......',
  '..ohbbbbbo......',
  '.ohbbbbbbbo.....',
  '.ohbbbrbbbbo....',
  'ohbbbbbrbbbbo...',
  'ohbbbbbbbbbbo...',
  'ohbbbbbbbbbddo..',
  'obrbbbbbbbddo...',
  'obbbbbbbbbdddo..',
  'odbbbbbbdddo....',
  'oddddddddddddo..',
]

const ROCK_PALETTE: PixelPalette = {
  o: OUT,
  r: '#a8a2b4',
  R: '#736d84',
  h: '#d2cee2',
}

const ROCK: PixelFrame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....oooo.......',
  '....ohrrro......',
  '...ohhrrrRo.....',
  '...ohrrrrRRo....',
  '..ohrrrrrRRRo...',
  '..orrrrrrRRRo...',
  '..orrrrrRRRRo...',
  '..oRRRRRRRRRo...',
  '..ooooooooooo...',
]

const CAMPFIRE_PALETTE: PixelPalette = {
  o: OUT,
  t: '#8a5a34', // logs
  T: '#5f3d24', // log shade
  E: '#e05e2b', // embers
  F: '#ff9d3c', // flame outer
  M: '#ffd966', // flame mid
  I: '#fff3c9', // flame core
  s: '#fff3c9', // rising sparks
}

/* Crackling fire: lean left, upright, lean right, with sparks and
 * glowing ember seams along the logs. */
const CAMPFIRE_A: PixelFrame = [
  '................',
  '................',
  '................',
  '.........s......',
  '................',
  '.......FF.......',
  '......FFFF......',
  '.....FMMMMF.....',
  '.....FMIIMF.....',
  '....FMMIIMMF....',
  '....FMMMMMMF....',
  '...FMMMMMMMMF...',
  '...FFMMMMMMFF...',
  '....FFFFFFFF....',
  '..otEtEttEtEto..',
  '..oTTETTETTETo..',
]

const CAMPFIRE_B: PixelFrame = [
  '................',
  '................',
  '................',
  '...........s....',
  '................',
  '........FF......',
  '.......FFFF.....',
  '......FMMMMF....',
  '......FMIIMF....',
  '.....FMMIIMMF...',
  '.....FMMMMMMF...',
  '...FMMMMMMMMF...',
  '...FFMMMMMMFF...',
  '....FFFFFFFF....',
  '..otEtEttEtEto..',
  '..oTTETTETTETo..',
]

const CAMPFIRE_C: PixelFrame = [
  '................',
  '................',
  '......s.........',
  '................',
  '......F.........',
  '.....FFF........',
  '.....FFFF.......',
  '....FMMMMF......',
  '....FMIIMF......',
  '....FMMIIMMF....',
  '....FMMMMMMF....',
  '...FMMMMMMMMF...',
  '...FFMMMMMMFF...',
  '....FFFFFFFF....',
  '..otEtEttEtEto..',
  '..oTTETTETTETo..',
]

const LAMP_PALETTE: PixelPalette = {
  o: OUT,
  i: '#4f463c', // iron
  I: '#3a3330', // iron shade
  y: '#ffd98c', // lantern glow
  Y: '#ffe9b3', // lantern glow, brighter
}

/* A 16x26 street lamp; the lantern breathes brighter on frame two and
 * spills a little light past its housing. */
const LAMP_DIM: PixelFrame = [
  '......oooo......',
  '.....oiiiio.....',
  '....oyyyyyyo....',
  '....oyyyyyyo....',
  '....oyyyyyyo....',
  '....oIiiiiIo....',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '.....oiiiio.....',
  '.....oiiiio.....',
  '....oiiiiiio....',
  '...oiiiiiiiio...',
]

const LAMP_BRIGHT: PixelFrame = [
  '......oooo......',
  '...y.oiiiio.y...',
  '....oYYYYYYo....',
  '....oYYYYYYo....',
  '....oYYYYYYo....',
  '....oIiiiiIo....',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '......oiio......',
  '.....oiiiio.....',
  '.....oiiiio.....',
  '....oiiiiiio....',
  '...oiiiiiiiio...',
]

const SIGN_PALETTE: PixelPalette = {
  o: OUT,
  b: '#c89a6e', // board wood
  L: '#e8d3a0', // board glint
  x: '#7a4e2e', // carved text
  p: '#9a6b43', // post
}

/* Awayside sign; the board wobbles a pixel on its post in the breeze. */
const SIGN_STILL: PixelFrame = [
  '................',
  '................',
  '................',
  '..oooooooooooo..',
  '..obbbbbbbbbbo..',
  '..obxLLxbbbbbo..',
  '..obbbbbxbbbbo..',
  '..obxLbbbbbbo...',
  '..oooooooooooo..',
  '......oppo......',
  '......oppo......',
  '......oppo......',
  '......oppo......',
  '......oppo......',
  '.....oppppo.....',
  '....oppppppo....',
]

const SIGN_WOBBLE: PixelFrame = [
  '................',
  '................',
  '................',
  '...oooooooooooo.',
  '...obbbbbbbbbbo.',
  '...obxLLxbbbbbo.',
  '...obbbbbxbbbbo.',
  '...obxLbbbbbbo..',
  '...oooooooooooo.',
  '......oppo......',
  '......oppo......',
  '......oppo......',
  '......oppo......',
  '......oppo......',
  '.....oppppo.....',
  '....oppppppo....',
]

const FENCE_PALETTE: PixelPalette = {
  o: OUT,
  r: '#c89a6e', // rail wood
  p: '#9a6b43', // post wood
  n: '#e8d3a8', // nail glints
}

/* One post plus full-width rails, so fence tiles connect in a run.
 * The nail glints rattle on frame two. */
const FENCE_SETTLED: PixelFrame = [
  '................',
  '................',
  '......oooo......',
  '......oppo......',
  '......oppo......',
  '......oppo......',
  'oooooooooooooooo',
  'nrrrrrpprrrrrrrn',
  '......oppo......',
  '......oppo......',
  'oooooooooooooooo',
  'rrrrrrpprrrrrrnr',
  '......oppo......',
  '......oppo......',
  '.....oppppo.....',
  '.....oppppo.....',
]

const FENCE_RATTLE: PixelFrame = [
  '................',
  '................',
  '......oooo......',
  '......oppo......',
  '......oppo......',
  '......oppo......',
  'oooooooooooooooo',
  'rnrrrrpprrrrrrrn',
  '......oppo......',
  '......oppo......',
  'oooooooooooooooo',
  'rrrrrrpprrrrrrrn',
  '......oppo......',
  '......oppo......',
  '.....oppppo.....',
  '.....oppppo.....',
]

const BUTTERFLY_PALETTE: PixelPalette = {
  o: OUT,
  w: '#f5b456', // monarch wings
}

/* Wings open, wings folded up - a quick two-frame flutter. */
const BUTTERFLY_OPEN: PixelFrame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '...o........o...',
  '..oo........oo..',
  '.owwwo....owwwo.',
  '.owwwwooooowwwo.',
  '.owwwo....owwwo.',
  '..oo........oo..',
  '................',
  '................',
  '................',
  '................',
  '................',
]

const BUTTERFLY_FOLDED: PixelFrame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....owwwo......',
  '.....owwwo......',
  '......oooo......',
  '......oooo......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]

const FISH_PALETTE: PixelPalette = {
  o: OUT,
  f: '#f0a05a', // koi orange
  c: '#ffdca8', // belly
  e: '#3a2a24', // eye
  T: '#e08a48', // tail fin
}

/* Little koi facing LEFT; the tail fin beats down, then up. */
const FISH_TAIL_DOWN: PixelFrame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.oooooooooo.....',
  '.offffffffo.....',
  '.ofeffffffoTT...',
  '.occccccccoTT...',
  '................',
  '................',
  '................',
  '................',
]

const FISH_TAIL_UP: PixelFrame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.ooooooooooTT...',
  '.offffffffoTT...',
  '.ofeffffffoTT...',
  '.occcccccco.....',
  '................',
  '................',
  '................',
  '................',
  '................',
]

const LILY_PALETTE: PixelPalette = {
  o: OUT,
  k: '#4fae5c', // pad
  K: '#3a8a48', // pad shade
  L: '#7fd68a', // pad light
  p: '#f0a8c8', // petals
  y: '#ffd966', // blossom heart
}

/* Lily pad and blossom bobbing on the water; the blossom closes to a bud. */
const LILY_OPEN: PixelFrame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....oppo.......',
  '....oppppo......',
  '....oppyypo.....',
  '....oppppo......',
  '.....oppo.......',
  '................',
  '..ookkkkkkoo....',
  '.okLkkkkkkkko...',
  '.okkkkkkkkkKko..',
  '..ooKKKKKKKoo...',
  '................',
]

const LILY_BUD: PixelFrame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......oppo......',
  '.....oppyypo....',
  '.....oppppo.....',
  '......oppo......',
  '................',
  '..ookkkkkkoo....',
  '.okLkkkkkkkko...',
  '.okkkkkkkkkKko..',
  '..ooKKKKKKKoo...',
  '................',
]

export const legacyPropSprites: {
  cottage: PixelSprite
  pine: PixelSprite
  bush: PixelSprite
  rock: PixelSprite
  campfire: PixelSprite
  lamp: PixelSprite
  sign: PixelSprite
  fence: PixelSprite
  butterfly: PixelSprite
  fish: PixelSprite
  lily: PixelSprite
} = {
  cottage: {
    palette: COTTAGE_PALETTE,
    frames: [COTTAGE_A, COTTAGE_B],
    frameMs: 1150,
  },
  pine: { palette: PINE_PALETTE, frames: [PINE_CALM, PINE_SWAY], frameMs: 1350 },
  bush: { palette: BUSH_PALETTE, frames: [BUSH_A, BUSH_B], frameMs: 1000 },
  rock: { palette: ROCK_PALETTE, frames: [ROCK], frameMs: 1000 },
  campfire: {
    palette: CAMPFIRE_PALETTE,
    frames: [CAMPFIRE_A, CAMPFIRE_B, CAMPFIRE_C],
    frameMs: 170,
  },
  lamp: { palette: LAMP_PALETTE, frames: [LAMP_DIM, LAMP_BRIGHT], frameMs: 900 },
  sign: { palette: SIGN_PALETTE, frames: [SIGN_STILL, SIGN_WOBBLE], frameMs: 750 },
  fence: {
    palette: FENCE_PALETTE,
    frames: [FENCE_SETTLED, FENCE_RATTLE],
    frameMs: 1600,
  },
  butterfly: {
    palette: BUTTERFLY_PALETTE,
    frames: [BUTTERFLY_OPEN, BUTTERFLY_FOLDED],
    frameMs: 260,
  },
  fish: {
    palette: FISH_PALETTE,
    frames: [FISH_TAIL_DOWN, FISH_TAIL_UP],
    frameMs: 230,
  },
  lily: { palette: LILY_PALETTE, frames: [LILY_OPEN, LILY_BUD], frameMs: 800 },
}
