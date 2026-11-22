import { getCurrentInstance, onBeforeUnmount, onMounted, type Ref } from 'vue'
import { useState } from '#imports'
import { createCollisionGrid, worldMap } from '~/utils/world-map'
import {
  configureUISounds,
  getAudioContext,
  isLoopPlaying,
  playUISound,
  registerLoop,
  registerSound,
  setLoopVolume,
  setMasterVolume,
  setUISoundsEnabled,
  startLoop,
  stopLoop,
  synthHelpers,
  warmUpAudio,
  type LoopControl,
  type LoopId,
  type SynthContext
} from '@thenormvg/web-have-sounds'

/**
 * The world's sound layer: a warm, quiet voice for the forest and its shore.
 *
 * Everything is synthesized through `@thenormvg/web-have-sounds` - no audio
 * files, no extra dependencies. The engine is configured once with the
 * `organic` feel (warm triangle waves) at an audible master level, then
 * six custom one-shots and four custom loops are registered:
 *
 *   `pw-move`      a soft grass footstep, throttled so held movement breathes
 *   `pw-rustle`    an occasional dry-leaf flick for crossing tall grass
 *   `pw-interact`  a friendly two-note "hm?" for talking to props and signs
 *   `pw-landmark`  a low, slow bell for arriving somewhere new
 *   `pw-beach`     a lighter shell-chime for the shore
 *   `pw-cat-meow`  the cat's small two-phase meow, fired by `pw:cat-meow`
 *   `pw-forest`    the wind voice: no bed, no hum - just occasional soft
 *                  gusts, sparse leaf rustles, and a distant bird, each
 *                  arriving on its own irregular clock with silence between
 *   `pw-pond`      the pond voice: gentle lapping washes and rare droplets
 *   `pw-sea`       the shore voice: slow, breathing wave washes, each with
 *                  a long envelope and silence between crests
 *   `pw-river`     the river voice: a soft, close babble with a light
 *                  chatter texture and sparse gurgles
 *
 * The four ambient voices are proximity-mixed: `updateProximity(x, y)` reads
 * where the player stands in tile units and retunes them live - pond water
 * swells near the pond, the sea breathes at the south shore, the river
 * babbles along its course, and wind breathes harder in open grass and near
 * cliffs.
 *
 * Safety rules the layer never breaks:
 *   - nothing plays before the first user gesture; the first pointer or key
 *     press resumes the AudioContext and only then may the forest fade in
 *   - the world is on by default: that first gesture auto-unmutes (unless
 *     the player has already chosen a mute state this session) and the beds
 *     fade in over their own two-to-three-second envelopes
 *   - `prefers-reduced-motion: reduce` keeps the ambient loops off entirely -
 *     short cues still play, quietly, because they are feedback, not motion
 *   - muted state persists to localStorage and silences loops and one-shots;
 *     an explicit toggle press always wins over the default-on
 *   - SSR-safe: no browser API is touched at import time, and every public
 *     function no-ops on the server
 *
 * Any component may call this composable; the reactive state is shared, the
 * global listeners attach once, and the bed keeps playing across pages.
 */

/** Custom sound ids, kept local so the world layer never needs them. */
const MOVE_SOUND_ID = 'pw-move'
const RUSTLE_SOUND_ID = 'pw-rustle'
const INTERACT_SOUND_ID = 'pw-interact'
const LANDMARK_SOUND_ID = 'pw-landmark'
const BEACH_SOUND_ID = 'pw-beach'
const CAT_MEOW_SOUND_ID = 'pw-cat-meow'
const FOREST_LOOP_ID = 'pw-forest'
const POND_LOOP_ID = 'pw-pond'
const SEA_LOOP_ID = 'pw-sea'
const RIVER_LOOP_ID = 'pw-river'

/**
 * Per-landmark cue ids. The pond and campfire keep the forest's low bell;
 * the shore gets its own lighter shell-chime. Unknown ids fall back to the
 * bell, so a new landmark is never silent.
 */
const LANDMARK_CUES: Record<string, string> = {
  pond: LANDMARK_SOUND_ID,
  campfire: LANDMARK_SOUND_ID,
  beach: BEACH_SOUND_ID
}

/** Warm and subtle - every sound passes through this master level. */
const MASTER_VOLUME = 0.9
/** Where the mute preference survives reloads. */
const MUTE_STORAGE_KEY = 'pixelworld:sounds-muted'
/** The cat may speak at most once per this many milliseconds. */
const CAT_MEOW_THROTTLE_MS = 4000

/* Proximity mixing: how loud each bed sits, and how far it reaches. */
/** The wind voice's resting level, away from cliffs and open fields. */
const WIND_BASE_VOLUME = 0.5
/** The most the wind voice swells to in the open or against a cliff. */
const WIND_MAX_VOLUME = 0.72
/** Openness of the surrounding tiles adds up to this much wind. */
const WIND_OPEN_BOOST = 0.16
/** Standing close to a cliff face adds up to this much wind. */
const WIND_CLIFF_BOOST = 0.1
/** The water voice's resting level, far from any shore. */
const WATER_BASE_VOLUME = 0.08
/** The water voice's level right at the pond's edge. */
const WATER_NEAR_VOLUME = 0.6
/** Tiles from a shore before the water bed rests at its base level. */
const WATER_FADE_TILES = 8
/** Tiles from a cliff face before it stops adding wind. */
const CLIFF_FADE_TILES = 4
/** The sea voice's resting level, far inland. */
const SEA_BASE_VOLUME = 0.04
/** The sea voice's level at the shoreline. */
const SEA_NEAR_VOLUME = 0.65
/** Tiles from the sea before the wash rests at its base level. */
const SEA_FADE_TILES = 7
/** The river voice's resting level, away from its course. */
const RIVER_BASE_VOLUME = 0.04
/** The river voice's level on its bank. */
const RIVER_NEAR_VOLUME = 0.55
/** Tiles from the river course before the babble rests at its base. */
const RIVER_FADE_TILES = 5
/** The first row of the open sea, south of the beach. */
const SEA_FIRST_ROW = 29
/** The river's southward course, in tiles: pond edge to the sea. */
const RIVER_COURSE = { minX: 33, maxX: 37, minY: 16, maxY: 28 }

/** Set once the engine has been configured and the sounds registered. */
let engineReady = false
/** How many mounted components currently rely on the global listeners. */
let layerConsumers = 0
/** Detaches the global gesture, motion and visibility listeners. */
let detachGlobalLayer: (() => void) | null = null
/** True once any code has set the mute state explicitly this session. */
let muteTouched = false
/** Wall-clock ms of the last meow, so the cat never chatters. */
let lastCatMeowAt = 0
/** True once the engine has actually created its AudioContext. */
let contextReady = false
/**
 * Wall-clock ms until a fading-out bed has fully let go. While a stop is
 * still in flight, `isLoopPlaying` truthfully reports the dying loop, so
 * a restart must not trust that reading.
 */
