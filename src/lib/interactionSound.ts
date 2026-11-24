const INTERACTION_SOUND_KEY = 'bismillah-kelar-interaction-sound'

export type InteractionSoundType = 'click' | 'check' | 'success'

let sharedInteractionContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  const AudioContextClass =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext
      }
    ).webkitAudioContext

  if (!AudioContextClass) return null

  if (
    !sharedInteractionContext ||
    sharedInteractionContext.state === 'closed'
  ) {
    sharedInteractionContext = new AudioContextClass()
  }

  if (sharedInteractionContext.state === 'suspended') {
    void sharedInteractionContext.resume().catch(() => {})
  }

  return sharedInteractionContext
}

export function playInteractionSound(
  type: InteractionSoundType = 'click',
): void {
  try {
    if (
      typeof window !== 'undefined' &&
      localStorage.getItem(INTERACTION_SOUND_KEY) === 'false'
    ) {
      return
    }

    const context = getAudioContext()
    if (!context) return

    const now = context.currentTime

    // 1. Suara Klik Standar (tombol umum, tab navigasi, filter)
    if (type === 'click') {
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(440, now)
      oscillator.frequency.exponentialRampToValueAtTime(580, now + 0.06)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.exponentialRampToValueAtTime(0.42, now + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075)

      oscillator.connect(gain)
      gain.connect(context.destination)

      oscillator.start(now)
      oscillator.stop(now + 0.08)

      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
      return
    }

    // 2. Suara Ceklis Nada Tinggi / Cempreng (Target, Rutinitas Harian, Aktivitas Kalender)
    if (type === 'check') {
      const oscMain = context.createOscillator()
      const oscHigh = context.createOscillator()
      const gain = context.createGain()

      oscMain.type = 'triangle'
      oscMain.frequency.setValueAtTime(680, now)
      oscMain.frequency.exponentialRampToValueAtTime(1180, now + 0.075)

      oscHigh.type = 'sine'
      oscHigh.frequency.setValueAtTime(1020, now)
      oscHigh.frequency.exponentialRampToValueAtTime(1560, now + 0.075)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.exponentialRampToValueAtTime(0.38, now + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)

      oscMain.connect(gain)
      oscHigh.connect(gain)
      gain.connect(context.destination)

      oscMain.start(now)
      oscHigh.start(now)
      oscMain.stop(now + 0.095)
      oscHigh.stop(now + 0.095)

      oscMain.onended = () => {
        oscMain.disconnect()
        oscHigh.disconnect()
        gain.disconnect()
      }
      return
    }

    // 3. Suara Simpan / Konfirmasi / Apresiasi (Nada ceria "teng-teng" & lebih panjang)
    const notes = [
      { freq: 523.25, start: 0, duration: 0.16, peak: 0.28 }, // C5
      { freq: 659.25, start: 0.11, duration: 0.17, peak: 0.3 }, // E5
      { freq: 783.99, start: 0.22, duration: 0.18, peak: 0.32 }, // G5
      { freq: 1046.5, start: 0.33, duration: 0.34, peak: 0.36 }, // C6 (teng!)
    ]

    notes.forEach(({ freq, start, duration, peak }) => {
      const osc = context.createOscillator()
      const overtone = context.createOscillator()
      const gain = context.createGain()

      const noteStart = now + start
      const noteEnd = noteStart + duration

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, noteStart)

      overtone.type = 'triangle'
      overtone.frequency.setValueAtTime(freq * 2, noteStart)

      const overtoneGain = context.createGain()
      overtoneGain.gain.setValueAtTime(0.18, noteStart)

      gain.gain.setValueAtTime(0.001, noteStart)
      gain.gain.exponentialRampToValueAtTime(peak, noteStart + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd)

      osc.connect(gain)
      overtone.connect(overtoneGain)
      overtoneGain.connect(gain)
      gain.connect(context.destination)

      osc.start(noteStart)
      overtone.start(noteStart)
      osc.stop(noteEnd + 0.01)
      overtone.stop(noteEnd + 0.01)

      osc.onended = () => {
        osc.disconnect()
        overtone.disconnect()
        overtoneGain.disconnect()
        gain.disconnect()
      }
    })
  } catch (error) {
    console.warn('Efek suara tidak dapat diputar:', error)
  }
}