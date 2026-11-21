/**
 * High-resolution water sprites for the Willow Hollow pond.
 *
 * Every frame is a true 32x32 grid: 32 rows of exactly 32 characters. Each
 * character maps to a color in the sprite's palette; '.' is transparent.
 *
 * The pond is built from one animated surface tile plus eight shoreline
 * overlays. Draw the base first, then the straight bands for any side that
 * touches land, then the corner overlay for any two adjacent land sides.
 * Edge and corner sprites are transparent everywhere except their shoreline
 * band, so they composite directly over the base without repainting water.
 *
 * Surface:
 * - Sixteen frames of a slow, continuous swell. One gentle broad component
 *   carries the drift while oblique mid-scale components interfere, so the
 *   surface shows no single crest per tile and never reads as looping
 *   tiles. Per-tile phase offsets (chosen by the renderer) keep neighbours
 *   out of step, and at 640ms a frame the full cycle takes 10.24s.
 * - Tones are ordered with a 4x4 Bayer dither over broad mid-water bands,
 *   so the open pond stays solid and only crest and trough fringes move.
 * - Crests carry a handful of pale-cyan glints; the near-white top stop is
 *   unused so the surface never sparkles harder than the shoreline foam.
 *
 * Shoreline:
 * - The band blends into the bank instead of cutting it: a pebbly dry lip
 *   at the land edge, two wet-earth transition steps, a waterline that is
 *   dithered rather than solid, then foam flecks and reflection dabs
 *   thinning out into the water. No solid near-black line anywhere.
 * - Every zone boundary wobbles along its length, so no band reads as a
 *   straight stripe; zone tones come from smooth noise, not per-pixel
 *   salt and pepper.
 * - Corners are quarter-ellipse arcs with a low-frequency wobble, never a
 *   right angle. The bank sliver is wet earth with moss and silt pebbles.
 * - Edge sprites carry two bank profiles: a deep bank with a continuous
 *   shadow line and a shallow bank whose waterline breaks into wet-earth
 *   patches. The renderer's per-tile hash alternates them, so a long bank
 *   shallows and deepens instead of repeating one stamped outline.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/** Open water: deep troughs through pale crests. */
const WATER_PALETTE: PixelPalette = {
  a: '#1f4f78', // deep trough
  b: '#28618f', // shaded water
  c: '#3272a4', // base water
  d: '#3d82b4', // mid swell
  e: '#4f98c8', // ripple light
  f: '#6fb4d4', // crest
  g: '#a8dce8', // pale crest glint
  h: '#eafcff', // reserved near-white
}

/** Wet bank, wall face, foam shadow, and silt. */
const SHORE_PALETTE: PixelPalette = {
  i: '#123a5c', // waterline shadow
  j: '#0c2a44', // wet contact
  k: '#2e4148', // dark wet earth
  l: '#465a5e', // lit wet earth
  m: '#6f8385', // wet pebble
  n: '#a8b6a8', // dry lip
  o: '#5f7a52', // moss
  p: '#45583f', // moss shade
  q: '#c2b18a', // pale silt
  r: '#8f7f5f', // silt shade
}

const EDGE_PALETTE: PixelPalette = { ...WATER_PALETTE, ...SHORE_PALETTE }

