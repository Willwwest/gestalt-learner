import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MILESTONES,
  STAGE_GUIDANCE,
  type ChildStage,
  type LoggedMilestone,
  type MilestoneKind,
  listMilestones,
  logMilestone,
  milestonesFor,
  suggestStage,
} from '../lib/stages'
import type { Settings } from '../lib/types'

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

  const stage = settings.childStage
  const guidance = STAGE_GUIDANCE[stage]

  const refresh = useCallback(() => {
    void listMilestones().then(setMilestones)
  }, [])

  useEffect(refresh, [refresh])

  const suggestion = useMemo(() => suggestStage(milestones, stage), [milestones, stage])
  const { thisStage, nextStage } = useMemo(() => milestonesFor(stage), [stage])
  const loggable = showAll ? MILESTONES : [...thisStage, ...nextStage]

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
            Where your child is in the gestalt language path, what to model right now,
            and the signals that mean it is time to change what you do. Nothing here is
            a test or a score — it is a record of what you have noticed.
          </p>
        </div>
      </div>

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

      <p className="stage-hint evidence-note">
        The six-stage model (Natural Language Acquisition, Marge Blanc) is widely used
        by speech-language pathologists but has no controlled effectiveness studies yet.
        Treat the stage here as a shared vocabulary for what you are seeing, not a
        diagnosis — and bring this page to an SLP rather than replacing one with it.
      </p>
    </div>
  )
}
