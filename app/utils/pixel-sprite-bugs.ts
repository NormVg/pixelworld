/**
 * High-resolution bug sprites for Willow Hollow.
 *
 * Four species, each authored as a top-down pixel grid so the renderer can
 * center it over a world anchor and flip it without losing the silhouette:
 *
 * - `monarch`   32x32, six frames. A wide orange-and-black butterfly with a
 *   segmented body, clubbed antennae, radiating wing veins, black border
 *   bands, and white spots. The wings foreshorten through a full flap.
 * - `beetle`    32x28, four frames. A domed green scarab with a center seam,
 *   pronotum, mandibles, clubbed antennae, and six articulated legs walking
 *   a tripod gait.
 * - `dragonfly` 32x32, six frames. A long segmented teal abdomen, two huge
 *   compound eyes, four veined wings, and a one-pixel hover bob.
 * - `firefly`   32x28, six frames. A rust pronotum, raised dark elytra,
 *   translucent wings, and a lantern abdomen that pulses from dim olive to
 *   a white-hot core with a dithered halo.
 *
 * Conventions:
 * - Every frame is a grid of rows; every row is exactly the frame width.
 * - Each character maps to a color in that species' own palette; '.' is
 *   transparent.
 * - The silhouette carries a one-pixel near-black outline. Light falls from
 *   the top left, so highlights sit on the upper-left of each shell and
 *   shade piles into the lower right.
 * - `frameMs` is how long one frame is held before advancing. The monarch
 *   beats at 90ms, the beetle walks at 140ms, the dragonfly hovers at 70ms,
 *   and the firefly pulses at 130ms, so no two species move in lockstep.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/* ------------------------------------------------------------------ */
/* Monarch butterfly                                                  */
/* ------------------------------------------------------------------ */

const MONARCH_PALETTE: PixelPalette = {
  o: '#2a1f26', // outline
  k: '#33262f', // wing black / veins
  r: '#e8792b', // monarch orange
  R: '#c85a1c', // deep orange at the wing edge
  y: '#f6a94a', // warm orange near the body
  w: '#f7ead2', // white border spots
  b: '#5a3a3a', // body chitin
  B: '#9a6a4a', // body highlight
  e: '#1a1418', // eye
  a: '#3a2a30', // antenna
}

/* Wings fully open, at the top of the stroke. */
const MONARCH_0: PixelFrame = [
  '................................',
  '................................',
  '.........aa..........aa.........',
  '....ooo....a........a....ooo....',
  '...okkkooo.a........a.oookkko...',
  '..owRRRkkko.a......a.okkkRRRwo..',
  '..okkRRrrrko.a....a.okrrrRRkko..',
  '..okRkkrrrrkoabBBbaokrrrrkkRko..',
  '..okRRrkkrrko.ebbe.okrrkkrRRko..',
  '..okkkkrkkrrkobbbbokrrkkrkkkko..',
  '..okRrkkkrkkyo.Bb.oykkrkkkrRko..',
  '...owkkkkkkyykBbbbkyykkkkkkwo...',
  '....oooooooooobbBboooooooooo....',
  '............bb.bb.bb............',
  '...........b..bBbb..b...........',
  '...........b.oooooo.b...........',
  '..........oookbBbbkooo..........',
  '.......oookkkkbbbbkkkkooo.......',
  '......okkkkkkroBoorkkkkkko......',
  '.....okkkkkrkrobborkrkkkkko.....',
  '....owkRkkrkrkoBbokrkrkkRkwo....',
  '...okkRkkrkkro.oo.orkkrkkRkko...',
  '...okwRkRRkrko.bb.okrkRRkRwko...',
  '....oRkRRkkko..bb..okkkRRkRo....',
  '....ookwkooo...ob...oookwkoo....',
  '......ooo..............ooo......',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
]

