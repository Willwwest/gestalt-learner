import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  seconds: number
  onStart?: () => void
  onComplete: () => void
  label: string
  emoji: string
  compact?: boolean
}

/** Press-and-hold gate so little fingers can't wander into the parent zone. */
export default function HoldButton({
  seconds,
  onStart,
  onComplete,
  label,
  emoji,
  compact,
}: Props) {
  const [progress, setProgress] = useState(0)
  const raf = useRef(0)
  const start = useRef(0)
  const holding = useRef(false)

  const tick = useCallback(
    function tickFrame(now: number) {
      if (!holding.current) return
      const p = Math.min(1, (now - start.current) / (seconds * 1000))
      setProgress(p)
      if (p >= 1) {
        holding.current = false
        setProgress(0)
        onComplete()
        return
      }
      raf.current = requestAnimationFrame(tickFrame)
    },
    [seconds, onComplete],
  )

  const begin = useCallback(() => {
    onStart?.()
    holding.current = true
    start.current = performance.now()
    raf.current = requestAnimationFrame(tick)
  }, [onStart, tick])

  const end = useCallback(() => {
    holding.current = false
    cancelAnimationFrame(raf.current)
    setProgress(0)
  }, [])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const deg = Math.round(progress * 360)
  const size = compact ? 74 : 180

  return (
    <button
      className="hold-btn"
      style={{ width: size, height: size, fontSize: compact ? 10.5 : 20 }}
      onPointerDown={begin}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${label} — press and hold`}
    >
      <span
        className="hold-progress"
        style={{
          background: `conic-gradient(var(--accent) ${deg}deg, transparent ${deg}deg)`,
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px))',
          WebkitMask:
            'radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px))',
        }}
      />
      <span className="hold-emoji" style={{ fontSize: compact ? 24 : 52 }}>
        {emoji}
      </span>
      {label}
    </button>
  )
}
