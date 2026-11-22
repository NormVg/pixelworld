/**
 * The cat companion's sprite bank for Willow Hollow.
 *
 * One warm orange tabby in the chibi language of the reference sheet: a plump
 * rounded body that carries the most mass, a smaller full-cheeked kitten head
 * sitting on top of it, very short legs, small open square eyes, pink inner
 * ears, and a thick striped tail. She is drawn from above / three-quarter like
 * the other creatures and faces LEFT so the renderer can mirror her for
 * rightward travel.
 *
 * - `walk`  40x30, four frames. A small chibi stride with the tail held up in
 *   a soft curve and swaying opposite the paws.
 * - `sit`   40x30, two frames. An upright kitten sit: head high, plump
 *   haunches, tiny front paws, and the thick striped tail curled around them.
 * - `stare` 40x30, two frames. Ears up, head alert, and the tail tip ticking
 *   between two heights while she watches something.
 *
 * The palette follows the reference's orange tabby: warm orange base, cream
 * muzzle/chest/belly, darker orange shade, deep tabby stripes on the head top,
 * back and tail, pink inner ears, and a dark nose/mouth. There is no collar
 * and no bell.
 *
 * Conventions:
 * - Every frame is a grid of rows; every row is exactly the frame width.
 * - Each character maps to a color in `CAT_PALETTE`; '.' is transparent.
 * - The silhouette carries a one-pixel `#2a2431` outline, light falls from
 *   the top left (the `G` highlight), and shade piles into the lower right
 *   (`d`). The cream muzzle, chest and belly are `c`, shaded `C`.
 * - Face details are positioned relative to `headCx`, never at hardcoded
 *   absolute x positions, so the turned stare head keeps its whole face.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/** Frame dimensions shared by every pose. */
const CAT_W = 40
const CAT_H = 30

const CAT_PALETTE: PixelPalette = {
  o: '#2a2431', // outline
  g: '#c96f2e', // warm orange base
  G: '#e08a48', // sunlit orange, top-left
  d: '#a85a24', // orange shade, bottom-right
  k: '#8b4a1f', // deep tabby stripe
  c: '#f2d2b4', // cream muzzle, chest and belly
  C: '#d9b896', // cream shade
  p: '#e8a07a', // subtle cheek blush
  i: '#f2c9a8', // pink inner ear
  e: '#2b1a12', // eye
  w: '#fff6e6', // eye glint
  n: '#5a2e1a' // nose and mouth
}

/* ------------------------------------------------------------------ */
/* Rounded silhouette helpers                                          */
/* ------------------------------------------------------------------ */

type Mask = boolean[][]

function blankGrid(): string[][] {
  return Array.from({ length: CAT_H }, () => Array<string>(CAT_W).fill('.'))
}

function blankMask(): Mask {
  return Array.from({ length: CAT_H }, () => Array<boolean>(CAT_W).fill(false))
}

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const nx = (x - cx) / rx
  const ny = (y - cy) / ry
  return nx * nx + ny * ny <= 1
}

function ellipseMask(cx: number, cy: number, rx: number, ry: number): Mask {
  const mask = blankMask()
  for (let y = 0; y < CAT_H; y++) {
    for (let x = 0; x < CAT_W; x++) {
      if (inEllipse(x, y, cx, cy, rx, ry)) mask[y][x] = true
    }
  }
  return mask
}

function unionMasks(...masks: readonly Mask[]): Mask {
  const mask = blankMask()
  for (const source of masks) {
    for (let y = 0; y < CAT_H; y++) {
      for (let x = 0; x < CAT_W; x++) {
        if (source[y][x]) mask[y][x] = true
      }
    }
  }
  return mask
}

/** A thick striped tail: a chain of overlapping circles along a curve. */
function tailMask(points: readonly (readonly [number, number])[], radius: number): Mask {
  const mask = blankMask()
  for (const [cx, cy] of points) {
    for (let y = 0; y < CAT_H; y++) {
      for (let x = 0; x < CAT_W; x++) {
        if (inEllipse(x, y, cx, cy, radius, radius)) mask[y][x] = true
      }
    }
  }
  return mask
}