/** Twelve-phase surface swell. */
const BASE_FRAMES: readonly PixelFrame[] = [
  [
    'ccccccccccccccccccbbbccccddddddc',
    'cccccccccccccccccbbbccccdddddccc',
    'ccccccccccccccccbbbccccdddddcccc',
    'cccccccccccccccbbbbccccddddccccc',
    'cccccccccccccccbbbbccccdcdcccccc',
    'cccccccccccccccbbbcccccccccccccc',
    'cccccccccccccccbbbcccccccccccccc',
    'cccccccccccccccbbccccccccccccccc',
    'ccccccccccccccbbbccccccccccccccc',
    'cccccccccccccbbbcccccccccccbcccc',
    'ccccccccccccbbbbcccccccccbbccccc',
    'ccccdddccccbbbbbcccccccccbcccccc',
    'cccddddccccbbbbbbccccccccccccccc',
    'ccdddddccccbbbbbbccccccccccccccc',
    'ccddddccccbbbbbbbccccccccccccccc',
    'ccdddcccccbbbbbbcccccccccccccccc',
    'cdddcccccbbbbbcccccccccccccccccc',
    'dddcccccbbbbcccccccccccccccccccc',
    'ddccccccbbbccccccccccccccccccccd',
    'dddccccbbbccccccccccccccccccccdd',
    'dddccccbbccccccccccccccccccccccd',
    'dddcccccccccccccccccccccccccccdd',
    'ddcccccccccccccccccccccccccccccd',
    'dddcccccccccccccccccccccccccccdc',
    'cdcccccccccccccccccccccccccccccd',
    'dcccccccdcdcccccccccccccccccccdd',
    'dccccccdddccccccccccccccccccdddd',
    'dcccccccdcdccccccccccbbccccddddd',
    'dcccccccccccccccccccbbbccccddddd',
    'dccccccccccccccccccbbbbcccdddddd',
    'dccccccccccccccccccbbbbcccdddddd',
    'dccccccccccccccccccbbbccccdddddd',
  ],
  [
    'ccccccccccccbbbbbbbbcccccdddcccc',
    'cccccccccccccbbbbbbcccdddddccccc',
    'ccccccccccccbbbbabbccccddddccccc',
    'cccccccccccccbbbbbccccdddddccccc',
    'ccccccccccccbbbbbbcccccdcccccccc',
    'cccccccccccccbbbbccccccccccccccc',
    'cccccccccccccbbbcccccccccccccccc',
    'cccccccccccccbbccccccccccccccccc',
    'ccccccccccccbbbcccccccccccbccccc',
    'cccccccccccbbbcccccccccccbbbcccc',
    'cccccccccccbbbbcccccccccbbbccccc',
    'cccddccccccbbbcccccccccccccccccc',
    'cccdddccccbbbbcccccccccccccccccc',
    'ccdddcccccbbbccccccccccccccccccc',
    'ddddccccccbbcccccccccccccccccccc',
    'ddddcccccbbcccccccccccccccccccdd',
    'ddddccccbbbccccccccccccccccccddd',
    'dddccccbbbccccccccccccccccccdddd',
    'dddcccbbbbccccccccccccccccccdddd',
    'dddcccbbbcccccccccccccccccccdddd',
    'ddccccbbbcccccccccccccccccccdddd',
    'dcccccccccccccccccccccccccccdddd',
    'ccccccccccccccccccccccccccccdddd',
    'cccccccccccccccccccccccccccddddc',
    'cccccccccccccccccccccccccccdddcc',
    'ccccccccdcdddcccccccccccccdddddc',
    'cccccccccdcdccccccccccccccddddcc',
    'ccccccccccdcdccccccccbccccdddddc',
    'cccccccccccccccccccbbbcccccddddc',
    'cccccccccccccccccccbbbccccdddddc',
    'ccccccccccccccccccbbbccccccdddcc',
    'cccccccccccccccbbbbbccccccdddccc',
  ],
  [
    'ccccccccccccbbbbabbccccccccccccc',
    'cccccccccccbbbbaabbcccccdccccccc',
    'ccccccccccbbbbaaabcccccccccccccc',
    'ccccccccccbbbbbabbcccccccccccccc',
    'ccccccccbbbbbbbbbccccccccccccccc',
    'cccccccbbbbbbbbbcccccccccccccccc',
    'cccccccbbbbbbbbccccccccccccccccc',
    'ccccccccbbbbbbcccccccccccccccccc',
    'ccccccccbbbbbbcccccccccccccccccc',
    'cccccccccbbbbccccccccccccccccccc',
    'ccccccccccbbbccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'dcdccccccccccccccccccccccccccccc',
    'ddccccccccccccccccccccccccccccdd',
    'dddcccccccccccccccccccccccccdddd',
    'dddcccccbcccccccccccccccccccddde',
    'dddccccbcccccccccccccccccccdddee',
    'ddccccbbcccccccccccccccccccddede',
    'ddccccccccccccccccccccccccdddded',
    'dccccccccccccccccccccccccddddddd',
    'ccccccccccccccccccccccdcdddddddd',
    'ccccccccccccccccccccccccddddddcc',
    'cccbccccccccccccccccccccddddddcc',
    'ccbcccccccccccccccccccccddddddcc',
    'ccccccccccccccccccccccccdddddccc',
    'cccccccccccccccccccccccccdddcccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'ccccccccccccccbcbbbccccccccccccc',
    'cccccccccccccbbbbbbccccccccccccc',
  ],
  [
    'ccccccccccccbbbbbbcccccccccccccc',
    'cccccccccccbbbbbbbcccccccccccccc',
    'cccccccccbbbbbabbccccccccccccccc',
    'cccccccbbbbbbbbbcccccccccccccccc',
    'ccccccbbbbbbabbccccccccccccccccc',
    'ccccccbbbbbabbcccccccccccccccccc',
    'ccccccbbbbaabbcccccccccccccccccc',
    'ccccccbbbbbabcccccdccccccccccccc',
    'ccccccbbbbbbbccccccccccccccccccc',
    'ccccccccbbbbcccccccccccccccccccc',
    'ccccccccbccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'ccccccccccccdcccccccccccccccccdc',
    'dccccccccccccccccccccccccccccddd',
    'ddccccccccccccccccccccccccccdddd',
    'ddcccccccccccccccccccccccccddddd',
    'ddccccccccccccccccccccccccdddddd',
    'ddcccccccccccccccccccccccddddddd',
    'dcccccccccccccccccccccccddddeddd',
    'cccccccccccccccccccccccddddedddc',
    'ccccccccccccccccccccccdddeeedddc',
    'ccbccccccccccccccccccccddeeeddcc',
    'cbbbccccccccccccccccccdddeeddccc',
    'cbbccccccccccccccccccccdddddcccc',
    'cbccccccccccccccccccccdddddccccc',
    'cccccccccccccccccccccccdddcccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccbcc',
    'ccccccccccccccbbbccccccccccccccc',
    'cccccccccccccbbbbbcccccccccccccc',
  ],
  [
    'ccccccccccccbbbbcccccccccccccccc',
    'cccccccccbcbbbbccccccccccccccccc',
    'cccccccbbbbbbbbccccccccccccccccc',
    'ccccccbbbbbbbbccccccccccccccccdc',
    'ccccccbbbbabbbcccccccccccccccccc',
    'cccccbbbbaaabbcccccccccccccccccc',
    'cccccbbbbbabbccccccccccccccccccc',
    'cccccbbbbbbbcccccccccccccccccccc',
    'ccccbbbbbbbccccccccccccccccccccc',
    'cccccbbbbbcccccccccccccccccccccc',
    'ccccbbbbbccccdcccccccccccccccccc',
    'cccccbcbccccdddccccccccccccccccc',
    'ccccccbccccddddccccccccccccccccc',
    'ccccccccccdddddccccccccccccccccc',
    'ccccccccccddddcccccccccccccccdcc',
    'ccccccccccdcccccccccccccccccdddc',
    'cccccccccccccccccccccccccccddddc',
    'ccccccccccccccccccccccccccdddddc',
    'ccccccccccccccccccccccccddddddcc',
    'ccccccccccccccccccccccddddedddcc',
    'ccccccccccccccccccccccdddeedddcc',
    'ccccccccccccccccccccccddeeeddccc',
    'ccccccccccccccccccccccddeedddccc',
    'cccccccccccccccccccccdddeddddccc',
    'cccccccccccccccccccccddddddccccc',
    'ccccccccccccccccccccdddddccccccc',
    'ccccccccccccccccccccddddccccccbc',
    'ccccccccccccccccccccdddccccccbbb',
    'ccccccccccccccccccccddccccccbbbc',
    'ccccccccccccccccccccdccccccbbbbc',
    'cccccccccccccccccccccccccccbbbcc',
    'ccccccccccccccbbcccccccccccbcccc',
  ],
  [
    'cccccccccccccccccccccccbbbbccccc',
    'cccccccccccccccccccccccbbbcccccc',
    'ccccccbbbbbbccccccccccbbbccccccc',
    'cccccccbbbbbcccccccccccccccccccc',
    'ccccccbbbbbbbccccccccccccccccccc',
    'cccccccbbbbbcccccccccccccccccccc',
    'ccccccbbbbbccccccccccccccdddcccc',
    'cccccbbbbbccccccccccccccddddcccc',
    'ccbbbbbbbccccccccccccccdddddcccc',
    'cccbbbbbccccdcccccccccddddddcccc',
    'ccbbbbbbcccdddcccccccccddddccccc',
    'cccbbbbcccdddddcccccccdddccccccc',
    'ccccbbccccdddddccccccccccccccccc',
    'cccccccccddddddccccccccccccccccc',
    'cccccccccdddcccccccccccccccccccc',
    'cccccccddddccccccccccccccccccccc',
    'cccccccdddcccccccccccccccccccccc',
    'ccccccdddcccccccccccccccdddccccc',
    'cccccdddcccccccccccccccdddddcccc',
    'ccccccdcccccccccccccccddddddcccc',
    'ccccccccccccccccccccccddddddcccc',
    'ccccccccccccccccccccccddddddcccc',
    'cccccccccccccccccccccddddddccccc',
    'cccccccccbcbccccccccddddddcccccc',
    'cccccccbbbbbbccccccdddddcccccccc',
    'cccccccbbbbbccccccddddddcccccccc',
    'ccccccccbbbbcccccccddddcccccbbbc',
    'cccccccccbccccccccdddddccccbbbbc',
    'cccccccccccccccccccdddccccbbbbbc',
    'ccccccccccccccccccccccccccbbbbcc',
    'ccccccccccccccccccccccccccbbbccc',
    'cccccccccccccccccccccccccbbccccc',
  ],
  [
    'ccccbbbccccccccdccccccbbbbcccccc',
    'cccccccccccccccccccccbbbbccccccc',
    'ccccccccccccccccccccccbbcccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccddccccc',
    'cccccccccccccccccccccccdddddcccc',
    'ccccccccccccccccccccccdddddddccc',
    'ccbbbbbcccccccccccccccddddddcccc',
    'cccbbbbccccccccccccccddddddddccc',
    'ccbbbbbccccdcccccccccdddddddcccc',
    'cccbbbccccdcdcccccccdddddccccccc',
    'ccccbccccccccccccccdddddcccccccc',
    'ccccccccdddcccccccdddddccccccccc',
    'cccccccdddccccccccdddddccccccccc',
    'ccccccddddccccccccdddddccccccccc',
    'cccccdddddcccccccccdcccccccccccc',
    'cccccddddccccccccccccccccccccccc',
    'cccccdddcccccccccccccccccccccccc',
    'ccccdcccccccccccccccccccdccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'ccccccccbbbbbccccccccdcccccccccc',
    'cccccccbbbbbccccccccdddccccccccc',
    'ccccccbbbbbbbccccccddddccccccccc',
    'cccccbbbbbbbccccccdddddccccccccc',
    'ccccbbbbbbbcccccccddddccccccbccc',
    'cccbbbbbbbccccccccdddccccccbcccc',
    'ccbbbbbbbccccccccdddccccccbcbccc',
    'cbbbbbbbccccccccccdccccccccccccc',
    'ccbbbbbbcccccccccdccccccbbbccccc',
    'cccbcbbcccccccccdccccccbbbcccccc',
  ],
  [
    'ccbcbccccccccdddccccccbbbccccccc',
    'cccccccccccccdddcccccccccccccccc',
    'cccccccccccccdcccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccddddccccc',
    'cccccccccccccccccccccccddddccccc',
    'ccccccccccdcccccccccccdddddcdccc',
    'cccccccccccccccccccccdddddddcccc',
    'ccccccccccccccccccccdddddddccccc',
    'cccccccccccccccccccdddddddcccccc',
    'cccccccccccccccccdddeddddccccccc',
    'cccccccccccccccccddeddddcccccccc',
    'ccccccccccccccccdddeedddcccccccb',
    'bcccccddcccccccccdddddddccccccbb',
    'cccccddddcccccccdddddddccccccbbb',
    'bccccdddcccccccccdddcccccccccbbb',
    'ccccdcdccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'ccdccccccbcccccccccccccccccccccc',
    'cccccccbbbbccccccccccccccccccccc',
    'cccccccbbbbbcccccccccccccccccccc',
    'cccccbbbbbbccccccccdcccccccccccc',
    'ccccbbbbbbbcccccccddcccccccccccc',
    'ccbbbbbbbbcccccccccccccccccccccc',
    'cbbbbbbbbcccccccccdccccccccccccc',
    'bbbbabbbbccccccccdcccccccccccccc',
    'bbbbbbbbccccccddddcccccccccccccc',
    'bbbbbbbccccccdddddccccccbccccccc',
    'cbbbbbcccccccddddccccccbcccccccc',
  ],
  [
    'bbbcccccccccddddccccccccccccccbb',
    'cbcccccccccddddccccccccccccccbbb',
    'cccccccccdddddccccccccccccccccbc',
    'ccccccccdddddccccccccccccccccccc',
    'ccccccccddddcccccccccccccccccccc',
    'ccccccccddddccccccccccdddccccccc',
    'ccccccccddddcccccccccccdcccccccc',
    'ccccccccdddccccccccccddddccccccc',
    'ccccccccccccccccccccddddcccccccc',
    'ccccccccccccccccccddddddcccccccc',
    'cccccccccccccccccdddddddcccccccc',
    'ccccccccccccccccdddeedddcccccccc',
    'ccccccccccccccccdddeddddcccccccc',
    'ccccccccccccccccddedddddcccccbcb',
    'bccccccccccccccdddddddccccccbbbb',
    'ccccccccccccccdddddddccccccccbbb',
    'ccccccccccccccdddddcccccccccbbbb',
    'ccccccccccccccddddcccccccccbcbcc',
    'cccccccccccccddddccccccccbbbbccc',
    'ccccccccccccccddccccccccbbbbcccc',
    'cccccccccccccccccccccccbbbbbbccc',
    'cccccccccccccccccccccccbbbbbcccc',
    'ccccccccccccccccccccccccbcbccccc',
    'cccccccbcccccccccccccccccccccccc',
    'ccccbbbbbccccccccccccccccccccccc',
    'ccbbbbbbcccccccccccccccccccccccc',
    'cbbbbbbbcccccccccccccccccccccccc',
    'cbbbbbbbcccccccccccccccccccccccc',
    'bbbbabbbcccccccdcccccccccccccccc',
    'bbbbbbbcccccccdddccccccccccccccb',
    'bbbbbbbccccccddddccccccccccccccb',
    'bbbbbcccccccdddddccccccccccccccb',
  ],
  [
    'bbcccccccccdddccccccccccccccbbbb',
    'bbccccccdddddcccccccccccccccbbbb',
    'bccccccddddddcccccccccccccccbbbb',
    'ccccccdddddddccccccccccccccccccc',
    'ccccccddddddcccccccccccccccccccc',
    'ccccccddddddcccccccccccccccccccc',
    'cccccccdddcccccccccccccccccccccc',
    'ccccccdddcccccccccccdccccccccccc',
    'cccccccdccccccccccddddcccccccccc',
    'ccccccdccccccccccdddddcccccccccc',
    'cccccdcccccccccccdddddcccccccccc',
    'ccccccccccccccccdddddddccccccccc',
    'ccccccccccccccccddddddcccccccccc',
    'cccccccccccccccddddddccccccccccc',
    'ccccccccccccccddddddcccccccccccc',
    'cccccccccccccddddddccccccccccccc',
    'cccccccccccccdddddccccccccbcbccc',
    'ccccccccccccdddddcccccccbbbbbbcc',
    'ccccccccccccddddccccccbbbbbbbccc',
    'ccccccccccccdddcccccccbbbbbbbccc',
    'ccccccccccccccccccccccbbbbbbbccc',
    'cccccccccccccccccccccbbbbbbbcccc',
    'ccccccccccccccccccccccbbbbbccccc',
    'cccccccccccccccccccccbcccccccccc',
    'ccbbbcccccccccccccccbccccccccccc',
    'cbbbbbcccccccccccccccccccccccccc',
    'bbbbbbbccccccccccccccccccccccccc',
    'bbbbbbcccccccccccccccccccccccccc',
    'bbbbbbcccccccccccccccccccccccccc',
    'bbbbbbccccccccdccccccccccccccccb',
    'bbbbcccccccccdccccccccccccccccbb',
    'bbccccccccccdddccccccccccccccbbb',
  ],
  [
    'bccccccccdddcccccccccdddccccbbbb',
    'ccccccdddddddcccccccddddcccbbbbb',
    'cccccccddddddccccccccdccccccbbbc',
    'ccccccdddddddccccccccccccccccccc',
    'cccccdddddddcccccccccccccccccccc',
    'ccccdddddddccccccccccccccccccccc',
    'cdcddddddccccccccccdcccccccccccc',
    'dddddddddcccccccccddcccccccccccc',
    'cdddddddcccccccccdddcccccccccccc',
    'ccdddddccccccccccddccccccccccccc',
    'cccdddcccccccccccddccccccccccccc',
    'ccccccccccccccccdddccccccccccccc',
    'cccccccccccccccdddcccccccccccccc',
    'ccccccccccccccdddccccccccccccccc',
    'ccccccbccccccddddccccccccccccccc',
    'cccccbbbccccdddddccccccccccccccc',
    'ccccbbbcccccddddccccccccbbbccccc',
    'ccccbbccccccddddcccccccbbbbbcccc',
    'ccccbccccccddddcccccccbbbbbbbccc',
    'cccccccccccdddcccccccbbbbbbbbccc',
    'cccccccccccdccccccccbbbbbbbbbccc',
    'ccccccccccdcccccccccbbbbbbbccccc',
    'ccbccccccdccccccccbbbbbbbccccccc',
    'cbcccccccddcccccccbbbbbbcccccccc',
    'bbbcccccccccccccccbbbbbccccccccc',
    'cbccccccccccccccccbbbbcccccccccc',
    'ccccccccccccccccccbccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccb',
    'bccccccccccccccccccccccdccccbbbb',
    'bcccccccccccccccccccdddddcccbbbb',
  ],
  [
    'cccccccccdcccccccccdddddccccbccc',
    'cccccccddddcccccccdddddccccccccc',
    'cccccccdddddcccccdddddcccccccccc',
    'ccccccdddddcdcdddddddccccbcccccc',
    'cccccdddddcccdddddddccccbbbccccc',
    'ccdddddddcccccddddddcccbbbbccccc',
    'cdddddddcccccccddddcccbbbbbccccc',
    'dddddddcccccccccdddccccbcbcccccc',
    'cddddddccccccccccccccccccccccccc',
    'ccddddcccccccccccccccccccccccccc',
    'cccdcccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccbbcccccccdccccccccccccccccc',
    'ccccbbbbcccccddccccccccccccccccc',
    'cccbbbbbccccdddccccccccccccccccc',
    'ccbbbbbcccccddccccccccccbccccccc',
    'ccbbbbcccccddccccccccccbcbcbcccc',
    'cbbbbccccccdccccccccccbbbbbbbccc',
    'bbbbcccccddddccccccccccbcbbbcccc',
    'bbbcccccddddccccccccbbbcbbbccccb',
    'bbbccccdddddcccccccbbbbbcccccccb',
    'bbbccccddddcccccccbbbbbccccccccb',
    'cccccccddddccccccbbbbbbccccccccb',
    'cccccccddccccccccbbbbbbccccccccc',
    'cccccccccccccccccbbbcccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'ccccccccccccccccccccccdddccccccc',
    'ccccccccccccccccccccddddccccbccc',
    'ccccccccccccccccccccddddcccccccc',
  ],
  [
    'cccccccccccccccccccdddcccccccccc',
    'ccccccccccccccdddddddccccccccccc',
    'cccccccccccccdddddddcccccccccccc',
    'ccccccccccccddddddddcccbbbcccccc',
    'cccccccccccccddddddcccbbbbbccccc',
    'cccddddcccccdddddddcccbbbbcccccc',
    'cccdddcccccccdddddccccbbbbbccccc',
    'ccdddddcccccccdcdccccbbbcbcccccc',
    'ccddddccccccccccccccbbbcbccccccc',
    'ccdccccccccccccccccbbbcccccccccc',
    'ccccccccccccccccccbbbbbccccccccc',
    'cccccccccccccccccbbbbbcccccccccc',
    'cccccccccccccccccbbbbbbccccccccc',
    'cccccbcccccccccccbcbcccccccccccc',
    'ccccbbbccccccccccccccccccccccccc',
    'cccbbbcccccccccccccccccccccccccc',
    'ccbbbccccccccccccccccccccccccccc',
    'bbbbcccccccccccccccccccccccccccc',
    'bbbbcccccdccccccccccccccccccccbb',
    'bbbcccccdddcccccccccccccccccccbb',
    'bbbccccddddcccccccccccccccccccbb',
    'bbccccdddddccccccccbcccccccccbbb',
    'bcccccddddccccccccbbbcbcccccccbb',
    'cccccdddddccccccccbbcbcccccccccc',
    'cccccdddccccccccccbcbccccccccccc',
    'ccddddddcccccccccccccccccccccccc',
    'ccdddddccccccccccccccccccccccccc',
    'ccdddddccccccccccccccccccccccccc',
    'ccddddcccccccccccccccccccccccccc',
    'ccddddcccccccccccccccddccccccccc',
    'cccdccccccccccccccccdddccccccccc',
    'cccccccccccccccccccddddccccccccc',
  ],
  [
    'dccccccccccccccccccccccccccccccd',
    'dcccccccccccccdddddcccccccccccdd',
    'cccccccccccccddddddccccccccccccc',
    'ccccccccccccdddddddccccccccccccc',
    'cccccccccccccdddddccccbccccccccc',
    'ccccccccccccdddddccccbcccccccccc',
    'cccccccccccdddddccccbbbccccccccc',
    'ccccccccccdddddccccbbbbccccccccc',
    'cccccccccdddcccccbbbbbbccccccccc',
    'ccccccccccdddccccbbabbbbcccccccc',
    'ccccccccccccccccbbabbbbccccccccc',
    'ccccccccccccccccbbbbbbbccccccccc',
    'cccccccccccccccbbbbbbbbccccccccc',
    'cccccccccccccccbbbbbbbcccccccccc',
    'ccccccccccccccbbbbbccccccccccccc',
    'ccccccccccccccbbcccccccccccccccc',
    'bbbccccccccccbbbbccccccccccccccc',
    'bbcccccccccccbcccccccccccccccccb',
    'bbbcccccccccccccccccccccccccccbb',
    'bbcccccddccccccccccccccccccccbbb',
    'bbcccccddccccccccccccccccccccbbb',
    'ccccccdddccccccccccccccccccccbbb',
    'cccccdddccccccccccccccccccccbbbc',
    'cccdddddcccccccccccccccccccbbbcc',
    'cdddddddccccccccccccccccccbbbccc',
    'ddddeddccccccccccccccccccccbbccc',
    'dddedddcccccccccccccccccccbbcccc',
    'ddeeeddccccccccccccccccccccccccc',
    'ddddddcccccccccccccccccccccccccd',
    'dddddccccccccccccccccccccccccccd',
    'ddddcccccccccccccccccccccccccccd',
    'dddcccccccccccccccccccccccccccdd',
  ],
  [
    'dccccccccccccccccccccccccccddddd',
    'dcccccccccccccccdcccccccccccdddd',
    'cccccccccccccccdddcccccccccccdcc',
    'ccccccccccccccdddccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'ccccccccccccdccccccccccccccccccc',
    'cccccccccdddddccccbbbccccccccccc',
    'ccccccccdddddccccbbbbbcccccccccc',
    'cccccccccdddccccbbabbbbccccccccc',
    'ccccccccddddccccbabbbbbccccccccc',
    'cccccccccccccccbbbabbbbccccccccc',
    'ccccccccccccccbbbbbbbbbccccccccc',
    'cccccccccccccbbbbbbbbbbccccccccc',
    'cccccccccccccbbbbbbbcccccccccccc',
    'ccccccccccccbbabbbbccccccccccccc',
    'cccccccccccbbbbbbbcccccccccccccc',
    'bccccccccccbbbbbbccccccccccccccc',
    'cccccccccccbbbbbcccccccccccccccb',
    'bcccccccccccccccccccccccccccccbb',
    'ccccccccccccccccccccccccccccccbb',
    'cccccccccccccccccccccccccccccbbc',
    'ccccccccccccccccccccccccccccbbcc',
    'cccdddccccccccccccccccccccbbbccc',
    'cddddddccccccccccccccccccbbbbccc',
    'ddddddcccccccccccccccccccbbbbccc',
    'ddeedddccccccccccccccccccbbbcccc',
    'dddeddcccccccccccccccccccbbccccd',
    'ddeddddcccccccccccccccccccccccdd',
    'dddddccccccccccccccccccccccccddd',
    'ddddccccccccccccccccccccccccdddd',
    'dddccccccccccccccccccccccccddddd',
    'ddcccccccccccccccccccccccccddddd',
  ],
  [
    'ccccccccccccccccccccbcccccdddddd',
    'ccccccccccccccccccccccccccdddddc',
    'cccccccccccccccccccccccccccdcccc',
    'cccccccccccccccccccccccccccccccc',
    'ccccccccccccccccccbccccccccccccc',
    'cccccccccccccccccbbbcccccccccccc',
    'ccccccccccccccccbbbbcccccccccccc',
    'ccccccccdddcccccbbbbcccccccccccc',
    'cccccccccdcccccbbbbbbccccccccccc',
    'cccccccccccccccbbbbbbbcccccccccc',
    'ccccccccccccccbbbbbbbcbccccccccc',
    'ccccccdccccccbbbbbbbcccccccccccc',
    'cccccdccccccbbabbbbccccccccccccc',
    'ccccdddccccbbaabbbcccccccccccccc',
    'ccccddcccccbaaabbbbccccccccccccc',
    'ccccdccccccbbabbbbcccccccccccccc',
    'ccccccccccbbbbbbbccccccccccccccc',
    'ccccccccccbbbbcccccccccccccccccc',
    'ccccccccccbbcccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccc',
    'ccdccccccccccccccccccccccccccccc',
    'cdddccccccccccccccccccccccbbcccc',
    'dddddccccccccccccccccccccbbbcccc',
    'dddddcccccccccccccccccccbbbccccd',
    'dddddccccccccccccccccccccbccccdd',
    'ddddcccdcdccccccccccccccbcccccdd',
    'dddddcdcdcccccccccccccccccccdddd',
    'dddcccccccccccccccccccbccccddddd',
    'dddccccccccccccccccccbbccccddded',
    'ddccccccccccccccccccbbbccccddeee',
    'ddcccccccccccccccccccbccccdddded',
  ],
]

