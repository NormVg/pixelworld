/**
 * Shared composer utilities for the native-resolution pixel sprites.
 *
 * These helpers build and outline character grids; they hold no sprite
 * data of their own. Buildings and farm props both compose from here so
 * every sprite shares the same grid bounds, deterministic noise, and
 * one-pixel silhouette outline.
 */

import type { PixelFrame } from '~/utils/pixel-sprite-types'

/** Blank grid at a building's native resolution. */
export function emptyBuildingGrid(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => '.'))
}

/** Bounded pixel set for the building composers. */
export function buildingSet(grid: string[][], x: number, y: number, ch: string): void {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) grid[y][x] = ch
}

/** Fill one horizontal run, inclusive. */
export function buildingRun(grid: string[][], x0: number, x1: number, y: number, ch: string): void {
  for (let x = x0; x <= x1; x++) buildingSet(grid, x, y, ch)
}

/** Deterministic per-cell noise in [0, n); stable across loads, no rng state. */
export function cellNoise(x: number, y: number, n: number): number {
  const v = Math.imul(x * 73856093, 31) ^ Math.imul(y * 19349663, 17)
  return Math.abs(v) % n
}

/** One-pixel outline around every silhouette edge, like the rest of the bank. */
export function outlineSilhouette(grid: string[][]): void {
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

/** Rotate a literal pixel frame 90 degrees, preserving its palette mapping. */
export function transposeFrame(frame: PixelFrame): PixelFrame {
  const width = frame[0]?.length ?? 0
  const rows: string[] = []
  for (let x = 0; x < width; x += 1) {
    rows.push(frame.map((row) => row.charAt(x)).join(''))
  }
  return rows
}
