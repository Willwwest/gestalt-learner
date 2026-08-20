import { useState } from 'react'
import {
  ALPHABETS,
  COLORS,
  NUMBER_WORDS,
  SHAPES,
  foundComment,
  type Glyph,
  type GlyphKind,
} from '../lib/alphabets'
import { logEvent } from '../lib/db'
import { speak } from '../lib/tts'
import { stopAllAudio } from '../lib/audio'
import { selectionFeedback } from '../lib/haptics'
import { LANGUAGES, type LanguageCode, type Settings } from '../lib/types'

type Mode = 'letters' | 'numbers' | 'colors' | 'shapes'

const MODE_KIND: Record<Mode, GlyphKind> = {
  letters: 'letter',
  numbers: 'number',
  colors: 'color',
  shapes: 'shape',
}

interface Tile extends Glyph {
  /** css color for swatch/shape tiles */
  hex?: string
  /** word shown under the glyph (colors/shapes/numbers) */
  sub?: string
  /** the "I found ___" form (with article where the language needs one) */
  commentSay?: string
}

export default function Letters({ settings }: { settings: Settings }) {
  const [lang, setLang] = useState<LanguageCode>(settings.languages[0] ?? 'en')
  const [mode, setMode] = useState<Mode>('letters')
  const [current, setCurrent] = useState<Tile | null>(null)

  const tiles: Tile[] =
    mode === 'letters'
      ? ALPHABETS[lang]
      : mode === 'numbers'
        ? NUMBER_WORDS[lang].map((word, i) => ({
            glyph: String(i + 1),
            say: word,
            sub: word,
          }))
        : (mode === 'colors' ? COLORS : SHAPES).map((s) => ({
            glyph: s.glyph,
            say: s.word[lang],
            sub: s.word[lang],
            hex: s.hex,
            commentSay: s.withArticle[lang],
          }))

  const onTile = async (t: Tile) => {
    stopAllAudio()
    void selectionFeedback(settings.hapticsEnabled)
    setCurrent(t)
    // journal readability: shapes log their word ("circle"), not the glyph ("●")
    void logEvent('letter-tap', `${lang}:${mode === 'shapes' ? t.say : t.glyph || t.say}`)
    await speak(t.say, lang, settings.ttsRate)
  }

  const comment = current
    ? foundComment(lang, MODE_KIND[mode], current.commentSay ?? current.say)
    : null

  const switchLang = (l: LanguageCode) => {
    stopAllAudio()
    void selectionFeedback(settings.hapticsEnabled)
    setLang(l)
    setCurrent(null)
  }

  const switchMode = (m: Mode) => {
    stopAllAudio()
    void selectionFeedback(settings.hapticsEnabled)
    setMode(m)
    setCurrent(null)
  }

  const isCurrent = (t: Tile) =>
    current !== null && (t.glyph || t.say) === (current.glyph || current.say)

  return (
    <>
      <div className="lang-toolbar">
        <div className="lang-rail" role="group" aria-label="Language">
          {settings.languages.map((l) => (
            <button
              key={l}
              className={`cat-chip${l === lang ? ' active' : ''}`}
              onClick={() => switchLang(l)}
              aria-pressed={l === lang}
            >
              <span>{LANGUAGES[l].native}</span>
              <small>{LANGUAGES[l].label}</small>
            </button>
          ))}
        </div>
        <div className="mode-switch" role="group" aria-label="What to explore">
          <button
            className={mode === 'letters' ? 'active' : ''}
            onClick={() => switchMode('letters')}
            aria-pressed={mode === 'letters'}
          >
            ABC <span>Letters</span>
          </button>
          <button
            className={mode === 'numbers' ? 'active' : ''}
            onClick={() => switchMode('numbers')}
            aria-pressed={mode === 'numbers'}
          >
            123 <span>Numbers</span>
          </button>
          <button
            className={mode === 'colors' ? 'active' : ''}
            onClick={() => switchMode('colors')}
            aria-pressed={mode === 'colors'}
          >
            🎨 <span>Colors</span>
          </button>
          <button
            className={mode === 'shapes' ? 'active' : ''}
            onClick={() => switchMode('shapes')}
            aria-pressed={mode === 'shapes'}
          >
            ●▲ <span>Shapes</span>
          </button>
        </div>
      </div>
      <div className="glyph-grid">
        {tiles.map((t) => (
          <button
            key={t.glyph || t.say}
            className={`glyph${isCurrent(t) ? ' playing' : ''}`}
            onClick={() => void onTile(t)}
            aria-pressed={isCurrent(t)}
          >
            {mode === 'colors' ? (
              <span className="color-dot" style={{ background: t.hex }} />
            ) : mode === 'shapes' ? (
              <span className="shape-glyph" style={{ color: t.hex }}>
                {t.glyph}
              </span>
            ) : (
              t.glyph
            )}
            {t.sub && <span className="glyph-sub">{t.sub}</span>}
          </button>
        ))}
      </div>
      <button
        className={`caption${current ? '' : ' idle'}`}
        onClick={() => comment && void speak(comment.speak, lang, settings.ttsRate)}
        aria-live="polite"
      >
        {comment ? (
          <>
            <span className="cap-emoji">🔎</span>
            {comment.display}
          </>
        ) : (
          'Tap to hear it!'
        )}
      </button>
    </>
  )
}
