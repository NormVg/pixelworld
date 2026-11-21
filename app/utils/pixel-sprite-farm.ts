/**
 * High-resolution farm props for Willow Hollow.
 *
 * Every prop is authored at native pixel resolution and anchored at its
 * base row, so the renderer can y-sort it with the player and the rest of
 * the world. Buildings show a roof plane and a shaded side wall; small
 * props show a top face and a front face.
 *
 * Conventions:
 * - Each frame is a grid of rows; every row is exactly the sprite's width.
 * - Each character maps to a color in that sprite's own palette; '.' is
 *   transparent.
 * - The bank shares one near-black plum outline (#2a2431), light from the
 *   top-left, and shade piling into the bottom-right.
 * - `frameMs` is how long one frame is held before advancing. Static props
 *   use 1000ms; the chicken pecks every 520ms; the crop frames are growth
 *   stages held for 2400ms each.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'

/* ------------------------------------------------------------------ */
/* Barn                                                             */
/* ------------------------------------------------------------------ */

const BARN_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  r: '#c04a32', // red plank
  R: '#d96048', // red plank light
  v: '#963626', // red plank shade
  V: '#7a2a1e', // red plank deep
  t: '#a8845a', // timber frame
  T: '#c9a86e', // timber light
  u: '#7a5a3a', // timber shade
  g: '#6a8f5a', // roof moss
  s: '#8a8a98', // slate roof
  S: '#a8a8b6', // slate light
  d: '#5e5e6c', // slate dark
  D: '#44444f', // slate deep
  n: '#3a2a28', // dark opening
  y: '#f2d27a', // window glow
  Y: '#ffe9b3', // window bright
  k: '#8a8078', // foundation stone
  K: '#b0a89e', // stone light
  m: '#6a625c', // stone shade
  h: '#e0b45c', // hay
  H: '#c8953f', // hay shade
}

/** Blank grid at a building's native resolution. */
function emptyBuildingGrid(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => '.'))
}

/** Bounded pixel set for the building composers. */
function buildingSet(grid: string[][], x: number, y: number, ch: string): void {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) grid[y][x] = ch
}

/** Fill one horizontal run, inclusive. */
function buildingRun(grid: string[][], x0: number, x1: number, y: number, ch: string): void {
  for (let x = x0; x <= x1; x++) buildingSet(grid, x, y, ch)
}

/** Deterministic per-cell noise in [0, n); stable across loads, no rng state. */
function cellNoise(x: number, y: number, n: number): number {
  const v = Math.imul(x * 73856093, 31) ^ Math.imul(y * 19349663, 17)
  return Math.abs(v) % n
}

/**
 * 160x136 gambrel barn, composed at native resolution so it never draws
 * upscaled: a louvered cupola on the ridge, a shingled roof plane with
 * course seams and moss in the shade, a timber tie beam, red plank
 * courses with nail heads and the odd knot, corner trim boards lit on
 * the sun side, a framed hayloft door with a pulley beam, mullioned
 * windows that glow, double doors under a lintel with hinges and X
 * braces, and a staggered stone foundation course.
 */
function composeBarn(): PixelFrame {
  const H = 136
  const grid = emptyBuildingGrid(160, H)
  const mid = 80

  // ---- Roof plane: a gambrel profile, two slopes meeting at the knee.
  const roofTop = 6
  const kneeY = 34
  const eaveY = 62
  const ridgeHalf = 28
  const kneeHalf = 46
  const eaveHalf = 74
  const halfAt = (y: number): number =>
    y <= kneeY
      ? ridgeHalf + ((kneeHalf - ridgeHalf) * (y - roofTop)) / (kneeY - roofTop)
      : kneeHalf + ((eaveHalf - kneeHalf) * (y - kneeY)) / (eaveY - kneeY)
  for (let y = roofTop; y <= eaveY; y++) {
    const left = Math.round(mid - halfAt(y))
    const right = Math.round(mid + halfAt(y)) - 1
    const course = Math.floor((y - roofTop) / 4)
    const inCourse = (y - roofTop) % 4
    for (let x = left; x <= right; x++) {
      let ch = inCourse === 0 ? 'S' : inCourse === 3 ? 'd' : 's'
      if (inCourse === 1 && course % 2 === 1) ch = 'd'
      // Moss gathers on the shady side of a course.
      if (cellNoise(x, y, 47) === 0 && x > mid) ch = 'g'
      buildingSet(grid, x, y, ch)
    }
    if (inCourse === 0) {
      for (let x = left + 3 + (course % 3); x <= right; x += 9) buildingSet(grid, x, y, 'D')
    }
  }
  // Eave shadow and the ridge cap.
  for (let y = eaveY + 1; y <= eaveY + 3; y++) {
    buildingRun(grid, Math.round(mid - eaveHalf), Math.round(mid + eaveHalf) - 1, y, y === eaveY + 3 ? 'd' : 'D')
  }
  buildingRun(grid, mid - ridgeHalf, mid + ridgeHalf - 1, roofTop, 'T')
  buildingRun(grid, mid - ridgeHalf, mid + ridgeHalf - 1, roofTop + 1, 't')

  // ---- Cupola: a louvered tower straddling the ridge.
  const cupolaL = 65
  const cupolaR = 94
  for (let y = 0; y <= 5; y++) {
    const half = 15 - y * 2
    buildingRun(grid, mid - half, mid + half, y, y === 0 ? 'S' : y === 5 ? 'd' : 's')
  }
  buildingSet(grid, mid, 0, 'T')
  for (let y = 6; y <= 15; y++) {
    buildingRun(grid, cupolaL, cupolaR, y, 'n')
    for (let x = cupolaL + 1; x < cupolaR; x += 3) buildingSet(grid, x, y, 't')
    buildingSet(grid, cupolaL, y, 'T')
    buildingSet(grid, cupolaR, y, 't')
  }
  buildingRun(grid, cupolaL, cupolaR, 16, 'T')
  buildingRun(grid, cupolaL, cupolaR, 17, 'u')

  // ---- Wall: tie beam, then plank courses with nail heads and knots.
  const wallTop = eaveY + 4
  const wallBottom = 120
  const wallL = 6
  const wallR = 153
  for (let y = wallTop; y < wallTop + 3; y++) buildingRun(grid, wallL, wallR, y, y === wallTop ? 'T' : 't')
  for (let y = wallTop + 3; y < wallBottom; y++) {
    const inCourse = (y - wallTop - 3) % 4
    for (let x = wallL; x <= wallR; x++) {
      let ch = inCourse === 0 ? 'R' : inCourse === 3 ? 'v' : 'r'
      if (cellNoise(x, y, 61) === 0) ch = 'V'
      buildingSet(grid, x, y, ch)
    }
    if (inCourse === 1) {
      const course = Math.floor((y - wallTop - 3) / 4)
      for (let x = wallL + 8 + (course % 2) * 7; x < wallR; x += 14) buildingSet(grid, x, y, 'u')
    }
  }

  // ---- Corner trim boards: the vertical members, lit on the sun side,
  // shaded on the far side, seamed where they meet the planks.
  for (let y = wallTop; y < wallBottom; y++) {
    for (let x = wallL; x < wallL + 4; x++) buildingSet(grid, x, y, x === wallL ? 'T' : x === wallL + 3 ? 'u' : 't')
    for (let x = wallR - 3; x <= wallR; x++) buildingSet(grid, x, y, x === wallR ? 'u' : 't')
  }

  // ---- Windows: timber frames, glowing glass, cross mullions, sills.
  const drawWindow = (wx: number, wy: number, ww: number, wh: number): void => {
    for (let y = wy; y < wy + wh; y++) {
      for (let x = wx; x < wx + ww; x++) {
        const edge = x === wx || x === wx + ww - 1 || y === wy || y === wy + wh - 1
        if (edge) {
          buildingSet(grid, x, y, x < wx + 2 && y < wy + 2 ? 'T' : 't')
        } else {
          const bright = x - wx < (ww - 2) / 2 && y - wy < (wh - 2) / 2
          buildingSet(grid, x, y, bright ? 'Y' : 'y')
        }
      }
    }
    buildingRun(grid, wx + 1, wx + ww - 2, wy + Math.floor(wh / 2), 't')
    for (let y = wy + 1; y < wy + wh - 1; y++) buildingSet(grid, wx + Math.floor(ww / 2), y, 't')
    buildingRun(grid, wx - 1, wx + ww, wy + wh, 'T')
  }
  drawWindow(24, 76, 20, 18)
  drawWindow(116, 76, 20, 18)

  // ---- Hayloft door: framed double leaves with an X brace, a pulley
  // beam above, and a wisp of hay sneaking out under the doors.
  const loftL = 62
  const loftR = 98
  buildingRun(grid, mid - 7, mid + 7, wallTop + 3, 't')
  buildingSet(grid, mid, wallTop + 4, 'u')
  for (let y = 72; y <= 93; y++) {
    for (let x = loftL; x <= loftR; x++) {
      const edge = x <= loftL + 1 || x >= loftR - 1 || y <= 73 || y >= 92
      if (edge) {
        buildingSet(grid, x, y, 't')
      } else if (x === mid) {
        buildingSet(grid, x, y, 'n')
      } else {
        const inCourse = (y - 74) % 4
        buildingSet(grid, x, y, inCourse === 0 ? 'R' : inCourse === 3 ? 'v' : 'r')
      }
    }
  }
  for (let i = 0; i <= 16; i++) {
    buildingSet(grid, loftL + 2 + i, 75 + i, 'u')
    buildingSet(grid, loftR - 2 - i, 75 + i, 'u')
    buildingSet(grid, loftL + 2 + i, 76 + i, 't')
  }
  buildingRun(grid, loftL + 2, mid - 1, 90, 'H')
  buildingRun(grid, loftL + 4, mid - 2, 91, 'h')

  // ---- Main doors: double leaves under a lintel, X braces, hinges on
  // the outer stiles, and a stone step below.
  const doorTop = 98
  const doorBottom = 119
  const doorL = 54
  const doorR = 106
  buildingRun(grid, doorL - 2, doorR + 2, doorTop - 2, 'T')
  buildingRun(grid, doorL - 2, doorR + 2, doorTop - 1, 't')
  for (let y = doorTop; y <= doorBottom; y++) {
    for (let x = doorL; x <= doorR; x++) {
      if (x === doorL || x === doorR || y === doorTop) {
        buildingSet(grid, x, y, 't')
      } else if (x === mid) {
        buildingSet(grid, x, y, 'n')
      } else {
        const inCourse = (y - doorTop) % 4
        buildingSet(grid, x, y, inCourse === 0 ? 'R' : inCourse === 3 ? 'v' : 'r')
      }
    }
  }
  for (let i = 0; i <= 22; i++) {
    buildingSet(grid, doorL + 2 + i, doorTop + 1 + i, 'u')
    buildingSet(grid, doorR - 2 - i, doorTop + 1 + i, 'u')
    buildingSet(grid, doorL + 2 + i, doorTop + 2 + i, 't')
    buildingSet(grid, doorR - 2 - i, doorTop + 2 + i, 't')
  }
  for (let y = doorTop + 4; y <= doorBottom - 3; y += 6) {
    buildingSet(grid, doorL + 1, y, 'u')
    buildingSet(grid, doorR - 1, y, 'u')
  }
  for (let y = doorBottom + 1; y <= doorBottom + 3; y++) {
    for (let x = doorL - 2; x <= doorR + 2; x++) {
      const stone = cellNoise(x, y, 3)
      buildingSet(grid, x, y, y === doorBottom + 1 ? 'K' : stone === 0 ? 'K' : stone === 1 ? 'k' : 'm')
    }
  }

  // ---- Foundation: a staggered stone bond across the full width.
  for (let y = 120; y < H - 1; y++) {
    const row = y - 120
    for (let x = wallL; x <= wallR; x++) {
      const inStone = (x + (row % 2) * 6) % 12
      let ch: string
      if (inStone === 0 || inStone === 11) ch = 'm'
      else if (inStone === 1) ch = 'K'
      else ch = 'k'
      if (cellNoise(Math.floor((x + (row % 2) * 6) / 12), row, 7) === 0) ch = 'K'
      if (y === 120) ch = 'K'
      if (y >= H - 3) ch = 'm'
      buildingSet(grid, x, y, ch)
    }
  }

  outlineSilhouette(grid)
  return grid.map((row) => row.join(''))
}

