/**
 * High-resolution tree and undergrowth sprites for Willow Hollow.
 *
 * Every sprite is authored as a literal character grid, one string per row,
 * with each character mapped through that sprite's own palette. '.' is
 * transparent. The renderer anchors each sprite at its base row and centers
 * it over its footprint, so the trunk or boulder base sits on the ground.
 *
 * The trees are built for a 3/4 read: light falls from the top left, shade
 * piles into the bottom right, and each canopy is a union of overlapping
 * boughs rather than a flat silhouette. The pine stacks four needle tiers
 * over a visible trunk; the willow drapes strands from a rounded crown; the
 * oak spreads a broad lobed canopy over a dark underside and a forked trunk.
 * The bush clusters three leaf lobes with berries; the rock is a faceted
 * boulder with moss and a grounded base.
 *
 * Frame counts and tempos differ per sprite so nothing in the world moves in
 * lockstep. `frameMs` is how long one frame is held before advancing.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/* ------------------------------------------------------------------ */
/* Palettes                                                            */
/* ------------------------------------------------------------------ */

const PINE_PALETTE: PixelPalette = {
  o: '#241f2b', // outline
  b: '#3f9e68', // mid needle
  n: '#58b87c', // light-mid needle
  h: '#7fd39a', // light catch
  l: '#a8e6b8', // needle glint
  d: '#2a7449', // shaded needle
  D: '#1d5735', // deep underside
  t: '#8a5a34', // trunk bark
  k: '#b07a48', // bark light
  T: '#5f3d24', // trunk shade
  r: '#6b4a2e', // root
  s: '#2c4a36', // ground shadow
}

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
  s: '#2c4a36', // ground shadow
}

const ROCK_PALETTE: PixelPalette = {
  o: '#241f2b', // outline
  r: '#b8b2c4', // sunlit facet
  R: '#8e879c', // front facet
  d: '#6a6478', // shaded facet
  D: '#4a4558', // deep facet
  h: '#d8d4e4', // facet glint
  m: '#6fae62', // moss
  M: '#4c8a48', // moss shade
  g: '#79cf9d', // grass tuft
  s: '#2c4a36', // ground shadow
}

/* ------------------------------------------------------------------ */
/* Pine: 32x48, four sway frames                                       */
/* ------------------------------------------------------------------ */

const PINE_CALM: PixelFrame = [
  '...............oo...............',
  '..............onno..............',
  '..............ohndo.............',
  '.............ohnbdo.............',
  '.............ohbbndo............',
  '............ohbbnbdo............',
  '............ohbnbbndo...........',
  '...........ohdnbbDddo...........',
  '...........ohdbbbDdDdo..........',
  '.......ohhbhlblbhnblbDhho.......',
  '.......ohhnhDbbnhlbbnhhho.......',
  '......ohhnhhhhdnbbhnhhhhno......',
  '......ohddhhhnhhhhnhhhdddo......',
  '......ohnbbdddbbbhddbddDdo......',
  '.....ohhbbbnhbblnhbbbnhdddo.....',
  '.....ohbbbdnbbDdnbbDlnbdDdo.....',
  '.....ohbbDdbbbDdbbbDDbbDddo.....',
  '....ohlbhnbbbhDbbblnbbbhdDdo....',
  '....ohbnhbbbnhbbbnhbbblhDddo....',
  '..ohhbdnblbdlbbbdnlDbdnbbbDhho..',
  '..ohhndbbbDdbbbDdbbbDdbDbDhhho..',
  '.ohhnhhhhhnbbbDnDblhnbbhnhhhhno.',
  '.odddlddnhhhhnhhhhnhhhhnhdddddo.',
  '.ohnbbbddddddnbdbddddbddbbbdDdo.',
  '.ohbbbDdbDlDdbbbDdbbbDdbbbDDddo.',
  '.ohbbhnbbbhnbDbDDbbbhnbbbhndddo.',
  '.ohbnhDbDnhlbbDhbbbnhbbbnhbdDdo.',
  '.ohdnbbbdnbbbdnbbbdnbbldnbbDddo.',
  '.ohdbbbllbbbDdbbbDdbbbDdbbbdddo.',
  '.ohhbbhnbbbhnbbbhnbbbhnbbbhdhho.',
  'ohhhbnhbDbnhbbbnhbbbDhbbbnlbhhno',
  'ohhhnhbbbdnbbbdnbbldnbDbdlhhhnho',
  'ohdddbhhnhhhhnhhhhnhhhhnhhdddddo',
  'ohhlbbddddbddnddddddlbddbbbldddo',
  'ohhbbbDhlbbnhbbbnhbbbnhbbbnhdDdo',
  'ohbbbdnlbbdnbbldDlbbdnbbbdnbDddo',
  'DDDddDDDddDDDddddddDDDddDDDddDDD',
  'oDo..oDo..oDooktkTooDo..oDo..oDo',
  '.o....o....o.okttTo.o....o....o.',
  '............oktttkTo............',
  '............oktkttTo............',
  '............okttttTo............',
  '............okTTktTo............',
  '............okkTttTo............',
  '...........okrttrktTo...........',
  '.......ssssokttrttrTossss.......',
  '......sssssrrkrttrkrrsssss......',
  '.....ssssssokrttrttTossssss.....',
]

