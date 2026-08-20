import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import PhraseVisual from './PhraseVisual'
import { listCategories, listPhrases, logEvent } from '../lib/db'
import { playPhrase, stopAllAudio } from '../lib/audio'
import { speak } from '../lib/tts'
import { selectionFeedback } from '../lib/haptics'
import type { Category, Phrase, Settings } from '../lib/types'

interface Split {
  phrase: Phrase
  /** the mix-and-match beginning this phrase starts with, when we have it */
  starterPart: Phrase | null
  starterText: string
  remainder: string
}

/** Break a gestalt into the beginning frame + the rest, using the same
 *  pieces the child knows from Mix & Match (longest frame wins). */
function splitOf(phrase: Phrase, starters: Phrase[]): Split | null {
  for (const s of [...starters].sort((a, b) => b.text.length - a.text.length)) {
    if (phrase.text.toLowerCase().startsWith(`${s.text.toLowerCase()} `)) {
      const remainder = phrase.text
        .slice(s.text.length)
        .trim()
        .replace(/[!.?]+$/, '')
      if (remainder) {
        return { phrase, starterPart: s, starterText: s.text, remainder }
      }
    }
  }
  return null
}

export default function Board({ settings }: { settings: Settings }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [starters, setStarters] = useState<Phrase[]>([])
  const [activeCat, setActiveCat] = useState<string>('')
  const [nowPlaying, setNowPlaying] = useState<Phrase | null>(null)
  const [split, setSplit] = useState<Split | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  useEffect(() => {
    void (async () => {
      const cats = await listCategories()
      setCategories(cats)
      if (cats.length > 0) setActiveCat(cats[0].id)
      setPhrases(await listPhrases())
      const parts = await listPhrases('mix')
      setStarters(parts.filter((p) => p.partType === 'starter' && !p.hidden))
    })()
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current)
    }
  }, [])

  const visible = phrases.filter(
    (p) => p.categoryId === activeCat && p.stage === 1 && !p.hidden,
  )
  const activeCategory = categories.find((cat) => cat.id === activeCat)
  const boardStyle = {
    '--section-color': activeCategory?.color ?? 'var(--view-accent)',
  } as CSSProperties

  const onTap = async (phrase: Phrase) => {
    if (longPressFired.current) {
      // the long-press already handled this touch — don't also play the whole phrase
      longPressFired.current = false
      return
    }
    setSplit(null)
    setNowPlaying(phrase)
    void selectionFeedback(settings.hapticsEnabled)
    void logEvent('phrase-tap', phrase.text)
    await playPhrase(phrase, settings.ttsRate)
  }

  const beginHold = (phrase: Phrase) => {
    longPressFired.current = false
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = setTimeout(() => {
      const s = splitOf(phrase, starters)
      if (s) {
        void selectionFeedback(settings.hapticsEnabled)
        longPressFired.current = true
        stopAllAudio()
        setNowPlaying(null)
        setSplit(s)
        void logEvent('split-open', phrase.text)
      }
    }, 550)
  }

  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
  }

  const playChunk = async (text: string, viaPart: Phrase | null) => {
    void selectionFeedback(settings.hapticsEnabled)
    void logEvent('split-part', text)
    if (viaPart) {
      await playPhrase(viaPart, settings.ttsRate)
    } else {
      stopAllAudio()
      await speak(text, split?.phrase.lang ?? 'en', settings.ttsRate)
    }
  }

  return (
    <>
      <div className="cat-rail" style={boardStyle} role="group" aria-label="Topics">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`cat-chip${cat.id === activeCat ? ' active' : ''}`}
            style={{ '--chip-color': cat.color } as CSSProperties}
            onClick={() => {
              void selectionFeedback(settings.hapticsEnabled)
              setActiveCat(cat.id)
              setSplit(null)
            }}
            aria-pressed={cat.id === activeCat}
          >
            <span className="chip-emoji">{cat.emoji}</span>
            <span className="chip-name">{cat.name}</span>
          </button>
        ))}
      </div>
      <div className="tile-grid" style={boardStyle}>
        {visible.map((phrase) => (
          <button
            key={phrase.id}
            className={`tile${nowPlaying?.id === phrase.id ? ' playing' : ''}`}
            onClick={() => void onTap(phrase)}
            onPointerDown={() => beginHold(phrase)}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            onContextMenu={(e) => e.preventDefault()}
            aria-pressed={nowPlaying?.id === phrase.id}
          >
            {phrase.focus && <span className="focus-star">⭐</span>}
            <PhraseVisual
              emoji={phrase.emoji}
              symbolId={phrase.symbolId}
              className="tile-emoji"
            />
            <span className="tile-text">{phrase.text}</span>
          </button>
        ))}
      </div>
      {split ? (
        <div className="caption split-caption" aria-live="polite">
          <button
            className="split-chip"
            onClick={() => void playChunk(split.starterText, split.starterPart)}
          >
            {split.starterText}
          </button>
          <span className="split-plus">+</span>
          <button className="split-chip" onClick={() => void playChunk(split.remainder, null)}>
            {split.remainder}
          </button>
          <button
            className="split-close"
            onClick={() => setSplit(null)}
            aria-label="Put the phrase back together"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className={`caption${nowPlaying ? '' : ' idle'}`} aria-live="polite">
          {nowPlaying ? (
            <>
              <PhraseVisual
                emoji={nowPlaying.emoji}
                symbolId={nowPlaying.symbolId}
                className="cap-emoji"
              />
              <span>{nowPlaying.text}</span>
            </>
          ) : (
            <>
              <span className="caption-icon">
                <Icon name="wave" size={24} />
              </span>
              <span className="caption-copy">
                <strong>Tap a phrase to say it together.</strong>
                <small>Press and hold a phrase to hear its pieces.</small>
              </span>
            </>
          )}
        </div>
      )}
    </>
  )
}