/** 160x136 native gambrel barn (see `composeBarn`). */
const BARN: PixelFrame = composeBarn()

/* ------------------------------------------------------------------ */
/* Cottage                                                          */
/* ------------------------------------------------------------------ */

const COTTAGE_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  r: '#c8563e', // terracotta roof
  R: '#e8825e', // roof light
  d: '#96402e', // roof dark
  D: '#7a3226', // roof deep
  w: '#ecd9b0', // cream wall
  W: '#f7e8c8', // wall light
  v: '#d4bd92', // wall shade
  t: '#8a5a34', // timber frame
  T: '#b07a4a', // timber light
  u: '#6a4226', // timber shade
  c: '#8a7a6e', // chimney stone
  C: '#a89a8c', // chimney light
  k: '#6a5e54', // chimney shade
  y: '#ffd98c', // window glow
  Y: '#ffe9b3', // window bright
  n: '#3a2a28', // dark opening
  s: '#e8eef4', // smoke
  S: '#c8d4e0', // smoke shade
  b: '#9a6b43', // door wood
  B: '#c89a6e', // door light
  g: '#5a8f5a', // planter green
  f: '#d85846', // flower red
}

/**
 * 128x120 cottage, composed at native resolution so it never draws
 * upscaled: a terracotta gable roof with tile courses, a ridge cap and
 * an eave shadow, a stone chimney on the left slope puffing smoke that
 * drifts up-right, a round gable window, timber-framed cream board
 * walls with corner posts and diagonal braces, mullioned windows with
 * board shutters that glow, a flower planter under the right window, a
 * board-and-batten door under a lintel with hinges and a stone step,
 * and a staggered stone foundation course.
 */
