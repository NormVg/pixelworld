/**
 * High-resolution cliff sprites for the 2.5D world of Willow Hollow.
 *
 * The cliff is authored at 32px tile width so it holds real detail at native
 * resolution. Three pieces compose a cliff run:
 *
 * - `face` is 32x96: three stacked 32px bands. It carries a grass lip that
 *   overhangs the rock, irregular grey-stone ledges with short staggered
 *   shelves, two wandering vertical cracks, moss tufts clinging to the
 *   ledges, and a rubble base. Anchor it at the top of the run; the bottom
 *   row is the contact line.
 * - `top` is 32x32: the walkable grass cap. A dark rim marks the front edge
 *   and a 4px grey rock lip shows the ledge's thickness.
 * - `rubble` is 32x32 and mostly transparent: loose grey stones, pebbles,
 *   and grass tufts to scatter over the base of a face.
 *
 * Conventions:
 * - Every row is exactly 32 characters; each character maps to a color in
 *   `CLIFF_PALETTE`, and '.' is transparent.
 * - The rock is cool grey stone, not warm strata: broad irregular masses
 *   with rounded weathered edges, short broken shelves, and vertical
 *   fractures. No continuous horizontal grain lines.
 * - Light falls from the top left. Highlights sit on the top and left of
 *   each rock mass, shade piles into the bottom right, and the grass lip
 *   casts a dark under-shadow onto the rock.
 * - Contact shadows: the face ends in a two-row near-black band (`k`/`x`)
 *   that grounds it on the tile below; every rubble stone carries a
 *   down-right contact shadow, and the deepest crevices use `x`.
 * - No tile paints a grid line or a hard side border. The face's side edges
 *   carry the same broken rock texture as its interior, so horizontal runs
 *   blend without a repeating seam.
 * - `frameMs` is how long one frame is held. The cliff is static; the long
 *   hold keeps it out of the animation scheduler's way.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

const CLIFF_PALETTE: PixelPalette = {
  a: '#79cf9d', // grass base
  b: '#72c795', // grass shade
  c: '#80d3a2', // grass light
  d: '#6bbd8b', // grass deep patch
  e: '#4fae7c', // dark blade
  f: '#a9e9bd', // light blade
  g: '#35915f', // deep blade
  h: '#2a6e4a', // grass base shadow
  o: '#2a2431', // rim / outline
  r: '#a8aeb6', // sunlit grey stone
  R: '#8a9099', // mid grey stone
  s: '#6b717a', // grey stone shade
  t: '#4e545c', // deep grey stone
  u: '#3a3f46', // crack
  v: '#c4cad2', // grey highlight
  w: '#d8dde3', // bright edge
  m: '#5f8a4a', // moss
  M: '#4a6e3a', // dark moss
  n: '#7d838c', // rubble mid
  p: '#9aa0a8', // rubble light
  q: '#5a6068', // rubble shadow
  k: '#2b2f34', // contact shadow
  x: '#1b1e22', // deepest shadow
}

/** Three stacked 32px bands: grass lip, grey stone ledges, rubble base. */
const CLIFF_FACE: PixelFrame = [
  'cfccddbbaaaaafaaaadfccddddaabbbb',
  'ccccddbbfgaaaeaaaaddcfdfffaabbbb',
  'ddccbbbbgaaadffaaaaadddeafffgbbb',
  'dfgcfbbbafgadeeaaaaadddeaafgbbbb',
  'dgafefgccefdccecbbddcccgaaeaaaaa',
  'ddagcecccegfgfgcbfgdfcccfgafgaaa',
  'aaaacgccccceccccbbbbfcccaafeaafa',
  'aaaaccccccceccccbbbbccccaaeeaaea',
  'aaaaggbeceggggegceggaegagaagagea',
  'gegexkgkekkekkkxgxkkgkkgkggegxke',
  'kkkkxkkkxggxgggkkkxkkkgkkkkkkkkk',
  'ggkkkkkkgxxkxxxkkxkxkkxxxggkkkxk',
  'RRvvtsssrrrrRvuRssssssssrrrrrrrr',
  'wvrrwvwvwvvvvvwvvvvxvvvvvvvvwvtr',
  'rrrrrMrrrrvrvvvvrrvxvvvvvvvvrtur',
  'rtrmmrrmrrrtvvvvrrrxvvvvvvvvrsur',
  'rsssMmvMsvrrvvvvrrrxuvvvrrrrrtvv',
  'rsssmvMmmrrtvvvvrrrvxuvvwvvvvvst',
  'vsstvMvmMrrtvvvvrrrvxuvvssstssst',
  'vsssvvvvsrrvvvvvrrrvxuvsstssssst',
  'vrvtvvvvvvwrvtvvsssvxuuvvvvvrrrs',
  'vvtvttststtrvtvvssssmmmmvvtvrrrs',
  'rvvvrssrsstrvvvvssssmmmmvvvvrrrt',
  'rvvvrsursssurtvvssssssmmuvtvvtvs',
  'vssssuuvvvvvvvvvvvvvvuvvxrrvvvvs',
  'rtssstwvvvvvssssrrrrrvwuxrtrvvvs',
  'vsststvvvvvvssssrtrrrrsuxutrvvvs',
  'rssssuvvvvtvssssrrrrrrsuxurrvvvs',
  'rvrrttrrrrrrssssvvvvvvtuxuvvrrtt',
  'rrrssurrrrtrsmssvmmMvvtxuvvvrrvt',
  'vtsuutrrrrrvMvmmmmmmvtvxuvvvrrrt',
  'xvvvvvwwvuvrmtmmmrrvvwvvxvuvrrrs',
  'vrrrttvtrvrrrmmmRRmmRRRvxuvusstu',
  'vrrrttttrxurrrrrRRRRwvvxwvvuvvvu',
  'rrrrttttxurrrrrrRRRRtvxuttswtMmv',
  'rrrrtttvxurrtrrrRRRRRxurttstmMMs',
  'vrrrrrrvxrrrtttttttttxurRRRRMmRs',
  'rtrrrtrrxvrrtttttttttvxrRRRRMmms',
  'rrrrrrrvxurrtttttttttvxrRRRRRRRs',
  'vrrrrrrvxurrtttttttttvxuRRRRRRRs',
  'rRtRRRRvxtttttttRRRRRxuRrrtrrrrs',
  'rRRtRRRrxtttttttRRRvxuRRrrrrrrrs',
  'rRRRRRRvxuttttttRRvxurRRrrtrrrrt',
  'rRRRRRRRxuttttstssxssrRRrrrrrrrs',
  'rvwvuvxtxuuvvuuvtuxutrRRRRRRttts',
  'vtttvtvwxuMvwmvRvvxxvRRRRRRRtttt',
  'rtttttvxuttsstsRtvxuwxRRRRRRttts',
  'rvvvutvxutssRRstttxtRvuRRRRRttts',
  'wtrrvuvxrrrrrvrrtvxtRRvurrrrttts',
  'vrrrsurrxurrrrrrtvxtRRRwurrrtttt',
  'rrrrsurrrxrrrrrrtvxtRRRstrrrtttu',
  'vrrrsurrrxrrrrrrtvxtRRsMMmsmmuut',
  'vRRRsxRRvxRRRRRRvxRRRRtmMxuxuRRR',
  'vRRRRvxRxRRRRRRRxRvtwvvmvmummRRR',
  'vRRRRttvxvvvvvvvxvtvRRRmmMmxmRRR',
  'vvvvvwvrxuRRssssxtttRRRRustuRRRR',
  'vsussmmMMMRRssrxssssttttssturrrr',
  'vsssssssmMxRssrxssssttttsssurrrr',
  'rssssssmRMrxssrxssusttttssstvvvw',
  'rssssssmMRRxsssrxsssttttsvwvttts',
  'rRRRuturssrxsssssxsssmvvvMwvuRwt',
  'rRRRtttrssssxsssrxstststttstRRts',
  'vRRRtttvssurxsssrxsssssttsttRRRs',
  'rRRRtttrsssssxssrxusssxrttttRvRs',
  'vssssssrtssstxtrxssssssvtsssttts',
  'rsssvtsuurtstxttrxssssvssssstttt',
  'rtssssvtwvvvvwxwxuxsssxvssssttts',
  'vssvvvsvRRRRtRxRxRvvvuvsssssuvts',
  'rswRRRRRsssssrxxsssstvussstsRRRt',
  'vwRRRRRvwssvvvxsxuvvttvussssRRts',
  'vRuRtRRttsssttrxuststtsussssRRRt',
  'vvvtRRRsssssssrxxsssttsussssRRRs',
  'rttvvtsssssssssrxsssRRsxssssssst',
  'rttttusussssssssxsssRuRvuttttsst',
  'vtttstssssssssrxrxssRRRttuuxuvtt',
  'vtttRvussssssssrxxumMRsMussssttx',
  'rttttsutssssRRRRrxMmMmsussssssss',
  'vtttttutsstsRRtRsxMMMMsmssssssss',
  'vvvwwuutssssvvvwvxmmvMvMwvvussss',
  'rtttsvvvwmMmMmtttrxxsssstttvvuss',
  'rRRRRvRRRmmrRRtRRRRrxRRRttttsvus',
  'rRRRRuRRRmMrmmRRRRRxuuRRvvvvwwws',
  'rRRRRRRRRRRurRRRRRxRtRRRtssssstv',
  'rRRRRRRRRRRRvRutrxRRRRRRttssRRRs',
  'rRRussssttttrsssxtttttttssrsttts',
  'rRRRsusstuttrtssrxutttttssurttts',
  'rRRRssssttutrusstxtttttttssrtttt',
  'rtsttttsttssvsttrxttsssssssrstts',
  'xkxxpxxxxxkkqkxxxxxkkxxxkkkxxxkk',
  'xxpppppkkkkkkkppppppqxxkkkkppppq',
  'kpnnnpnqxkxkxppnnnnpqxxkpkxpnnnq',
  'ppppnnnqxppppppnnnnnqqppppqpnnnq',
  'kpnnnnnpxpnnnqpnnnnnqppnnnqpnnnq',
  'xxqqqppppqqqqpppqqppppppqqqxqqqk',
  'xxxxppnnnqxqxnnnxpppnnnnqqxxxxxx',
  'xxxxxqqqqqxxxqqqxxxqqqqqxxxxxxxx',
]