let bedFadeTailUntil = 0
/** The mix the wind bed should sit at once it is playing. */
let desiredWindVolume = WIND_BASE_VOLUME
/** The mix the pond bed should sit at once it is playing. */
let desiredWaterVolume = WATER_BASE_VOLUME
/** The mix the sea bed should sit at once it is playing. */
let desiredSeaVolume = SEA_BASE_VOLUME
/** The mix the river bed should sit at once it is playing. */
let desiredRiverVolume = RIVER_BASE_VOLUME

/* ------------------------------------------------------------------ *
 * One-shot synths - small, warm, and quiet. Peaks are conservative   *
 * (the built-ins run 0.08-0.5; these stay in the bottom half).       *
 * ------------------------------------------------------------------ */

/** A footstep on soft grass: a short filtered thump with a falling edge. */
function moveStep (synth: SynthContext): void {
  synthHelpers.noiseBurst(synth, {
    duration: 0.09 * synth.params.decayMult,
    expDiv: 30,
    filterType: 'lowpass',
    filterFreq: 850 * synth.params.pitchMult,
    freqRampTo: 320,
    q: 0.8,
    peak: 0.11 * synth.volume
  })
}

/**
 * Leaves brushing past: two soft high bandpass flicks, the second lighter
 * and a touch later, like a stride sweeping through dry grass. Built by
 * hand because the noise helper cannot stagger its bursts.
 */
function leafRustle (synth: SynthContext): void {
  const { ctx, time, volume } = synth

  const length = Math.floor(ctx.sampleRate * 0.3)
  const noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const samples = noiseBuffer.getChannelData(0)
  for (let index = 0; index < samples.length; index++) {
    samples[index] = Math.random() * 2 - 1
  }
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 3200 * synth.params.pitchMult
  filter.Q.value = 0.9

  const envelope = ctx.createGain()
  const flick = (at: number, peak: number): void => {
    envelope.gain.setValueAtTime(0.0001, at)
    envelope.gain.exponentialRampToValueAtTime(peak, at + 0.02)
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.11)
  }
  flick(time + 0.01, 0.09 * volume)
  flick(time + 0.09, 0.05 * volume * (0.8 + Math.random() * 0.4))

  noise.connect(filter)
  filter.connect(envelope)
  synth.connect(envelope)
  noise.start(time)
  noise.stop(time + 0.24)
}

/** A friendly little "hm?" - two triangle notes stepping up, very gentle. */
function interactCue (synth: SynthContext): void {
  synthHelpers.tone(synth, {
    freq: 392 * synth.params.pitchMult,
    endFreq: 466 * synth.params.pitchMult,
    duration: 0.12 * synth.params.decayMult,
    peak: 0.08 * synth.volume,
    oscType: 'triangle',
    filterFreq: 1800
  })
  synthHelpers.tone(synth, {
    freq: 587 * synth.params.pitchMult,
    duration: 0.11 * synth.params.decayMult,
    peak: 0.055 * synth.volume,
    oscType: 'triangle',
    filterFreq: 2200,
    startOffset: 0.07
  })
}

/** A low, slow bell: an open G-D-G fifth stack with a soft shimmer above. */
function landmarkChime (synth: SynthContext): void {
  synthHelpers.chord(synth, {
    notes: [98, 147, 196],
    spacing: 0.05,
    peak: 0.14 * synth.volume,
    duration: 1.2 * synth.params.decayMult,
    oscType: 'sine'
  })
  synthHelpers.tone(synth, {
    freq: 392 * synth.params.pitchMult,
    duration: 0.5 * synth.params.decayMult,
    peak: 0.035 * synth.volume,
    oscType: 'sine',
    startOffset: 0.14
  })
}

/**
 * A soft shell-chime for the shore: two open fifths and a breath of surf.
 * Lighter and airier than the forest's low bell, so arriving at the beach
 * feels like the world opening up rather than another clearing.
 */
function beachChime (synth: SynthContext): void {
  const { ctx, time, volume } = synth

  synthHelpers.chord(synth, {
    notes: [330, 495, 660],
    spacing: 0.06,
    peak: 0.09 * volume,
    duration: 0.85 * synth.params.decayMult,
    oscType: 'sine'
  })

  // A short wash of surf under the chime: noise through a soft bandpass,
  // swelling once and settling, never a sustained hiss.
  const noise = ctx.createBufferSource()
  noise.buffer = createNoiseBuffer(ctx, 0.9)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 0.7
  filter.frequency.setValueAtTime(900, time)
  filter.frequency.linearRampToValueAtTime(1400, time + 0.35)
  filter.frequency.linearRampToValueAtTime(800, time + 0.8)

  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, time)
  envelope.gain.linearRampToValueAtTime(0.03 * volume, time + 0.3)
  envelope.gain.linearRampToValueAtTime(0.0001, time + 0.85)

  noise.connect(filter)
  filter.connect(envelope)
  synth.connect(envelope)
  noise.start(time)
  noise.stop(time + 0.9)
}

/**
 * The cat's voice: a small, curious two-phase meow.
 *
 * One triangle oscillator bends up through "mi" (600 -> 900 Hz over
 * 150 ms) and then down through "yao" (900 -> 400 Hz over 350 ms). A
 * narrow bandpass formant follows the pitch so the vowel moves with it,
 * and a whisper of filtered noise underneath gives the meow its breath.
 * It is a one-shot, never a bed, and it sits below the interaction cue.
 */
function catMeow (synth: SynthContext): void {
  const { ctx, time, volume } = synth
  const at = time + 0.01
  const peak = 0.055 * volume

  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(600, at)
  osc.frequency.exponentialRampToValueAtTime(900, at + 0.15)
  osc.frequency.exponentialRampToValueAtTime(400, at + 0.5)

  // The formant sweeps with the pitch, narrow enough to read as a vowel.
  const formant = ctx.createBiquadFilter()
  formant.type = 'bandpass'
  formant.Q.value = 4
  formant.frequency.setValueAtTime(700, at)
  formant.frequency.exponentialRampToValueAtTime(1100, at + 0.15)
  formant.frequency.exponentialRampToValueAtTime(520, at + 0.5)

  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.exponentialRampToValueAtTime(peak, at + 0.045)
  envelope.gain.setValueAtTime(peak * 0.85, at + 0.18)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.52)

  osc.connect(formant)
  formant.connect(envelope)
  synth.connect(envelope)

  // A faint breath of noise under the vowel, shaped by the same envelope.
  const breath = ctx.createBufferSource()
  breath.buffer = createNoiseBuffer(ctx, 0.55)
  const breathFilter = ctx.createBiquadFilter()
  breathFilter.type = 'bandpass'
  breathFilter.frequency.value = 1400
  breathFilter.Q.value = 1.2
  const breathGain = ctx.createGain()
  breathGain.gain.value = 0.12
  breath.connect(breathFilter)
  breathFilter.connect(breathGain)
  breathGain.connect(envelope)

  osc.start(at)
  osc.stop(at + 0.55)
  breath.start(at)
  breath.stop(at + 0.55)
}

