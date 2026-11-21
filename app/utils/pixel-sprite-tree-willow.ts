/**
 * Willow tree sprite for the pixel world.
 *
 * The sprite is a 32x48 literal character grid: one string per row, each
 * character mapped through the palette below, '.' transparent. The renderer
 * anchors the sprite at its base row and centers it over its footprint, so
 * the root flare sits on the ground and the shadow band carpets around it.
 *
 * Read: a rounded crown dome with light falling from the top left, a dark
 * underside band at the rim, and two drooping strand curtains hanging from
 * the dome shoulders past a visible bark trunk. The curtains carry their
 * highlights on the lit outer edge and taper to dark tips.
 *
 * The four sway frames bend rather than translate: in a breeze the crown
 * leans one pixel while the curtain tips stay planted, and in the gust the
 * crown leans two while the curtains shear to one. The trunk never moves,
 * so the tree stays rooted. `frameMs` is how long one frame is held.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

const WILLOW_PALETTE: PixelPalette = {
  o: '#241f2b', // outline
  b: '#6fae62', // mid leaf
  n: '#8cc47a', // light-mid leaf
  h: '#a8d894', // light catch
  l: '#c8e8b0', // silvery glint
  d: '#4f8a4a', // shaded leaf
  D: '#356b3a', // deep underside
  t: '#7a5a3a', // trunk bark
  k: '#9a7448', // bark light
  T: '#553d28', // trunk shade
  s: '#2c4a36', // ground shadow
}

const WILLOW_CALM: PixelFrame = [
  '................................',
  '................................',
  '..............ohno..............',
  '.............ohnnno.............',
  '............ohnnnnlo............',
  '...........ohnnnnbnbo...........',
  '..........onnnnnnbnbbo..........',
  '.........onnnnnbbnbbbbo.........',
  '........onnnnnnnnbbbbbbo........',
  '.......onnnnnnnnbbbbbbbbo.......',
  '......onnnnbnbblbbbbbbbbbo......',
  '.....onnnnbbnbbbbbbbbbbbbbo.....',
  '.....onnbnbnbbbbbbbbbbbbbdo.....',
  '....onnnnbnbbbbbbbbbbbbddddo....',
  '....onbnnbbbbbbbbbbbbbddbddo....',
  '....olbbbbbbbbbbbbbbdbdddddo....',
  '....obbbbbbbbbbbbbbbdddddddo....',
  '....obbbbbbbbbbbbbbbbddddddo....',
  '....olbbbbbbbbdbbddddddddddo....',
  '.....obbbbbbbbdbbdddddddDDo.....',
  '......obbdbbddddddDDDDDDDo......',
  '........odbddddddDDDDDDo........',
  '..........oddddDDDDDDo..........',
  '.....nbbbdn..otTTTo..n.dbbbh....',
  '.....nddddn..oktTTo..n.dbbbn....',
  '......nnnbd..oktTTo...dbbdh.....',
  '.......hbdd..otttTo...dbdn......',
  '.......hbdd..okTtTo...dnbn......',
  '.......nddd..oktTTo...ddbh......',
  '.......nbbd..ottTTo...dbbn......',
  '.......nndd..otTTTo..dbdn.......',
  '........nbbd.otTTTo.dbdn........',
  '.......ndbd..otttTo.dbbh........',
  '.......nbbd..oktTTo.dbnn........',
  '.......dDDd..oktTTo.dDDd........',
  '.......DDDD..okTTTo.dDDD........',
  '........ddDD.otTtToDddD.........',
  '.............otTtTo.............',
  '.............ottTTo.............',
  '.............okTTTo.............',
  '.............otTtTo.............',
  '............ottttTTo............',
  '............okktTTTo............',
  '...........ottttTTTTo...........',
  '..........ottttttTTTTo..........',
  '.......ssssssssssssssssss.......',
  '.....ssssssssssssssssssssss.....',
  '...ssssssssssssssssssssssssss...',
]

const WILLOW_BREEZE_RIGHT: PixelFrame = [
  '................................',
  '................................',
  '...............ohno.............',
  '..............ohnnno............',
  '.............ohnnnnlo...........',
  '............ohnnnnbnbo..........',
  '...........onnnnnnbnbbo.........',
  '..........onnnnnbbnbbbbo........',
  '.........onnnnnnnnbbbbbbo.......',
  '........onnnnnnnnbbbbbbbbo......',
  '.......onnnnbnbblbbbbbbbbbo.....',
  '......onnnnbbnbbbbbbbbbbbbbo....',
  '......onnbnbnbbbbbbbbbbbbbdo....',
  '.....onnnnbnbbbbbbbbbbbbddddo...',
  '.....onbnnbbbbbbbbbbbbbddbddo...',
  '.....olbbbbbbbbbbbbbbdbdddddo...',
  '.....obbbbbbbbbbbbbbbdddddddo...',
  '.....obbbbbbbbbbbbbbbbddddddo...',
  '.....olbbbbbbbbdbbddddddddddo...',
  '......obbbbbbbbdbbdddddddDDo....',
  '.......obbdbbddddddDDDDDDDo.....',
  '.........odbddddddDDDDDDo.......',
  '...........oddddDDDDDDo.........',
  '......nbbbdn.otTTTo...n.dbbbh...',
  '......nddddn.oktTTo...n.dbbbn...',
  '.......nnnbd.oktTTo....dbbdh....',
  '........hbdd.otttTo....dbdn.....',
  '........hbdd.okTtTo....dnbn.....',
  '.......nddd..oktTTo...ddbh......',
  '.......nbbd..ottTTo...dbbn......',
  '.......nndd..otTTTo..dbdn.......',
  '........nbbd.otTTTo.dbdn........',
  '.......ndbd..otttTo.dbbh........',
  '.......nbbd..oktTTo.dbnn........',
  '.......dDDd..oktTTo.dDDd........',
  '.......DDDD..okTTTo.dDDD........',
  '........ddDD.otTtToDddD.........',
  '.............otTtTo.............',
  '.............ottTTo.............',
  '.............okTTTo.............',
  '.............otTtTo.............',
  '............ottttTTo............',
  '............okktTTTo............',
  '...........ottttTTTTo...........',
  '..........ottttttTTTTo..........',
  '.......ssssssssssssssssss.......',
  '.....ssssssssssssssssssssss.....',
  '...ssssssssssssssssssssssssss...',
]

const WILLOW_GUST: PixelFrame = [
  '................................',
  '................................',
  '................ohno............',
  '...............ohnnno...........',
  '..............ohnnnnlo..........',
  '.............ohnnnnbnbo.........',
  '............onnnnnnbnbbo........',
  '...........onnnnnbbnbbbbo.......',
  '..........onnnnnnnnbbbbbbo......',
  '.........onnnnnnnnbbbbbbbbo.....',
  '........onnnnbnbblbbbbbbbbbo....',
  '.......onnnnbbnbbbbbbbbbbbbbo...',
  '.......onnbnbnbbbbbbbbbbbbbdo...',
  '......onnnnbnbbbbbbbbbbbbddddo..',
  '......onbnnbbbbbbbbbbbbbddbddo..',
  '......olbbbbbbbbbbbbbbdbdddddo..',
  '......obbbbbbbbbbbbbbbdddddddo..',
  '......obbbbbbbbbbbbbbbbddddddo..',
  '......olbbbbbbbbdbbddddddddddo..',
  '.......obbbbbbbbdbbdddddddDDo...',
  '........obbdbbddddddDDDDDDDo....',
  '..........odbddddddDDDDDDo......',
  '............oddddDDDDDDo........',
  '.......nbbbdnotTTTo....n.dbbbh..',
  '.......nddddnoktTTo....n.dbbbn..',
  '........nnnbdoktTTo.....dbbdh...',
  '.........hbddotttTo.....dbdn....',
  '.........hbddokTtTo.....dnbn....',
  '........nddd.oktTTo....ddbh.....',
  '........nbbd.ottTTo....dbbn.....',
  '........nndd.otTTTo...dbdn......',
  '.........nbbdotTTTo..dbdn.......',
  '........ndbd.otttTo..dbbh.......',
  '........nbbd.oktTTo..dbnn.......',
  '........dDDd.oktTTo..dDDd.......',
  '........DDDD.okTTTo..dDDD.......',
  '.........ddDDotTtTo.DddD........',
  '.............otTtTo.............',
  '.............ottTTo.............',
  '.............okTTTo.............',
  '.............otTtTo.............',
  '............ottttTTo............',
  '............okktTTTo............',
  '...........ottttTTTTo...........',
  '..........ottttttTTTTo..........',
  '.......ssssssssssssssssss.......',
  '.....ssssssssssssssssssssss.....',
  '...ssssssssssssssssssssssssss...',
]

const WILLOW_BREEZE_LEFT: PixelFrame = [
  '................................',
  '................................',
  '.............ohno...............',
  '............ohnnno..............',
  '...........ohnnnnlo.............',
  '..........ohnnnnbnbo............',
  '.........onnnnnnbnbbo...........',
  '........onnnnnbbnbbbbo..........',
  '.......onnnnnnnnbbbbbbo.........',
  '......onnnnnnnnbbbbbbbbo........',
  '.....onnnnbnbblbbbbbbbbbo.......',
  '....onnnnbbnbbbbbbbbbbbbbo......',
  '....onnbnbnbbbbbbbbbbbbbdo......',
  '...onnnnbnbbbbbbbbbbbbddddo.....',
  '...onbnnbbbbbbbbbbbbbddbddo.....',
  '...olbbbbbbbbbbbbbbdbdddddo.....',
  '...obbbbbbbbbbbbbbbdddddddo.....',
  '...obbbbbbbbbbbbbbbbddddddo.....',
  '...olbbbbbbbbdbbddddddddddo.....',
  '....obbbbbbbbdbbdddddddDDo......',
  '.....obbdbbddddddDDDDDDDo.......',
  '.......odbddddddDDDDDDo.........',
  '.........oddddDDDDDDo...........',
  '....nbbbdn...otTTTo.n.dbbbh.....',
  '....nddddn...oktTTo.n.dbbbn.....',
  '.....nnnbd...oktTTo..dbbdh......',
  '......hbdd...otttTo..dbdn.......',
  '......hbdd...okTtTo..dnbn.......',
  '.......nddd..oktTTo...ddbh......',
  '.......nbbd..ottTTo...dbbn......',
  '.......nndd..otTTTo..dbdn.......',
  '........nbbd.otTTTo.dbdn........',
  '.......ndbd..otttTo.dbbh........',
  '.......nbbd..oktTTo.dbnn........',
  '.......dDDd..oktTTo.dDDd........',
  '.......DDDD..okTTTo.dDDD........',
  '........ddDD.otTtToDddD.........',
  '.............otTtTo.............',
  '.............ottTTo.............',
  '.............okTTTo.............',
  '.............otTtTo.............',
  '............ottttTTo............',
  '............okktTTTo............',
  '...........ottttTTTTo...........',
  '..........ottttttTTTTo..........',
  '.......ssssssssssssssssss.......',
  '.....ssssssssssssssssssssss.....',
  '...ssssssssssssssssssssssssss...',
]

export const willowSprite: PixelSprite = {
  palette: WILLOW_PALETTE,
  frames: [WILLOW_CALM, WILLOW_BREEZE_RIGHT, WILLOW_GUST, WILLOW_BREEZE_LEFT],
  frameMs: 1100,
}