/* Wings beginning to close, still broad. */
const MONARCH_1: PixelFrame = [
  '................................',
  '................................',
  '.........aa..........aa.........',
  '......oo...a........a...oo......',
  '.....okkoooa........aoookko.....',
  '....owRRkkkoa......aokkkRRwo....',
  '....okRRrrrk.a....a.krrrRRko....',
  '....okkkrrrroabBBbaorrrrkkko....',
  '....okRrkkrro.ebbe.orrkkrRko....',
  '....okkkrkkrkobbbbokrkkrkkko....',
  '....okrkkkrkyo.Bb.oykrkkkrko....',
  '.....okkkkkkykBbbbkykkkkkko.....',
  '..............bbBb..............',
  '............bb.bb.bb............',
  '...........b.obBbbo.b...........',
  '...........bokooookob...........',
  '........oookkkbBbbkkkooo........',
  '.......okkkkkrbbbbrkkkkko.......',
  '......okkkkkkroBoorkkkkkko......',
  '......wkRkkrrkobbokrrkkRkw......',
  '.....okRkkrkro.Bb.orkrkkRko.....',
  '.....owRkRRkko.oo.okkRRkRwo.....',
  '......RkRRkko..bb..okkRRkR......',
  '......okwkoo...bb...ookwko......',
  '.......ooo.....ob.....ooo.......',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
]

/* Wings half folded, body rising. */
const MONARCH_2: PixelFrame = [
  '................................',
  '................................',
  '.........aa..........aa.........',
  '........oo.a........a.oo........',
  '......owRRka........akRRwo......',
  '......okRRrra......arrRRko......',
  '......okkkrrka....akrrkkko......',
  '......okRrkrkabBBbakrkrRko......',
  '......okkkkkrkebbekrkkkkko......',
  '......okrkkrkybbbbykrkkrko......',
  '.......okkkkyyoBboyykkkko.......',
  '........ooooooBbbboooooo........',
  '..............bbBb..............',
  '............bb.bb.bb............',
  '...........b..bBbb..b...........',
  '...........boooooooob...........',
  '..........ookkbBbbkkoo..........',
  '.........okkkkbbbbkkkko.........',
  '........okkkrkoBookrkkko........',
  '........wkkkkrobborkkkkw........',
  '.......owRRRrk.Bb.krRRRwo.......',
  '........RkRkko.oo.okkRkR........',
  '........okkoo..bb..ookko........',
  '.........oo....bb....oo.........',
  '...............ob...............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
]

/* Wings folded above the back, the narrowest pose. */
const MONARCH_3: PixelFrame = [
  '................................',
  '................................',
  '.........aa..........aa.........',
  '.........okao......oako.........',
  '.........wRak......kaRw.........',
  '.........kRrao....oarRk.........',
  '.........kkrra....arrkk.........',
  '.........kRkrabBBbarkRk.........',
  '.........kkrkrebberkrkk.........',
  '.........krkrkbbbbkrkrk.........',
  '.........okkkykBbkykkko.........',
  '..............Bbbb..............',
  '..............bbBb..............',
  '............bbobbobb............',
  '...........b.obBbbo.b...........',
  '...........bokooookob...........',
  '...........kkkbBbbkkk...........',
  '..........okkrbbbbrkko..........',
  '..........wRkkkBokkkRw..........',
  '.........okkrkobbokrkko.........',
  '..........RRkk.Bb.kkRR..........',
  '..........owoo.oo.oowo..........',
  '...........o...bb...o...........',
  '...............bb...............',
  '...............ob...............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
]

/* Wings half open again, body settling. */
const MONARCH_4: PixelFrame = [
  '................................',
  '................................',
  '.........aa..........aa.........',
  '........oo.a........a.oo........',
  '......owRRka........akRRwo......',
  '......okRRrra......arrRRko......',
  '......okkkrrka....akrrkkko......',
  '......okRrkrkabBBbakrkrRko......',
  '......okkkkkrkebbekrkkkkko......',
  '......okrkkrkybbbbykrkkrko......',
  '.......okkkkyyoBboyykkkko.......',
  '........ooooooBbbboooooo........',
  '..............bbBb..............',
  '............bb.bb.bb............',
  '...........b..bBbb..b...........',
  '...........boooooooob...........',
  '..........ookkbBbbkkoo..........',
  '.........okkkkbbbbkkkko.........',
  '........okkkrkoBookrkkko........',
  '........wkkkkrobborkkkkw........',
  '.......owRRRrk.Bb.krRRRwo.......',
  '........RkRkko.oo.okkRkR........',
  '........okkoo..bb..ookko........',
  '.........oo....bb....oo.........',
  '...............ob...............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
]

