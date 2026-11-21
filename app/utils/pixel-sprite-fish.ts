/**
 * High-resolution fish sprite bank for the ponds of Willow Hollow.
 *
 * Conventions (for the renderer):
 * - Every frame is a grid of rows. Koi and bass frames are 32x24; the
 *   minnow is 24x16 so it reads as a genuinely smaller species. '.' is
 *   transparent.
 * - Each character maps to a color in that species' own palette. Every
 *   silhouette carries a hard 1px near-black outline; light falls from the
 *   top left, shade piles into the bottom right.
 * - All three fish face LEFT; mirror horizontally for right.
 * - Four swim frames per species. The body bobs 1px while the tail sweeps
 *   up, through center, and down; the pectoral fin beats on a secondary
 *   rhythm so the two center-tail frames never look identical.
 * - `frameMs` is how long one frame is held before advancing. The renderer
 *   drives fish from the shared world schedule (300ms, paced slower
 *   still), the bass is heavier and slower, and the minnow is quick and
 *   darting.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/** The koi's outline; the bass and minnow tint theirs to match their scales. */
const OUT = '#2a2230'

/* ------------------------------------------------------------------ */
/* Koi                                                                 */
/* ------------------------------------------------------------------ */

const KOI_PALETTE: PixelPalette = {
  o: OUT, // outline
  w: '#f4ede0', // porcelain white body
  W: '#d6c9b4', // white shade
  r: '#e8622e', // vermilion patch
  R: '#c2461f', // deep vermilion shade
  c: '#f8e6c4', // cream belly
  f: '#f2b184', // fin membrane
  F: '#d98a5e', // fin shade and rays
  e: '#241d26', // eye
  g: '#b9a58c', // gill line
  s: '#cbbba2', // scale shadow
  h: '#fff8ec', // top-light and eye glint
}

/* Frame 0: tail at center, body neutral, pectoral fin relaxed. */
const KOI_0: PixelFrame = [
  '................................',
  '................................',
  '................o...............',
  '............oooFFo..........o...',
  '...........offFffFoo.......oo...',
  '...........ofFffffFo......offo..',
  '..........ofFFFFFFFFo....offfo..',
  '.......ooowwrrrrrrr.....offFfo..',
  '.....oowwhhhrrrrrrrr...offffFo..',
  '...oorrrgwwwwrrrrrrrroofffffo...',
  '..orrhewgwwwwwrrrrrrrffffFffo...',
  '..owrrrrrwwwwwwrrrrrrwwffooo....',
  '.owwrrrrrwswwwwwRRRRRwwwo.......',
  '..ooorrrrgwswwwwwRRRRwwffooo....',
  '...owwwwfwgwswswwwRRwcfffFffo...',
  '....cowwfffsfswswwwccwofffffF...',
  '.....ccccfffswwwcccffo.offfFfo..',
  '........oWWWWWWWwooffo..offffo..',
  '.........oooffffo..ooo...offfo..',
  '............oooo.....o....offo..',
  '...............o...........oo...',
  '............................o...',
  '................................',
  '................................',
]

/* Frame 1: tail swept up, body settled 1px, pectoral fin trailing. */
const KOI_1: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '................o...............',
  '............oooFFo..........o...',
  '...........offFffFoo.......oo...',
  '...........ofFffffFo......offo..',
  '..........ofFFFFFFFFo....offfo..',
  '.......ooowwrrrrrrr.....offFfo..',
  '.....oowwhhhrrrrrrrr...offffFo..',
  '...oorrrgwwwwrrrrrrrroofffffo...',
  '..orrhewgwwwwwrrrrrrrffffFffo...',
  '..owrrrrrwwwwwwrrrrrrwwffooo....',
  '.owwrrrrrwswwwwwRRRRRwwwo.......',
  '..ooorrrrgwswwwwwRRRRwwffooo....',
  '...owwwwfwgwswswwwRRwcfffFffo...',
  '....cowwfffsfswswwwccwofffffF...',
  '.....ccccfffswwwcccffo.offfFfo..',
  '........oWWWWWWWwooffo..offffo..',
  '.........offffffo..ooo...offfo..',
  '.........oooofoo.....o....offo..',
  '.............o.o...........oo...',
  '............................o...',
  '................................',
]

/* Frame 2: tail at center again, pectoral fin at full beat. */
const KOI_2: PixelFrame = [
  '................................',
  '................................',
  '................o...............',
  '............ooooFF..........o...',
  '...........offfFffFo.......oo...',
  '...........offFffffF......offo..',
  '..........offFFFFFFFF....offfo..',
  '.......ooowwrrrrrrr.....offFfo..',
  '.....oowwhhhrrrrrrrr...offffFo..',
  '...oorrrgwwwwrrrrrrrroofffffo...',
  '..orrhewgwwwwwrrrrrrrffffFffo...',
  '..owrrrrrwwwwwwrrrrrrwwffooo....',
  '.owwrrrrrwswwwwwRRRRRwwwo.......',
  '..ooorrrrgwswwwwwRRRRwwffooo....',
  '...owwwwfwgwswswwwRRwcfffFffo...',
  '....cowwfffsfswswwwccwofffffF...',
  '.....ccccfffswwwcccffo.offfFfo..',
  '........oWWWWWWWwooffo..offffo..',
  '.........offffffo..ooo...offfo..',
  '.........offffoo.....o....offo..',
  '.........ooooo.o...........oo...',
  '.............o..............o...',
  '................................',
  '................................',
]

