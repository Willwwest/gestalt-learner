import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MILESTONES,
  MILESTONES_BY_ID,
  STAGE_GUIDANCE,
  type ChildStage,
  type LoggedMilestone,
  type MilestoneKind,
  type PracticeSuggestion,
  type UsageHint,
  buildSummary,
  listMilestones,
  logMilestone,
  milestonesFor,
  practiceSuggestions,
  suggestStage,
  usageHints,
} from '../lib/stages'
import { listPhrases, recentEvents } from '../lib/db'
import type { Phrase, Settings, UsageEvent } from '../lib/types'

const STAGE_ORDER: ChildStage[] = [1, 2, 3, 4, 5, 6]

function when(at: number) {
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function StageTracker({
  settings,
  onSettingsChange,
}: {
  settings: Settings
  onSettingsChange: (s: Settings) => void
}) {
  const [milestones, setMilestones] = useState<LoggedMilestone[]>([])
  const [logging, setLogging] = useState<MilestoneKind | null>(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [events, setEvents] = useState<UsageEvent[]>([])
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [copied, setCopied] = useState('')
  const [showPlan, setShowPlan] = useState(false)

  const stage = settings.childStage
  const guidance = STAGE_GUIDANCE[stage]

  const refresh = useCallback(() => {
    void listMilestones().then(setMilestones)
    void listPhrases().then(setPhrases)
    void recentEvents(2000).then(setEvents)
  }, [])

  useEffect(refresh, [refresh])

  const suggestion = useMemo(() => suggestStage(milestones, stage), [milestones, stage])
  const { thisStage, nextStage } = useMemo(() => milestonesFor(stage), [stage])
  const loggable = showAll ? MILESTONES : [...thisStage, ...nextStage]

  const starters = useMemo(
    () => phrases.filter((p) => p.partType === 'starter' && !p.hidden),
    [phrases],
  )
  const practice: PracticeSuggestion[] = useMemo(
    () => practiceSuggestions(stage, phrases, starters, events),
    [stage, phrases, starters, events],
  )
  const hints: UsageHint[] = useMemo(() => usageHints(events), [events])
  const focusPhrases = useMemo(
    () => phrases.filter((p) => p.focus && !p.hidden && p.stage === 1),
    [phrases],
  )

  const summary = useMemo(
    () =>
      buildSummary({
        childName: settings.childName,
        stage,
        milestones,
        notes: events.filter((e) => e.kind === 'note').map((e) => ({ at: e.at, detail: e.detail })),
        focusPhrases,
        hints,
      }),
    [settings.childName, stage, milestones, events, focusPhrases, hints],
  )

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied('Copied — paste it into an email or a message.')
    } catch {
      setCopied('Could not copy automatically. Select the text below and copy it.')
    }
    window.setTimeout(() => setCopied(''), 5000)
  }

  const downloadSummary = () => {
    const name = (settings.childName || 'communicator')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const blob = new Blob([summary], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `echobloom-summary-${name || 'child'}-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const save = async () => {
    if (!logging) return
    await logMilestone(logging.id, note.trim())
    setLogging(null)
    setNote('')
    setSaved(`Logged: ${logging.label}`)
    refresh()
    window.setTimeout(() => setSaved(''), 4000)
  }

  const setStage = (next: ChildStage) => {
    onSettingsChange({ ...settings, childStage: next })
  }

  const countFor = (id: string) => milestones.filter((m) => m.id === id).length

  return (
    <div className="stage-tracker" style={{ maxWidth: 780 }}>
      <div className="manager-title-row">
        <div>
          <h2>Progress</h2>
          <p>
            A working stage and one practical next step. Open the detailed plan only
            when you want milestones, history, or a care-team summary.
          </p>
        </div>
      </div>

      <section className="progress-brief" aria-labelledby="progress-brief-heading">
        <div className="progress-brief-stage">
          <span>Current working stage</span>
          <strong>Stage {stage}</strong>
        </div>
        <div className="progress-brief-copy">
          <h3 id="progress-brief-heading">{guidance.name}</h3>
          <p>{guidance.whatsHappening}</p>
        </div>
        <div className="progress-one-thing">
          <span className="care-eyebrow">Try one thing</span>
          <strong>{practice[0]?.title ?? 'Use one short model in a real moment'}</strong>
          <p>{practice[0]?.action ?? guidance.modelThis[0]}</p>
          {practice[0]?.phrases.length ? (
            <div className="practice-chips">
              {practice[0].phrases.slice(0, 3).map((phrase) => (
                <span className="practice-chip" key={phrase.id}>
                  <span aria-hidden="true">{phrase.emoji}</span>
                  {phrase.text}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {suggestion.readyToAdvance && (
          <div className="stage-suggestion ready compact">
            <div>
              <strong>You may want to review stage {suggestion.suggested}.</strong>
              <p>{suggestion.reason}</p>
            </div>
          </div>
        )}
        <button type="button" className="btn" onClick={() => setShowPlan((open) => !open)}>
          {showPlan ? 'Close detailed plan' : 'Open detailed plan'}
        </button>
      </section>

      {showPlan && (
        <div className="progress-details">

      {/* ---- stage rail ---- */}
      <div className="stage-rail" role="group" aria-label="Language stage">
        {STAGE_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            className={`stage-pip${s === stage ? ' current' : ''}${s < stage ? ' past' : ''}`}
            onClick={() => setStage(s)}
            aria-pressed={s === stage}
            aria-label={`Stage ${s}: ${STAGE_GUIDANCE[s].name}`}
          >
            <span className="stage-pip-num">{s}</span>
            <span className="stage-pip-name">{STAGE_GUIDANCE[s].name}</span>
          </button>
        ))}
      </div>

      {/* ---- suggestion ---- */}
      {suggestion.readyToAdvance ? (
        <div className="stage-suggestion ready">
          <div>
            <strong>This looks like stage {suggestion.suggested}.</strong>
            <p>{suggestion.reason}</p>
          </div>
          <button className="btn" onClick={() => setStage(suggestion.suggested)}>
            Move to stage {suggestion.suggested}
          </button>
        </div>
      ) : (
        <p className="stage-progress-note">
          {suggestion.reason}
          {stage < 6 && (
            <span className="stage-progress-count">
              {' '}
              ({suggestion.distinctSignals}/{suggestion.needed} kinds of stage-
              {Math.min(6, stage + 1)} evidence)
            </span>
          )}
        </p>
      )}

      {/* ---- guidance for the current stage ---- */}
      <section className="stage-card">
        <h3>
          Stage {stage}: {guidance.name}
        </h3>
        <p>{guidance.whatsHappening}</p>

        <h4>Model this</h4>
        <ul>
          {guidance.modelThis.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <h4>Skip this for now</h4>
        <ul>
          {guidance.avoidThis.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div className="stage-callouts">
          <div className="stage-callout celebrate">
            <strong>Celebrate</strong>
            <span>{guidance.celebrate}</span>
          </div>
          <div className="stage-callout watch">
            <strong>Watch for</strong>
            <span>{guidance.watchFor}</span>
          </div>
          <div className="stage-callout app">
            <strong>In the app</strong>
            <span>{guidance.appFocus}</span>
          </div>
        </div>
      </section>

      {/* ---- concrete next actions, built from this family's own board ---- */}
      {practice.length > 0 && (
        <section className="practice-block">
          <h3>Do this week</h3>
          <p className="stage-hint">
            Pulled from your own board, for stage {stage}. Not a checklist — pick one.
          </p>
          {practice.map((item) => (
            <div className="practice-card" key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.why}</p>
              {item.phrases.length > 0 && (
                <div className="practice-chips">
                  {item.phrases.map((p) => (
                    <span className="practice-chip" key={p.id}>
                      <span aria-hidden="true">{p.emoji}</span>
                      {p.text}
                      {p.partType === 'starter' && ' …'}
                    </span>
                  ))}
                </div>
              )}
              <em>{item.action}</em>
            </div>
          ))}
        </section>
      )}

      {/* ---- what the app saw (taps, not speech) ---- */}
      {hints.length > 0 && (
        <section className="hints-block">
          <h3>What the app noticed</h3>
          <p className="stage-hint">
            These are taps inside the app over the last two weeks — <strong>not</strong>{' '}
            speech, and not a measure of language. They are a nudge to go watch for the
            same thing happening for real.
          </p>
          {hints.map((h) => {
            const kind = h.suggestMilestone
              ? MILESTONES_BY_ID.get(h.suggestMilestone)
              : undefined
            return (
              <div className="hint-card" key={h.id}>
                <div>
                  <strong>{h.headline}</strong>
                  <p>{h.detail}</p>
                </div>
                {kind && (
                  <button
                    className="btn secondary"
                    onClick={() => {
                      setLogging(kind)
                      setNote('')
                    }}
                  >
                    Saw it for real
                  </button>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* ---- log a milestone ---- */}
      <h3>Log what you noticed</h3>
      <p className="stage-hint">
        One tap when something happens. These are the observations that decide the
        stage — the app cannot hear your child, only you can.
      </p>
      {saved && <p className="stage-saved">{saved}</p>}

      <div className="milestone-options">
        {loggable.map((kind) => {
          const n = countFor(kind.id)
          return (
            <button
              key={kind.id}
              type="button"
              className={`milestone-option${kind.signals > stage ? ' next-stage' : ''}`}
              onClick={() => {
                setLogging(kind)
                setNote('')
              }}
            >
              <span className="milestone-option-head">
                <strong>{kind.label}</strong>
                {n > 0 && <span className="badge">{n}×</span>}
                {kind.signals > stage && <span className="badge next">stage {kind.signals}</span>}
              </span>
              <em>{kind.example}</em>
            </button>
          )
        })}
      </div>
      <button className="btn secondary" onClick={() => setShowAll((v) => !v)}>
        {showAll ? 'Show only what matters now' : 'Show every milestone'}
      </button>

      {logging && (
        <div className="milestone-note-card">
          <strong>{logging.label}</strong>
          <p>{logging.meaning}</p>
          <div className="field">
            <label htmlFor="milestone-note">What exactly happened? (optional but useful)</label>
            <textarea
              id="milestone-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={logging.example}
            />
          </div>
          <div className="row">
            <button className="btn" onClick={() => void save()}>
              Save this milestone
            </button>
            <button className="btn secondary" onClick={() => setLogging(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---- history ---- */}
      <h3>What you have noticed so far</h3>
      {milestones.length === 0 ? (
        <p className="stage-hint">
          Nothing logged yet. The first one to watch for at this stage:{' '}
          <strong>{(nextStage[0] ?? thisStage[0])?.label.toLowerCase()}</strong>.
        </p>
      ) : (
        <ol className="milestone-history">
          {milestones.map((m, i) => (
            <li key={`${m.at}-${i}`}>
              <span className="mh-date">{when(m.at)}</span>
              <span className="mh-body">
                <strong>{m.kind?.label ?? m.id}</strong>
                {m.note && <em>“{m.note}”</em>}
              </span>
              {m.kind && <span className="badge muted">stage {m.kind.signals}</span>}
            </li>
          ))}
        </ol>
      )}

      {/* ---- summary for an SLP or the other parent ---- */}
      <section className="summary-block">
        <h3>Share a summary</h3>
        <p className="stage-hint">
          Everything above as plain text: current stage, dated milestones, what is being
          modeled, and your notes. Useful for an SLP appointment, a teacher, or the
          other parent. Nothing is uploaded — it is built on this device.
        </p>
        <div className="row">
          <button className="btn" onClick={() => void copySummary()}>
            Copy summary
          </button>
          <button className="btn secondary" onClick={downloadSummary}>
            Download as a file
          </button>
          <button className="btn secondary" onClick={() => setSummaryOpen((v) => !v)}>
            {summaryOpen ? 'Hide preview' : 'Preview'}
          </button>
        </div>
        {copied && <p className="stage-saved">{copied}</p>}
        {summaryOpen && <pre className="summary-preview">{summary}</pre>}
      </section>

      <p className="stage-hint evidence-note">
        The six-stage model (Natural Language Acquisition, Marge Blanc) is widely used
        by speech-language pathologists but has no controlled effectiveness studies yet.
        Treat the stage here as a shared vocabulary for what you are seeing, not a
        diagnosis — and bring this page to an SLP rather than replacing one with it.
      </p>
        </div>
      )}
    </div>
  )
}
