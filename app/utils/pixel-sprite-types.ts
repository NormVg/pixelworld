export type PixelPalette = Record<string, string>
export type PixelFrame = readonly string[]

export interface PixelSprite {
  palette: PixelPalette
  frames: readonly PixelFrame[]
  frameMs: number
}
