/**
 * High-resolution terrain sprites for Willow Hollow.
 *
 * Every ground tile is authored at 32x32 native pixels, so the renderer draws
 * real detail instead of upscaling 16px art. The one exception is `cliff`:
 * it is 32x96, three stacked 32px bands that read as one vertical face (grass
 * lip, strata and cracks, rubble base). Anchor it at the top of a cliff run.
 *
 * Conventions:
 * - Each frame is a grid of rows; every row is exactly 32 characters wide.
 * - Each character maps to a color in that sprite's own palette; '.' is
 *   transparent.
 * - No tile carries a painted grid line or a hard border. Edges are broken,
 *   worn, and organic so neighboring tiles blend instead of reading as a
 *   lattice.
 * - `grass` holds six near-identical frames: a whisper-quiet mint
 *   mottle (only ever one tone-step apart, re-seeded per frame so no two
 *   variants share a layout) plus sparse static accents and blade tufts
 *   that slowly turn over across the cycle. Cycling them reads as a
 *   gentle breeze through one continuous lawn, never a texture swap.
 * - `path` and `sand` hold organic variants in `frames`; a renderer may
 *   pick one per tile or cycle them slowly.
 * - `water`, `flower`, `tallGrass`, and `crops` hold animation frames.
 *   `cliff` holds two subtle light-shift frames. `soil` is a single static
 *   frame.
 * - `frameMs` is how long one frame is held before advancing. Tempos differ
 *   per sprite so nothing moves in lockstep, and every ground cycle stays
 *   slow — flowers breathe, tall grass rustles, and crop stages advance
 *   like real growth, several seconds apart.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/* ------------------------------------------------------------------ */
/* Grass                                                               */
/* ------------------------------------------------------------------ */

const GRASS_PALETTE: PixelPalette = {
  a: '#79cf9d', // mint base
  b: '#72c795', // soft shade
  c: '#80d3a2', // soft light
  d: '#6bbd8b', // deeper patch
  e: '#4fae7c', // dark blade
  f: '#a9e9bd', // light blade
  g: '#35915f', // deep blade base
  h: '#8fdcaa', // mid-light speckle
  i: '#b6e8a8', // warm dew fleck
}

const GRASS_A: PixelFrame = [
  'aadaaaaahaaaaacaaaaabbdbbbbbbbba',
  'aaaaaaaaaaaaaaaaaaabbabbbbbbbbba',
  'hhaaaabaaaaaaaaaaadbcccbbbbbdbbb',
  'aaaaaaaaaffaaabaaabbbbebbbhbbbbb',
  'ddbbaacaaeeacabacabbbbfecbbbbbdd',
  'aaaaaaaaeeeaaahaaaabbbeebbbeebdb',
  'aaaaaaaaeegaaabbdacbfbbbbhbeebeb',
  'aabbbbaaeaebbbbbdbbbbfbbbbbeeheb',
  'bbbbbbaaaaebbbbbdbbbbbbbabbbgbbb',
  'bbbbbbbbbaabbbbbdbbbbbbhbbbbebaa',
  'aabbbbdbbbabbaddebbbbddbeecbbbaa',
  'aabbbbdbbbbbbaaafabbbbfbeebbbbfa',
  'aabhbbddbbbhcccaeeafbbebbfbbbega',
  'aaabbbddbhbbbaaaafeebbebeebebeba',
  'baabbbbddebbdddabeefbbbgeedfaeaa',
  'bbbbhbbaaebbbbbbbaeeaaabgeaefaaa',
  'bbbbbbdaaebebbbbbaaaaaaaebeabaaa',
  'bbbbbbdaaaeebbaaaaaaaaabebeaaaaa',
  'bbbbbbeahfeedbaaaacaaabbbbaaaaaa',
  'bbbbbbbaaegbdaaaaaaaaaaabaaaaaab',
  'bbcbbbbaaabbdaeaaadaaaaaaaaadaaa',
  'bbbbbbaaeabbdeeaaaaaaaaaaaaadaab',
  'bbbbdbaaebbbeeeadaaaaahaaaaaddbb',
  'bbbbbbafebbeeeeahaaaaaaaaabbddbb',
  'abbbhafebbaaeagaaaaaaaaahabbddba',
  'bbbbaaeedbhbbbbaaaaaaaaaaaabbbbb',
  'dbbaafefdaabbbcaaaaaaaaahaabbbbb',
  'debebbeeeaabbbaaaaaaaabbbbbbbbbb',
  'beeebbeaeaaacaaaaabbdbbbbhbbebbb',
  'bbebfeaaeaaabaaaaaaaabbbbhbebbbb',
  'baeeebbaeaaabbaaaaaaaabbbbbbcccb',
  'aaabhbaaaaaaaaaaaaaaaabbbbbbhbhb',
]

const GRASS_B: PixelFrame = [
  'bbdaaaaahaabbbcbbbbbbbdaaaabbbbb',
  'bbaaaaaaaaabbbbbbbbbbbbaaabbbbbb',
  'hhaaaiaaaaabbbbbbbdbcccaaaabdbbb',
  'baaaaiabbffbbbbbbbbbbbbaaahaaabb',
  'ddaaaacbbeebcbbbcbbbbbaacaaaaadd',
  'baaaaabbegebbbhbbbbbbbbbbaaeeadb',
  'aabaaaaaeegbabbbdbcbhbbbbhaeeaeb',
  'aaaaaaaaeaeaaabbdbbbbbbbbbaegheb',
  'aaaaaaaaaaeaaabbdbabbbbbbbbaeabb',
  'aabaaaaaaaaaaabbdaabbbbhbbbaeaab',
  'abbbabdaaaaaabddeaaebddbeecaaaaa',
  'aabbabdaaaaabbbbfbbbbbgbeebabafa',
  'aabhbbddaaahcccbeebfbbbbbfabbeea',
  'aabbbbddahaabbbbbfeebbebeeaebeaa',
  'baaabbaddeaeddeabeefbbbfegdfeefa',
  'aaabhbaaaeaeaaeaaaeebbbbgeaefgea',
  'aabbbbdaaeaeaaeaaaaaaaabebeagaff',
  'aaabbbdaaaeefaaaaaaaaabbebebbaea',
  'aaaaabebhfeeebbbbacaaabbabbbebfa',
  'baaaaabbbeebdbbaaaaaaaaaaabbbbaa',
  'bacaaabbbbbbdbeaaadaaaaabaabdbba',
  'bbaaaabbebbbdeeaaaaaaaabbbbbdbbb',
  'bbbadabbebbbeeeadabbabhbbbbbddbb',
  'bbbbabafebbfeeeahabbbbbaaaaaddbb',
  'bbbbhbfeaabbebeaaabbbbaahaaaddbb',
  'bbbbbbeedahbbbbbbaabbbaaaaaaaabb',
  'dbbbbfegdabbbbcbbaaaaaaahaaaaabb',
  'debeaaggeaaaaaabbbbaaaaaaaaaaabb',
  'begeaaeaeaaacaaabbbbdbbaahaaabbb',
  'bbeafeaaeaaaaaabbbbbbbaaahaeabbb',
  'bbeeeaabeaaaabbbabbbbbbaaaaacccb',
  'bbaahaaaaaabbbbbbbbbbbbaaaabhbhb',
]

const GRASS_C: PixelFrame = [
  'bbdbbbaahaaaaacaaaaaaadaaaaaabbb',
  'bbbbbaaaaaaaaaaaaaaaaaaaaaaaaabb',
  'hhbaaaaaaaaaaaaaabdacccaaaaadabb',
  'bbbaaeaaahaaaaaaaeaaaaeabbhaaabb',
  'ddbbaacaaaaacaaacaaaaaaacbbaaadd',
  'bbbaaaaaaaaaaahabbaaaaabbbbeeadb',
  'baaaaaaacccaaaabdbcahaabehbeebeb',
  'aaaaaaaaaaaaaaaadaabbbbbbbbeehgb',
  'aaaaaaaaaadaaaaadaabbbbbbbbbgbba',
  'aaaaaaaaaaaaaaaadaabbbbhbbbbebba',
  'aaaaaadaaabbbbddeaaeaddbeecbbbba',
  'aaaaaadaaabbbbaafaaaaafbgebbbbfa',
  'aaahaaddaabhcccaeeafaaabbfbbbeea',
  'aaaaaaddahbbbbaaafeeaaebeebebeba',
  'aabaaaaddebeddeaaegfbbbfeedfeefb',
  'bbbahaaaaeaebbeaabeebbbaeebefegb',
  'bbbaaadaaeagabebbbbbbbbaeaebebff',
  'bbbbaadaaaeefbbbbbbbbbbaeaebbbeb',
  'bbbbbbeahfeeebaaaacbbbbaaabbebfb',
  'abbbbbbbaeebdbaaaabbbbaaaabbbbba',
  'aacbbbbbbbbbdieaaadbbaaaaabbdbba',
  'aabbbbbbebbbdeeaaaaaaaaaaaabdbba',
  'abbbdbbbebbaeeebdaaaaahbbbabddba',
  'abbbbbafeabfeeebhbaaaabbbbbbddaa',
  'abbbhafeaaaaeaebbbaaaabbhbbaddaa',
  'bbbbbbeedahaaabbbbbaaaabbbaaaaaa',
  'dbbbbfefdaabbacbbbbbaaaahaaaaaaa',
  'debebbbaaaabbbbbbbbbbbaaaaaaaaaa',
  'aeeebbgbcaaacbbbbbbbdbaaahaaeaaa',
  'bbebfebahaaabbbbbbbbbaaaahaaaaaa',
  'bbebgbbaaaaaaaaaaabaaaaaaabaccca',
  'bbbbhbbaaaaaaaaaaaaaaaaaaaaahahb',
]

const GRASS_D: PixelFrame = [
  'bbdbbbbbhbbbbbcbbbbaaadbbbbaaabb',
  'bbbbbbbbaabbbbbbbbaaaaabbbbaaabb',
  'hhbbbbbaaabbbbbbbadacccbbbabdbbb',
  'bbbbbeaaahbbbbbaaeaaaaebbbhbbbbb',
  'ddbbbacaaabbcbbacaaaaabbcbbbbbdd',
  'bbbbbaaaaaabbbhaaaaaaaabbbbeebdb',
  'bbbbbbaacccaabbbdbcbhaaaehbeebeb',
  'aaaabbabbbbaaabbdbbbbbaaaaagehga',
  'aaaabbabbbeaaaabdbbbbbbaaaaagaaa',
  'aaaaaaabbbbaaaabdbbbbbahaaabeaaa',
  'bbaaaadaebbbbadddaaaaddaeecbabbb',
  'baaaaadeebbbbbaafaaaaafaeebbbbbb',
  'aaahaafeaabhcccagaaaaaaaafbbbbbb',
  'aaaaaaeeahabbaaaaaeaaaeaeebbbebb',
  'aabaaabddeaeddeaaagaaaagegdfeefb',
  'aaaahbbbbeaeaaeaaaghaaaaeeaeeeea',
  'aaabbbdbbebgaaeaaabaaaaabaeaeaff',
  'aaabbbdbbbeefaaaaaaaaaaaaagaaaea',
  'aaaaaabbhfeeebbaaacbbbbaaaaaeaga',
  'aaaaaabbbeeadbbbbbbbbbbbaaaaaaaa',
  'bacaaaabbbbbdbbbbbdbbbbbbbaadaaa',
  'aaaaaabbebbbdbbbebbbbbbbbaaadaaa',
  'aaaadaabebbbdbbbebbbbbhbbbbbddaa',
  'aaaaaaafebbedbbfgbbbbbbbbbbbddaa',
  'baaahafebabbdbbebbbfbbbbhbbbddab',
  'bbaaaaeedbhbbbbebebebbbbbbbbbbbb',
  'dbbaafefdbbbbbcbbgfbbaabhbbaaabb',
  'dbbebbgeeaabbbbbbbbaaaaaaabaaabb',
  'bbbgbbeaeaabcbbbbbbadaaaahaaebbb',
  'bbbbfeaaeaabbbbbbbbaaaaaahaaaabb',
  'bbbbebaaeaabbbbbbbbaaaaaaaaacccb',
  'bbbbhbbbaabbbbbbbbbaaaabbbbahahb',
]

