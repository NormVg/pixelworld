/**
 * Native-resolution buildings and standing structures for Willow Hollow.
 *
 * Every sprite is composed at its native pixel resolution and anchored at
 * its base row. The shared grid, noise, and outline helpers live in
 * `pixel-sprite-compose`; this module owns only the building palettes,
 * composers, and frame data.
 */

import type { PixelFrame, PixelPalette, PixelSprite } from '~/utils/pixel-sprite-types'
import { buildingRun, buildingSet, cellNoise, emptyBuildingGrid, outlineSilhouette } from '~/utils/pixel-sprite-compose'

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
/* Water wheel house                                                 */
/* ------------------------------------------------------------------ */

const WATER_WHEEL_HOUSE_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  r: '#5a6a8a', // slate roof
  R: '#7a8aa8', // roof light
  e: '#44506a', // roof dark
  E: '#333c52', // roof deep
  k: '#8a8078', // fieldstone
  K: '#b0a89e', // stone light
  m: '#6a625c', // stone shade
  M: '#4e4844', // mortar
  t: '#8a5a34', // timber
  T: '#b07a4a', // timber light
  u: '#6a4226', // timber shade
  U: '#4e2f1a', // timber deep
  p: '#c9a06a', // paddle mid
  P: '#e0bc84', // paddle light and repair board
  q: '#8a6a44', // paddle shade
  Q: '#5a3820', // paddle deep
  i: '#3a3a44', // iron band
  I: '#5a5a66', // iron highlight
  n: '#22222a', // iron dark and hub
  a: '#d8c49a', // pale axle pin
  A: '#f0e0b8', // pale axle pin highlight
  y: '#ffd98c', // window glow
  Y: '#ffe9b3', // window bright
  b: '#9a6b43', // door wood
  B: '#c89a6e', // door light
  w: '#3272a4', // water body
  W: '#6fb4d4', // water surface line
  d: '#28618f', // water shade
  D: '#1f4f78', // water deep
  c: '#a8dce8', // foam
  C: '#eafcff', // foam bright
}

const WATER_WHEEL_HOUSE_W = 64
const WATER_WHEEL_HOUSE_H = 96
const WATER_WHEEL_HOUSE_CX = 18
const WATER_WHEEL_HOUSE_CY = 74
const WATER_WHEEL_HOUSE_R = 20
const WATER_WHEEL_HOUSE_RIM = 16
const WATER_WHEEL_HOUSE_PADDLE_R = 21.5
const WATER_WHEEL_HOUSE_WATERLINE = 80

/**
 * 64x96 water-wheel mill house: a stone-and-timber mill with a steep
 * slate roof, a warm-lit window, a plank door, and a small chimney,
 * plus a big timber wheel mounted on its west face. The wheel steps
 * 45 degrees per frame, with a pale repair paddle marking the turn,
 * and its lower arc dips into a painted water channel with per-frame
 * foam.
 */
