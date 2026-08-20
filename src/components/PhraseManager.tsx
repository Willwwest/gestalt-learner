import { useCallback, useEffect, useState } from 'react'
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { arrayMove, move } from '@dnd-kit/helpers'
import PhraseEditor from './PhraseEditor'
import PhraseVisual from './PhraseVisual'
import Icon from './Icon'
import { listCategories, listPhrases, makeId, putPhrase } from '../lib/db'
import { playPhrase } from '../lib/audio'
import type { Category, Phrase, Settings } from '../lib/types'

const MIX_ID = 'mix'

function SortablePhraseRow({
  phrase,
  index,
  count,
  group,
  settings,
  onEdit,
  onMove,
}: {
  phrase: Phrase
  index: number
  count: number
  group: string
  settings: Settings
  onEdit: () => void
  onMove: (from: number, to: number) => void
}) {
  const { ref, handleRef, isDragging } = useSortable({ id: phrase.id, index, group })

  return (
    <div ref={ref} className={`phrase-row sortable-row${isDragging ? ' dragging' : ''}`}>
      <button
        ref={handleRef}
        type="button"
        className="drag-handle"
        aria-label={`Drag to reorder ${phrase.text}`}
        title="Drag to reorder"
      >
        <Icon name="grip" size={21} />
      </button>
      <PhraseVisual emoji={phrase.emoji} symbolId={phrase.symbolId} className="pr-emoji" />
      <div className="pr-main">
        <div className="pr-text">
          {phrase.text}
          {phrase.partType === 'starter' && ' …'}
        </div>
        {phrase.gloss && <div className="pr-gloss">{phrase.gloss}</div>}
      </div>
      <div className="phrase-badges">
        {phrase.quickAccess && <span className="badge quick-badge">Quick Talk</span>}
        {phrase.favorite && <span className="badge favorite-badge">Favorite</span>}
        {phrase.focus && <span className="badge">This week</span>}
        <span className={`badge${phrase.recordingId ? '' : ' muted'}`}>
          {phrase.recordingId ? 'Family voice' : 'Device voice'}
        </span>
        {phrase.symbolId && <span className="badge visual-badge">Pictogram</span>}
        {phrase.hidden && <span className="badge muted">Hidden</span>}
      </div>
      <div className="row-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          aria-label={`Move ${phrase.text} up`}
        >
          <Icon name="up" size={20} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => onMove(index, index + 1)}
          disabled={index === count - 1}
          aria-label={`Move ${phrase.text} down`}
        >
          <Icon name="down" size={20} />
        </button>
        <button
          type="button"
          className="icon-btn play-row-btn"
          onClick={() => void playPhrase(phrase, settings.ttsRate)}
          aria-label={`Play ${phrase.text}`}
        >
          <Icon name="play" size={18} />
        </button>
        <button type="button" className="btn secondary" onClick={onEdit}>
          Edit
        </button>
      </div>
    </div>
  )
}

function SortablePhraseList({
  items,
  group,
  settings,
  onEdit,
  onReorder,
}: {
  items: Phrase[]
  group: string
  settings: Settings
  onEdit: (phrase: Phrase) => void
  onReorder: (items: Phrase[]) => void
}) {
  const reorderByButton = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    onReorder(arrayMove(items, from, to))
  }

  const onDragEnd = (event: DragEndEvent) => {
    if (event.canceled || !event.operation.target) return
    onReorder(move(items, event))
  }

  if (items.length === 0) {
    return <div className="empty-manager-state">No phrases here yet.</div>
  }

  return (
    <DragDropProvider onDragEnd={onDragEnd}>
      <div className="sortable-list">
        {items.map((phrase, index) => (
          <SortablePhraseRow
            key={phrase.id}
            phrase={phrase}
            index={index}
            count={items.length}
            group={group}
            settings={settings}
            onEdit={() => onEdit(phrase)}
            onMove={reorderByButton}
          />
        ))}
      </div>
    </DragDropProvider>
  )
}

