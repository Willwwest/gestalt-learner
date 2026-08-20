import { useEffect, useRef, useState } from 'react'
import { getPhoto, listBooks, listPhrases, logEvent, rememberMessage } from '../lib/db'
import { playPhrase, preloadPhraseAudio, stopAllAudio } from '../lib/audio'
import { speak } from '../lib/tts'
import { selectionFeedback } from '../lib/haptics'
import type { Book, Phrase, Settings } from '../lib/types'
import Icon from './Icon'
import PhraseVisual from './PhraseVisual'

export default function Books({ settings }: { settings: Settings }) {
  const [books, setBooks] = useState<Book[]>([])
  const [book, setBook] = useState<Book | null>(null)
  const [page, setPage] = useState(0)
  const [refrains, setRefrains] = useState<Phrase[]>([])
  const [spoken, setSpoken] = useState<Phrase | null>(null)
  const [readingAlong, setReadingAlong] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  // bump to cancel an in-flight read-along
  const readToken = useRef(0)

  useEffect(() => {
    void listBooks().then(setBooks)
    return () => {
      readToken.current++
      stopAllAudio()
    }
  }, [])

  useEffect(() => {
    if (!book) return
    void listPhrases(`book:${book.id}`).then((rows) => {
      const alive = rows.filter((r) => !r.hidden)
      setRefrains(alive)
      void preloadPhraseAudio(alive)
    })
  }, [book])

  // page photos are optional; most books ship with an emoji instead
  useEffect(() => {
    const photoId = book?.pages[page]?.photoId
    if (!photoId) {
      setPhotoUrl('')
      return
    }
    let url = ''
    let cancelled = false
    void getPhoto(photoId).then((photo) => {
      if (!photo || cancelled) return
      url = URL.createObjectURL(photo.blob)
      setPhotoUrl(url)
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
      setPhotoUrl('')
    }
  }, [book, page])

  const stopReading = () => {
    readToken.current++
    stopAllAudio()
    setReadingAlong(false)
  }

  const leaveBook = () => {
    stopReading()
    setBook(null)
    setPage(0)
    setSpoken(null)
  }

  const turnTo = (next: number) => {
    if (!book) return
    stopReading()
    setSpoken(null)
    setPage(Math.max(0, Math.min(book.pages.length - 1, next)))
    void selectionFeedback(settings.hapticsEnabled)
  }

  const sayRefrain = async (refrain: Phrase) => {
    stopReading()
    void selectionFeedback(settings.hapticsEnabled)
    setSpoken(refrain)
    void logEvent('book-refrain', refrain.text)
    void rememberMessage({
      text: refrain.text,
      emoji: refrain.emoji,
      lang: refrain.lang,
      source: 'board',
      phraseId: refrain.id,
      recordingId: refrain.recordingId,
    })
    await playPhrase(refrain, settings.ttsRate)
  }

  /** Read this page aloud, then leave a deliberate gap: the child fills in the
   *  repeated line themselves. Serve-and-return, inside a story. */
  const readPage = async () => {
    if (!book) return
    const token = ++readToken.current
    setReadingAlong(true)
    void logEvent('book-read', `${book.title} p${page + 1}`)
    const lang = settings.languages[0] ?? 'en'
    await speak(book.pages[page].text, lang, settings.ttsRate)
    if (readToken.current !== token) return
    if (book.pauseSec > 0) {
      await new Promise((r) => setTimeout(r, book.pauseSec * 1000))
    }
    if (readToken.current === token) setReadingAlong(false)
  }

  if (!book) {
    return (
      <>
        <div className="tile-grid">
          {books.map((b) => (
            <button
              key={b.id}
              className="tile dwell-target"
              data-dwell="true"
              onClick={() => {
                void selectionFeedback(settings.hapticsEnabled)
                setBook(b)
                setPage(0)
              }}
            >
              <span className="tile-emoji">{b.emoji}</span>
              <span className="tile-text">{b.title}</span>
            </button>
          ))}
        </div>
        {books.length === 0 && (
          <div className="caption idle">Grown-ups can add books in the ⭐ zone!</div>
        )}
      </>
    )
  }

  const current = book.pages[page]
  const lastPage = page >= book.pages.length - 1

  return (
    <>
      <div className="song-controls">
        <button className="subview-back" onClick={leaveBook} aria-label="Back to books">
          <Icon name="back" size={25} />
        </button>
        <div className="song-title">
          {book.emoji} {book.title}
        </div>
        <span className="book-page-count" aria-live="polite">
          {page + 1} / {book.pages.length}
        </span>
        {readingAlong ? (
          <button className="btn-round stop" onClick={stopReading} aria-label="Stop reading">
            <Icon name="stop" size={31} />
          </button>
        ) : (
          <button
            className="btn-round"
            onClick={() => void readPage()}
            aria-label="Read this page"
          >
            <Icon name="play" size={31} />
          </button>
        )}
      </div>

      <div className="book-stage">
        <button
          className="page-turn dwell-target"
          data-dwell="true"
          onClick={() => turnTo(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
        >
          <Icon name="back" size={30} />
        </button>

        <div className={`book-page${readingAlong ? ' reading' : ''}`}>
          {photoUrl ? (
            <img className="book-photo" src={photoUrl} alt="" />
          ) : (
            <span className="book-art" aria-hidden="true">
              {current.emoji}
            </span>
          )}
          <p className="book-text">{current.text}</p>
        </div>

        <button
          className="page-turn dwell-target"
          data-dwell="true"
          onClick={() => turnTo(page + 1)}
          disabled={lastPage}
          aria-label="Next page"
        >
          <Icon name="arrow" size={30} />
        </button>
      </div>

      <div className="refrain-bar">
        {refrains.map((r) => (
          <button
            key={r.id}
            className={`refrain-btn dwell-target${spoken?.id === r.id ? ' playing' : ''}`}
            data-dwell="true"
            onClick={() => void sayRefrain(r)}
            aria-pressed={spoken?.id === r.id}
          >
            <PhraseVisual emoji={r.emoji} symbolId={r.symbolId} className="refrain-visual" />
            <span>{r.text}</span>
          </button>
        ))}
        {refrains.length === 0 && (
          <span className="refrain-empty">
            Grown-ups can add the repeated line for this book.
          </span>
        )}
      </div>
    </>
  )
}
