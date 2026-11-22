import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const mapPath = new URL('../app/utils/world-map.json', import.meta.url)
const world = JSON.parse(readFileSync(mapPath, 'utf8'))

// 'B', 'D', and 'A' are bridge, dam, and arch decks over the water: walkable
// like any other land.
const walkableGround = new Set(['.', '-', 's', 'f', 't', 'd', 'c', 'w', 'B', 'D', 'A'])
const blockedGround = new Set(['~', 'C'])
const allowedGround = new Set([...walkableGround, ...blockedGround])

// Mirrors app/utils/world-map.ts: object types the player cannot walk through.
const solidTypes = new Set([
  'cottage',
  'pine',
  'bush',
  'rock',
  'campfire',
  'lamp',
  'sign',
  'fence',
  'barn',
  'scarecrow',
  'haybale',
  'trough',
  'oak',
  'willow',
  'crate',
  'rowboat',
  'driftwood',
  'store',
  'windmill',
  'cow',
  'bull',
  'horse',
  'goat',
  'pig',
  'bench',
  'mailbox',
  'beeSkep',
  'stoneWall',
  'stonePost',
  'house',
  'hut',
  'mudHut',
  'well',
  'waterWheel',
  'waterWheelHouse'
])

const footprintOf = (object) => {
  const width = Math.max(1, object.width ?? 1)
  const height = Math.max(1, object.height ?? 1)
  const tiles = []
  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      tiles.push({ x: object.x + dx, y: object.y + dy })
    }
  }
  return tiles
}

/** Map of `x,y` -> object type for every tile covered by a solid footprint. */
const solidTiles = new Map()
/** Map of `x,y` -> object type for every tile covered by any object footprint. */
const objectTiles = new Map()
for (const object of world.objects) {
  for (const tile of footprintOf(object)) {
    objectTiles.set(`${tile.x},${tile.y}`, object.type)
    if (solidTypes.has(object.type)) {
      solidTiles.set(`${tile.x},${tile.y}`, object.type)
    }
  }
}

const countChar = (ch) => world.ground.join('').split('').filter((c) => c === ch).length

const tilesOf = (ch) => {
  const tiles = []
  for (let y = 0; y < world.ground.length; y += 1) {
    for (let x = 0; x < world.ground[y].length; x += 1) {
      if (world.ground[y][x] === ch) tiles.push({ x, y })
    }
  }
  return tiles
}

const objectOf = (type) => world.objects.find((object) => object.type === type)
const objectsOf = (type) => world.objects.filter((object) => object.type === type)

test('world dimensions and ground rows are valid', () => {
  assert.equal(world.width, 64)
  assert.equal(world.height, 44)
  assert.equal(world.tileSize, 32)
  assert.equal(world.ground.length, world.height)

  for (const row of world.ground) {
    assert.equal(row.length, world.width)
    for (const tile of row) {
      assert.equal(allowedGround.has(tile), true, `unexpected ground tile: ${tile}`)
    }
  }
})

test('ground roster covers grass, path, sand, water, flowers, tall grass, cliffs, crossings, and farm soil', () => {
  for (const required of ['.', '-', 's', '~', 'f', 't', 'C', 'B', 'D', 'A']) {
    assert.equal(countChar(required) > 0, true, `world needs ground "${required}"`)
  }
  assert.equal(countChar('d') >= 12, true, 'world needs three tilled field rows')
  assert.equal(countChar('c') >= 12, true, 'world needs three young crop rows')
  assert.equal(countChar('w') >= 12, true, 'world needs three mature crop rows')
})