function composeCottage(): PixelFrame {
  const H = 120
  const grid = emptyBuildingGrid(128, H)
  const mid = 64

  // ---- Roof: terracotta tile courses sweeping down from the ridge.
  const roofTop = 4
  const eaveY = 54
  const ridgeHalf = 20
  const eaveHalf = 60
  for (let y = roofTop; y <= eaveY; y++) {
    const half = ridgeHalf + ((eaveHalf - ridgeHalf) * (y - roofTop)) / (eaveY - roofTop)
    const left = Math.round(mid - half)
    const right = Math.round(mid + half) - 1
    const course = Math.floor((y - roofTop) / 4)
    const inCourse = (y - roofTop) % 4
    for (let x = left; x <= right; x++) {
      let ch = inCourse === 0 ? 'R' : inCourse === 3 ? 'd' : 'r'
      // Bleached tiles face the sun on the left slope; deep shade piles
      // up on the right.
      if (cellNoise(x, y, 43) === 0) ch = x < mid ? 'R' : 'D'
      buildingSet(grid, x, y, ch)
    }
    if (inCourse === 0) {
      for (let x = left + 4 + (course % 3); x <= right; x += 10) buildingSet(grid, x, y, 'D')
    }
  }
  // Eave shadow under the overhang, then the ridge cap astride the apex.
  for (let y = eaveY + 1; y <= eaveY + 3; y++) {
    buildingRun(grid, Math.round(mid - eaveHalf), Math.round(mid + eaveHalf) - 1, y, y === eaveY + 3 ? 'd' : 'D')
  }
  buildingRun(grid, mid - ridgeHalf - 2, mid + ridgeHalf + 1, roofTop, 'R')
  buildingRun(grid, mid - ridgeHalf - 2, mid + ridgeHalf + 1, roofTop + 1, 'r')

  // ---- Chimney: stone courses riding the left slope, smoke drifting up-right.
  const chimL = 26
  const chimR = 38
  buildingRun(grid, chimL - 1, chimR + 1, 0, 'C')
  for (let y = 1; y <= 28; y++) {
    for (let x = chimL; x <= chimR; x++) {
      let ch = y % 5 === 2 ? 'C' : 'c'
      if (x === chimL || x === chimR) ch = 'k'
      else if (cellNoise(x, y, 11) === 0) ch = 'k'
      buildingSet(grid, x, y, ch)
    }
  }
  // Smoke: a wedge of puffs leaning up-right off the flue. The outline
  // pass rims the exposed edges, so only the sheltered interior keeps
  // its color, with an occasional deeper 'S' woven through.
  const smokeRows: ReadonlyArray<readonly [number, number, number]> = [
    [3, 39, 51],
    [2, 41, 53],
    [1, 43, 55],
    [0, 45, 55],
  ]
  for (const [sy, sx0, sx1] of smokeRows) {
    buildingRun(grid, sx0, sx1, sy, 's')
    for (let x = sx0 + 1; x < sx1; x++) {
      if (cellNoise(x, sy, 6) === 0) buildingSet(grid, x, sy, 'S')
    }
  }

  // ---- Wall: a timber top plate, then cream board courses with knots.
  const wallTop = eaveY + 4
  const wallBottom = 104
  const wallL = 6
  const wallR = 122
  for (let y = wallTop; y < wallTop + 3; y++) buildingRun(grid, wallL, wallR, y, y === wallTop ? 'T' : 't')
  for (let y = wallTop + 3; y < wallBottom; y++) {
    const inCourse = (y - wallTop - 3) % 4
    for (let x = wallL; x <= wallR; x++) {
      let ch = inCourse === 0 ? 'W' : inCourse === 3 ? 'v' : 'w'
      if (cellNoise(x, y, 53) === 0) ch = 'v'
      buildingSet(grid, x, y, ch)
    }
  }

  // ---- Corner posts lit on the sun edge, plus diagonal braces.
  for (let y = wallTop; y < wallBottom; y++) {
    for (let x = wallL; x < wallL + 4; x++) buildingSet(grid, x, y, x === wallL ? 'T' : x === wallL + 3 ? 'u' : 't')
    for (let x = wallR - 3; x <= wallR; x++) buildingSet(grid, x, y, x === wallR - 3 ? 'T' : x === wallR ? 'u' : 't')
  }
  for (let i = 0; i < 24; i++) {
    buildingSet(grid, wallL + 5 + i, wallTop + 4 + i, 'u')
    buildingSet(grid, wallR - 5 - i, wallTop + 4 + i, 'u')
  }

  // ---- Windows: timber frames, cross mullions, glowing glass, sills,
  // and board shutters with a slat seam every 3 rows.
  const drawCottageWindow = (wx: number, wy: number, ww: number, wh: number): void => {
    for (let y = wy; y < wy + wh; y++) {
      const slat = (y - wy) % 3 === 2 ? 'u' : 't'
      for (let i = 0; i < 4; i++) {
        buildingSet(grid, wx - 4 + i, y, slat)
        buildingSet(grid, wx + ww + i, y, slat)
      }
    }
    for (let y = wy; y < wy + wh; y++) {
      for (let x = wx; x < wx + ww; x++) {
        const edge = x === wx || x === wx + ww - 1 || y === wy || y === wy + wh - 1
        if (edge) {
          buildingSet(grid, x, y, x < wx + 2 && y < wy + 2 ? 'T' : 't')
        } else {
          const bright = x - wx < (ww - 2) / 2 && y - wy < (wh - 2) / 2
          buildingSet(grid, x, y, bright ? 'Y' : 'y')
        }
      }
    }
    buildingRun(grid, wx + 1, wx + ww - 2, wy + Math.floor(wh / 2), 't')
    for (let y = wy + 1; y < wy + wh - 1; y++) buildingSet(grid, wx + Math.floor(ww / 2), y, 't')
    buildingRun(grid, wx - 1, wx + ww, wy + wh, 'T')
  }
  drawCottageWindow(24, 66, 18, 18)
  drawCottageWindow(90, 66, 18, 18)

  // ---- Flower planter under the right window, blooms over the sill.
  const planterL = 93
  const planterR = 104
  buildingRun(grid, planterL, planterR, 86, 't')
  for (let y = 87; y <= 90; y++) buildingRun(grid, planterL, planterR, y, y === 90 ? 'u' : 'b')
  for (let y = 83; y <= 85; y++) {
    for (let x = planterL + 1; x < planterR; x++) {
      if (y === 85 && (x - planterL) % 4 === 1) {
        buildingSet(grid, x, y, 'g')
      } else if (cellNoise(x, y, 5) !== 0) {
        buildingSet(grid, x, y, cellNoise(x, y, 2) === 0 ? 'g' : 'f')
      }
    }
  }

  // ---- Round gable window riding the roof plane.
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= 5.5) {
        const ch = dist > 4.5 ? 't' : dx < 0 && dy < 0 ? 'Y' : 'y'
        buildingSet(grid, mid + dx, 34 + dy, ch)
      }
    }
  }

  // ---- Door: board-and-batten leaves under a lintel, hinges, a knob.
  const doorL = 56
  const doorR = 76
  const doorTop = 66
  const doorBottom = 103
  buildingRun(grid, doorL - 2, doorR + 2, doorTop - 2, 'T')
  buildingRun(grid, doorL - 2, doorR + 2, doorTop - 1, 't')
  for (let y = doorTop; y <= doorBottom; y++) {
    for (let x = doorL; x <= doorR; x++) {
      const inBoard = (x - doorL) % 5
      buildingSet(grid, x, y, inBoard === 0 ? 'B' : inBoard === 4 ? 'u' : 'b')
    }
    if (y === 72 || y === 80 || y === 88) {
      buildingSet(grid, doorL, y, 'u')
      buildingSet(grid, doorR, y, 'u')
    }
  }
  buildingSet(grid, 72, 92, 'u')

  // ---- Foundation: a staggered stone bond across the full width.
  const foundTop = 104
  for (let y = foundTop; y < H; y++) {
    const row = y - foundTop
    for (let x = wallL; x <= wallR; x++) {
      const inStone = (x + (row % 2) * 5) % 10
      let ch: string
      if (inStone === 0 || inStone === 9) ch = 'k'
      else if (inStone === 1) ch = 'C'
      else ch = 'c'
      if (y === foundTop) ch = 'C'
      if (y >= H - 3) ch = 'k'
      buildingSet(grid, x, y, ch)
    }
  }
  // Stone step protruding from the bond under the door.
  for (let y = foundTop; y <= foundTop + 1; y++) {
    for (let x = doorL - 2; x <= doorR + 2; x++) {
      buildingSet(grid, x, y, y === foundTop ? 'C' : cellNoise(x, y, 4) === 0 ? 'C' : 'k')
    }
  }

  outlineSilhouette(grid)
  return grid.map((row) => row.join(''))
}

/** 128x120 native cottage (see `composeCottage`). */
const COTTAGE: PixelFrame = composeCottage()

/* ------------------------------------------------------------------ */
/* Campfire                                                          */
/* ------------------------------------------------------------------ */

const CAMPFIRE_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  b: '#9a6b43', // log wood
  B: '#c89a6e', // log light
  u: '#6a4a2c', // log shade and end rings
  k: '#8a8078', // ring stone
  K: '#b0a89e', // stone light
  m: '#6a625c', // stone shade
  r: '#d96038', // flame deep
  R: '#e8792b', // flame orange
  y: '#f6b53c', // flame yellow
  Y: '#ffe9a3', // flame core
  e: '#7a2f22', // ember dark
}

const CAMPFIRE_W = 32
const CAMPFIRE_H = 32

