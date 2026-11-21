import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const mapPath = new URL('../app/utils/world-map.json', import.meta.url)
const world = JSON.parse(readFileSync(mapPath, 'utf8'))

// 'B' is bridge deck over the river: walkable like any other land.
const walkableGround = new Set(['.', '-', 's', 'f', 't', 'd', 'c', 'w', 'B'])
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
  'fence',
  'barn',
  'scarecrow',
  'haybale',
  'trough',
  'oak',
  'willow',
  'crate',
  'rowboat',
  'driftwood'
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
  assert.equal(world.width, 48)
  assert.equal(world.height, 32)
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

test('cliff band stacks near-full rows 3..5 with a pass, and a bluff face shows below it', () => {
  const cliffRows = world.ground
    .map((row, y) => ({ count: ((row ?? '').match(/C/g) ?? []).length, row: row ?? '', y }))
    .filter(({ count }) => count >= 30)

  assert.equal(cliffRows.length >= 3, true, 'world needs a cliff band of at least three near-full rows')
  for (const { row } of cliffRows) {
    assert.equal(row.includes('-'), true, 'every cliff band row needs a path pass through it')
  }

  // The band rows must stack vertically so the vertical face reads as height.
  const bandYs = cliffRows.map(({ y }) => y).sort((a, b) => a - b)
  const stacked = bandYs.some((y, index) => index > 0 && y === bandYs[index - 1] + 1)
  assert.equal(stacked, true, 'cliff band rows must stack vertically')

  // The band itself sits at rows 3..5, right below the meadow.
  for (const y of [3, 4, 5]) {
    const row = world.ground[y] ?? ''
    assert.equal((row.match(/C/g) ?? []).length >= 30, true, `row ${y} must be a near-full cliff row`)
    assert.equal(row.includes('-'), true, `row ${y} must keep a path pass through it`)
  }

  // A terrace or bluff face row shows a shorter cliff run, distinct from the tall band.
  const faceCounts = world.ground
    .map((row) => ((row ?? '').match(/C/g) ?? []).length)
    .filter((count) => count > 0 && count < 30)
  assert.equal(faceCounts.length >= 1, true, 'the world needs a terrace or bluff face row')
  assert.equal(faceCounts[0] >= 8, true, 'the first face row must be a visible bluff of at least 8 cliff tiles')
})

test('pond, river, and sea form one connected waterway with a sandy shore', () => {
  const waterTiles = []
  for (let y = 0; y < world.ground.length; y += 1) {
    for (let x = 0; x < world.ground[y].length; x += 1) {
      if (world.ground[y][x] === '~') waterTiles.push({ x, y })
    }
  }

  // The pond keeps a substantial body of water around rows 9..15.
  const pondTiles = waterTiles.filter(({ y }) => y >= 9 && y <= 15)
  assert.equal(pondTiles.length >= 40, true, 'the pond should keep at least 40 water tiles')
  const pondRows = new Set(pondTiles.map(({ y }) => y))
  assert.equal(pondRows.size >= 5, true, 'the pond should spread across several rows around rows 9..15')

  // The sea in the south is full-width water across rows 29..31.
  for (const y of [29, 30, 31]) {
    const row = world.ground[y] ?? ''
    const allWater = row.length === world.width && row.split('').every((tile) => tile === '~')
    assert.equal(allWater, true, `sea row ${y} must be full-width water`)
  }

  // The river runs south from the pond to the sea, carrying water through
  // every row in between; the bridge deck row is the river flowing beneath
  // the deck, so it counts as water here too.
  const waterInRow = (y) =>
    (world.ground[y] ?? '').split('').filter((tile) => tile === '~' || tile === 'B').length
  for (let y = 16; y <= 28; y += 1) {
    assert.equal(waterInRow(y) >= 1, true, `the river must carry water through row ${y}`)
  }

  // Somewhere along the run the river is a narrow channel, roughly two tiles wide.
  let narrowRun = 0
  let longestNarrowRun = 0
  for (let y = 16; y <= 28; y += 1) {
    const width = waterInRow(y)
    if (width >= 1 && width <= 3) {
      narrowRun += 1
      longestNarrowRun = Math.max(longestNarrowRun, narrowRun)
    } else {
      narrowRun = 0
    }
  }
  assert.equal(longestNarrowRun >= 2, true, 'the river should run narrow, about two tiles wide, for a vertical stretch')

  // The river bends on its way south instead of dropping straight down one fixed column pair.
  const riverColumnSets = new Set()
  for (let y = 16; y <= 28; y += 1) {
    const columns = (world.ground[y] ?? '')
      .split('')
      .map((tile, x) => (tile === '~' ? x : -1))
      .filter((x) => x >= 0)
      .join(',')
    if (columns.length > 0) riverColumnSets.add(columns)
  }
  assert.equal(riverColumnSets.size >= 2, true, 'the river should bend somewhere between the pond and the sea')

  // All water forms one connected body. The bridge deck sits over the river and
  // the river flows beneath it, so deck tiles count as water here: seeded from
  // a water tile, the flood must reach every '~' and every 'B' in the world.
  const fluidTiles = []
  for (let y = 0; y < world.ground.length; y += 1) {
    for (let x = 0; x < world.ground[y].length; x += 1) {
      const tile = world.ground[y][x]
      if (tile === '~' || tile === 'B') fluidTiles.push({ x, y })
    }
  }
  const fluidKeys = new Set(fluidTiles.map(({ x, y }) => `${x},${y}`))
  const queue = [waterTiles[0]]
  const seen = new Set([`${waterTiles[0].x},${waterTiles[0].y}`])
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
  assert.equal(seen.size, fluidKeys.size, 'pond, river, bridge, and sea water must be one connected body')

  assert.equal(countChar('s') >= 20, true, 'the water needs a sand shore along the pond, river, and beach')
})