/* ------------------------------------------------------------------ *
 * Shared synth plumbing.                                            *
 * ------------------------------------------------------------------ */

/** A few seconds of white noise, ready to be shaped by a filter. */
function createNoiseBuffer (ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let index = 0; index < samples.length; index++) {
    samples[index] = Math.random() * 2 - 1
  }
  return buffer
}

/** A short bird whistle: one to three quick sine notes, soft and distant. */
function birdChirp (synth: SynthContext): void {
  const { ctx, volume } = synth
  const base = 2100 + Math.random() * 900
  const notes = Math.random() < 0.4 ? 3 : 2
  let at = ctx.currentTime + 0.02

  for (let index = 0; index < notes; index++) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    const peak = 0.06 * volume * (0.7 + Math.random() * 0.6)
    const startFreq = base * (1 + index * 0.08)
    osc.frequency.setValueAtTime(startFreq, at)
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.72, at + 0.08)

    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(0.0001, at)
    envelope.gain.exponentialRampToValueAtTime(peak, at + 0.015)
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.08)

    osc.connect(envelope)
    synth.connect(envelope)
    osc.start(at)
    osc.stop(at + 0.1)
    at += 0.13 + Math.random() * 0.06
  }
}

/** A single pond droplet: a soft sine that pings up and fades away fast. */
function pondPlip (synth: SynthContext): void {
  const { ctx, volume } = synth
  const base = 700 + Math.random() * 300
  const at = ctx.currentTime + 0.02

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(base, at)
  osc.frequency.exponentialRampToValueAtTime(base * 2.1, at + 0.07)

  const envelope = ctx.createGain()
  const peak = 0.09 * volume * (0.7 + Math.random() * 0.5)
  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.exponentialRampToValueAtTime(peak, at + 0.012)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.1)

  osc.connect(envelope)
  synth.connect(envelope)
  osc.start(at)
  osc.stop(at + 0.12)
}

/** A single river gurgle: a soft, low bubble that rises and settles. */
function riverGurgle (synth: SynthContext): void {
  const { ctx, volume } = synth
  const base = 220 + Math.random() * 180
  const at = ctx.currentTime + 0.02

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(base, at)
  osc.frequency.exponentialRampToValueAtTime(base * 1.6, at + 0.06)
  osc.frequency.exponentialRampToValueAtTime(base * 0.9, at + 0.14)

  const envelope = ctx.createGain()
  const peak = 0.07 * volume * (0.6 + Math.random() * 0.5)
  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.exponentialRampToValueAtTime(peak, at + 0.015)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)

  osc.connect(envelope)
  synth.connect(envelope)
  osc.start(at)
  osc.stop(at + 0.18)
}

/* ------------------------------------------------------------------ *
 * The ambient voices - wind, pond, sea and river, proximity-mixed.  *
 * ------------------------------------------------------------------ */

/**
 * The wind voice - no bed, no drone, no hum.
 *
 * The forest is silent between events; nothing here runs continuously.
 * Every voice is a short transient that schedules its own return on an
 * irregular clock, so the world breathes in moments rather than a hum:
 *
 *   - a soft wind gust every several seconds: one stretch of noise
 *     through a lowpass that opens, passes, and settles, like air
 *     actually arriving and moving on
 *   - a sparse leaf rustle, quieter and slower than the stride cue,
 *     for the canopy stirring on its own
 *   - a distant bird whistle now and then, soft and low in the mix
 *
 * Every transient is created fresh against `ctx.currentTime` (a loop's
 * `synth.time` is frozen at its start), tracked for disposal, and one
 * failed event never takes the scheduler down - it just tries again.
 */
function forestBed (synth: SynthContext): LoopControl {
  const { ctx, volume } = synth

  let disposed = false
  const timers: Array<ReturnType<typeof setTimeout>> = []
  const liveSources = new Set<AudioBufferSourceNode>()

  const trackSource = (source: AudioBufferSourceNode): void => {
    liveSources.add(source)
    source.onended = () => {
      liveSources.delete(source)
    }
  }

  /**
   * Re-run an event on an irregular clock, so nothing is metronomic.
   * `firstDelayMs` lets the first event arrive almost at once, so the
   * forest is audible the moment the player's gesture wakes it.
   */
  const every = (
    minDelayMs: number,
    maxDelayMs: number,
    event: () => void,
    firstDelayMs?: number
  ): void => {
    const schedule = (first: boolean): void => {
      const delay = first && firstDelayMs !== undefined
        ? firstDelayMs
        : minDelayMs + Math.random() * (maxDelayMs - minDelayMs)
      timers.push(setTimeout(() => {
        if (!disposed) {
          if (ctx.state === 'running') {
            try {
              event()
            } catch {
              // one missed moment must never sink the whole voice
            }
          }
          schedule(false)
        }
      }, delay))
    }
    schedule(true)
  }

  /** One soft gust: noise through a lowpass that opens and settles. */
  const gust = (): void => {
    const duration = 3 + Math.random() * 2.5
    const at = ctx.currentTime + 0.05

    const source = ctx.createBufferSource()
    source.buffer = createNoiseBuffer(ctx, duration + 0.2)
    trackSource(source)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 0.4
    filter.frequency.setValueAtTime(150, at)
    filter.frequency.linearRampToValueAtTime(300 + Math.random() * 150, at + duration * 0.45)
    filter.frequency.linearRampToValueAtTime(130, at + duration)

    const envelope = ctx.createGain()
    const peak = 0.13 * volume * (0.6 + Math.random() * 0.5)
    envelope.gain.setValueAtTime(0.0001, at)
    envelope.gain.linearRampToValueAtTime(peak, at + duration * 0.35)
    envelope.gain.linearRampToValueAtTime(0.0001, at + duration)

    source.connect(filter)
    filter.connect(envelope)
    synth.connect(envelope)
    source.start(at)
    source.stop(at + duration)
  }

  /** One sparse canopy flick: a brief bandpass brush, feather-soft. */
  const canopyFlick = (): void => {
    const length = Math.floor(ctx.sampleRate * 0.3)
    const noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const samples = noiseBuffer.getChannelData(0)
    for (let index = 0; index < samples.length; index++) {
      samples[index] = Math.random() * 2 - 1
    }

    const at = ctx.currentTime + 0.02
    const source = ctx.createBufferSource()
    source.buffer = noiseBuffer
    trackSource(source)

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2600 + Math.random() * 700
    filter.Q.value = 0.9

    const envelope = ctx.createGain()
    const flick = (start: number, peak: number): void => {
      envelope.gain.setValueAtTime(0.0001, start)
      envelope.gain.exponentialRampToValueAtTime(peak, start + 0.02)
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.11)
    }
    flick(at, 0.09 * volume * (0.7 + Math.random() * 0.4))
    flick(at + 0.09, 0.05 * volume * (0.6 + Math.random() * 0.5))

    source.connect(filter)
    filter.connect(envelope)
    synth.connect(envelope)
    source.start(at)
    source.stop(at + 0.24)
  }

  // Occasional, never on a beat: air moves, leaves stir, a bird answers.
  // The first gust arrives within half a second, so the world is alive the
  // moment the player's gesture wakes it; later events keep their own
  // slow, irregular clocks.
  every(7000, 16000, gust, 350 + Math.random() * 450)
  every(12000, 26000, canopyFlick, 2200 + Math.random() * 900)
  every(12000, 28000, () => {
    birdChirp(synth)
  }, 5000 + Math.random() * 2000)

  return {
    // No continuous sources exist; disposal ends the schedulers and any
    // transient still ringing out.
    dispose: () => {
      disposed = true
      timers.forEach(clearTimeout)
      liveSources.forEach((source) => {
        try {
          source.stop()
        } catch {
          // already ended on its own
        }
      })
      liveSources.clear()
    }
  }
}

