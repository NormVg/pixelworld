/**
 * Bird sprites for Willow Hollow.
 *
 * Three coastal birds, drawn from above (the way the renderer sees things
 * that fly over the scene) and facing left, so the renderer can mirror
 * them when they drift right:
 *
 * - `sparrow` 22x16, four frames. A warm little brown bird with a cream
 *   breast, striped flight feathers, and a forked tail.
 * - `robin`   22x16, four frames. The same sprite geometry with an olive
 *   back, ash-gray head, and the robin's rust-red breast and face.
 * - `gull`    22x16, four frames. A slim gray-and-white sea bird with a
 *   hooked yellow beak, dark wingtips, and long gliding wings.
 *
 * Conventions:
 * - Every frame is a grid of rows; every row is exactly the frame width
 *   (the assembler pads or trims, so hand-drawn rows can never skew).
 * - Each character maps to a color in that species' own palette; '.' is
 *   transparent.
 * - The silhouette carries a one-pixel near-black outline, light falls
 *   from the top left, and the wings beat up, out, and down through the
 *   four frames so a flapping bird reads as one continuous motion.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/** Frame dimensions shared by both species. */
const BIRD_W = 22
const BIRD_H = 16

/** Pads or trims one hand-drawn row to the exact frame width. */
function fitRow(row: string): string {
  return row.padEnd(BIRD_W, '.').slice(0, BIRD_W)
}

/**
 * One wing plane, drawn for the upper wing; the lower wing is the same
 * rows flipped vertically. Every '.' is transparent, so overlaying a
 * wing never erases the body beneath it.
 */
const WING: readonly string[] = [
  '..ooo.',
  '.oyyko',
  'oyykko',
  'okkkko',
  'oyykko',
  '.oyyo.',
]

/** Overlays `stamp` onto `grid` at (x, y); '.' cells are skipped. */
function stampAt(grid: string[][], stamp: readonly string[], x: number, y: number): void {
  for (let sy = 0; sy < stamp.length; sy++) {
    const row = grid[y + sy]
    if (!row) continue
    const chars = stamp[sy]
    for (let sx = 0; sx < chars.length; sx++) {
      const ch = chars.charAt(sx)
      if (ch === '.') continue
      const gx = x + sx
      if (gx >= 0 && gx < BIRD_W) row[gx] = ch
    }
  }
}

/** Vertical flip, so one wing drawing serves both sides of the bird. */
function flipVertically(rows: readonly string[]): string[] {
  return [...rows].reverse().map((row) => row.split('').reverse().join(''))
}

/**
 * The body of one bird: rows of palette keys for the species, then the
 * wing pair overlaid at the beat offset of the requested frame.
 *
 * Frame 0 holds the wings swept high, 1 mid-beat, 2 low, and 3 rests
 * them back along the body for a glide.
 */
function composeBirdFrame(body: readonly string[], frame: number): PixelFrame {
  const grid = body.map((row) => fitRow(row).split(''))

  // Wings pivot at the shoulders, a little behind the head.
  const shoulderX = 11
  const beatY = [0, 2, 4, 6][frame] ?? 0
  stampAt(grid, WING, shoulderX, beatY)
  const mirrored = flipVertically(WING)
  stampAt(grid, mirrored, shoulderX, BIRD_H - beatY - mirrored.length)

  return grid.map((row) => row.join(''))
}

/* ------------------------------------------------------------------ */
/* Sparrow                                                             */
/* ------------------------------------------------------------------ */

const SPARROW_PALETTE: PixelPalette = {
  o: '#2a2431', // outline
  b: '#8a6a4a', // back brown
  B: '#a8845c', // back light
  v: '#5e4530', // back shade
  w: '#ead9b8', // cream breast and cheek
  k: '#42342a', // wing dark stripes
  y: '#c9a35a', // wing light
  e: '#161114', // eye
  a: '#3a2e26', // beak
  f: '#7a5a3c', // tail feather
}

/* Beak, head, body and forked tail; wings are stamped on per frame. */
const SPARROW_BODY: readonly string[] = [
  '......................',
  '......................',
  '.....oooo.............',
  '....oBBBBo............',
  '.aa.oBweBo............',
  '.aoooBwwwBoo..........',
  '..aoBBwwBBBBBoo........',
  '...oBbwwwbBBBBooo.....',
  '...oBbbbbbbBBBffffoo...',
  '...ooBbbbbBBBffffffo...',
  '.....ooBBBBBooffffo...',
  '.......oooooo.oo......',
  '..........o..o........',
  '......................',
  '......................',
  '......................',
]

const SPARROW_FRAMES: readonly PixelFrame[] = [0, 1, 2, 3].map((frame) =>
  composeBirdFrame(SPARROW_BODY, frame)
)