/** One of the four shoreline directions. */
type ShoreSide = 'n' | 's' | 'e' | 'w'

/**
 * A bank's depth profile. The two edge frames use different profiles so the
 * renderer's per-tile hash alternation reads as a bank that shallows and
 * deepens, not as one stamped outline.
 */
interface ShoreProfile {
  /** Distance from land where the dark waterline starts. */
  waterline: number
  /** How far the waterline wanders along the bank. */
  wobble: number
  /** Base width of the dithered dark waterline. */
  fringe: number
  /** How much the waterline width varies along the bank. */
  fringeWobble: number
  /** Width of the dithered fade back into open water. */
  fade: number
  /** Depth of the dry lip before the wet-earth transition starts. */
  lip: number
  /** Whether the dark waterline is continuous or broken into patches. */
  intermittent: boolean
  /** Seed for this bank's noise. */
  seed: number
}

/** Frame 0: a deep, chunky bank with a continuous shadow line. */
const DEEP_BANK: ShoreProfile = {
  waterline: 6.2,
  wobble: 1.5,
  fringe: 2.2,
  fringeWobble: 0.7,
  fade: 2.4,
  lip: 1.6,
  intermittent: false,
  seed: 11
}

/** Frame 1: a shallow bank whose waterline has receded and broken up. */
const SHALLOW_BANK: ShoreProfile = {
  waterline: 4.6,
  wobble: 1.2,
  fringe: 1.5,
  fringeWobble: 0.7,
  fade: 2.2,
  lip: 0.9,
  intermittent: true,
  seed: 37
}