function composeWaterWheelHouseFrame(frame: number): PixelFrame {
  const grid = emptyBuildingGrid(WATER_WHEEL_HOUSE_W, WATER_WHEEL_HOUSE_H)
  const mid = 41
  const spin = frame * 45

  // ---- Steep slate roof with a ridge cap and eave shadow.
  const roofTop = 4
  const eaveY = 28
  const ridgeHalf = 8
  const eaveHalf = 20
  for (let y = roofTop; y <= eaveY; y++) {
    const half = ridgeHalf + ((eaveHalf - ridgeHalf) * (y - roofTop)) / (eaveY - roofTop)
    const left = Math.round(mid - half)
    const right = Math.round(mid + half) - 1
    const course = Math.floor((y - roofTop) / 3)
    const inCourse = (y - roofTop) % 3
    for (let x = left; x <= right; x++) {
      let ch = inCourse === 0 ? 'R' : inCourse === 2 ? 'e' : 'r'
      if (cellNoise(x, y, 31) === 0) ch = x < mid ? 'R' : 'E'
      buildingSet(grid, x, y, ch)
    }
    if (inCourse === 0) {
      for (let x = left + 3 + (course % 2) * 3; x <= right; x += 6) buildingSet(grid, x, y, 'E')
    }
  }
  buildingRun(grid, mid - ridgeHalf - 1, mid + ridgeHalf, roofTop, 'R')
  buildingRun(grid, mid - ridgeHalf - 1, mid + ridgeHalf, roofTop + 1, 'r')
  for (let y = eaveY + 1; y <= eaveY + 2; y++) {
    buildingRun(grid, Math.round(mid - eaveHalf), Math.round(mid + eaveHalf) - 1, y, y === eaveY + 2 ? 'e' : 'E')
  }

  // ---- Small stone chimney on the right slope.
  const chimL = 48
  const chimR = 54
  buildingRun(grid, chimL - 1, chimR + 1, 0, 'K')
  buildingRun(grid, chimL - 1, chimR + 1, 1, 'k')
  for (let y = 2; y <= 14; y++) {
    for (let x = chimL; x <= chimR; x++) {
      let ch = y % 3 === 0 ? 'K' : y % 3 === 2 ? 'm' : 'k'
      if (x === chimL || x === chimR) ch = 'M'
      else if (cellNoise(x, y, 7) === 0) ch = 'm'
      buildingSet(grid, x, y, ch)
    }
  }

  // ---- Timber-framed upper storey with dark cross-bracing.
  const wallTop = eaveY + 3
  const wallBottom = 52
  const wallL = 22
  const wallR = 60
  for (let y = wallTop; y < wallTop + 2; y++) buildingRun(grid, wallL, wallR, y, y === wallTop ? 'T' : 't')
  for (let y = wallTop + 2; y < wallBottom; y++) {
    const inCourse = (y - wallTop - 2) % 4
    for (let x = wallL; x <= wallR; x++) {
      let ch = inCourse === 0 ? 'T' : inCourse === 3 ? 'u' : 't'
      if (cellNoise(x, y, 37) === 0) ch = 'u'
      buildingSet(grid, x, y, ch)
    }
  }
  for (let y = wallTop; y < wallBottom; y++) {
    for (let x = wallL; x < wallL + 2; x++) buildingSet(grid, x, y, x === wallL ? 'T' : 'U')
    for (let x = wallR - 1; x <= wallR; x++) buildingSet(grid, x, y, x === wallR ? 'U' : 'u')
  }
  for (let i = 0; i < 10; i++) {
    buildingSet(grid, 46 + i, 34 + i, 'U')
    buildingSet(grid, 46 + i, 46 - i, 'U')
  }
  for (let y = 33; y <= 50; y++) buildingSet(grid, 45, y, 'U')

  // ---- Warm-lit window.
  const winL = 32
  const winR = 42
  const winTop = 36
  const winBottom = 46
  for (let y = winTop; y <= winBottom; y++) {
    for (let x = winL; x <= winR; x++) {
      const edge = x === winL || x === winR || y === winTop || y === winBottom
      buildingSet(grid, x, y, edge ? 'u' : x === 37 || y === 41 ? 'u' : x < 37 && y < 41 ? 'Y' : 'y')
    }
  }
  buildingRun(grid, winL - 1, winR + 1, winBottom + 1, 'T')

  // ---- Grey fieldstone base: three courses with mortar seams.
  const baseTop = 52
  const baseBottom = 85
  for (let y = baseTop; y <= baseBottom; y++) {
    const row = y - baseTop
    const course = Math.floor(row / 11)
    const inCourse = row % 11
    for (let x = wallL; x <= wallR; x++) {
      const joint = (x + course * 5) % 10
      let ch: string
      if (inCourse === 0 || inCourse === 10) ch = 'M'
      else if (joint === 0 || joint === 9) ch = 'M'
      else if (joint === 1) ch = 'K'
      else ch = 'k'
      if (inCourse > 0 && inCourse < 10 && cellNoise(x, y, 23) === 0) ch = 'm'
      if (x <= wallL + 1) ch = inCourse === 0 ? 'K' : 'k'
      if (x >= wallR - 1) ch = inCourse === 10 ? 'M' : 'm'
      buildingSet(grid, x, y, ch)
    }
  }

  // ---- Plank door facing the path, with a lit edge and hinges.
  const doorL = 44
  const doorR = 54
  const doorTop = 54
  const doorBottom = 69
  buildingRun(grid, doorL - 1, doorR + 1, doorTop - 2, 'T')
  buildingRun(grid, doorL - 1, doorR + 1, doorTop - 1, 't')
  for (let y = doorTop; y <= doorBottom; y++) {
    for (let x = doorL; x <= doorR; x++) {
      const inBoard = (x - doorL) % 3
      let ch = inBoard === 0 ? 'B' : inBoard === 2 ? 'U' : 'b'
      if (x === doorL) ch = 'B'
      buildingSet(grid, x, y, ch)
    }
    if (y === 60 || y === 66) {
      buildingSet(grid, doorL, y, 'U')
      buildingSet(grid, doorR, y, 'U')
    }
  }
  for (const hy of [58, 66]) {
    buildingRun(grid, doorL + 1, doorL + 3, hy, 'U')
    buildingSet(grid, doorL + 2, hy + 1, 'U')
  }
  buildingSet(grid, doorR - 2, 62, 'A')

  // ---- Big timber wheel on the west face: segmented rim under an iron
  //      band, eight spokes, eight chunky paddles, and a pale repair board.
  const cx = WATER_WHEEL_HOUSE_CX
  const cy = WATER_WHEEL_HOUSE_CY
  for (let y = 0; y < WATER_WHEEL_HOUSE_H; y++) {
    for (let x = 0; x < WATER_WHEEL_HOUSE_W; x++) {
      const dx = x - cx
      const dy = y - cy
      const d2 = dx * dx + dy * dy
      if (d2 > WATER_WHEEL_HOUSE_R * WATER_WHEEL_HOUSE_R || d2 < WATER_WHEEL_HOUSE_RIM * WATER_WHEEL_HOUSE_RIM) continue
      const lit = dx + dy < 0
      const angle = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360
      const joint = Math.abs(((angle + 22.5) % 45) - 22.5) < 1.6
      let ch: string
      if (d2 >= (WATER_WHEEL_HOUSE_R - 2) * (WATER_WHEEL_HOUSE_R - 2)) {
        ch = joint ? 'n' : lit ? 'I' : 'i'
      } else {
        ch = lit ? 'P' : 'q'
        if (d2 < (WATER_WHEEL_HOUSE_RIM + 1.5) * (WATER_WHEEL_HOUSE_RIM + 1.5)) ch = lit ? 'p' : 'Q'
        if (cellNoise(x, y, 11) === 0) ch = lit ? 'P' : 'Q'
        if (joint) ch = 'Q'
      }
      buildingSet(grid, x, y, ch)
    }
  }
  for (let k = 0; k < 8; k++) {
    const a = ((k * 45) * Math.PI) / 180
    const bx = cx + Math.round((WATER_WHEEL_HOUSE_R - 0.5) * Math.cos(a))
    const by = cy - Math.round((WATER_WHEEL_HOUSE_R - 0.5) * Math.sin(a))
    buildingSet(grid, bx, by, 'I')
  }
  for (let k = 0; k < 8; k++) {
    const a = ((spin + k * 45) * Math.PI) / 180
    const tipX = cx + Math.round(WATER_WHEEL_HOUSE_RIM * Math.cos(a))
    const tipY = cy - Math.round(WATER_WHEEL_HOUSE_RIM * Math.sin(a))
    const lit = tipX < cx && tipY < cy
    const shade = tipX > cx && tipY > cy
    const base = lit ? 'P' : shade ? 'q' : 'p'
    const grain = lit ? 'P' : shade ? 'Q' : 'q'
    windmillStroke(grid, cx, cy, tipX, tipY, base)
    waterWheelLine(grid, cx, cy, tipX, tipY, grain)
  }
  for (let k = 0; k < 8; k++) {
    const a = ((spin + 22.5 + k * 45) * Math.PI) / 180
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const px = cx + WATER_WHEEL_HOUSE_PADDLE_R * cos
    const py = cy - WATER_WHEEL_HOUSE_PADDLE_R * sin
    for (let u = -5; u <= 5; u++) {
      for (let v = -2; v <= 2; v++) {
        const x = Math.round(px - u * sin + v * cos)
        const y = Math.round(py - u * cos - v * sin)
        let ch: string
        if (k === 0) {
          ch = v === 2 ? 'q' : 'P'
        } else {
          ch = v === -2 ? 'P' : v === 2 ? 'Q' : 'p'
          if (v === 0 && (u + k) % 3 === 0) ch = 'q'
          if (v === 1 && (u + k) % 4 === 0) ch = 'Q'
        }
        buildingSet(grid, x, y, ch)
      }
    }
  }
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const d2 = dx * dx + dy * dy
      if (d2 > 25) continue
      let ch = 'n'
      if (d2 >= 16) ch = dx + dy < 0 ? 'I' : 'i'
      if (d2 <= 4) ch = 'a'
      buildingSet(grid, cx + dx, cy + dy, ch)
    }
  }
  buildingSet(grid, cx - 1, cy - 1, 'A')

  // ---- Painted water channel: a sixteen-pixel band with a bright
  //      surface line, a deep blue body, and foam at the wheel entry.
  const waterTop = WATER_WHEEL_HOUSE_WATERLINE
  for (let y = waterTop; y < WATER_WHEEL_HOUSE_H; y++) {
    const inWater = y - waterTop
    for (let x = 0; x < WATER_WHEEL_HOUSE_W; x++) {
      let ch = inWater === 0 ? 'W' : inWater < 4 ? 'w' : inWater < 12 ? 'd' : 'D'
      if (inWater === 1 && cellNoise(x, y, 19) === 0) ch = 'W'
      if (inWater > 4 && cellNoise(x, y, 13) === 0) ch = 'D'
      buildingSet(grid, x, y, ch)
    }
  }

  outlineSilhouette(grid)

  // ---- Foam churn at the wheel's entry line, drawn after the outline.
  const foam: ReadonlyArray<ReadonlyArray<readonly [number, number, string]>> = [
    [
      [0, 80, 'C'],
      [1, 81, 'C'],
      [1, 79, 'C'],
      [37, 80, 'C'],
      [38, 81, 'C'],
      [38, 79, 'C']
    ],
    [
      [0, 81, 'C'],
      [1, 80, 'c'],
      [1, 79, 'C'],
      [36, 80, 'C'],
      [37, 81, 'C'],
      [37, 79, 'C']
    ],
    [
      [1, 80, 'C'],
      [2, 81, 'C'],
      [2, 79, 'C'],
      [38, 80, 'C'],
      [39, 81, 'C'],
      [39, 79, 'C']
    ],
    [
      [0, 80, 'c'],
      [1, 81, 'C'],
      [1, 79, 'C'],
      [37, 80, 'C'],
      [38, 81, 'C'],
      [38, 79, 'C']
    ]
  ]
  for (const [x, y, ch] of foam[frame] ?? []) buildingSet(grid, x, y, ch)

  return grid.map((row) => row.join(''))
}

