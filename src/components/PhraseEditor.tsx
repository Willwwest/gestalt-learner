import { useState } from 'react'
import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import RecorderControl from './RecorderControl'
import SymbolPicker, { type PendingSymbol } from './SymbolPicker'
import { deletePhrase, deleteRecording, makeId, putPhrase, saveRecording } from '../lib/db'
import { cacheArasaacSymbol } from '../lib/symbols'
import { LANGUAGES, type LanguageCode, type Phrase, type SlotKind } from '../lib/types'

const SLOTS: SlotKind[] = ['thing', 'stuff', 'person', 'activity', 'feeling', 'place']

interface Props {
  phrase: Phrase
  isNew: boolean
  onDone: (changed: boolean) => void
}

export default function PhraseEditor({ phrase, isNew, onDone }: Props) {
  const [text, setText] = useState(phrase.text)
  const [emoji, setEmoji] = useState(phrase.emoji)
  const [gloss, setGloss] = useState(phrase.gloss ?? '')
  const [lang, setLang] = useState<LanguageCode>(phrase.lang)
  const [hidden, setHidden] = useState(!!phrase.hidden)
  const [focus, setFocus] = useState(!!phrase.focus)
  const [slot, setSlot] = useState<SlotKind>(phrase.slot ?? 'thing')
  const [accepts, setAccepts] = useState<SlotKind[]>(phrase.accepts ?? ['thing'])
  // undefined = keep existing recording, null = remove it, Blob = replace it
  const [pendingAudio, setPendingAudio] = useState<Blob | null | undefined>(undefined)
  // undefined = keep the cached symbol, null = use emoji, object = download on save
  const [pendingSymbol, setPendingSymbol] = useState<PendingSymbol>(undefined)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const isMixPart = !!phrase.partType
  const isBoardPhrase =
    !isMixPart &&
    !phrase.categoryId.startsWith('song:') &&
    !phrase.categoryId.startsWith('scene:')

  const save = async () => {
    setSaveError('')
    setSaving(true)
    try {
      let symbolId = phrase.symbolId
      if (pendingSymbol === null) {
        symbolId = undefined
      } else if (pendingSymbol) {
        symbolId = await cacheArasaacSymbol(pendingSymbol)
      }

      // Write new audio first, point the phrase at it, and only then delete the old
      // one. A failure part-way through must never lose a family recording.
      const oldRecordingId = phrase.recordingId
      let recordingId = oldRecordingId
      if (pendingAudio instanceof Blob) {
        recordingId = makeId()
        await saveRecording({
          id: recordingId,
          blob: pendingAudio,
          mimeType: pendingAudio.type,
          createdAt: Date.now(),
        })
      } else if (pendingAudio === null) {
        recordingId = undefined
      }

      await putPhrase({
        ...phrase,
        text: text.trim(),
        emoji: emoji.trim() || '💬',
        gloss: gloss.trim() || undefined,
        lang,
        hidden,
        focus,
        recordingId,
        symbolId,
        ...(isMixPart
          ? phrase.partType === 'starter'
            ? { accepts }
            : { slot }
          : {}),
      })
      if (oldRecordingId && oldRecordingId !== recordingId) {
        await deleteRecording(oldRecordingId)
      }
      onDone(true)
    } catch (err) {
      setSaveError(
        `Could not save: ${err instanceof Error ? err.message : String(err)}. ` +
          'Nothing was lost—check the connection or free device storage and try again.',
      )
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await deletePhrase(phrase.id)
      onDone(true)
    } catch (err) {
      setSaveError(`Could not delete: ${err instanceof Error ? err.message : String(err)}`)
      setSaving(false)
    }
  }

  const title = `${isNew ? 'New phrase' : 'Edit phrase'}${
    isMixPart ? ` — ${phrase.partType === 'starter' ? 'beginning' : 'ending'}` : ''
  }`

  return (
    <ModalOverlay
      className="modal-scrim"
      isOpen
      isDismissable={!saving}
      onOpenChange={(open) => {
        if (!open && !saving) onDone(false)
      }}
    >
      <Modal className="modal">
        <Dialog className="modal-dialog">
          <div className="modal-heading-row">
            <Heading slot="title">{title}</Heading>
            <Button className="modal-close" onPress={() => onDone(false)} isDisabled={saving}>
              Close
            </Button>
          </div>

          <div className="modal-body">

          <div className="field">
            <label htmlFor="phrase-text">
              The words (their perspective or “we”—never “you”. Short and warm.)
            </label>
            <input
              id="phrase-text"
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              autoFocus={isNew}
            />
          </div>

          <div className="row">
            <div className="field emoji-field">
              <label htmlFor="phrase-emoji">Emoji fallback</label>
              <input
                id="phrase-emoji"
                type="text"
                value={emoji}
                onChange={(event) => setEmoji(event.target.value)}
              />
            </div>
            <div className="field field-grow">
              <label htmlFor="phrase-language">Language (for the fallback voice)</label>
              <select
                id="phrase-language"
                value={lang}
                onChange={(event) => setLang(event.target.value as LanguageCode)}
              >
                {Object.entries(LANGUAGES).map(([code, language]) => (
                  <option key={code} value={code}>
                    {language.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SymbolPicker
            currentSymbolId={phrase.symbolId}
            emoji={emoji}
            language={lang}
            initialQuery={text}
            value={pendingSymbol}
            onChange={setPendingSymbol}
          />

          {!isMixPart && (
            <div className="field">
              <label htmlFor="phrase-gloss">
                Meaning note (grown-ups only): what does it mean, and how should we respond?
              </label>
              <textarea
                id="phrase-gloss"
                rows={2}
                value={gloss}
                onChange={(event) => setGloss(event.target.value)}
                placeholder={'e.g. “Daddy, would you like milk?” = they want milk. Get it, then model: Let\'s get milk!'}
              />
            </div>
          )}

          {isMixPart && phrase.partType === 'starter' && (
            <fieldset className="field choice-fieldset">
              <legend>Fits with endings that are a…</legend>
              <div className="row">
                {SLOTS.map((item) => (
                  <label key={item} className="check-label">
                    <input
                      type="checkbox"
                      checked={accepts.includes(item)}
                      onChange={(event) =>
                        setAccepts((previous) =>
                          event.target.checked
                            ? [...previous, item]
                            : previous.filter((value) => value !== item),
                        )
                      }
                    />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {isMixPart && phrase.partType === 'ender' && (
            <div className="field">
              <label htmlFor="phrase-slot">This ending is a…</label>
              <select
                id="phrase-slot"
                value={slot}
                onChange={(event) => setSlot(event.target.value as SlotKind)}
              >
                {SLOTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          )}

          <RecorderControl
            existingId={phrase.recordingId}
            pending={pendingAudio}
            onChange={setPendingAudio}
          />

          {isBoardPhrase && (
            <div className="field">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={focus}
                  onChange={(event) => setFocus(event.target.checked)}
                />
                <span>
                  <strong>This Week’s Words</strong>—one of the few phrases being modeled
                  right now (keep it to five or fewer).
                </span>
              </label>
            </div>
          )}

          <div className="field">
            <label className="check-label">
              <input
                type="checkbox"
                checked={hidden}
                onChange={(event) => setHidden(event.target.checked)}
              />
              Hidden from the child’s board (the phrase is kept—hide instead of deleting).
            </label>
          </div>

          {saveError && (
            <p className="form-error" role="alert">
              {saveError}
            </p>
          )}
          </div>
          <div className="modal-actions">
            <Button
              className="btn"
              onPress={() => void save()}
              isDisabled={saving || !text.trim()}
            >
              {saving ? 'Saving…' : 'Save phrase'}
            </Button>
            <Button
              className="btn secondary"
              onPress={() => onDone(false)}
              isDisabled={saving}
            >
              Cancel
            </Button>
            <span className="spacer" />
            {!isNew &&
              (confirmDelete ? (
                <Button
                  className="btn danger"
                  onPress={() => void remove()}
                  isDisabled={saving}
                >
                  Delete permanently
                </Button>
              ) : (
                <Button
                  className="btn secondary"
                  onPress={() => setConfirmDelete(true)}
                  isDisabled={saving}
                >
                  Delete…
                </Button>
              ))}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