/**
 * The water loop: the pond's own voice, kept apart from the wind so it
 * can be mixed independently of where the player wanders.
 *
 *   - two lapping washes: bandpass noise at different heights, each
 *     swelling under its own irregularly-paced LFO, so the water moves
 *     in and out like a shore rather than a faucet
 *   - rare droplets: a soft plip every several seconds, never on a beat
 */
function pondBed (synth: SynthContext): LoopControl {
  const { ctx, time, volume } = synth
  const noiseBuffer = createNoiseBuffer(ctx, 4)

  const washes: Array<{
    source: AudioBufferSourceNode
    lfo: OscillatorNode
  }> = []
  const washVoice = (
    filterFreq: number,
    q: number,
    gain: number,
    lfoRate: number,
    depth: number
  ): void => {
    const source = ctx.createBufferSource()
    source.buffer = noiseBuffer
    source.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterFreq
    filter.Q.value = q

    const washGain = ctx.createGain()
    washGain.gain.value = gain * volume

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = lfoRate
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = depth * volume
    lfo.connect(lfoDepth)
    lfoDepth.connect(washGain.gain)

    source.connect(filter)
    filter.connect(washGain)
    synth.connect(washGain)
    source.start(time)
    lfo.start(time)
    washes.push({ source, lfo })
  }

  // the two washes drift apart and realign, like water finding the shore
  washVoice(720, 1, 0.085, 0.21, 0.045)
  washVoice(1150, 1.4, 0.06, 0.33, 0.03)

  // -- the rare droplets --
  let disposed = false
  let plipTimer: ReturnType<typeof setTimeout> | null = null
  const schedulePlip = (first: boolean): void => {
    const delay = first ? 1600 + Math.random() * 1800 : 8000 + Math.random() * 10000
    plipTimer = setTimeout(() => {
      if (!disposed) {
        if (ctx.state === 'running') {
          try {
            pondPlip(synth)
          } catch {
            // and neither may a failed droplet sink the pond
          }
        }
        schedulePlip(false)
      }
    }, delay)
  }
  schedulePlip(true)

  return {
    sources: washes.flatMap(({ source, lfo }) => [source, lfo]),
    dispose: () => {
      disposed = true
      if (plipTimer !== null) {
        clearTimeout(plipTimer)
        plipTimer = null
      }
    }
  }
}

/**
 * The sea voice: a slow, breathing wash from the south shore.
 *
 * There is no continuous tone and no bed that sits still. Each wave is a
 * fresh stretch of noise that arrives under a long, soft envelope, opens
 * through a low filter as it crests, and settles back into silence. Waves
 * return on an irregular clock, so the shore breathes rather than hums.
 */
function seaBed (synth: SynthContext): LoopControl {
  const { ctx, volume } = synth

  let disposed = false
  let waveTimer: ReturnType<typeof setTimeout> | null = null
  const liveSources = new Set<AudioBufferSourceNode>()

  const trackSource = (source: AudioBufferSourceNode): void => {
    liveSources.add(source)
    source.onended = () => {
      liveSources.delete(source)
    }
  }

  /** One long wave: low noise that swells, opens, and recedes. */
  const wave = (): void => {
    const duration = 4.5 + Math.random() * 2.5
    const at = ctx.currentTime + 0.05

    const source = ctx.createBufferSource()
    source.buffer = createNoiseBuffer(ctx, duration + 0.3)
    trackSource(source)

    // The body of the wave: a dark lowpass that opens as the crest passes.
    const body = ctx.createBiquadFilter()
    body.type = 'lowpass'
    body.Q.value = 0.5
    body.frequency.setValueAtTime(170, at)
    body.frequency.linearRampToValueAtTime(420 + Math.random() * 160, at + duration * 0.42)
    body.frequency.linearRampToValueAtTime(150, at + duration)

    // A breath of spray above it, quiet enough to read as foam, not hiss.
    const spray = ctx.createBiquadFilter()
    spray.type = 'bandpass'
    spray.Q.value = 0.8
    spray.frequency.setValueAtTime(1100, at)
    spray.frequency.linearRampToValueAtTime(1500 + Math.random() * 300, at + duration * 0.38)
    spray.frequency.linearRampToValueAtTime(900, at + duration)

    const bodyGain = ctx.createGain()
    bodyGain.gain.value = 0.72
    const sprayGain = ctx.createGain()
    sprayGain.gain.value = 0.16

    const envelope = ctx.createGain()
    const peak = 0.15 * volume * (0.7 + Math.random() * 0.5)
    envelope.gain.setValueAtTime(0.0001, at)
    envelope.gain.linearRampToValueAtTime(peak, at + duration * 0.4)
    envelope.gain.linearRampToValueAtTime(0.0001, at + duration)

    source.connect(body)
    body.connect(bodyGain)
    bodyGain.connect(envelope)
    source.connect(spray)
    spray.connect(sprayGain)
    sprayGain.connect(envelope)
    synth.connect(envelope)
    source.start(at)
    source.stop(at + duration)
  }

  // The first wave arrives soon after the bed wakes; later ones keep their
  // own slow, irregular clock so the shore never settles into a rhythm.
  const scheduleWave = (first: boolean): void => {
    const delay = first ? 450 + Math.random() * 650 : 5200 + Math.random() * 4000
    waveTimer = setTimeout(() => {
      if (!disposed) {
        if (ctx.state === 'running') {
          try {
            wave()
          } catch {
            // one missed wave must never sink the shore
          }
        }
        scheduleWave(false)
      }
    }, delay)
  }
  scheduleWave(true)

  return {
    dispose: () => {
      disposed = true
      if (waveTimer !== null) {
        clearTimeout(waveTimer)
        waveTimer = null
      }
      liveSources.forEach((source) => {
        try {
          source.stop()
        } catch {
          // already ended on its own
        }
      })
      liveSources.clear()
    }
  }
}