/** Blank transparent campfire grid. */
function emptyCampfireGrid(): string[][] {
  return Array.from({ length: CAMPFIRE_H }, () => Array.from({ length: CAMPFIRE_W }, () => '.'))
}

function campfireSet(grid: string[][], x: number, y: number, ch: string): void {
  if (y >= 0 && y < CAMPFIRE_H && x >= 0 && x < CAMPFIRE_W) grid[y][x] = ch
}

/** One worn ring stone: a little rounded block, lit from the upper left. */
function campfireStone(grid: string[][], cx: number, cy: number): void {
  const rows: readonly string[] = ['KKKk', 'Kkkk', 'kkkm', '.mmm']
  rows.forEach((row, dy) => {
    row.split('').forEach((ch, dx) => {
      if (ch !== '.') campfireSet(grid, cx + dx - 1, cy + dy - 1, ch)
    })
  })
}

/** The shared base of every frame: a ring of stones, two crossed logs, embers. */
function drawCampfireBase(grid: string[][]): void {
  const ringStones: ReadonlyArray<readonly [number, number]> = [
    [10, 21],
    [16, 20],
    [22, 21],
    [7, 25],
    [25, 25],
    [9, 28],
    [16, 30],
    [22, 28]
  ]
  for (const [cx, cy] of ringStones) campfireStone(grid, cx, cy)

  // Two crossed logs resting on the ring: one climbing to the right, one
  // descending, each with a shaded seam every few pixels.
  for (let i = 0; i < 10; i++) {
    const yA = 25 - Math.floor((i * 4) / 9)
    const shadeA = i % 4 === 3
    campfireSet(grid, 10 + i, yA, shadeA ? 'u' : i % 3 === 0 ? 'B' : 'b')
    campfireSet(grid, 10 + i, yA + 1, shadeA ? 'u' : 'b')

    const yB = 21 + Math.floor((i * 4) / 9)
    const shadeB = i % 4 === 1
    campfireSet(grid, 10 + i, yB, shadeB ? 'u' : i % 3 === 0 ? 'B' : 'b')
    campfireSet(grid, 10 + i, yB + 1, shadeB ? 'u' : 'b')
  }
  // The log ends facing the light carry a cut ring.
  campfireSet(grid, 9, 25, 'u')
  campfireSet(grid, 9, 24, 'B')
  campfireSet(grid, 20, 21, 'u')
  campfireSet(grid, 20, 22, 'B')

  // Embers glowing in the pit between the logs.
  campfireSet(grid, 14, 23, 'e')
  campfireSet(grid, 15, 24, 'r')
  campfireSet(grid, 17, 23, 'e')
  campfireSet(grid, 16, 22, 'y')
  campfireSet(grid, 13, 24, 'e')
}

/**
 * One flame tongue: a column that tapers toward the tip and leans by
 * `lean` pixels up its length — pale core, yellow inner, orange body,
 * deep rim.
 */
function campfireTongue(grid: string[][], baseX: number, baseY: number, height: number, lean: number): void {
  for (let h = 0; h < height; h++) {
    const t = h / Math.max(1, height - 1)
    const half = Math.max(0, Math.round(t * 3))
    const x = baseX + Math.round(lean * (1 - t))
    const y = baseY - h
    for (let dx = -half; dx <= half; dx++) {
      const spread = Math.abs(dx)
      const ch = spread === 0 && h < height - 2 ? 'Y' : spread <= 1 ? 'y' : spread <= 2 ? 'R' : 'r'
      campfireSet(grid, x + dx, y, ch)
    }
  }
}

/** Sparks drifting above the flame, a different pair each frame. */
function campfireSparks(grid: string[][], frame: number): void {
  const sparks: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    [
      [15, 6],
      [18, 10]
    ],
    [
      [17, 8],
      [14, 12]
    ],
    [
      [16, 5],
      [19, 9]
    ],
    [
      [15, 12],
      [18, 13]
    ]
  ]
  for (const [x, y] of sparks[frame] ?? []) campfireSet(grid, x, y, frame % 2 === 0 ? 'Y' : 'y')
}

/** One-pixel outline around every silhouette edge, like the rest of the bank. */
function outlineSilhouette(grid: string[][]): void {
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const solid = (x: number, y: number): boolean => y >= 0 && y < h && x >= 0 && x < w && grid[y][x] !== '.'
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] === '.') continue
      if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) grid[y][x] = 'o'
    }
  }
}

/** The full campfire for one flicker frame: stones, logs, embers, flames. */
function composeCampfire(frame: number): PixelFrame {
  const grid = emptyCampfireGrid()
  drawCampfireBase(grid)

  // Three tongues rise and lean differently each frame, so the fire
  // breathes instead of blinking.
  const heights: ReadonlyArray<readonly [number, number, number]> = [
    [16, 9, 11],
    [12, 12, 8],
    [15, 10, 12],
    [9, 7, 7]
  ]
  const leans: ReadonlyArray<readonly [number, number, number]> = [
    [0, -1, 1],
    [-2, 0, 0],
    [1, -1, -1],
    [0, -1, 1]
  ]
  const [centerH, leftH, rightH] = heights[frame] ?? [12, 9, 9]
  const [centerL, leftL, rightL] = leans[frame] ?? [0, 0, 0]
  campfireTongue(grid, 16, 24, centerH, centerL)
  campfireTongue(grid, 13, 23, leftH, leftL)
  campfireTongue(grid, 19, 23, rightH, rightL)
  campfireSparks(grid, frame)
  outlineSilhouette(grid)
  return grid.map((row) => row.join(''))
}

/** 32x32 campfire: stone ring, crossed logs, embers, and four flicker frames. */
const CAMPFIRE_FRAMES: readonly PixelFrame[] = [0, 1, 2, 3].map(composeCampfire)

/* ------------------------------------------------------------------ */
/* Scarecrow                                                        */
/* ------------------------------------------------------------------ */

const SCARECROW_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  s: '#e8c46a', // straw
  S: '#f5dc8a', // straw light
  d: '#b08a3e', // straw shade
  D: '#8a6428', // straw deep
  b: '#d9b45e', // burlap head
  B: '#f0d08a', // burlap light
  u: '#6a8fb5', // shirt blue
  U: '#8fb0d0', // shirt light
  v: '#4a6a8c', // shirt shade
  r: '#c46a4a', // red patch
  R: '#e08a6a', // red patch light
  m: '#d9a94e', // mustard patch
  M: '#f0c96a', // mustard light
  w: '#8a5a34', // wood pole
  W: '#b07a4a', // wood light
  q: '#5f3d24', // wood shade
  n: '#3a2a28', // buttons and stitches
}

