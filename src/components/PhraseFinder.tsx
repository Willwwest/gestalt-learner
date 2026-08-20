import { useEffect, useMemo, useState } from 'react'
import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import type { Category, Phrase } from '../lib/types'
import Icon from './Icon'
import PhraseVisual from './PhraseVisual'

export default function PhraseFinder({
  open,
  phrases,
  categories,
  onChoose,
  onClose,
}: {
  open: boolean
  phrases: Phrase[]
  categories: Category[]
  onChoose: (phrase: Phrase) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )
  const available = useMemo(
    () =>
      phrases.filter(
        (phrase) =>
          phrase.stage === 1 &&
          !phrase.hidden &&
          categoryById.has(phrase.categoryId),
      ),
    [categoryById, phrases],
  )
  const cleaned = query.trim().toLocaleLowerCase()
  const results = cleaned
    ? available.filter((phrase) =>
        `${phrase.text} ${phrase.gloss ?? ''}`.toLocaleLowerCase().includes(cleaned),
      )
    : available.filter((phrase) => phrase.favorite)

  return (
    <ModalOverlay
      className="modal-scrim finder-scrim"
      isOpen={open}
      isDismissable
      onOpenChange={(isOpen) => !isOpen && onClose()}
    >
      <Modal className="modal phrase-finder-modal">
        <Dialog className="modal-dialog">
          <div className="modal-heading-row finder-heading">
            <div>
              <Heading slot="title">Find a phrase</Heading>
              <p>The board stays in the same order. EchoBloom shows the path.</p>
            </div>
            <Button className="modal-close" onPress={onClose}>
              Close
            </Button>
          </div>
          <div className="modal-body finder-body">
            <label className="finder-search">
              <Icon name="search" size={22} />
              <span className="sr-only">Search phrase words</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type any word…"
                autoFocus
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                  ×
                </button>
              )}
            </label>

            {!cleaned && (
              <div className="finder-section-title">
                <Icon name="star" size={18} />
                <strong>Favorites</strong>
              </div>
            )}
            {results.length === 0 ? (
              <div className="finder-empty">
                <span>{cleaned ? '🔎' : '☆'}</span>
                <strong>{cleaned ? 'No phrase matches that yet.' : 'No favorites yet.'}</strong>
                <p>
                  {cleaned
                    ? 'Try another word, or ask a grown-up to add the phrase.'
                    : 'A grown-up can pin favorites while editing a phrase.'}
                </p>
              </div>
            ) : (
              <div className="finder-results" role="list">
                {results.slice(0, 40).map((phrase) => {
                  const category = categoryById.get(phrase.categoryId)!
                  return (
                    <button
                      type="button"
                      role="listitem"
                      className="finder-result"
                      key={phrase.id}
                      onClick={() => onChoose(phrase)}
                    >
                      <PhraseVisual
                        emoji={phrase.emoji}
                        symbolId={phrase.symbolId}
                        className="finder-result-visual"
                      />
                      <span className="finder-result-copy">
                        <strong>{phrase.text}</strong>
                        <small>
                          {category.emoji} {category.name}
                        </small>
                      </span>
                      <span className="finder-path">Show me</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