/** Walkable grass cap: dark front rim over a thin grey rock lip. */
const CLIFF_TOP: PixelFrame = [
  'aaaaaaccccccaaadddbbbbbbaaadddbb',
  'afaaaafgccccaaadddbbbbbbaaadddbb',
  'aaaaaaecccccaaadddbbbbbbaaadfdbb',
  'aaaaaacccccfgaaaaabbbbbbaaafgabb',
  'aaaaaacccccgaaaaaabfgfbbaaaeaabf',
  'faaaaaccccccaaaaaabbbbfgaaaaaabg',
  'eaaaaadddaaadddbbbbbbbegccccccbb',
  'eaaaaadddaaadddbbbfbbbebccfcccbb',
  'afgaaadddaaadfdbbfgbbbfgcccfccbb',
  'agaaaaaaaaaabebbbbgbbdeddddcccbb',
  'fgaaaaaaaaaafgbbfbbbbdeddddcccbb',
  'eaaaafgaaaaaebbbebbbbdgdddfcccbb',
  'gaaaaaaaaaaaeddaeaaaaaaaddedddaa',
  'aaaaaaaaaaaagddagaaaafaaddedddaa',
  'aaaaaafaaaaadddaaaaaaaaafgddddaa',
  'afgaaaaaaaaafgaaaadddaffeaadfdaa',
  'aeaaaaaaaaaaaaaaaadddaeaaaadddag',
  'aafgaafgaaaaaaaaaadddagaaaadddae',
  'bbbdddeaaaaabbbbbbbbbbbbbbbbbbaa',
  'bbbdddaaaaaabbbbfbbbbbbbbbbfgbaa',
  'bbbdddaaaaaabbbbebbbbbbbbbbebbaa',
  'bbbbbbafgafgbbbbebbbbbbbbbbbbbdd',
  'bbbbbbaeaagabbbbgbbbbbbbbbbbbbdd',
  'ggeggbaegeaagbbbbbbbbbbebbbegbdd',
  'hehgegehhggghgeeegeeegghgeeehgeg',
  'hghhgehhhhhhhgghhheegehhehhghhhh',
  'oooohohhhohooohhhoggooohohoohoho',
  'xoxxokoooxoxxkooooookxooxoxxoxoo',
  'vvvwwwvvuwwwwwwwwuvvvvvvvuvvvvvv',
  'RRRrrMRRurrrrrrrruRRRRmRrurrrrRR',
  'sssRRRMRRutRRRRsssutRssmRRutssRR',
  'sssttttttutttttsssutttttttuttttt',
]