/**
 * The river voice: a soft, close babble that follows the water south.
 *
 * A continuous ribbon of noise is shaped into a broad band, then a slow
 * gain LFO lets the current breathe and a faster, shallow LFO gives the
 * surface its light chatter. Sparse gurgles rise and fall on an irregular
 * clock, so the water never settles into a steady tone.
 */
function riverBed (synth: SynthContext): LoopControl {
  const { ctx, time, volume } = synth
  const noiseBuffer = createNoiseBuffer(ctx, 4)

  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer
  source.loop = true

  // The body of the current: a broad, soft band around the water's pitch.
  const body = ctx.createBiquadFilter()
  body.type = 'bandpass'
  body.frequency.value = 700
  body.Q.value = 0.6

  // A gentle highpass keeps the rumble out and the babble light.
  const clarity = ctx.createBiquadFilter()
  clarity.type = 'highpass'
  clarity.frequency.value = 260
  clarity.Q.value = 0.4

  const flowGain = ctx.createGain()
  flowGain.gain.value = 0.07 * volume

  // The current breathes slowly...
  const breath = ctx.createOscillator()
  breath.type = 'sine'
  breath.frequency.value = 0.11
  const breathDepth = ctx.createGain()
  breathDepth.gain.value = 0.03 * volume
  breath.connect(breathDepth)
  breathDepth.connect(flowGain.gain)

  // ...and the surface chatters a little faster, never enough to buzz.
  const chatter = ctx.createOscillator()
  chatter.type = 'sine'
  chatter.frequency.value = 4.2
  const chatterDepth = ctx.createGain()
  chatterDepth.gain.value = 0.015 * volume
  chatter.connect(chatterDepth)
  chatterDepth.connect(flowGain.gain)

  source.connect(clarity)
  clarity.connect(body)
  body.connect(flowGain)
  synth.connect(flowGain)

  source.start(time)
  breath.start(time)
  chatter.start(time)

  // -- the sparse gurgles --
  let disposed = false
  let gurgleTimer: ReturnType<typeof setTimeout> | null = null
  const scheduleGurgle = (first: boolean): void => {
    const delay = first ? 700 + Math.random() * 900 : 1800 + Math.random() * 3200
    gurgleTimer = setTimeout(() => {
      if (!disposed) {
        if (ctx.state === 'running') {
          try {
            riverGurgle(synth)
          } catch {
            // one missed bubble must never sink the river
          }
        }
        scheduleGurgle(false)
      }
    }, delay)
  }
  scheduleGurgle(true)

  return {
    sources: [source, breath, chatter],
    dispose: () => {
      disposed = true
      if (gurgleTimer !== null) {
        clearTimeout(gurgleTimer)
        gurgleTimer = null
      }
    }
  }
}

/** Configure the shared engine and register the world's sounds, once. */
function ensureEngine (): void {
  if (engineReady) {
    return
  }
  engineReady = true

  configureUISounds({
    feel: 'organic',
    volume: MASTER_VOLUME,
    enabled: true,
    debug: import.meta.dev
  })

  registerSound(MOVE_SOUND_ID, moveStep, { throttleMs: 240 })
  registerSound(RUSTLE_SOUND_ID, leafRustle, { throttleMs: 500 })
  registerSound(INTERACT_SOUND_ID, interactCue, { throttleMs: 140 })
  registerSound(LANDMARK_SOUND_ID, landmarkChime, { throttleMs: 500 })
  registerSound(BEACH_SOUND_ID, beachChime, { throttleMs: 700 })
  registerSound(CAT_MEOW_SOUND_ID, catMeow)
  registerLoop(FOREST_LOOP_ID, forestBed, { fadeIn: 2.2, fadeOut: 1.4 })
  registerLoop(POND_LOOP_ID, pondBed, { fadeIn: 2.5, fadeOut: 1.6 })
  registerLoop(SEA_LOOP_ID, seaBed, { fadeIn: 3, fadeOut: 2 })
  registerLoop(RIVER_LOOP_ID, riverBed, { fadeIn: 2, fadeOut: 1.4 })
}

/* ------------------------------------------------------------------ *
 * Proximity features, read straight off the world map. The map is   *
 * plain data, so the scan is pure and safe to memoize forever.      *
 * ------------------------------------------------------------------ */

/** Tile facts the ambient mix is derived from. */
interface AmbientFeatures {
  /** Water tiles that belong to the pond, away from the sea and river. */
  pondTiles: Array<{ x: number, y: number }>
  /** Water tiles in the open sea, south of the beach. */
  seaTiles: Array<{ x: number, y: number }>
  /** Water tiles along the river's southward course. */
  riverTiles: Array<{ x: number, y: number }>
  /** Every cliff-face tile in the world. */
  cliffTiles: Array<{ x: number, y: number }>
  /** Collision grid: true marks a tile the player cannot stand on. */
  blocked: boolean[][]
}

/** Memoized tile scan; computed once on first use, on either side. */
let ambientFeatures: AmbientFeatures | null = null

/** True when a tile lies inside the river's southward course. */
function isRiverCourseTile (x: number, y: number): boolean {
  return x >= RIVER_COURSE.minX && x <= RIVER_COURSE.maxX &&
    y >= RIVER_COURSE.minY && y <= RIVER_COURSE.maxY
}

/** Distance from a tile to the river's rectangular course. */
function distanceToRiverCourse (x: number, y: number): number {
  const dx = x < RIVER_COURSE.minX
    ? RIVER_COURSE.minX - x
    : x > RIVER_COURSE.maxX
      ? x - RIVER_COURSE.maxX
      : 0
  const dy = y < RIVER_COURSE.minY
    ? RIVER_COURSE.minY - y
    : y > RIVER_COURSE.maxY
      ? y - RIVER_COURSE.maxY
      : 0
  return Math.sqrt(dx * dx + dy * dy)
}