/* Wings nearly open, about to complete the beat. */
const MONARCH_5: PixelFrame = [
  '................................',
  '................................',
  '.........aa..........aa.........',
  '......oo...a........a...oo......',
  '.....okkoooa........aoookko.....',
  '....owRRkkkoa......aokkkRRwo....',
  '....okRRrrrk.a....a.krrrRRko....',
  '....okkkrrrroabBBbaorrrrkkko....',
  '....okRrkkrro.ebbe.orrkkrRko....',
  '....okkkrkkrkobbbbokrkkrkkko....',
  '....okrkkkrkyo.Bb.oykrkkkrko....',
  '.....okkkkkkykBbbbkykkkkkko.....',
  '..............bbBb..............',
  '............bb.bb.bb............',
  '...........b.obBbbo.b...........',
  '...........bokooookob...........',
  '........oookkkbBbbkkkooo........',
  '.......okkkkkrbbbbrkkkkko.......',
  '......okkkkkkroBoorkkkkkko......',
  '......wkRkkrrkobbokrrkkRkw......',
  '.....okRkkrkro.Bb.orkrkkRko.....',
  '.....owRkRRkko.oo.okkRRkRwo.....',
  '......RkRRkko..bb..okkRRkR......',
  '......okwkoo...bb...ookwko......',
  '.......ooo.....ob.....ooo.......',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
]

/* ------------------------------------------------------------------ */
/* Domed beetle                                                       */
/* ------------------------------------------------------------------ */

const BEETLE_PALETTE: PixelPalette = {
  o: '#241c22', // outline
  s: '#2f4a3e', // shell dark green
  S: '#3f6b52', // shell mid green
  h: '#6f9c72', // shell specular highlight
  p: '#26382f', // pronotum dark
  P: '#4a6b52', // pronotum highlight
  b: '#2a2328', // legs and head
  B: '#4a3d3a', // leg highlight
  e: '#120e12', // eye
  a: '#4a3a2e', // antenna
  c: '#6b5a3a', // antenna club
  m: '#8a6a3a', // mandible
}

/* Tripod A planted, tripod B swinging forward. */
const BEETLE_0: PixelFrame = [
  '................................',
  '...........om......mo...........',
  '...........aamooo.maa...........',
  '.........ca..aBbboa..ac.........',
  '.............oehbeh.............',
  '.............ooooo..............',
  '.....Bb.....oPPpppo.............',
  '.......b...oPPPppppo............',
  '........BbBoPPPppppo.B..bbB.....',
  '..........booooooooobbbB........',
  '..........oSSSSosssso...........',
  '........ooShSSSossssso..........',
  '.......BoShhhSSosssssso.B.bbB...',
  '........oSShSSSossssssobbB......',
  '...BbbBboSSSSSSossssssS.........',
  '.......osSSSSSSosssssso.........',
  '........osSsSsSosssssso.........',
  '........osssssSosssssSo.........',
  '........osSsssSosssssso.........',
  '........osssssSosssSsso.........',
  '.......B.osSssSosSssso.b........',
  '......b...osssSossssS...B.......',
  '....Bb....oossSossSo.....b......',
  '............oooooo.......b......',
  '..........................bB....',
  '................................',
  '................................',
  '................................',
]

/* Tripod A planted, tripod B at the top of its step. */
const BEETLE_1: PixelFrame = [
  '................................',
  '...........om......mo...........',
  '...........aamooo.maa...........',
  '..........a..aBbboa..a..........',
  '.........c...oehbeh...c.........',
  '.............ooooo.......bB.....',
  '............oPPpppo.....b.......',
  '...........oPPPppppo.B..b.......',
  '.....Bbb.B.oPPPppppo..bB........',
  '........Bbbooooooooobb..........',
  '..........oSSSSosssso...........',
  '...Bb...ooShSSSossssso..........',
  '.....b.BoShhhSSosssssso.........',
  '......BboSShSSSossssssoB........',
  '........oSSSSSSossssssS.bBbbB...',
  '.......osSSSSSSosssssso.........',
  '........osSsSsSosssssso.........',
  '........osssssSosssssSo.........',
  '........osSsssSosssssso.........',
  '........osssssSosssSssob........',
  '........bosSssSosSssso..B.......',
  '.......B..osssSossssS....bbB....',
  '......b...oossSossSo............',
  '......b.....oooooo..............',
  '....Bb..........................',
  '................................',
  '................................',
  '................................',
]

