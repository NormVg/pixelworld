import worldMapData from './world-map.json'

/**
 * A prop or critter placed on the world grid.
 * `message` is optional interaction text shown near the object.
 * `width`/`height` are the optional footprint in tiles (default 1x1),
 * so large props like the barn can occupy several tiles.
 */
export interface WorldObject {
  type: string
  x: number
  y: number
  width?: number
  height?: number
  message?: string
}

/** A named place the player can walk to and discover. */
export interface Landmark {
  id: string
  x: number
  y: number
  label: string
}

interface SpawnPoint {
  x: number
  y: number
}

/** Shape of `app/utils/world-map.json`. */
interface WorldMapData {
  width: number
  height: number
  tileSize: number
  spawn: SpawnPoint
  ground: string[]
  objects: WorldObject[]
  landmarks: Landmark[]
}

/** The complete world definition, typed straight from the JSON. */
export const worldMap: WorldMapData = worldMapData

/** Object types the player cannot walk through. */
export const solidObjectTypes: Set<string> = new Set([
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

/** Walkable ground: grass, path, sand, flowers, tall grass, tilled soil, crops, and the wooden bridge deck over the river. */
const walkableGroundChars = new Set(['.', '-', 's', 'f', 't', 'd', 'c', 'w', 'B'])

/** True when the ground character can be walked on. Water and cliffs are not walkable. */
export function isWalkableTile(tile: string): boolean {
  return walkableGroundChars.has(tile)
}

/** A single tile position on the world grid. */
export interface Tile {
  x: number
  y: number
}

/**
 * Every tile an object covers, honoring its declared footprint.
 * Footprints default to 1x1 and are always at least one tile.
 */
export function getObjectFootprint(object: WorldObject): Tile[] {
  const width = Math.max(1, Math.floor(object.width ?? 1))
  const height = Math.max(1, Math.floor(object.height ?? 1))
  const tiles: Tile[] = []

  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      tiles.push({ x: object.x + dx, y: object.y + dy })
    }
  }

  return tiles
}

/**
 * Collision grid for the whole world: `true` marks a blocked tile,
 * i.e. water, a cliff, or any tile inside a solid object's footprint.
 */
export function createCollisionGrid(): boolean[][] {
  const grid: boolean[][] = worldMap.ground.map((row) =>
    Array.from(row, (tile) => !isWalkableTile(tile))
  )

  for (const object of worldMap.objects) {
    if (!solidObjectTypes.has(object.type)) continue

    for (const tile of getObjectFootprint(object)) {
      const gridRow = grid[tile.y]
      if (gridRow !== undefined && gridRow[tile.x] !== undefined) {
        gridRow[tile.x] = true
      }
    }
  }

  return grid
}

/** The landmark whose tile is exactly (x, y), if one lives there. */
export function getLandmarkAt(x: number, y: number): Landmark | undefined {
  return worldMap.landmarks.find((landmark) => landmark.x === x && landmark.y === y)
}
