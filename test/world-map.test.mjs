import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const mapPath = new URL('../app/utils/world-map.json', import.meta.url)
const world = JSON.parse(readFileSync(mapPath, 'utf8'))

// 'B', 'D', and 'A' are bridge, dam, and arch decks over the river: walkable
// like any other land.
const walkableGround = new Set(['.', '-', 's', 'f', 't', 'd', 'c', 'w', 'B', 'D', 'A'])
const blockedGround = new Set(['~', 'C'])
const allowedGround = new Set([...walkableGround, ...blockedGround])
const solidTypes = new Set([
  'cottage',
  'pine',
  'bush',
  'rock',
  'campfire',
  'lamp',
  'sign',
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
  'windmill'
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
for (const object of world.objects) {
  if (!solidTypes.has(object.type)) continue
  for (const tile of footprintOf(object)) {
    solidTiles.set(`${tile.x},${tile.y}`, object.type)
  }
}

const countChar = (ch) => world.ground.join('').split('').filter((c) => c === ch).length

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

test('ground roster covers grass, path, sand, water, flowers, tall grass, cliffs, bridge, and farm soil', () => {
  for (const required of ['.', '-', 's', '~', 'f', 't', 'C', 'B']) {
    assert.equal(countChar(required) > 0, true, `world needs ground "${required}"`)
  }
  assert.equal(countChar('d') >= 20, true, 'world needs tilled soil rows in the farm')
  assert.equal(countChar('c') >= 20, true, 'world needs young crop rows')
  assert.equal(countChar('w') >= 20, true, 'world needs mature crop rows')
})

test('cliff band segments rows 11..13 into broken terraces with passes, and the west bluff face shows at row 34', () => {
  // No row may become a full-width wall: the broken massifs and the shifted
  // band both stay at or below 40 cliff tiles.
  for (let y = 0; y < world.ground.length; y += 1) {
    const count = ((world.ground[y] ?? '').match(/C/g) ?? []).length
    assert.equal(count <= 40, true, `row ${y} must not become a full-width cliff wall (${count} C tiles)`)
  }

  // The segmented band keeps three broken terrace rows, each with a path pass.
  for (const y of [11, 12, 13]) {
    const row = world.ground[y] ?? ''
    assert.equal((row.match(/C/g) ?? []).length >= 12, true, `row ${y} must keep a broken terrace of at least 12 cliff tiles`)
    assert.equal(row.includes('-'), true, `row ${y} must keep a path pass through it`)
  }

  // The named passes stay open: the western stream pass and the eastern
  // walking pass both cut through the band.
  for (const y of [11, 12, 13]) {
    for (const x of [17, 18, 41, 42]) {
      assert.notEqual(world.ground[y]?.[x], 'C', `cliff pass at (${x},${y}) must stay open`)
    }
  }

  // A terrace or bluff face row shows a shorter cliff run, distinct from the tall band.
  const faceCounts = world.ground
    .map((row) => ((row ?? '').match(/C/g) ?? []).length)
    .filter((count) => count > 0 && count < 30)
  assert.equal(faceCounts.length >= 1, true, 'the world needs a terrace or bluff face row')
  assert.equal(faceCounts[0] >= 8, true, 'the first face row must be a visible bluff of at least 8 cliff tiles')

  // The west bluff shifted with the old terrain and still shows at row 34.
  const bluffCount = (world.ground[34]?.match(/C/g) ?? []).length
  assert.equal(bluffCount > 0 && bluffCount < 30, true, 'row 34 must keep the west bluff face')
  assert.equal(bluffCount >= 8, true, 'the west bluff face must stay at least 8 cliff tiles wide')
})

test('lake, stream, pond, river, bridge, and sea form one connected waterway with a sandy shore', () => {
  const waterTiles = []
  const fluidTiles = []
  for (let y = 0; y < world.ground.length; y += 1) {
    for (let x = 0; x < world.ground[y].length; x += 1) {
      const tile = world.ground[y][x]
      if (tile === '~') waterTiles.push({ x, y })
      if (['~', 'B', 'D', 'A'].includes(tile)) fluidTiles.push({ x, y })
    }
  }
  assert.equal(fluidTiles.length > 0, true, 'the world needs water')

  // The mountain lake fills the highland basin at x18..27 rows 2..5.
  const lakeTiles = waterTiles.filter(({ x, y }) => x >= 18 && x <= 27 && y >= 2 && y <= 5)
  assert.equal(lakeTiles.length >= 20, true, 'the highlands need a mountain lake at x18..27 rows 2..5')

  // The pond keeps a substantial body of water around rows 17..23.
  const pondTiles = waterTiles.filter(({ y }) => y >= 17 && y <= 23)
  assert.equal(pondTiles.length >= 40, true, 'the pond should keep at least 40 water tiles')
  const pondRows = new Set(pondTiles.map(({ y }) => y))
  assert.equal(pondRows.size >= 5, true, 'the pond should spread across several rows around rows 17..23')

  // The sea in the south is full-width water across rows 37..39.
  for (const y of [37, 38, 39]) {
    const row = world.ground[y] ?? ''
    const allWater = row.length === world.width && row.split('').every((tile) => tile === '~')
    assert.equal(allWater, true, `sea row ${y} must be full-width water`)
  }

  // The stream and river carry water through every row from the highlands
  // down to the sea; the bridge, dam, and arch decks count as water here too.
  const waterInRow = (y) =>
    (world.ground[y] ?? '').split('').filter((tile) => ['~', 'B', 'D', 'A'].includes(tile)).length
  for (let y = 6; y <= 36; y += 1) {
    assert.equal(waterInRow(y) >= 1, true, `the stream and river must carry water through row ${y}`)
  }

  // All water forms one connected body. The bridge, dam, and arch decks sit over
  // the river and the river flows beneath them, so crossing tiles count as water
  // here: seeded from a water tile, the flood must reach every '~', 'B', 'D', and
  // 'A' in the world.
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
  assert.equal(seen.size, fluidKeys.size, 'lake, stream, pond, river, bridge, and sea water must be one connected body')

  assert.equal(countChar('s') >= 20, true, 'the water needs a sand shore along the lake, pond, river, and beach')
})

test('the river carries the exact bridge, dam, and arch crossings with walkable land east and west of every crossing tile', () => {
  const crossingTiles = (ch) => {
    const tiles = []
    for (let y = 0; y < world.ground.length; y += 1) {
      for (let x = 0; x < world.ground[y].length; x += 1) {
        if (world.ground[y][x] === ch) tiles.push({ x, y })
      }
    }
    return tiles
  }

  const crossings = [
    ['B', [[33, 16], [42, 27], [43, 27]]],
    ['D', [[41, 24], [42, 24], [43, 35], [44, 35]]],
    ['A', [[43, 31], [44, 31]]]
  ]

  for (const [ch, expected] of crossings) {
    const tiles = crossingTiles(ch)
    assert.equal(tiles.length, expected.length, `the map should carry exactly ${expected.length} ${ch} crossing tiles`)
    for (const [x, y] of expected) {
      assert.equal(world.ground[y]?.[x], ch, `expected a ${ch} crossing at (${x},${y})`)
    }
  }

  for (const [ch] of crossings) {
    for (const { x, y } of crossingTiles(ch)) {
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

test('the river meanders through the reach rows 25..36 instead of running straight', () => {
  const riverXs = new Set()
  for (let y = 25; y <= 36; y += 1) {
    const row = world.ground[y] ?? ''
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '~') riverXs.add(x)
    }
  }

  const xs = [...riverXs]
  assert.equal(xs.length >= 5, true, 'the river reach should touch at least five distinct columns')
  assert.equal(Math.max(...xs) - Math.min(...xs) >= 5, true, 'the river reach should span at least five columns')
  assert.equal(xs.some((x) => x > 45), true, 'the river should bow east of column 45 somewhere in rows 25..36')
  assert.equal(xs.some((x) => x < 41), true, 'the river should bow west of column 41 somewhere in rows 25..36')
})

test('spawn and landmarks sit on walkable ground', () => {
  const assertWalkableStart = (point, label) => {
    const tile = world.ground[point.y]?.[point.x]
    assert.equal(tile !== undefined, true, `${label} is outside the map`)
    assert.equal(walkableGround.has(tile), true, `${label} sits on blocked tile "${tile}"`)
    assert.equal(solidTiles.has(`${point.x},${point.y}`), false, `${label} overlaps a solid object footprint`)
  }

  assert.equal(world.spawn.x, 28, 'spawn should sit on the shifted meadow road')
  assert.equal(world.spawn.y, 16, 'spawn should sit on the shifted meadow road')
  assertWalkableStart(world.spawn, 'spawn')
  for (const landmark of world.landmarks) {
    assertWalkableStart(landmark, `landmark ${landmark.id}`)
  }
})

test('landmark roster covers cottage, pass, meadow, pond, farm, campfire, beach, highlands, orchard, lookout, store, garden, and pasture', () => {
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

test('the farm retires its fences and gate, keeps the barn east and cottage west, and keeps its working objects', () => {
  assert.equal(world.objects.filter((object) => object.type === 'fence').length, 0, 'the farm fences are retired')
  assert.equal(world.objects.filter((object) => object.type === 'gate').length, 0, 'the farm gate is retired')

  const barn = world.objects.find((object) => object.type === 'barn')
  assert.equal(barn !== undefined, true, 'world needs a barn')
  assert.equal((barn.width ?? 1) === 5 && (barn.height ?? 1) === 4, true, 'the barn footprint should be 5x4')
  assert.equal(barn.x >= 45, true, 'the barn should anchor the east meadow at x >= 45')

  const cottage = world.objects.find((object) => object.type === 'cottage')
  assert.equal(cottage !== undefined, true, 'world needs a cottage')
  assert.equal((cottage.width ?? 1) === 4 && (cottage.height ?? 1) === 4, true, 'the cottage footprint should be 4x4')
  assert.equal(cottage.x <= 14, true, 'the cottage should stay near the west side of the map')

  for (const type of ['scarecrow', 'haybale', 'trough', 'chicken', 'crop']) {
    assert.equal(world.objects.some((object) => object.type === type), true, `the farm keeps its ${type}`)
  }
})

test('the village store is a 4x4 solid building with a door stub onto the road', () => {
  const store = world.objects.find((object) => object.type === 'store')
  assert.equal(store !== undefined, true, 'world needs a store')
  assert.equal((store.width ?? 1) === 4 && (store.height ?? 1) === 4, true, 'the store footprint should be 4x4')
  assert.equal(store.x <= 14, true, 'the store should sit on the west side of the village')
  assert.equal(solidTypes.has(store.type), true, 'the store must be a solid object')

  for (const tile of footprintOf(store)) {
    assert.equal(tile.x >= 0 && tile.x < world.width, true, 'store footprint leaves the map')
    assert.equal(tile.y >= 0 && tile.y < world.height, true, 'store footprint leaves the map')
    const ground = world.ground[tile.y]?.[tile.x]
    assert.equal(ground !== undefined, true, 'store footprint lands off the ground grid')
    assert.notEqual(ground, '~', 'store footprint cannot stand in water')
    assert.notEqual(ground, 'C', 'store footprint cannot stand on the cliff')
    assert.notEqual(ground, 'B', 'store footprint cannot stand on the bridge')
  }

  // The store's single door stub opens onto the row-18 lane; (10,17) is inside
  // the cottage footprint, so it is not part of the approach.
  assert.equal(world.ground[18]?.[10], '-', 'store door stub at (10,18) must be a path tile')
  assert.equal(solidTiles.has('10,18'), false, 'store door stub at (10,18) must stay walkable')

  // The lane runs along row 18 from x8 to x16, then turns north to the row-16 road.
  for (let x = 8; x <= 16; x += 1) {
    assert.equal(world.ground[18]?.[x], '-', `store lane at (${x},18) must be a path tile`)
  }
  assert.equal(world.ground[17]?.[16], '-', 'the store lane must connect to the row-16 road at (16,17)')
  assert.equal(world.ground[16]?.[16], '-', 'the store lane must connect to the row-16 road at (16,16)')

  // The cottage owns rows 14..17 at x9..12; no path tile may cut through it.
  for (let y = 14; y <= 17; y += 1) {
    for (let x = 9; x <= 12; x += 1) {
      assert.notEqual(world.ground[y]?.[x], '-', `cottage footprint at (${x},${y}) must not be a path tile`)
    }
  }
})

test('the windmill stands 2x2 in the highlands with a clean footprint', () => {
  const windmill = world.objects.find((object) => object.type === 'windmill')
  assert.equal(windmill !== undefined, true, 'world needs a windmill')
  assert.equal((windmill.width ?? 1) === 2 && (windmill.height ?? 1) === 2, true, 'the windmill footprint should be 2x2')
  assert.equal(windmill.y <= 10, true, 'the windmill should stand in the highlands at y <= 10')
  assert.equal(solidTypes.has(windmill.type), true, 'the windmill must be a solid object')

  for (const tile of footprintOf(windmill)) {
    assert.equal(tile.x >= 0 && tile.x < world.width, true, 'windmill footprint leaves the map')
    assert.equal(tile.y >= 0 && tile.y < world.height, true, 'windmill footprint leaves the map')
    const ground = world.ground[tile.y]?.[tile.x]
    assert.equal(ground !== undefined, true, 'windmill footprint lands off the ground grid')
    assert.notEqual(ground, '~', 'windmill footprint cannot stand in water')
    assert.notEqual(ground, 'C', 'windmill footprint cannot stand on the cliff')
    assert.notEqual(ground, 'B', 'windmill footprint cannot stand on the bridge')
  }
})

test('the dense forest corner holds at least 18 pines and oaks, and the species balance stays mixed', () => {
  const pines = world.objects.filter((object) => object.type === 'pine')
  const oaks = world.objects.filter((object) => object.type === 'oak')
  const willows = world.objects.filter((object) => object.type === 'willow')
  const trees = [...pines, ...oaks, ...willows]

  const denseForest = [...pines, ...oaks].filter(({ x, y }) => x >= 52 && y >= 12 && y <= 31)
  assert.equal(denseForest.length >= 18, true, 'the forest corner at x >= 52 rows 12..31 needs at least 18 pines and oaks')

  assert.equal(pines.length * 2 <= trees.length, true, 'pines must stay at or below 50% of all trees')
  assert.equal(oaks.length * 5 >= trees.length, true, 'oaks must make up at least 20% of all trees')
  assert.equal(willows.length * 20 >= trees.length * 3, true, 'willows must make up at least 15% of all trees')

  assert.equal(pines.some(({ y }) => y === 10), true, 'pines should back the shifted meadow edge at y === 10')
  assert.equal(pines.some(({ y }) => y >= 31), true, 'pines should stand in the shifted southern rows at y >= 31')
  const eastColumns = new Set(pines.filter(({ x }) => x >= 45).map(({ x }) => x))
  assert.equal(eastColumns.size >= 2, true, 'east-side pines should stagger across at least two columns at x >= 45')
})

test('the world carries butterflies, dragonflies, birds, and fish, but no beetles', () => {
  const countType = (type) => world.objects.filter((object) => object.type === type).length

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

  const fish = world.objects.filter((object) => ['koi', 'bass', 'minnow', 'fish'].includes(object.type))
  assert.equal(fish.length >= 4, true, 'the waterway needs at least four fish')
  for (const object of fish) {
    assert.equal(world.ground[object.y]?.[object.x], '~', `${object.type} must swim in water`)
  }
})

test('object footprints stay in bounds, solid footprints avoid water, cliffs, and the bridge, and anchors are unique', () => {
  const anchors = new Set()
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

      if (!solidTypes.has(object.type)) continue
      assert.notEqual(ground, '~', `${object.type} footprint cannot stand in water`)
      assert.notEqual(ground, 'C', `${object.type} footprint cannot stand on the cliff`)
      assert.notEqual(ground, 'B', `${object.type} footprint cannot stand on the bridge`)
    }
  }
})
