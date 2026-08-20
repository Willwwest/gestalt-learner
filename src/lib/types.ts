export type LanguageCode = 'en' | 'es' | 'ko' | 'ru'

export const LANGUAGES: Record<LanguageCode, { label: string; native: string; bcp47: string }> = {
  en: { label: 'English', native: 'English', bcp47: 'en-US' },
  es: { label: 'Spanish', native: 'Español', bcp47: 'es-US' },
  ko: { label: 'Korean', native: '한국어', bcp47: 'ko-KR' },
  ru: { label: 'Russian', native: 'Русский', bcp47: 'ru-RU' },
}

/** NLA-inspired level for a phrase button.
 *  1 = whole gestalt ("Let's get milk!")
 *  2 = mitigable part, mixes with other parts ("Let's get" + "milk")
 *  3 = single word / two-word combo ("milk", "more milk")
 */
export type Stage = 1 | 2 | 3

/** Grammatical slot for mix & match parts */
export type SlotKind = 'thing' | 'stuff' | 'person' | 'activity' | 'feeling' | 'place'

export interface Category {
  id: string
  name: string
  emoji: string
  color: string
  order: number
  builtin?: boolean
}

export interface Phrase {
  id: string
  categoryId: string
  text: string
  emoji: string
  lang: LanguageCode
  stage: Stage
  /** stage-2 mix & match role */
  partType?: 'starter' | 'ender'
  /** starter only: which ender slots make a well-formed sentence */
  accepts?: SlotKind[]
  /** ender only: what kind of thing this is */
  slot?: SlotKind
  /** id into the recordings store; when absent, TTS speaks `text` */
  recordingId?: string
  /** id into the symbols store; the emoji remains the offline-safe fallback */
  symbolId?: string
  /** parent-only note: what this phrase means for the child / how to respond */
  gloss?: string
  /** hidden from the child's board but never deleted (old gestalts stay safe) */
  hidden?: boolean
  /** one of "This Week's Words" — the handful of phrases the family is modeling now */
  focus?: boolean
  /** photo-scene hotspot position, as fractions of the photo (0..1) */
  x?: number
  y?: number
  order: number
  builtin?: boolean
}

export interface Song {
  id: string
  title: string
  emoji: string
  /** seconds of silence after each line — room for him to fill in the next bit */
  pauseSec: number
  order: number
  builtin?: boolean
}

export interface Scene {
  id: string
  title: string
  emoji: string
  photoId: string
  order: number
}

export interface PhotoRow {
  id: string
  blob: Blob
  mimeType: string
  createdAt: number
}

export interface RecordingRow {
  id: string
  blob: Blob
  mimeType: string
  createdAt: number
}

export interface SymbolRow {
  id: string
  blob: Blob
  mimeType: string
  createdAt: number
  source: 'arasaac'
  sourceId: number
  label: string
}

export interface UsageEvent {
  id?: number
  at: number
  kind: string
  detail: string
}

export interface Settings {
  /** which languages show up in Letters & Numbers */
  languages: LanguageCode[]
  /** current working stage shown on the phrase board */
  stage: Stage
  /** speech rate for TTS, 0.5–1.2 */
  ttsRate: number
  /** child's name, used in parent-zone copy only (never quizzed) */
  childName: string
  /** gentle native touch feedback; ignored in the browser/PWA */
  hapticsEnabled: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  languages: ['en', 'es', 'ko', 'ru'],
  stage: 1,
  ttsRate: 0.92,
  childName: '',
  hapticsEnabled: false,
}