/* Tripod B planted, tripod A swinging forward. */
const BEETLE_2: PixelFrame = [
  '................................',
  '...........om......mo...........',
  '...........aamooo.maa...........',
  '.........ca..aBbboa..ac.........',
  '.............oehbeh......bB.....',
  '.............ooooo......b.......',
  '.....Bb.....oPPpppo.....b.......',
  '.......b...oPPPppppo.B.B........',
  '........BbBoPPPppppo.bb.........',
  '..........booooooooob...........',
  '...Bb.....oSSSSosssso...........',
  '.....b..ooShSSSossssso..........',
  '......BBoShhhSSosssssso.B.bbB...',
  '........oSShSSSossssssobbB......',
  '........oSSSSSSossssssS.........',
  '.......osSSSSSSosssssso.........',
  '........osSsSsSosssssso.........',
  '........osssssSosssssSo.........',
  '........osSsssSosssssso.........',
  '........osssssSosssSssobB.......',
  '.......B.osSssSosSssso...bbB....',
  '......b...osssSossssS...........',
  '....Bb....oossSossSo............',
  '............oooooo..............',
  '................................',
  '................................',
  '................................',
  '................................',
]

/* Tripod B planted, tripod A at the top of its step. */
const BEETLE_3: PixelFrame = [
  '................................',
  '...........om......mo...........',
  '.........caaamooo.maaac.........',
  '.............aBbboa.............',
  '.....Bb......oehbeh.............',
  '.......b.....ooooo..............',
  '.......b....oPPpppo.............',
  '........BB.oPPPppppo....bbB.....',
  '.........bboPPPppppo.BbB........',
  '...........ooooooooobb..........',
  '..........oSSSSosssso......bB...',
  '........ooShSSSossssso....b.....',
  '.......BoShhhSSossssssoBbB......',
  '...BbbBboSShSSSossssssob........',
  '........oSSSSSSossssssS.........',
  '.......osSSSSSSosssssso.........',
  '........osSsSsSosssssso.........',
  '........osssssSosssssSo.........',
  '........osSsssSosssssso.........',
  '.......BosssssSosssSssob........',
  '....Bbb..osSssSosSssso..B.......',
  '..........osssSossssS....b......',
  '..........oossSossSo.....b......',
  '............oooooo........bB....',
  '................................',
  '................................',
  '................................',
  '................................',
]

/* ------------------------------------------------------------------ */
/* Hovering dragonfly                                                 */
/* ------------------------------------------------------------------ */

const DRAGONFLY_PALETTE: PixelPalette = {
  o: '#1f2a2e', // outline
  b: '#2c4a4a', // body dark teal
  B: '#3f6b66', // body mid teal
  h: '#7fb0a0', // body highlight
  e: '#3a6b8c', // compound eye
  E: '#9fd6d0', // eye glint
  w: '#c8e0da', // wing membrane
  W: '#9fc4bc', // wing shade near the root
  v: '#6b8a84', // wing veins and edge
  t: '#2a3a3a', // tail tip
}

/* Wings swept forward, body at the top of the hover. */
const DRAGONFLY_0: PixelFrame = [
  '................................',
  '................................',
  '............oo...oo.............',
  '...........oEEo.oEEo............',
  '........vv.oeeo.oeeo..vv........',
  '...vbbvvwwvoeeobbeeovvwwvvbbv...',
  'vvvvvwvwwvwwoovvvooWwwvwwvwvvvvv',
  'vwwwwwvwvvwvvooooovvvwvvwvwwwwwv',
  '.vvvvvvv.bbvoBhBBBo.vbb.vvvvvvv.',
  '........bv.bbhBhBBobb.vb........',
  'v.........bboBBBBBo.bb.........v',
  'vvvvvvvvbb..bBBBBBob..bbvvvvvvvv',
  '.wwwwwvbvvbb.ooooo..bbvvbvwwwww.',
  '.vvbbwvwwbv...hhoo...vbwwvwbbvv.',
  '...vvvwwbwvvvvhBBBvvvvwbwwvvv...',
  '.v....vvvwwWWvhBoovWWwwvvv....v.',
  '.........vvvvvhBBBvvvvv.........',
  '..............hBoo..............',
  '..............hBBB..............',
  '..............hBoo..............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............tt...............',
  '................................',
]