const GRASS_E: PixelFrame = [
  'bbdbbbbbhbbbabcbbbbaaadaaaabaaab',
  'bbbbbbbbbbbbbbbbbbbbaaaaaaaaaaaa',
  'hhbbbbbbbbbbbbbbbbdbcccaaaaadaaa',
  'bbbbbebbbffbbbbabaabbbebbahaaaab',
  'ddbbbbcbbeebcbbacaaabbfecbaaaadd',
  'bbbbbbbbeeebbbhaaaaaabeebaaeeadb',
  'bbbaabbbeegbbbaadbcbfaaaehaeeaea',
  'bbaaaabbebeaabbbdbbbbfbaaaaeehea',
  'aaaaaaabbbeaaabbdbbbbbbbaaaaeaaa',
  'aaaaaabbbbbaaabbdbbbbbahaaaaeaaa',
  'bbbbbbdbebaaaadddaabbddaeecaaaaa',
  'bbbbbbdeebbaaaaaaaaabafaeeaaaaab',
  'bbbhbbfebbbhcccaaaaaaaaaafaaaabb',
  'bbbbbbeebhbaaaaaaaaaaaeaeeaaaaab',
  'bbbbbbaddebeddeaaacbaabfeedfaaab',
  'bbbbhbaaaebebbeaaabhbbaaeeaebbbb',
  'aaabbbdaaebebbeaaabbbbaaaaebbbbb',
  'aabbbbdaaaeefbbaaabbbbbaaaibbbbb',
  'abbbbbaahfeggbbaaacbbbbaaaabbbbb',
  'bbbbbbaaaeeadaaaaaabbbaaaaaabbbb',
  'bacaaaaaaaaadaaaaadbbbbaaaaadaab',
  'aaaaaaaahaaadbaaeaabbbbaaaaadbbb',
  'aaaadaaacaaadbbaeabbbbhaaaaaddbb',
  'aaaaaaaaaaaedbafeabbbbbaaaaaddbb',
  'abbahaddaaabebaeaabfbbaahaaaddbb',
  'bbbaaaaedahabbaeaebgbbaaaaabbbbb',
  'dbbaaaaedaaaaacbbegbbbaahbbbbbbb',
  'dbaeaaeeebaaaabbbbbbbbaaaabbbbbb',
  'bbaeaaabebbacabbbbbbdbbaahbbebbb',
  'bbeaaabbebbbbabbbbbbbbbaahbebbbb',
  'abeeaabbebbbbbbbbbbbaaaaaaaacccb',
  'bbbbhbbbbbbbbbbbbbbaaaaaaaaahbhb',
]

const GRASS_F: PixelFrame = [
  'aadbbbbahaaaaacbbbbaaadbbbbbbbbb',
  'bbbbbbbaaaaaaabbbbbaaabbbbbbbbbb',
  'hhbbbbbaaaaababbbbdbcccbbbbbdbaa',
  'bbbbbbbaaffabbbbbbbbbbebbbhbbbab',
  'ddbbbbcaaeeacbbbcbbbbbfecbbaaadd',
  'bbbbbbbaeeeaabhbbbbbbbeebbbaaadb',
  'bbbaaabaeeeaabbbdbcbfbbbbhbbaaab',
  'bbbaaaaaeaeaaabbdbbbbgbbabbbbhab',
  'bbbaaaaabaeaaaabdbbbbbbbabbbbbab',
  'bbbaaaaaaaaaaabbdbbbbbbhaabbbbbb',
  'bbaabadaeaaaaaddebbbbddaaacabbbb',
  'bbbbbadeeaaaaabbfbbbbbbaaaabbbba',
  'bbbhbafeaaahcccbeebfbbeaaaabbbaa',
  'bbbaaaegahaaaabbbfeebbaaahaabeaa',
  'bbaaaaadddaadddbbeefbaaaaadaabbb',
  'bbbahaaabbaaaaaaaaeeaaaaaaaaaaab',
  'bbbaaadbbbaaaaaaaabaaaaaabbbbaab',
  'bbbaaadaabhhaaaaaaaaaaaabbbbbbbb',
  'bbabbaaahabadaaaaacaaaabbaaabbbb',
  'bbbbbbaaaaaadaaaaabbaabbaaaabbbb',
  'bbcbbbbaaaaadbaaabdbbbbaaaaadbbb',
  'bbbbbbaaeaaadbaaeabbbbbaaabbdbbb',
  'bbabdaaaeaaadaaaeaaaabhbabbbddbb',
  'baaaaaafgbaedabfebaaaaaaabbbddbb',
  'aaaahafebbaaeabebbafaaaahbbbddbb',
  'aaaaaaeedbhaaaaebeaeaaaabbbbabbb',
  'dbaaagefdbbaaacaaefaaaaahbbbbbbb',
  'debeaaegeabbbbaaaaaaaaaaabbbbbbb',
  'bggeaaaaeaabcbbaaaaadaaaahbbebbb',
  'bbebbbbbeaabbbbbaaaaaaaaahbebbbb',
  'aaeebbbbeaaabbbbaaaaaaabbbbbcccb',
  'aabbhbbaaaaaaabbbbaaaaabbbbbhbhb',
]

const PATH_PALETTE: PixelPalette = {
  a: '#d9b678', // tan base
  b: '#cfab6c', // packed shade
  c: '#e2c184', // sunlit patch
  d: '#bd9455', // worn edge
  e: '#b08a52', // pebble body
  f: '#f0dca8', // grit / pebble light
  g: '#7a5428', // pebble shadow
  h: '#79cf9d', // grass fleck
  i: '#4fae7c', // dark grass fleck
  j: '#c49a5c', // twig
  k: '#6a4a2a', // pebble outline
}

const PATH_A: PixelFrame = [
  'bbbaabbbbabbabaaaaabbbaabbbaaaba',
  'baaaaaaabbbaaaaaaaaaaaaaaaabaaaa',
  'baaffaaaaaaaaaaaaaaaeeaaeababaaa',
  'baaffaaaaaaaaaaaafaaaaaabbbbbfbb',
  'aaaffaaaaaaaaaaaafaaaaaabbbbbfba',
  'baaaaaaaaaaaaaaaafaaaaaabbbbbbba',
  'baaaaaaaaaaaffaaaaaaaaabebbbbbba',
  'aaaaaaaaaaaafeaaaaffaaaeebbbbbba',
  'aaaaaaaaaafffeeaakffkabbbbbbbbba',
  'aaaaaaaaakfffkfaaaggfabbbbbbbbbb',
  'baaaaaafakfeekaaaaafaafbbbbeeebb',
  'baaaaaafaagggaaaaaaaaaabbbbbbbbb',
  'baaaaaaaaaaaaaeaffaaaaabbbbbbaab',
  'baaaaaaaaaaaaaakffkfaaaaaaaaaaab',
  'baaaaaaaafaaaaakfeaaaaaaaaaaaaaa',
  'baaaaaaakfkaaaaaggaafaaafaaaaaaa',
  'aaaaaaaaagaafaaaaaeaaaaafaaaaaab',
  'baaaaabffaaaaaaaaaaaaaaaaaaaaaab',
  'aaaabbaaaaeaaaaaaaaaaajjfaaaaaab',
  'aaaaaafaaaaaaaaaaaaajjakjjaaaaab',
  'aaaaaafaaaaaaaaaaaaafkaaakjaaaaa',
  'aaaaaffaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaafaaaaaaaaaaaaaaaaaaaaaaa',
  'baaaaaaffaaaaaaaaaaaaaaaaeeeeaab',
  'baaaaaaffaaaaaaaaaaaaaaaaaaeeaab',
  'baaaaaafaaaaaaaaaaaaaaabbaaaeeab',
  'baaaaaaaaaaaaaaaaaaaaabbbbaaaeab',
  'baaaaaaaaaeaaaaaaaaaaabbbbbbbbaa',
  'aaaaaaaaaaaaaaaaaaaaaabbbbbaaaaa',
  'baaaaaaaaaaaaaaaaaaaaaabaabaaaaa',
  'baaaaaaaaaaaaaaaaaaaaaaaaaabbaaa',
  'aabaaaaabbbbabaaaaabbbabbaaaabba',
]

const PATH_B: PixelFrame = [
  'aabbaabbbabbabbbbbabbaabbbbaaabb',
  'aaaaaaaaaaaaaaaabbbbbaabbaaaaaba',
  'aaaaaaaaaaaaaaaaaabbbaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaaaabaaaaaaaaaaaab',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
  'baaaaaaaaaaaaaaaaaaaaaaafaaaaaab',
  'haaaaaaaaaaaaaaaaaaaaaaffaaaaaab',
  'bhahaeaaaaaaaaaaaaaaaffffaaaffaa',
  'iaiaaaaaaaaaaaaaaaaaaaaffaaafgaa',
  'bhhaaaaaeaaaaafaaaaaaaaaafaaaaab',
  'biaiaaaaaaaaaffaaafaaaaaaaffkaaa',
  'bahaaaaaaaaaaafaaaaaaaffekfffkaa',
  'aaaffaaaaaaaaaafaaaaaafgakfeekaa',
  'aaaaaaaaaaaaaaaaaaaaaeaaaagggebb',
  'baaaaaaaaaaaaeeaaaaaffffaaaaeeaa',
  'baaaaaaaaaaafaaaaeakfkffaaaaaeaa',
  'aaaaaaaaaaaaaaaaffaagaaaaaaaaaaa',
  'bhaaaaaaaaaaaaaafeaaaaaaaaaaaaab',
  'baaaaaaaafaaaaaaaaaaaaaaaaaaaaab',
  'haaaaaaeaaaaaaffaaaafaaaaaaaaaab',
  'ihahaaeeaaffakffkaaaffaaaaaaaaaa',
  'biiaaafeaafgakfeafaaffaaaaaaaaab',
  'bahaaaaaaaaeaaggaaaaaaaaaaaaaaaa',
  'aaihhaaafaaaaaeaaaaaaaaaaaaaaaaa',
  'aaaiaffkfkaaaffaaaaaaaaaaaaaaaaa',
  'aaaakffkfaaaaaaaaaaaaaaaaaabbaab',
  'baaakfekaaaaaaaaaaaaaaaaabbbbbbb',
  'baafaggaaaaeeaaaaaaaeeebabbbbbbb',
  'aaaaaaaaaaaaaaaaaaaaeeaabbbbbbba',
  'aaaaaaaaabaaaaaaafaaaaaabbbbbbba',
  'aaaaaaaaaaaaaaaaaaaaaaaabbbabbba',
  'aaabbbbaaaabaaaaabbaaaabaaabbbaa',
]

const PATH_C: PixelFrame = [
  'aaabaabaaabbbbbabbbbbabbabbaaabb',
  'aaaabbbbaaaaabbbbbbbbaaaaaaaaaab',
  'aaaaabbbafaaaaabbbbbbaaaaaaaaaab',
  'aaaaaaafaafaaaaabbabaaaaaaaaaaab',
  'haaaaaafaafaaaaaaaaabaaaaaaaaaab',
  'bhahbbbaaaaaaaaaaaaaaaaaaaaaaaaa',
  'iaiaaabbaaaaaaaaaaaafaaaaaaaaaab',
  'baaaaaabaaaafaaaaaaaffaaaaaaaaab',
  'ahhabbbbaaabaaaafaaaaaaaaaaaaabb',
  'aiahbbbbabaabbaaaaaaaaaaaaaaaaaa',
  'aaibbbbbbbfbbbfaaaaaaaaaaaaaaaaa',
  'aahbbbbbbbfbbkfkaaaaaaaaaaaaaaaa',
  'abbibbbbbebbbagaaaaaaaaaafaaaaaa',
  'hbbbbbbbbbbbbaaaaaaaaaaaaaaaafab',
  'ihbbbbbbbbbaaaaeaaaaaaaaaaaaafab',
  'bihhbbbbbabbbaaaaaaaaaaaaaaaafaa',
  'bbifbbbbaaabaaaaaaaaaaaaaaaaaaab',
  'abhffbaaaaffaffaaaafaaaeeaaaaaaa',
  'abihbfaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'abbihbaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'abbbbbaaaaaaaaaaaaaaaaffaaaaaaaa',
  'bbbbbaaaffaaaaaaaaaaaafgaaaaaaaa',
  'abbbbaakffkaaaaaaaaaaaaffaaaaaab',
  'bbbbaaaaggaaaaaeaaaaaaaffaaaaaab',
  'bbbbbaaaaaafaeeeeeeaaeaffaaaaaab',
  'hbbbaaaaaaaaaaaaaaaaaaaaaaaaaaab',
  'aihiaaaaaaaaaaaaaaaaaaaaaaaaaaab',
  'abhbbbaaaaaaaaaaaeaaaaeeeaaeeaaa',
  'ahhbbbaiaiaaaaaaaaaaaiaaaaaeaaaa',
  'bibhbaaahhaaaihaaaaeihhaaaaaiaaa',
  'bbihbaahaaaaihhaaaaahaaaaaaihaaa',
  'baabbbaaibbahiaabbbaaibaaahiaaba',
]

const PATH_D: PixelFrame = [
  'abbbbaaaabbaaabbbabbaaaababaaaaa',
  'abbbaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'bbbbbaaaaaaaaaaaaaaaaaaaaaaaaaab',
  'babeeaaaaafaaaaaaaaaaaaaaaaaaaab',
  'aaaebaaaaafdcaaaaaaaaaaaaaaaaaab',
  'aaaabbaaaaaafaaaaaaaaaaaaaaaaaab',
  'aabaaaaaaaaaacaaaaaaaaffaaaaaaaa',
  'aabbaaaaaaaaaacacacaaafgaaaaabaa',
  'bbaaaabbbaaaaacacfccaaaaeaaaaabb',
  'bbaaaabffbaaaadaafccaaaaeaaaaaab',
  'bababbkffkaaaaccacccaaaaabeeeaaa',
  'bbbbbbkfekaaaaccccccaaaaaaeeeaaa',
  'abbbbbbggfffaaacccccaaaaaaeeaaaa',
  'bbbbbbbbbffffaaacaccaaaaaaaeaaaa',
  'abbbbbbbbfffafffaaaaaaaaaaaaaaaa',
  'abbbbbbbffaaaaaaaaaaaaaaaaaaaaaa',
  'abbbbbbbbbaaaaacaaaaaaaaaaaaaaab',
  'abbbbbbbbbaaaacaaaaaaaaaaaafaaab',
  'abbbbbbbbbaaadcaaaaaaaaaaaaaaaab',
  'bbbbbbbbbaaaaaacaafaffaaaaaaaaab',
  'bbbbbbbbaaaaaaacaaaaaffaaaaaaaaa',
  'bbbbbbbaaaaaaaaacaaaaafafaaaaaaa',
  'aabaaaaaaaaaaaaaaaaaaaakfkabaaaa',
  'aaaaaaaaaaaaaaaadcaaaaaagaabaaaa',
  'aaaaaaaaaaaaaeefacaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaeeaaacaaaaaaaaaaaaa',
  'baaaaaaaaafaaaeaadcfaaaaaaaaaaaa',
  'ihiaaaaaaafaaaaadcaaaaaaaaaaaaab',
  'aiaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
  'haaiaaaaaaaaaaaaafaaaaaaaaaaaaaa',
  'baihhaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aahhbbbbaaabbbbaabbbaabaaabbbaab',
]

