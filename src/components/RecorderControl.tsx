import { useEffect, useRef, useState } from 'react'
import { getRecording } from '../lib/db'
import { micAvailable, playBlob, startRecording, type ActiveRecorder } from '../lib/audio'

interface Props {
  /** existing saved recording on the phrase, if any */
  existingId?: string
  /** pending new blob (null = explicitly removed, undefined = unchanged) */
  pending: Blob | null | undefined
  onChange: (blob: Blob | null | undefined) => void
}

export default function RecorderControl({ existingId, pending, onChange }: Props) {
  const [recorder, setRecorder] = useState<ActiveRecorder | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  // ref mirrors the state so the unmount cleanup sees the CURRENT recorder,
  // not the null from first render — otherwise the mic stays live after Cancel
  const recorderRef = useRef<ActiveRecorder | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current)
      recorderRef.current?.cancel()
      recorderRef.current = null
    }
  }, [])

  const begin = async () => {
    setError('')
    try {
      const rec = await startRecording()
      recorderRef.current = rec
      setRecorder(rec)
      setElapsed(0)
      timer.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } catch {
      setError('Microphone not available. Check permissions.')
    }
  }

  const finish = async () => {
    if (!recorder) return
    if (timer.current) clearInterval(timer.current)
    const { blob } = await recorder.stop()
    recorderRef.current = null
    setRecorder(null)
    onChange(blob)
  }

  const preview = async () => {
    if (pending) return playBlob(pending)
    if (pending === null) return
    if (existingId) {
      const rec = await getRecording(existingId)
      if (rec) await playBlob(rec.blob)
    }
  }

  const hasAudio = pending instanceof Blob || (pending === undefined && !!existingId)

  return (
    <div className="field">
      <label>Recording (a warm, sing-song voice works best — say it like you mean it!)</label>
      <div className="row">
        {recorder ? (
          <button className="btn danger" onClick={() => void finish()}>
            ⏹ Stop ({elapsed}s)
          </button>
        ) : (
          <button className="btn" onClick={() => void begin()} disabled={!micAvailable()}>
            🎙️ {hasAudio ? 'Record again' : 'Record'}
          </button>
        )}
        <button className="btn secondary" onClick={() => void preview()} disabled={!hasAudio}>
          ▶ Play
        </button>
        {hasAudio && (
          <button className="btn secondary" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          {pending instanceof Blob
            ? 'New recording ready — press Save.'
            : pending === null
              ? 'Recording will be removed — TTS will speak instead.'
              : existingId
                ? 'Saved recording in use.'
                : 'No recording yet — the robot voice (TTS) fills in.'}
        </span>
      </div>
      {error && <span style={{ color: 'var(--warn)', fontSize: 13 }}>{error}</span>}
    </div>
  )
}