/** 64x96 water-wheel mill house: four frames, a 45-degree wheel step each. */
const WATER_WHEEL_HOUSE_FRAMES: readonly PixelFrame[] = [0, 1, 2, 3].map(composeWaterWheelHouseFrame)

/* ------------------------------------------------------------------ */
/* Village house                                                     */
/* ------------------------------------------------------------------ */

const HOUSE_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  s: '#5a6a8a', // slate-blue roof
  S: '#7a8aa8', // roof light
  q: '#44506a', // roof dark
  Q: '#333c52', // roof deep
  w: '#e8cfa8', // warm plaster
  W: '#f6e2c0', // plaster light
  v: '#cdb088', // plaster shade
  t: '#5a3a28', // dark timber
  T: '#7a5238', // timber light
  u: '#3e281c', // timber shade
  b: '#a84a3a', // brick
  B: '#c86a52', // brick light
  d: '#7e3428', // brick dark
  D: '#5e241c', // brick deep
  y: '#ffd98c', // window glow
  Y: '#ffe9b3', // window bright
  n: '#3a2a28', // dark opening
  c: '#9a6b43', // door wood
  C: '#c89a6e', // door light
  g: '#5a8f5a', // flower green
  f: '#d85846', // flower red
  F: '#e88a9a', // flower pink
  k: '#8a8078', // foundation stone
  K: '#b0a89e', // stone light
  m: '#6a625c', // stone shade
  h: '#d8dce4', // smoke
  H: '#b8c0cc', // smoke shade
}