/* ------------------------------------------------------------------ */
/* Sand                                                                */
/* ------------------------------------------------------------------ */

const SAND_PALETTE: PixelPalette = {
  a: '#ecd9a0', // pale sand
  b: '#e3cd90', // soft shade
  c: '#f4e4ae', // sunlit patch
  d: '#d9bf7d', // damp edge
  e: '#c9ad6a', // wet sand
  f: '#f7ebb9', // grain highlight
  g: '#b89a58', // pebble shadow
  h: '#9c7f45', // pebble body
  i: '#79cf9d', // grass fleck
  j: '#4fae7c', // dark grass fleck
  k: '#f5e6d0', // shell
  l: '#d9c4a8', // shell shade
  m: '#7a5c30', // pebble outline
}

const SAND_A: PixelFrame = [
  'baaabaaaaabbbbbaaaaabbaaaaaabaab',
  'baaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
  'baaaaaaaaafaaafaaaaaaaaaaaaaaaab',
  'baaaaaaaaaaafffaaaaaaaaaaaaaabba',
  'baaaaaaaaaaafaaaaaaaaaaaaaaaabba',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaabbba',
  'aaaaaaaaaaaaaaaaaabaaaaaaaaabbba',
  'aaaaaaaaaadaaadaaaabaaabaabbbbba',
  'baaaaaaaaaaaaaaafbbbaaabbbbaaabb',
  'baaaaaaaaaaaaaaaabkkkkaafbbababb',
  'aafaaaaaaaaaaaaaakllllkadbbabbbb',
  'aaaaaaaaaaaaaaaaaklkkklabbbbbbbb',
  'aaaaaaaaaaaaaadaakllllkabbbbbbba',
  'baaaaaaaaaaaaddaabkmmkaabbbbbbba',
  'baaaaaaaaaaaaadaabbbbafabbbbbbbb',
  'bbaaaaaaaaaaaaakkbbbbbaakkbbbbba',
  'bbbaaaaaaffaaaalkbbfbbakllkbbbba',
  'abbbaaafffaaaafbbbbbbbaklkkfbbba',
  'abbbaaafaffaaaaabbbbbbbbkkfbbbbb',
  'abbbaaaaaaffaaaabbbbbbbbbdbbbbbb',
  'bbbbaaaaaaffdaaaabbbbbbbfdbbbbba',
  'bbbbbbbaaafaaaaaaaddbbbbfbbbbbba',
  'bbbbbbbbbbdbaaaaaaadbbddddbdbbba',
  'baabbbbbbbbbaaaaaaabbbdddbbbbbba',
  'aaaabbbbbbbbaaaaaabbbdddddbbbbba',
  'baaffbbbbbbbbaabaabbbdddedbbbbbb',
  'baaffbbbbbbbbbaaddbbbbebdbbbbbbb',
  'aafffbbbbbbbbbbbddabeddddbbfbbba',
  'aaffabbbbbbbbbbaddaabdbddbbfbbbb',
  'aafaaaaabbbbbbaaaaaabbbbbbbfbbbb',
  'baaaaaaabbbbbaaaaaabbbbbbbbbbbbb',
  'aaaaabbbabbabbbaabaaaabbbaaaabaa',
]

const SAND_B: PixelFrame = [
  'abbaaabbaaababbbbaaabbbbaabbbbaa',
  'abbbbbbbbaabbbbbabaaaaaaaaaaaaaa',
  'abbaabbbbaabbbbbabbaaaaafaaaaaab',
  'bbaaabbdaaaabbbbbbbbbbbffbabaaab',
  'baaabaadaaaaabbbbbbbbbbbbbbbabbb',
  'aaabbaaaaafaaabbbbbbbbbbbbbfbbba',
  'ababbaaaaaffabebbbbbbbbbbbbbbbbb',
  'abbdbaaaaaffabbbbbbbbbbbbbbbbbbb',
  'abbbbaaaaffffbbbbbbbbbbbbbbbbbba',
  'abbbbbaaafffabbbbbbbbbcbbbbbbbba',
  'bbbbbbddaaffabbbbbbbccbbbbbbbbba',
  'bbbbbaddaafaabbbbbcbbbbbbbbbbbba',
  'babbfaaeaaaaabbbccbbbbbbbbbbbbbb',
  'baaaaaaaaaaaabcbbbbbbbbbbbbbbbba',
  'baaaaaaaaaaaccbbbfbbbbbbbbbbbbba',
  'aaaaaaaaaacbbbbbbbbbbbbbbbbbfbba',
  'aaaaaaaaccbbbbbbbbbbbbbbbbbfcaba',
  'aaaaaaacbbbbbbbbbbbbbbbbbbccdabb',
  'aaaaaaabbbababbbbbbbbfbcbcddaaab',
  'baaaaaaaabaaaaabbdbbfccdbdaaaaab',
  'baaaaaaaaaaaaaaaadcbcddbbdddaaaa',
  'baaaaaaaaaaaaaaaccdbdbaaadedaaba',
  'aaaaaaaaaaaaacacddbbbaaadaaaaaba',
  'aaaaaaaafaaccdadabbbaaaaaaaaaabb',
  'aaaaaaafcacddaaaaaabbaaafaaaaaab',
  'aaaaaaccdadaaaaaaaaebbaaaaafaaba',
  'baaaccddaaaaaaaaaaaaaaaaaaafaabb',
  'baaaddaaaaaaaaaaafddaaaaaaaaaabb',
  'baaacaaaafaaaaaaaaadaaaaaaaaaaab',
  'aaaabaaaaaaaaaaaaaaabbbaaaafaaab',
  'baaaaaaaaaaaaaabaaaabbaaaaaaaaaa',
  'bbbabaaaababbbabbaaabbbaaaabaaba',
]

const SAND_C: PixelFrame = [
  'aaaaabbabbaaaaababaaaaabbbbbabba',
  'baaabbaaaaaaaaaaaaaaaaababbbbaaa',
  'bbaaaaaaaaaaaaaaaaaaaabbbbbbbbbb',
  'aaaaaaaaaaaaaaaaaaaaabbffffbbbab',
  'baaaaaaaaaaaaaaaaabbbbbfffbbbbab',
  'baaaaaaaaaaafaaaabbbbbbbbbbbbbba',
  'baaaaaaaaaaaaaaaaabbbbbbbbbbbbba',
  'baaaaaaaaaaaaaaaaaaabbbbbbbbbbba',
  'aaaaaaaaaaaaaaaaaaabbbbbfbbbbbba',
  'aaaaaaaaaaaaaaaaaaaedbbffbbbbbba',
  'aaaaaaddaaaaaaaaaaaabbbfffbbbbbb',
  'baaaaaadaaaaaaaaaaaaabbffbbbbbbb',
  'baaaaaaaaaaaaaaaaaaaaaffbbbaaaab',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaafaaaa',
  'aaaaaaaaaaaaaaaaaaaafaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaddaa',
  'baaaaaaaaaaaaaaaaaaaaaaaaaaadaaa',
  'baaaaaaaaaaaaaaaaaaaaaaaaaaadaab',
  'baaaaaafaaaaaaaaaaaaaaaaaaaaaaab',
  'bafaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
  'bafaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
  'aafaaaaaaaaaaaaaaaaaaaaaaeaaaaab',
  'aaaaaaaabbaaaaaaaaaaaaaadaaaaaaa',
  'baaaaaabbbbbbaaaaaaaaaaaaaaabaab',
  'baaaabdbbbbbbbaafaaadaaaaaabbaba',
  'babbeebbbbbbbbbaadaaaaaaaaaaaaaa',
  'babbbbeebbbbbbbaadabaaaaaaaaaaab',
  'aabdbbbdeebddbbbddbbaaaaaaaaaaaa',
  'aaaaaebbbaeabbabbdbaaaaaaaaaaaaa',
  'aaaeaaeeaaaaaaaabbbbaaaaaaaaaaab',
  'baaaaaaaedaaaaaabbbaaaaaaaaaaaaa',
  'bbaabbbaaabbbaabbbbbaaabbbbbabba',
]

const SAND_D: PixelFrame = [
  'bbbbbaaaaabbbaaaabbbbabaaaababba',
  'baaaaaaaaaaaaaaaabbbbbbbbbbbaaaa',
  'baaaaaaaaaaafaaaaaababbbbbbbbaaa',
  'bababaaaaffffffaaaaaabbbbbbabbaa',
  'babbbbaabbfffaaaaaaaaaabbabbbbaa',
  'babbbbbbbbbbdbbbaaaaaabbabbbaaab',
  'aabbbbbbbbbbbbbbbbdaaabbaaaaaaab',
  'aabbbbbbbbbbbbbbbbaaaaaaaaaaaaab',
  'abbbbbbbbbbbbbbbaaaaaaaaaaaaaaaa',
  'bbbbbbbbbbbbbbaaaaaaaaaaaaaaaaab',
  'abbbbbbbbbbbbaaaaaaaaaaaaaaaaaaa',
  'bbbbbbbbbbbbbbaaaaaaaaaaaaaaaaab',
  'bbbbdbbbbbbbabdaaaaaaaaaaaaaaaaa',
  'abdddbbbbffaaaaafafaaaaaaaaaaaaa',
  'abddbbbbffffaaaaaafaaaaaaaaaaaaa',
  'abbbbbbbaaaaaaafaaaffaaaaaaaaaab',
  'abbbbbbaaaaaffaaaaahgaaaaaaaaaaa',
  'bbbbbbaaaddmffmfffaafffaaaaaaaaa',
  'bbbbbbbaaddmhhmaaaaaffaaaaaaaaaa',
  'abbbbbaaadddggaaafaaaaaaaaaaaaaa',
  'abbbbbbaaafdaaaamfmaaaaaaaaaaaaa',
  'abbbbbbbbbddaaaaagaaaaaaaaaaaaab',
  'babbbbbbdbbaaaaaaafaaaaaaaaaaaab',
  'baabbbbbbbddafaaaaaaaaaaaaaaaaab',
  'badbbbbbbbddbafaaaaaffdaaaaaaaaa',
  'baaabbbbbbbbaaaaaaaafaaaaaaaaaab',
  'baaabbbbbbbbbbaaaaaaaaaaaaaaaaab',
  'aaaabbddbbbfbaaaaaaaaaaaaaaaaaaa',
  'aaaabbbbbbbbbbaaaaaaaaaaaaaaaaaa',
  'aaaabbbbbbbbbaaaaaaaaaaaaaaaaaaa',
  'baaabbbbbbbbbaaaaaaaaaaaaaaaaaaa',
  'bbaaabaaaabbbbabbbaaaabbbaaabbaa',
]

/* ------------------------------------------------------------------ */
/* Water                                                               */
/* ------------------------------------------------------------------ */

const WATER_PALETTE: PixelPalette = {
  a: '#3f74d8', // cobalt base
  b: '#3565c4', // soft shade
  c: '#2a55b0', // deep
  d: '#1f4490', // deepest / bank shadow
  e: '#5a8ee4', // light
  f: '#b6ecf4', // pale crest
  g: '#eafcff', // glint
  h: '#86c8ec', // mid crest
  i: '#2c5cba', // ripple shadow
  j: '#244a8a', // submerged stone
  k: '#5a8a6a', // submerged moss
}

const WATER_A: PixelFrame = [
  'hddddkdddddddddddddddjdddddddddh',
  'ihddjjjdddddddddddddjjjdddddddhi',
  'dihhdjdddddddddddccccjcccdddhhid',
  'ddiiddddddkccccccccccccccdddiidd',
  'dddddddccjjjcccccghhhhhhhcdddddd',
  'dddddddcccjhghhghiiiiiiiiccddddd',
  'ddddddchghiiiiiiicccccccchccdddd',
  'dddddcciiicccccccccccccccigccddd',
  'dddccchbccccccccccccccccccigccdd',
  'ddccchiaaaaaaaaaeeeeeeeeaeeigccc',
  'cccghiaaaaaaaaaaaaaaeeeaaaeeihcc',
  'cchiiaaaaaaaaaaaaaaaaaaaaaagaigg',
  'hgiaaaaaaaaaaaaaaaaaaaaaaaffffii',
  'iiaaaaaaaaaaaaaaaagaaaffffiiiiff',
  'bbbbbaaaaaaaaaaaaaffffiiiiaaaaii',
  'bbbbbaaaaaaagaaaaaiiiibbbbbbabbb',
  'bbbbbaaaaaaffaaaaaaabfbbbbbbbbbb',
  'bbbbbaaaaaaaifaaaagffbbbbbbbbbbb',
  'bbbbaaaaaaaaiiffffffiaaaaaaabbbb',
  'bbbaaaaaaaaaaaiiiiiiiaaaaaaaabbb',
  'bbbaaaaaaaaaaaaaiaaaaaaaaaaaaabb',
  'bbfbaaaaaaahfhhhagaaaaaaaaaaaabb',
  'bbbfaaaabhhfiiiihhaeeeeeeegaaabb',
  'bbbiffffffficffciihhegefffffaabb',
  'bbbaiiiiiiiaaaiffciieffiiiiifabb',
  'aaaahcccchaaaeiiiffffiieeeeeiaaa',
  'aaahiiiiiihaaeffiiiiifeeeeeehaaa',
  'hhhiccccccihfegiiiiifgfeeeeeihhh',
  'iiiiaafiiiciifffeeeiififeeeeiiii',
  'cihhaaiaaiicgiiieeeeeieieeeehhic',
  'ihaaaaaaaaaaaieeeeeeeeeeeeeeeghi',
  'haaaaaaaaaaaaaeeeeeeeeeeeeeeeeah',
]