/** Return a frame from a readonly bank, always safe under strict indexing. */
function frameAt(frames: readonly PixelFrame[], index: number): PixelFrame {
  return frames[index] ?? []
}

/** Deterministic 0..1 hash of two integer coordinates and a seed. */
function hash01(x: number, y: number, seed: number): number {
  let h = Math.imul(x + 0x9e3779b9, 0x85ebca6b)
  h ^= Math.imul(y + seed, 0xc2b2ae35)
  h ^= h >>> 13
  h = Math.imul(h, 0x27d4eb2d)
  h ^= h >>> 15
  return (h >>> 0) / 0xffffffff
}

/** Smooth 2D value noise in 0..1; pure and deterministic. */
function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash01(xi, yi, seed)
  const b = hash01(xi + 1, yi, seed)
  const c = hash01(xi, yi + 1, seed)
  const d = hash01(xi + 1, yi + 1, seed)
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v
}

/**
 * Coordinate that runs along the bank. Straight bands use the axis parallel
 * to their edge; corners use a diagonal so the noise stays continuous where
 * the two edges meet.
 */
function shoreAlong(sides: ReadonlySet<ShoreSide>, x: number, y: number): number {
  const n = sides.has('n')
  const s = sides.has('s')
  const w = sides.has('w')
  const e = sides.has('e')
  if (n && !s && !w && !e) return x
  if (s && !n && !w && !e) return x
  if (w && !n && !s && !e) return y
  if (e && !n && !s && !w) return y
  if (n && w) return x + y
  if (s && e) return x + y
  if (n && e) return x - y + 32
  if (s && w) return x - y + 32
  return x + y
}

