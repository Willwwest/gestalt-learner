import { useState } from 'react'
import { requestPersistence } from '../lib/db'
import { speak } from '../lib/tts'
import type { Settings, TileSize, VocabularySize } from '../lib/types'
import Icon from './Icon'

const TILE_OPTIONS: { value: TileSize; label: string; detail: string }[] = [
  { value: 'standard', label: 'Comfortable', detail: 'More words on one screen' },
  { value: 'large', label: 'Large', detail: 'Fewer, larger targets' },
  { value: 'extra-large', label: 'Extra large', detail: 'Maximum target size' },
]

const VOCAB_OPTIONS: { value: VocabularySize; label: string; detail: string }[] = [
  { value: 'starter', label: 'Start with six', detail: 'A calm first set in each topic' },
  { value: 'growing', label: 'Grow to twelve', detail: 'More language, same positions' },
  { value: 'full', label: 'Show everything', detail: 'The complete phrase library' },
]

export default function Onboarding({
  settings,
  onComplete,
}: {
  settings: Settings
  onComplete: (settings: Settings) => void
}) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(settings)

  const finish = () => {
    void requestPersistence()
    onComplete({ ...draft, onboardingComplete: true })
  }

  return (
    <div className="onboarding-scrim" role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <div className="onboarding-card">
        <header className="onboarding-head">
          <span className="onboarding-logo"><Icon name="sprout" size={32} /></span>
          <div>
            <span className="eyebrow">Caregiver setup · {step + 1} of 3</span>
            <h2 id="setup-title">
              {step === 0 ? 'A voice that feels familiar' : step === 1 ? 'Choose a calm starting point' : 'Make access comfortable'}
            </h2>
          </div>
        </header>

        <div className="onboarding-progress" aria-hidden="true">
          {[0, 1, 2].map((index) => <span key={index} className={index <= step ? 'active' : ''} />)}
        </div>

        <div className="onboarding-body">
          {step === 0 && (
            <>
              <p>
                EchoBloom keeps whole phrases, personal recordings, songs, and photos on
                this device. No account is required, and communication never sits behind
                a subscription.
              </p>
              <label className="setup-field">
                <span>Communicator’s name <small>(optional, caregiver screens only)</small></span>
                <input
                  type="text"
                  value={draft.childName}
                  onChange={(event) => setDraft({ ...draft, childName: event.target.value })}
                  placeholder="Name"
                  autoFocus
                />
              </label>
              <div className="setup-principles">
                <span>✓ Buttons keep their places</span>
                <span>✓ Family recordings work offline</span>
                <span>✓ No quizzes, streaks, or pressure</span>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <fieldset className="setup-choice-group">
                <legend>Phrase library</legend>
                <p>New phrases are revealed at the end, so learned motor paths do not move.</p>
                <div className="setup-choice-grid">
                  {VOCAB_OPTIONS.map((option) => (
                    <label key={option.value} className={draft.vocabularySize === option.value ? 'selected' : ''}>
                      <input
                        type="radio"
                        name="vocabulary-size"
                        value={option.value}
                        checked={draft.vocabularySize === option.value}
                        onChange={() => setDraft({ ...draft, vocabularySize: option.value })}
                      />
                      <strong>{option.label}</strong>
                      <span>{option.detail}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="setup-choice-group">
                <legend>Button size</legend>
                <div className="setup-choice-grid">
                  {TILE_OPTIONS.map((option) => (
                    <label key={option.value} className={draft.tileSize === option.value ? 'selected' : ''}>
                      <input
                        type="radio"
                        name="tile-size"
                        value={option.value}
                        checked={draft.tileSize === option.value}
                        onChange={() => setDraft({ ...draft, tileSize: option.value })}
                      />
                      <strong>{option.label}</strong>
                      <span>{option.detail}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {step === 2 && (
            <div className="setup-access-list">
              <label>
                <span><strong>Quick Talk</strong><small>Keep help, break, stop, and sensory phrases available everywhere.</small></span>
                <input
                  type="checkbox"
                  checked={draft.quickBarEnabled}
                  onChange={(event) => setDraft({ ...draft, quickBarEnabled: event.target.checked })}
                />
              </label>
              <label>
                <span><strong>High contrast</strong><small>Stronger outlines and clearer selected states.</small></span>
                <input
                  type="checkbox"
                  checked={draft.highContrast}
                  onChange={(event) => setDraft({ ...draft, highContrast: event.target.checked })}
                />
              </label>
              <label>
                <span><strong>Reduce motion</strong><small>Remove decorative movement and smooth scrolling.</small></span>
                <input
                  type="checkbox"
                  checked={draft.reducedMotion}
                  onChange={(event) => setDraft({ ...draft, reducedMotion: event.target.checked })}
                />
              </label>
              <label>
                <span><strong>Pointer dwell</strong><small>For eye or head-mouse access. Ordinary touch is unaffected.</small></span>
                <select
                  value={draft.dwellMs}
                  onChange={(event) => setDraft({ ...draft, dwellMs: Number(event.target.value) as Settings['dwellMs'] })}
                >
                  <option value={0}>Off</option>
                  <option value={600}>0.6 seconds</option>
                  <option value={1000}>1 second</option>
                </select>
              </label>
              <button
                type="button"
                className="setup-voice-test"
                onClick={() => void speak('Help, please!', 'en', draft.ttsRate)}
              >
                <Icon name="play" size={20} /> Test the device voice
              </button>
            </div>
          )}
        </div>

        <footer className="onboarding-actions">
          {step > 0 ? (
            <button className="btn secondary" type="button" onClick={() => setStep(step - 1)}>Back</button>
          ) : (
            <button className="text-button" type="button" onClick={finish}>Skip setup</button>
          )}
          <span className="spacer" />
          {step < 2 ? (
            <button className="btn" type="button" onClick={() => setStep(step + 1)}>Continue</button>
          ) : (
            <button className="btn" type="button" onClick={finish}>Open EchoBloom</button>
          )}
        </footer>
      </div>
    </div>
  )
}