/** 32x48 scarecrow: wide straw hat, button eyes, patched shirt, crossbar arms, straw cuffs and hem. */
const SCARECROW: PixelFrame = [
  '..........oSSSSSSSSSSSo.........',
  '..........ossrRrrssssso.........',
  '.......oooossrrrrsssssoooo......',
  '......oSSSSrrrrrrrrrrrSSSSo.....',
  '......odddsdddddddddddsdddo.....',
  '.....odddsssssssssssssssdddo....',
  '......odddsssssssssssssdddo.....',
  '.......ooodddddddddddddooo......',
  '.........oBbbbbbbbbbbbdo........',
  '.........oBbbbbbbbbbbbdo........',
  '.........oBbDnbbbbbDnbdo........',
  '.........oBbnnbbbbbnnbdo........',
  '.........oBbbbbbbbbbbbdo........',
  '.........oBbbbnbbbnbbbdo........',
  '.........oBbbnbnbnbnbbdo........',
  '.........oBbbbbbnbbbbbdo........',
  '.........oBddddddddddddo........',
  '...oooooooBddddddddddddooooooo..',
  '..oWWWWWWWWWWWWWWWWWWWWWWWWWWWo.',
  '..oUUUUUUwwwwwwwwwwwwwwwUUUUUUo.',
  '..ouuuuuuwwwwwwwwwwwwwwwuuuuuuo.',
  '..ouuuuuuUUUUUUUUUUUUUUUuuuuuuo.',
  '..ouuuuuuUUUUUUUUUUUUUUUuuuuuuo.',
  '..ouuuuuuuuvuuuvuuuvuuuvuuuuuuo.',
  '..ovvvvvvuuvuuuvuuuvuuuvvvvvvvo.',
  '.osososovvRRRRRvvvvvvvvvvosososo',
  '.oSoSoSouurrrrrvuuuvuuuvuoSoSoSo',
  '..odododuurrrrrvuuuvuuuvudododo.',
  '...o.o.ouurrrrrvuuuvuuuvuo.o.o..',
  '.......ovvrrrrrvvvMMMMMvvo......',
  '.......oDDDDDDDMDMDDDDDDDo......',
  '.......odddddddMMMdddddddo......',
  '.......ouuuvuuuvuummmmmvuo......',
  '.......ovvvvvvvvvvmmmmmvvo......',
  '.......ovvvvvvvvvvvvvvvvvo......',
  '.......osdsdsdSdsSsdsdsdso......',
  '.......oSsSSSsSsSSSsSdSsSo......',
  '........ododododssSdddododo.....',
  '.........o.o.oSWwqosoo.o.o......',
  '..............oWwqoo............',
  '..............oWwqo.............',
  '..............oWwqo.............',
  '..............oWwqo.............',
  '..............oWwqo.............',
  '..............oWwqo.............',
  '..............oWwqo.............',
  '..............oWwqo.............',
  '...............ooo..............',
]

/* ------------------------------------------------------------------ */
/* Hay bale                                                         */
/* ------------------------------------------------------------------ */

const HAY_BALE_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  h: '#d9a94e', // straw
  H: '#f0c96a', // straw light
  d: '#b8862f', // straw shade
  D: '#8f6420', // straw deep
  t: '#7a5a2a', // twine
  T: '#a07a3a', // twine light
}

/** 32x24 hay bale: rounded top, twine bands, spiral end grain. */
const HAY_BALE: PixelFrame = [
  '................................',
  '................................',
  '................................',
  '.........oooooooooooooooooooo...',
  '.......ooHdHHHHHHHTtHHHHHTtHHoo.',
  '......odddddddHHHHTtHHHHHTtHHHHo',
  '.....odddhhhdddHHHTtHHHHHTtHHHHo',
  '....oddHHHHHHhddddTtdddddTtdddHo',
  '...oddhHhhddhHhddhTthhdhhTtDhhdh',
  '...oddHhddhhddHddhTthhddhTthdhdh',
  '...oddHhdhhhhdHhdhTthdhhhTthhDdh',
  '...odHHhdhhhhhdhdhTtHhhHhTthhhdh',
  '..oddHhhdhDdhhdhddDthhhhdDtdhhdh',
  '...oddhhdhddhhdhdhTtHhDhdTthhhdh',
  '...oddhhhddhhhdhddTthDhhhTthDhdh',
  '...odddhhhhhhddddHTtHhhHhTthhHdh',
  '...odddhhhhhddhddhTthhhhdTtdDhdh',
  '....oddddddddhddddTtdHdHdTtHdddo',
  '.....odddddhddddddTtdddddTtddddd',
  '......odddddddddddTtdHdddTtddddo',
  '.......oddddDDDDDDDDDDDDDDDDDdoo',
  '........oDDDDDDDDDDDDDDDDDDDDDDD',
  '.........oooDDDDDDDDDDDDDDDDDooo',
  '............ooooooooooooooooo...',
]

/* ------------------------------------------------------------------ */
/* Chicken                                                          */
/* ------------------------------------------------------------------ */

const CHICKEN_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  w: '#f4efe2', // cream feathers
  W: '#ffffff', // white highlight
  v: '#d8cfbc', // feather shade
  V: '#b8ae98', // feather deep
  r: '#d8483a', // comb red
  R: '#f06a58', // comb light
  y: '#e89a3c', // beak and legs
  Y: '#f5c06a', // beak light
  n: '#3a2a28', // eye
}

/** 24x24 hen: two-frame peck, comb, wattle, beak, wing and legs. */
/** Standing alert, tail high. */
const CHICKEN_STAND: PixelFrame = [
  '........................',
  '................ooo.....',
  '...............oRrRo....',
  '..............orrorro...',
  '...............oovooro..',
  '..............ovvwvvo...',
  '...o.........ovwwwwwvo..',
  '..owo......o.ovwwwnwvoo.',
  '.owvwo..ooovovwwwwwwwyYo',
  '..owvwoovvvvvvvwwwwwvyyo',
  '.owvwvvvvwwwwwvwwwwwvoo.',
  '..owvvvwwwVwwwwvvwrro...',
  '.owvwvvwVWvvVwwwwvro....',
  '..oovvwVWvvvvVwwwvo.....',
  '...ovvVvvvvvvvVwwvvo....',
  '....ovwVvvvvvVwwwvo.....',
  '....ovvwVvvvVwwwvvo.....',
  '....ovvwwwVwwwwwvvo.....',
  '.....ovvvvvvvvvvvo......',
  '......ovvvvvvvvvo.......',
  '.......ooyovoyoo........',
  '........oyoooyo.........',
  '.......oyYyoyYyo........',
  '........ooo.ooo.........',
]

/** Head down, beak at the soil. */
const CHICKEN_PECK: PixelFrame = [
  '........................',
  '........................',
  '........................',
  '........................',
  '...o....................',
  '..owo...................',
  '.owvwo..................',
  '..owvwo....o............',
  '.owvwvwoooovooo.........',
  '..owvwoovvvvvvvoo.......',
  '.owvwvvvvwwwwwvvvoo.....',
  '..oovvvwwwVwwwwwwwwo....',
  '....ovvwVWvvVwwwwrRroo..',
  '....ovwVWvvvvVwwwwwvrRo.',
  '...ovvVvvvvvvvwwwvwwwvo.',
  '....ovwVvvvvvVwwvwwwnwvo',
  '....ovvwVvvvVwwvwwwwwwwv',
  '....ovvwwwVwwwwwvwwwwwyY',
  '.....ovvvvvvvvvvvvwwwvyy',
  '......ovvvvvvvvvooovrroo',
  '.......ooyovoyoo...ooo..',
  '........oyoooyo.........',
  '.......oyYyoyYyo........',
  '........ooo.ooo.........',
]

/* ------------------------------------------------------------------ */
/* Water trough                                                     */
/* ------------------------------------------------------------------ */

const WATER_TROUGH_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  w: '#9a6b43', // trough wood
  W: '#c89a6e', // wood light
  d: '#6f4a2c', // wood shade
  D: '#55351f', // wood deep
  m: '#6a625c', // metal band
  M: '#8a8078', // metal light
  a: '#3a6fd4', // water
  A: '#5a8fe8', // water light
  c: '#aee8f2', // water glint
  C: '#e6faff', // water bright
}

/** 40x24 water trough: oval wood rim, water surface with glints, plank front, metal bands, legs. */
const WATER_TROUGH: PixelFrame = [
  '........................................',
  '........................................',
  '....................o...................',
  '..........ooooooooooWoooooooooo.........',
  '......ooooWWWWWWWWWWWWWWWWWWWWWoooo.....',
  '....ooWAAAAAAAAAAAAAAAAAAAAAAAAAAAWoo...',
  '...oWWWWcccccccccccccccccccccccccWWWWo..',
  '..oWWWWaaAAACcAAACcACCACcAAACcAAaaWWWWo.',
  '.oWWWWaaaaaaaaaaaaaaacCaaaaaaaaaaaaWWWWo',
  '..oWWWWaaAAAAAAAAAAAAAcAAAAAAAAAaaWWWWo.',
  '...oWWWWwwaaaaaaaaaaaaaaaaaaaaawwWWWWo..',
  '..oWWWWWWWWwwwwwwwwwawwwwwwwwwWWWWWWWo..',
  '..owdWwwdMWWWWWWWWWWWWWWWWWWWWWwdWwwwo..',
  '..owDDDDDMDDDDDDDDDDDDDDDDDDDMDDDDDDwo..',
  '..owdWwwdMmwdWwwdWwwdWwwdWwwdMmwdWwwwo..',
  '..owdWwwdMmwdWwwdWwwdWwwdWwwdMmwdWwwwo..',
  '..owdWwwdMmwdWwwdWwwdWwwdWwwdMmwdWwwwo..',
  '..owdWwwdMmwdWwwdWwwdWwwdWwwdMmwdWwwwo..',
  '..owdWwwdMmwdWwwdWwwdWwwdWwwdMmwdWwwwo..',
  '..oDDDDDDMmDDDDDDDDDDDDDDDDDDMmDDDDDDo..',
  '...oowdddDoooooooooooooooooooowdddDoo...',
  '....owdddDo..................owdddDo....',
  '....owdddDo..................owdddDo....',
  '...oDDDDDDDo................oDDDDDDDo...',
]