test('the river carries a bridge with walkable land east and west of every deck tile', () => {
  const bridgeTiles = []
  for (let y = 0; y < world.ground.length; y += 1) {
    for (let x = 0; x < world.ground[y].length; x += 1) {
      if (world.ground[y][x] === 'B') bridgeTiles.push({ x, y })
    }
  }

  assert.equal(bridgeTiles.length >= 2, true, 'the river needs at least two bridge deck tiles')

  for (const { x, y } of bridgeTiles) {
    for (const dx of [-1, 1]) {
      const side = dx < 0 ? 'west' : 'east'
      const neighbor = (world.ground[y] ?? '')[x + dx]
      assert.equal(neighbor !== undefined, true, `bridge tile (${x},${y}) needs a ${side} neighbor inside the map`)
      assert.equal(
        walkableGround.has(neighbor) && neighbor !== '~',
        true,
        `bridge tile (${x},${y}) must meet walkable land, not water, on its ${side} side (found "${neighbor}")`
      )
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

  assert.equal(world.spawn.x, 20, 'spawn should stay at the meadow clearing')
  assert.equal(world.spawn.y, 8, 'spawn should stay at the meadow clearing')
  assertWalkableStart(world.spawn, 'spawn')
  for (const landmark of world.landmarks) {
    assertWalkableStart(landmark, `landmark ${landmark.id}`)
  }
})

test('landmark roster covers cottage, pass, meadow, pond, farm, campfire, and the beach', () => {
  const ids = new Set(world.landmarks.map((landmark) => landmark.id))
  for (const required of ['cottage', 'pass', 'meadow', 'pond', 'farm', 'campfire', 'beach']) {
    assert.equal(ids.has(required), true, `world needs a ${required} landmark`)
  }
})

test('solid objects and their footprints stay in bounds and off water, cliffs, and the bridge', () => {
  for (const object of world.objects) {
    assert.equal(object.x >= 0 && object.x < world.width, true, `${object.type} x is outside the map`)
    assert.equal(object.y >= 0 && object.y < world.height, true, `${object.type} y is outside the map`)

    if (!solidTypes.has(object.type)) continue

    for (const tile of footprintOf(object)) {
      assert.equal(tile.x >= 0 && tile.x < world.width, true, `${object.type} footprint leaves the map`)
      assert.equal(tile.y >= 0 && tile.y < world.height, true, `${object.type} footprint leaves the map`)
      const ground = world.ground[tile.y]?.[tile.x]
      assert.equal(ground !== undefined, true, `${object.type} footprint lands off the ground grid`)
      assert.notEqual(ground, '~', `${object.type} footprint cannot stand in water`)
      assert.notEqual(ground, 'C', `${object.type} footprint cannot stand on the cliff`)
      assert.notEqual(ground, 'B', `${object.type} footprint cannot stand on the bridge`)
    }
  }
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

test('pines stagger along the east border, the meadow edge, and the southern rows', () => {
  const pines = world.objects.filter((object) => object.type === 'pine')

  // The east border zigzags between the outer columns at the wider map edge.
  const eastBorderXs = new Set(pines.filter(({ x }) => x >= 45).map(({ x }) => x))
  assert.equal(eastBorderXs.size >= 2, true, 'the east border should stagger pines across at least two columns at x >= 45')

  // Trees stand at the meadow edge so their canopies lean over the cliff top.
  assert.equal(pines.some(({ y }) => y === 2), true, 'pines should back the meadow edge above the cliff')

  // Trees stand along the southern rows above the sea.
  assert.equal(pines.some(({ y }) => y >= 23), true, 'pines should stand in the southern rows')
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

test('the barn anchors the east meadow, the cottage keeps the west, and oaks and willows grow', () => {
  const barn = world.objects.find((object) => object.type === 'barn')
  assert.equal(barn !== undefined, true, 'world needs a barn')
  assert.equal((barn.width ?? 1) === 5 && (barn.height ?? 1) === 4, true, 'the barn footprint should be 5x4')
  assert.equal(barn.x >= 38, true, 'the barn should anchor the east meadow at x >= 38')

  const cottage = world.objects.find((object) => object.type === 'cottage')
  assert.equal(cottage !== undefined, true, 'world needs a cottage')
  assert.equal((cottage.width ?? 1) === 4 && (cottage.height ?? 1) === 4, true, 'the cottage footprint should be 4x4')
  assert.equal(cottage.x <= 16, true, 'the cottage should stay near the west side of the map')

  assert.equal(world.objects.filter((object) => object.type === 'oak').length >= 1, true, 'the world needs at least one oak')
  assert.equal(world.objects.filter((object) => object.type === 'willow').length >= 2, true, 'the pond needs at least two willows')
})