/**
 * 128x128 two-story timber-frame village house, composed at native
 * resolution: a steep slate-blue roof with tile courses, a central
 * dormer, and a brick chimney with a smoke wisp; warm plaster walls
 * with dark timber cross-bracing; two shuttered windows upstairs; a
 * centered plank door with a porch step; and flower boxes under the
 * downstairs windows.
 */
function composeHouse(): PixelFrame {
  const H = 128
  const grid = emptyBuildingGrid(128, H)
  const mid = 64

  // ---- Roof: steep slate-blue tile courses.
  const roofTop = 8
  const eaveY = 48
  const ridgeHalf = 18
  const eaveHalf = 60
  for (let y = roofTop; y <= eaveY; y++) {
    const half = ridgeHalf + ((eaveHalf - ridgeHalf) * (y - roofTop)) / (eaveY - roofTop)
    const left = Math.round(mid - half)
    const right = Math.round(mid + half) - 1
    const course = Math.floor((y - roofTop) / 4)
    const inCourse = (y - roofTop) % 4
    for (let x = left; x <= right; x++) {
      let ch = inCourse === 0 ? 'S' : inCourse === 3 ? 'q' : 's'
      if (cellNoise(x, y, 43) === 0) ch = x < mid ? 'S' : 'Q'
      buildingSet(grid, x, y, ch)
    }
    if (inCourse === 0) {
      for (let x = left + 4 + (course % 3); x <= right; x += 10) buildingSet(grid, x, y, 'Q')
    }
  }
  // Eave shadow and ridge cap.
  for (let y = eaveY + 1; y <= eaveY + 3; y++) {
    buildingRun(grid, Math.round(mid - eaveHalf), Math.round(mid + eaveHalf) - 1, y, y === eaveY + 3 ? 'q' : 'Q')
  }
  buildingRun(grid, mid - ridgeHalf - 2, mid + ridgeHalf + 1, roofTop, 'S')
  buildingRun(grid, mid - ridgeHalf - 2, mid + ridgeHalf + 1, roofTop + 1, 's')

  // ---- Chimney: brick courses on the right slope, with a smoke wisp.
  const chimL = 92
  const chimR = 106
  buildingRun(grid, chimL - 2, chimR + 2, 4, 'B')
  buildingRun(grid, chimL - 2, chimR + 2, 5, 'b')
  for (let y = 6; y <= 30; y++) {
    for (let x = chimL; x <= chimR; x++) {
      let ch = y % 4 === 0 ? 'B' : y % 4 === 3 ? 'd' : 'b'
      if (x === chimL || x === chimR) ch = 'D'
      else if (cellNoise(x, y, 13) === 0) ch = 'd'
      buildingSet(grid, x, y, ch)
    }
  }
  // Smoke: a small wisp leaning up-right off the flue.
  const smokeRows: ReadonlyArray<readonly [number, number, number]> = [
    [3, 104, 112],
    [2, 106, 114],
    [1, 108, 116],
    [0, 110, 116],
  ]
  for (const [sy, sx0, sx1] of smokeRows) {
    buildingRun(grid, sx0, sx1, sy, 'h')
    for (let x = sx0 + 1; x < sx1; x++) {
      if (cellNoise(x, sy, 5) === 0) buildingSet(grid, x, sy, 'H')
    }
  }

  // ---- Dormer: a small gabled window breaking the roof plane.
  const dormerRows: ReadonlyArray<readonly [number, number, number, string]> = [
    [18, 58, 69, 'S'],
    [19, 56, 71, 'S'],
    [20, 54, 73, 's'],
    [21, 52, 75, 's'],
    [22, 52, 75, 'q'],
  ]
  for (const [y, left, right, ch] of dormerRows) buildingRun(grid, left, right, y, ch)
  buildingRun(grid, 58, 69, 18, 'S')
  buildingRun(grid, 56, 71, 19, 's')
  // Dormer wall and window.
  for (let y = 23; y <= 40; y++) {
    for (let x = 54; x <= 73; x++) {
      const edge = x <= 55 || x >= 72 || y === 23 || y === 40
      if (edge) {
        buildingSet(grid, x, y, x <= 55 && y <= 24 ? 'T' : 't')
      } else {
        buildingSet(grid, x, y, y % 4 === 0 ? 'W' : y % 4 === 3 ? 'v' : 'w')
      }
    }
  }
  for (let y = 27; y <= 37; y++) {
    for (let x = 58; x <= 69; x++) {
      const edge = x === 58 || x === 69 || y === 27 || y === 37
      buildingSet(grid, x, y, edge ? 't' : x === 63 || y === 32 ? 't' : x < 63 && y < 32 ? 'Y' : 'y')
    }
  }
  buildingRun(grid, 57, 70, 38, 'T')

  // ---- Wall: warm plaster with a timber top plate and floor band.
  const wallTop = eaveY + 4
  const wallBottom = 112
  const wallL = 6
  const wallR = 121
  for (let y = wallTop; y < wallTop + 3; y++) buildingRun(grid, wallL, wallR, y, y === wallTop ? 'T' : 't')
  for (let y = wallTop + 3; y < wallBottom; y++) {
    const inCourse = (y - wallTop - 3) % 4
    for (let x = wallL; x <= wallR; x++) {
      let ch = inCourse === 0 ? 'W' : inCourse === 3 ? 'v' : 'w'
      if (cellNoise(x, y, 53) === 0) ch = 'v'
      buildingSet(grid, x, y, ch)
    }
  }
  // Floor band between the two stories.
  for (let y = 82; y <= 84; y++) buildingRun(grid, wallL, wallR, y, y === 82 ? 'T' : y === 84 ? 'u' : 't')

  // ---- Corner posts and dark timber cross-bracing.
  for (let y = wallTop; y < wallBottom; y++) {
    for (let x = wallL; x < wallL + 4; x++) buildingSet(grid, x, y, x === wallL ? 'T' : x === wallL + 3 ? 'u' : 't')
    for (let x = wallR - 3; x <= wallR; x++) buildingSet(grid, x, y, x === wallR - 3 ? 'T' : x === wallR ? 'u' : 't')
  }
  // Upper-story X braces in the central panel.
  for (let i = 0; i < 16; i++) {
    buildingSet(grid, 42 + i, 56 + i, 'u')
    buildingSet(grid, 42 + i, 72 - i, 'u')
    buildingSet(grid, 70 + i, 56 + i, 'u')
    buildingSet(grid, 70 + i, 72 - i, 'u')
  }
  // Lower-story braces between the door and the windows.
  for (let i = 0; i < 12; i++) {
    buildingSet(grid, 42 + i, 88 + i, 'u')
    buildingSet(grid, 42 + i, 100 - i, 'u')
    buildingSet(grid, 74 + i, 88 + i, 'u')
    buildingSet(grid, 74 + i, 100 - i, 'u')
  }
  // Vertical studs framing the central panels.
  for (let y = 56; y <= 80; y++) {
    buildingSet(grid, 42, y, 't')
    buildingSet(grid, 43, y, 'u')
    buildingSet(grid, 84, y, 't')
    buildingSet(grid, 85, y, 'u')
  }

  // ---- Upstairs windows: timber frames, glowing glass, board shutters.
  const drawHouseWindow = (wx: number, wy: number, ww: number, wh: number, shutters: boolean): void => {
    if (shutters) {
      for (let y = wy; y < wy + wh; y++) {
        const slat = (y - wy) % 3 === 2 ? 'u' : 't'
        for (let i = 0; i < 6; i++) {
          buildingSet(grid, wx - 6 + i, y, slat)
          buildingSet(grid, wx + ww + i, y, slat)
        }
      }
    }
    for (let y = wy; y < wy + wh; y++) {
      for (let x = wx; x < wx + ww; x++) {
        const edge = x <= wx + 1 || x >= wx + ww - 2 || y <= wy + 1 || y >= wy + wh - 2
        if (edge) {
          buildingSet(grid, x, y, x <= wx + 1 && y <= wy + 1 ? 'T' : 't')
        } else {
          const bright = x - wx < (ww - 2) / 2 && y - wy < (wh - 2) / 2
          buildingSet(grid, x, y, bright ? 'Y' : 'y')
        }
      }
    }
    buildingRun(grid, wx + 2, wx + ww - 3, wy + Math.floor(wh / 2), 't')
    for (let y = wy + 2; y < wy + wh - 2; y++) buildingSet(grid, wx + Math.floor(ww / 2), y, 't')
    buildingRun(grid, wx - 1, wx + ww, wy + wh, 'T')
  }
  drawHouseWindow(18, 58, 21, 19, true)
  drawHouseWindow(90, 58, 21, 19, true)

  // ---- Downstairs windows with flower boxes.
  drawHouseWindow(18, 88, 21, 17, false)
  drawHouseWindow(90, 88, 21, 17, false)
  const drawFlowerBox = (bx: number, by: number, bw: number): void => {
    buildingRun(grid, bx, bx + bw - 1, by, 'T')
    for (let y = by + 1; y <= by + 3; y++) buildingRun(grid, bx, bx + bw - 1, y, y === by + 3 ? 'u' : 'c')
    for (let x = bx + 1; x < bx + bw - 1; x++) {
      if (cellNoise(x, by, 3) !== 0) {
        buildingSet(grid, x, by - 1, cellNoise(x, by, 2) === 0 ? 'g' : 'f')
        if (cellNoise(x, by + 1, 4) === 0) buildingSet(grid, x, by - 2, 'F')
      }
    }
  }
  drawFlowerBox(16, 108, 25)
  drawFlowerBox(88, 108, 25)

  // ---- Door: centered plank door under a lintel, with a porch step.
  const doorL = 56
  const doorR = 72
  const doorTop = 84
  const doorBottom = 111
  buildingRun(grid, doorL - 2, doorR + 2, doorTop - 2, 'T')
  buildingRun(grid, doorL - 2, doorR + 2, doorTop - 1, 't')
  for (let y = doorTop; y <= doorBottom; y++) {
    for (let x = doorL; x <= doorR; x++) {
      const inBoard = (x - doorL) % 4
      let ch = inBoard === 0 ? 'C' : inBoard === 3 ? 'u' : 'c'
      if (x === doorL) ch = 'C'
      buildingSet(grid, x, y, ch)
    }
    if (y === 92 || y === 102) {
      buildingSet(grid, doorL, y, 'u')
      buildingSet(grid, doorR, y, 'u')
    }
  }
  for (const hy of [90, 104]) {
    buildingRun(grid, doorL + 1, doorL + 4, hy, 'u')
    buildingSet(grid, doorL + 2, hy + 1, 'u')
  }
  buildingSet(grid, doorR - 2, 98, 'Y')
  buildingSet(grid, doorR - 2, 99, 'K')

  // ---- Foundation: staggered stone bond with a porch step.
  const foundTop = 112
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
  for (let y = foundTop; y <= foundTop + 2; y++) {
    for (let x = doorL - 4; x <= doorR + 4; x++) {
      buildingSet(grid, x, y, y === foundTop ? 'K' : cellNoise(x, y, 4) === 0 ? 'K' : 'k')
    }
  }

  outlineSilhouette(grid)
  return grid.map((row) => row.join(''))
}