/* ------------------------------------------------------------------ */
/* Farm gate                                                        */
/* ------------------------------------------------------------------ */

const FARM_GATE_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  p: '#9a6b43', // post wood
  P: '#c89a6e', // post light
  q: '#6f4a2c', // post shade
  r: '#b07a4a', // rail wood
  R: '#d9a86e', // rail light
  Q: '#7a5230', // rail shade
  n: '#e8d3a8', // nail
  m: '#6a625c', // hinge metal
  M: '#8a8078', // metal light
}

/** 48x32 farm gate: two capped posts, four rails, diagonal brace, hinges and latch. */
const FARM_GATE: PixelFrame = [
  '....................................oRro........',
  '...................................oRrQo........',
  '...oooooo.........................oRrQooooooo...',
  '..oPPPPPPo.......................oRrQooPPPPPPo..',
  '.oPPPPPPPPo.....................oRrQooPPPPPPPPo.',
  '.oppppppppo....................oRrQo.oppppppppo.',
  '.oPppppppqo...................oRrQo..oPppppppqo.',
  '.oPpqppppqooooooooooooooooooooRrQoooooPpqppppqo.',
  '.oPppPpppqRRRRRRRRRRRRRRRRRRRRrQRRRRRRPppPpppqo.',
  '.oPpppppmmmmrrrrQrrrrrrQrrrrRrQrrrrrrQPppppppqo.',
  '.oPpppppmMmmrrrrrRrrrrrrRrrRrQrRrrrrrrPppppppqo.',
  '.oPpppppmmmmQQQQQQQQQQQQQQRrQQQQQQQQQQPppppppqo.',
  '.oPpqpppmmmmoooooooooooooRrQooooooooooPpqppppqo.',
  '.oPppPpppqooooooooooooooRrQoooooooooooPppPpppqo.',
  '.oPppppppqRRRRRRRRRRRRRRrQRRRRRRRRRRRRPppppppqo.',
  '.oPppppppqrrrrrrQrrrrrRrQrrrrrQrrrrrrQPppppppqo.',
  '.oPppppppqRrrrrrrRrrrRrQRrrrrrrRrrrrrrPppppppqo.',
  '.oPpqppppqQQQQQQQQQQRrQQQQQQQQQQQQQQmMmmqppppqo.',
  '.oPppPpppqoooooooooRrQoooooooooooooommmmpPpppqo.',
  '.oPppppppqooooooooRrQooooooooooooooommmmpppppqo.',
  '.oPppppppqRRRRRRRRrQRRRRRRRRRRRRRRRRRRPppppppqo.',
  '.oPpppppmmmmrrrrRrQrrrrQrrrrrrQrrrrrrQPppppppqo.',
  '.oPpqpppmMmmrrrRrQrrrrrrRrrrrrrRrrrrrrPpqppppqo.',
  '.oPppPppmmmmQQRrQQQQQQQQQQQQQQQQQQQQQQPppPpppqo.',
  '.oPpppppmmmmoRrQooooooooooooooooooooooPppppppqo.',
  '.oPppppppqooRrQoooooooooooooooooooooooPppppppqo.',
  '.oPppppppqRRrQRRRRRRRRRRRRRRRRRRRRRRRRPppppppqo.',
  '.oPpqppppqRrQrrrQrrrrrrQrrrrrrQrrrrrrQPpqppppqo.',
  '.oPppPpppqrQrrrrrRrrrrrrRrrrrrrRrrrrrrPppPpppqo.',
  '.oPppppppqQQQQQQQQQQQQQQQQQQQQQQQQQQQQPppppppqo.',
  '..oqqqqqqqoooooooooooooooooooooooooooooqqqqqqqo.',
  '...ooooooo.............................ooooooo..',
]

/* ------------------------------------------------------------------ */
/* Fence                                                            */
/* ------------------------------------------------------------------ */

const FENCE_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  p: '#9a6b43', // post wood
  P: '#c89a6e', // post light
  q: '#6f4a2c', // post shade
  r: '#b07a4a', // rail wood
  R: '#d9a86e', // rail light
  Q: '#7a5230', // rail shade
  n: '#e8d3a8', // nail
  m: '#6a625c', // metal
  M: '#8a8078', // metal light
}

/** 32x24 fence: two 3/4-view posts with caps, three rails, nails and base shadows. */
const FENCE: PixelFrame = [
  '................................',
  '................................',
  '...oooo..................oooo...',
  '..oPPPPo................oPPPPo..',
  '.oPPPPPPo..............oPPPPPPo.',
  '.oppppppo..............oppppppo.',
  'ooPppppqooooooooooooooooPppppqoo',
  'RRPpqppqRRRRRRRRRRRRRRRRPpqppqRR',
  'RrPpnPpqrrrrrQRrrrrrQRrrPpnPpqrr',
  'QQPppppqQQQQQQQQQQQQQQQQPppppqQQ',
  'ooPppppqooooooooooooooooPppppqoo',
  'ooPppppqooooooooooooooooPppppqoo',
  'RRPpqppqRRRRRRRRRRRRRRRRPpqppqRR',
  'RrPpnPpqrrrrrQRrrrrrQRrrPpnPpqrr',
  'QQPppppqQQQQQQQQQQQQQQQQPppppqQQ',
  'ooPppppqooooooooooooooooPppppqoo',
  'ooPppppqooooooooooooooooPppppqoo',
  'RRPpqppqRRRRRRRRRRRRRRRRPpqppqRR',
  'RrPpnPpqrrrrrQRrrrrrQRrrPpnPpqrr',
  'QQPppppqQQQQQQQQQQQQQQQQPppppqQQ',
  'ooPppppqooooooooooooooooPppppqoo',
  '.oPppppqo..............oPppppqo.',
  '..oqqqqqo...............oqqqqqo.',
  '...ooooo.................ooooo..',
]

/** Rotate a literal pixel frame 90 degrees, preserving its palette mapping. */
function transposeFrame(frame: PixelFrame): PixelFrame {
  const width = frame[0]?.length ?? 0
  const rows: string[] = []
  for (let x = 0; x < width; x += 1) {
    rows.push(frame.map((row) => row.charAt(x)).join(''))
  }
  return rows
}

/** 24x32 vertical fence: the horizontal fence turned through 90 degrees. */
const FENCE_VERTICAL: PixelFrame = transposeFrame(FENCE)

/** 32x48 vertical gate: the horizontal gate turned through 90 degrees. */
const FARM_GATE_VERTICAL: PixelFrame = transposeFrame(FARM_GATE)

/* ------------------------------------------------------------------ */
/* Crops                                                            */
/* ------------------------------------------------------------------ */

const CROPS_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  d: '#8a5f3a', // earth
  f: '#6b4426', // furrow wall
  S: '#a3793f', // sunlit ridge
  h: '#b08a55', // warm clod
  k: '#55351f', // furrow shadow
  p: '#9a8f80', // pebble
  g: '#4fae7c', // sprout green
  G: '#35915f', // sprout shade
  l: '#a9e9bd', // leaf light
  y: '#e8c46a', // wheat gold
  Y: '#f5dc8a', // wheat light
  b: '#b8862f', // wheat shade
}