const WATER_B: PixelFrame = [
  'hddddkdddddddddddddddjdddddddddh',
  'ihddjjjdddddddddddddjjjdddddddhi',
  'dihhdjdddddddddddccccjcccdddhhid',
  'ddiiddddddkccccccccccccccdddiidd',
  'dddddddccjjjcccccghhhhhhhcdddddd',
  'dddddddcccjhghhghiiiiiiiiccddddd',
  'ddddddchghiiiiiiicccccccchccdddd',
  'dddddcciiicccccccccccccccigccddd',
  'dddccchbccccccccccccccccccigccdd',
  'ddccchiaaaaaaaaaeeeeeeeeaeeigccc',
  'cccghiaaaaaaaaaaaaaaeeeaaaeeihcc',
  'cchiiaaaaaaaaaaaaaaaaaaaaaaaaigg',
  'hgiaaaaaaaaaaaaaaaaaaaaaaaaaagii',
  'iiaaaaaaaaaaaaaaaaaaaaaaaaaaffff',
  'ffbbbaaaaaaaaaaaaaaagaaaffffiiii',
  'iibbbaaaaaaaaagaaaaaffffiiiiabbb',
  'bbbbbaaaaaaaaffaaaaaiiifbbbbbbbb',
  'bbbbbaaaaaaaaaifaaaabffbbbbbbbbb',
  'bbbbaaaaaaaaaaiiffffffiaaaaabbbb',
  'bbbaaaaaaaaaaaaaiiiiiifaaaaaabbb',
  'bbbaaaaaaaaaaaaaaafiiiiaaaaaaabb',
  'bbbbfaaaaaaaaafaaaigaaaaaaaaaabb',
  'bbbaafaabaaaafhhhhaeeeeeeeaaaabb',
  'bbbaaifffffffiiffihheeegefeagabb',
  'bbbaaaiiiiiiiccciffihhefffffffbb',
  'aaaaaaaiiiicceeeiiiffffiiiiiiifa',
  'aaaaaahcccchaeeeeeiiiiieeeeeaaia',
  'aaaaahiiiiiiheeeffffffffeeeeaaha',
  'hhiihiccccccihfegiiiiifgfeeeiiih',
  'iihhicaafiiicigfffeeeiififeehhii',
  'ihcccaaaiaaiiciiiieeeeeieieeeahg',
  'haaaaaaaaaaaaaeieeeeeeeeeeeeeeah',
]

const WATER_C: PixelFrame = [
  'hddddkdddddddddddddddjdddddddddh',
  'ihddjjjdddddddddddddjjjdddddddhi',
  'dihhdjdddddddddddddddjddddddhhid',
  'ddiiddddddkddddddccccccccdddiidd',
  'dddddddddjjjcccccccccccccddddddd',
  'dddddddcccjccccccghhhhhhhcdddddd',
  'dddddddccchhghhghiiiiiiiiccddddd',
  'ddddddchghiiiiiiicccccccchccdddd',
  'dddddcciiicccccccccccccccigccddd',
  'dddccchaaaaaaaaaeeeeeeeeaeigccdd',
  'ccccchiaaaaaaaaaaaaaeeeaaaeigccc',
  'cccghiaaaaaaaaaaaaaaaaaaaaaaihcc',
  'hghiiaaaaaaaaaaaaaaaaaaaaaaaaigg',
  'ffiaaaaaaaaaaaaaaaaaaaaaaaaaaaff',
  'iiffbaaaaaaaaaaaaaaaaagaaaffffii',
  'bbiibaaaaaaaaaaagaaabbffffiiiibb',
  'bbbbbaaaaaaaaaaffaaabbiiifbbbbbb',
  'bbbbbaaaaaaaaaaaifaabbbffbbbbbbb',
  'bbbbaaaaaaaaaaaaiiffffffiaaabbbb',
  'bbbaaaaaaaaaaaaaaaiiiiiifaaaabbb',
  'bbbaaaaaaaaaaaaaaaaafiiiiaaaaabb',
  'bbbbaafaaaaaaaaafaaaigaaaaaaaabb',
  'bbbaaaafbaaaaaafhhhheeeeeeaaaabb',
  'bbbaaaaifffffffiiffihheeegefaagb',
  'bbbaaaabiiiiiiiccciffihhefffffff',
  'faaaaaaaaiiiicceeeiiiffffiiiiiii',
  'iaaaaaaahccccheeeeeeiiiiieeeaaaa',
  'haaaaaahiiiiiiheeeffffffffeeaaaa',
  'ihiihhhiccccccihfegiiiiifgfeiiaa',
  'cihhiiicaafiiicigfffeeeiififhhia',
  'igcccccaaaiaaiiciiiieeeeeieieahi',
  'haaaaaaaaaaaaaeeeieeeeeeeeeeeeah',
]

const WATER_D: PixelFrame = [
  'hddddkdddddddddddddddjdddddddddh',
  'ihddjjjdddddddddddddjjjdddddddhi',
  'dihhdjdddddddddddccccjcccdddhhid',
  'ddiiddddddkccccccccccccccdddiidd',
  'dddddddccjjjcccccghhhhhhhcdddddd',
  'dddddddcccjhghhghiiiiiiiiccddddd',
  'ddddddchghiiiiiiicccccccchccdddd',
  'dddddcciiicccccccccccccccigccddd',
  'dddccchbccccccccccccccccccigccdd',
  'ddccchiaaaaaaaaaeeeeeeeeaeeigccc',
  'cccghiaaaaaaaaaaaaaaeeeaaaeeihcc',
  'cchiiaaaaaaaaaaaaaaaaaaaaaaaaigg',
  'hgiaaaaaaaaaaaaaaaaaaaaaaaaaaaii',
  'ffffaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'iiiiffaaaaaaaaaaaaaaaaaagaaaffff',
  'bbbbiiaaaaaaaaaaaagabbbbffffiiii',
  'bbbbbaaaaaaaaaaaaffabbbbiiifbbbb',
  'bbbbbaaaaaaaaaaaaaifbbbbbffbbbbb',
  'bbbbaaaaaaaaaaaaaaiiffffffiabbbb',
  'bbbaaaaaaaaaaaaaaaaaiiiiiifaabbb',
  'bbbaaaaaaaaaaaaaaaaaaafiiiiaaabb',
  'bbbbaaaafaaaaaaaaafaaaigaaaaaabb',
  'bbbaaaaabfaaaaaaafhhhheeeeaaaabb',
  'gbbaaaabbifffffffiiffihheeegafbb',
  'ffbaaaabbbiiiiiiiccciffihhefffff',
  'iifaaaaaaaaiiiicceeeiiiffffiiiii',
  'aaiaaaaaaahccccheeeeeeiiiiieaaaa',
  'aahaaaaaahiiiiiiheeeffffffffaaaa',
  'aaiihhhhhiccccccihfegiiiiifgiiaa',
  'aihhiiiiicaafiiicigfffeeeiifhhia',
  'ihagcccccaaaiaeiiciiiieeeeeieihi',
  'haaaaaaaaaaaaaeeeeeieeeeeeeeeeah',
]

const WATER_E: PixelFrame = [
  'hddddkdddddddddddddddjdddddddddh',
  'ihddjjjdddddddddddddjjjdddddddhi',
  'dihhdjdddddddddddccccjcccdddhhid',
  'ddiiddddddkccccccccccccccdddiidd',
  'dddddddccjjjcccccghhhhhhhcdddddd',
  'dddddddcccjhghhghiiiiiiiiccddddd',
  'ddddddchghiiiiiiicccccccchccdddd',
  'dddddcciiicccccccccccccccigccddd',
  'dddccchbccccccccccccccccccigccdd',
  'ddccchiaaaaaaaaaeeeeeeeeaeeigccc',
  'cccghiaaaaaaaaaaaaaaeeeaaaeeihcc',
  'cchgiaaaaaaaaaaaaaaaaaaaaaaaaigg',
  'hgffffaaaaaaaaaaaaaaaaaaaaaaaaii',
  'ffiiiiffaaaaaaaaaaaaaaaaaagaaaff',
  'iibbbaiiaaaaaaaaaaaaaaaaaaffffii',
  'bbbbbaaaaaaaaaaaaaaagbbbbbiiiibb',
  'bbbbbaaaaaaaaaaaaaaffbbbbbbbbfbb',
  'bbbbbaaaaaaaaaaaaaaaifbbbbgffbbb',
  'bbbbaaaaaaaaaaaaaaaaiiffffffibbb',
  'bbbaaaaaaaaaaaaaaaaaaaiiiiiiibbb',
  'bbbaaaaaaaaaaaaaaaaaaaaaiaaaaabb',
  'bbbbaaaaaafaaaaaaaahfhhhagaaaabb',
  'bbgaaaaabaafaaaaahhfiiiihhaaaabb',
  'ffffaaabbbaiffffffficffciihhagbf',
  'iiiifaabbbaaiiiiiiieeeiffciiaffi',
  'aaaaiaaaaaaahccccheeeeiiiffffiia',
  'aaaahaaaaaahiiiiiiheeeffiiiiifaa',
  'aaaaihhhhhhiccccccihfegiiiiifgfa',
  'aaiiciiiiiicaafiiiciifffeeeiiiif',
  'aihhaccccccaaaieeiicgiiieeeehhii',
  'ihaaagaaaaaaaaeeeeeeeieeeeeeeahi',
  'haaaaaaaaaaaaaeeeeeeeeeeeeeeeeah',
]

const WATER_F: PixelFrame = [
  'hddddkdddddddddddddddjdddddddddh',
  'ihddjjjdddddddddddddjjjdddddddhi',
  'dihhdjdddddddddddccccjcccdddhhid',
  'ddiiddddddkccccccccccccccdddiidd',
  'dddddddccjjjcccccghhhhhhhcdddddd',
  'dddddddcccjhghhghiiiiiiiiccddddd',
  'ddddddchghiiiiiiicccccccchccdddd',
  'dddddcciiicccccccccccccccigccddd',
  'dddccchbccccccccccccccccccigccdd',
  'ddccchiaaaaaaaaaeeeeeeeeaeeigccc',
  'cccghgaaaaaaaaaaaaaaeeeaaaeeihcc',
  'cchiffffaaaaaaaaaaaaaaaaaaaaaigg',
  'ffffiiiiffaaaaaaaaaaaaaaaaaagaii',
  'iiiiaaaaiiaaaaaaaaaaaaaaaaaaffff',
  'bbbbbaaaaaaaaaaaaaaaaaaaaaaaiiii',
  'bbbbbaaaaaaaaaaaaaaabbgbbbbbabbb',
  'bbbbbaaaaaaaaaaaaaaabffbbbbbgbbf',
  'bbbbbaaaaaaaaaaaaaaabbifbbbffffb',
  'bbbbaaaaaaaaaaaaaaaaaaiiffffffib',
  'bbbaaaaaaaaaaaaaaaaaaaaaiiiiiibb',
  'bbbaaaaaaaaaaaaaaaaaahhhhhaaaabb',
  'bbbbgaaaaaaafaaaaaahhifiiihgaabb',
  'bfffffaabaaaafahhhhiifcccciihhbb',
  'bfiiiifbbbaaaifffffffieffecciibg',
  'fbbaaaibbbaaaaiiiiiiieeeiffeccgf',
  'iaaaaahaaaaaahiiiiiiheeeiiiffffi',
  'faaaaaihhhhhhiccccccihfegiiiiiig',
  'ifaaaaciiiiiiceefiiiciifffeeaiif',
  'aiiiaaaccccccaeeieeiiciiiieeiiai',
  'aihhaaaaaaaaaaeeeeeeeegieeeehhia',
  'ihaaaaagaaaaaaeeeeeeeeeeeeeeeahi',
  'haaaaaaaaaaaaaeeeeeeeeeeeeeeeeah',
]

