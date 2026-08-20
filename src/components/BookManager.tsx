import { useCallback, useEffect, useRef, useState } from 'react'
import PhraseEditor from './PhraseEditor'
import PhraseVisual from './PhraseVisual'
import Icon from './Icon'
import {
  deleteBook,
  listBooks,
  listPhrases,
  makeId,
  putBook,
  savePhoto,
} from '../lib/db'
import { fileToResizedBlob } from '../lib/photos'
import { playPhrase } from '../lib/audio'
import type { Book, BookPage, Phrase, Settings } from '../lib/types'

export default function BookManager({ settings }: { settings: Settings }) {
  const [books, setBooks] = useState<Book[]>([])
  const [bookId, setBookId] = useState('')
  const [refrains, setRefrains] = useState<Phrase[]>([])
  const [editing, setEditing] = useState<{ phrase: Phrase; isNew: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [busyPage, setBusyPage] = useState<number | null>(null)
  // local draft so typing is never clobbered by an async refresh
  const [draft, setDraft] = useState<Book | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoTarget = useRef<number>(0)

  const book = books.find((b) => b.id === bookId) ?? null

  const refresh = useCallback(async () => {
    const all = await listBooks()
    setBooks(all)
    if (bookId) setRefrains(await listPhrases(`book:${bookId}`))
  }, [bookId])

  useEffect(() => {
    void refresh()
    setConfirmDelete(false)
  }, [refresh])

  useEffect(() => {
    const found = books.find((b) => b.id === bookId)
    if (!found) {
      if (draft && !books.some((b) => b.id === draft.id)) setDraft(null)
      return
    }
    if (draft?.id !== bookId) setDraft(found)
  }, [bookId, books, draft])

  const commit = async (next: Book) => {
    setDraft(next)
    await putBook(next)
    await refresh()
  }

  const addBook = async () => {
    const title = window.prompt('Book title?')
    if (!title?.trim()) return
    const id = makeId()
    const fresh: Book = {
      id,
      title: title.trim(),
      emoji: '📖',
      pauseSec: 0,
      order: books.reduce((m, b) => Math.max(m, b.order), -1) + 1,
      pages: [{ emoji: '📖', text: '' }],
    }
    await putBook(fresh)
    setBookId(id)
    setDraft(fresh)
    await refresh()
  }

  const setPage = (index: number, patch: Partial<BookPage>) => {
    if (!draft) return
    const pages = draft.pages.map((p, i) => (i === index ? { ...p, ...patch } : p))
    void commit({ ...draft, pages })
  }

  const addPage = () => {
    if (!draft) return
    void commit({ ...draft, pages: [...draft.pages, { emoji: '📖', text: '' }] })
  }

  const movePage = (index: number, dir: -1 | 1) => {
    if (!draft) return
    const target = index + dir
    if (target < 0 || target >= draft.pages.length) return
    const pages = [...draft.pages]
    ;[pages[index], pages[target]] = [pages[target], pages[index]]
    void commit({ ...draft, pages })
  }

  const removePage = (index: number) => {
    if (!draft || draft.pages.length <= 1) return
    void commit({ ...draft, pages: draft.pages.filter((_, i) => i !== index) })
  }

  const attachPhoto = async (file: File) => {
    if (!draft) return
    const index = photoTarget.current
    setBusyPage(index)
    setPhotoError('')
    try {
      const { blob, mimeType } = await fileToResizedBlob(file)
      const photoId = makeId()
      await savePhoto({ id: photoId, blob, mimeType, createdAt: Date.now() })
      setPage(index, { photoId })
    } catch {
      setPhotoError(
        "Couldn't read that photo. If it came from an iPhone it may be HEIC — save it as JPG or PNG and try again.",
      )
    } finally {
      setBusyPage(null)
    }
  }

  const addRefrain = () => {
    if (!book) return
    setEditing({
      isNew: true,
      phrase: {
        id: makeId(),
        categoryId: `book:${book.id}`,
        text: '',
        emoji: '💬',
        lang: 'en',
        stage: 1,
        order: refrains.reduce((m, r) => Math.max(m, r.order), -1) + 1,
      },
    })
  }

  const removeBook = async () => {
    if (!book) return
    await deleteBook(book.id)
    setBookId('')
    setDraft(null)
    setConfirmDelete(false)
    await refresh()
  }

  return (
    <div>
      <div className="manager-title-row">
        <div>
          <h2>Story Time</h2>
          <p>
            A picture book's repeated line is already shaped like the chunks a gestalt
            learner collects, which makes shared reading one of the best sources of new
            language. Add the repeated line as a refrain and record it in your voice.
          </p>
        </div>
      </div>

      <div className="manager-toolbar">
        <label htmlFor="book-select" className="sr-only">
          Book
        </label>
        <select id="book-select" value={bookId} onChange={(e) => setBookId(e.target.value)}>
          <option value="">— pick a book —</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.emoji} {b.title}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <button className="btn" onClick={() => void addBook()}>
          + New book
        </button>
      </div>

      {photoError && (
        <p style={{ color: 'var(--warn)', fontWeight: 600, fontSize: 14.5 }}>{photoError}</p>
      )}

      {book && draft && draft.id === book.id && (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="field field-grow">
              <label htmlFor="book-title">Title</label>
              <input
                id="book-title"
                type="text"
                value={draft.title}
                onChange={(e) => void commit({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="field emoji-field">
              <label htmlFor="book-emoji">Cover</label>
              <input
                id="book-emoji"
                type="text"
                value={draft.emoji}
                onChange={(e) => void commit({ ...draft, emoji: e.target.value })}
              />
            </div>
            <div className="field" style={{ width: 210 }}>
              <label htmlFor="book-pause">Fill-in pause: {draft.pauseSec}s</label>
              <input
                id="book-pause"
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={draft.pauseSec}
                onChange={(e) => void commit({ ...draft, pauseSec: Number(e.target.value) })}
              />
            </div>
          </div>
          <p className="stage-hint">
            The pause is the point: read a page, stop, look expectant, and let them supply
            the repeated line. Any response counts.
          </p>

          <h3>The repeated line</h3>
          {refrains.map((r) => (
            <div className="phrase-row" key={r.id}>
              <PhraseVisual emoji={r.emoji} symbolId={r.symbolId} className="pr-emoji" />
              <div className="pr-main">
                <div className="pr-text">{r.text}</div>
              </div>
              <span className={`badge${r.recordingId ? '' : ' muted'}`}>
                {r.recordingId ? 'Family voice' : 'Device voice'}
              </span>
              <button
                type="button"
                className="icon-btn play-row-btn"
                onClick={() => void playPhrase(r, settings.ttsRate)}
                aria-label={`Play ${r.text}`}
              >
                <Icon name="play" size={18} />
              </button>
              <button
                className="btn secondary"
                onClick={() => setEditing({ phrase: r, isNew: false })}
              >
                Edit
              </button>
            </div>
          ))}
          <button className="btn" onClick={addRefrain} style={{ marginTop: 10 }}>
            + Add a refrain
          </button>

          <h3>Pages</h3>
          {draft.pages.map((p, i) => (
            <div className="book-page-row" key={i}>
              <span className="book-page-index">{i + 1}</span>
              <input
                className="book-page-emoji"
                type="text"
                value={p.emoji}
                onChange={(e) => setPage(i, { emoji: e.target.value })}
                aria-label={`Page ${i + 1} picture`}
              />
              <textarea
                className="book-page-text"
                rows={2}
                value={p.text}
                onChange={(e) => setPage(i, { text: e.target.value })}
                placeholder="The words on this page"
                aria-label={`Page ${i + 1} words`}
              />
              <div className="row-actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => movePage(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move page ${i + 1} up`}
                >
                  <Icon name="up" size={20} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => movePage(i, 1)}
                  disabled={i === draft.pages.length - 1}
                  aria-label={`Move page ${i + 1} down`}
                >
                  <Icon name="down" size={20} />
                </button>
                <button
                  className="btn secondary"
                  onClick={() => {
                    photoTarget.current = i
                    fileRef.current?.click()
                  }}
                  disabled={busyPage === i}
                >
                  {busyPage === i ? 'Adding…' : p.photoId ? 'Change photo' : 'Add photo'}
                </button>
                <button
                  className="btn secondary"
                  onClick={() => removePage(i)}
                  disabled={draft.pages.length <= 1}
                  aria-label={`Delete page ${i + 1}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void attachPhoto(f)
              e.target.value = ''
            }}
          />

          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={addPage}>
              + Add page
            </button>
            <span className="spacer" />
            {confirmDelete ? (
              <button className="btn danger" onClick={() => void removeBook()}>
                Really delete this book?
              </button>
            ) : (
              <button className="btn secondary" onClick={() => setConfirmDelete(true)}>
                Delete book…
              </button>
            )}
          </div>
        </>
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
