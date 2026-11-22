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
/* General store                                                     */
/* ------------------------------------------------------------------ */

const STORE_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  s: '#8a8a98', // slate roof
  S: '#a8a8b6', // slate light
  q: '#5e5e6c', // slate dark
  Q: '#44444f', // slate deep
  w: '#ecd9b0', // cream wall
  W: '#f7e8c8', // wall light
  v: '#d4bd92', // wall shade
  t: '#8a5a34', // timber frame
  T: '#b07a4a', // timber light
  u: '#6a4226', // timber shade
  r: '#c04a32', // awning red
  R: '#d96048', // awning red light
  e: '#963626', // awning red deep
  c: '#f2e2bd', // awning cream
  C: '#fff3d6', // awning cream light
  y: '#ffd98c', // window glow
  Y: '#ffe9b3', // window bright
  n: '#3a2a28', // dark opening and jar silhouettes
  b: '#9a6b43', // door wood
  B: '#c89a6e', // door light
  k: '#8a8078', // foundation stone
  K: '#b0a89e', // stone light
  m: '#6a625c', // stone shade
}

/**
 * 128x120 village general store, composed at native resolution: a slate
 * gable roof with tile courses and a ridge cap, cream plank walls with
 * corner posts, a striped red-and-cream awning with a scalloped hem and
 * a shade line, a big timber-framed display window full of warm glass
 * and dark jar/basket silhouettes with lit rims, a hanging shop sign on
 * a bracket, a plank door with a lit edge, hinges and a knob, and a
 * stone foundation with a step at the door.
 */
