import { useCallback, useEffect, useState } from 'react'
import { clearEvents, listPhrases, logEvent, recentEvents } from '../lib/db'
import type { Phrase, UsageEvent } from '../lib/types'
import PhraseVisual from './PhraseVisual'
import Icon from './Icon'

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
  'quick-talk': '✋',
  'typed-talk': '⌨️',
}

const ACTIVITY_LABELS: Record<string, string> = {
  'phrase-tap': 'Talk board',
  'quick-talk': 'Quick Talk',
  'typed-talk': 'Typed speech',
  'mix-play': 'New combinations',
  'mix-part': 'Phrase pieces',
  'letter-tap': 'Letters & concepts',
  'song-play': 'Songs',
  'song-line': 'Song lines',
  'scene-tap': 'Photo scenes',
  'split-open': 'Breaking apart',
  'split-part': 'Phrase pieces',
  'focus-used': 'Caregiver notes',
}

export default function Journal() {
  const [events, setEvents] = useState<UsageEvent[]>([])
  const [focusPhrases, setFocusPhrases] = useState<Phrase[]>([])
  const [note, setNote] = useState('')
  const [range, setRange] = useState<7 | 30 | 'all'>(7)
  const [now, setNow] = useState(() => Date.now())

  const refresh = useCallback(() => {
    void recentEvents(2000).then((rows) => {
      setEvents(rows)
      setNow(Date.now())
    })
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
  const startAt = range === 'all' ? 0 : now - range * 24 * 60 * 60 * 1000
  const windowEvents = events.filter((event) => event.kind !== 'note' && event.at >= startAt)
  const uniqueMessages = new Set(
    windowEvents
      .filter((event) => ['phrase-tap', 'quick-talk', 'typed-talk', 'mix-play', 'scene-tap'].includes(event.kind))
      .map((event) => event.detail),
  ).size
  const activeDays = new Set(windowEvents.map((event) => new Date(event.at).toDateString())).size
  const phraseCounts = [...windowEvents.reduce((counts, event) => {
    if (!['phrase-tap', 'quick-talk', 'typed-talk', 'mix-play', 'scene-tap'].includes(event.kind)) return counts
    counts.set(event.detail, (counts.get(event.detail) ?? 0) + 1)
    return counts
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const activityCounts = [...windowEvents.reduce((counts, event) => {
    const label = ACTIVITY_LABELS[event.kind] ?? 'Other exploration'
    counts.set(label, (counts.get(label) ?? 0) + 1)
    return counts
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxActivity = Math.max(1, ...activityCounts.map(([, count]) => count))

  const eraseActivity = async () => {
    if (!window.confirm('Clear caregiver notes and activity insights for this profile? Phrase and message history are not changed.')) return
    await clearEvents()
    refresh()
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Journal</h2>

      <section className="insights-card" aria-labelledby="insights-heading">
        <div className="insights-head">
          <div className="settings-section-heading">
            <span><Icon name="journal" size={21} /></span>
            <div>
              <h3 id="insights-heading">Communication patterns</h3>
              <p>Private observations, not scores. Use them to notice interests and access needs.</p>
            </div>
          </div>
          <div className="range-switch" role="group" aria-label="Insight time range">
            {([7, 30, 'all'] as const).map((option) => (
              <button key={option} type="button" className={range === option ? 'active' : ''} onClick={() => setRange(option)}>
                {option === 'all' ? 'All' : `${option}d`}
              </button>
            ))}
          </div>
        </div>
        <div className="insight-metrics">
          <div><strong>{windowEvents.length}</strong><span>explorations</span></div>
          <div><strong>{uniqueMessages}</strong><span>different messages</span></div>
          <div><strong>{activeDays}</strong><span>days with activity</span></div>
        </div>
        {activityCounts.length > 0 ? (
          <div className="insight-columns">
            <div>
              <h4>Where communication happened</h4>
              <div className="insight-bars">
                {activityCounts.map(([label, count]) => (
                  <div className="insight-bar-row" key={label}>
                    <span>{label}</span>
                    <div><i style={{ width: `${Math.max(8, (count / maxActivity) * 100)}%` }} /></div>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4>Frequently chosen messages</h4>
              {phraseCounts.length > 0 ? (
                <ol className="top-message-list">
                  {phraseCounts.map(([text, count]) => <li key={text}><span>{text}</span><strong>{count}×</strong></li>)}
                </ol>
              ) : <p className="insight-empty">No whole messages in this period yet.</p>}
            </div>
          </div>
        ) : (
          <p className="insight-empty">Use the app together and patterns will appear here—without goals, streaks, or judgment.</p>
        )}
      </section>

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
      {events.length > 0 && (
        <button type="button" className="text-button danger-text" onClick={() => void eraseActivity()}>
          Clear journal and activity insights…
        </button>
      )}
    </div>
  )
}