/** 32x32 crops: four growth stages from seedlings to ripe wheat over tilled soil. */
/** Stage 1: seedlings. */
const CROPS_STAGE_0: PixelFrame = [
  'SShhhhhhhhhhhSSSkkkdkkkkkkkSSSSh',
  'hhddddddddddhhhhSSSSSSSSSSShhhdd',
  'dhffffffffffddddhhhhhhhhhhddddff',
  'fkkkkkkkkkkkfffdddddddddddfffkkk',
  'kkkkkkkkkkkkkkkffffffdfffkkkkhkk',
  'SSSSSSSSSSSkkkkkkkkkkhSkkkkkkdSS',
  'hhhhhhhhhhSSSSkkkkkkkkkkkSSShhhh',
  'ddddldddldhhhhlSSSlSSSdSlhhhlddd',
  'ffdfflflffdddhhlhlhhhhhhdldlffff',
  'kkkkkkgkdffffdddgddddddfffgkkkkk',
  'kkkkkkGkkkkkffpfGffffffkkkGkkkkk',
  'SSSSSkkkdkkkhkkkkkkkkkkkkkkkSSSS',
  'hhhhhhhhSSSSkdkkkddkkdSSSShhhhhh',
  'ddddddddhhhSSSdSSSSSSShhddddhdhd',
  'fffffffddddhhhhhhhShhddddfffffff',
  'kkkpkkkffddddddddddddfffkkkkkkkk',
  'kkkkkkkkkkffffffffffkkkkkkkkkkkk',
  'SSSSlhSklkkkkklkkklkkhkklSSSlSSS',
  'hhhhhlSlSkkkkkklklkkSSdhhlhlhhhh',
  'dddddhghhSSSSSSSgSShhhhdddgddddd',
  'fdhffdGdhhhhhhhhGhhdddffffGfffff',
  'kkkkhkkkdddddddkkkffffkkkkkkkkkk',
  'kkkkkkkhSfffffffffkdkkkkkkkkkkkk',
  'SSSkkkkkkkkkhkdkkkkkkSSSSSSSSSSS',
  'dhhSSSdkkkkkkkkpkdSSShhhhhhhhhhS',
  'dddhhhSSSSSSSSSSShhhdddddddddddh',
  'ffddddhhhhhhhhhdddddffffffhfffdd',
  'kkffldddldddddldfflfkkkdlkkklkff',
  'kkkkklflffffffflklkdkkkkklklkkkk',
  'SkkkkkgkkkkkkkkkgkkSSSSSSSgSSkkk',
  'hSSSkkGkdkkkkkkSGShhdhhhhhGhhSSS',
  'hhhhSkkkSSSSSSdkkkdddddddkkkhhhh',
]

/** Stage 2: young sprouts. */
const CROPS_STAGE_1: PixelFrame = [
  'SShhhhhhhhhhhSSSkkkdkkkkkkkSSSSh',
  'hhddddddddddhhhhSSSSSSSSSSShhhdd',
  'dhffffffffffddddhhhhhhhhhhddddff',
  'fkkkkkkkkkkkfffdddddddddddfffkkk',
  'kkkkkkkkkkkkkkkffffffdfffkkkkhkk',
  'SSSSSlSlSSSkkkklklkkkhSkklklkdSS',
  'hhhhlhlhlhSSSSlklklkkkkklSlSlhhh',
  'dddddlGlddhhhhSlGlSSSSdShlGldddd',
  'ffdfffgfffdddhhhghhhhhhhddgfffff',
  'kkkkkkgkdffffdddgddddddfffgkkkkk',
  'kkkkkkGkkkkkffpfGffffffkkkGkkkkk',
  'SSSSSkkkdkkkhkkkkkkkkkkkkkkkSSSS',
  'hhhhhhhhSSSSkdkkkddkkdSSSShhhhhh',
  'ddddddddhhhSSSdSSSSSSShhddddhdhd',
  'fffffffddddhhhhhhhShhddddfffffff',
  'kkkpklklfddddddldldddfffklklkkkk',
  'kkkklklklkfffflflflfkkkklklklkkk',
  'SSSSSlGlkkkkkkklGlkkkhkkSlGldSSS',
  'hhhhhSgSSkkkkkkhgkkkSSdhhhghhhhh',
  'dddddhghhSSSSSSSgSShhhhdddgddddd',
  'fdhffdGdhhhhhhhhGhhdddffffGfffff',
  'kkkkhkkkdddddddkkkffffkkkkkkkkkk',
  'kkkkkkkhSfffffffffkdkkkkkkkkkkkk',
  'SSSkkkkkkkkkhkdkkkkkkSSSSSSSSSSS',
  'dhhSSSdkkkkkkkkpkdSSShhhhhhhhhhS',
  'dddhhlSlSSSSSSSlSlhhdddddldldddh',
  'ffddldlhlhhhhhldldldfffflflflfdd',
  'kkffflGldddddddlGlffkkkdklGlkkff',
  'kkkkkfgfffffffffgkkdkkkkkkgkkkkk',
  'SkkkkkgkkkkkkkkkgkkSSSSSSSgSSkkk',
  'hSSSkkGkdkkkkkkSGShhdhhhhhGhhSSS',
  'hhhhSkkkSSSSSSdkkkdddddddkkkhhhh',
]

/** Stage 3: mature plants. */
const CROPS_STAGE_2: PixelFrame = [
  'SShhhhhhhhhhhSSSkkkdkkkkkkkSSSSh',
  'hhddddddddddhhhhSSSSSSSSSSShhhdd',
  'dhffffffffffddddhhhhhhhhhhddddff',
  'fkkkklklkkkkfffldldddddddlflfkkk',
  'kkkklklklkkkkklflflffdfflklklhkk',
  'SSSlSlGlSlSkklklGlklkhSlklGlklSS',
  'hhhhlGGGlhSSSSlGGGlkkkkklGGGlhhh',
  'dddddlGlddhhhhSlGlSSSSdShlGldddd',
  'ffdfffgfffdddhhhghhhhhhhddgfffff',
  'kkkkkkgkdffffdddgddddddfffgkkkkk',
  'kkkkkkGkkkkkffpfGffffffkkkGkkkkk',
  'SSSSSkkkdkkkhkkkkkkkkkkkkkkkSSSS',
  'hhhhhhhhSSSSkdkkkddkkdSSSShhhhhh',
  'dddddldlhhhSSSdlSlSSSShhdldlhdhd',
  'fffflfldlddhhhlhlhlhhdddlflflfff',
  'kkklklGlfldddldlGldldfflklGlklkk',
  'kkkklGGGlkfffflGGGlfkkkklGGGlkkk',
  'SSSSSlGlkkkkkkklGlkkkhkkSlGldSSS',
  'hhhhhSgSSkkkkkkhgkkkSSdhhhghhhhh',
  'dddddhghhSSSSSSSgSShhhhdddgddddd',
  'fdhffdGdhhhhhhhhGhhdddffffGfffff',
  'kkkkhkkkdddddddkkkffffkkkkkkkkkk',
  'kkkkkkkhSfffffffffkdkkkkkkkkkkkk',
  'SSSkklklkkkkhkdlklkkkSSSSlSlSSSS',
  'dhhSlSlklkkkkklpldlSShhhlhlhlhhS',
  'dddlhlGlSlSSSlSlGlhldddldlGldldh',
  'ffddlGGGlhhhhhlGGGldfffflGGGlfdd',
  'kkffflGldddddddlGlffkkkdklGlkkff',
  'kkkkkfgfffffffffgkkdkkkkkkgkkkkk',
  'SkkkkkgkkkkkkkkkgkkSSSSSSSgSSkkk',
  'hSSSkkGkdkkkkkkSGShhdhhhhhGhhSSS',
  'hhhhSkkkSSSSSSdkkkdddddddkkkhhhh',
]