function composeStore(): PixelFrame {
  const H = 120
  const grid = emptyBuildingGrid(128, H)
  const mid = 64

  // ---- Roof: slate tile courses sweeping down from the ridge.
  const roofTop = 4
  const eaveY = 40
  const ridgeHalf = 22
  const eaveHalf = 62
  for (let y = roofTop; y <= eaveY; y++) {
    const half = ridgeHalf + ((eaveHalf - ridgeHalf) * (y - roofTop)) / (eaveY - roofTop)
    const left = Math.round(mid - half)
    const right = Math.round(mid + half) - 1
    const course = Math.floor((y - roofTop) / 4)
    const inCourse = (y - roofTop) % 4
    for (let x = left; x <= right; x++) {
      let ch = inCourse === 0 ? 'S' : inCourse === 3 ? 'q' : 's'
      if (cellNoise(x, y, 41) === 0) ch = x < mid ? 'S' : 'Q'
      buildingSet(grid, x, y, ch)
    }
    if (inCourse === 0) {
      for (let x = left + 4 + (course % 3); x <= right; x += 10) buildingSet(grid, x, y, 'Q')
    }
  }
  // Eave shadow under the overhang, then the ridge cap astride the apex.
  for (let y = eaveY + 1; y <= eaveY + 3; y++) {
    buildingRun(grid, Math.round(mid - eaveHalf), Math.round(mid + eaveHalf) - 1, y, y === eaveY + 3 ? 'q' : 'Q')
  }
  buildingRun(grid, mid - ridgeHalf - 2, mid + ridgeHalf + 1, roofTop, 'S')
  buildingRun(grid, mid - ridgeHalf - 2, mid + ridgeHalf + 1, roofTop + 1, 's')

  // ---- Wall: a timber top plate, then cream plank courses with knots.
  const wallTop = eaveY + 4
  const wallBottom = 104
  const wallL = 6
  const wallR = 121
  for (let y = wallTop; y < wallTop + 3; y++) buildingRun(grid, wallL, wallR, y, y === wallTop ? 'T' : 't')
  for (let y = wallTop + 3; y < wallBottom; y++) {
    const inCourse = (y - wallTop - 3) % 4
    for (let x = wallL; x <= wallR; x++) {
      let ch = inCourse === 0 ? 'W' : inCourse === 3 ? 'v' : 'w'
      if (cellNoise(x, y, 59) === 0) ch = 'v'
      buildingSet(grid, x, y, ch)
    }
  }

  // ---- Corner posts lit on the sun edge, plus diagonal braces.
  for (let y = wallTop; y < wallBottom; y++) {
    for (let x = wallL; x < wallL + 4; x++) buildingSet(grid, x, y, x === wallL ? 'T' : x === wallL + 3 ? 'u' : 't')
    for (let x = wallR - 3; x <= wallR; x++) buildingSet(grid, x, y, x === wallR - 3 ? 'T' : x === wallR ? 'u' : 't')
  }
  for (let i = 0; i < 20; i++) {
    buildingSet(grid, wallL + 5 + i, wallTop + 4 + i, 'u')
    buildingSet(grid, wallR - 5 - i, wallTop + 4 + i, 'u')
  }

  // ---- Awning: a timber fascia, four-pixel red/cream stripes, a
  // scalloped hem, and a shade line on the wall beneath it.
  const awnL = 8
  const awnR = 119
  buildingRun(grid, awnL, awnR, 50, 'T')
  buildingRun(grid, awnL, awnR, 51, 't')
  for (let y = 52; y <= 61; y++) {
    for (let x = awnL; x <= awnR; x++) {
      const band = Math.floor((x - awnL) / 4) % 2
      let ch = band === 0 ? 'r' : 'c'
      if (y === 52) ch = band === 0 ? 'R' : 'C'
      else if (y === 61) ch = band === 0 ? 'e' : 'v'
      if (x <= awnL + 1) ch = band === 0 ? 'R' : 'C'
      if (x >= awnR - 1) ch = band === 0 ? 'e' : 'v'
      buildingSet(grid, x, y, ch)
    }
  }
  // Scalloped hem: each eight-pixel bay drops a rounded tongue.
  for (let x = awnL; x <= awnR; x++) {
    const local = (x - awnL) % 8
    const band = Math.floor((x - awnL) / 4) % 2
    const ch = band === 0 ? 'r' : 'c'
    if (local >= 1 && local <= 6) buildingSet(grid, x, 62, ch)
    if (local >= 2 && local <= 5) buildingSet(grid, x, 63, ch)
    if (local >= 3 && local <= 4) buildingSet(grid, x, 64, ch)
  }
  buildingRun(grid, awnL, awnR, 65, 'u')
  buildingRun(grid, awnL, awnR, 66, 'v')

  // ---- Display window: a timber frame around warm glass, with dark
  // jars and a basket on the sill, each rimmed by a lit edge.
  const winL = 68
  const winR = 116
  const winTop = 70
  const winBottom = 94
  for (let y = winTop; y <= winBottom; y++) {
    for (let x = winL; x <= winR; x++) {
      const edge = x <= winL + 1 || x >= winR - 1 || y <= winTop + 1 || y >= winBottom - 1
      if (edge) {
        buildingSet(grid, x, y, x <= winL + 1 && y <= winTop + 1 ? 'T' : 't')
      } else {
        const bright = x - winL < (winR - winL) / 2 && y - winTop < (winBottom - winTop) / 2
        buildingSet(grid, x, y, bright ? 'Y' : 'y')
      }
    }
  }
  // Sill under the pane.
  buildingRun(grid, winL - 1, winR + 1, winBottom + 1, 'T')
  buildingRun(grid, winL - 1, winR + 1, winBottom + 2, 't')

  // Jars and a basket: dark silhouettes with lit rims, standing on the sill.
  const drawStoreJar = (jx: number, jy: number, jw: number, jh: number): void => {
    const neck = Math.max(2, Math.floor(jw / 3))
    const neckL = jx + Math.floor((jw - neck) / 2)
    for (let x = neckL; x < neckL + neck; x++) buildingSet(grid, x, jy, 'Y')
    for (let y = jy + 1; y < jy + 3; y++) {
      for (let x = neckL; x < neckL + neck; x++) buildingSet(grid, x, y, 'n')
    }
    for (let y = jy + 3; y < jy + jh; y++) {
      const inset = y === jy + 3 ? 1 : 0
      for (let x = jx + inset; x < jx + jw - inset; x++) {
        buildingSet(grid, x, y, y === jy + 3 ? 'Y' : 'n')
      }
    }
    buildingSet(grid, jx + 1, jy + 4, 'y')
  }
  const drawStoreBasket = (bx: number, by: number, bw: number, bh: number): void => {
    const half = Math.floor(bw / 2)
    for (let i = 0; i < half; i++) {
      const y = by - 1 - Math.floor(i / 2)
      buildingSet(grid, bx + half - 1 - i, y, 'n')
      buildingSet(grid, bx + half + i, y, 'n')
    }
    for (let y = by; y < by + bh; y++) {
      const inset = Math.floor((y - by) / 3)
      for (let x = bx + inset; x < bx + bw - inset; x++) {
        buildingSet(grid, x, y, y === by ? 'Y' : 'n')
      }
    }
    buildingSet(grid, bx + 1, by + 1, 'y')
  }
  drawStoreJar(74, 80, 8, 12)
  drawStoreBasket(88, 84, 12, 8)
  drawStoreJar(104, 78, 8, 14)

  // ---- Door: board-and-batten leaves under a lintel, a lit edge,
  // shade seams, a hinge pair, and a knob.
  const doorL = 38
  const doorR = 58
  const doorTop = 70
  const doorBottom = 103
  buildingRun(grid, doorL - 2, doorR + 2, doorTop - 2, 'T')
  buildingRun(grid, doorL - 2, doorR + 2, doorTop - 1, 't')
  for (let y = doorTop; y <= doorBottom; y++) {
    for (let x = doorL; x <= doorR; x++) {
      const inBoard = (x - doorL) % 5
      let ch = inBoard === 0 ? 'T' : inBoard === 4 ? 'u' : 'b'
      if (x === doorL) ch = 'B'
      buildingSet(grid, x, y, ch)
    }
    if (y === 78 || y === 86 || y === 94) {
      buildingSet(grid, doorL, y, 'u')
      buildingSet(grid, doorR, y, 'u')
    }
  }
  // Hinge pair on the left stile.
  for (const hy of [80, 96]) {
    buildingRun(grid, doorL + 1, doorL + 5, hy, 'u')
    buildingSet(grid, doorL + 2, hy + 1, 'u')
  }
  // Knob on the right stile.
  buildingSet(grid, doorR - 3, 90, 'Y')
  buildingSet(grid, doorR - 3, 91, 'K')

  // ---- Hanging shop sign on a timber bracket at the left of the front.
  const signL = 10
  const signR = 20
  const signTop = 72
  const signBottom = 84
  buildingRun(grid, 8, 22, 68, 'T')
  buildingRun(grid, 8, 22, 69, 't')
  for (const cx of [11, 19]) {
    for (let y = 70; y < signTop; y++) buildingSet(grid, cx, y, 'u')
  }
  for (let y = signTop; y <= signBottom; y++) {
    for (let x = signL; x <= signR; x++) {
      const edge = x === signL || x === signR || y === signTop || y === signBottom
      buildingSet(grid, x, y, edge ? 't' : y === signTop + 1 ? 'B' : 'b')
    }
  }
  buildingSet(grid, 12, signTop + 1, 'o')
  buildingSet(grid, 18, signTop + 1, 'o')

  // ---- Foundation: a staggered stone bond across the full width.
  const foundTop = 104
  for (let y = foundTop; y < H; y++) {
    const row = y - foundTop
    for (let x = wallL; x <= wallR; x++) {
      const inStone = (x + (row % 2) * 5) % 10
      let ch: string
      if (inStone === 0 || inStone === 9) ch = 'm'
      else if (inStone === 1) ch = 'K'
      else ch = 'k'
      if (y === foundTop) ch = 'K'
      if (y >= H - 3) ch = 'm'
      buildingSet(grid, x, y, ch)
    }
  }
  // Stone step protruding from the bond under the door.
  for (let y = foundTop; y <= foundTop + 2; y++) {
    for (let x = doorL - 3; x <= doorR + 3; x++) {
      buildingSet(grid, x, y, y === foundTop ? 'K' : cellNoise(x, y, 4) === 0 ? 'K' : 'k')
    }
  }

  outlineSilhouette(grid)
  return grid.map((row) => row.join(''))
}