/**
 * Low-frequency bank noise. The broad octave sets the bank's depth, the mid
 * octave gives the waterline its meander, and the fine octave adds the
 * pixel-scale grain that keeps the dither from looking machined. The noise
 * varies quickly along the bank and slowly across it, so the waterline
 * meanders without wandering into the water.
 */
function bankNoise(along: number, across: number, seed: number): number {
  const broad = valueNoise(along * 0.11, across * 0.035, seed)
  const mid = valueNoise(along * 0.27, across * 0.08, seed + 17)
  const fine = valueNoise(along * 0.61, across * 0.18, seed + 41)
  return (broad + mid * 0.35 + fine * 0.1) / 1.45
}

/**
 * Stretch the noise's narrow middle range so the bank actually moves a pixel
 * or two. Averaging octaves pulls values toward 0.5; without this contrast
 * the waterline would stay pinned to one row for the whole band.
 */
function shapedNoise(along: number, across: number, seed: number): number {
  const n = bankNoise(along, across, seed)
  return Math.min(1, Math.max(0, (n - 0.5) * 2.5 + 0.5))
}

/** 4x4 Bayer threshold in 0..1, used for ordered dithering. */
const BAYER4: readonly number[] = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5
]

function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] ?? 0) / 16
}

/**
 * A 2px-block mask with exactly six of sixteen blocks lit. An intermittent
 * waterline therefore covers 37.5% of the band length, leaving the rest as
 * wet earth and shallow fringe. Rotating the mask by a deterministic side
 * offset keeps neighbouring banks from sharing the same gaps.
 */