const PINE_BREEZE_RIGHT: PixelFrame = [
  '................oo..............',
  '...............onno.............',
  '...............ohbdo............',
  '..............ohbbdo............',
  '..............ohbnbdo...........',
  '.............ohbnbbdo...........',
  '.............ohnbbnbdo..........',
  '............ohnbbbdddo..........',
  '............ohbbbDdDddo.........',
  '........ohbhlblbhnblbhhhho......',
  '........ohnhDbbnhlbbnhhhho......',
  '.......ohnhhhhdnbbhnhhhhndo.....',
  '.......oddhhhnhhhhnhhhddddo.....',
  '.......ohbbdddbbbhddbdhDddo.....',
  '......ohbbbnhbblnhbbbnhbdDdo....',
  '......ohbbdnbbDdnbbDlnbbDddo....',
  '......ohbDdbbbDdbbbDDbbbdddo....',
  '.....ohbhnbbbhDbbblnbbbhnDddo...',
  '.....ohnhbbbnhbbbnhbbblhldddo...',
  '..ohhbdnblbdlbbbdnlDbdnbbbDhho..',
  '..ohhndbbbDdbbbDdbbbDdbDbDhhho..',
  '.ohhnhhhhhnbbbDnDblhnbbhnhhhhno.',
  '.odddlddnhhhhnhhhhnhhhhnhdddddo.',
  '.ohnbbbddddddnbdbddddbddbbbdDdo.',
  '.ohbbbDdbDlDdbbbDdbbbDdbbbDDddo.',
  '.ohbbhnbbbhnbDbDDbbbhnbbbhndddo.',
  '.ohbnhDbDnhlbbDhbbbnhbbbnhbdDdo.',
  '.ohdnbbbdnbbbdnbbbdnbbldnbbDddo.',
  '.ohdbbbllbbbDdbbbDdbbbDdbbbdddo.',
  '.ohhbbhnbbbhnbbbhnbbbhnbbbhdhho.',
  'ohhhbnhbDbnhbbbnhbbbDhbbbnlbhhno',
  'ohhhnhbbbdnbbbdnbbldnbDbdlhhhnho',
  'ohdddbhhnhhhhnhhhhnhhhhnhhdddddo',
  'ohhlbbddddbddnddddddlbddbbbldddo',
  'ohhbbbDhlbbnhbbbnhbbbnhbbbnhdDdo',
  'ohbbbdnlbbdnbbldDlbbdnbbbdnbDddo',
  'DDDddDDDddDDDddddddDDDddDDDddDDD',
  'oDo..oDo..oDooktkTooDo..oDo..oDo',
  '.o....o....o.okttTo.o....o....o.',
  '............oktttkTo............',
  '............oktkttTo............',
  '............okttttTo............',
  '............okTTktTo............',
  '............okkTttTo............',
  '...........okrttrktTo...........',
  '.......ssssokttrttrTossss.......',
  '......sssssrrkrttrkrrsssss......',
  '.....ssssssokrttrttTossssss.....',
]

const PINE_GUST: PixelFrame = [
  '.................oo.............',
  '................onno............',
  '................ohbdo...........',
  '...............ohbndo...........',
  '...............ohnbbdo..........',
  '..............ohnbbndo..........',
  '..............ohbbnbbdo.........',
  '.............ohbbbddDdo.........',
  '.............ohbbDdldddo........',
  '........ohbhlblbhnblbhhhho......',
  '........ohnhDbbnhlbbnhhhho......',
  '.......ohnhhhhdnbbhnhhhhndo.....',
  '.......oddhhhnhhhhnhhhddddo.....',
  '.......ohbbdddbbbhddbdhDddo.....',
  '......ohbbbnhbblnhbbbnhbdDdo....',
  '......ohbbdnbbDdnbbDlnbbDddo....',
  '......ohbDdbbbDdbbbDDbbbdddo....',
  '.....ohbhnbbbhDbbblnbbbhnDddo...',
  '.....ohnhbbbnhbbbnhbbblhldddo...',
  '..ohhbdnblbdlbbbdnlDbdnbbbDhho..',
  '..ohhndbbbDdbbbDdbbbDdbDbDhhho..',
  '.ohhnhhhhhnbbbDnDblhnbbhnhhhhno.',
  '.odddlddnhhhhnhhhhnhhhhnhdddddo.',
  '.ohnbbbddddddnbdbddddbddbbbdDdo.',
  '.ohbbbDdbDlDdbbbDdbbbDdbbbDDddo.',
  '.ohbbhnbbbhnbDbDDbbbhnbbbhndddo.',
  '.ohbnhDbDnhlbbDhbbbnhbbbnhbdDdo.',
  '.ohdnbbbdnbbbdnbbbdnbbldnbbDddo.',
  '.ohdbbbllbbbDdbbbDdbbbDdbbbdddo.',
  '.ohhbbhnbbbhnbbbhnbbbhnbbbhdhho.',
  'ohhhbnhbDbnhbbbnhbbbDhbbbnlbhhno',
  'ohhhnhbbbdnbbbdnbbldnbDbdlhhhnho',
  'ohdddbhhnhhhhnhhhhnhhhhnhhdddddo',
  'ohhlbbddddbddnddddddlbddbbbldddo',
  'ohhbbbDhlbbnhbbbnhbbbnhbbbnhdDdo',
  'ohbbbdnlbbdnbbldDlbbdnbbbdnbDddo',
  'DDDddDDDddDDDddddddDDDddDDDddDDD',
  'oDo..oDo..oDooktkTooDo..oDo..oDo',
  '.o....o....o.okttTo.o....o....o.',
  '............oktttkTo............',
  '............oktkttTo............',
  '............okttttTo............',
  '............okTTktTo............',
  '............okkTttTo............',
  '...........okrttrktTo...........',
  '.......ssssokttrttrTossss.......',
  '......sssssrrkrttrkrrsssss......',
  '.....ssssssokrttrttTossssss.....',
]

