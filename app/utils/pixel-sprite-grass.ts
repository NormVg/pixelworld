/**
 * High-resolution grass sprite bank for the 2.5D world of Willow Hollow.
 *
 * Conventions:
 * - Every frame is a 32x32 grid: 32 rows of exactly 32 characters.
 * - Each character maps to a color in `GRASS_PALETTE`. There is no
 *   transparency: a lawn tile is fully opaque so it can sit beneath every
 *   other ground layer without leaking the canvas through.
 * - The lawn is built from 2-4px leaf clusters over a two-tone base, with a
 *   handful of blade fans rising out of it. Clusters wrap around the tile
 *   edges, so neighboring copies meet without a seam, grid line, or border.
 * - A broad diagonal light band sweeps each variant. Its phase differs per
 *   variant, so a field of mixed tiles never repeats the same highlight.
 * - `a`-`e` are five distinct cuts of the same meadow: different clump
 *   positions, densities, and accents. `c` carries tiny daisies; `e`
 *   carries clover and a single pink bloom.
 * - Each sprite holds one static frame. `frameMs` matches the terrain
 *   bank's grass tempo so a renderer that cycles variants holds each one
 *   equally long.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

const GRASS_PALETTE: PixelPalette = {
  a: '#4f9e6f', // meadow base
  b: '#479465', // base shade
  c: '#63b27a', // sunlit leaf
  d: '#3b8558', // deep leaf
  e: '#2b6f4a', // blade root
  f: '#8fd3a0', // blade highlight
  g: '#1f5a3c', // deepest shadow
  h: '#74c286', // leaf rim light
  i: '#bce49c', // sunlit blade tip
  j: '#f2eed8', // daisy petal
  k: '#e8b84a', // daisy heart
  l: '#e39aae', // pink bloom
  m: '#a8e8a0', // clover leaf
}

const GRASS_A: PixelFrame = [
  'bbbbccccccccdcaaaaaabbbbbbbbbaba',
  'chcbccdchccacccadaabbbbbbbaaaacc',
  'ccccccchcccaaaaadbbbbbbbbaaaaahc',
  'cddccccchcadccababbbabaaaaaaaacc',
  'hcccaacccaacbcdbbbbbbbbaaaaadchc',
  'ccdaaaacadabbdccbbabbbaaaacccccc',
  'bcaaadddccbbcchbbbbbbbaabcccbccc',
  'addddddbabfccccbabbbbbcbaacbcbcb',
  'bdddddddbbdccadaaabbbbbababbbbba',
  'ahcbdfdfbdaaaaaccacbcbaaabcbbbaa',
  'ddcdbbhhddfifabaacccccbbhcccbddd',
  'dddgafhhadhhchcccccccccbbccbaddb',
  'bddhceeeaehhccdcccccaabbbbbbbbbb',
  'bbaccccaaacccdhccccaabbbbbbcdccd',
  'baacccdaacccccccacabbbbbbbbbddgg',
  'aaaaddcchccccchccaabbbcchccbccad',
  'ddaaccchccdcaaaccdbbchccdccdcbdd',
  'accccccccccaaaaaaaabccdibbibbddd',
  'acccccccccaabaaabbbbbiddhcdbbaaa',
  'cccccccaaaabbbababbbbddfcdbdaacc',
  'ccccbaaccaabbbbbbbbbbfdhcdiihccc',
  'cccaaacccchcccbbbbabbhehaeeecccc',
  'acaddddacccccbbbbababaaaacccbdcc',
  'aaagdddchbbcbbdbababaaccccccchca',
  'hccabdbccbbbbbbcchbabcbcccbcccba',
  'cacdhccchdbbbbiccbccccccccccccda',
  'bbbccbccbabbbidbbchcccccacaahcca',
  'abbcabaacchbbhdbfacccccaaaaacacd',
  'bbbbbbbacccifhdhffbchccaaaaabbbb',
  'bbabbbaaacceheeehccccaaaaaabbbbb',
  'babbbbbaacccccccacacadaabbbbbbbb',
  'ababcccccchccccaaaaaaaababbbcbaa',
]

const GRASS_B: PixelFrame = [
  'bcbcbbccdbbbbbbbccchbbbccdhbcccc',
  'cccccbbdhbddbbbcbcccbbbbccbbaccd',
  'ccaaaabhccddbbbbbacbdbbhccbacchc',
  'ccchccicdcdbbbabafbbfdbcchcbcccd',
  'acdcbchcfdddddbbihbhbfbhccdabbda',
  'aacacchhdddddcabhhchhbccdcabbbaa',
  'aabfbihdddidbbbihfbfhfcchbbbbaaa',
  'abbbhdhdcdhdddbeehcheeccbdbfbbab',
  'bbcihdhdfhfcdgbabaccbbbdcbbdbbbb',
  'bbaheeeehedchccaabcccbbccbbdbibb',
  'babahaaaccdchccabhcciabbcdidbdbf',
  'aaaaegcachcccdcdcccchbchffdddbah',
  'aaaaegacbccdbcbaaacaebcihhdddbhf',
  'aacaegccccdccchaaaaaegbehheeebee',
  'acacegccccacccddddddegbhcchccaaa',
  'cccccccccaaaaaaddccdegbhcccccdca',
  'ccccacaabaahdccccccddbbcccbadhac',
  'ccccccchaaacicdcddchabbcchbbccdc',
  'ccaaaccaadfhdbdddcccaabcccbaicdc',
  'ccahccdbabdhbbadaacadabccbabhacc',
  'aacccccbfbdhfcbaaaaaacbccababhaa',
  'hbhccccfhfddaaiaaacacccicdcccegc',
  'hbcccbceheeeaeaaccacfcchfccccegc',
  'ccbcbbdbaaaaaacacccccdhcdciccegc',
  'bdbbbbbaaaaaacacbhccffhdadhccegc',
  'bbbbbbaaaacccccccccfdhhdahfccbbb',
  'bbbbbaaaacachcfcccceeheeaebbbbbb',
  'aaaaaacacccbccdccfccchababbbbbab',
  'dddaacbaccbabfdahcccccdbbbbbbbbd',
  'ddddcccacccdfhdafifacbdbbbabaaad',
  'dddddcbabbdcehecheebbbbbbbbbbaba',
  'ccdcdahcbbbccbacchbbbbbbbbbccchb',
]

const GRASS_C: PixelFrame = [
  'bbbbbbbbdddddddddcccbdacacccbcac',
  'bbbbbhccddddddddccccdacccccccacb',
  'bbbbbcbcdddgddddddccdcccccacaabb',
  'bccbbbbbagdccdcddhcdcccccacaaacc',
  'bbbbbbbababcccccdcccccacbdbabbba',
  'bbbbabaaaaabcbabcbdccacbbdbbabab',
  'bbbbbbcaaacbbjbababcbabbbbbbbbbb',
  'aaabbbaacccbjkjbabbbabbbbddbdddd',
  'baaabbacdcbabjbbddddbbbbbdddddda',
  'aaabccchhccbaedbbccbbhccbbdddgaa',
  'baacccchidbbdbbbbbbbbbccccdddbba',
  'bbcbcccihbiaabbbddddddbbccdddbbb',
  'babcbibdfhfiaabbddgdddbbbccbdbbb',
  'abcccecehehaabddbbdbbdbbababcbcb',
  'ccacaaaababbbbddbbbbbaaaaaacchcc',
  'cdcaaaaaabbdbbdbbbbbaaaacccccccc',
  'ddaaaabhcbbbbbbbccchaaajadbccccc',
  'aaaahcaccbbbbbbbbccadcjkjdccchca',
  'aabaccbbbbbbbbccbbbbbccjchccbccd',
  'abahccddaaaaabbbbbabcccedccccaaa',
  'bbbccdbabaaaabbbbababcbccchcchba',
  'bbbbcbdaacdhcbababhccbcaaicccbdb',
  'bbbbbdaahchcbababaccbabhchfabddb',
  'aabbbbaahccddaacabbcbbbfafdbbbbb',
  'babhccccccchbabbbbbbbbfhbhdibfba',
  'abbbcccdhccbdbbbbbbbbbehbheeebaa',
  'abbbbcdcccbbbbbbbbbbddbbbbbaaaba',
  'cbabcajccdbbbbbbbbbbbdbbaaaaaaab',
  'bababjkjdcbbbbbbbbbbdddccaaaaabc',
  'cbahccjbbbbbbbbbbbbddddaaaaacacb',
  'babbccedbbbbbbbbbccddaaaaaaccccc',
  'cbbbbbbbbhcbbbbbaacccaaacccccccb',
]

const GRASS_D: PixelFrame = [
  'bbcbdgddbccabbccccbabaccbaaabbdd',
  'bbbbbhcdhccccchbccchaccaaaaabbgd',
  'bbbbbccdaccacccdbcccdccaaaaabbbb',
  'bbbbaadaaaccccdcdbcbcccaaaababbb',
  'bbbbbbbabccchcccbbbbbaaabbbbbbbb',
  'bbbbbbbbaccacbcaaaabaaabbbbbbbbb',
  'bbbccchababbbcaaccccbbbbdbbbbbbb',
  'bbbbcccbfbbbbbaahcccdbbbababbbbb',
  'bcchbcbffbbbbbbacccbbbbbbabbbbbb',
  'adccifhbhiffbiabbcbdbbaaaaabbbbb',
  'bacceehbheeeebchccdhbaaaaabababa',
  'abbcbbbbababcchcbccadaaaaacbcaab',
  'bbbbbbaabbbbcccbbbbdbaaaacbababa',
  'bbbbaaabbbbbbcbbbbbbabcccccccbab',
  'bbbabbbbbbbbbbbbbccbbcbabhcchbbb',
  'bbababbbabdddbbbbbbbcccbaccdccch',
  'bbbbbbbbbadddbbbbbbcccifbhdcbddc',
  'dbhccbaaaaadbbbbabfafbhdbiciaccb',
  'bccccabababaacbabahibdhdbdffdibd',
  'ccccdaccchcccccbabhebeeebeheedbb',
  'bccdddacccccccbabbbbbbbbbbbddbbb',
  'bbccaaccccdccccaababbbbbbbbbbbbb',
  'hbcadcccccccacaaaaaabbbbbbbbbbcc',
  'adcccccccccaaaaaaaababbbbbbbbbcc',
  'acbcbcccaaaaaaaabbbdddbchbhcccaa',
  'hdcccccaaaaaaaabbbbbddbccdcccbcc',
  'cchcccdaacaaffibcibbbabbbbbcbada',
  'ccccddaaaiibhhhfhbiaabbbbbbbcaab',
  'bchcbaaabeebhheeeebabbbbbbbababa',
  'hbccddabbbbdddabcbbbabbbcbaacbac',
  'chcddbbdddccdcchbbbbbabcccbcbdbc',
  'bdccddgdgdaadcccchbbaacccccbabbc',
]

const GRASS_E: PixelFrame = [
  'ddbgddbbbbbbbccccccaaaaaaabbbbdd',
  'ddccbbbbbbaacccccaaaaaaaabbbdddd',
  'bdbbcchcccbcccaaaaaaaabbbbbbbddd',
  'ccdbaccccaabcaaaaaaaabbbbbbbbbbb',
  'bbbbbaifbhccbaccbbbbbbbbbbbbbbbb',
  'bbcchhhhccdddbbbbbbbbbbbaaaccbbb',
  'cccccfhhdddgbbbbddddbbbaaabcccdc',
  'ccccffhhficfbbbbddddcccaaaaccccc',
  'hccceheeheebbbbbdddchcadaachccca',
  'bccbdhbbbddbbcbbbdcccddafccaccab',
  'bbbdccbbbdbbcbbbbbbbbcbchcchbabb',
  'hccbcbdbbbbbbbbbbbbbabcbfffccbbb',
  'cccbbbbbbbbbbbbbbbbdbfbihdhfhcba',
  'acbbbbcbbbbbababbbcaceaehehaccaa',
  'bbbbbbbbdddbmmammcccccbbbaaaaabb',
  'bbbbabbgdddmmmmmmccccaabhccaabbb',
  'bbbabdddcdccmehmecaahcaacacbbbbb',
  'daaaadddcbaccmmccaaccchaaccbbbbd',
  'daaaacdcbdbcmmmaaaaahcchcmmbmmdd',
  'daaaccabdaaccmeaaaaaccbcmmmmmmdb',
  'bbacccbabfbfahedaabbbbbhcmehmedb',
  'bbcccccbbhchcccdabbbbbbhccmmgbdb',
  'babcccbibhffaibbbbbbccbhcmmmbbbb',
  'caaccaafhhhhhbibbbmmcmmccdmecbac',
  'bbbadcbeeehheebbcmmmmmmacdaedcba',
  'bbbadaababbddbbbbcmehmeaccccccab',
  'bbbbaabbbbbddgbddbcmmcaccccababb',
  'bbbbdbbbbbbdaaadcbmmmccccccbabbb',
  'bbbbdlbbbbbdadadddamecccbbbbbbbb',
  'bbbblklbbbaaadaddddcedcccchhcccb',
  'bbbbbldddbbddddcdddcccaaacccccbb',
  'bbbbdedddbbbddcccdcccaaaacaacbbb',
]

export const grassSprites: { a: PixelSprite; b: PixelSprite; c: PixelSprite; d: PixelSprite; e: PixelSprite } = {
  a: { palette: GRASS_PALETTE, frames: [GRASS_A], frameMs: 1200 },
  b: { palette: GRASS_PALETTE, frames: [GRASS_B], frameMs: 1200 },
  c: { palette: GRASS_PALETTE, frames: [GRASS_C], frameMs: 1200 },
  d: { palette: GRASS_PALETTE, frames: [GRASS_D], frameMs: 1200 },
  e: { palette: GRASS_PALETTE, frames: [GRASS_E], frameMs: 1200 },
}