const WATER_G: PixelFrame = [
  'hddddkdddddddddddddddjdddddddddh',
  'ihddjjjddddddddddcccjjjccdddddhi',
  'dihhdjddddcccccccccccjcccdddhhid',
  'ddiidddccckccccccghhhhhhhcddiidd',
  'dddddddccjjjghhghiiiiiiiiccddddd',
  'ddddddchghjiiiiiicccccccchccdddd',
  'dddddcciiicccccccccccccccigccddd',
  'dddccchbccccccccccccccccccigccdd',
  'ddccchibcccccccccccccccccccigccc',
  'cccghiaaaaaaaaaaeeeeeeeeaeeeihcc',
  'cchiiaagaaaaaaaaaaaaeeeaaaeeeigg',
  'hgiaaaffffaaaaaaaaaaaaaaaaaaaaii',
  'iiffffiiiiffaaaaaaaaaaaaaaaaaaga',
  'ffiiiiaaaaiiaaaaaaaaaaaaaaaaaaff',
  'iibbbaaaaaaaaaaaaaaaaaaaaaaaaaii',
  'bbbbbaaaaaaaaaaaaaaabbbbgbbbabbb',
  'bfbbbaaaaaaaaaaaaaaabbbffbbbbbgb',
  'fbbbbaaaaaaaaaaaaaaabbbbifbbbfff',
  'ibbbaaaaaaaaaaaaaaaaaaaaiiffffff',
  'bbbaaaaaaaaaaaaaaaaaaaaaaaiiiiii',
  'bbbaaaaaaaaaaaaaaaaaaaahhhhhaabb',
  'bbbbaagaaaaaaafaaaaaahhifiiihgbb',
  'bbbfffffbaaaaaafahhhhiifcccciihh',
  'bgbfiiiifbaaaaaifffffffieffaccii',
  'gffaaaabibaaaaaaiiiiiiieeeiffacc',
  'fiiaaaaahaaaaeehiiiiiiheeeiiifff',
  'igfaaaaaihhhhhhiccccccihfegiiiii',
  'ififaaaaciiiiiiceefiiiciifffaaai',
  'aiiiaaaaacccccceeeieeiiciiiiiiaa',
  'aihhaaaaaaaaaaeeeeeeeeeegieehhia',
  'ihaaaaaaagaaaaeeeeeeeeeeeeeeeahi',
  'haaaaaaaaaaaaaeeeeeeeeeeeeeeeeah',
]

const WATER_H: PixelFrame = [
  'hddddkdddddddddddddddjdddddddddh',
  'ihddjjjdddddddddddddjjjdddddddhi',
  'dihhdjdddddddddddccccjcccdddhhid',
  'ddiiddddddkccccccccccccccdddiidd',
  'dddddddccjjjcccccghhhhhhhcdddddd',
  'dddddddcccjhghhghiiiiiiiiccddddd',
  'ddddddchghiiiiiiicccccccchccdddd',
  'dddddcciiicccccccccccccccigccddd',
  'dddccchbccccccccccccccccccigccdd',
  'ddccchiaaaaaaaaaeeeeeeeeaeeigccc',
  'cccghiaaagaaaaaaaaaaeeeaaaeeihcc',
  'cchiiaaaffffaaaaaaaaaaaaaaaaaigg',
  'ggiaffffiiiiffaaaaaaaaaaaaaaaaii',
  'ffffiiiiaaaaiiaaaaaaaaaaaaaaaaaa',
  'iiiibaaaaaaaaaaaaaaaaaaaaaaaaaab',
  'bbbbbaaaaaaaaaaaaaaabbbbbbgbabbb',
  'gbbfbaaaaaaaaaaaaaaabbbbbffbbbbb',
  'fffbbaaaaaaaaaaaaaaabbbbbbifbbbf',
  'ffibaaaaaaaaaaaaaaaaaaaaaaiiffff',
  'iibaaaaaaaaaaaaaaaaaaaaaaaaaiiii',
  'bbbaaaaaaaaaaaaaaaaaaaaaahhhhhbb',
  'bbbbaaaagaaaaaaafaaaaaahhifiiihg',
  'hhbaafffffaaaaaaafahhhhiifccccii',
  'iibgafiiiifaaaaaaifffffffieffacc',
  'ccgffaabbbiaaaaaaaiiiiiiieeeiffb',
  'fffiiaaaaahaaeeeehiiiiiiheeeiiif',
  'iiigfaaaaaihhhhhhiccccccihfegiii',
  'aiififaaaaciiiiiiceefiiiciifffaa',
  'aaiiaiaaaaacccccceeeieeiiciiiiaa',
  'aihhaaaaaaaaaaeeeeeeeeeeeegihhia',
  'ihaaaaaaaaagaaeeeeeeeeeeeeeeeahi',
  'haaaaaaaaaaaaaeeeeeeeeeeeeeeeeah',
]

/* ------------------------------------------------------------------ */
/* Flower                                                              */
/* ------------------------------------------------------------------ */

const FLOWER_PALETTE: PixelPalette = {
  a: '#79cf9d', // mint base
  b: '#72c795', // soft shade
  c: '#80d3a2', // soft light
  d: '#6bbd8b', // deeper patch
  e: '#4fae7c', // dark blade
  f: '#a9e9bd', // light blade
  g: '#35915f', // deep blade base
  h: '#8fdcaa', // mid-light speckle
  i: '#b6e8a8', // warm dew fleck
  o: '#2a2431', // poppy heart
  r: '#e05a5a', // poppy red
  R: '#b83e3e', // poppy shade
  w: '#f5f0ff', // daisy white
  W: '#d8d0e8', // daisy shade
  y: '#ffd966', // gold heart
  Y: '#d9a83e', // gold shade
  s: '#3f7a4a', // stem
  l: '#5f9a5a', // leaf
  u: '#7a9fe0', // bluebell
  U: '#5a7fc0', // bluebell shade
}

const FLOWER_A: PixelFrame = [
  'bbddddbbbbaacccccccccccaaaaabbbb',
  'bdidddbbbbaacccccccccccaaaaabbbb',
  'bdddddbbbbaaccccccdddcaaaaaaaabe',
  'adddddbbbbaaacccccddddaaaaaaaaaa',
  'cdddddaaaaaaaccccccddcaaaaaccccc',
  'cfdddaaaaaaaacccccccccaahaacccci',
  'ccdddaaaaaaccaaaaaaaccaaahahaccc',
  'cccccccccccccaaaaaaaaaaccaaaaacc',
  'ccccccccccccccaafaaaaacccaaaaacc',
  'cciccccccccccaiaeaaahaccccaaaacc',
  'cccccccccccccaaaeaaaaccfcccccccc',
  'cccccccccceaafaaeaaaccceccfccccc',
  'aaccccaaaaaaaeaaeaaaccccececccca',
  'aaaaaaaaaaaaagaegaaawwwcefecaaaa',
  'aabbbbbbbbbbbbgagaawcccweceaaaaa',
  'abbbfbbbbbbbbbbbaaaacyccgcgabbba',
  'abbbbbrrrbbbbbbfaaawcYcwlcgabbbb',
  'bbbberrrrrbdbbbaaaaWcwcWccaabbbb',
  'bbbbrrryrrrdbaaaaaaaaascccaddbbb',
  'bbbbrrroorrdaaaaaaaallsfccaddbbb',
  'bbbbrrrrRRrdaaaacaaablsaaaadbbbb',
  'bbbbarrrrrddcccccfaabbsaaabbbbeb',
  'bfbaecrrrddddcaaaeaaabsbbbbbbbbb',
  'befaecclsddddcaaaleaalsbbbibbbbb',
  'bbecgcccsddddcualaeaabsbbbhfblbb',
  'bbeccgclsdfddusuaagaabsbbbgblbbf',
  'bbeacccdsddddUuUagaaaabbbbsbbbeb',
  'bagaaaadsdddddUsaaacaabbblbsbbgb',
  'bgbaaaaddddddclsaahccabbbblsaaag',
  'bbbbbaabdddddccscccccaabbbbsabbb',
  'bbbbbbbbbbaccccsccccccaabaasbbbb',
  'bbbddbbbbbaaccccccccccaaaaaabbbb',
]

const FLOWER_B: PixelFrame = [
  'bbbbbbbbbbaaccccccccccccccaabbbh',
  'bbbbbabbbaacccccccccccccccaaabbb',
  'aaaaaaaaaaacccccccccccccccfaaaaa',
  'aaaaaaaaaaacccccccccccccccccccaa',
  'ccccaaaaaacccccccccccccccccccccc',
  'ccccaaaaaaccccccccccaaaaaccccccc',
  'ccccaaaaacccccccccccaaaaaahccccc',
  'cccaaaaaccccccccchcaaaaaccachccc',
  'cccaaaaccicccciccccaaaaaccaacccc',
  'cccaaaaaaacccccccccaaaaacaaaaccc',
  'ccaafaaaaaaaccccfcfcaaaaaaaaaaac',
  'aaabebaaaaaaaaaaececccaaaaaaaeaa',
  'bbbbbebfaaaaaaaaaececcaaaaaaebbb',
  'bbbbbeeaaaaaaaaaaefecwwwaaaabbbb',
  'bbbbaggaaaaaaaaaaeeewcccwcaebbbb',
  'bbfbgagaaaaaaaaaagggccyccccaabbf',
  'bbeaaaarrraaaaafaagcwcYcwccaabbe',
  'ebbeaarrrrraaaaafaccWcwlWccaabbb',
  'ebbebrrryrrrcaaaeeddddsccccaabbb',
  'eebebrrroorrcccaggddllsccccaabbb',
  'ggbgbrrrrRRrccgagddddlsccfccaabb',
  'gbgbbarrrrrccccaaaddddsccecaaabb',
  'bbbbaalrrrhcccciccccccscfecaabbb',
  'bbfbacclscccccccclcaflsceeciabbb',
  'bbbaacccseccccculccaacsceechflbi',
  'bfbaacclscccccusucaaacscggcglbbb',
  'bbbaacccscccclUuUaaaacccgcgsaabb',
  'bbaaaaaasacccclUaaaaacccclcsaaab',
  'aaaaaaaaafaccclsbaaacccccclsaaaa',
  'aaaaaaaaaaacccasaaaacccccccsaaaa',
  'bbaaaaaabaaccccsaaaccccccccsaaab',
  'bbbbbabbbaaccccccccccchcccaaabbb',
]

const FLOWER_C: PixelFrame = [
  'bbbbbbiaaaabbbbbbbbbbbbbbbaaaaab',
  'bbbbbbaaaaabbbbbbbbbbbbbbaaaaaaa',
  'aaaaaaaaaabbbbbbbbbebbbaaaaahaaa',
  'aaaaaaabbbbabbbbbbbhbbbaaaacccaa',
  'aaaaaaabbbbaabbbbbbbhbaaaaacccaa',
  'aaaaaaabbbaaabbbbbbbbbaaaaaccaaa',
  'bbaaaaaaaaaaaaabbbbbaaaaaaaaaaaa',
  'bbbbbbaaafaaaaaaaaaaaaaccaaabbbb',
  'bbbbbeaaaeaaaaaaaaadaacccaaabbbb',
  'bbbbbbaaeaaaaaaaaaddddhccaaabbbb',
  'bbbbbfbaeaaaaaaaaddddddaaaaabbbb',
  'bbbbbebaeaabbbbbbddddddaaaaabbbb',
  'bbbbbgbagaabbbbbbddddddaaaabbbbb',
  'bbbbbhgagabbbbbbbbddddwwwbbbbbbb',
  'bbbbbbbfaabbbfbbbbbbbwbbbwbbbbbb',
  'bbbbbbbeaabbbebbbbbbbbbybbbbbbbb',
  'bbbbbbberrrbbebbbbbbawbYlwddddbb',
  'dbbbbfbrrrrrfebbbbbbbWbwbWdddddd',
  'dddddbrrryrrrebbbbbbbbsbbhdddddd',
  'ddddfdrrroorrgbbbbbbllsbbdddhddd',
  'dddfegrrrrRRrgbbbbbbblsaaddddddd',
  'ddedeearrrrrabbbbbbbbbsaaddddddd',
  'aaaaeelerrraaaaaaaaaafsaaddddddd',
  'ccaaggalsaaaaaaaalaaalsccdddiddc',
  'ccaaagaesccaaaaauaaaccsccdddhfcc',
  'cccaaaalsccaaaausuaaacsccdddgdcc',
  'cccaagagsccaalaUuUaaaaaaaaddsdcc',
  'ccaahaacscccaalsUbbaaaaaaldsdacc',
  'ccaaaaaacccaaalsbbbbbaaaaalsdaac',
  'aaaaaaaaaaaaaebsbbbbbbaaaaasaaaa',
  'aaabbbaaaaaaabbsbbbbbbibaaasfaaa',
  'bbbbbbaaaaabbbbbbbbbbbhbbaaaaaaa',
]

const FLOWER_D: PixelFrame = [
  'bhhaacccccccccabbbaaaacccccccaaa',
  'baaaacccccccccabbbaaacccfcccaaaa',
  'aaaaaacccccccaabbbaaacccccafaaaa',
  'aaaaaaacccaaaaabbbiacccaaaaaaaaa',
  'aaaaaaaaaaaaaaabbfaacccaaaaabbaa',
  'eaaabbbaaabbbaaaaaaacccaaaaaabaa',
  'aaaabbbbbbbbbbaaaaaaaccccaaabbaa',
  'aaaabbbbbbbbbbaaaaaaaaccccaabbaa',
  'aaaabbbbbbbbbbaaaaaaaaceccaabbaa',
  'aaaaabbbbbbbbbbaaadddahcccaaaaaa',
  'aaaaabbbbbbbbbbaadddddddaaaaaaai',
  'aaaaaabbfbfbbbbaadddddddaaaaaaaa',
  'aacccaaaebefbbbbbdddddddbbaahaaa',
  'cccccaaaaeebebbbbbdidwwwbbbaaacc',
  'ccccccaaaeebebbbbbbbwbbbwbbbaacc',
  'ccccccccfggagbbbbbbbbbybbbddbacc',
  'cccccccrrrgagbbbbbbbwbYbwdddddcc',
  'cchccfrrrrrabbbbbbbbWbwlWddddddc',
  'ccccarrryrrrafbbbbbbbbsbbddddddd',
  'dccaarrroorraefaaaabllsbbddddddd',
  'cccaarrrrRRreaaeaaaaalsaaddddddd',
  'ccaaaarrrrrceaceccaaaasaaaddddac',
  'cccccclrrrccgccgccccaasaaaaaaaac',
  'ccccccclsccccgcgclccclsaaaaiccch',
  'ccccccccscccccculcccccsaaachflcc',
  'aaccffclscccccusuccccasafacglcaa',
  'aaaceeccscccclUuUaaiaaacecasaaaa',
  'afaaeeccsccaaalUaaaaaaacclasfaaa',
  'aeaeeeccccaaaalsaaaaaaaccelsaaaa',
  'agaaggccccaaaaasbaaaaacccgcsaaaa',
  'aagagccccccccaasbbfaaacccgcsaaaa',
  'baaaahccccccccabbbaaaacccccccaaa',
]