const PINE_BREEZE_LEFT: PixelFrame = [
  '..............oo................',
  '.............onno...............',
  '.............ohbdo..............',
  '............ohbndo..............',
  '............ohnbbdo.............',
  '...........ohnbbndo.............',
  '...........ohbbnbbdo............',
  '..........ohbdnbdDdo............',
  '..........ohDdbbbdddo...........',
  '.......ohhbhlblbhnblbDhho.......',
  '.......ohhnhDbbnhlbbnhhho.......',
  '......ohhnhhhhdnbbhnhhhhno......',
  '......ohddhhhnhhhhnhhhdddo......',
  '......ohnbbdddbbbhddbddDdo......',
  '.....ohhbbbnhbblnhbbbnhdddo.....',
  '.....ohbbbdnbbDdnbbDlnbdDdo.....',
  '.....ohbbDdbbbDdbbbDDbbDddo.....',
  '....ohlbhnbbbhDbbblnbbbhdDdo....',
  '....ohbnhbbbnhbbbnhbbblhDddo....',
  '..ohhbdnblbdlbbbdnlDbdnbbbDhho..',
  '..ohhndbbbDdbbbDdbbbDdbDbDhhho..',
  '.ohhnhhhhhnbbbDnDblhnbbhnhhhhno.',
  '.odddlddnhhhhnhhhhnhhhhnhdddddo.',
  '.ohnbbbddddddnbdbddddbddbbbdDdo.',
  '.ohbbbDdbDlDdbbbDdbbbDdbbbDDddo.',
  '.ohbbhnbbbhnbDbDDbbbhnbbbhndddo.',
  '.ohbnhDbDnhlbbDhbbbnhbbbnhbdDdo.',
  '.ohdnbbbdnbbbdnbbbdnbbldnbbDddo.',
  '.ohdbbbllbbbDdbbbDdbbbDdbbbdddo.',
  '.ohhbbhnbbbhnbbbhnbbbhnbbbhdhho.',
  'ohhhbnhbDbnhbbbnhbbbDhbbbnlbhhno',
  'ohhhnhbbbdnbbbdnbbldnbDbdlhhhnho',
  'ohdddbhhnhhhhnhhhhnhhhhnhhdddddo',
  'ohhlbbddddbddnddddddlbddbbbldddo',
  'ohhbbbDhlbbnhbbbnhbbbnhbbbnhdDdo',
  'ohbbbdnlbbdnbbldDlbbdnbbbdnbDddo',
  'DDDddDDDddDDDddddddDDDddDDDddDDD',
  'oDo..oDo..oDooktkTooDo..oDo..oDo',
  '.o....o....o.okttTo.o....o....o.',
  '............oktttkTo............',
  '............oktkttTo............',
  '............okttttTo............',
  '............okTTktTo............',
  '............okkTttTo............',
  '...........okrttrktTo...........',
  '.......ssssokttrttrTossss.......',
  '......sssssrrkrttrkrrsssss......',
  '.....ssssssokrttrttTossssss.....',
]

/* ------------------------------------------------------------------ */
/* Willow: 32x52, four sway frames                                     */
/* ------------------------------------------------------------------ */

const WILLOW_CALM: PixelFrame = [
  '................................',
  '................................',
  '..............ohdo..............',
  '............ohnnnndo............',
  '...........ohnlnnlndo...........',
  '..........ohhnnnhbnbdo..........',
  '.........ohbnnnnhnbbndo.........',
  '........ohhnlnlbnnbbbbdo........',
  '.......ohbnnnnbnllnnbbbdo.......',
  '......ohnlnnbnnbnlbbnnbndo......',
  '.....ohnhhbnhnnnbnbbbbbnndo.....',
  '....ohlhhhnlnbnlnnnbbnnbdDdo....',
  '....ohbhllnbnnlbhnbbbnbnnndo....',
  '...ohlhnbhnnbhbnnnbbbbbbddddo...',
  '...ohlhhhnnnnlnnnhbbbbbbddddo...',
  '..ohhhbhhnnbbnlnnlbbnbbbbdnddo..',
  '..ohhhhhhnnbbnnlhbbbbbnbddnddo..',
  '..ohnhnhhhbnnnbnbnbbbbbbbddddo..',
  '..ohhlhhhhnnnnnnhnbbnbbnnddddo..',
  '..ohbhhhbhnbnnnnnhbbbbbbdddddo..',
  '..ohhhlnbblnnnbnnhbbbbnndddndo..',
  '..ohnhhlhhlnblbnlnbbbbbbDddddo..',
  '...ohnnnbhlhlbbnnnbbbnbbnnddo...',
  '..hhdhbhhhnnnnnlnnbbbnbnbdDhhd..',
  '...hohlnhhlhnhlnnnnnbnbndddoh...',
  '..bb.ohhhhdhnbnnndbnbbbbddo.bb..',
  '..b...ohhdnnblnhdnbbbbnddo...b..',
  '..bd...hhdlnhnndnnnbbbhhd....bd.',
  '..b.....hohnlndnnnnnbdoh.....b..',
  '.hb.....b..ohdnlhnndo..b....hb..',
  '..b....bb...hhdDDhhd...bb....b..',
  '..bd...bd....hkttTh.....bd...bd.',
  '..b....b....bbktkTbb....b....b..',
  '..dd..hb....bokttTob...hb...dd..',
  '...DD..b....bdtttkTbd...b...DD..',
  '.......bd...bktkttTb....bd......',
  '.......b...hbktttthb....b.......',
  '.......b....bkttktTb....b.......',
  '.......b....dddtttdd....b.......',
  '......hbd...oDDttkDD...hbd......',
  '.......bb...oktkttTo...bb.......',
  '........d...okttttTo...d........',
  '........DD..okttktTo...DD.......',
  '............okktttTo............',
  '...........okttttktTo...........',
  '...........okttktttTo...........',
  '...........okkttttkTo...........',
  '...........oktttkttTo...........',
  '...........oktkttttTo...........',
  '.......ssssokttttktTossss.......',
  '......sssssokttktttTosssss......',
  '.....ssssssokkttttkTossssss.....',
]