/* Frame 3: tail swept down, body lifted 1px, pectoral fin trailing. */
const KOI_3: PixelFrame = [
  '................................',
  '................o...............',
  '............oooFFo..........o...',
  '...........offFffFoo.......oo...',
  '...........ofFffffFo......offo..',
  '..........ofFFFFFFFFo....offfo..',
  '.......ooowwrrrrrrr.....offFfo..',
  '.....oowwhhhrrrrrrrr...offffFo..',
  '...oorrrgwwwwrrrrrrrroofffffo...',
  '..orrhewgwwwwwrrrrrrrffffFffo...',
  '..owrrrrrwwwwwwrrrrrrwwffooo....',
  '.owwrrrrrwswwwwwRRRRRwwwo.......',
  '..ooorrrrgwswwwwwRRRRwwffooo....',
  '...owwwwfwgwswswwwRRwcfffFffo...',
  '....cowwfffsfswswwwccwofffffF...',
  '.....ccccfffswwwcccffo.offfFfo..',
  '........oWWWWWWWwooffo..offffo..',
  '.........offffffo..ooo...offfo..',
  '.........oooofoo.....o....offo..',
  '.............o.o...........oo...',
  '............................o...',
  '................................',
  '................................',
  '................................',
]

/* ------------------------------------------------------------------ */
/* Bass                                                                */
/* ------------------------------------------------------------------ */

const BASS_PALETTE: PixelPalette = {
  o: '#1f2a24', // outline
  d: '#3f5a3a', // dark olive back
  m: '#5d7a4a', // mid olive flank
  l: '#8aa05c', // light olive lower flank
  b: '#d8d6a8', // pale belly
  s: '#6f8a52', // scale tick
  f: '#6b7f4a', // fin membrane
  F: '#4c5f36', // fin shade and rays
  e: '#1a1a1a', // eye
  g: '#4a5f3a', // gill line
  h: '#a8b878', // lateral line and eye socket
  w: '#e8e4c8', // eye glint
  t: '#2a2a22', // mouth interior
}

/* Frame 0: tail at center, body neutral, pectoral fin relaxed. */
const BASS_0: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '................................',
  '............ooooo...............',
  '............FFFFFooooo..........',
  '............FfFfFfFFFo..........',
  '...........offffffffffo......o..',
  '.....oooooofffffffffooo..ooooo..',
  '....odhhdgdddddddddo....ofFfffo.',
  '..oodhwehgddddddddddo..offfFfo..',
  '..ommmeemgmmmsmmmsmmmooffffooo..',
  '.ommmmmmmgmhhhhhhhhhhhhmffo.....',
  '.otttttttlglllslllslllfffffooo..',
  '.ooooblltflglllslllslloofffFfo..',
  '..o..oooofffffmooooffo..ofFfffo.',
  '.........offffo....ofo...ooooo..',
  '..........oofffoo..ooo.......o..',
  '............oooo.....o..........',
  '...............o................',
  '................................',
  '................................',
  '................................',
  '................................',
]

/* Frame 1: tail swept up, body settled 1px, pectoral fin trailing. */
const BASS_1: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '............ooooo...............',
  '............FFFFFooooo..........',
  '............FfFfFfFFFo..........',
  '...........offffffffffo......o..',
  '.....oooooofffffffffooo..ooooo..',
  '....odhhdgdddddddddo....ofFfffo.',
  '..oodhwehgddddddddddo..offfFfo..',
  '..ommmeemgmmmsmmmsmmmooffffooo..',
  '.ommmmmmmgmhhhhhhhhhhhhmffo.....',
  '.otttttttlglllslllslllfffffooo..',
  '.ooooblltflglllslllslloofffFfo..',
  '..o..oooofffffmooooffo..ofFfffo.',
  '.........offffo....ofo...ooooo..',
  '..........offffoo..ooo.......o..',
  '..........oooofo.....o..........',
  '..............oo................',
  '................................',
  '................................',
  '................................',
]

/* Frame 2: tail at center again, pectoral fin at full beat. */
const BASS_2: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '................................',
  '............ooooo...............',
  '............oFFFFFoooo..........',
  '............oFfFfFfFFF..........',
  '...........offffffffffo......o..',
  '.....oooooofffffffffooo..ooooo..',
  '....odhhdgdddddddddo....ofFfffo.',
  '..oodhwehgddddddddddo..offfFfo..',
  '..ommmeemgmmmsmmmsmmmooffffooo..',
  '.ommmmmmmgmhhhhhhhhhhhhmffo.....',
  '.otttttttlglllslllslllfffffooo..',
  '.ooooblltflglllslllslloofffFfo..',
  '..o..oooofffffmooooffo..ofFfffo.',
  '.........offffo....ofo...ooooo..',
  '..........offffoo..ooo.......o..',
  '..........offffo.....o..........',
  '..........oooofo................',
  '..............o.................',
  '................................',
  '................................',
  '................................',
]