/** Fill a mask with a top-left-lit orange gradient. */
function fillMask(grid: string[][], mask: Mask, cx: number, cy: number): void {
  for (let y = 0; y < CAT_H; y++) {
    for (let x = 0; x < CAT_W; x++) {
      if (!mask[y][x]) continue
      const light = x - cx + (y - cy)
      grid[y][x] = light < -3 ? 'G' : light > 3 ? 'd' : 'g'
    }
  }
}

/** Replace the outer boundary of the union with the one-pixel outline. */
function outlineMask(grid: string[][], mask: Mask): void {
  for (let y = 0; y < CAT_H; y++) {
    for (let x = 0; x < CAT_W; x++) {
      if (!mask[y][x]) continue
      const edge =
        x === 0 ||
        x === CAT_W - 1 ||
        y === 0 ||
        y === CAT_H - 1 ||
        !mask[y][x - 1] ||
        !mask[y][x + 1] ||
        !mask[y - 1][x] ||
        !mask[y + 1][x]
      if (edge) grid[y][x] = 'o'
    }
  }
}

/** Paint a filled ellipse over the grid, used for eyes, muzzle and inners. */
function fillEllipse(grid: string[][], cx: number, cy: number, rx: number, ry: number, ch: string): void {
  for (let y = 0; y < CAT_H; y++) {
    for (let x = 0; x < CAT_W; x++) {
      if (inEllipse(x, y, cx, cy, rx, ry)) grid[y][x] = ch
    }
  }
}

/** Paint an ellipse only where `mask` is true and the cell is not the outline. */
function fillEllipseOnMask(
  grid: string[][],
  mask: Mask,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  ch: string
): void {
  for (let y = 0; y < CAT_H; y++) {
    for (let x = 0; x < CAT_W; x++) {
      if (!mask[y][x] || grid[y][x] === 'o' || grid[y][x] === '.') continue
      if (inEllipse(x, y, cx, cy, rx, ry)) grid[y][x] = ch
    }
  }
}

/* ------------------------------------------------------------------ */
/* Pose composition                                                    */
/* ------------------------------------------------------------------ */

interface PoseOptions {
  body: Mask
  tail: Mask
  legs: readonly (readonly [number, number, number])[]
  headCx?: number
  headCy?: number
}

/**
 * One frame: the smaller kitten head, plump body, thick tail and tiny legs are
 * filled first, then a single outline wraps the union so the silhouette stays
 * soft. Cream markings, tabby stripes and the face are painted on top.
 */