export default function PhraseManager({ settings }: { settings: Settings }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [catId, setCatId] = useState<string>('snack')
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [editing, setEditing] = useState<{ phrase: Phrase; isNew: boolean } | null>(null)
  const [orderMessage, setOrderMessage] = useState('')

  const refresh = useCallback(async () => {
    setCategories(await listCategories())
    setPhrases(await listPhrases(catId))
  }, [catId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addNew = (partType?: 'starter' | 'ender') => {
    const maxOrder = phrases
      .filter((phrase) => (partType ? phrase.partType === partType : true))
      .reduce((maximum, phrase) => Math.max(maximum, phrase.order), -1)
    setEditing({
      isNew: true,
      phrase: {
        id: makeId(),
        categoryId: catId,
        text: '',
        emoji: '💬',
        lang: 'en',
        stage: catId === MIX_ID ? 2 : 1,
        order: maxOrder + 1,
        ...(catId === MIX_ID
          ? partType === 'starter'
            ? { partType, accepts: ['thing' as const] }
            : { partType: 'ender' as const, slot: 'thing' as const }
          : {}),
      },
    })
  }

  const reorder = async (ordered: Phrase[]) => {
    const previous = phrases
    const updatedRows = ordered.map((phrase, index) => ({ ...phrase, order: index }))
    const byId = new Map(updatedRows.map((phrase) => [phrase.id, phrase]))
    setPhrases((current) => current.map((phrase) => byId.get(phrase.id) ?? phrase))
    setOrderMessage('Order saved')
    try {
      await Promise.all(updatedRows.map((phrase) => putPhrase(phrase)))
    } catch {
      setPhrases(previous)
      setOrderMessage('Could not save the new order. Try again.')
    }
  }

  const isMix = catId === MIX_ID
  const edit = (phrase: Phrase) => setEditing({ phrase, isNew: false })

  return (
    <div>
      <div className="manager-title-row">
        <div>
          <h2>Phrases & recordings</h2>
          <p>
            Add the child’s real scripts and a meaning note so every caregiver knows what
            is being communicated. Record the warm model you want to offer back.
          </p>
        </div>
        <span className="manager-kicker">Drag to arrange</span>
      </div>
      <div className="manager-toolbar">
        <label htmlFor="phrase-category" className="sr-only">
          Phrase category
        </label>
        <select
          id="phrase-category"
          value={catId}
          onChange={(event) => {
            setCatId(event.target.value)
            setOrderMessage('')
          }}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.emoji} {category.name}
            </option>
          ))}
          <option value={MIX_ID}>Mix & Match pieces</option>
        </select>
        <span className="spacer" />
        {isMix ? (
          <>
            <button className="btn" type="button" onClick={() => addNew('starter')}>
              Add beginning
            </button>
            <button className="btn secondary" type="button" onClick={() => addNew('ender')}>
              Add ending
            </button>
          </>
        ) : (
          <button className="btn" type="button" onClick={() => addNew()}>
            Add phrase
          </button>
        )}
      </div>

      <p className="reorder-status" role="status" aria-live="polite">
        {orderMessage}
      </p>

      {isMix ? (
        <>
          <h3>Beginnings</h3>
          <SortablePhraseList
            items={phrases.filter((phrase) => phrase.partType === 'starter')}
            group="starters"
            settings={settings}
            onEdit={edit}
            onReorder={(items) => void reorder(items)}
          />
          <h3>Endings</h3>
          <SortablePhraseList
            items={phrases.filter((phrase) => phrase.partType === 'ender')}
            group="enders"
            settings={settings}
            onEdit={edit}
            onReorder={(items) => void reorder(items)}
          />
        </>
      ) : (
        <SortablePhraseList
          items={phrases}
          group={catId}
          settings={settings}
          onEdit={edit}
          onReorder={(items) => void reorder(items)}
        />
      )}

      {editing && (
        <PhraseEditor
          phrase={editing.phrase}
          isNew={editing.isNew}
          onDone={(changed) => {
            setEditing(null)
            if (changed) void refresh()
          }}
        />
      )}
    </div>
  )
}
