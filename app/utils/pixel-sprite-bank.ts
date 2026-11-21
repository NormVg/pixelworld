/**
 * High-resolution sprite bank for Willow Hollow.
 *
 * This module is the single integration point between the specialized
 * 32px sprite modules and the renderer. It keeps the renderer's existing
 * `terrainSprites`, `propSprites`, and `playerSprites` contracts while
 * replacing the old 16px bank with native 32px art.
 */

import { terrainSpriteSet as baseTerrainSprites } from '~/utils/pixel-sprite-terrain'
import { waterSprites } from '~/utils/pixel-sprite-water'
import { cliffSprites } from '~/utils/pixel-sprite-cliff'
import { grassSprites } from '~/utils/pixel-sprite-grass'
import { playerSpriteSet } from '~/utils/pixel-sprite-player'
import { fishSprites } from '~/utils/pixel-sprite-fish'
import { bugSprites } from '~/utils/pixel-sprite-bugs'
import { birdSprites } from '~/utils/pixel-sprite-birds'
import { farmSprites } from '~/utils/pixel-sprite-farm'
import { villageSprites } from '~/utils/pixel-sprite-village'
import { shoreSprites } from '~/utils/pixel-sprite-shore'
import { pineSprite } from '~/utils/pixel-sprite-tree-pine'
import { willowSprite } from '~/utils/pixel-sprite-tree-willow'
import { oakSprite } from '~/utils/pixel-sprite-tree-oak'
import { bushSprite } from '~/utils/pixel-sprite-tree-bush'
import { rockSprite } from '~/utils/pixel-sprite-tree-rock'
import { legacyPropSprites } from '~/utils/pixel-sprites'

export const terrainSprites = {
  ...baseTerrainSprites,

  // Organic grass cuts, selected per tile by the renderer's hash.
  grassA: grassSprites.a,
  grassB: grassSprites.b,
  grassC: grassSprites.c,
  grassD: grassSprites.d,
  grassE: grassSprites.e,

  // Native 32px water and shoreline overlays.
  water: waterSprites.base,
  waterEdgeN: waterSprites.edgeN,
  waterEdgeS: waterSprites.edgeS,
  waterEdgeE: waterSprites.edgeE,
  waterEdgeW: waterSprites.edgeW,
  waterCornerNE: waterSprites.cornerNE,
  waterCornerNW: waterSprites.cornerNW,
  waterCornerSE: waterSprites.cornerSE,
  waterCornerSW: waterSprites.cornerSW,

  // Tall cliff faces and their cap/rubble companions.
  cliffFace: cliffSprites.face,
  cliffTop: cliffSprites.top,
  cliffRubble: cliffSprites.rubble,

  // Farm ground.
  soil: farmSprites.soil,
  crops: farmSprites.crops
} as const

export const propSprites = {
  // Legacy props that are still small, cozy, and read well at 32px.
  ...legacyPropSprites,

  // Farm buildings and props.
  cottage: farmSprites.cottage,
  barn: farmSprites.barn,
  campfire: farmSprites.campfire,
  scarecrow: farmSprites.scarecrow,
  hayBale: farmSprites.hayBale,
  haybale: farmSprites.hayBale,
  chicken: farmSprites.chicken,
  waterTrough: farmSprites.waterTrough,
  trough: farmSprites.waterTrough,
  farmGate: farmSprites.farmGate,
  farmGateVertical: farmSprites.farmGateVertical,
  gate: farmSprites.farmGate,
  gateVertical: farmSprites.farmGateVertical,
  fence: farmSprites.fence,
  fenceVertical: farmSprites.fenceVertical,
  crop: farmSprites.crops,
  crops: farmSprites.crops,

  // Street props redrawn at native 32px; these override the legacy lamp/sign.
  lamp: villageSprites.lamp,
  sign: villageSprites.sign,

  // Shore props for the south beach and river mouth.
  driftwood: shoreSprites.driftwood,
  rowboat: shoreSprites.rowboat,
  crate: shoreSprites.crate,

  // Trees and undergrowth.
  pine: pineSprite,
  willow: willowSprite,
  oak: oakSprite,
  bush: bushSprite,
  rock: rockSprite,

  // Pond life.
  koi: fishSprites.koi,
  bass: fishSprites.bass,
  minnow: fishSprites.minnow,
  fish: fishSprites.koi,
  lily: legacyPropSprites.lily,

  // Bugs.
  butterfly: bugSprites.monarch,
  monarch: bugSprites.monarch,
  beetle: bugSprites.beetle,
  dragonfly: bugSprites.dragonfly,
  firefly: bugSprites.firefly,

  // Birds.
  bird: birdSprites.sparrow,
  sparrow: birdSprites.sparrow,
  robin: birdSprites.robin,
  gull: birdSprites.gull
} as const

export { playerSpriteSet as playerSprites }