/* ------------------------------------------------------------------ */
/* Tall grass                                                          */
/* ------------------------------------------------------------------ */

const TALL_GRASS_PALETTE: PixelPalette = {
  a: '#79cf9d', // mint base
  b: '#72c795', // soft shade
  c: '#80d3a2', // soft light
  d: '#6bbd8b', // deeper patch
  e: '#4fae7c', // blade body
  f: '#a9e9bd', // blade tip
  g: '#35915f', // deep blade
  h: '#2a6e4a', // deep root
  i: '#c8e8a0', // seed head
  j: '#8fdcaa', // sunlit blade
}

const TALL_GRASS_A: PixelFrame = [
  'aaeaaabbbebfbfeebbbbaaacecaeebbf',
  'ffeaabbbbbeebeeebbaaaaccecaeebbe',
  'eaeebbbbbbeebebeaaaaaacfecaaeeae',
  'eebebbbbbbeeebbeaaaachcfeccceeaa',
  'eebebbbbbbbeebbebaaaccceeccceeaa',
  'eebeebbbbbbeebbebbaaccccecccceei',
  'eaebebbbbbbeebbebbbaaacceiccaeea',
  'eaeaeeaaaaaeebbebbbbbaaceecaaeea',
  'eaeaeeaaaaaeebbebbbbbficeffaaeea',
  'eaeaeeaaaaahhbbhfbbbbeacheeiafhb',
  'hahahhaaaaaahhhhebbibefcceehheab',
  'bhhhfhaaaaaaaabbebfbbeeaceefaefb',
  'aafcjcaaaaaaaabeebjfebeaaeejaeae',
  'acejccccacccaabefbjbeebbfeejeeae',
  'ccejcccccccccabejbejeebbeeefjece',
  'eecjfccccccccaaejbejeebfeeeefecc',
  'eechefcccccccaaefjbjeebbbeeejicc',
  'eeccececcccdfaaeejbjeebbbeeejecc',
  'ceccececcdddeabeejbjeebbbeebjjcc',
  'aecfechfiddddebhhjjjhhbbfeebhjfa',
  'aeaeeccedddddebbhjjhhaebehhbijea',
  'beaaeccefddddebbbhejaaaaefhhhjbf',
  'ehbafaceeddddedbbaajaaaaeeaaejbb',
  'ebhheeecedddddedfaehficceeaaehbb',
  'bebaeeeeddddddedddeeaccceccaeebb',
  'bebbaeeecdddhdedddeeddccecceebbb',
  'bebbbeeecdddddehdeeedddcecceebbb',
  'ibebbeeeadddddeddeeedddcecaeebbb',
  'bbebbeeeadddddeddeeedddcecaeebbb',
  'bbebbeeeadddddhddhhhddccecaeebbb',
  'bbebbeeebbbddbhhhhhaaacchhahhbbb',
  'bbhaahhhbbbbbbbbbbaaaaccchhhhhbb',
]

const TALL_GRASS_B: PixelFrame = [
  'aaabebeafacieceabaeeafaaedddddaa',
  'aaaaaeeaeacceceaaaeeaeidfdddddaa',
  'aaahaeeeaccfeceaaeeddedeedidddaa',
  'ccccceeeccfceececeeddefeedddddac',
  'hcccceeeccceeececeeddededefddaac',
  'ccccceecccceeececeeabebebeebbaac',
  'ccccceeaaaceeececeeaaebebeebbaac',
  'ccccceeaaaaeeececeeaaebifeefbaaf',
  'jcccceeaaaaeeececeeaaebeefeebaaa',
  'jcccchhaaafihhchchhaaebffeebbaaa',
  'cjcicahhhhefahhfhfcaahfeehebbaac',
  'cjcahaaaaiafeacececaaheeehebaaac',
  'fhcaaaaaaeadeacecceabbeeeeebaafc',
  'cccafahaafddeecfeceaabeeeeeaaacc',
  'cccaafaffedfdeccecefabeebefaaacc',
  'aaccceaeeededeccecajabeebejaaaca',
  'aaccieaeeheddceceeajebeebejaacah',
  'aaccceheededdciceejeebefbejaaaaa',
  'aaacceaeededdceceejeeaefbejbaaaa',
  'aaachecifdedddfchhjhhahebhjfbbaa',
  'bfacchfhedhdddefhhjhhhhehajjbbbb',
  'beaccheehhfdddeecchccaaeaaheibbb',
  'beffcceecddfdccefcecfcaeaajaebbb',
  'bejjcceecddedcceeeeeccaeeajdebbb',
  'bbejfececdddecceeeecccaeeajdebbb',
  'bbejcfcfcdddecceeeecccceaehdeebb',
  'bbejceeechddeceeeeecccceaeddeebb',
  'bbehaeeeccddeaeeeeecccceceddeeab',
  'bbehaeeeccddhahhhhhfccceceddeeab',
  'bbeaaeeeccdddhhhhhacccchchddhhaa',
  'aaeaaeeeccaeaaaaaaaaaaaahhhhhdaa',
  'aahabhhhaaccccaaaaaaaaaaahddddaa',
]

const TALL_GRASS_C: PixelFrame = [
  'cccecccfeaacccafaficecaeeaaeaaac',
  'ccceecceefaacaaeaefceeeeeaaeaaah',
  'ccceecfeeeafaaeaaefeceeeeaaeaacc',
  'ccceecceeeaeaaeaeaeeceeeecaeaacc',
  'cccececeeeaaeaeaeeeecceecceaaacc',
  'cccececeeeaaeaeceececeeecceaaacc',
  'cccececeeeaaaecceeecaeeecceaeacc',
  'ccfececeeeiccecceeecaeeecceacccc',
  'ecjhihfhhhcccecceeeaaeeecceccccc',
  'cejchhjhhccccecceeeddhhhaahccccc',
  'fejcfajaaaaaahcchhhdddhhfhhccccc',
  'ecjfeaajaaafiahhhhhfddbaeaacccic',
  'eijeeaajaaaeaaaaaadeddbbeaacccce',
  'ecjcceajaaaeabbhbbeddbbbefacccfe',
  'eejcceejaaeeaabbbbeibbbheeaaceee',
  'eejcceejaaaaeabbbfebbbbbeebaaeee',
  'eehcceajaacaeabffeefbbbbebbaaeec',
  'eecccechadddedebefebfbbbeibbeeec',
  'fecceeccddddeedbeebbebbbebbbeeec',
  'eeiceeccddddeedbeebbefbbefbbieec',
  'ehfchhccddfdeddeefbbebbbhefbhhfc',
  'ehehhcccdjddedfeeefeebbbbfehffec',
  'ceecccccjcddhajeeeefbbbbbjebeeaf',
  'feecccccjccchjhehbejbbbbejebeeae',
  'eeaecccjcccaajbebbjeebbbjbbeeefa',
  'eeaecccjcccaajbebbjeebbbjbbeeeae',
  'eeaeacchccccjhbebbjeehbbjbbeeaae',
  'eeaedcccccccjaaebbheebbbjbeeeaac',
  'eeceaaccccccjaahaahhhaabjbeeeaac',
  'eeceaaccccccjaaahhhhhhaahbeeeaac',
  'hhchccccaccchaaaaaaccaaaeeeeeaah',
  'hhhhhccaaaacccaaaaccccaahahhhaac',
]

const TALL_GRASS_D: PixelFrame = [
  'efefccccccccaacfcccccaaeaeaeaacc',
  'ceefecccccccacfccfccaaaeeeaeeacc',
  'ceeeeccccccfccecceaaaaaeeeaeecfc',
  'ceeeceaaaaafacecceaaaaaaeeaeecec',
  'cefeaeaaaaaeaaeaaeaabbaaeeaeaecc',
  'ccfeaeabbbaeaaafaaebbbbaeeaeaecc',
  'cejeaaffbfbbebfeibeaabaaeeaeaecc',
  'cejeaaeebebbebeebbeaaaaaeebeaecc',
  'cjefaaeaebbbeebefbeaaaaahhbhbhcc',
  'cjeeafeaeabbeebfebeaaaaihhhhhacf',
  'cjheaeeeaaabfbeeefeaaaabbfbbaace',
  'cjhheeeeaaaaebfeejeaaaafbebaaaec',
  'chdeeeeeccaehaefejhacaaebeaaaaec',
  'cccceeeeccceaeeeejaacciaeeaaahec',
  'cccceeecccceaefeejaaccccefcfccec',
  'cccaeeecccceceeeejbaccfceeccceec',
  'ccaaeeeccceheaeeejbacceceecdcecc',
  'ccaaeefccceciaieejbaccceeedddecc',
  'cccahhjcccefeaeeehaaccceeeddeecc',
  'cchhhjhccceefbfeefaaccceeeddeecc',
  'ccccajaaaaheebehhjacccfeeeddeecc',
  'fcaaajaaaabefefejaaaccehhhddficf',
  'eaaaahbibbbbeeeejaaaaccehhhheeae',
  'eaaabbbbbbbbeeaejaaaaafecaaeafef',
  'eeabbbbbbbbbeeajaaaaaaeecaaeaefj',
  'jeabbbbbbbbbeeejeaaaaaaefcaeeaje',
  'jehbbbbbbbebeaejeaaaaaaeecceeaaj',
  'jeaabbbbbbaaeaejeaaaaaaeececeaaj',
  'jeaaaaaaaaaaeaeheaaaaaaceceeccaj',
  'hhaaaaahahaaeaeaeaaaaaaaeceeacch',
  'hhhhhccccccchahahaaaaaaaeaeeaacc',
  'ccccccccccchhhhhccccaaaaeaeeaacc',
]

/* ------------------------------------------------------------------ */
/* Cliff                                                               */
/* ------------------------------------------------------------------ */

const CLIFF_PALETTE: PixelPalette = {
  a: '#79cf9d', // mint base
  b: '#72c795', // soft shade
  c: '#80d3a2', // soft light
  d: '#6bbd8b', // deeper patch
  e: '#4fae7c', // dark blade
  f: '#a9e9bd', // light blade
  g: '#35915f', // deep blade
  h: '#2a6e4a', // deep grass base
  o: '#2a2431', // outline / contact
  r: '#b0793f', // sunlit rock
  R: '#9a6534', // rock mid
  s: '#8a5a2e', // rock shade
  t: '#6e4526', // deep rock
  u: '#4a3020', // cracks / darkest
  v: '#c8955a', // rock highlight
  w: '#d9a86a', // bright edge
  m: '#5f8a4a', // moss
  M: '#4a6e3a', // dark moss
  n: '#8a6a4a', // rubble mid
  p: '#a8845c', // rubble light
  q: '#5a3e28', // rubble shadow
}

