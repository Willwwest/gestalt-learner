import { useEffect, useState } from 'react'
import { getSymbol } from '../lib/db'

function useSymbolUrl(symbolId?: string) {
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null)

  useEffect(() => {
    let disposed = false
    let objectUrl: string | null = null
    if (symbolId) {
      void getSymbol(symbolId).then((row) => {
        if (!row || disposed) return
        objectUrl = URL.createObjectURL(row.blob)
        setLoaded({ id: symbolId, url: objectUrl })
      })
    }
    return () => {
      disposed = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [symbolId])

  return loaded && loaded.id === symbolId ? loaded.url : null
}

export default function PhraseVisual({
  emoji,
  symbolId,
  className,
}: {
  emoji: string
  symbolId?: string
  className: string
}) {
  const url = useSymbolUrl(symbolId)
  return (
    <span
      className={`${className} phrase-visual${url ? ' phrase-visual-image' : ''}`}
      aria-hidden="true"
    >
      {url ? <img src={url} alt="" draggable={false} /> : emoji}
    </span>
  )
}