/* ------------------------------------------------------------------ */
/* Robin                                                               */
/* ------------------------------------------------------------------ */

const ROBIN_PALETTE: PixelPalette = {
  o: '#2a2431', // outline
  b: '#7d7a5c', // olive back
  B: '#98936c', // back light
  v: '#5c5a42', // back shade
  w: '#e3ded2', // ash head and flanks
  r: '#c8552e', // rust breast and face
  R: '#e0703c', // rust light
  k: '#3c3a30', // wing dark stripes
  y: '#a89a6a', // wing light
  e: '#161114', // eye
  a: '#3a2e26', // beak
  f: '#6a5f42', // tail feather
}

/* Same geometry as the sparrow, with the robin's rust breast showing. */
const ROBIN_BODY: readonly string[] = [
  '......................',
  '......................',
  '.....oooo.............',
  '....oBBBBBo...........',
  '.aa.oBreRo............',
  '.aoooRrrrRoo..........',
  '..aoBrrrrBBBBBoo......',
  '...oBbrrrbBBBBooo.....',
  '...oBbbbbbbBBBffffoo...',
  '...ooBbbbbBBBffffffo...',
  '.....ooBBBBBooffffo...',
  '.......oooooo.oo......',
  '..........o..o........',
  '......................',
  '......................',
  '......................',
]

const ROBIN_FRAMES: readonly PixelFrame[] = [0, 1, 2, 3].map((frame) =>
  composeBirdFrame(ROBIN_BODY, frame)
)

/* ------------------------------------------------------------------ */
/* Gull                                                                */
/* ------------------------------------------------------------------ */

const GULL_PALETTE: PixelPalette = {
  o: '#2a2431', // outline
  g: '#aeb8c0', // gray back
  G: '#dbe2e7', // pale gray back
  w: '#f7f9fa', // white breast and cheek
  v: '#8b959d', // back shade
  k: '#3a3f47', // dark wingtips
  y: '#e6b23c', // beak yellow
  Y: '#f4d27a', // beak light
  e: '#161114', // eye
  f: '#b3bcc3', // tail feather
  F: '#dde3e7', // tail light
}

/* Slimmer and longer than the sparrow, with a short square tail. */
const GULL_BODY: readonly string[] = [
  '......................',
  '......................',
  '......................',
  '......................',
  '.....oooooo...........',
  '....oGGGGGo...........',
  'oyyoGweGGGo...........',
  '.yyoGGwwGGGGo.........',
  '...oGGwwwGGGGGo.......',
  '...oGGwwwwGGGkkko.....',
  '...oGGGwwwwGGkkkoffffo',
  '....ooGGGGGGGGkkoffffo',
  '.....ooooooooooooffffo',
  '.................oooo.',
  '......................',
  '......................',
]

/**
 * The gull's wing plane: longer and narrower than the songbird wing, with
 * the dark primary tips at the outer end. The lower wing is the same rows
 * flipped, so both tips stay outboard.
 */
const GULL_WING: readonly string[] = [
  '..kkkk..',
  '.oGGGGo.',
  'oGGGGGGo',
  'oGGGGGGo',
]

/**
 * The gull's body with its wing pair overlaid. The beat is lazy: frames
 * 0-2 drift down through a shallow stroke, then frame 3 snaps out to a
 * full glide with the wings at their widest span.
 */
function composeGullFrame(body: readonly string[], frame: number): PixelFrame {
  const grid = body.map((row) => fitRow(row).split(''))

  // Shoulders sit a little behind the head, over the rear of the body.
  const shoulderX = 10
  const beatY = [1, 2, 3, 0][frame] ?? 0
  stampAt(grid, GULL_WING, shoulderX, beatY)
  const mirrored = flipVertically(GULL_WING)
  stampAt(grid, mirrored, shoulderX, BIRD_H - beatY - mirrored.length)

  return grid.map((row) => row.join(''))
}

const GULL_FRAMES: readonly PixelFrame[] = [0, 1, 2, 3].map((frame) =>
  composeGullFrame(GULL_BODY, frame)
)

/* ------------------------------------------------------------------ */
/* Bank                                                                */
/* ------------------------------------------------------------------ */

export const birdSprites = {
  sparrow: { palette: SPARROW_PALETTE, frames: SPARROW_FRAMES, frameMs: 320 } as PixelSprite,
  robin: { palette: ROBIN_PALETTE, frames: ROBIN_FRAMES, frameMs: 360 } as PixelSprite,
  gull: { palette: GULL_PALETTE, frames: GULL_FRAMES, frameMs: 380 } as PixelSprite
} as const