const CORE_MASK: readonly number[] = [
  1, 1, 0, 0, 1, 0, 0, 1,
  0, 0, 1, 1, 0, 0, 0, 0
]

/** Deterministic rotation so each side gets a different patch rhythm. */
function sideOffset(sides: ReadonlySet<ShoreSide>): number {
  if (sides.has('n') && sides.has('w')) return 3
  if (sides.has('n') && sides.has('e')) return 7
  if (sides.has('s') && sides.has('w')) return 11
  if (sides.has('s') && sides.has('e')) return 13
  if (sides.has('n')) return 0
  if (sides.has('s')) return 5
  if (sides.has('w')) return 9
  if (sides.has('e')) return 15
  return 0
}

/** Whether the dark waterline is present at this point along the bank. */
function corePresent(along: number, sides: ReadonlySet<ShoreSide>, profile: ShoreProfile): boolean {
  if (!profile.intermittent) return true
  const block = Math.floor(along / 2) % 16
  const shift = (Math.floor(hash01(profile.seed, 0, 211) * 16) + sideOffset(sides)) % 16
  return CORE_MASK[(block + shift) % 16] === 1
}

/**
 * Pick a shore tone for one pixel of a band.
 *
 * Zones run from land to water: dry lip, two wet-earth transition steps,
 * wet earth, a wobbling dark waterline, then a dithered fringe that fades
 * into transparent so the animated base water shows through. The deep bank
 * keeps its waterline continuous; the shallow bank breaks it into patches
 * and lets the wet shelf show through the gaps.
 */