/** 128x128 native two-story village house (see `composeHouse`). */
const HOUSE: PixelFrame = composeHouse()

/* ------------------------------------------------------------------ */
/* Log hut                                                           */
/* ------------------------------------------------------------------ */

const HUT_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  l: '#b07a3e', // honey log
  L: '#d8a45e', // log light
  d: '#8a5a2a', // log shade
  D: '#6a421e', // log deep
  r: '#8a5a34', // shingle
  R: '#b07a4a', // shingle light
  q: '#6a4226', // shingle dark
  Q: '#4e2e1a', // shingle deep
  y: '#ffd98c', // window glow
  Y: '#ffe9b3', // window bright
  n: '#3a2a28', // dark opening
  c: '#9a6b43', // door wood
  C: '#c89a6e', // door light
  k: '#8a8078', // stone
  K: '#b0a89e', // stone light
  m: '#6a625c', // stone shade
}

/**
 * 64x96 small log hut, composed at native resolution: stacked honey
 * log courses with protruding corner ends, a low wooden shingle roof
 * with a slight overhang, one small warm-lit window, a plank door,
 * and a tiny woodpile beside it.
 */
function composeHut(): PixelFrame {
  const H = 96
  const grid = emptyBuildingGrid(64, H)
  const mid = 32

  // ---- Roof: low wooden shingle courses with a slight overhang.
  const roofTop = 6
  const eaveY = 30
  const ridgeHalf = 10
  const eaveHalf = 30
  for (let y = roofTop; y <= eaveY; y++) {
    const half = ridgeHalf + ((eaveHalf - ridgeHalf) * (y - roofTop)) / (eaveY - roofTop)
    const left = Math.round(mid - half)
    const right = Math.round(mid + half) - 1
    const course = Math.floor((y - roofTop) / 3)
    const inCourse = (y - roofTop) % 3
    for (let x = left; x <= right; x++) {
      let ch = inCourse === 0 ? 'R' : inCourse === 2 ? 'q' : 'r'
      if (cellNoise(x, y, 29) === 0) ch = x < mid ? 'R' : 'Q'
      buildingSet(grid, x, y, ch)
    }
    if (inCourse === 0) {
      for (let x = left + 3 + (course % 2) * 3; x <= right; x += 6) buildingSet(grid, x, y, 'Q')
    }
  }
  // Ridge beam and eave shadow.
  buildingRun(grid, mid - ridgeHalf - 1, mid + ridgeHalf, roofTop, 'R')
  buildingRun(grid, mid - ridgeHalf - 1, mid + ridgeHalf, roofTop + 1, 'r')
  for (let y = eaveY + 1; y <= eaveY + 3; y++) {
    buildingRun(grid, Math.round(mid - eaveHalf), Math.round(mid + eaveHalf) - 1, y, y === eaveY + 3 ? 'q' : 'Q')
  }

  // ---- Wall: stacked log courses in honey browns.
  const wallTop = eaveY + 4
  const wallBottom = 88
  const wallL = 4
  const wallR = 59
  for (let y = wallTop; y < wallBottom; y++) {
    const course = Math.floor((y - wallTop) / 5)
    const inCourse = (y - wallTop) % 5
    for (let x = wallL; x <= wallR; x++) {
      let ch = inCourse === 0 ? 'L' : inCourse === 4 ? 'd' : 'l'
      if (cellNoise(x, y, 31) === 0) ch = 'd'
      buildingSet(grid, x, y, ch)
    }
    // Protruding log ends alternate between the two corners.
    const endL = course % 2 === 0 ? wallL : wallR - 3
    if (inCourse >= 1 && inCourse <= 3) {
      for (let x = endL; x < endL + 4; x++) {
        buildingSet(grid, x, y, inCourse === 1 ? 'L' : inCourse === 3 ? 'd' : 'l')
      }
      buildingSet(grid, endL + 1, y, 'L')
      buildingSet(grid, endL + 2, y, 'd')
    }
  }

  // ---- Door: a small plank door with a lit edge and hinges.
  const doorL = 22
  const doorR = 34
  const doorTop = 64
  const doorBottom = 87
  buildingRun(grid, doorL - 1, doorR + 1, doorTop - 2, 'R')
  buildingRun(grid, doorL - 1, doorR + 1, doorTop - 1, 'r')
  for (let y = doorTop; y <= doorBottom; y++) {
    for (let x = doorL; x <= doorR; x++) {
      const inBoard = (x - doorL) % 4
      let ch = inBoard === 0 ? 'C' : inBoard === 3 ? 'D' : 'c'
      if (x === doorL) ch = 'C'
      buildingSet(grid, x, y, ch)
    }
    if (y === 72 || y === 80) {
      buildingSet(grid, doorL, y, 'D')
      buildingSet(grid, doorR, y, 'D')
    }
  }
  for (const hy of [70, 82]) {
    buildingRun(grid, doorL + 1, doorL + 3, hy, 'D')
    buildingSet(grid, doorL + 2, hy + 1, 'D')
  }
  buildingSet(grid, doorR - 2, 76, 'Y')

  // ---- Window: one small warm-lit window to the right of the door.
  const winL = 42
  const winR = 50
  const winTop = 56
  const winBottom = 64
  for (let y = winTop; y <= winBottom; y++) {
    for (let x = winL; x <= winR; x++) {
      const edge = x === winL || x === winR || y === winTop || y === winBottom
      buildingSet(grid, x, y, edge ? 'r' : x === 46 || y === 60 ? 'r' : x < 46 && y < 60 ? 'Y' : 'y')
    }
  }
  buildingRun(grid, winL - 1, winR + 1, winBottom + 1, 'R')

  // ---- Woodpile: a tiny stack of logs beside the door.
  const pileL = 8
  const pileR = 18
  for (let row = 0; row < 3; row++) {
    const py = 76 + row * 4
    const inset = row % 2
    for (let y = py; y <= py + 2; y++) {
      for (let x = pileL + inset; x <= pileR - inset; x++) {
        buildingSet(grid, x, y, y === py ? 'L' : y === py + 2 ? 'd' : 'l')
      }
    }
    buildingSet(grid, pileL + inset, py + 1, 'L')
    buildingSet(grid, pileL + inset + 1, py + 1, 'd')
  }

  // ---- Foundation: a rough stone footing.
  const foundTop = 88
  for (let y = foundTop; y < H; y++) {
    const row = y - foundTop
    for (let x = wallL; x <= wallR; x++) {
      const inStone = (x + (row % 2) * 4) % 8
      let ch: string
      if (inStone === 0 || inStone === 7) ch = 'm'
      else if (inStone === 1) ch = 'K'
      else ch = 'k'
      if (y === foundTop) ch = 'K'
      if (y >= H - 3) ch = 'm'
      buildingSet(grid, x, y, ch)
    }
  }

  outlineSilhouette(grid)
  return grid.map((row) => row.join(''))
}