/** 128x120 native general store (see `composeStore`). */
const STORE: PixelFrame = composeStore()

/* ------------------------------------------------------------------ */
/* Windmill                                                          */
/* ------------------------------------------------------------------ */

const WINDMILL_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  s: '#8a8a98', // stone
  S: '#a8a8b6', // stone light
  d: '#5e5e6c', // stone dark
  D: '#44444f', // stone deep
  t: '#8a5a34', // timber
  T: '#b07a4a', // timber light
  u: '#6a4226', // timber shade
  p: '#d8c49a', // sail pale timber
  P: '#f0e0b8', // sail light
  q: '#a89068', // sail shade
  y: '#ffd98c', // window glow
  Y: '#ffe9b3', // window bright
  n: '#3a2a28', // dark opening
}

const WINDMILL_W = 72
const WINDMILL_H = 136
const WINDMILL_HUB_X = 36
const WINDMILL_HUB_Y = 28
const WINDMILL_SAIL_LEN = 34

/** Three-pixel stroke so the outline pass leaves a pale core. */
function windmillStroke(grid: string[][], x0: number, y0: number, x1: number, y1: number, ch: string): void {
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0
  let y = y0
  for (;;) {
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) buildingSet(grid, x + ox, y + oy, ch)
    }
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
}

/** One lattice sail: a pale shaft with cross slats, varied per blade. */
function drawWindmillSail(grid: string[][], angleDeg: number, blade: number): void {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const tipX = WINDMILL_HUB_X + Math.round(WINDMILL_SAIL_LEN * cos)
  const tipY = WINDMILL_HUB_Y - Math.round(WINDMILL_SAIL_LEN * sin)
  windmillStroke(grid, WINDMILL_HUB_X, WINDMILL_HUB_Y, tipX, tipY, blade % 2 === 0 ? 'P' : 'p')
  const spacing = [5, 6, 7, 5][blade] ?? 5
  const halfWidth = [2, 3, 2, 3][blade] ?? 2
  const start = [7, 8, 9, 10][blade] ?? 7
  for (let d = start; d <= WINDMILL_SAIL_LEN - 3; d += spacing) {
    const cx = WINDMILL_HUB_X + Math.round(d * cos)
    const cy = WINDMILL_HUB_Y - Math.round(d * sin)
    const x0 = cx + Math.round(halfWidth * sin)
    const y0 = cy + Math.round(halfWidth * cos)
    const x1 = cx - Math.round(halfWidth * sin)
    const y1 = cy - Math.round(halfWidth * cos)
    windmillStroke(grid, x0, y0, x1, y1, blade % 2 === 0 ? 'p' : 'P')
  }
  // A short cap across the tip, plus a small marker on one blade so the
  // quarter-turn reads even though the four sails are evenly spaced.
  windmillStroke(
    grid,
    tipX + Math.round(2 * sin),
    tipY + Math.round(2 * cos),
    tipX - Math.round(2 * sin),
    tipY - Math.round(2 * cos),
    'q'
  )
  if (blade === 1) {
    const mx = WINDMILL_HUB_X + Math.round(16 * cos)
    const my = WINDMILL_HUB_Y - Math.round(16 * sin)
    buildingSet(grid, mx, my, 'u')
    buildingSet(grid, mx + 1, my, 'u')
  }
}