const WILLOW_BREEZE_RIGHT: PixelFrame = [
  '................................',
  '................................',
  '...............ohdo.............',
  '.............ohnnnndo...........',
  '............ohlnnlnbdo..........',
  '...........ohnnnhbnbbdo.........',
  '..........ohnnnnhnbbnndo........',
  '.........ohnlnlbnnbbbbbdo.......',
  '........ohnnnnbnllnnbbbndo......',
  '.......ohlnnbnnbnlbbnnbnndo.....',
  '......ohhhbnhnnnbnbbbbbnnddo....',
  '.....ohhhhnlnbnlnnnbbnnbdDddo...',
  '.....ohhllnbnnlbhnbbbnbnnnbdo...',
  '....ohhnbhnnbhbnnnbbbbbbdddDdo..',
  '....ohhhhnnnnlnnnhbbbbbbdddbdo..',
  '...ohhbhhnnbbnlnnlbbnbbbbdndddo.',
  '...ohhhhhnnbbnnlhbbbbbnbddndbdo.',
  '...ohhnhhhbnnnbnbnbbbbbbbdddbdo.',
  '...ohlhhhhnnnnnnhnbbnbbnndddbdo.',
  '...ohhhhbhnbnnnnnhbbbbbbddddDdo.',
  '...ohhlnbblnnnbnnhbbbbnndddnddo.',
  '...ohhhlhhlnblbnlnbbbbbbDdddddo.',
  '....ohnnbhlhlbbnnnbbbnbbnndDdo..',
  '...hhdbhhhnnnnnlnnbbbnbnbdDnhhd.',
  '....hohnhhlhnhlnnnnnbnbnddddoh..',
  '...bb.ohhhdhnbnnndbnbbbbdddo.bb.',
  '...b...ohdnnblnhdnbbbbndDdo...b.',
  '...bd...hhdnhnndnnnbbbdhhd....bd',
  '...b.....hohlndnnnnnbddoh.....b.',
  '..hb.....b..ohnlhnnbdo..b....hb.',
  '...b....bb...hhdDDhhd...bb....b.',
  '...bd...bd...ohttToh.....bd...bd',
  '...b....b....bbtkTobb....b....b.',
  '...dd..hb....bkttTo.b...hb...dd.',
  '....DD..b...obdttkTobd...b...DD.',
  '........bd..obtkttTob....bd.....',
  '........b...hbttttThb....b......',
  '........b...obttktTob....b......',
  '........b...odddttTdd....b......',
  '.......hbd..okDDtkTDD...hbd.....',
  '........bb..oktkttTo....bb......',
  '.........d..okttttTo....d.......',
  '.........DD.okttktTo....DD......',
  '............okktttTo............',
  '...........okttttktTo...........',
  '...........okttktttTo...........',
  '...........okkttttkTo...........',
  '...........oktttkttTo...........',
  '...........oktkttttTo...........',
  '.......ssssokttttktTossss.......',
  '......sssssokttktttTosssss......',
  '.....ssssssokkttttkTossssss.....',
]

const WILLOW_GUST: PixelFrame = [
  '................................',
  '................................',
  '................ohdo............',
  '..............ohnnnbdo..........',
  '.............ohnnlnbbdo.........',
  '............ohnnhbnbbbdo........',
  '...........ohnnnhnbbnnbdo.......',
  '..........ohlnlbnnbbbbbbdo......',
  '.........ohnnnbnllnnbbbnndo.....',
  '........ohnnbnnbnlbbnnbnnddo....',
  '.......ohhbnhnnnbnbbbbbnndndo...',
  '......ohhhnlnbnlnnnbbnnbdDdddo..',
  '......ohllnbnnlbhnbbbnbnnnbDdo..',
  '.....ohnbhnnbhbnnnbbbbbbdddDndo.',
  '.....ohhhnnnnlnnnhbbbbbbdddbddo.',
  '....ohbhhnnbbnlnnlbbnbbbbdnddddo',
  '....ohhhhnnbbnnlhbbbbbnbddndbndo',
  '....ohnhhhbnnnbnbnbbbbbbbdddbddo',
  '....ohhhhhnnnnnnhnbbnbbnndddbddo',
  '....ohhhbhnbnnnnnhbbbbbbddddDddo',
  '....ohlnbblnnnbnnhbbbbnndddndddo',
  '....ohhlhhlnblbnlnbbbbbbDddddndo',
  '.....ohnbhlhlbbnnnbbbnbbnndDddo.',
  '....hhdhhhnnnnnlnnbbbnbnbdDnbhhd',
  '.....hohhhlhnhlnnnnnbnbndddddoh.',
  '....bb.ohhdhnbnnndbnbbbbddddo.bb',
  '....b...ohnnblnhdnbbbbndDndo...b',
  '....bd...hhdhnndnnnbbbdbhhd....b',
  '....b.....hohndnnnnnbdndoh.....b',
  '...hb.....b..ohlhnnbddo..b....hb',
  '....b....bb..ohhdDDhhd...bb....b',
  '....bd...bd..okhtTo.h.....bd...b',
  '....b....b...obbkTo.bb....b....b',
  '....dd..hb...obttTo..b...hb...dd',
  '.....DD..b..okbdtkTo.bd...b...DD',
  '.........bd.okbkttTo.b....bd....',
  '.........b..ohbtttTohb....b.....',
  '.........b..okbtktTo.b....b.....',
  '.........b..okdddtTodd....b.....',
  '........hbd.oktDDkToDD...hbd....',
  '.........bb.oktkttTo.....bb.....',
  '..........d.okttttTo.....d......',
  '..........DDokttktTo.....DD.....',
  '............okktttTo............',
  '...........okttttktTo...........',
  '...........okttktttTo...........',
  '...........okkttttkTo...........',
  '...........oktttkttTo...........',
  '...........oktkttttTo...........',
  '.......ssssokttttktTossss.......',
  '......sssssokttktttTosssss......',
  '.....ssssssokkttttkTossssss.....',
]