function ensureAmbientFeatures (): AmbientFeatures {
  if (ambientFeatures !== null) {
    return ambientFeatures
  }
  const pondTiles: Array<{ x: number, y: number }> = []
  const seaTiles: Array<{ x: number, y: number }> = []
  const riverTiles: Array<{ x: number, y: number }> = []
  const cliffTiles: Array<{ x: number, y: number }> = []
  worldMap.ground.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const tile = row[x]
      if (tile === '~') {
        if (y >= SEA_FIRST_ROW) {
          seaTiles.push({ x, y })
        } else if (isRiverCourseTile(x, y)) {
          riverTiles.push({ x, y })
        } else {
          pondTiles.push({ x, y })
        }
      } else if (tile === 'C') {
        cliffTiles.push({ x, y })
      }
    }
  })
  ambientFeatures = { pondTiles, seaTiles, riverTiles, cliffTiles, blocked: createCollisionGrid() }
  return ambientFeatures
}

/** Euclidean distance to the nearest tile of a kind; huge if there are none. */
function nearestTileDistance (
  tiles: Array<{ x: number, y: number }>,
  x: number,
  y: number
): number {
  let best = Number.POSITIVE_INFINITY
  for (const tile of tiles) {
    const dx = tile.x - x
    const dy = tile.y - y
    const squared = dx * dx + dy * dy
    if (squared < best) {
      best = squared
    }
  }
  return best === Number.POSITIVE_INFINITY ? Number.MAX_SAFE_INTEGER : Math.sqrt(best)
}

/** Share of the surrounding 5x5 that the player could stand on. */
function openRatio (blocked: boolean[][], x: number, y: number): number {
  let open = 0
  let total = 0
  for (let dy = -2; dy <= 2; dy++) {
    const row = blocked[y + dy]
    for (let dx = -2; dx <= 2; dx++) {
      total += 1
      if (row !== undefined && row[x + dx] !== true) {
        open += 1
      }
    }
  }
  return total === 0 ? 0 : open / total
}