/* Wings passing through the middle of the stroke. */
const DRAGONFLY_1: PixelFrame = [
  '................................',
  '............oo...oo.............',
  '...........oEEo.oEEo............',
  '...........oeeo.oeeo............',
  '...b...vvvvoeeobbeeovvvvv...b...',
  '.vvvbvvwwwwwoov..ooWwwwwwvvbvvv.',
  'vwwwwwvwwvwvvooooovvvwvwwvwwwwwv',
  'vvvvvwvwvbbvoBhBBBo.vbbvwvwvvvvv',
  '.....vvvbv.bbhBhBBobb.vbvvv.....',
  '..........bboBBBBBo.bb..........',
  'vvvvvv..bb..bBBBBBob..bb..vvvvvv',
  'vwwwwwvb.vbb.ooooo..bbv.bvwwwwwv',
  '.vvbbwvwvbv...hhoo...vbvwvwbbvv.',
  '....vvvwbvwvvvhBBBvvvwvbwvvv....',
  '..v....wwwwwWWhBooWWwwwww....v..',
  '.......vvvvvvvhBBBvvvvvvv.......',
  '..............hBoo..............',
  '..............hBBB..............',
  '..............hBoo..............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............tt...............',
  '................................',
  '................................',
]

/* Wings level, body descending. */
const DRAGONFLY_2: PixelFrame = [
  '................................',
  '................................',
  '............oo...oo.............',
  '...........oEEo.oEEo............',
  '...........oeeo.oeeo............',
  '.......vvvvoeeobbeeovvvvv.......',
  '...vbvvwwwwwoov..ooWwwwwwvvbv...',
  '..vvvwvwwvwvvooooovvvwvwwvwvvv..',
  '.vwwwwvwvbbvoBhBBBo.vbbvwvwwwwv.',
  '.vvvvvvvbv.bbhBhBBobb.vbvvvvvvv.',
  '..........bboBBBBBo.bb..........',
  '........bb..bBBBBBob..bb........',
  '.vvvvvvb.vbb.ooooo..bbv.bvvvvvv.',
  '.vwwwwvwvbv...hhoo...vbvwvwwwwv.',
  '..vvbwvwbvwvvvhBBBvvvwvbwvwbvv..',
  '....vvvwwwwwWWhBooWWwwwwwvvv....',
  '...v...vvvvvvvhBBBvvvvvvv...v...',
  '..............hBoo..............',
  '..............hBBB..............',
  '..............hBoo..............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............tt...............',
  '................................',
]

/* Wings swept back, body at the bottom of the hover. */
const DRAGONFLY_3: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '............oo...oo.............',
  '...........oEEo.oEEo............',
  '...........oeeo.oeeo............',
  '.......vvvvoeeobbeeovvvvv.......',
  '.......wwwwwoov..ooWwwwww.......',
  '..vbbvvwwvwvvooooovvvwvwwvvbbv..',
  '.vvvvwvwvbbvoBhBBBo.vbbvwvwvvvv.',
  'vwwwwwvvbv.bbhBhBBobb.vbvvwwwwwv',
  'vvvvv.....bboBBBBBo.bb.....vvvvv',
  '........bb..bBBBBBob..bb........',
  '.....vvb.vbb.ooooo..bbv.bvv.....',
  'vvvvvwvwvbv...hhoo...vbvwvwvvvvv',
  'vwwwbwvwbvwvvvhBBBvvvwvbwvwbwwwv',
  '..vbvvvwwwwwWWhBooWWwwwwwvvvbv..',
  '.......vvvvvvvhBBBvvvvvvv.......',
  '..............hBoo..............',
  '..............hBBB..............',
  '..............hBoo..............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............tt...............',
]