/** Stage 4: ripe wheat. */
const CROPS_STAGE_3: PixelFrame = [
  'SShhhhhhhhhhhSSSkkkdkkkkkkkSSSSh',
  'hhddYdYdYdddhhYhYSYSSSSSYSYhYhdd',
  'dhfYyYyYyYffdYyYyYyYhhhYyYyYyYff',
  'fkkkyYYYykkkffyYYYydddddyYYYykkk',
  'kkkkkyYykkkkkkkyYyfffdfffyYykhkk',
  'SSSSSSbSSSSkkkkkbkkkkhSkkkbkkdSS',
  'hhhhhhghhhSSSSkkgkkkkkkkkSgShhhh',
  'ddddddgdddhhhhSSgSSSSSdShhghdddd',
  'ffdfffgfffdddhhhghhhhhhhddgfffff',
  'kkkkkkgkdffffdddgddddddfffgkkkkk',
  'kkkkkkGkkkkkffpfGffffffkkkGkkkkk',
  'SSSSYkYkYkkkhkYkYkYkkkkkYkYkYSSS',
  'hhhYyYyYyYSSkYyYyYyYkdSYyYyYyYhh',
  'ddddyYYYyhhSSSyYYYySSShhyYYYydhd',
  'fffffyYydddhhhhyYyShhddddyYyffff',
  'kkkpkkbffdddddddbddddfffkkbkkkkk',
  'kkkkkkgkkkffffffgfffkkkkkkgkkkkk',
  'SSSSShgkkkkkkkkkgkkkkhkkSSgSdSSS',
  'hhhhhSgSSkkkkkkhgkkkSSdhhhghhhhh',
  'dddddhghhSSSSSSSgSShhhhdddgddddd',
  'fdhffdGdhhhhhhhhGhhdddffffGfffff',
  'kkkkYkYkYdddddYkYkYfffkkYkYkYkkk',
  'kkkYyYyYyYfffYyYyYyYkkkYyYyYyYkk',
  'SSSkyYYYykkkhkyYYYykkSSSyYYYySSS',
  'dhhSSyYykkkkkkkyYySSShhhhyYyhhhS',
  'dddhhhbSSSSSSSSSbhhhddddddbddddh',
  'ffddddghhhhhhhhdgdddffffffgfffdd',
  'kkfffdgdddddddddgfffkkkdkkgkkkff',
  'kkkkkfgfffffffffgkkdkkkkkkgkkkkk',
  'SkkkkkgkkkkkkkkkgkkSSSSSSSgSSkkk',
  'hSSSkkGkdkkkkkkSGShhdhhhhhGhhSSS',
  'hhhhSkkkSSSSSSdkkkdddddddkkkhhhh',
]

/* ------------------------------------------------------------------ */
/* Soil                                                             */
/* ------------------------------------------------------------------ */

const SOIL_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  d: '#8a5f3a', // earth
  f: '#6b4426', // furrow wall
  S: '#a3793f', // sunlit ridge
  h: '#b08a55', // warm clod
  k: '#55351f', // furrow shadow
  p: '#9a8f80', // pebble
}

/** 32x32 tilled soil: six-row furrow rhythm with sunlit ridges, deep shadows, clods and pebbles. */
const SOIL: PixelFrame = [
  'SShhhhhhhhhhhSSSkkkdkkkkkkkSSSSh',
  'hhdddddhhdddhhhhSSSSSShShSShhhdd',
  'hdffffffffffddddhhhhhhhhhhddddff',
  'fkkkkkkkkkkkfffdddddddddddfffkkh',
  'kkkkkkkkkkkkkkkffhhffdfffkkkkdkk',
  'SSSSSSSSSSSkkpkkkkkkkdkhkkkkkdSS',
  'hhhhhhhhhhSSSSkkkkkkkpkkkSShhhhh',
  'ddddddddddhhhhSSSSSSSSdShhhhdddd',
  'ffdfffffffdddhhhhhhhhhhhdddfpfff',
  'kkkkkkkkdfhffddddddddddhfffkkkkk',
  'kkkkkkkkkkkkfffffffffffkkkkkkkkk',
  'SShSSSSSdkkkdhkkkkkkkkkkkpShSSSS',
  'hhhhhhhhSSSSkdkkkddkkdSSSShhhhhh',
  'dddddddhhhhSSSdSSSSSShShdddddddd',
  'fffffffdhddhhhhhhhShhhdddfffffff',
  'kkkkkkkffddddddddddddfffkkkkkkkk',
  'kkkkkkkkkkffpfffffhSkkkkkkkkkkkk',
  'SShSShSkkkkkkkkkkkkkkdkkSSSSdSSS',
  'hhhhhSSSShkkkkkdkhkkSSdhhhhhhhhh',
  'dddddhhhhSSSSSSSSSShhhhddddddddd',
  'hddffdddhhhhhhhhhhhdddffffffffff',
  'kkkhdfffddddddddddffffkkkkkkkkkk',
  'hhkkkkkdffffffffffkdkkkkkkpkkkkk',
  'SSSkkkkkhkkkdkdkkkkkkSSSSSSSSSSS',
  'dhhSSSdkkkkkkkkkkdShShhhhhhhhhhS',
  'dddhhhhSSSSSShSSShhhdddddhdddddh',
  'ffddddhhhhhhhhhdhdddffffffdffhdd',
  'kkfffdddddddddddffffkkkdkkkkkkff',
  'kkkkkfffffffffffkkkdkkkkhkhkpkkk',
  'SkkkkkhkkkkkkhkkkhkSSSSSSSSSSkkh',
  'hShSkkkkdkkkkkkSSShhdhhhhhhhhSSS',
  'hhhhSddSSSSSSSdhhhddddddddhdhhhh',
]

/* ------------------------------------------------------------------ */
/* Bank                                                                */
/* ------------------------------------------------------------------ */

export const farmSprites: {
  barn: PixelSprite
  cottage: PixelSprite
  campfire: PixelSprite
  scarecrow: PixelSprite
  hayBale: PixelSprite
  chicken: PixelSprite
  waterTrough: PixelSprite
  farmGate: PixelSprite
  farmGateVertical: PixelSprite
  fence: PixelSprite
  fenceVertical: PixelSprite
  crops: PixelSprite
  soil: PixelSprite
} = {
  barn: { palette: BARN_PALETTE, frames: [BARN], frameMs: 1000 },
  cottage: { palette: COTTAGE_PALETTE, frames: [COTTAGE], frameMs: 1000 },
  campfire: { palette: CAMPFIRE_PALETTE, frames: CAMPFIRE_FRAMES, frameMs: 360 },
  scarecrow: { palette: SCARECROW_PALETTE, frames: [SCARECROW], frameMs: 1000 },
  hayBale: { palette: HAY_BALE_PALETTE, frames: [HAY_BALE], frameMs: 1000 },
  chicken: { palette: CHICKEN_PALETTE, frames: [CHICKEN_STAND, CHICKEN_PECK], frameMs: 520 },
  waterTrough: { palette: WATER_TROUGH_PALETTE, frames: [WATER_TROUGH], frameMs: 1000 },
  farmGate: { palette: FARM_GATE_PALETTE, frames: [FARM_GATE], frameMs: 1000 },
  farmGateVertical: { palette: FARM_GATE_PALETTE, frames: [FARM_GATE_VERTICAL], frameMs: 1000 },
  fence: { palette: FENCE_PALETTE, frames: [FENCE], frameMs: 1000 },
  fenceVertical: { palette: FENCE_PALETTE, frames: [FENCE_VERTICAL], frameMs: 1000 },
  crops: { palette: CROPS_PALETTE, frames: [CROPS_STAGE_0, CROPS_STAGE_1, CROPS_STAGE_2, CROPS_STAGE_3], frameMs: 2400 },
  soil: { palette: SOIL_PALETTE, frames: [SOIL], frameMs: 1000 },
}