/** Loose grey stones and debris; transparent except at the base. */
const CLIFF_RUBBLE: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '........................pn......',
  '.............pn.........qk......',
  '.............qk.................',
  '....................pn..........',
  '....pn..............qk..........',
  '....qk.pkpn.............f..pn...',
  '......pppfk.kp...k......gekqk...',
  'k.ppppnnngeppppqkkk.px.pepkpppkk',
  '.pppppqqqeqpnnnqqkpppppnnnpnnnqk',
  'ppnnpnnnnqkqqqqqpppppppqqqpnnnq.',
  'ppnnnnnnnqqkk.kkpnnnnnnnqkpnpnfk',
  '.pnnnnnnnqxkkkpppnnnpnpnqqqqqqge',
  '.qqfqqqqqqkknqpppnnfpnnnq.k.kke.',
  '.kkgeqqpppppknnqqqqgeqqqqpkkkk..',
  'kpkekqpnnnnpqqqqkpqeqqqpppppqkkk',
  'pppkk.pnnnnnqk.ppppqkppnnnnnq.pp',
  'nnnkk.pnnnnnqkkpnnnqqkqqqqqqk.np',
  'qqqx.kxqqqqqk.kqqqqqk..kkxxkkkqq',
  'kqxk.k.xk.kk.kkkkqkkkk.....kkkkk',
  '..k.k.......kkk..kkk.k.........k',
]

export const cliffSprites: { face: PixelSprite; top: PixelSprite; rubble: PixelSprite } = {
  face: { palette: CLIFF_PALETTE, frames: [CLIFF_FACE], frameMs: 1600 },
  top: { palette: CLIFF_PALETTE, frames: [CLIFF_TOP], frameMs: 1600 },
  rubble: { palette: CLIFF_PALETTE, frames: [CLIFF_RUBBLE], frameMs: 1600 },
}