function shoreChar(
  distance: number,
  x: number,
  y: number,
  sides: ReadonlySet<ShoreSide>,
  profile: ShoreProfile
): string {
  const along = shoreAlong(sides, x, y)
  const bank = shapedNoise(along, distance, profile.seed)
  const lipNoise = shapedNoise(along, distance, profile.seed + 101)
  const waterline = profile.waterline + (bank - 0.5) * 2 * profile.wobble
  const fringe = profile.fringe + (lipNoise - 0.5) * 2 * profile.fringeWobble
  const lip = profile.lip + (lipNoise - 0.5) * 1.2
  const coreStart = Math.ceil(waterline)
  const coreEnd = Math.max(coreStart, Math.floor(waterline + fringe))
  const reach = coreEnd + 2 + profile.fade
  const coreOn = corePresent(along, sides, profile)

  if (distance >= reach) return '.'

  // Dry lip: pale earth, moss, and silt pebbles.
  if (distance < lip) {
    const h = hash01(x, y, profile.seed + 7)
    if (h < 0.1) return 'q'
    if (h < 0.16) return 'r'
    if (h < 0.28) return 'o'
    if (h < 0.34) return 'p'
    return 'n'
  }

  // First transition step: dry lip gives way to wet pebbles.
  if (distance < lip + 1) {
    const h = hash01(x, y, profile.seed + 13)
    if (h < 0.16) return 'n'
    if (h < 0.24) return 'o'
    return 'm'
  }

  // Second transition step: wet pebbles give way to lit wet earth.
  if (distance < lip + 2) {
    const h = hash01(x, y, profile.seed + 19)
    if (h < 0.2) return 'm'
    if (h < 0.28) return 'k'
    return 'l'
  }

  // Wet earth: lit near the lip, darker toward the waterline.
  if (distance < coreStart - 1) {
    const span = Math.max(0.5, coreStart - 1 - (lip + 2))
    const depth = (distance - (lip + 2)) / span
    const h = hash01(x, y, profile.seed + 23)
    if (h < 0.1) return 'm'
    if (h < 0.1 + depth * 0.45) return 'k'
    return 'l'
  }

  // Intermittent gap: the waterline reads as a wet shelf, not a dark line.
  if (!coreOn) {
    if (distance <= coreEnd) {
      const h = hash01(x, y, profile.seed + 23)
      if (h < 0.1) return 'm'
      if (h < 0.35) return 'k'
      return 'l'
    }
    if (distance === coreEnd + 1) {
      const h = hash01(x, y, profile.seed + 31)
      const b = bayer(x, y)
      if (h < 0.06) return 'g'
      if (b > 0.5) return '.'
      return h < 0.5 ? 'k' : 'l'
    }
    const fade = (distance - (coreEnd + 2)) / Math.max(0.5, reach - (coreEnd + 2))
    const h = hash01(x, y, profile.seed + 31)
    const b = bayer(x, y)
    if (h < 0.05) return 'g'
    if (b < 0.4 * (1 - fade)) return h < 0.5 ? 'k' : 'l'
    return '.'
  }

  // Dark waterline: a wobbling core with one dithered row on each side.
  if (distance >= coreStart && distance <= coreEnd) {
    const h = hash01(x, y, profile.seed + 29)
    if (h < 0.08) return 'g'
    if (h < 0.16) return 'k'
    return h < 0.45 ? 'j' : 'i'
  }
  if (distance === coreStart - 1) {
    const h = hash01(x, y, profile.seed + 29)
    const b = bayer(x, y)
    if (h < 0.08) return 'g'
    if (b > 0.55) return 'l'
    return h < 0.5 ? 'j' : 'i'
  }
  if (distance === coreEnd + 1) {
    const h = hash01(x, y, profile.seed + 29)
    const b = bayer(x, y)
    if (h < 0.06) return 'g'
    if (b > 0.5) return '.'
    return h < 0.5 ? 'j' : 'i'
  }

  // Fringe: ordered dither and foam thinning into open water.
  const fade = (distance - (coreEnd + 2)) / Math.max(0.5, reach - (coreEnd + 2))
  const h = hash01(x, y, profile.seed + 31)
  const b = bayer(x, y)
  if (h < 0.05) return 'g'
  if (b < 0.45 * (1 - fade)) return h < 0.5 ? 'j' : 'i'
  return '.'
}