/** One windmill frame: stone tower, timber cap, and four rotating sails. */
function composeWindmillFrame(frame: number): PixelFrame {
  const grid = emptyBuildingGrid(WINDMILL_W, WINDMILL_H)
  const mid = WINDMILL_W / 2
  const towerTop = 30
  const towerBottom = WINDMILL_H - 1
  const topHalf = 12
  const baseHalf = 32

  // ---- Stone tower, tapering slightly to the timber cap.
  for (let y = towerTop; y <= towerBottom; y++) {
    const half = topHalf + ((baseHalf - topHalf) * (y - towerTop)) / (towerBottom - towerTop)
    const left = Math.round(mid - half)
    const right = Math.round(mid + half) - 1
    const course = Math.floor((y - towerTop) / 5)
    const inCourse = (y - towerTop) % 5
    for (let x = left; x <= right; x++) {
      let ch = inCourse === 0 ? 'S' : inCourse === 4 ? 'd' : 's'
      if (cellNoise(x, y, 37) === 0) ch = 'd'
      if (x <= left + 1) ch = inCourse === 0 ? 'S' : 's'
      if (x >= right - 1) ch = inCourse === 4 ? 'D' : 'd'
      buildingSet(grid, x, y, ch)
    }
    if (course % 2 === 0) {
      buildingSet(grid, left, y, 'S')
      buildingSet(grid, left + 1, y, 'S')
    }
  }

  // ---- Timber cap: a broad eave, a tapered crown, and a finial.
  const capRows: ReadonlyArray<readonly [number, number, number, string]> = [
    [20, 35, 36, 'T'],
    [21, 34, 37, 'T'],
    [22, 33, 38, 't'],
    [23, 20, 51, 'T'],
    [24, 20, 51, 't'],
    [25, 20, 51, 't'],
    [26, 21, 50, 't'],
    [27, 21, 50, 'u'],
    [28, 22, 49, 'u'],
    [29, 22, 49, 'u'],
    [30, 23, 48, 'u'],
  ]
  for (const [y, left, right, ch] of capRows) buildingRun(grid, left, right, y, ch)

  // ---- Door: an arched plank door at the base.
  const doorL = 28
  const doorR = 43
  const doorTop = 112
  const doorBottom = WINDMILL_H - 1
  for (let y = doorTop; y <= doorBottom; y++) {
    const arch = y < doorTop + 3 ? doorTop + 3 - y : 0
    for (let x = doorL + arch; x <= doorR - arch; x++) {
      const inBoard = (x - doorL) % 4
      buildingSet(grid, x, y, inBoard === 0 ? 'T' : inBoard === 3 ? 'u' : 't')
    }
    buildingSet(grid, doorL + arch - 1, y, 'T')
    buildingSet(grid, doorR - arch + 1, y, 'u')
  }
  buildingSet(grid, doorR - 2, 126, 'Y')

  // ---- Two tiny windows flanking the door.
  const drawWindmillWindow = (wx: number, wy: number): void => {
    for (let y = wy; y < wy + 5; y++) {
      for (let x = wx; x < wx + 4; x++) {
        const edge = x === wx || x === wx + 3 || y === wy || y === wy + 4
        buildingSet(grid, x, y, edge ? 't' : x === wx + 1 && y === wy + 1 ? 'Y' : 'y')
      }
    }
    buildingRun(grid, wx - 1, wx + 4, wy + 5, 'T')
  }
  drawWindmillWindow(18, 100)
  drawWindmillWindow(48, 100)

  // ---- Sails: four lattice blades, a quarter turn per frame.
  for (let blade = 0; blade < 4; blade++) {
    drawWindmillSail(grid, 45 + frame * 90 + blade * 90, blade)
  }

  // ---- Hub: a timber boss with a bright pin, drawn over the sail roots.
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy <= 5) {
        buildingSet(grid, WINDMILL_HUB_X + dx, WINDMILL_HUB_Y + dy, dx < 0 && dy < 0 ? 'T' : 't')
      }
    }
  }
  buildingSet(grid, WINDMILL_HUB_X, WINDMILL_HUB_Y, 'Y')

  outlineSilhouette(grid)
  return grid.map((row) => row.join(''))
}