/** 64x96 native log hut (see `composeHut`). */
const HUT: PixelFrame = composeHut()

/* ------------------------------------------------------------------ */
/* Mud hut                                                           */
/* ------------------------------------------------------------------ */

const MUD_HUT_PALETTE: PixelPalette = {
  o: '#2a2431', // shared outline
  s: '#c89a3e', // thatch straw
  S: '#e8c060', // straw light
  d: '#a87a2e', // straw shade
  D: '#7e5a22', // straw deep
  w: '#c89a6e', // daub tan
  W: '#e0b888', // daub light
  v: '#a87a52', // daub shade
  V: '#7e5a3a', // daub deep
  n: '#3a2a28', // dark interior
  N: '#241a18', // deeper interior
  u: '#6a4226', // timber
  U: '#8a5a34', // timber light
  g: '#6a8f4a', // herb green
  G: '#8aa85e', // herb light
  k: '#8a8078', // stone
  K: '#b0a89e', // stone light
  m: '#6a625c', // stone shade
}

/**
 * 64x96 round mud hut, composed at native resolution: a conical
 * thatched roof in layered golden bands with a straw crown, a round
 * daub-and-wattle wall with sunlit tan and deep umber shading, a low
 * arched doorway with a dark interior, and two drying herb bundles
 * hanging beside it.
 */
