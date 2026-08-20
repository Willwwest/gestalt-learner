import { LANGUAGES, type LanguageCode } from './types'

// Android Chrome hands TTS to the system engine; getVoices() can list voice
// packs that aren't installed, so match on language tag and let the engine
// resolve the actual voice.
let voices: SpeechSynthesisVoice[] = []

function refreshVoices() {
  voices = window.speechSynthesis?.getVoices() ?? []
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
}

export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(lang: LanguageCode): SpeechSynthesisVoice | undefined {
  const tag = LANGUAGES[lang].bcp47.toLowerCase()
  const prefix = tag.slice(0, 2)
  const normalized = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-')
  return (
    voices.find((v) => normalized(v) === tag && v.localService) ??
    voices.find((v) => normalized(v) === tag) ??
    voices.find((v) => normalized(v).startsWith(prefix))
  )
}

export function speak(text: string, lang: LanguageCode, rate = 0.92): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsAvailable()) return resolve()
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = LANGUAGES[lang].bcp47
    const voice = pickVoice(lang)
    if (voice) u.voice = voice
    u.rate = rate
    u.pitch = 1.05
    // Android's TTS engine occasionally stalls without firing end/error;
    // a generous deadline keeps sequenced playback (songs) from freezing
    // while staying far above the real speaking time of any phrase.
    const deadline = setTimeout(done, Math.min(45000, 3000 + text.length * 400))
    let settled = false
    function done() {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      resolve()
    }
    u.onend = done
    u.onerror = done
    window.speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
  if (ttsAvailable()) window.speechSynthesis.cancel()
}