function composePose(options: PoseOptions): PixelFrame {
  const headCx = options.headCx ?? 10
  const headCy = options.headCy ?? 9
  const grid = blankGrid()

  // Rounded kitten head with full cheeks and small wide-set ears. It is kept
  // clearly narrower than the plump body so the body reads as the biggest mass.
  const headMask = unionMasks(
    ellipseMask(headCx, headCy, 7.5, 6.5),
    ellipseMask(headCx - 5, headCy - 6, 2.2, 2.2),
    ellipseMask(headCx + 5, headCy - 6, 2.2, 2.2),
    ellipseMask(headCx - 4.5, headCy + 3.5, 3, 2.5),
    ellipseMask(headCx + 4.5, headCy + 3.5, 3, 2.5)
  )
  const legMasks = options.legs.map(([x, y, r]) => ellipseMask(x, y, r, r))
  const all = unionMasks(headMask, options.body, options.tail, ...legMasks)

  fillMask(grid, options.body, 24, 17)
  fillMask(grid, options.tail, 35, 13)
  for (const leg of legMasks) {
    for (let y = 0; y < CAT_H; y++) {
      for (let x = 0; x < CAT_W; x++) {
        if (leg[y][x]) grid[y][x] = 'c'
      }
    }
  }
  fillMask(grid, headMask, headCx, headCy)

  // Cream chest and belly, clipped to the body so they never spill.
  fillEllipseOnMask(grid, options.body, headCx + 8, 20, 3.5, 4, 'c')
  fillEllipseOnMask(grid, options.body, headCx + 14, 22, 5, 2.5, 'c')

  outlineMask(grid, all)

  // Pink inner ears.
  fillEllipse(grid, headCx - 5, headCy - 6, 1.2, 1.2, 'i')
  fillEllipse(grid, headCx + 5, headCy - 6, 1.2, 1.2, 'i')

  // Small open square eyes: 2x2 dark, one white glint at the top-left.
  const eyeY = headCy
  const leftEyeX = Math.round(headCx - 3)
  const rightEyeX = Math.round(headCx + 2)
  grid[eyeY][leftEyeX] = 'w'
  grid[eyeY][leftEyeX + 1] = 'e'
  grid[eyeY + 1][leftEyeX] = 'e'
  grid[eyeY + 1][leftEyeX + 1] = 'e'
  grid[eyeY][rightEyeX] = 'w'
  grid[eyeY][rightEyeX + 1] = 'e'
  grid[eyeY + 1][rightEyeX] = 'e'
  grid[eyeY + 1][rightEyeX + 1] = 'e'

  // Cream muzzle with a tiny dark nose and mouth. Clipped to the head so it
  // never paints over the chin outline.
  fillEllipseOnMask(grid, headMask, headCx, headCy + 4, 3, 2.5, 'c')
  grid[headCy + 4][Math.round(headCx)] = 'n'
  grid[headCy + 5][Math.round(headCx)] = 'n'

  // Whisker dots and blush, all relative to headCx and kept inside the
  // outline so the silhouette never opens up at the cheek.
  grid[headCy + 3][Math.round(headCx - 6)] = 'o'
  grid[headCy + 4][Math.round(headCx - 6)] = 'o'
  grid[headCy + 3][Math.round(headCx + 6)] = 'o'
  grid[headCy + 4][Math.round(headCx + 6)] = 'o'
  grid[headCy + 2][Math.round(headCx - 6)] = 'p'
  grid[headCy + 2][Math.round(headCx + 6)] = 'p'

  // Tabby bands on the head top, clipped to the head.
  for (const bx of [headCx - 3, headCx, headCx + 3]) {
    for (let y = headCy - 4; y <= headCy - 2; y++) {
      for (let dx = 0; dx <= 1; dx++) {
        const x = Math.round(bx + dx)
        const cell = grid[y][x]
        if (cell === 'g' || cell === 'G' || cell === 'd') {
          grid[y][x] = dx === 0 ? 'k' : 'd'
        }
      }
    }
  }

  // Tabby bands on the back, clipped to the body.
  for (const bx of [22, 26, 30]) {
    for (let y = 13; y <= 22; y++) {
      for (let dx = 0; dx <= 2; dx++) {
        const x = bx + dx
        const cell = grid[y][x]
        if (cell === 'g' || cell === 'G' || cell === 'd') {
          grid[y][x] = dx <= 1 ? 'k' : 'd'
        }
      }
    }
  }

  // A few stripes down the tail.
  for (const [x, y] of [
    [34, 16],
    [36, 13],
    [37, 10]
  ]) {
    if (grid[y][x] !== '.' && grid[y][x] !== 'o') grid[y][x] = 'k'
  }

  return grid.map((row) => row.join(''))
}

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

/** Plump rounded body: the biggest mass, with a small chest and full haunches. */
const WALK_BODY = unionMasks(ellipseMask(19, 18, 7, 6.5), ellipseMask(26, 19, 7.5, 7))

/** Sitting loaf: one plump near-circular body under the smaller head. */
const SIT_BODY = ellipseMask(24, 18, 10.5, 7)

