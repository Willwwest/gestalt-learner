import { useEffect, useState } from 'react'
import { listPhrases, logEvent, rememberMessage } from '../lib/db'
import { playPhrase, preloadPhraseAudio } from '../lib/audio'
import { selectionFeedback } from '../lib/haptics'
import type { Phrase, Settings } from '../lib/types'
import PhraseVisual from './PhraseVisual'
import CalmSpace from './CalmSpace'
import Icon from './Icon'

export default function QuickTalk({
  settings,
  home = false,
}: {
  settings: Settings
  home?: boolean
}) {
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [calmOpen, setCalmOpen] = useState(false)

  useEffect(() => {
    void listPhrases().then((all) => {
      let quick = all
        .filter((phrase) => phrase.quickAccess && !phrase.hidden && phrase.stage === 1)
        .slice(0, 5)
      // Backups made before Quick Talk existed have no pin flags. Keep a safe
      // default available without rewriting the restored vocabulary.
      if (quick.length === 0) {
        const defaults = new Set([
          'Help, please!',
          'I need a break.',
          "It's too loud!",
          'No, thank you.',
          'Stop, please.',
        ])
        quick = all.filter((phrase) => defaults.has(phrase.text) && !phrase.hidden).slice(0, 5)
      }
      setPhrases(quick)
      void preloadPhraseAudio(quick)
    })
  }, [])

  if (!settings.quickBarEnabled || phrases.length === 0) return null

  const say = async (phrase: Phrase) => {
    void selectionFeedback(settings.hapticsEnabled)
    void logEvent('quick-talk', phrase.text)
    void rememberMessage({
      text: phrase.text,
      emoji: phrase.emoji,
      lang: phrase.lang,
      source: 'quick',
      phraseId: phrase.id,
      recordingId: phrase.recordingId,
    })
    await playPhrase(phrase, settings.ttsRate)
  }

  return (
    <section className={`quick-talk${home ? ' quick-talk-home' : ''}`} aria-label="Quick Talk">
      <span className="quick-talk-label">
        <span aria-hidden="true">✋</span>
        <span>Quick Talk</span>
      </span>
      <div className="quick-talk-actions">
        {phrases.map((phrase) => (
          <button
            key={phrase.id}
            type="button"
            className="quick-talk-button dwell-target"
            data-dwell="true"
            onClick={() => void say(phrase)}
          >
            <PhraseVisual
              emoji={phrase.emoji}
              symbolId={phrase.symbolId}
              className="quick-talk-visual"
            />
            <span>{phrase.text}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="quick-calm-button"
        onClick={() => setCalmOpen(true)}
        aria-label="Open quiet screen and visual timer"
      >
        <Icon name="sprout" size={19} />
        <span>Pause</span>
      </button>
      {calmOpen && (
        <CalmSpace reducedMotion={settings.reducedMotion} onClose={() => setCalmOpen(false)} />
      )}
    </section>
  )
}