const WILLOW_BREEZE_LEFT: PixelFrame = [
  '................................',
  '................................',
  '.............ohdo...............',
  '...........ohnnnndo.............',
  '..........ohnnlnnldo............',
  '.........ohnhnnnhbndo...........',
  '........ohbbnnnnhnbbdo..........',
  '.......ohbhnlnlbnnbbbdo.........',
  '......ohhbnnnnbnllnnbbdo........',
  '.....ohhnlnnbnnbnlbbnnbdo.......',
  '....ohlnhhbnhnnnbnbbbbbndo......',
  '...ohhlhhhnlnbnlnnnbbnnbddo.....',
  '...ohnbhllnbnnlbhnbbbnbnndo.....',
  '..ohnlhnbhnnbhbnnnbbbbbbdddo....',
  '..ohllhhhnnnnlnnnhbbbbbbdddo....',
  '.ohhhhbhhnnbbnlnnlbbnbbbbdndo...',
  '.ohhhhhhhnnbbnnlhbbbbbnbddndo...',
  '.ohnnhnhhhbnnnbnbnbbbbbbbdddo...',
  '.ohhhlhhhhnnnnnnhnbbnbbnndddo...',
  '.ohhbhhhbhnbnnnnnhbbbbbbddddo...',
  '.ohhhhlnbblnnnbnnhbbbbnnddddo...',
  '.ohhnhhlhhlnblbnlnbbbbbbDdddo...',
  '..ohhnnnbhlhlbbnnnbbbnbbnndo....',
  '.hhdhhbhhhnnnnnlnnbbbnbnbdhhd...',
  '..hohblnhhlhnhlnnnnnbnbnddoh....',
  '.bb.ohhhhhdhnbnnndbnbbbbdo.bb...',
  '.b...ohhhdnnblnhdnbbbbndo...b...',
  '.bd...hhdhlnhnndnnnbbhhd....bd..',
  '.b.....hohhnlndnnnnndoh.....b...',
  'hb.....b..ohndnlhndo..b....hb...',
  '.b....bb...hhdDDhhd...bb....b...',
  '.bd...bd....hokttho....bd...bd..',
  '.b....b....bboktkbb....b....b...',
  '.dd..hb....b.okttTb...hb...dd...',
  '..DD..b....bdktttkbd...b...DD...',
  '......bd...boktkttbo...bd.......',
  '......b...hbokttthbo...b........',
  '......b....bokttktbo...b........',
  '......b....dddkttddo...b........',
  '.....hbd....DDtttDDo..hbd.......',
  '......bb....oktkttTo..bb........',
  '.......d....okttttTo..d.........',
  '.......DD...okttktTo..DD........',
  '............okktttTo............',
  '...........okttttktTo...........',
  '...........okttktttTo...........',
  '...........okkttttkTo...........',
  '...........oktttkttTo...........',
  '...........oktkttttTo...........',
  '.......ssssokttttktTossss.......',
  '......sssssokttktttTosssss......',
  '.....ssssssokkttttkTossssss.....',
]

/* ------------------------------------------------------------------ */
/* Oak: 36x44, four sway/settle frames                                 */
/* ------------------------------------------------------------------ */

