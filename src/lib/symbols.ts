import { getSymbol, saveSymbol } from './db'
import type { LanguageCode } from './types'

export interface ArasaacSelection {
  sourceId: number
  label: string
}

interface ArasaacApiResult {
  _id?: unknown
  keywords?: { keyword?: unknown }[]
}

export const ARASAAC_ATTRIBUTION =
  'Pictograms author: Sergio Palao. Origin: ARASAAC. License: CC BY-NC-SA. Owner: Government of Aragon (Spain).'

export function arasaacSymbolId(sourceId: number) {
  return `arasaac:${sourceId}`
}

export function arasaacImageUrl(sourceId: number) {
  return `https://static.arasaac.org/pictograms/${sourceId}/${sourceId}_500.png`
}

export async function searchArasaac(
  query: string,
  language: LanguageCode,
  signal?: AbortSignal,
): Promise<ArasaacSelection[]> {
  const term = query.trim()
  if (!term) return []
  const response = await fetch(
    `https://api.arasaac.org/v1/pictograms/${language}/search/${encodeURIComponent(term)}`,
    { signal },
  )
  if (!response.ok) {
    throw new Error(`ARASAAC search returned ${response.status}`)
  }
  const payload = (await response.json()) as unknown
  if (!Array.isArray(payload)) throw new Error('ARASAAC returned an unexpected response')

  return payload
    .map((item): ArasaacSelection | null => {
      const result = item as ArasaacApiResult
      if (!Number.isInteger(result._id)) return null
      const label = result.keywords?.find((word) => typeof word.keyword === 'string')
        ?.keyword
      return {
        sourceId: result._id as number,
        label: typeof label === 'string' ? label : term,
      }
    })
    .filter((item): item is ArasaacSelection => item !== null)
    .slice(0, 18)
}

/** Download once, then render from IndexedDB without a network connection. */
export async function cacheArasaacSymbol(selection: ArasaacSelection): Promise<string> {
  const id = arasaacSymbolId(selection.sourceId)
  if (await getSymbol(id)) return id

  const response = await fetch(arasaacImageUrl(selection.sourceId))
  if (!response.ok) throw new Error(`Pictogram download returned ${response.status}`)
  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) throw new Error('Pictogram download was not an image')
  if (blob.size > 5 * 1024 * 1024) throw new Error('Pictogram image is unexpectedly large')

  await saveSymbol({
    id,
    blob,
    mimeType: blob.type || 'image/png',
    createdAt: Date.now(),
    source: 'arasaac',
    sourceId: selection.sourceId,
    label: selection.label,
  })
  return id
}