/** 72x136 windmill: four frames of a slow quarter-turn sail rotation. */
const WINDMILL_FRAMES: readonly PixelFrame[] = [0, 1, 2, 3].map(composeWindmillFrame)

/* ------------------------------------------------------------------ */
/* Well                                                             */
/* ------------------------------------------------------------------ */

const WELL_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  s: '#8a8a98', // stone
  S: '#a8a8b6', // stone light
  d: '#5e5e6c', // stone dark
  D: '#44444f', // stone deep and mortar
  t: '#8a5a34', // timber
  T: '#b07a4a', // timber light
  u: '#6a4226', // timber shade
  U: '#4e2f1a', // timber deep
  w: '#2f4a5e', // water dark
  W: '#3f6a80', // water mid
  c: '#8fc8d8', // water glint
  C: '#d8f0f4', // water bright
  r: '#c9a86e', // rope
  R: '#e0c48a', // rope light
  b: '#9a6b43', // bucket wood
  B: '#c89a6e', // bucket light
  m: '#6a625c', // bucket band
  M: '#8a8078', // bucket band light
}

const WELL_W = 28
const WELL_H = 32

/** Outer drum spans, one per row from y=19 to the base. */
const WELL_OUTER_SPANS: ReadonlyArray<readonly [number, number]> = [
  [7, 20],
  [4, 23],
  [2, 25],
  [1, 26],
  [0, 27],
  [0, 27],
  [0, 27],
  [0, 27],
  [0, 27],
  [1, 26],
  [2, 25],
  [4, 23],
  [0, 27],
]

/** Water opening spans, one per row from y=21 to y=27. */
const WELL_WATER_SPANS: ReadonlyArray<readonly [number, number]> = [
  [9, 18],
  [7, 20],
  [6, 21],
  [5, 22],
  [5, 22],
  [6, 21],
  [8, 19],
]

/**
 * 28x32 village well: a low circular stone drum with staggered courses,
 * lit tops and dark mortar, dark water with a cool glint inside the rim,
 * two timber uprights under a crossbeam, a rope and wooden bucket, and a
 * little shingled roof cap over the beam.
 */