const OAK_CALM: PixelFrame = [
  '................ohdo................',
  '.............ohbhnhnbdo.............',
  '...........ohnnnbnbnbbbdo...........',
  '.........ohhnnnnnnnnbbbbbdo.........',
  '.......ohhnnnnlnnlnnbbbnbbbdo.......',
  '.....ohhlhnnhnnnhblbbbbbbbbnddo.....',
  '...ohhnnhlbbnnnnhnnbnnbbbbbnddddo...',
  '..ohhbhhhbhnlnlbnnnnbbbbbbbbdDdddo..',
  '.ohhlhbhhbnnnnbnlllnbbbnnbbbDdddbdo.',
  'ohhhbhlhnlnnbnnbnlnnnnbnnbnbbbndbddo',
  '.ohbhhlndhbnhnnnbnnnbbbnnbnddnDdddo.',
  'ohlhhhlhhDnlnbnlnnlnbnnbnbDnnDdddndo',
  'ohnhhnbhlldbnnlbhnbnbnbnndbbbbdDdddo',
  'ohhhnlhnbhnDbhbnnnnbbbbbDbbbnddddddo',
  'ohhhllhhhnnndlnnnhnnbbbdbbbbdnDdbDdo',
  'ohhhhhbhhnnbbnlnnlnnnbbbbbnbdddndbdo',
  'ohhhhhhhhnnbbnnlhbhnbbnbbbnnbndndbdo',
  'ohhnnhnhhhbnnnbnbnbnbbbbbbbbbdddbddo',
  '.ohhhlhhhdnnnnnnhnnnnbbnnbdnbdbdbdo.',
  'ohhhbhhhbhDbnnnnnhnnbbbbbDnnDdddnddo',
  '.ohhhhlnbbldnnbnnhhnbbnndbbnddddddo.',
  '..ohnhhlhhlnDlbnlnnnbbbDbbbbdnDddo..',
  '...ohnnnbhlhlbbnnnnnbnbbnnbbddddo...',
  '....ohbhhhnnnnnlnnnnbnbnbbbnbddo....',
  '.....oDddddDddddDddddDddddDdddo.....',
  '.......oddDddddDddddDddddDddo.......',
  '.........oddddDddddDddddDdo.........',
  '...........oDdDDDdDDDdDDo...........',
  '.........otT...........otT..........',
  '..........ottT........ottT..........',
  '...........ottT......ottT...........',
  '............otttT...otttT...........',
  '.............otttTtotttT............',
  '..............oktttkTo..............',
  '..............oktkttTo..............',
  '.............okkttttkTo.............',
  '.............oktttkttTo.............',
  '.............oktkttttTo.............',
  '.............okttttktTo.............',
  '.............okttktttTo.............',
  '.............okkttttkTo.............',
  '.......sssssokttttktttTosssss.......',
  '......ssssssokttkttttkTossssss......',
  '.....sssssssokkttttkttTosssssss.....',
]

const OAK_BREEZE_RIGHT: PixelFrame = [
  '.................ohdo...............',
  '..............ohhnhnbbdo............',
  '............ohnnbnbnbbbbdo..........',
  '..........ohnnnnnnnnbbbbbbdo........',
  '........ohnnnnlnnlnnbbbnbbbndo......',
  '......ohlhnnhnnnhblbbbbbbbbndddo....',
  '....ohnnhlbbnnnnhnnbnnbbbbbndddbdo..',
  '...ohbhhhbhnlnlbnnnnbbbbbbbbdDddddo.',
  '..ohlhbhhbnnnnbnlllnbbbnnbbbDdddbddo',
  '.ohhbhlhnlnnbnnbnlnnnnbnnbnbbbndbddd',
  '..ohhhlndhbnhnnnbnnnbbbnnbnddnDddddo',
  '.ohhhhlhhDnlnbnlnnlnbnnbnbDnnDdddnDd',
  '.ohhhnbhlldbnnlbhnbnbnbnndbbbbdDdddd',
  '.ohhnlhnbhnDbhbnnnnbbbbbDbbbnddddddd',
  '.ohhllhhhnnndlnnnhnnbbbdbbbbdnDdbDDd',
  '.ohhhhbhhnnbbnlnnlnnnbbbbbnbdddndbdd',
  '.ohhhhhhhnnbbnnlhbhnbbnbbbnnbndndbdd',
  '.ohnnhnhhhbnnnbnbnbnbbbbbbbbbdddbddd',
  '..ohhlhhhdnnnnnnhnnnnbbnnbdnbdbdbddo',
  '.ohhbhhhbhDbnnnnnhnnbbbbbDnnDdddnddd',
  '..ohhhlnbbldnnbnnhhnbbnndbbndddddddo',
  '...ohhhlhhlnDlbnlnnnbbbDbbbbdnDdndo.',
  '....ohnnbhlhlbbnnnnnbnbbnnbbdddndo..',
  '.....ohhhhnnnnnlnnnnbnbnbbbnbdndo...',
  '......oddddDddddDddddDddddDddddo....',
  '........odDddddDddddDddddDdddo......',
  '..........odddDddddDddddDddo........',
  '............odDDDdDDDdDDDo..........',
  '.........otT...........otT..........',
  '..........ottT........ottT..........',
  '...........ottT......ottT...........',
  '............otttT...otttT...........',
  '.............otttTtotttT............',
  '..............oktttkTo..............',
  '..............oktkttTo..............',
  '.............okkttttkTo.............',
  '.............oktttkttTo.............',
  '.............oktkttttTo.............',
  '.............okttttktTo.............',
  '.............okttktttTo.............',
  '.............okkttttkTo.............',
  '.......sssssokttttktttTosssss.......',
  '......ssssssokttkttttkTossssss......',
  '.....sssssssokkttttkttTosssssss.....',
]