/* Wings passing back through the middle. */
const DRAGONFLY_4: PixelFrame = [
  '................................',
  '................................',
  '............oo...oo.............',
  '...........oEEo.oEEo............',
  '...........oeeo.oeeo............',
  '.........vvoeeobbeeovvv.........',
  '......vvvwwWoov..ooWWwwvvv......',
  '..vbbvvwwvwvvooooovvvwvwwvvbbv..',
  '.vvvvwvwwbbvoBhBBBo.vbbwwvwvvvv.',
  '.wwwwwvwbv.bbhBhBBobb.vbwvwwwww.',
  'vvvvvvvv..bboBBBBBo.bb..vvvvvvvv',
  'v.......bb..bBBBBBob..bb.......v',
  '.......b..bb.ooooo..bb..b.......',
  '.vvvvvvv.bv...hhoo...vb.vvvvvvv.',
  'vwwwwwvwbvwvvvhBBBvvvwvbwvwwwwwv',
  '..vvbbwvwwwwwWhBooWwwwwwvwbbvv..',
  '.....vvvwwvvvvhBBBvvvvwwvvv.....',
  '...v....vv....hBoo....vv....v...',
  '..............hBBB..............',
  '..............hBoo..............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............tt...............',
  '................................',
]

/* Wings level again, body rising. */
const DRAGONFLY_5: PixelFrame = [
  '................................',
  '............oo...oo.............',
  '...........oEEo.oEEo............',
  '...........oeeo.oeeo............',
  '.......vvvvoeeobbeeovvvvv.......',
  '.......wwwwwoov..ooWwwwww.......',
  '..vbbvvwwvwvvooooovvvwvwwvvbbv..',
  '.vvvvwvwvbbvoBhBBBo.vbbvwvwvvvv.',
  'vwwwwwvvbv.bbhBhBBobb.vbvvwwwwwv',
  'vvvvv.....bboBBBBBo.bb.....vvvvv',
  '........bb..bBBBBBob..bb........',
  '.....vvb.vbb.ooooo..bbv.bvv.....',
  'vvvvvwvwvbv...hhoo...vbvwvwvvvvv',
  'vwwwbwvwbvwvvvhBBBvvvwvbwvwbwwwv',
  '..vbvvvwwwwwWWhBooWWwwwwwvvvbv..',
  '.......vvvvvvvhBBBvvvvvvv.......',
  '..............hBoo..............',
  '..............hBBB..............',
  '..............hBoo..............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............hB...............',
  '...............tt...............',
  '................................',
  '................................',
]

/* ------------------------------------------------------------------ */
/* Glowing firefly                                                    */
/* ------------------------------------------------------------------ */

const FIREFLY_PALETTE: PixelPalette = {
  o: '#1e1a20', // outline
  b: '#2a2430', // head and legs
  B: '#4a3f4a', // head highlight
  s: '#3a3040', // elytron dark
  S: '#5a4a5a', // elytron highlight
  p: '#c85a3a', // rust pronotum
  P: '#e88a5a', // pronotum highlight
  g: '#6b7a2a', // lantern dim
  G: '#b8d43a', // lantern mid
  y: '#f2f27a', // lantern bright
  Y: '#fffbd0', // lantern core
  e: '#141018', // eye
  w: '#d8e8e0', // wing membrane
  W: '#a8c0b8', // wing shade
  v: '#6a7a70', // wing veins and edge
  a: '#3a2f2a', // antenna
}

/* Wings open, lantern at its dimmest. */
const FIREFLY_0: PixelFrame = [
  '................................',
  '................................',
  '...........aa.ooo..aa...........',
  '..........a..aBbboa..a..........',
  'vvvvv........oebbe.........vvvvv',
  'vWvvwvv......ooooo.......vvwvvWv',
  '.vvvvvvvv...oPPpppo....vvvvvvvv.',
  '...vvvvvvvvoPPPooppo.vvvvvvvv...',
  '.....vvvvvvvoppoopo.vvvvvvv.....',
  '........vvvbbooooovbbvvv........',
  '.........bbssS....Sssbb.........',
  '........bssssS....Sssssb........',
  '.......oSsbbS......SbbsSo.......',
  '.......obbssS......Sssbbo.......',
  '......obSsssS......SsssSbo......',
  '......oSSssb........bssSSo......',
  '......oSSbbS..ooo...SbbSSo......',
  '.......ob...oogggoo....bo.......',
  '.......b....ogggggo.....b.......',
  '...........ogggggggo............',
  '...........oggGGGggo............',
  '...........ogggggggo............',
  '...........oggGGGggo............',
  '............ogggggo.............',
  '............oogggoo.............',
  '..............ooo...............',
  '................................',
  '................................',
]

