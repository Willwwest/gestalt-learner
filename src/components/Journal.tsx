import { useCallback, useEffect, useState } from 'react'
import { listPhrases, logEvent, recentEvents } from '../lib/db'
import type { Phrase, UsageEvent } from '../lib/types'
import PhraseVisual from './PhraseVisual'

function fmt(at: number) {
  return new Date(at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const KIND_ICONS: Record<string, string> = {
  'phrase-tap': '💬',
  'mix-play': '🧩',
  'mix-part': '🧩',
  'letter-tap': '🔤',
  'song-play': '🎵',
  'song-line': '🎵',
  'scene-tap': '📸',
  'split-open': '✂️',
  'split-part': '✂️',
  'focus-used': '⭐',
}

export default function Journal() {
  const [events, setEvents] = useState<UsageEvent[]>([])
  const [focusPhrases, setFocusPhrases] = useState<Phrase[]>([])
  const [note, setNote] = useState('')

  const refresh = useCallback(() => {
    void recentEvents(300).then(setEvents)
    void listPhrases().then((all) =>
      setFocusPhrases(all.filter((p) => p.focus && !p.hidden && p.stage === 1)),
    )
  }, [])

  useEffect(refresh, [refresh])

  const addNote = async () => {
    if (!note.trim()) return
    await logEvent('note', note.trim())
    setNote('')
    refresh()
  }

  const markUsed = async (p: Phrase) => {
    await logEvent('focus-used', p.text)
    refresh()
  }

  const usedCount = (p: Phrase) =>
    events.filter((e) => e.kind === 'focus-used' && e.detail === p.text).length

  const notes = events.filter((e) => e.kind === 'note')
  const activity = events.filter((e) => e.kind !== 'note').slice(0, 60)

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Journal</h2>

      <h3 style={{ marginTop: 0 }}>⭐ This Week's Words</h3>
      {focusPhrases.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>
          No focus phrases picked yet. In <strong>Phrases & Recordings</strong>, edit a
          phrase and check "This Week's Words" (pick 5 or fewer). Model them at real
          moments every day — that steady drip is what moves language forward.
        </p>
      ) : (
        <>
          {focusPhrases.map((p) => {
            const n = usedCount(p)
            return (
              <div className="phrase-row" key={p.id}>
                <PhraseVisual emoji={p.emoji} symbolId={p.symbolId} className="pr-emoji" />
                <div className="pr-main">
                  <div className="pr-text">{p.text}</div>
                  <div className="pr-gloss">
                    {n === 0
                      ? 'Not heard yet — keep modeling, no pressure.'
                      : n < 3
                        ? `Heard ${n}×! It's landing.`
                        : `Heard ${n}× — it's owned! Time to stretch it: long-press it on the board to model the pieces, and try new endings in Mix & Match.`}
                  </div>
                </div>
                <button className="btn secondary" onClick={() => void markUsed(p)}>
                  They used it! 🎉
                </button>
              </div>
            )
          })}
          <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>
            When a phrase is "owned," un-star it and star the next target — its
            mitigations ("Let's get" + something new), a single word from it, or a new
            kind of phrase (a comment or a question instead of a request).
          </p>
        </>
      )}

      <h3>Notes</h3>
      <p>
        Jot down the moments that matter: a script used somewhere new, two chunks glued
        together ("Let's get + a hug"), a single word on its own, where a script came
        from. These notes are the real progress report.
      </p>
      <div className="field">
        <label>New note</label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder='e.g. Said "Let&apos;s get outside!" at the door — new combo! (From the Let&apos;s get frame.)'
        />
      </div>
      <button className="btn" onClick={() => void addNote()} disabled={!note.trim()}>
        Save note
      </button>

      {notes.length > 0 &&
        notes.map((n) => (
          <div className="note-card" key={n.id}>
            <div className="nc-time">{fmt(n.at)}</div>
            {n.detail}
          </div>
        ))}

      <h3>Recent taps in the app</h3>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>
        Counts don't measure communication — engagement does. This list is just a
        peek at what's been catching their interest.
      </p>
      {activity.map((e) => (
        <div className="phrase-row" key={e.id}>
          <span className="pr-emoji">{KIND_ICONS[e.kind] ?? '·'}</span>
          <div className="pr-main">
            <div className="pr-text" style={{ fontWeight: 500 }}>
              {e.detail}
            </div>
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{fmt(e.at)}</span>
        </div>
      ))}
    </div>
  )
}