const OAK_SETTLE: PixelFrame = [
  '....................................',
  '................ohdo................',
  '.............ohnbnbnbdo.............',
  '...........ohnnnnnnnbbbdo...........',
  '.........ohnnnlnnlnnbbbnbdo.........',
  '.......ohhnnhnnnhblbbbbbbbbdo.......',
  '.....ohnhlbbnnnnhnnbnnbbbbbnddo.....',
  '...ohbhhhbhnlnlbnnnnbbbbbbbbdDddo...',
  '..ohlhbhhbnnnnbnlllnbbbnnbbbDddddo..',
  '.ohhbhlhnlnnbnnbnlnnnnbnnbnbbbndbdo.',
  'ohhbhhlnhhbnhnnnbnnnbbbnnbnbdnDddddo',
  '.ohhhhlhdhnlnbnlnnlnbnnbnbbdnDddddo.',
  'ohnhhnbhlDnbnnlbhnbnbnbnnnDbbbdDdddo',
  'ohhhnlhnbhdnbhbnnnnbbbbbbdbbnddddddo',
  'ohhhllhhhnnDnlnnnhnnbbbbDbbbdnDdbDdo',
  'ohhhhhbhhnnbdnlnnlnnnbbdbbnbdddndbdo',
  'ohhhhhhhhnnbbnnlhbhnbbnbbbnnbndndbdo',
  'ohhnnhnhhhbnnnbnbnbnbbbbbbbbbdddbddo',
  'ohnhhlhhhhnnnnnnhnnnnbbnnbbnbdbdbddo',
  '.ohhbhhhbdnbnnnnnhnnbbbbbbdnDdddndo.',
  'ohhhhhlnbbDnnnbnnhhnbbnnbDbndddddddo',
  '.ohhnhhlhhldblbnlnnnbbbbdbbbdnDdndo.',
  '..ohhnnnbhlhDbbnnnnnbnbDnnbbdddndo..',
  '...ohhbhhhnnnnnlnnnnbnbnbbbnbdndo...',
  '....odDddddDddddDddddDddddDddddo....',
  '.....oddddDddddDddddDddddDddddo.....',
  '.......odDddddDddddDddddDdddo.......',
  '.........oDDDdDDDdDDDdDDDdo.........',
  '.........otodDDDdDDDdDDDoT..........',
  '..........ottT........ottT..........',
  '...........ottT......ottT...........',
  '............otttT...otttT...........',
  '.............otttTtotttT............',
  '..............oktttkTo..............',
  '..............oktkttTo..............',
  '.............okkttttkTo.............',
  '.............oktttkttTo.............',
  '.............oktkttttTo.............',
  '.............okttttktTo.............',
  '.............okttktttTo.............',
  '.............okkttttkTo.............',
  '.......sssssokttttktttTosssss.......',
  '......ssssssokttkttttkTossssss......',
  '.....sssssssokkttttkttTosssssss.....',
]

const OAK_BREEZE_LEFT: PixelFrame = [
  '...............ohdo.................',
  '............ohnbhnhndo..............',
  '..........ohnnnnbnbnbbdo............',
  '........ohlhnnnnnnnnbbbbdo..........',
  '......ohbhnnnnlnnlnnbbbnbbdo........',
  '....ohhhlhnnhnnnhblbbbbbbbbndo......',
  '..ohhhnnhlbbnnnnhnnbnnbbbbbndddo....',
  '.ohhhbhhhbhnlnlbnnnnbbbbbbbbdDddo...',
  'ohhhlhbhhbnnnnbnlllnbbbnnbbbDddddo..',
  'hhhhbhlhnlnnbnnbnlnnnnbnnbnbbbndbdo.',
  'ohhbhhlndhbnhnnnbnnnbbbnnbnddnDddo..',
  'hhlhhhlhhDnlnbnlnnlnbnnbnbDnnDddddo.',
  'hlnhhnbhlldbnnlbhnbnbnbnndbbbbdDddo.',
  'hhhhnlhnbhnDbhbnnnnbbbbbDbbbndddddo.',
  'hnhhllhhhnnndlnnnhnnbbbdbbbbdnDdbdo.',
  'hhhhhhbhhnnbbnlnnlnnnbbbbbnbdddnddo.',
  'hhhhhhhhhnnbbnnlhbhnbbnbbbnnbndnddo.',
  'hlhnnhnhhhbnnnbnbnbnbbbbbbbbbdddbdo.',
  'ohnhhlhhhdnnnnnnhnnnnbbnnbdnbdbddo..',
  'hhhhbhhhbhDbnnnnnhnnbbbbbDnnDdddndo.',
  'ohhhhhlnbbldnnbnnhhnbbnndbbndddddo..',
  '.ohhnhhlhhlnDlbnlnnnbbbDbbbbdnDdo...',
  '..ohhnnnbhlhlbbnnnnnbnbbnnbbdddo....',
  '...ohhbhhhnnnnnlnnnnbnbnbbbnbdo.....',
  '....odDddddDddddDddddDddddDddo......',
  '......odddDddddDddddDddddDdo........',
  '........oDddddDddddDddddDo..........',
  '..........oDDdDDDdDDDdDo............',
  '.........otT...........otT..........',
  '..........ottT........ottT..........',
  '...........ottT......ottT...........',
  '............otttT...otttT...........',
  '.............otttTtotttT............',
  '..............oktttkTo..............',
  '..............oktkttTo..............',
  '.............okkttttkTo.............',
  '.............oktttkttTo.............',
  '.............oktkttttTo.............',
  '.............okttttktTo.............',
  '.............okttktttTo.............',
  '.............okkttttkTo.............',
  '.......sssssokttttktttTosssss.......',
  '......ssssssokttkttttkTossssss......',
  '.....sssssssokkttttkttTosssssss.....',
]

/* ------------------------------------------------------------------ */
/* Bush: 24x20, three rustle frames                                    */
/* ------------------------------------------------------------------ */