/* Wings closing, lantern warming. */
const FIREFLY_1: PixelFrame = [
  '................................',
  '................................',
  '...........aa.ooo..aa...........',
  '..........a..aBbboa..a..........',
  '..vvvv.......oebbe........vvvv..',
  '..vWvvvv.....ooooo......vvvvWv..',
  '...vvvvvvv..oPPpppo...vvvvvvv...',
  '.....vvvvvvoPPPooppo.vvvvvv.....',
  '......vvvvvvoppoopo.vvvvvv......',
  '.........vvbbooooovbbvv.........',
  '.........bbssS....Sssbb.........',
  '........bssssS....Sssssb........',
  '.......oSsbbS......SbbsSo.......',
  '.......obbssS......Sssbbo.......',
  '......obSsssS.g.g..SsssSbo......',
  '......oSSssb.g.g.g..bssSSo......',
  '......oSSbbSg.ooo.g.SbbSSo......',
  '.......ob..gooGGGoog...bo.......',
  '.......b..g.oGGGGGo.g...b.......',
  '.........g.ogggggggo.g..........',
  '..........goGGyyyGGog...........',
  '.........g.ogggggggo.g..........',
  '..........goGGyyyGGog...........',
  '...........gogggggog............',
  '..........g.ooGGGoo.g...........',
  '...........g.gooog.g............',
  '............g.g.g.g.............',
  '...............g................',
]

/* Wings half folded, lantern mid-pulse. */
const FIREFLY_2: PixelFrame = [
  '................................',
  '...........aa.ooo..aa...........',
  '..........a..aBbboa..a..........',
  '.....vvv.....oebbe......vvv.....',
  '.....vvvv....ooooo.....vvvv.....',
  '......vvvvv.oPPpppo..vvvvv......',
  '.......vvvvoPPPooppovvvvv.......',
  '........vvvvoppoopo.vvvv........',
  '..........vbbooooovbbv..........',
  '.........bbssS....Sssbb.........',
  '........bssssS....Sssssb........',
  '.......oSsbbS......SbbsSo.......',
  '.......obbssS......Sssbbo.......',
  '......obSsssS.g.g..SsssSbo......',
  '......oSSssb.g.g.g..bssSSo......',
  '......oSSbbSg.ooo.g.SbbSSo......',
  '.......ob..gooGGGoog...bo.......',
  '.......b..g.oGGGGGo.g...b.......',
  '.........g.ogggggggo.g..........',
  '..........goGGyyyGGog...........',
  '.........g.ogggggggo.g..........',
  '..........goGGyyyGGog...........',
  '...........gogggggog............',
  '..........g.ooGGGoo.g...........',
  '...........g.gooog.g............',
  '............g.g.g.g.............',
  '...............g................',
  '................................',
]

/* Wings folded, lantern at its brightest with a full halo. */
const FIREFLY_3: PixelFrame = [
  '................................',
  '...........aa.ooo..aa...........',
  '..........a..aBbboa..a..........',
  '........vv...oebbe....vv........',
  '........Wwv..ooooo...vwW........',
  '........vvv.oPPpppo..vvv........',
  '.........vvoPPPooppovvv.........',
  '..........vvoppoopovvv..........',
  '...........bbooooo.bb...........',
  '.........bbssS....Sssbb.........',
  '........bssssS....Sssssb........',
  '.......oSsbbS......SbbsSo.......',
  '.......obbssS......Sssbbo.......',
  '......obSsssS.G.G..SsssSbo......',
  '......oSSssb.G.G.G..bssSSo......',
  '......oSSbbSG.ooo.G.SbbSSo......',
  '.......ob..GooyyyooG...bo.......',
  '.......b..G.oyyyyyo.G...b.......',
  '.........G.oGGGGGGGo.G..........',
  '..........GoyyYYYyyoG...........',
  '.........G.oGGGYYGGo.G..........',
  '..........GoyyYYYyyoG...........',
  '...........GoGGGGGoG............',
  '..........G.ooyyyoo.G...........',
  '...........G.GoooG.G............',
  '............G.G.G.G.............',
  '...............G................',
  '................................',
]

