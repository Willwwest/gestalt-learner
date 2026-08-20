import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import Icon from './Icon'

const TIMER_OPTIONS = [60, 180, 300]

function timeLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export default function CalmSpace({
  reducedMotion,
  onClose,
}: {
  reducedMotion: boolean
  onClose: () => void
}) {
  const [mode, setMode] = useState<'quiet' | 'timer'>('quiet')
  const [duration, setDuration] = useState(180)
  const [remaining, setRemaining] = useState(180)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running || remaining <= 0) return
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          setRunning(false)
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [remaining, running])

  const progress = useMemo(
    () => (duration > 0 ? ((duration - remaining) / duration) * 360 : 0),
    [duration, remaining],
  )

  const chooseTimer = (seconds: number) => {
    setDuration(seconds)
    setRemaining(seconds)
    setRunning(false)
  }

  return (
    <div className="calm-scrim" role="dialog" aria-modal="true" aria-labelledby="calm-title">
      <div className="calm-space">
        <header className="calm-head">
          <div>
            <span className="eyebrow">No rush</span>
            <h2 id="calm-title">Pause space</h2>
          </div>
          <button type="button" className="calm-close" onClick={onClose} aria-label="Close pause space">×</button>
        </header>

        <div className="calm-mode-switch" role="group" aria-label="Pause tool">
          <button type="button" className={mode === 'quiet' ? 'active' : ''} onClick={() => setMode('quiet')}>Quiet screen</button>
          <button type="button" className={mode === 'timer' ? 'active' : ''} onClick={() => setMode('timer')}>Visual timer</button>
        </div>

        {mode === 'quiet' ? (
          <div className={`quiet-space${reducedMotion ? ' still' : ''}`}>
            <div className="quiet-orbit"><span><Icon name="sprout" size={42} /></span></div>
            <strong>Take all the time needed.</strong>
            <p>Nothing to finish. Nothing to get right.</p>
          </div>
        ) : (
          <div className="visual-timer">
            <div
              className={`timer-ring${remaining === 0 ? ' complete' : ''}`}
              style={{ '--timer-progress': `${progress}deg` } as CSSProperties}
              role="timer"
              aria-live="polite"
              aria-label={`${timeLabel(remaining)} remaining`}
            >
              <div>
                <strong>{remaining === 0 ? 'Ready' : timeLabel(remaining)}</strong>
                <span>{remaining === 0 ? 'The time is finished.' : 'remaining'}</span>
              </div>
            </div>
            <div className="timer-presets" role="group" aria-label="Timer length">
              {TIMER_OPTIONS.map((seconds) => (
                <button key={seconds} type="button" className={duration === seconds ? 'active' : ''} onClick={() => chooseTimer(seconds)}>
                  {seconds / 60} min
                </button>
              ))}
            </div>
            <div className="timer-actions">
              <button type="button" className="btn" onClick={() => remaining === 0 ? chooseTimer(duration) : setRunning((value) => !value)}>
                <Icon name={running ? 'stop' : 'play'} size={19} />
                {remaining === 0 ? 'Reset' : running ? 'Pause' : 'Start'}
              </button>
              <button type="button" className="btn secondary" onClick={() => chooseTimer(duration)}>Start over</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