function composeWell(): PixelFrame {
  const grid = emptyBuildingGrid(WELL_W, WELL_H)

  // ---- Timber uprights first, so the stone drum hides their feet.
  for (let y = 6; y <= 30; y++) {
    buildingSet(grid, 2, y, 'T')
    buildingSet(grid, 3, y, 't')
    buildingSet(grid, 4, y, 'u')
    buildingSet(grid, 23, y, 't')
    buildingSet(grid, 24, y, 'u')
    buildingSet(grid, 25, y, 'U')
  }

  // ---- Crossbeam across the uprights.
  buildingRun(grid, 1, 26, 5, 'T')
  buildingRun(grid, 1, 26, 6, 't')
  buildingSet(grid, 1, 5, 'u')
  buildingSet(grid, 26, 5, 'u')
  buildingSet(grid, 1, 6, 'u')
  buildingSet(grid, 26, 6, 'U')

  // ---- Shingle roof cap over the beam.
  const roofSpans: ReadonlyArray<readonly [number, number]> = [
    [13, 14],
    [11, 16],
    [9, 18],
    [7, 20],
    [5, 22],
  ]
  for (let y = 0; y < roofSpans.length; y++) {
    const [left, right] = roofSpans[y] ?? [0, 0]
    for (let x = left; x <= right; x++) {
      let ch = x < 14 ? 'T' : 't'
      if (y === 0) ch = x === 13 ? 'T' : 't'
      else if (y === 2 || y === 4) ch = 'u'
      else if ((x + y * 3) % 4 === 0) ch = 'u'
      if (x >= right - 1) ch = 'u'
      buildingSet(grid, x, y, ch)
    }
  }
  buildingSet(grid, 5, 4, 'U')
  buildingSet(grid, 22, 4, 'U')

  // ---- Stone drum: staggered courses with lit tops and dark mortar.
  for (let y = 19; y <= 31; y++) {
    const [left, right] = WELL_OUTER_SPANS[y - 19] ?? [0, 0]
    const course = Math.floor((y - 19) / 3)
    const inCourse = (y - 19) % 3
    for (let x = left; x <= right; x++) {
      let ch = inCourse === 0 ? 'S' : inCourse === 1 ? 's' : 'D'
      if (inCourse === 1 && (x + course * 3) % 6 === 0) ch = 'D'
      if (inCourse === 1 && cellNoise(x, y, 31) === 0) ch = 'd'
      if (x <= left + 1 && inCourse !== 2) ch = 'S'
      if (x >= right - 1) ch = inCourse === 0 ? 'd' : 'D'
      if (y === 31) ch = 'D'
      buildingSet(grid, x, y, ch)
    }
  }

  // ---- Water inside the rim: dark, with a cool glint.
  for (let y = 21; y <= 27; y++) {
    const [left, right] = WELL_WATER_SPANS[y - 21] ?? [0, 0]
    for (let x = left; x <= right; x++) {
      let ch = y === 21 ? 'W' : 'w'
      if (cellNoise(x, y, 23) === 0) ch = 'W'
      buildingSet(grid, x, y, ch)
    }
    // Lit inner lip on the sun side, shade on the far side.
    buildingSet(grid, left - 1, y, 'S')
    buildingSet(grid, right + 1, y, 'd')
  }
  buildingSet(grid, 8, 24, 'c')
  buildingSet(grid, 9, 24, 'C')
  buildingSet(grid, 10, 25, 'c')
  buildingSet(grid, 19, 25, 'c')
  buildingSet(grid, 20, 24, 'W')

  // ---- Rope and bucket, hanging over the opening.
  for (let y = 7; y <= 16; y++) {
    buildingSet(grid, 11, y, 'R')
    buildingSet(grid, 12, y, 'R')
    buildingSet(grid, 13, y, 'r')
    buildingSet(grid, 14, y, 'u')
  }
  buildingRun(grid, 11, 16, 17, 'r')
  // Bucket: rim, planks, band, tapered base.
  buildingRun(grid, 11, 16, 18, 'B')
  buildingSet(grid, 11, 18, 'b')
  buildingSet(grid, 16, 18, 'b')
  for (let y = 19; y <= 22; y++) {
    for (let x = 11; x <= 16; x++) {
      let ch = (x - 11) % 3 === 0 ? 'u' : 'b'
      if (x === 11) ch = 'B'
      if (y === 20) ch = x === 12 || x === 13 ? 'M' : 'm'
      buildingSet(grid, x, y, ch)
    }
  }
  buildingRun(grid, 11, 16, 23, 'u')
  buildingSet(grid, 11, 23, 'U')
  buildingSet(grid, 16, 23, 'U')

  outlineSilhouette(grid)
  return grid.map((row) => row.join(''))
}

/** 28x32 stone well: drum, water, uprights, beam, shingle cap, rope, bucket. */
const WELL: PixelFrame = composeWell()

/* ------------------------------------------------------------------ */
/* Water wheel                                                      */
/* ------------------------------------------------------------------ */

const WATER_WHEEL_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  T: '#b07a4a', // sunlit timber
  G: '#c89a62', // sunlit grain highlight
  t: '#8a5a34', // timber mid
  g: '#a06a3e', // grain mid
  u: '#6a4226', // timber shade
  v: '#5a3820', // grain dark
  U: '#4e2f1a', // weathered timber deep
  p: '#c9a06a', // paddle mid
  P: '#e0bc84', // paddle light and repair board
  q: '#8a6a44', // paddle shade
  i: '#3a3a44', // iron band
  I: '#5a5a66', // iron highlight
  n: '#22222a', // iron dark and hub
  y: '#d8c49a', // pale axle pin
  Y: '#f0e0b8', // pale axle pin highlight
  s: '#8a8a98', // stone
  S: '#a8a8b6', // stone light
  d: '#5e5e6c', // stone dark
  D: '#44444f', // stone deep and mortar
  w: '#3a6a7a', // water
  W: '#5a8a9a', // water light
  c: '#aee8f2', // foam
  C: '#e6faff', // foam bright
}

