import { useState, type FormEvent } from 'react'
import type { LanguageCode } from '../lib/types'
import {
  ARASAAC_ATTRIBUTION,
  arasaacImageUrl,
  searchArasaac,
  type ArasaacSelection,
} from '../lib/symbols'
import PhraseVisual from './PhraseVisual'

export type PendingSymbol = ArasaacSelection | null | undefined

export default function SymbolPicker({
  currentSymbolId,
  emoji,
  language,
  initialQuery,
  value,
  onChange,
}: {
  currentSymbolId?: string
  emoji: string
  language: LanguageCode
  initialQuery: string
  value: PendingSymbol
  onChange: (next: PendingSymbol) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<ArasaacSelection[]>([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')

  const search = async (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setMessage('')
    try {
      const found = await searchArasaac(query, language)
      setResults(found)
      setMessage(found.length ? `${found.length} choices found` : 'No pictograms found')
    } catch {
      setResults([])
      setMessage(
        navigator.onLine
          ? 'Pictogram search is unavailable right now. Your saved visuals still work.'
          : 'Connect once to search. Saved pictograms work offline.',
      )
    } finally {
      setSearching(false)
    }
  }

  const isEmoji = value === null || (value === undefined && !currentSymbolId)

  return (
    <section className="symbol-picker" aria-labelledby="visual-support-heading">
      <div className="symbol-picker-head">
        <div>
          <h4 id="visual-support-heading">Visual support</h4>
          <p>Keep the emoji, or choose a clear pictogram that will be saved offline.</p>
        </div>
        <div className="symbol-choice-preview" aria-label="Current visual">
          {value && typeof value === 'object' ? (
            <img src={arasaacImageUrl(value.sourceId)} alt={value.label} />
          ) : (
            <PhraseVisual
              emoji={emoji || '💬'}
              symbolId={value === undefined ? currentSymbolId : undefined}
              className="symbol-preview-visual"
            />
          )}
        </div>
      </div>

      <div className="symbol-options">
        <button
          type="button"
          className={`symbol-option emoji-option${isEmoji ? ' selected' : ''}`}
          onClick={() => onChange(null)}
          aria-pressed={isEmoji}
        >
          <span>{emoji || '💬'}</span>
          Use emoji
        </button>
        {currentSymbolId && (
          <button
            type="button"
            className={`symbol-option${value === undefined ? ' selected' : ''}`}
            onClick={() => onChange(undefined)}
            aria-pressed={value === undefined}
          >
            <PhraseVisual
              emoji={emoji || '💬'}
              symbolId={currentSymbolId}
              className="symbol-option-visual"
            />
            Keep saved pictogram
          </button>
        )}
      </div>

      <form className="symbol-search" onSubmit={(event) => void search(event)}>
        <label htmlFor="symbol-search-input">Search ARASAAC pictograms</label>
        <div className="symbol-search-row">
          <input
            id="symbol-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try milk, outside, help…"
          />
          <button className="btn secondary" type="submit" disabled={searching || !query.trim()}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        <small>Submitting sends only this search term to ARASAAC.</small>
      </form>

      <p className="symbol-status" role="status" aria-live="polite">
        {message}
      </p>
      {results.length > 0 && (
        <div className="symbol-results" aria-label="Pictogram choices">
          {results.map((result) => {
            const selected = value?.sourceId === result.sourceId
            return (
              <button
                type="button"
                key={result.sourceId}
                className={selected ? 'selected' : ''}
                onClick={() => onChange(result)}
                aria-pressed={selected}
              >
                <img
                  src={arasaacImageUrl(result.sourceId)}
                  alt=""
                  loading="lazy"
                  draggable={false}
                />
                <span>{result.label}</span>
              </button>
            )
          })}
        </div>
      )}

      <p className="symbol-license">
        Non-commercial use only. {ARASAAC_ATTRIBUTION}{' '}
        <a href="https://arasaac.org/terms-of-use" target="_blank" rel="noreferrer">
          Terms
        </a>
      </p>
    </section>
  )
}