function composeMudHut(): PixelFrame {
  const H = 96
  const grid = emptyBuildingGrid(64, H)
  const mid = 32

  // ---- Conical thatched roof: layered golden bands and a straw crown.
  const roofTop = 4
  const eaveY = 44
  const eaveHalf = 30
  for (let y = roofTop; y <= eaveY; y++) {
    const t = (y - roofTop) / (eaveY - roofTop)
    const half = Math.max(1, eaveHalf * Math.pow(t, 0.9))
    const left = Math.round(mid - half)
    const right = Math.round(mid + half) - 1
    const band = Math.floor((y - roofTop) / 4)
    const inBand = (y - roofTop) % 4
    for (let x = left; x <= right; x++) {
      let ch = band % 2 === 0 ? 'S' : 's'
      if (inBand === 3) ch = 'd'
      if (cellNoise(x, y, 23) === 0) ch = x < mid ? 'S' : 'D'
      buildingSet(grid, x, y, ch)
    }
    // Vertical straw strokes.
    if (inBand === 1) {
      for (let x = left + 2 + (band % 3); x <= right; x += 5) buildingSet(grid, x, y, 'd')
    }
  }
  // Straw crown at the tip.
  buildingRun(grid, 30, 33, 0, 'S')
  buildingRun(grid, 29, 34, 1, 'S')
  buildingRun(grid, 28, 35, 2, 's')
  buildingRun(grid, 27, 36, 3, 's')
  buildingSet(grid, 31, 0, 'd')
  // Eave shadow under the thatch.
  for (let y = eaveY + 1; y <= eaveY + 3; y++) {
    buildingRun(grid, Math.round(mid - eaveHalf), Math.round(mid + eaveHalf) - 1, y, y === eaveY + 3 ? 'D' : 'd')
  }

  // ---- Round daub-and-wattle wall.
  const wallTop = eaveY + 4
  const wallBottom = 88
  for (let y = wallTop; y < wallBottom; y++) {
    const t = (y - wallTop) / (wallBottom - wallTop)
    const half = 24 + 4 * Math.sin((t * Math.PI) / 2)
    const left = Math.round(mid - half)
    const right = Math.round(mid + half) - 1
    for (let x = left; x <= right; x++) {
      let ch = 'w'
      if (x < mid - 4 && y < 72) ch = 'W'
      else if (x > mid + 4 && y > 64) ch = 'v'
      if (cellNoise(x, y, 19) === 0) ch = x < mid ? 'W' : 'V'
      if (cellNoise(x, y, 37) === 0) ch = 'v'
      buildingSet(grid, x, y, ch)
    }
    // Wattle bands: thin woven lines across the daub.
    if ((y - wallTop) % 12 === 6) {
      for (let x = left + 1; x < right; x++) {
        if (cellNoise(x, y, 3) !== 0) buildingSet(grid, x, y, 'v')
      }
    }
  }

  // ---- Low arched doorway with a dark interior hint.
  const doorL = 24
  const doorR = 39
  const doorTop = 68
  const doorBottom = 87
  for (let y = doorTop; y <= doorBottom; y++) {
    const arch = y < doorTop + 4 ? doorTop + 4 - y : 0
    for (let x = doorL + arch; x <= doorR - arch; x++) {
      buildingSet(grid, x, y, y < doorTop + 3 ? 'N' : 'n')
    }
    buildingSet(grid, doorL + arch - 1, y, 'u')
    buildingSet(grid, doorR - arch + 1, y, 'u')
  }
  buildingRun(grid, doorL - 1, doorR + 1, doorTop - 1, 'U')
  buildingRun(grid, doorL - 2, doorR + 2, doorBottom + 1, 'K')

  // ---- Drying herbs hanging beside the doorway.
  const herbTop = 58
  buildingRun(grid, 44, 52, herbTop, 'u')
  buildingRun(grid, 44, 52, herbTop + 1, 'U')
  for (const hx of [46, 50]) {
    buildingSet(grid, hx, herbTop + 2, 'u')
    for (let y = herbTop + 3; y <= herbTop + 12; y++) {
      const spread = y > herbTop + 8 ? 1 : 0
      buildingSet(grid, hx - spread, y, 'g')
      buildingSet(grid, hx, y, 'G')
      buildingSet(grid, hx + spread, y, 'g')
    }
    buildingSet(grid, hx, herbTop + 13, 'g')
  }

  // ---- Rough stone footing.
  const foundTop = 88
  for (let y = foundTop; y < H; y++) {
    const row = y - foundTop
    for (let x = 4; x <= 59; x++) {
      const inStone = (x + (row % 2) * 4) % 8
      let ch: string
      if (inStone === 0 || inStone === 7) ch = 'm'
      else if (inStone === 1) ch = 'K'
      else ch = 'k'
      if (y === foundTop) ch = 'K'
      if (y >= H - 3) ch = 'm'
      buildingSet(grid, x, y, ch)
    }
  }

  outlineSilhouette(grid)
  return grid.map((row) => row.join(''))
}