const CLIFF_A: PixelFrame = [
  'dbbbbaaccccccddddddddddddddddddd',
  'bbbbbaacccccddddddddddddddddbbbb',
  'bbbbaacccccddddddddddddddddbbbbb',
  'bbaacccccddddddddddddddddddbbbbb',
  'baacccdfddddddfdddddddddfddbbbbb',
  'afaccddeddddddedddddddddeddbbbba',
  'aeacccddedddddefddfddddedddfaaaa',
  'eccaccccfdddddeeddeddddedddecccc',
  'eccaacccecccddeeddeddddedddecccc',
  'gccacccegccoooooooeddddgdddgcccc',
  '.......eooooooooooooo........ooo',
  'ooooooooooovvvvvvvoooooooooooooo',
  'oooooooovvv.......vvvoooooooovvv',
  'vrvvvvrrrrrrrrrvvvrrrrRRRRRRrrrs',
  'rrvvvvrrrrrrrrrrrrrrRRRRRRRRrrrr',
  'rvvvvvvuRrrrrrrrrrRRRRRRRRRRrrrr',
  'vvvvvvvuRrrrrrrrmmmRRRRRRRRRrrrr',
  'vvvvvvpnnrrrrrrmmmmmRRRRRRRRrrrs',
  'vvvvvnnnnnvvvvvvmmmRRRRRRRRpnnvs',
  'vvvvvvnnqvvvvvssvvnRRRRRRRnnnnvs',
  'vvvvvvuussssssvnnpnqnvvvvvvnnqss',
  'tttttvuvuvrrrrsnnnvvvvvvttttttts',
  'vssrrvuvutrrrrrnnpnnttttsrvvvvvs',
  'vvvrrvuvurtttttttnnnrrvvvvvvvvvv',
  'vvvrrrrrvurrrrrrrnnqrrvvvvvvvvvv',
  'vvrrrrrvmmmmmvvvvvvvvrvvvvvvvvvs',
  'vvrrrrrvurvvvssssssssvvvvvvvvvrs',
  'vsvvvvvvuvttttttttttvsssvvvvnvvs',
  'vrssssvuttrmMrrrrrrrtttttssnpqss',
  'vtttttrrrrrmmmrrrrrrrvrrrtttntts',
  'vRRrrrrrrrrrmrrrrrrrrrrrrrrrRRRR',
  'RRRrrrrrrrrrrrrRRRrrrrrrrrRRRRRs',
  'vRRRRRRRRRRRRrrrvvvvvvvvvvvrrRRR',
  'vRRRRRRRRRRRRrrrrvvvvvvvvvvrrrRs',
  'vRRRRRRRRRRRrrrrrrrvvvvvvvvrrrrs',
  'vrrRRRRRRRRvurrrrrrrrrrrvrrrrrrs',
  'vrrRRRRRRRRvurrrrrrrrrrrrrrrrrrr',
  'vrrrRRRRRRRvurrrRRRRRRRrrrrrrrrs',
  'vrrrrmRRRRRvuRRRRRRRRRRRRRRRrrrs',
  'vrrrmmmRRRRRvuttttttttnnnRvurrrs',
  'vrrrrmRtttttvuRRRRRRRnpnqnvurrrs',
  'tttttttRRRRRvuRRRRRRRRRnRvutttts',
  'vrrrrRRRRRRRvuRRRRRRRRRRRvuRRrrs',
  'vvrrRRRRRRRRvuvvvvvvvRRRRvuRRrrs',
  'vvrrRRRRRRvvvvussssssvvvRvpnnrrs',
  'ttttttttvvsssRvuRRRRRsssvnnnntts',
  'RRssssssttttRRvuRRRRRRtttvnnqsss',
  'vRRrrRRRRnpnntvuttttttRRRvuRRRRR',
  'RRRrrRRRRnnnnnRvurpnnRRRRvuRRRRR',
  'vRRRrRRRRRnnqRRvunnnnnRRRvuRRRRs',
  'vRRRRRRRRRRRRmRRvunnqRRRRvuRrRRs',
  'vRRRRRRRRRRRmmmMvuMRRRRRRvurrrrs',
  'vRRRRRRrrrrrrmmmmmmmvRRRRvurrrrs',
  'vvRRRRrrrrvvvsmmmssssvvvrvurrrrr',
  'ssvvvvtttttttttvuRRrrsssvvuvvvvs',
  'vRttttssssrrrRvuttttrrrrsvusssts',
  'vtRRrrrrrrrrrRvuRRRrtttttvutttRs',
  'vvvvvvvvvrrrrRvuRRrrrrrvvvuvvvvs',
  'sssssssssvvvrRRRRRrrvvvssmmmsssv',
  'vttttRrrrsssvvvvvvvvsssttmmmmtts',
  'RRRRRttttrrrsssssssttttvvmmrrrRs',
  'RRRRRRRRrttttttttttrrvvvvvvrrrRs',
  'vRRRRRRRRRRRRrrrrrrvvvvvvvvrrrRs',
  'vRRRRRRRRRRRRrrrrvvvvvvvvvvrrRRs',
  'vvvvvvvvvvvvvvrrrrrvvvvrrrvvvvvs',
  'rvvvvvvvvvttttttttttvvvrrrvvvvvs',
  'vvvvvtttttvvvvvvrrrvttttrrrrvvvs',
  'tttttvnnvvvvvvvvMvrrrrrmmmmmmtts',
  'vvvvvnpqvvvvvvmmmmmrrrmmmmmmmmrs',
  'vrrrvnnvvvvvvvvvvvrrrRmmmmmmmRrs',
  'tttvutttvvvvvvvrrrrrrvuRRRRtttts',
  'vRRvurvvtttttvrrrrrrvuRttttRRRRs',
  'vRRRvuvvvvvvvtttttttvutRRRRRRRRR',
  'vRRRvuvpvvvvvvrrrrrvurRRRRRRRRRR',
  'vRRRvunnnpnnnqnrrrrvurRRRRRRRRRs',
  'RRrrnpqnqnnnvrrrrrrvurRRRRRRRRRR',
  'vvvvuvrrrnnqrrrrrrrvuvvvvvvvRRrs',
  'vvvussvvvrrrrrrrrvvvuvvvvvssvvvr',
  'vvuvvvsssvMvvvvvvvsvusssssvvvsss',
  'vvussstttmmmttttssRRRRRRRRsssvvs',
  'vvvuttssssmssssRtttttRRRRRRrrsss',
  'vtvvvrrrRRRRRRRRRRRRRtttttttttts',
  'vvvvvrrrrrRRRRnnnRRRnnRRRRRRrrvv',
  '....pnn......npnqn.npnqn........',
  '...nnnnn.......n....nnn.........',
  '.nnnnnq.......pnn...............',
  'npnnn........pnnn............f..',
  '.nnn..pnn....nnnq.......ff.ngn..',
  '.nnq..nnn..f.nnq....nnng..gphqn.',
  '.......nqn..g......npnqgn.hnnnqn',
  '.......nnn..g....npnnnnh........',
  '.......uuuuuuu..nnnnnn...uuuuuuu',
  '.....uuooooooouu.nnnqn.uuooooooo',
  'uuuuuooooooooooouuuuuuuooooooooo',
  'ooooooo.......ooooooooooo.......',
  'oooooooooooooooooooooooooooooooo',
]

const CLIFF_B: PixelFrame = [
  'dbbbbaaccccccddddddddddddddddddd',
  'bbbbbaacccccddddddddddddddddbbbb',
  'bbbbaacccccddddddddddddddddbbbbb',
  'bbaacccccddddddddddddddddddbbbbb',
  'baacccdfddddddfdddddddddfddbbbbb',
  'afaccddeddddddedddddddddeddbbbba',
  'aeacccddedddddefddfddddedddfaaaa',
  'eccaccccfdddddeeddeddddedddecccc',
  'eccaacccecccddeeddeddddedddecccc',
  'gccacccegccoooooooeddddgdddgcccc',
  '.......eooooooooooooo........ooo',
  'ooooooooooovvvvvvvoooooooooooooo',
  'oooooooovvv.......vvvoooooooovvv',
  'vrvvvvrrrrrrrrrvvvrrrrRRRRRRrrrs',
  'rrvvvvrrrrrrrrrrrrrrRRRRRRRRrrrr',
  'rvvvvvvuRrrrrrrrrrRRRRRRRRRRrrrr',
  'vvvvvvvuRrrrrrrrmmmRRRRRRRRRrrrr',
  'vvvvvvpnnrrrrrrmmmmmRRRRRRRRrrrs',
  'vvwvvnnnnnvvvvvvmmmRRRRRRRRpnnvs',
  'vvvvvvnnqvvvvvssvvnRRRRRRRnnnnvs',
  'vvvvvvuussssssvnnpnqnvvvvvvnnqss',
  'tttttvuvuvrrrrsnnnvvvvvvttttttts',
  'vssrrvuvutrrrrrnnpnnttttsrvvvvvs',
  'vvvrrvuvurtttttttnnnrrvvvvvvvvvv',
  'vvvrrrrrvurrrrrrrnnqrrvvvvvvvvvv',
  'vvrrrrrvmmmmmvvvvvvvvrvvvvvvvvvs',
  'vvrrrrrvurvwvssssssssvvvvvvvvvrs',
  'vsvvvvvvuvttttttttttvsssvvvvnvvs',
  'vrssssvuttrmMrrrrrrrtttttssnpqss',
  'vtttttrrrrrmmmrrrrrrrvrrrtttntts',
  'vRRrrrrrrrrrmrrrrrrrrrrrrrrrRRRR',
  'RRRrrrrrrrrrrrrRRRrrrrrrrrRRRRRs',
  'vRRRRRRRRRRRRrrrvvvvvvvvvvvrrRRR',
  'vRRRRRRRRRRRRrrrrvvvvvvvvvvrrrRs',
  'vRRRRRRRRRRRrrrrrrrvvvvvvvvrrrrs',
  'vrrRRRRRRRRvurrrrrrrrrrrvrrrrrrs',
  'vrrRRRRRRRRvurrrrrrrrrrrrrrrrrrr',
  'vrrrRRRRRRRvurrrRRRRRRRrrrrrrrrs',
  'vrrrrmRRRRRvuRRRRRRRRRRRRRRRrrrs',
  'vrrrmmmRRRRRvuttttttttnnnRvurrrs',
  'vrrrrmRtttttvuRRRRRRRnpnqnvurrrs',
  'tttttttRRRRRvuRRRRRRRRRnRvutttts',
  'vrrrrRRRRRRRvuRRRRRRRRRRRvuRRrrs',
  'vvrrRRRRRRRRvuvvvvvvvRRRRvuRRrrs',
  'vvrrRRRRRRvvvvussssssvvvRvpnnrrs',
  'ttttttttvvsssRvuRRRRRsssvnnnntts',
  'RRssssssttttRRvuRRRRRRtttvnnqsss',
  'vRRrrRRRRnpnntvuttttttRRRvuRRRRR',
  'RRRrrRRRRnnnnnRvurpnnRRRRvuRRRRR',
  'vRRRrRRRRRnnqRRvunnnnnRRRvuRRRRs',
  'vRRRRRRRRRRRRmRRvunnqRRRRvuRrRRs',
  'vRRRRRRRRRRRmmmMvuMRRRRRRvurrrrs',
  'vRRRRRRrrrrrrmmmmmmmvRRRRvurrrrs',
  'vvRRRRrrrrvwvsmmmssssvvvrvurrrrr',
  'ssvvvvtttttttttvuRRrrsssvvuvvvvs',
  'vRttttssssrrrRvuttttrrrrsvusssts',
  'vtRRrrrrrrrrrRvuRRRrtttttvutttRs',
  'vvvvvvvvvrrrrRvuRRrrrrrvvvuvvvvs',
  'sssssssssvvvrRRRRRrrvvvssmmmsssv',
  'vttttRrrrsssvvvvvvvvsssttmmmmtts',
  'RRRRRttttrrrsssssssttttvvmmrrrRs',
  'RRRRRRRRrttttttttttrrvvvvvvrrrRs',
  'vRRRRRRRRRRRRrrrrrrvvvvvvvvrrrRs',
  'vRRRRRRRRRRRRrrrrvvvvvvvvvvrrRRs',
  'vvvvvvvvvvvvvvrrrrrvvvvrrrvvvvvs',
  'rvvvvvvvvvttttttttttvvvrrrvvvvvs',
  'vvvvvtttttvvvvvvrrrvttttrrrrvvvs',
  'tttttvnnvvvvvvvvMvrrrrrmmmmmmtts',
  'vvvvvnpqvvvvvvmmmmmrrrmmmmmmmmrs',
  'vrrrwnnvvvvvvvvvvvrrrRmmmmmmmRrs',
  'tttvutttvvvvvvvrrrrrrvuRRRRtttts',
  'vRRvurvvtttttvrrrrrrvuRttttRRRRs',
  'vRRRvuvvvvwvvtttttttvutRRRRRRRRR',
  'vRRRvuvpvvwvvvrrrrrvurRRRRRRRRRR',
  'vRRRvunnnpnnnqnrrrrvurRRRRRRRRRs',
  'RRrrnpqnqnnnvrrrrrrvurRRRRRRRRRR',
  'vvvvuvrrrnnqrrrrrrrvuvvvvvvvRRrs',
  'vvvussvvvrrrrrrrrvvvuvvvvvssvvvr',
  'vvuvvvsssvMvvvvvvvsvusssssvvvsss',
  'vvussstttmmmttttssRRRRRRRRsssvvs',
  'vvvuttssssmssssRtttttRRRRRRrrsss',
  'vtvvvrrrRRRRRRRRRRRRRtttttttttts',
  'vvvvvrrrrrRRRRnnnRRRnnRRRRRRrrvv',
  '....pnn......npnqn.npnqn........',
  '...nnnnn.......n....nnn.........',
  '.nnnnnq.......pnn...............',
  'npnnn........pnnn............f..',
  '.nnn..pnn....nnnq.......ff.ngn..',
  '.nnq..nnn..f.nnq....nnng..gphqn.',
  '.......nqn..g......npnqgn.hnnnqn',
  '.......nnn..g....npnnnnh........',
  '.......uuuuuuu..nnnnnn...uuuuuuu',
  '.....uuooooooouu.nnnqn.uuooooooo',
  'uuuuuooooooooooouuuuuuuooooooooo',
  'ooooooo.......ooooooooooo.......',
  'oooooooooooooooooooooooooooooooo',
]

/* ------------------------------------------------------------------ */
/* Tilled soil                                                         */
/* ------------------------------------------------------------------ */

const SOIL_PALETTE: PixelPalette = {
  a: '#6b4a2f', // base
  b: '#5f4028', // shade
  c: '#7a5638', // light
  d: '#4a3020', // furrow shadow
  e: '#8a6234', // clod highlight
  f: '#3a2418', // deep furrow
  g: '#9c7444', // dry clod
  h: '#79cf9d', // grass fleck
  i: '#4fae7c', // dark grass fleck
  j: '#a8845c', // stone
}

