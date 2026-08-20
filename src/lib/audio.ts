import { getRecording } from './db'
import { speak, stopSpeaking } from './tts'
import type { Phrase } from './types'

// One shared player so a new tap always interrupts the previous sound.
let current: HTMLAudioElement | null = null
let currentUrl: string | null = null
// Monotonic play token: any await inside a play path must check it afterward so a
// slower earlier tap (recording lookup in IndexedDB) can't override a later one.
let playSeq = 0

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

export function playBlob(blob: Blob): Promise<void> {
  stopAllAudio()
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    current = audio
    currentUrl = url
    const done = () => {
      if (currentUrl === url) {
        URL.revokeObjectURL(url)
        currentUrl = null
        current = null
      }
      resolve()
    }
    audio.onended = done
    audio.onerror = done
    void audio.play().catch(done)
  })
}

/** Play a phrase: the parent's recorded voice when there is one, TTS otherwise. */
export async function playPhrase(phrase: Phrase, ttsRate: number): Promise<void> {
  const token = ++playSeq
  if (phrase.recordingId) {
    const rec = await getRecording(phrase.recordingId)
    // a newer tap started while we were reading the recording — it wins
    if (playSeq !== token) return
    if (rec) return playBlob(rec.blob)
  }
  stopAllAudio()
  return speak(phrase.text, phrase.lang, ttsRate)
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