/** 64x96 native round mud hut (see `composeMudHut`). */
const MUD_HUT: PixelFrame = composeMudHut()

export const buildingSprites: {
  cottage: PixelSprite
  store: PixelSprite
  windmill: PixelSprite
  well: PixelSprite
  waterWheel: PixelSprite
  waterWheelHouse: PixelSprite
  house: PixelSprite
  hut: PixelSprite
  mudHut: PixelSprite
} = {
  cottage: { palette: COTTAGE_PALETTE, frames: [COTTAGE], frameMs: 1000 },
  store: { palette: STORE_PALETTE, frames: [STORE], frameMs: 1000 } as PixelSprite,
  windmill: { palette: WINDMILL_PALETTE, frames: WINDMILL_FRAMES, frameMs: 900 } as PixelSprite,
  well: { palette: WELL_PALETTE, frames: [WELL], frameMs: 1000 },
  waterWheel: { palette: WATER_WHEEL_PALETTE, frames: WATER_WHEEL_FRAMES, frameMs: 900 } as PixelSprite,
  waterWheelHouse: { palette: WATER_WHEEL_HOUSE_PALETTE, frames: WATER_WHEEL_HOUSE_FRAMES, frameMs: 900 } as PixelSprite,
  house: { palette: HOUSE_PALETTE, frames: [HOUSE], frameMs: 1000 },
  hut: { palette: HUT_PALETTE, frames: [HUT], frameMs: 1000 },
  mudHut: { palette: MUD_HUT_PALETTE, frames: [MUD_HUT], frameMs: 1000 },
}
