import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import PhraseFinder from './PhraseFinder'
import PhraseVisual from './PhraseVisual'
import { listCategories, listPhrases, logEvent, rememberMessage } from '../lib/db'
import { playPhrase, preloadPhraseAudio, stopAllAudio } from '../lib/audio'
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
  const [finderOpen, setFinderOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [temporarilyRevealedCat, setTemporarilyRevealedCat] = useState<string | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  useEffect(() => {
    void (async () => {
      const cats = await listCategories()
      setCategories(cats)
      if (cats.length > 0) setActiveCat(cats[0].id)
      const allPhrases = await listPhrases()
      setPhrases(allPhrases)
      void preloadPhraseAudio(allPhrases.filter((phrase) => phrase.stage === 1 && !phrase.hidden))
      const parts = await listPhrases('mix')
      setStarters(parts.filter((p) => p.partType === 'starter' && !p.hidden))
    })()
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current)
    }
  }, [])

  const categoryPhrases = phrases.filter(
    (p) => p.categoryId === activeCat && p.stage === 1 && !p.hidden,
  )
  const vocabularyLimit =
    settings.vocabularySize === 'starter'
      ? 6
      : settings.vocabularySize === 'growing'
        ? 12
        : Number.POSITIVE_INFINITY
  const visible =
    temporarilyRevealedCat === activeCat
      ? categoryPhrases
      : categoryPhrases.slice(0, vocabularyLimit)
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
    void rememberMessage({
      text: phrase.text,
      emoji: phrase.emoji,
      lang: phrase.lang,
      source: 'board',
      phraseId: phrase.id,
      recordingId: phrase.recordingId,
    })
    await playPhrase(phrase, settings.ttsRate)
  }

  const showFoundPhrase = (phrase: Phrase) => {
    setFinderOpen(false)
    setActiveCat(phrase.categoryId)
    const sameCategory = phrases.filter(
      (item) => item.categoryId === phrase.categoryId && item.stage === 1 && !item.hidden,
    )
    if (sameCategory.findIndex((item) => item.id === phrase.id) >= vocabularyLimit) {
      setTemporarilyRevealedCat(phrase.categoryId)
    }
    setHighlightId(phrase.id)
    setSplit(null)
    window.setTimeout(() => {
      document.getElementById(`phrase-${phrase.id}`)?.scrollIntoView({
        behavior: settings.reducedMotion ? 'auto' : 'smooth',
        block: 'center',
      })
    }, 80)
    window.setTimeout(() => setHighlightId(null), 5000)
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
            className={`cat-chip dwell-target${cat.id === activeCat ? ' active' : ''}`}
            data-dwell="true"
            style={{ '--chip-color': cat.color } as CSSProperties}
            onClick={() => {
              void selectionFeedback(settings.hapticsEnabled)
              setActiveCat(cat.id)
              setTemporarilyRevealedCat(null)
              setSplit(null)
            }}
            aria-pressed={cat.id === activeCat}
          >
            <span className="chip-emoji">{cat.emoji}</span>
            <span className="chip-name">{cat.name}</span>
          </button>
        ))}
        <button
          type="button"
          className="cat-chip find-chip dwell-target"
          data-dwell="true"
          onClick={() => setFinderOpen(true)}
          aria-label="Find a phrase without moving the board"
        >
          <span className="find-chip-icon"><Icon name="search" size={20} /></span>
          <span className="chip-name">Find</span>
        </button>
      </div>
      <div className="tile-grid" style={boardStyle}>
        {visible.map((phrase) => (
          <button
            key={phrase.id}
            id={`phrase-${phrase.id}`}
            className={`tile dwell-target${nowPlaying?.id === phrase.id ? ' playing' : ''}${
              highlightId === phrase.id ? ' found' : ''
            }`}
            data-dwell="true"
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
      <PhraseFinder
        open={finderOpen}
        phrases={phrases}
        categories={categories}
        onChoose={showFoundPhrase}
        onClose={() => setFinderOpen(false)}
      />
    </>
  )
}
