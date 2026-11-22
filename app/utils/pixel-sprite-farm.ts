/**
 * Native-resolution farm props for Willow Hollow.
 *
 * Every prop is authored at native pixel resolution and anchored at its
 * base row, so the renderer can y-sort it with the player and the rest of
 * the world. The shared grid, noise, and outline helpers live in
 * `pixel-sprite-compose`; this module owns only the farm prop palettes,
 * composers, and frame data.
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
import { buildingRun, buildingSet, cellNoise, emptyBuildingGrid, outlineSilhouette, transposeFrame } from '~/utils/pixel-sprite-compose'

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

/** Shared tilled-earth base: clods, a soft diagonal ridge, and pebbles. */
function drawSoilBase(grid: string[][]): void {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      let ch = 'd'
      const clod = cellNoise(x, y, 9)
      if (clod === 0) ch = 'h'
      else if (clod === 1) ch = 'S'
      else if (clod === 2) ch = 'f'
      // A soft diagonal furrow with gentle breaks; it wraps across tiles.
      const ridge = (y - x + 32) % 32
      if (ridge >= 9 && ridge <= 11) ch = cellNoise(x, y, 5) === 0 ? 'h' : 'S'
      else if (ridge === 12) ch = 'h'
      else if (ridge === 8) ch = 'f'
      if (cellNoise(x, y, 31) === 0) {
        ch = 'p'
        buildingSet(grid, x, y + 1, 'k')
      }
      buildingSet(grid, x, y, ch)
    }
  }
}

/** One leafy seedling: a short stem, two side leaves, and a top leaf. */
function drawCropPlant(grid: string[][], cx: number, baseY: number, height: number, ripe: boolean): void {
  for (let i = 0; i < height; i++) buildingSet(grid, cx, baseY - i, 'G')
  const leafY = baseY - Math.max(1, Math.floor(height / 2))
  buildingSet(grid, cx - 1, leafY, 'g')
  buildingSet(grid, cx - 2, leafY, 'l')
  buildingSet(grid, cx + 1, leafY, 'g')
  buildingSet(grid, cx + 2, leafY, 'l')
  buildingSet(grid, cx - 1, baseY - height, 'l')
  buildingSet(grid, cx, baseY - height, 'g')
  buildingSet(grid, cx + 1, baseY - height, 'l')
  if (ripe) {
    buildingSet(grid, cx - 1, baseY - height - 1, 'y')
    buildingSet(grid, cx, baseY - height - 1, 'Y')
    buildingSet(grid, cx + 1, baseY - height - 1, 'y')
    buildingSet(grid, cx, baseY - height - 2, 'b')
  }
}

/** Plant positions per growth stage: loose rows, denser each stage. */
const CROP_ROWS: ReadonlyArray<ReadonlyArray<readonly [number, number, number, boolean]>> = [
  [
    [6, 10, 3, false],
    [16, 9, 4, false],
    [26, 11, 3, false],
    [10, 22, 4, false],
    [20, 21, 3, false],
    [28, 23, 4, false]
  ],
  [
    [4, 9, 4, false],
    [12, 10, 5, false],
    [20, 8, 4, false],
    [28, 10, 5, false],
    [8, 21, 5, false],
    [16, 22, 4, false],
    [24, 20, 5, false],
    [29, 22, 4, false]
  ],
  [
    [3, 8, 5, false],
    [9, 10, 6, false],
    [16, 7, 5, false],
    [23, 9, 6, false],
    [29, 8, 5, false],
    [5, 20, 6, false],
    [12, 22, 5, false],
    [19, 19, 6, false],
    [26, 21, 5, false]
  ],
  [
    [3, 8, 6, true],
    [8, 10, 7, true],
    [14, 7, 6, true],
    [20, 9, 7, true],
    [26, 7, 6, true],
    [29, 9, 7, true],
    [4, 20, 7, true],
    [10, 22, 6, true],
    [16, 19, 7, true],
    [22, 21, 6, true],
    [28, 19, 7, true]
  ]
]

/** 32x32 crop stage: leafy seedlings in loose rows over tilled earth. */
function composeCropStage(stage: number): PixelFrame {
  const grid = emptyBuildingGrid(32, 32)
  drawSoilBase(grid)
  for (const [cx, baseY, height, ripe] of CROP_ROWS[stage] ?? []) {
    drawCropPlant(grid, cx, baseY, height, ripe)
  }
  return grid.map((row) => row.join(''))
}

/** Stage 1: sparse seedlings. */
const CROPS_STAGE_0: PixelFrame = composeCropStage(0)

/** Stage 2: young sprouts. */
const CROPS_STAGE_1: PixelFrame = composeCropStage(1)

/** Stage 3: mature leafy plants. */
const CROPS_STAGE_2: PixelFrame = composeCropStage(2)

/** Stage 4: ripe grain heads. */
const CROPS_STAGE_3: PixelFrame = composeCropStage(3)

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

/** 32x32 tilled soil: irregular clods, a soft diagonal furrow, and pebbles. */
const SOIL: PixelFrame = (() => {
  const grid = emptyBuildingGrid(32, 32)
  drawSoilBase(grid)
  return grid.map((row) => row.join(''))
})()

/**
 * 32x32 transparent sprout cluster: leafy seedlings on small soil mounds.
 * The farm grows its crops as props on grass, so no tile ever reads as a
 * brown block; only the plants and their little mounds are opaque.
 */
const SPROUT: PixelFrame = (() => {
  const grid = emptyBuildingGrid(32, 32)
  const plants: ReadonlyArray<readonly [number, number, number]> = [
    [6, 26, 8],
    [14, 24, 9],
    [22, 26, 8],
    [28, 28, 6],
    [10, 30, 6],
    [19, 30, 7],
    [26, 31, 5]
  ]
  for (const [cx, baseY, height] of plants) {
    // A three-pixel soil mound grounds the plant without tiling a block.
    buildingSet(grid, cx - 1, baseY + 1, 'f')
    buildingSet(grid, cx, baseY + 1, 'd')
    buildingSet(grid, cx + 1, baseY + 1, 'f')
    drawCropPlant(grid, cx, baseY, height, false)
  }
  return grid.map((row) => row.join(''))
})()

export const farmSprites: {
  barn: PixelSprite
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
  sprout: PixelSprite
} = {
  barn: { palette: BARN_PALETTE, frames: [BARN], frameMs: 1000 },
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
  sprout: { palette: CROPS_PALETTE, frames: [SPROUT], frameMs: 1000 },
}