const BUSH_CALM: PixelFrame = [
  '...........oho..........',
  '.........ohbnhdo........',
  '........ohbnhbndo.......',
  '.......ohllhnnnndo......',
  '.....ohdnhbbnnlhbddo....',
  '....ohhDllyrhnnnbDndo...',
  '...ohhhdnlrRnnyrbdbDdo..',
  '...ohbhDnnhblnrRdDbDdo..',
  '..ohlhndbbnhbnnnndnbDdo.',
  '..ohnhyrnlnnnbnndnDbndo.',
  '..ohhlrRnnnnhnnndbyrbdo.',
  '...ohhlhdnnlnnbldbrRdo..',
  '...ohhnhDlnnnhlnDDdbdo..',
  '....ohhddyrndhbyrdbdo...',
  '.....ohhDrRdnlhrRbdo....',
  '......ohnndbbnldbdo.....',
  '.......odDDDdDDDdo......',
  '.........oDdDDDo........',
  '....ssssssssssssssss....',
  '...ssssssssssssssssss...',
]

const BUSH_RUSTLE_RIGHT: PixelFrame = [
  '............oho.........',
  '..........ohnhhdo.......',
  '.........ohnhbnhdo......',
  '........ohlhnnnnDdo.....',
  '......ohdhbbnnlhbnddo...',
  '.....ohbDlnyrnnnbDDDdo..',
  '....ohhndlnrRnnyrddDndo.',
  '....ohhhDnhblnlrRbDDbdo.',
  '...ohhnhdbnhbnnnnndbDbdo',
  '...ohhlyrlnnnbnndnDbnddo',
  '...ohllrRnnnhnnndbbyrbdo',
  '....ohlhbdnlnnblbdnrRdo.',
  '....ohnhlDnnnhlnbDdbbdo.',
  '.....ohdbdyrdhbnyrbDdo..',
  '......ohlDrRnlhnrRbdo...',
  '.......ohndbbnldbndo....',
  '........oDDDdDDDdDo.....',
  '..........odDDDdo.......',
  '....ssssssssssssssss....',
  '...ssssssssssssssssss...',
]

const BUSH_RUSTLE_SETTLE: PixelFrame = [
  '...........oho..........',
  '.........ohbnhdo........',
  '........ohbnhbndo.......',
  '.......ohllhnnnndo......',
  '.....ohdnhbbnnlhbddo....',
  '....ohhDllyrhnnnbDndo...',
  '...ohhhdnlrRnnnbbdbDdo..',
  '...ohbhDnnhblnyrdDbDdo..',
  '..ohlhndbbnhbnrRndnbDdo.',
  '..ohnhlhnlnnnbnndnDbndo.',
  '..ohhlyrnnnnhnnndbyrbdo.',
  '...ohhrRdnnlnnbldbrRdo..',
  '...ohhnhDlnnnhlnDDdbdo..',
  '....ohhddhnndhbyrdbdo...',
  '.....ohhDyrdnlhrRbdo....',
  '......ohnrRbbnldbdo.....',
  '.......odDDDdDDDdo......',
  '.........oDdDDDo........',
  '....ssssssssssssssss....',
  '...ssssssssssssssssss...',
]

/* ------------------------------------------------------------------ */
/* Rock: 28x18, static                                                 */
/* ------------------------------------------------------------------ */

const ROCK: PixelFrame = [
  '............................',
  '............................',
  '........orhrrrhrRRro........',
  '......orrhrrrhrrRrRRDo......',
  '....oMmrhrrrDrrrrRRRdDDo....',
  '...orrmMmrrhdrrhRRRrDDdDo...',
  '..orhrrrrMrrRdrRRRrRDdDDdo..',
  '..ohrrrrhrrrRDRRRrRRDDDdDo..',
  '.ohrrrrhrrrrrRdRrRRRDDdDDdo.',
  '.orrrrhrrrrhRRdrRRRrDDDDdDo.',
  '.orrrhrrrrhrRRrDRRrRdDDdDDo.',
  '.orrhrrrrhrrRrRdRrRRDDdDDdo.',
  '..ohrrrrhrrrrRRRdRRRDdDDdo..',
  '...omMrhrrrrRRRrRRRrdmmdo...',
  '...g.ohrrrrhRRrRRRrRDDo.g...',
  '..g..ssorrhrRrRRRrRRoss..g..',
  '.g..ssssssssssssssssssss..g.',
  '...ssssssssssssssssssssss...',
]

/* ------------------------------------------------------------------ */
/* Bank                                                                */
/* ------------------------------------------------------------------ */

export const treeSprites: {
  pine: PixelSprite
  willow: PixelSprite
  oak: PixelSprite
  bush: PixelSprite
  rock: PixelSprite
} = {
  pine: {
    palette: PINE_PALETTE,
    frames: [PINE_CALM, PINE_BREEZE_RIGHT, PINE_GUST, PINE_BREEZE_LEFT],
    frameMs: 900,
  },
  willow: {
    palette: WILLOW_PALETTE,
    frames: [WILLOW_CALM, WILLOW_BREEZE_RIGHT, WILLOW_GUST, WILLOW_BREEZE_LEFT],
    frameMs: 1100,
  },
  oak: {
    palette: OAK_PALETTE,
    frames: [OAK_CALM, OAK_BREEZE_RIGHT, OAK_SETTLE, OAK_BREEZE_LEFT],
    frameMs: 1200,
  },
  bush: {
    palette: BUSH_PALETTE,
    frames: [BUSH_CALM, BUSH_RUSTLE_RIGHT, BUSH_RUSTLE_SETTLE],
    frameMs: 750,
  },
  rock: {
    palette: ROCK_PALETTE,
    frames: [ROCK],
    frameMs: 1000,
  },
}