/* Frame 3: tail swept down, body lifted 1px, pectoral fin trailing. */
const BASS_3: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '............ooooo...............',
  '............FFFFFooooo..........',
  '............FfFfFfFFFo..........',
  '...........offffffffffo......o..',
  '.....oooooofffffffffooo..ooooo..',
  '....odhhdgdddddddddo....ofFfffo.',
  '..oodhwehgddddddddddo..offfFfo..',
  '..ommmeemgmmmsmmmsmmmooffffooo..',
  '.ommmmmmmgmhhhhhhhhhhhhmffo.....',
  '.otttttttlglllslllslllfffffooo..',
  '.ooooblltflglllslllslloofffFfo..',
  '..o..oooofffffmooooffo..ofFfffo.',
  '.........offffo....ofo...ooooo..',
  '..........offffoo..ooo.......o..',
  '..........oooofo.....o..........',
  '..............oo................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
]

/* ------------------------------------------------------------------ */
/* Minnow                                                              */
/* ------------------------------------------------------------------ */

const MINNOW_PALETTE: PixelPalette = {
  o: '#222a33', // outline
  b: '#4a6b82', // blue-grey back
  m: '#6f93a8', // mid flank
  l: '#a9c4d2', // pale lower flank
  w: '#e6eef2', // silver belly
  s: '#3a5a72', // lateral stripe and gill
  f: '#9fb8c6', // fin membrane
  F: '#7a97a8', // fin shade and rays
  e: '#1a2028', // eye
  h: '#d6e6ee', // top-light and eye glint
}

/* Frame 0: tail at center, body neutral, pectoral fin relaxed. */
const MINNOW_0: PixelFrame = [
  '........................',
  '........................',
  '........................',
  '..........oooo..........',
  '..........oFFo........o.',
  '.....oooooFffFo....ooofo',
  '..oohesbbbbbbo....ofFfo.',
  '..obeeshhhhhhhooooffoFo.',
  '.ommmsssssssssssmffo....',
  '..olllfsFllFlfffooffoFo.',
  '..ooowwffffwwooo..ofFfo.',
  '.....oooofffo..o...ooofo',
  '.........ooo..........o.',
  '...........o............',
  '........................',
  '........................',
]

/* Frame 1: tail swept up, body settled 1px, pectoral fin trailing. */
const MINNOW_1: PixelFrame = [
  '........................',
  '........................',
  '........................',
  '........................',
  '..........oooo..........',
  '..........oFFo........o.',
  '.....oooooFffFo....ooofo',
  '..oohesbbbbbbo....ofFfo.',
  '..obeeshhhhhhhooooffoFo.',
  '.ommmsssssssssssmffo....',
  '..olllfsFllFlfffooffoFo.',
  '..ooowfffffwwooo..ofFfo.',
  '.....oofffffo..o...ooofo',
  '.......ooofo..........o.',
  '..........oo............',
  '........................',
]

/* Frame 2: tail at center again, pectoral fin at full beat. */
const MINNOW_2: PixelFrame = [
  '........................',
  '........................',
  '........................',
  '..........oooo..........',
  '..........ofFF........o.',
  '.....ooooofFffF....ooofo',
  '..oohesbbbbbbo....ofFfo.',
  '..obeeshhhhhhhooooffoFo.',
  '.ommmsssssssssssmffo....',
  '..olllfsFllFlfffooffoFo.',
  '..ooowfffffwwooo..ofFfo.',
  '.....oofffffo..o...ooofo',
  '.......offfo..........o.',
  '.......ooofo............',
  '..........o.............',
  '........................',
]

/* Frame 3: tail swept down, body lifted 1px, pectoral fin trailing. */
const MINNOW_3: PixelFrame = [
  '........................',
  '........................',
  '..........oooo..........',
  '..........oFFo........o.',
  '.....oooooFffFo....ooofo',
  '..oohesbbbbbbo....ofFfo.',
  '..obeeshhhhhhhooooffoFo.',
  '.ommmsssssssssssmffo....',
  '..olllfsFllFlfffooffoFo.',
  '..ooowfffffwwooo..ofFfo.',
  '.....oofffffo..o...ooofo',
  '.......ooofo..........o.',
  '..........oo............',
  '........................',
  '........................',
  '........................',
]

/* ------------------------------------------------------------------ */
/* Bank                                                                */
/* ------------------------------------------------------------------ */

export const fishSprites: { koi: PixelSprite; bass: PixelSprite; minnow: PixelSprite } = {
  koi: {
    palette: KOI_PALETTE,
    frames: [KOI_0, KOI_1, KOI_2, KOI_3],
    frameMs: 230,
  },
  bass: {
    palette: BASS_PALETTE,
    frames: [BASS_0, BASS_1, BASS_2, BASS_3],
    frameMs: 260,
  },
  minnow: {
    palette: MINNOW_PALETTE,
    frames: [MINNOW_0, MINNOW_1, MINNOW_2, MINNOW_3],
    frameMs: 150,
  },
}