const SOIL_A: PixelFrame = [
  'bbbaaaaaaaaaaaaaaaabbbdddddbbbbb',
  'accceeeeeeeeeeeeeeecaaaaaaaaacca',
  'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  'chcccaaaaaaaaaaaaaaccceeceeeeccc',
  'bibbbbbbbbbbbdddcdcbbbbbbbbaaabb',
  'ddddffffffffffffffffdddddddddddd',
  'fffeffffffffffffffffffffffffffff',
  'dddddddcgcdcddddddbbbbdddddddddd',
  'aabbfefcdcaaaaaaaaaaaaaaaaabbbaa',
  'ecccccceeeeeecccceeeeeeccccccccc',
  'eeecgdeeeeeeeeeeeeeeeeeeeeeeeeee',
  'ccccccaaaaaaaaaccccccccccccccccc',
  'bbaabbbddddbcbbbbbeaaaaaaaaabbbb',
  'ddddddfffffcgddddfefddbbbbdddddd',
  'ffffffffddfffffffffffffffgccffhf',
  'ddddddbbbbbbdddfcdcdffffcccccdid',
  'bbbbaaaaccaaabbbbbbbbbbbbccdbbib',
  'ccccceeeeeeeecccacccccaaaaaacccc',
  'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  'eecccccaaaacccccccccceeeeefefece',
  'aaaabbbbbbbbbbbbbbbbbaacccafaaaa',
  'dddddddfffffffffffffddbbbbbbbddd',
  'fffffffffffffffffffffffddddfffff',
  'fffdddddddbbbbbbbbbddfffffffffff',
  'bbbbaagcaaacccccccaccbddddddddib',
  'aagccccceeeeeeeeeecgcdcabbbaaaaa',
  'eccccedceeeccccccceccceccceeeeee',
  'ccccdccaaaaaabaaaaaacceeeeeeeecc',
  'bbaaaabbbbbdddddddbbbaaacaaaaahb',
  'dddddddfffffffffffffddbbbbbbdddd',
  'ffffffffffffffffffffffffffffffff',
  'ffdddddddddbbbbbbbddffffffffffff',
]

/* ------------------------------------------------------------------ */
/* Crop rows                                                           */
/* ------------------------------------------------------------------ */

const CROPS_PALETTE: PixelPalette = {
  a: '#6b4a2f', // base
  b: '#5f4028', // shade
  c: '#7a5638', // light
  d: '#4a3020', // furrow shadow
  e: '#8a6234', // clod highlight
  f: '#3a2418', // deep furrow
  g: '#4f8a3a', // crop green
  h: '#6fae4a', // light green
  i: '#3a6e2e', // dark green
  j: '#8fca5a', // tip
  k: '#d9b84a', // grain
  l: '#f0d878', // grain light
  m: '#b89a3a', // grain shade
  n: '#a8845c', // stone
}

const CROPS_A: PixelFrame = [
  'bbmbbbbddbbbgaaaakaaaaaaaaaalbkm',
  'ccmlmaaaaaacgieeekmeeeeeeeeklkkc',
  'eeekeeeeeeeegeeeekcdeeeeeeemmmke',
  'eemkhccccccigccccmkcacccccccmcke',
  'alijkbbbbbbbgbbbbbkbbbbaabbbkmka',
  'klkjkffffffdgdddddkdddddddddkdkm',
  'mmfgkmffffflgifffkkmfffffffmkmkf',
  'fmfmkdbbbbkigffffmkfffffffffkfkf',
  'dkigkaacfemmgbddlmkbbbbbbbbbkbkd',
  'ahkgkeeeejemgaaklkkkaaacccakkmaa',
  'cmkgeeeehjhkeeemmlekeeeeeeemkmkc',
  'eekgicaaaijkmleeklkkmeeeeecckmee',
  'chigjbbbbbmkilkdbmmkaaaafebmkmac',
  'bikgjhddddgkbmdddmlkddddddddkkbb',
  'fmkgjcffffikimcfmkkkffffffjfkfkm',
  'ffkcjfffffigdkffffkkmddddhjhkmkf',
  'bbkdgdddddbgbkmbbbmkaaaaaajmkmkb',
  'aaaagiaaaaagikcaackkcefefeejkcka',
  'eejigeeeeeigmkeeemkkeeeeeeegkeke',
  'chklgeeeeeeglkeccckgkcaaaaigcckm',
  'bbmmgaaaaaagmkaaaakgbbbbbbbbgmkb',
  'ddjmddbbbbbbmkmddddgidffffffgfkd',
  'figkffffffffmkffffigmfffffffgikf',
  'ddgkmfffffffmkffcgcgcfdcgcdighjh',
  'bbmkbbddddbbbkbdddmgbbbbaaaggijb',
  'ccgkaaaaaaaaakaaaaakacccceccgcjc',
  'eigkeeeeeeeeekmeeeekeeeeeeeccdge',
  'ccgccceeeeekmkccccckmfefjcajaagi',
  'bbgbjaaaaaaakkbbgcmkbbbibbibbigb',
  'ddddiddbmbdddkfffffkffffffiffhgd',
  'fffffffffffffffffffkfffffmiffigf',
  'ddddfffffffddddddddddddddddddidd',
]

const CROPS_B: PixelFrame = [
  'bdddkmdbbbbbmkbbbbijbbaaaaakjbbb',
  'aaaakjhaaaaaklaaaaajccceeeekmhaa',
  'eeemkjeeeeeekmkeeejgieeeceekjcdc',
  'cccekjeeeeeekmecchghccccgdmkjccc',
  'bbbakgaaaaamkmmabigkbbbacaakgabb',
  'fffdkmdddbbbkbkccdgidddddddkdgff',
  'fffmkgifffffkmkccmggfffffflkmgif',
  'bbddkgffffffkmkcdfgifffffkmkdgdb',
  'ahaakgdldddmklkbbiggmbbbbbmkigaa',
  'eiechghlkaaaklkmaaggaaaaaamklgee',
  'eeeeigemeeelkmkeeeggieeeemkemgee',
  'aaaacgimccklkmkeeeigeeeccccmmgia',
  'bbbbiggkcdmmmkkaaaagaaaabbbkigbb',
  'dddffggiccdmdkdebbbgmbdddddkkgdd',
  'fffffggffffkmkfeffmkffffffmkkgff',
  'ffddlmgbbbbdkkmfffkkkffffffmkfff',
  'bbbklkgaaaammklbbbmkjbbbbbbkkbbb',
  'aaccmekeeecckklkaaamjhaeaakkkaaa',
  'eeemmekmccgdkkmeeekejieeeemkeeee',
  'eecckmkbbccckmmeeekmjjheeeikeeee',
  'aaalkbkdddbmkkaaamkgajiaaaakaaaa',
  'dhklkmkccffdkkkbbbkgdjbbbbbgmddd',
  'fimmkfcccfffkkmfffkggfgcfffgifhf',
  'fifmkdccdbgdmkddfddgifcccfigffif',
  'bbbbkaaaacefkkbbbbiggbccddbgbbib',
  'aaackmeeeedekkcccccggiajaaagaaaa',
  'eeemkeeeeeeekmeeeeeggeeeieekmeee',
  'eeeckcccjckmkmcececcgccciemkeeee',
  'aaaakbmaaibbkbagccgcgcbbiiakaaaa',
  'bbbmdddddiddkddbbbddffdddidkbbbb',
  'fffffffffffffkffffffffffmfffffff',
  'ffffffffffffffffffffddddbddddfff',
]

const CROPS_C: PixelFrame = [
  'ddbbbklkbbbbmmbbbbbbaaaaaaabbbbd',
  'aaacccmmaaccmclhaaccclcccccclcaa',
  'eeeeelmieemkeklkeeeeklkeeeeklkee',
  'eeccmkeeeeekeemeeecccmlcccccmcce',
  'bbbbbklaaaakalmaaaabmmlkbbbmmbbb',
  'fffdkklkbbbkmkdddddddkmfefdkldfj',
  'ffffkmmmffmkmkffffffmkmkfffklkhj',
  'bbbmklmkfffkfkfffddddkmjhddkmijb',
  'chaakkmmbbbkkbbbbbbamkmjaamkmajc',
  'eieekkmccaahkmaacccckkmjccekkege',
  'ceeekkcdgeemkieeeeemkkigeeekkgic',
  'aaaakmeccceekeeeeecckkgaaaaaigaj',
  'bbbmkbaacdaiklaaaaabkegibbbmkghj',
  'fffkkmdbbbklglkbbbddkfgfffffkgfj',
  'fffmkmeffffmgmffffffkmgffcffkfji',
  'dddkkkdffffmgifffffmkdgdcgdlkmgd',
  'aamkkabbgbmigdddddbbkkgkackmkiga',
  'ehjkmcgcdckagmaaaaaakkgieccmkkge',
  'eejkkeeecdkmgeeeeeeeeigeeecmkgee',
  'aajkmccceekekeeccccemkgcccakmgia',
  'bimkmbbbbmkhkhbbbbbaakgaabmkigbb',
  'ffgkffddddkdjidfffdddkmddddkfgff',
  'ffgkffffffkfjfffffffmkfffffkmgff',
  'bbgiddbbbbkmgdddddcmkkddfddkmbhb',
  'aigkaaaacmkagaaaaaagkkbbbbmkaaia',
  'eegkmeeeeekegeeccccckcccccckeeee',
  'eegkeeeeeekegieeeejekmcdceekeeee',
  'ccckjcaaaaaigkccccimkcckccckmccc',
  'bbbibbbbbbbbjbbaaaibmbbbbbmkaaab',
  'dddidddfffffgiddddddkffffddkdddd',
  'ffffffffffffcffffffffffffmfkffff',
  'ffffddddddddddffffdddddddddddfff',
]

const CROPS_D: PixelFrame = [
  'bbklkaabbbklklkbbbbjibbbbbbbbbkm',
  'cccmjeehccememecccccgcccccccckcc',
  'eemmjheeeemmemeeeeeigeeeeeeemkee',
  'ccckjaaaaaackkajaaajgaaaccceekll',
  'aabkjbbbbbgckkhjhdhjgbbbbbbaaklk',
  'dddkmffffccckmmjfhjjgiffffdddkmm',
  'ffmkifffffcmkkijddiigfffffffmkmm',
  'fffkdddddddckkbgabgbgbbddddddkkk',
  'dbikbbbbbbgckkgicigjgaaaaaaabkkb',
  'aajgcccccccchkgeeegiheeeeeeecckm',
  'ehjggieeeeeeikmeeigieeeeeeeeeekm',
  'eejgiccccccamkgaakgjccccccaaamke',
  'aiiggbbbbbbbbkgbbiggbbbbbbbbblkb',
  'ddgggdddddddgkgiffgfddffffffklkd',
  'ffgggffffffigigffmgiffffffffmmkm',
  'ddgfgiffddddgjghbbgiddbbbbbddmkl',
  'bigigbbbbbbbgjgacigmaaaccaaabkkm',
  'ccglgaaaaaacgiieefgfeeeeeeeeklkm',
  'eegmgeeeeeeigigeemgfefeeeeeemmke',
  'ccgiceeeeeeiggaaaagiaaaaaaaaamkm',
  'bigkbaacccaaggibdigddddddddddmkb',
  'ddgkddbbbbbbggffffgmffffffffffkm',
  'ffgkmfffffffgifffmglkfffffffgmkf',
  'ffmkffcfffciggbbbbkmbbbbbbddddkf',
  'bbmkdcgdbcgcggaaaakmaaaaaaaabbkb',
  'aaakaacaaaccggieeekgdeeeeeeecckm',
  'eeekeeeeeeeeigeeeekmeeeeeeeeemke',
  'ccckmmcgceeecgakamkacccjaaaaaajc',
  'bbmjgbcccaaaagbbmekbbbibbbbbbikb',
  'ddikccccddddkdffffkdddddddffffdd',
  'ffikkiffffffffkfffffhfffffffffff',
  'ddddddddddddbdddddddiddddddddddd',
]

/* ------------------------------------------------------------------ */
/* Bank                                                                */
/* ------------------------------------------------------------------ */

export const terrainSpriteSet: {
  grass: PixelSprite
  path: PixelSprite
  sand: PixelSprite
  water: PixelSprite
  flower: PixelSprite
  tallGrass: PixelSprite
  cliff: PixelSprite
  soil: PixelSprite
  crops: PixelSprite
} = {
  grass: { palette: GRASS_PALETTE, frames: [GRASS_A, GRASS_B, GRASS_C, GRASS_D, GRASS_E, GRASS_F], frameMs: 6000 },
  path: { palette: PATH_PALETTE, frames: [PATH_A, PATH_B, PATH_C, PATH_D], frameMs: 7000 },
  sand: { palette: SAND_PALETTE, frames: [SAND_A, SAND_B, SAND_C, SAND_D], frameMs: 7000 },
  water: {
    palette: WATER_PALETTE,
    frames: [WATER_A, WATER_B, WATER_C, WATER_D, WATER_E, WATER_F, WATER_G, WATER_H],
    frameMs: 1800,
  },
  flower: { palette: FLOWER_PALETTE, frames: [FLOWER_A, FLOWER_B, FLOWER_C, FLOWER_D], frameMs: 6500 },
  tallGrass: {
    palette: TALL_GRASS_PALETTE,
    frames: [TALL_GRASS_A, TALL_GRASS_B, TALL_GRASS_C, TALL_GRASS_D],
    frameMs: 4200,
  },
  cliff: { palette: CLIFF_PALETTE, frames: [CLIFF_A, CLIFF_B], frameMs: 3200 },
  soil: { palette: SOIL_PALETTE, frames: [SOIL_A], frameMs: 1000 },
  crops: { palette: CROPS_PALETTE, frames: [CROPS_A, CROPS_B, CROPS_C, CROPS_D], frameMs: 12000 },
}