/**
 * Overlay a shoreline band onto a base water frame.
 *
 * The band is deliberately narrow and wobbles with the frame's own water
 * motion, so the edge never reads as a straight stripe. Corners take the
 * nearest of the two enabled sides, which gives them a natural quarter-round
 * shape instead of a hard right angle.
 */
function shoreFrame(base: PixelFrame, sides: ReadonlySet<ShoreSide>, profile: ShoreProfile): PixelFrame {
  const rows: string[] = []
  const height = base.length
  const width = base.reduce((longest, row) => Math.max(longest, row.length), 0)

  for (let y = 0; y < height; y += 1) {
    let row = ''

    for (let x = 0; x < width; x += 1) {
      const dN = y
      const dS = height - 1 - y
      const dW = x
      const dE = width - 1 - x

      let distance = Number.POSITIVE_INFINITY
      if (sides.has('n')) distance = Math.min(distance, dN)
      if (sides.has('s')) distance = Math.min(distance, dS)
      if (sides.has('w')) distance = Math.min(distance, dW)
      if (sides.has('e')) distance = Math.min(distance, dE)

      row += shoreChar(distance, x, y, sides, profile)
    }

    rows.push(row)
  }

  return rows
}

/** North bank: land above, water below. */
const EDGE_N_FRAMES: readonly PixelFrame[] = [
  shoreFrame(frameAt(BASE_FRAMES, 0), new Set<ShoreSide>(['n']), DEEP_BANK),
  shoreFrame(frameAt(BASE_FRAMES, 1), new Set<ShoreSide>(['n']), SHALLOW_BANK)
]

/** South bank: land below, water above. */
const EDGE_S_FRAMES: readonly PixelFrame[] = [
  shoreFrame(frameAt(BASE_FRAMES, 0), new Set<ShoreSide>(['s']), DEEP_BANK),
  shoreFrame(frameAt(BASE_FRAMES, 1), new Set<ShoreSide>(['s']), SHALLOW_BANK)
]

/** East bank: land right, water left. */
const EDGE_E_FRAMES: readonly PixelFrame[] = [
  shoreFrame(frameAt(BASE_FRAMES, 0), new Set<ShoreSide>(['e']), DEEP_BANK),
  shoreFrame(frameAt(BASE_FRAMES, 1), new Set<ShoreSide>(['e']), SHALLOW_BANK)
]

/** West bank: land left, water right. */
const EDGE_W_FRAMES: readonly PixelFrame[] = [
  shoreFrame(frameAt(BASE_FRAMES, 0), new Set<ShoreSide>(['w']), DEEP_BANK),
  shoreFrame(frameAt(BASE_FRAMES, 1), new Set<ShoreSide>(['w']), SHALLOW_BANK)
]

/** Rounded north-east corner: land above and right. */
const CORNER_NE_FRAMES: readonly PixelFrame[] = [
  shoreFrame(frameAt(BASE_FRAMES, 0), new Set<ShoreSide>(['n', 'e']), DEEP_BANK),
  shoreFrame(frameAt(BASE_FRAMES, 1), new Set<ShoreSide>(['n', 'e']), SHALLOW_BANK)
]

/** Rounded north-west corner: land above and left. */
const CORNER_NW_FRAMES: readonly PixelFrame[] = [
  shoreFrame(frameAt(BASE_FRAMES, 0), new Set<ShoreSide>(['n', 'w']), DEEP_BANK),
  shoreFrame(frameAt(BASE_FRAMES, 1), new Set<ShoreSide>(['n', 'w']), SHALLOW_BANK)
]

/** Rounded south-east corner: land below and right. */
const CORNER_SE_FRAMES: readonly PixelFrame[] = [
  shoreFrame(frameAt(BASE_FRAMES, 0), new Set<ShoreSide>(['s', 'e']), DEEP_BANK),
  shoreFrame(frameAt(BASE_FRAMES, 1), new Set<ShoreSide>(['s', 'e']), SHALLOW_BANK)
]

/** Rounded south-west corner: land below and left. */
const CORNER_SW_FRAMES: readonly PixelFrame[] = [
  shoreFrame(frameAt(BASE_FRAMES, 0), new Set<ShoreSide>(['s', 'w']), DEEP_BANK),
  shoreFrame(frameAt(BASE_FRAMES, 1), new Set<ShoreSide>(['s', 'w']), SHALLOW_BANK)
]

export const waterSprites: {
  base: PixelSprite
  edgeN: PixelSprite
  edgeS: PixelSprite
  edgeE: PixelSprite
  edgeW: PixelSprite
  cornerNE: PixelSprite
  cornerNW: PixelSprite
  cornerSE: PixelSprite
  cornerSW: PixelSprite
} = {
  base: { palette: WATER_PALETTE, frames: BASE_FRAMES, frameMs: 640 },
  edgeN: { palette: EDGE_PALETTE, frames: EDGE_N_FRAMES, frameMs: 680 },
  edgeS: { palette: EDGE_PALETTE, frames: EDGE_S_FRAMES, frameMs: 680 },
  edgeE: { palette: EDGE_PALETTE, frames: EDGE_E_FRAMES, frameMs: 680 },
  edgeW: { palette: EDGE_PALETTE, frames: EDGE_W_FRAMES, frameMs: 680 },
  cornerNE: { palette: EDGE_PALETTE, frames: CORNER_NE_FRAMES, frameMs: 680 },
  cornerNW: { palette: EDGE_PALETTE, frames: CORNER_NW_FRAMES, frameMs: 680 },
  cornerSE: { palette: EDGE_PALETTE, frames: CORNER_SE_FRAMES, frameMs: 680 },
  cornerSW: { palette: EDGE_PALETTE, frames: CORNER_SW_FRAMES, frameMs: 680 },
}