/** Clamp a number into 0..1. */
function clamp01 (value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** The shape returned to every consumer of `useWorldSounds`. */
export interface WorldSounds {
  /** Live mute state, shared app-wide. */
  muted: Readonly<Ref<boolean>>
  /** True while any ambient bed is (fading) playing. */
  ambientPlaying: Readonly<Ref<boolean>>
  /** Live `prefers-reduced-motion` reading. */
  reducedMotion: Readonly<Ref<boolean>>
  /** True after the first user gesture unlocked audio. */
  unlocked: Readonly<Ref<boolean>>
  /** A gentle grass footstep; safe to call every tile - it throttles itself. */
  playMove (): void
  /** An occasional dry-leaf rustle for crossing tall grass. Self-gated,
   *  so the world may fire it on every tall-grass step. */
  playRustle (): void
  /** A soft two-note cue for interacting with a prop or sign. */
  playInteract (): void
  /** A low, slow chime for arriving at a landmark. Pass the landmark id
   *  to pick its own cue; unknown ids fall back to the forest bell. */
  playLandmark (landmarkId?: string): void
  /** The cat's small two-phase meow. Normally fired by the
   *  `pw:cat-meow` window event; throttled to one every four seconds. */
  playCatMeow (): void
  /** Start (or re-affirm) the ambient loops. No-op while muted, before
   *  the first gesture, or under reduced motion. */
  startAmbient (): void
  /** Stop the ambient loops and drop the intent, so they stay off. */
  stopAmbient (): void
  /** Retune the ambient mix to where the player stands, in tile units:
   *  pond water swells near the pond, the sea breathes at the south shore,
   *  the river babbles along its course, and wind breathes harder in open
   *  grass and near cliffs. Call on tile change, not per frame. */
  updateProximity (x: number, y: number): void
  /** Silence or restore every world sound, and remember the choice. */
  setMuted (value: boolean): void
  /** Flip `muted`. Unmuting confirms itself with a tiny soft blip. */
  toggleMuted (): void
  /** Mark audio as unlocked, as a user gesture just happened. Idempotent. */
  unlock (): void
}

/**
 * The app's sound layer. Call from any component setup; every caller shares
 * the same state, and the first caller mounts the global listeners (first
 * gesture unlock, reduced-motion watch, tab visibility pause). The world
 * renderer should call `playMove` on tile steps, `playRustle` while crossing
 * tall grass, `playInteract` when the player bumps or talks to a prop,
 * `playLandmark(landmark.id)` the moment a landmark is entered, and
 * `updateProximity` whenever the player's tile changes. Pages need none of
 * this - `WorldAudio` in app.vue mounts the bed and the mute toggle for them.
 */
export function useWorldSounds (): WorldSounds {
  if (import.meta.client) {
    ensureEngine()
  }

  /** Shared, SSR-safe reactive state. */
  const muted = useState<boolean>('pixelworld:sounds-muted', () => false)
  const ambientIntent = useState<boolean>('pixelworld:sounds-ambient', () => true)
  const ambientPlaying = useState<boolean>('pixelworld:sounds-playing', () => false)
  const unlocked = useState<boolean>('pixelworld:sounds-unlocked', () => false)
  const reducedMotion = useState<boolean>('pixelworld:sounds-reduced-motion', () => false)

  /** Start a bed only if it is not already alive (or already dying). */
  function startLoopIfFresh (id: LoopId, volume: number): boolean {
    if (Date.now() > bedFadeTailUntil && isLoopPlaying(id)) {
      return true
    }
    return startLoop(id, { volume })
  }

  /** Fade the ambient beds in, if everything allows it. */
  function maybeStartAmbient (): void {
    if (!ambientIntent.value || muted.value || !unlocked.value || reducedMotion.value) {
      return
    }
    // Never start a bed against a suspended context: its schedulers would
    // skip every event until the browser lets audio through. The unlock,
    // unmute and visibility paths resume first and then call back here.
    // `getAudioContext()` lazily creates a context, so only peek once the
    // engine has actually made one - a pre-gesture peek would leave a
    // suspended context behind.
    if (!contextReady) {
      return
    }
    const ctx = getAudioContext()
    if (!ctx || ctx.state !== 'running') {
      return
    }
    const windAlive = startLoopIfFresh(FOREST_LOOP_ID, desiredWindVolume)
    const waterAlive = startLoopIfFresh(POND_LOOP_ID, desiredWaterVolume)
    const seaAlive = startLoopIfFresh(SEA_LOOP_ID, desiredSeaVolume)
    const riverAlive = startLoopIfFresh(RIVER_LOOP_ID, desiredRiverVolume)
    ambientPlaying.value = windAlive || waterAlive || seaAlive || riverAlive
  }

  /** Fade the ambient beds out, keeping whatever intent is set. */
  function stopBed (): void {
    stopLoop(FOREST_LOOP_ID, { fadeOut: 1.4 })
    stopLoop(POND_LOOP_ID, { fadeOut: 1.6 })
    stopLoop(SEA_LOOP_ID, { fadeOut: 2 })
    stopLoop(RIVER_LOOP_ID, { fadeOut: 1.4 })
    ambientPlaying.value = false
    bedFadeTailUntil = Date.now() + 2200
  }

  /** Nudge the playing beds toward the desired mix; the engine ramps it. */
  function applyAmbientMixes (): void {
    if (isLoopPlaying(FOREST_LOOP_ID)) {
      setLoopVolume(FOREST_LOOP_ID, desiredWindVolume)
    }
    if (isLoopPlaying(POND_LOOP_ID)) {
      setLoopVolume(POND_LOOP_ID, desiredWaterVolume)
    }
    if (isLoopPlaying(SEA_LOOP_ID)) {
      setLoopVolume(SEA_LOOP_ID, desiredSeaVolume)
    }
    if (isLoopPlaying(RIVER_LOOP_ID)) {
      setLoopVolume(RIVER_LOOP_ID, desiredRiverVolume)
    }
  }

  function playMove (): void {
    if (muted.value || !unlocked.value) {
      return
    }
    playUISound(MOVE_SOUND_ID, { randomize: true })
  }

  function playRustle (): void {
    if (muted.value || !unlocked.value) {
      return
    }
    // "occasional": even when the caller fires on every step, only some
    // steps rustle, and the registered throttle keeps clusters apart.
    if (Math.random() > 0.45) {
      return
    }
    playUISound(RUSTLE_SOUND_ID, { randomize: true })
  }

  function playInteract (): void {
    if (muted.value || !unlocked.value) {
      return
    }
    playUISound(INTERACT_SOUND_ID)
  }

  function playLandmark (landmarkId?: string): void {
    if (muted.value || !unlocked.value) {
      return
    }
    const cue = landmarkId === undefined
      ? LANDMARK_SOUND_ID
      : LANDMARK_CUES[landmarkId] ?? LANDMARK_SOUND_ID
    playUISound(cue)
  }

  /**
   * The cat's little voice. Fired by the `pw:cat-meow` window event; the
   * local rate limit keeps her to one meow every four seconds, and the
   * usual mute/unlock guards apply exactly as they do to every other cue.
   */
  function playCatMeow (): void {
    if (muted.value || !unlocked.value) {
      return
    }
    const now = Date.now()
    if (now - lastCatMeowAt < CAT_MEOW_THROTTLE_MS) {
      return
    }
    lastCatMeowAt = now
    playUISound(CAT_MEOW_SOUND_ID)
  }

  function startAmbient (): void {
    ambientIntent.value = true
    if (!import.meta.client || !unlocked.value) {
      return
    }
    void resumeAudio().then((running) => {
      if (running) {
        maybeStartAmbient()
      }
    })
  }

  function stopAmbient (): void {
    ambientIntent.value = false
    stopBed()
  }

  function updateProximity (x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return
    }
    const features = ensureAmbientFeatures()
    const tileX = Math.round(x)
    const tileY = Math.round(y)

    // Pond: quadratic ease from the shore, resting at its base far away.
    const pondDistance = nearestTileDistance(features.pondTiles, tileX, tileY)
    const pondCloseness = clamp01(1 - pondDistance / WATER_FADE_TILES)
    desiredWaterVolume = WATER_BASE_VOLUME +
      (WATER_NEAR_VOLUME - WATER_BASE_VOLUME) * pondCloseness * pondCloseness

    // Sea: a broad, linear fade from the south shore, so the wash arrives
    // a few rows before the sand and lets go once the player turns inland.
    // The scanned shore wins when the map has one; the known sea row keeps
    // the voice working while the map is still being extended.
    const seaDistance = features.seaTiles.length > 0
      ? nearestTileDistance(features.seaTiles, tileX, tileY)
      : Math.max(0, SEA_FIRST_ROW - tileY)
    const seaCloseness = clamp01(1 - seaDistance / SEA_FADE_TILES)
    desiredSeaVolume = SEA_BASE_VOLUME +
      (SEA_NEAR_VOLUME - SEA_BASE_VOLUME) * seaCloseness

    // River: a short reach from its course, so the babble stays local.
    // The scanned water wins when the map has it; the course rectangle is
    // the fallback while the river is still being carved.
    const riverDistance = features.riverTiles.length > 0
      ? nearestTileDistance(features.riverTiles, tileX, tileY)
      : distanceToRiverCourse(tileX, tileY)
    const riverCloseness = clamp01(1 - riverDistance / RIVER_FADE_TILES)
    desiredRiverVolume = RIVER_BASE_VOLUME +
      (RIVER_NEAR_VOLUME - RIVER_BASE_VOLUME) * riverCloseness

    // Wind: open surroundings breathe it up, and so does a cliff face.
    const cliffDistance = nearestTileDistance(features.cliffTiles, tileX, tileY)
    const cliffCloseness = clamp01(1 - cliffDistance / CLIFF_FADE_TILES)
    const openness = openRatio(features.blocked, tileX, tileY)
    desiredWindVolume = Math.min(
      WIND_MAX_VOLUME,
      WIND_BASE_VOLUME + openness * WIND_OPEN_BOOST + cliffCloseness * WIND_CLIFF_BOOST
    )

    applyAmbientMixes()
  }

  /**
   * Make sure the shared AudioContext is genuinely running. Browsers create
   * it suspended until a gesture, and `resume()` is asynchronous, so callers
   * that need certainty await this. Returns false while the browser is still
   * holding audio back.
   */
  async function resumeAudio (): Promise<boolean> {
    if (!import.meta.client) {
      return false
    }
    let ctx = getAudioContext()
    if (!ctx) {
      warmUpAudio()
      ctx = getAudioContext()
    }
    if (!ctx) {
      return false
    }
    contextReady = true
    if (ctx.state !== 'running') {
      try {
        await ctx.resume()
      } catch {
        // autoplay still blocked; the next gesture tries again
      }
    }
    return ctx.state === 'running'
  }

  /** Re-arm the first-gesture unlock if the browser refused to resume. */
  let retryArmed = false
  function armGestureRetry (): void {
    if (retryArmed || !import.meta.client) {
      return
    }
    retryArmed = true
    const retry = (): void => {
      retryArmed = false
      window.removeEventListener('pointerdown', retry)
      window.removeEventListener('keydown', retry)
      unlock()
    }
    window.addEventListener('pointerdown', retry, { passive: true })
    window.addEventListener('keydown', retry)
  }

  /**
   * Apply a mute state. `explicit` marks a deliberate choice (the toggle or
   * a bound prop); the first-gesture default-on must never override one.
   */
  function applyMuted (value: boolean, explicit: boolean): void {
    if (explicit) {
      muteTouched = true
    }
    const changed = muted.value !== value
    muted.value = value
    if (changed && import.meta.client) {
      try {
        window.localStorage.setItem(MUTE_STORAGE_KEY, value ? '1' : '0')
      } catch {
        // storage can be unavailable (private mode); memory still holds
      }
    }

    if (!import.meta.client) {
      return
    }
    // Disabling the engine also stops every running loop; unmuting must
    // resume the context and bring the bed back under its own slow fade.
    setUISoundsEnabled(!value)
    if (value) {
      ambientPlaying.value = false
      return
    }
    if (!unlocked.value) {
      // The first gesture will resume the context and start the bed; do not
      // create a suspended context just because a prop said "unmuted".
      return
    }
    setMasterVolume(MASTER_VOLUME)
    void resumeAudio().then((running) => {
      if (running) {
        maybeStartAmbient()
      } else {
        armGestureRetry()
      }
    })
    if (explicit && unlocked.value) {
      // A quiet confirmation that the forest returned, below the world mix.
      playUISound(INTERACT_SOUND_ID)
    }
  }

  function setMuted (value: boolean): void {
    applyMuted(value, true)
  }

  function toggleMuted (): void {
    setMuted(!muted.value)
  }

  function unlock (): void {
    if (!import.meta.client) {
      return
    }
    const first = !unlocked.value
    unlocked.value = true
    warmUpAudio()
    setMasterVolume(MASTER_VOLUME)

    // Default-on: the first real gesture wakes the world unless the player
    // has already chosen a mute state this session. A restored preference
    // still shows on the button before that gesture, but never leaves the
    // world silent once the player is actually here.
    if (!muteTouched && muted.value) {
      applyMuted(false, false)
    }

    // Seed the mix from the spawn tile, so the first bed already knows
    // whether the player is standing by water or in the open.
    if (first) {
      updateProximity(worldMap.spawn.x, worldMap.spawn.y)
    }

    void resumeAudio().then((running) => {
      if (running) {
        maybeStartAmbient()
      } else {
        armGestureRetry()
      }
    })
  }

  /** Read the saved mute preference once, before anything else speaks. */
  function restoreMutePreference (): void {
    if (muteTouched) {
      return
    }
    try {
      if (window.localStorage.getItem(MUTE_STORAGE_KEY) === '1') {
        // Show the saved state on the button, but keep it non-explicit so
        // the first gesture can still wake the world (default-on).
        muted.value = true
        setUISoundsEnabled(false)
      }
    } catch {
      // no storage, no problem - defaults win
    }
  }

  /** Attach the global listeners once, for the first consumer to mount. */
  function mountGlobalLayer (): void {
    if (detachGlobalLayer !== null) {
      return
    }

    /** Payload of the gameplay agent's `pw:player-move` window event. */
    interface PlayerMoveDetail {
      /** Player position in world pixels. */
      x: number
      /** Player position in world pixels. */
      y: number
      /** True while walking; a final false arrives within ~400 ms of stopping. */
      moving: boolean
    }

    /** Payload of the gameplay agent's `pw:landmark` window event. */
    interface LandmarkDetail {
      /** Landmark id, matched against LANDMARK_CUES. */
      id: string
      /** Landmark tile coordinates. */
      x: number
      y: number
    }

    const onFirstGesture = (): void => {
      removeGestureListeners()
      unlock()
    }
    const onPointerDown = (): void => {
      onFirstGesture()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.repeat) {
        onFirstGesture()
      }
    }
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('keydown', onKeyDown)

    // The cat companion announces herself through a window CustomEvent.
    // This listener lives with the rest of the global layer, so it is
    // attached once and removed with the layer.
    const onCatMeow = (): void => {
      playCatMeow()
    }
    window.addEventListener('pw:cat-meow', onCatMeow)

    // The gameplay loop reports the player's position and discoveries
    // through window CustomEvents, keeping the sound layer decoupled from
    // the renderer. The move event carries world pixels; proximity mixing
    // works in tiles, so convert before retuning the beds. The mix update
    // is silent, so it keeps tracking even while muted; the footstep cue
    // itself obeys the same mute/unlock guard as every other cue.
    const onPlayerMove = (event: Event): void => {
      if (!unlocked.value) {
        return
      }
      const detail = (event as CustomEvent<PlayerMoveDetail>).detail
      if (!detail || !Number.isFinite(detail.x) || !Number.isFinite(detail.y)) {
        return
      }
      const tileSize = worldMap.tileSize > 0 ? worldMap.tileSize : 1
      updateProximity(detail.x / tileSize, detail.y / tileSize)
      if (detail.moving === true && !muted.value) {
        playMove()
      }
    }
    window.addEventListener('pw:player-move', onPlayerMove)

    // A newly discovered landmark gets its own one-shot cue. Unknown ids
    // fall back to the forest bell inside playLandmark.
    const onLandmark = (event: Event): void => {
      if (muted.value || !unlocked.value) {
        return
      }
      const detail = (event as CustomEvent<LandmarkDetail>).detail
      if (!detail || typeof detail.id !== 'string' || detail.id.length === 0) {
        return
      }
      playLandmark(detail.id)
    }
    window.addEventListener('pw:landmark', onLandmark)

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = motionQuery.matches
    const onMotionChange = (event: MediaQueryListEvent): void => {
      reducedMotion.value = event.matches
      // Calm down the moment the preference turns on; never restart on
      // its own when it turns back off - that stays a user choice.
      if (event.matches) {
        stopBed()
      }
    }
    motionQuery.addEventListener('change', onMotionChange)

    const onVisibilityChange = (): void => {
      if (document.hidden) {
        stopBed()
      } else if (unlocked.value) {
        // The browser may have suspended the context while hidden; resume
        // it before the beds try to schedule anything.
        void resumeAudio().then((running) => {
          if (running) {
            maybeStartAmbient()
          }
        })
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    function removeGestureListeners (): void {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }

    detachGlobalLayer = () => {
      removeGestureListeners()
      window.removeEventListener('pw:cat-meow', onCatMeow)
      window.removeEventListener('pw:player-move', onPlayerMove)
      window.removeEventListener('pw:landmark', onLandmark)
      motionQuery.removeEventListener('change', onMotionChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      detachGlobalLayer = null
    }

    restoreMutePreference()
  }

  /** Release the global listeners when the last consumer unmounts. */
  function releaseGlobalLayer (): void {
    layerConsumers = Math.max(0, layerConsumers - 1)
    if (layerConsumers > 0) {
      return
    }
    detachGlobalLayer?.()
    detachGlobalLayer = null
    stopBed()
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      if (!import.meta.client) {
        return
      }
      layerConsumers += 1
      mountGlobalLayer()
    })
    onBeforeUnmount(() => {
      if (!import.meta.client) {
        return
      }
      releaseGlobalLayer()
    })
  }

  return {
    muted,
    ambientPlaying,
    reducedMotion,
    unlocked,
    playMove,
    playRustle,
    playInteract,
    playLandmark,
    playCatMeow,
    startAmbient,
    stopAmbient,
    updateProximity,
    setMuted,
    toggleMuted,
    unlock
  }
}