/* Wings half open, lantern cooling. */
const FIREFLY_4: PixelFrame = [
  '................................',
  '................................',
  '...........aa.ooo..aa...........',
  '..........a..aBbboa..a..........',
  '.....vvv.....oebbe......vvv.....',
  '.....vvvv....ooooo.....vvvv.....',
  '......vvvvv.oPPpppo..vvvvv......',
  '.......vvvvoPPPooppovvvvv.......',
  '........vvvvoppoopo.vvvv........',
  '..........vbbooooovbbv..........',
  '.........bbssS....Sssbb.........',
  '........bssssS....Sssssb........',
  '.......oSsbbS......SbbsSo.......',
  '.......obbssS......Sssbbo.......',
  '......obSsssS.g.g..SsssSbo......',
  '......oSSssb.g.g.g..bssSSo......',
  '......oSSbbSg.ooo.g.SbbSSo......',
  '.......ob..gooGGGoog...bo.......',
  '.......b..g.oGGGGGo.g...b.......',
  '.........g.ogggggggo.g..........',
  '..........goGGyyyGGog...........',
  '.........g.ogggggggo.g..........',
  '..........goGGyyyGGog...........',
  '...........gogggggog............',
  '..........g.ooGGGoo.g...........',
  '...........g.gooog.g............',
  '............g.g.g.g.............',
  '...............g................',
]

/* Wings nearly open, lantern settling. */
const FIREFLY_5: PixelFrame = [
  '................................',
  '................................',
  '...........aa.ooo..aa...........',
  '..........a..aBbboa..a..........',
  '..vvvv.......oebbe........vvvv..',
  '..vWvvvv.....ooooo......vvvvWv..',
  '...vvvvvvv..oPPpppo...vvvvvvv...',
  '.....vvvvvvoPPPooppo.vvvvvv.....',
  '......vvvvvvoppoopo.vvvvvv......',
  '.........vvbbooooovbbvv.........',
  '.........bbssS....Sssbb.........',
  '........bssssS....Sssssb........',
  '.......oSsbbS......SbbsSo.......',
  '.......obbssS......Sssbbo.......',
  '......obSsssS.g.g..SsssSbo......',
  '......oSSssb.g.g.g..bssSSo......',
  '......oSSbbSg.ooo.g.SbbSSo......',
  '.......ob..gooGGGoog...bo.......',
  '.......b..g.oGGGGGo.g...b.......',
  '.........g.ogggggggo.g..........',
  '..........goGGyyyGGog...........',
  '.........g.ogggggggo.g..........',
  '..........goGGyyyGGog...........',
  '...........gogggggog............',
  '..........g.ooGGGoo.g...........',
  '...........g.gooog.g............',
  '............g.g.g.g.............',
  '...............g................',
]

export const bugSprites: {
  monarch: PixelSprite
  beetle: PixelSprite
  dragonfly: PixelSprite
  firefly: PixelSprite
} = {
  monarch: {
    palette: MONARCH_PALETTE,
    frames: [MONARCH_0, MONARCH_1, MONARCH_2, MONARCH_3, MONARCH_4, MONARCH_5],
    frameMs: 90,
  },
  beetle: {
    palette: BEETLE_PALETTE,
    frames: [BEETLE_0, BEETLE_1, BEETLE_2, BEETLE_3],
    frameMs: 140,
  },
  dragonfly: {
    palette: DRAGONFLY_PALETTE,
    frames: [DRAGONFLY_0, DRAGONFLY_1, DRAGONFLY_2, DRAGONFLY_3, DRAGONFLY_4, DRAGONFLY_5],
    frameMs: 70,
  },
  firefly: {
    palette: FIREFLY_PALETTE,
    frames: [FIREFLY_0, FIREFLY_1, FIREFLY_2, FIREFLY_3, FIREFLY_4, FIREFLY_5],
    frameMs: 130,
  }
}