/** Thick tail held up in a soft curve. */
const TAIL_UP = tailMask(
  [
    [33, 20],
    [35, 17],
    [37, 14],
    [38, 11],
    [37, 9],
    [35, 8]
  ],
  2.5
)

/** The same tail with the tip dipped for the walk's opposite beat. */
const TAIL_DOWN = tailMask(
  [
    [33, 20],
    [35, 17],
    [37, 14],
    [38, 12],
    [37, 11],
    [36, 10]
  ],
  2.5
)

/** Sitting tail curled around the front paws, tip visible at the left. */
const TAIL_CURL = tailMask(
  [
    [31, 21],
    [29, 24],
    [25, 26],
    [20, 26],
    [16, 25],
    [13, 24],
    [11, 22]
  ],
  2.5
)

/** The curled tail with its tip flicked up. */
const TAIL_FLICK = tailMask(
  [
    [31, 21],
    [29, 24],
    [25, 26],
    [20, 26],
    [16, 25],
    [13, 23],
    [10, 20]
  ],
  2.5
)

/** Alert tail, tip ticking upward. */
const TAIL_TICK_UP = TAIL_UP

/** Alert tail, tip ticking downward. */
const TAIL_TICK_DOWN = TAIL_DOWN

/* ------------------------------------------------------------------ */
/* Frames                                                              */
/* ------------------------------------------------------------------ */

const WALK_FRAMES: readonly PixelFrame[] = [
  composePose({
    body: WALK_BODY,
    tail: TAIL_UP,
    legs: [
      [16, 25, 2.2],
      [20, 26, 2.2],
      [26, 26, 2.2],
      [30, 25, 2.2]
    ]
  }),
  composePose({
    body: WALK_BODY,
    tail: TAIL_DOWN,
    legs: [
      [17, 26, 2.2],
      [21, 26, 2.2],
      [26, 26, 2.2],
      [29, 26, 2.2]
    ]
  }),
  composePose({
    body: WALK_BODY,
    tail: TAIL_UP,
    legs: [
      [16, 26, 2.2],
      [20, 25, 2.2],
      [26, 25, 2.2],
      [30, 26, 2.2]
    ]
  }),
  composePose({
    body: WALK_BODY,
    tail: TAIL_DOWN,
    legs: [
      [17, 26, 2.2],
      [21, 26, 2.2],
      [27, 26, 2.2],
      [29, 26, 2.2]
    ]
  })
]

const SIT_FRAMES: readonly PixelFrame[] = [
  composePose({
    body: SIT_BODY,
    tail: TAIL_CURL,
    headCx: 13,
    headCy: 8,
    legs: [
      [18, 25, 2.2],
      [23, 25, 2.2]
    ]
  }),
  composePose({
    body: SIT_BODY,
    tail: TAIL_FLICK,
    headCx: 13,
    headCy: 8,
    legs: [
      [18, 25, 2.2],
      [23, 25, 2.2]
    ]
  })
]

const STARE_FRAMES: readonly PixelFrame[] = [
  composePose({
    body: WALK_BODY,
    tail: TAIL_TICK_UP,
    headCx: 9,
    legs: [
      [16, 26, 2.2],
      [21, 26, 2.2],
      [26, 26, 2.2],
      [30, 26, 2.2]
    ]
  }),
  composePose({
    body: WALK_BODY,
    tail: TAIL_TICK_DOWN,
    headCx: 9,
    legs: [
      [16, 26, 2.2],
      [21, 26, 2.2],
      [26, 26, 2.2],
      [30, 26, 2.2]
    ]
  })
]

export const catSprites = {
  walk: { palette: CAT_PALETTE, frames: WALK_FRAMES, frameMs: 140 } as PixelSprite,
  sit: { palette: CAT_PALETTE, frames: SIT_FRAMES, frameMs: 900 } as PixelSprite,
  stare: { palette: CAT_PALETTE, frames: STARE_FRAMES, frameMs: 520 } as PixelSprite
} as const
