import { useEffect, useState } from 'react'
import { getRecording, listPhrases, logEvent } from '../lib/db'
import { playBlob, playPhrase, stopAllAudio } from '../lib/audio'
import { speak } from '../lib/tts'
import { selectionFeedback } from '../lib/haptics'
import type { Phrase, Settings } from '../lib/types'
import Icon from './Icon'
import PhraseVisual from './PhraseVisual'

function sentenceOf(starter: Phrase, ender: Phrase) {
  return `${starter.text} ${ender.text}!`
}

export default function Mix({ settings }: { settings: Settings }) {
  const [starters, setStarters] = useState<Phrase[]>([])
  const [enders, setEnders] = useState<Phrase[]>([])
  const [starter, setStarter] = useState<Phrase | null>(null)
  const [ender, setEnder] = useState<Phrase | null>(null)

  useEffect(() => {
    void listPhrases('mix').then((parts) => {
      const alive = parts.filter((p) => !p.hidden)
      setStarters(alive.filter((p) => p.partType === 'starter'))
      setEnders(alive.filter((p) => p.partType === 'ender'))
    })
  }, [])

  const compatible = (e: Phrase) =>
    !starter || !starter.accepts || (e.slot != null && starter.accepts.includes(e.slot))

  const playCombined = async (s: Phrase, e: Phrase) => {
    stopAllAudio()
    void logEvent('mix-play', sentenceOf(s, e))
    // both halves recorded in a real voice -> play them back to back
    // (hearing the chunks join is the point of mitigation play);
    // otherwise let TTS speak the whole sentence with natural flow
    const [recS, recE] = await Promise.all([
      s.recordingId ? getRecording(s.recordingId) : undefined,
      e.recordingId ? getRecording(e.recordingId) : undefined,
    ])
    if (recS && recE) {
      await playBlob(recS.blob)
      await playBlob(recE.blob)
    } else {
      await speak(sentenceOf(s, e), s.lang, settings.ttsRate)
    }
  }

  const onStarter = async (s: Phrase) => {
    void selectionFeedback(settings.hapticsEnabled)
    setStarter(s)
    const keptEnder =
      ender && s.accepts && ender.slot && s.accepts.includes(ender.slot) ? ender : null
    setEnder(keptEnder)
    if (keptEnder) {
      await playCombined(s, keptEnder)
    } else {
      void logEvent('mix-part', s.text)
      await playPhrase(s, settings.ttsRate)
    }
  }

  const onEnder = async (e: Phrase) => {
    void selectionFeedback(settings.hapticsEnabled)
    if (starter && compatible(e)) {
      setEnder(e)
      await playCombined(starter, e)
    } else {
      // no starter picked: hearing the word alone is single-word exposure — also good
      void logEvent('mix-part', e.text)
      await playPhrase(e, settings.ttsRate)
    }
  }

  const clear = () => {
    stopAllAudio()
    setStarter(null)
    setEnder(null)
  }

  return (
    <>
      <div className="mix-strip">
        <button
          className={`mix-sentence${starter && ender ? '' : ' idle'}`}
          onClick={() => starter && ender && void playCombined(starter, ender)}
          aria-live="polite"
        >
          {starter && ender ? (
            <>
              <span className="sentence-play">
                <Icon name="play" size={18} />
              </span>
              <span>{sentenceOf(starter, ender)}</span>
            </>
          ) : starter ? (
            <>
              <span>{starter.text}</span> <span className="sentence-blank">+ ___</span>
            </>
          ) : (
            <span className="sentence-prompt">
              <strong>Make a new sentence</strong>
              <small>Choose one piece from each side.</small>
            </span>
          )}
        </button>
        <button className="mix-clear" onClick={clear} aria-label="Start over">
          <Icon name="reset" size={27} />
        </button>
      </div>
      <div className="mix-layout">
        <div className="mix-panel mix-start-panel">
          <div className="mix-panel-head">
            <span className="step-number">1</span>
            <div>
              <p className="mix-col-title">Choose a beginning</p>
              <span>How should the thought start?</span>
            </div>
          </div>
          <div className="mix-col">
            {starters.map((s) => (
              <button
                key={s.id}
                className={`part${starter?.id === s.id ? ' selected' : ''}`}
                onClick={() => void onStarter(s)}
                aria-pressed={starter?.id === s.id}
              >
                <PhraseVisual emoji={s.emoji} symbolId={s.symbolId} className="part-emoji" />
                <span>{s.text} …</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mix-panel mix-end-panel">
          <div className="mix-panel-head">
            <span className="step-number">2</span>
            <div>
              <p className="mix-col-title">Choose an ending</p>
              <span>Finish the thought with a new piece.</span>
            </div>
          </div>
          <div className="mix-enders">
            {enders.map((e) => (
              <button
                key={e.id}
                className={`part${ender?.id === e.id ? ' selected' : ''}${
                  compatible(e) ? '' : ' dimmed'
                }`}
                onClick={() => void onEnder(e)}
                aria-pressed={ender?.id === e.id}
              >
                <PhraseVisual emoji={e.emoji} symbolId={e.symbolId} className="part-emoji" />
                <span>{e.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