const WATER_WHEEL_W = 40
const WATER_WHEEL_H = 56
const WATER_WHEEL_CX = 20
const WATER_WHEEL_CY = 24
const WATER_WHEEL_R = 18
const WATER_WHEEL_RIM = 14
const WATER_WHEEL_PADDLE_R = 19.5
const WATER_WHEEL_WATERLINE = 42

/** One-pixel Bresenham line for grain and iron detail. */
function waterWheelLine(grid: string[][], x0: number, y0: number, x1: number, y1: number, ch: string): void {
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0
  let y = y0
  for (;;) {
    buildingSet(grid, x, y, ch)
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
}

/**
 * 40x56 water mill wheel: a weathered timber wheel with eight radial
 * spokes, a segmented rim under a thin iron band, and chunky paddle
 * boards around the rim. It is mounted on a gray stone pedestal whose
 * plinth sits at the sprite's bottom edge. Four frames advance the wheel
 * one-eighth turn (45 degrees) each.
 */
function composeWaterWheelFrame(frame: number): PixelFrame {
  const grid = emptyBuildingGrid(WATER_WHEEL_W, WATER_WHEEL_H)
  const cx = WATER_WHEEL_CX
  const cy = WATER_WHEEL_CY
  const spin = frame * 45

  // ---- Gray stone pedestal, behind the wheel. Four top-lit courses with
  //      mortar seams; the lowest eight rows are the plinth at the bottom
  //      edge, so the 14px river sink leaves the base standing in water.
  const pedestalSpans: ReadonlyArray<readonly [number, number]> = [
    [15, 24],
    [14, 25],
    [13, 26],
    [12, 27],
  ]
  const pedestalTops = [44, 47, 50, 53]
  const pedestalBottoms = [46, 49, 52, 55]
  for (let course = 0; course < pedestalSpans.length; course++) {
    const [left, right] = pedestalSpans[course] ?? [0, 0]
    const top = pedestalTops[course] ?? 0
    const bottom = pedestalBottoms[course] ?? 0
    const height = bottom - top + 1
    for (let y = top; y <= bottom; y++) {
      const inCourse = y - top
      for (let x = left; x <= right; x++) {
        let ch = inCourse === 0 ? 'S' : inCourse === height - 1 ? 'D' : 's'
        if (inCourse > 0 && inCourse < height - 1 && (x + course * 3) % 5 === 0) ch = 'D'
        if (inCourse > 0 && inCourse < height - 1 && cellNoise(x, y, 29) === 0) ch = 'd'
        if (x <= left + 1 && inCourse !== height - 1) ch = 'S'
        if (x >= right - 1) ch = inCourse === 0 ? 'd' : 'D'
        buildingSet(grid, x, y, ch)
      }
    }
  }

  // ---- Segmented timber rim under a thin iron band on its outer edge.
  for (let y = 0; y < WATER_WHEEL_H; y++) {
    for (let x = 0; x < WATER_WHEEL_W; x++) {
      const dx = x - cx
      const dy = y - cy
      const d2 = dx * dx + dy * dy
      if (d2 > WATER_WHEEL_R * WATER_WHEEL_R || d2 < WATER_WHEEL_RIM * WATER_WHEEL_RIM) continue
      const lit = dx + dy < 0
      const angle = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360
      const joint = Math.abs(((angle + 22.5) % 45) - 22.5) < 1.6
      let ch: string
      if (d2 >= (WATER_WHEEL_R - 2) * (WATER_WHEEL_R - 2)) {
        ch = joint ? 'n' : lit ? 'I' : 'i'
      } else {
        ch = lit ? 'T' : 'u'
        if (d2 < (WATER_WHEEL_RIM + 1.5) * (WATER_WHEEL_RIM + 1.5)) ch = lit ? 't' : 'U'
        if (cellNoise(x, y, 11) === 0) ch = lit ? 'G' : 'v'
        if (joint) ch = 'U'
      }
      buildingSet(grid, x, y, ch)
    }
  }
  // Iron rivets on the band at the segment joints.
  for (let k = 0; k < 8; k++) {
    const a = ((k * 45) * Math.PI) / 180
    const bx = cx + Math.round((WATER_WHEEL_R - 0.5) * Math.cos(a))
    const by = cy - Math.round((WATER_WHEEL_R - 0.5) * Math.sin(a))
    buildingSet(grid, bx, by, 'I')
  }

  // ---- Eight radial spokes with a grain line down the middle.
  for (let k = 0; k < 8; k++) {
    const a = ((spin + k * 45) * Math.PI) / 180
    const tipX = cx + Math.round(WATER_WHEEL_RIM * Math.cos(a))
    const tipY = cy - Math.round(WATER_WHEEL_RIM * Math.sin(a))
    const lit = tipX < cx && tipY < cy
    const shade = tipX > cx && tipY > cy
    const base = lit ? 'T' : shade ? 'u' : 't'
    const grain = lit ? 'G' : shade ? 'v' : 'g'
    windmillStroke(grid, cx, cy, tipX, tipY, base)
    waterWheelLine(grid, cx, cy, tipX, tipY, grain)
  }

  // ---- Eight chunky paddle boards around the rim; one pale repair board
  //      marks the turn so the 45-degree steps read.
  for (let k = 0; k < 8; k++) {
    const a = ((spin + 22.5 + k * 45) * Math.PI) / 180
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const px = cx + WATER_WHEEL_PADDLE_R * cos
    const py = cy - WATER_WHEEL_PADDLE_R * sin
    for (let u = -5; u <= 5; u++) {
      for (let v = -2; v <= 2; v++) {
        const x = Math.round(px - u * sin + v * cos)
        const y = Math.round(py - u * cos - v * sin)
        let ch: string
        if (k === 0) {
          ch = v === 2 ? 'q' : 'P'
        } else {
          ch = v === -2 ? 'G' : v === 2 ? 'u' : 'T'
          if (v === 0 && (u + k) % 3 === 0) ch = 'g'
          if (v === 1 && (u + k) % 4 === 0) ch = 'v'
        }
        buildingSet(grid, x, y, ch)
      }
    }
  }

  // ---- Dark iron hub with a pale axle pin.
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const d2 = dx * dx + dy * dy
      if (d2 > 25) continue
      let ch = 'n'
      if (d2 >= 16) ch = dx + dy < 0 ? 'I' : 'i'
      if (d2 <= 4) ch = 'y'
      buildingSet(grid, cx + dx, cy + dy, ch)
    }
  }
  buildingSet(grid, cx - 1, cy - 1, 'Y')

  outlineSilhouette(grid)

  // ---- Foam where the paddles dip; drawn after the outline so it stays pale.
  //      The 14px river sink puts the waterline at row 42, so these pixels
  //      straddle the lowest paddle arc and break the surface.
  const foam: ReadonlyArray<ReadonlyArray<readonly [number, number, string]>> = [
    [
      [13, 42, 'c'],
      [14, 43, 'C'],
      [15, 42, 'c'],
      [25, 42, 'c'],
      [26, 43, 'C'],
      [27, 42, 'c']
    ],
    [
      [12, 43, 'C'],
      [13, 42, 'c'],
      [24, 42, 'c'],
      [25, 43, 'C'],
      [26, 44, 'c']
    ],
    [
      [14, 42, 'c'],
      [15, 43, 'C'],
      [16, 44, 'c'],
      [23, 43, 'C'],
      [24, 42, 'c']
    ],
    [
      [12, 42, 'c'],
      [13, 43, 'C'],
      [26, 44, 'c'],
      [27, 42, 'c'],
      [28, 43, 'C']
    ]
  ]
  for (const [x, y, ch] of foam[frame] ?? []) buildingSet(grid, x, y, ch)

  return grid.map((row) => row.join(''))
}

/** 40x56 water wheel: four frames, one-eighth turn per frame. */
function composeWaterWheelFrames(): readonly PixelFrame[] {
  return [0, 1, 2, 3].map(composeWaterWheelFrame)
}

const WATER_WHEEL_FRAMES: readonly PixelFrame[] = composeWaterWheelFrames()

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
  store: PixelSprite
  windmill: PixelSprite
  well: PixelSprite
  waterWheel: PixelSprite
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
  store: { palette: STORE_PALETTE, frames: [STORE], frameMs: 1000 } as PixelSprite,
  windmill: { palette: WINDMILL_PALETTE, frames: WINDMILL_FRAMES, frameMs: 900 } as PixelSprite,
  well: { palette: WELL_PALETTE, frames: [WELL], frameMs: 1000 },
  waterWheel: { palette: WATER_WHEEL_PALETTE, frames: WATER_WHEEL_FRAMES, frameMs: 900 } as PixelSprite,
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