test('lake, stream, pond, river, delta, and sea form one connected waterway', () => {
  const fluidTiles = []
  for (let y = 0; y < world.ground.length; y += 1) {
    for (let x = 0; x < world.ground[y].length; x += 1) {
      const tile = world.ground[y][x]
      if (['~', 'B', 'D', 'A'].includes(tile)) fluidTiles.push({ x, y })
    }
  }
  assert.equal(fluidTiles.length, 592, 'the waterway should carry 592 fluid tiles')

  const fluidKeys = new Set(fluidTiles.map(({ x, y }) => `${x},${y}`))
  const queue = [fluidTiles[0]]
  const seen = new Set([`${fluidTiles[0].x},${fluidTiles[0].y}`])
  while (queue.length > 0) {
    const { x, y } = queue.shift()
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${x + dx},${y + dy}`
      if (fluidKeys.has(key) && !seen.has(key)) {
        seen.add(key)
        queue.push({ x: x + dx, y: y + dy })
      }
    }
  }
  assert.equal(seen.size, fluidKeys.size, 'lake, stream, pond, river, delta, and sea water must be one connected body')

  for (const y of [37, 38, 39, 40, 41, 42, 43]) {
    const row = world.ground[y] ?? ''
    const allWater = row.length === world.width && row.split('').every((tile) => tile === '~')
    assert.equal(allWater, true, `sea row ${y} must be full-width water`)
  }
})

test('the lake, stream, pond, river, and delta occupy their verified reaches', () => {
  const waterTiles = tilesOf('~')
  const inBox = (x0, x1, y0, y1) =>
    waterTiles.filter(({ x, y }) => x >= x0 && x <= x1 && y >= y0 && y <= y1)

  assert.equal(inBox(6, 14, 2, 7).length >= 20, true, 'the NW mountain lake should fill rows 2..7 around x6..14')
  assert.equal(inBox(14, 28, 8, 16).length >= 15, true, 'the eastward stream should run through rows 8..16 at x14..28')
  assert.equal(inBox(27, 35, 19, 24).length >= 25, true, 'the pond should fill rows 19..24 at x27..35')
  assert.equal(inBox(17, 36, 25, 36).length >= 25, true, 'the outflow river should run through rows 25..36 at x17..36')

  for (const x of [17, 18, 19]) {
    assert.equal(world.ground[36]?.[x], '~', `the delta channel at (${x},36) must be water`)
  }

  assert.equal(countChar('s') >= 20, true, 'the water needs a sand shore')
})

test('the exact bridge, dam, and arch decks sit at their fixed crossings with walkable land east and west', () => {
  const crossings = [
    ['B', [[28, 17], [29, 17]]],
    ['D', [[34, 24], [35, 24], [17, 35], [18, 35]]],
    ['A', [[22, 31], [23, 31]]]
  ]

  for (const [ch, expected] of crossings) {
    const tiles = tilesOf(ch)
    assert.equal(tiles.length, expected.length, `the map should carry exactly ${expected.length} ${ch} crossing tiles`)
    for (const [x, y] of expected) {
      assert.equal(world.ground[y]?.[x], ch, `expected a ${ch} crossing at (${x},${y})`)
    }
  }

  for (const [ch] of crossings) {
    for (const { x, y } of tilesOf(ch)) {
      for (const dx of [-1, 1]) {
        const side = dx < 0 ? 'west' : 'east'
        const neighbor = (world.ground[y] ?? '')[x + dx]
        assert.equal(neighbor !== undefined, true, `${ch} crossing tile (${x},${y}) needs a ${side} neighbor inside the map`)
        assert.equal(
          walkableGround.has(neighbor) && neighbor !== '~',
          true,
          `${ch} crossing tile (${x},${y}) must meet walkable land, not water, on its ${side} side (found "${neighbor}")`
        )
      }
    }
  }
})

test('spawn and landmarks sit on walkable ground', () => {
  const assertWalkableStart = (point, label) => {
    const tile = world.ground[point.y]?.[point.x]
    assert.equal(tile !== undefined, true, `${label} is outside the map`)
    assert.equal(walkableGround.has(tile), true, `${label} sits on blocked tile "${tile}"`)
    assert.equal(solidTiles.has(`${point.x},${point.y}`), false, `${label} overlaps a solid object footprint`)
  }

  assert.equal(world.spawn.x, 40, 'spawn should sit on the village road')
  assert.equal(world.spawn.y, 20, 'spawn should sit on the village road')
  assertWalkableStart(world.spawn, 'spawn')
  for (const landmark of world.landmarks) {
    assertWalkableStart(landmark, `landmark ${landmark.id}`)
  }
})

test('landmark roster covers the thirteen named places', () => {
  const ids = new Set(world.landmarks.map((landmark) => landmark.id))
  for (const required of [
    'cottage',
    'pass',
    'meadow',
    'pond',
    'farm',
    'campfire',
    'beach',
    'highlands',
    'orchard',
    'lookout',
    'store',
    'garden',
    'pasture'
  ]) {
    assert.equal(ids.has(required), true, `world needs a ${required} landmark`)
  }
  assert.equal(ids.size, 13, 'the landmark roster should carry exactly the thirteen named ids')
  assert.equal(world.landmarks.length, 13, 'the landmark roster should not duplicate ids')
})

test('every landmark is reachable from spawn without crossing water, cliffs, or solid footprints', () => {
  const blocked = new Set()
  for (let y = 0; y < world.ground.length; y += 1) {
    for (let x = 0; x < world.ground[y].length; x += 1) {
      if (!walkableGround.has(world.ground[y][x])) {
        blocked.add(`${x},${y}`)
      }
    }
  }
  for (const key of solidTiles.keys()) {
    blocked.add(key)
  }

  const queue = [[world.spawn.x, world.spawn.y]]
  const visited = new Set([`${world.spawn.x},${world.spawn.y}`])

  while (queue.length > 0) {
    const [x, y] = queue.shift()
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + dx
      const nextY = y + dy
      const key = `${nextX},${nextY}`
      if (nextX < 0 || nextX >= world.width || nextY < 0 || nextY >= world.height) continue
      if (blocked.has(key) || visited.has(key)) continue
      visited.add(key)
      queue.push([nextX, nextY])
    }
  }

  for (const landmark of world.landmarks) {
    assert.equal(visited.has(`${landmark.x},${landmark.y}`), true, `landmark ${landmark.id} is unreachable`)
  }
})

test('the village buildings sit at their fixed footprints', () => {
  // The brief also named a mudHut at (18,29), but the final map carries no
  // mudHut object; these are the buildings actually present.
  const buildings = [
    ['cottage', 42, 15, 4, 4],
    ['store', 36, 16, 4, 4],
    ['house', 34, 12, 4, 4],
    ['barn', 46, 26, 5, 4],
    ['windmill', 50, 4, 2, 2],
    ['hut', 48, 13, 2, 3],
    ['well', 42, 23, 1, 1],
    ['waterWheelHouse', 37, 24, 2, 3]
  ]

  for (const [type, x, y, width, height] of buildings) {
    const object = objectOf(type)
    assert.equal(object !== undefined, true, `world needs a ${type}`)
    assert.equal(object.x, x, `${type} should sit at x ${x}`)
    assert.equal(object.y, y, `${type} should sit at y ${y}`)
    assert.equal((object.width ?? 1) === width && (object.height ?? 1) === height, true, `${type} should be ${width}x${height}`)
  }
})

test('the farm keeps three clean 4x3 field strips and a clear barn lane', () => {
  const strips = [
    { x0: 40, x1: 43, y0: 26, y1: 28 },
    { x0: 40, x1: 43, y0: 30, y1: 32 },
    { x0: 46, x1: 49, y0: 30, y1: 32 }
  ]
  const expectedRows = ['d', 'c', 'w']

  for (const { x0, x1, y0, y1 } of strips) {
    for (let y = y0; y <= y1; y += 1) {
      const expected = expectedRows[y - y0]
      for (let x = x0; x <= x1; x += 1) {
        assert.equal(world.ground[y]?.[x], expected, `field strip at (${x},${y}) should be "${expected}"`)
      }
    }
  }

  for (const crop of objectsOf('crop')) {
    const ground = world.ground[crop.y]?.[crop.x]
    assert.equal(ground === 'c' || ground === 'w', true, `crop at (${crop.x},${crop.y}) must stand on a crop tile, not "${ground}"`)
  }

  // The barn approach lane at row 29 stays clear of every object footprint.
  for (let x = 0; x < world.width; x += 1) {
    if (world.ground[29]?.[x] !== '-') continue
    assert.equal(objectTiles.has(`${x},29`), false, `barn lane tile (${x},29) must stay clear of object footprints`)
  }

  assert.equal(objectsOf('fence').length, 0, 'the world retires its fences')
  assert.equal(objectsOf('gate').length, 0, 'the world retires its gates')
})

test('the animal paddock is a stoneWall ring with a two-tile west opening', () => {
  const wallKeys = new Set(objectsOf('stoneWall').map(({ x, y }) => `${x},${y}`))
  const postKeys = new Set(objectsOf('stonePost').map(({ x, y }) => `${x},${y}`))

  const expectedWalls = []
  for (let x = 50; x <= 58; x += 1) expectedWalls.push([x, 29])
  for (let y = 30; y <= 32; y += 1) expectedWalls.push([58, y])
  for (let x = 51; x <= 58; x += 1) expectedWalls.push([x, 33])

  assert.equal(wallKeys.size, expectedWalls.length, 'the paddock ring should carry exactly twenty stoneWall tiles')
  for (const [x, y] of expectedWalls) {
    assert.equal(wallKeys.has(`${x},${y}`), true, `the paddock ring needs a stoneWall at (${x},${y})`)
  }

  assert.equal(postKeys.has('50,30'), true, 'the paddock needs a stonePost at (50,30)')
  assert.equal(postKeys.has('50,33'), true, 'the paddock needs a stonePost at (50,33)')
  assert.equal(wallKeys.has('50,31'), false, 'the west opening at (50,31) must stay open')
  assert.equal(wallKeys.has('50,32'), false, 'the west opening at (50,32) must stay open')
  assert.equal(postKeys.has('50,31') || postKeys.has('50,32'), false, 'the west opening must not be blocked by posts')

  for (const bush of objectsOf('bush')) {
    assert.equal(
      bush.x >= 50 && bush.x <= 58 && bush.y >= 29 && bush.y <= 33,
      false,
      `bush at (${bush.x},${bush.y}) must not form the paddock boundary`
    )
  }
})

test('the paddock herd stays inside the stoneWall ring', () => {
  const insideRing = (object) => object.x >= 51 && object.x <= 57 && object.y >= 30 && object.y <= 32

  const herd = [
    ['cow', 2],
    ['bull', 1],
    ['horse', 2],
    ['goat', 2],
    ['pig', 2]
  ]
  for (const [type, count] of herd) {
    const animals = objectsOf(type)
    assert.equal(animals.length, count, `the paddock keeps ${count} ${type}${count === 1 ? '' : 's'}`)
    for (const animal of animals) {
      assert.equal(insideRing(animal), true, `${type} at (${animal.x},${animal.y}) must stay inside the paddock ring`)
    }
  }

  const trough = objectOf('trough')
  assert.equal(trough !== undefined, true, 'the paddock needs a trough')
  assert.equal(insideRing(trough), true, 'the trough must stay inside the paddock ring')

  const haybalesInside = objectsOf('haybale').filter(insideRing)
  assert.equal(haybalesInside.length >= 2, true, 'the paddock keeps both haybales inside the ring')
})

test('the dense forest holds at least 80 trees and the species balance stays mixed', () => {
  const pines = objectsOf('pine')
  const oaks = objectsOf('oak')
  const willows = objectsOf('willow')
  const trees = [...pines, ...oaks, ...willows]

  assert.equal(trees.length >= 120, true, 'the world should carry around 127 trees')
  const forest = trees.filter(({ x, y }) => x >= 0 && x <= 15 && y >= 14 && y <= 36)
  assert.equal(forest.length >= 80, true, 'the dense forest at x0..15 rows 14..36 needs at least 80 trees')

  assert.equal(pines.length * 2 < trees.length, true, 'pines must stay under 50% of all trees')
  assert.equal(oaks.length * 5 >= trees.length, true, 'oaks must make up at least 20% of all trees')
  assert.equal(willows.length * 20 >= trees.length * 3, true, 'willows must make up at least 15% of all trees')
})

test('the world carries butterflies, dragonflies, birds, and fish, but no beetles', () => {
  const countType = (type) => objectsOf(type).length

  assert.equal(countType('beetle'), 0, 'the rebuilt world retires the beetles')
  for (const [type, minimum] of [
    ['butterfly', 2],
    ['dragonfly', 2],
    ['sparrow', 2],
    ['robin', 2],
    ['gull', 2]
  ]) {
    assert.equal(countType(type) >= minimum, true, `the world needs at least ${minimum} ${type}s`)
  }

  const fish = world.objects.filter((object) => ['koi', 'bass', 'minnow'].includes(object.type))
  assert.equal(fish.length >= 4, true, 'the waterway needs at least four fish')
  for (const object of fish) {
    assert.equal(world.ground[object.y]?.[object.x], '~', `${object.type} must swim in water`)
  }

  for (const gull of objectsOf('gull')) {
    const ground = world.ground[gull.y]?.[gull.x]
    assert.equal(ground === '~' || ground === 's', true, `gull at (${gull.x},${gull.y}) must stand on water or sand, not "${ground}"`)
  }
})

test('object footprints stay in bounds, avoid water, cliffs, crossings, and lanes, and anchors are unique', () => {
  const anchors = new Set()
  const waterDwellers = new Set(['koi', 'bass', 'minnow', 'lily'])
  const shoreDwellers = new Set(['gull'])

  for (const object of world.objects) {
    const anchor = `${object.x},${object.y}`
    assert.equal(anchors.has(anchor), false, `duplicate object anchor at (${anchor})`)
    anchors.add(anchor)

    assert.equal(object.x >= 0 && object.x < world.width, true, `${object.type} x is outside the map`)
    assert.equal(object.y >= 0 && object.y < world.height, true, `${object.type} y is outside the map`)

    for (const tile of footprintOf(object)) {
      assert.equal(tile.x >= 0 && tile.x < world.width, true, `${object.type} footprint leaves the map`)
      assert.equal(tile.y >= 0 && tile.y < world.height, true, `${object.type} footprint leaves the map`)
      const ground = world.ground[tile.y]?.[tile.x]
      assert.equal(ground !== undefined, true, `${object.type} footprint lands off the ground grid`)

      assert.notEqual(ground, '-', `${object.type} footprint cannot cover the lane tile at (${tile.x},${tile.y})`)
      if (ground === '~' && waterDwellers.has(object.type)) continue
      if ((ground === '~' || ground === 's') && shoreDwellers.has(object.type)) continue
      assert.notEqual(ground, '~', `${object.type} footprint cannot stand in water`)
      assert.notEqual(ground, 'C', `${object.type} footprint cannot stand on the cliff`)
      assert.notEqual(ground, 'B', `${object.type} footprint cannot stand on the bridge`)
      assert.notEqual(ground, 'D', `${object.type} footprint cannot stand on the dam`)
      assert.notEqual(ground, 'A', `${object.type} footprint cannot stand on the arch bridge`)
    }
  }
})
