import { getRecording } from './db'
import { speak, stopSpeaking } from './tts'
import type { Phrase, SpokenMessage } from './types'

// One shared player so a new tap always interrupts the previous sound.
let current: HTMLAudioElement | null = null
let currentUrl: string | null = null
// Monotonic play token: any await inside a play path must check it afterward so a
// slower earlier tap (recording lookup in IndexedDB) can't override a later one.
let playSeq = 0
const recordingCache = new Map<string, Blob | null>()

export function stopAllAudio() {
  playSeq++
  stopSpeaking()
  if (current) {
    current.pause()
    current = null
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
}

async function tryPlayBlob(blob: Blob): Promise<boolean> {
  stopAllAudio()
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    current = audio
    currentUrl = url
    const done = (succeeded = true) => {
      if (currentUrl === url) {
        URL.revokeObjectURL(url)
        currentUrl = null
        current = null
      }
      resolve(succeeded)
    }
    audio.onended = () => done(true)
    audio.onerror = () => {
      audio.pause()
      done(false)
    }
    void audio.play().catch(() => {
      audio.pause()
      done(false)
    })
  })
}

export async function playBlob(blob: Blob): Promise<void> {
  await tryPlayBlob(blob)
}

async function cachedRecording(id: string): Promise<Blob | null> {
  if (recordingCache.has(id)) return recordingCache.get(id) ?? null
  const row = await getRecording(id)
  const blob = row?.blob ?? null
  recordingCache.set(id, blob)
  return blob
}

/** Warm short family recordings so a tap can start without an IndexedDB round trip. */
export async function preloadPhraseAudio(phrases: Phrase[]) {
  const ids = [
    ...new Set(phrases.flatMap((phrase) => (phrase.recordingId ? [phrase.recordingId] : []))),
  ]
  await Promise.all(ids.map((id) => cachedRecording(id)))
}

/** Play a phrase: the parent's recorded voice when there is one, TTS otherwise. */
export async function playPhrase(phrase: Phrase, ttsRate: number): Promise<void> {
  const token = ++playSeq
  if (phrase.recordingId) {
    const blob = await cachedRecording(phrase.recordingId)
    // a newer tap started while we were reading the recording — it wins
    if (playSeq !== token) return
    if (blob && (await tryPlayBlob(blob))) return
  }
  stopAllAudio()
  return speak(phrase.text, phrase.lang, ttsRate)
}

/** Replay a saved message using its family recording when it still exists. */
export async function playMessage(message: SpokenMessage, ttsRate: number): Promise<void> {
  if (message.recordingId) {
    const blob = await cachedRecording(message.recordingId)
    if (blob && (await tryPlayBlob(blob))) return
  }
  stopAllAudio()
  await speak(message.text, message.lang, ttsRate)
}

// ---------- recording ----------
export interface ActiveRecorder {
  stop: () => Promise<{ blob: Blob; mimeType: string }>
  cancel: () => void
}

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

export async function startRecording(): Promise<ActiveRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType =
    MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  recorder.start()

  const releaseMic = () => stream.getTracks().forEach((t) => t.stop())

  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          releaseMic()
          const type = recorder.mimeType || mimeType || 'audio/webm'
          resolve({ blob: new Blob(chunks, { type }), mimeType: type })
        }
        recorder.stop()
      }),
    cancel: () => {
      recorder.onstop = null
      try {
        recorder.stop()
      } catch {
        // already stopped
      }
      releaseMic()
    },
  }
}

export function micAvailable(): boolean {
  return !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
}
