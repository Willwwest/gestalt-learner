import { getDB } from './db'
import type {
  Category,
  Phrase,
  PhotoRow,
  RecordingRow,
  Scene,
  Settings,
  Song,
  SpokenMessage,
  SymbolRow,
  UsageEvent,
} from './types'
import { DEFAULT_SETTINGS } from './types'
import { getActiveProfile } from './profiles'

interface BlobEntry {
  id: string
  mimeType: string
  createdAt: number
  dataB64: string
}

interface SymbolEntry extends BlobEntry {
  source: 'arasaac'
  sourceId: number
  label: string
}

interface BackupFile {
  app: 'echobloom'
  version: 1 | 2 | 3 | 4
  exportedAt: string
  settings: Settings | null
  categories: Category[]
  phrases: Phrase[]
  events: UsageEvent[]
  recordings: BlobEntry[]
  // version 2+
  songs?: Song[]
  scenes?: Scene[]
  photos?: BlobEntry[]
  // version 3+
  symbols?: SymbolEntry[]
  // version 4+
  messages?: SpokenMessage[]
}

export interface BackupSummary {
  version: number
  exportedAt: string
  childName: string
  categories: number
  phrases: number
  recordings: number
  songs: number
  scenes: number
  messages: number
}

function blobToB64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      resolve(url.slice(url.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function b64ToBlob(b64: string, mimeType: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

const encodeRows = (rows: (RecordingRow | PhotoRow)[]): Promise<BlobEntry[]> =>
  Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      mimeType: r.mimeType,
      createdAt: r.createdAt,
      dataB64: await blobToB64(r.blob),
    })),
  )

const encodeSymbols = (rows: SymbolRow[]): Promise<SymbolEntry[]> =>
  Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      mimeType: r.mimeType,
      createdAt: r.createdAt,
      source: r.source,
      sourceId: r.sourceId,
      label: r.label,
      dataB64: await blobToB64(r.blob),
    })),
  )

async function createBackupFile(settings: Settings): Promise<File> {
  const db = await getDB()
  const [categories, phrases, events, recordings, songs, scenes, photos, symbols, messages] =
    await Promise.all([
      db.getAll('categories'),
      db.getAll('phrases'),
      db.getAll('events'),
      db.getAll('recordings'),
      db.getAll('songs'),
      db.getAll('scenes'),
      db.getAll('photos'),
      db.getAll('symbols'),
      db.getAll('messages'),
    ])
  const payload: BackupFile = {
    app: 'echobloom',
    version: 4,
    exportedAt: new Date().toISOString(),
    settings,
    categories,
    phrases,
    events,
    recordings: await encodeRows(recordings),
    songs,
    scenes,
    photos: await encodeRows(photos),
    symbols: await encodeSymbols(symbols),
    messages,
  }
  const safeName = (settings.childName || getActiveProfile().name || 'communicator')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return new File([JSON.stringify(payload)], `echobloom-${safeName || 'profile'}-${stamp}.json`, {
    type: 'application/json',
  })
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportBackup(settings: Settings): Promise<void> {
  downloadFile(await createBackupFile(settings))
}

/** Use the native share sheet when available, with a normal download as fallback. */
export async function shareBackup(settings: Settings): Promise<'shared' | 'downloaded'> {
  const file = await createBackupFile(settings)
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({
      files: [file],
      title: 'EchoBloom communicator backup',
      text: 'Private EchoBloom vocabulary and media backup',
    })
    return 'shared'
  }
  downloadFile(file)
  return 'downloaded'
}

function parseBackup(text: string): BackupFile {
  const parsed = JSON.parse(text) as BackupFile
  if (
    parsed.app !== 'echobloom' ||
    ![1, 2, 3, 4].includes(parsed.version)
  ) {
    throw new Error('Not an EchoBloom backup file')
  }
  if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.phrases)) {
    throw new Error('Backup is damaged: missing phrase data')
  }
  return parsed
}

export async function inspectBackup(file: File): Promise<BackupSummary> {
  const parsed = parseBackup(await file.text())
  const when = new Date(parsed.exportedAt)
  if (Number.isNaN(when.valueOf())) throw new Error('Backup is damaged: invalid export date')
  return {
    version: parsed.version,
    exportedAt: parsed.exportedAt,
    childName: parsed.settings?.childName?.trim() || 'Unnamed communicator',
    categories: parsed.categories.length,
    phrases: parsed.phrases.length,
    recordings: Array.isArray(parsed.recordings) ? parsed.recordings.length : 0,
    songs: Array.isArray(parsed.songs) ? parsed.songs.length : 0,
    scenes: Array.isArray(parsed.scenes) ? parsed.scenes.length : 0,
    messages: Array.isArray(parsed.messages) ? parsed.messages.length : 0,
  }
}

/** Replaces all app data with the backup's contents. Returns the restored settings.
 *
 * Import is the disaster-recovery path, so it must be all-or-nothing: every row is
 * decoded and validated BEFORE the transaction opens (a base64 blob corrupted in
 * cloud sync must fail here, while the existing data is still untouched), and any
 * error inside the transaction aborts it instead of letting the clears commit. */
export async function importBackup(file: File): Promise<Settings | null> {
  const parsed = parseBackup(await file.text())

  const requireRows = <T extends { id: unknown }>(rows: T[] | undefined, name: string): T[] => {
    if (!Array.isArray(rows)) throw new Error(`Backup is damaged: missing ${name}`)
    for (const row of rows) {
      if (typeof row !== 'object' || row === null || row.id == null) {
        throw new Error(`Backup is damaged: bad row in ${name}`)
      }
    }
    return rows
  }
  const decodeRows = (entries: BlobEntry[] | undefined, name: string): RecordingRow[] => {
    return requireRows(entries, name).map((e) => {
      try {
        return {
          id: e.id,
          mimeType: e.mimeType,
          createdAt: e.createdAt,
          blob: b64ToBlob(e.dataB64, e.mimeType),
        }
      } catch {
        throw new Error(`Backup is damaged: could not decode audio/photo data in ${name}`)
      }
    })
  }
  const decodeSymbols = (entries: SymbolEntry[] | undefined): SymbolRow[] =>
    requireRows(entries, 'symbols').map((entry) => {
      if (
        entry.source !== 'arasaac' ||
        !Number.isInteger(entry.sourceId) ||
        typeof entry.label !== 'string'
      ) {
        throw new Error('Backup is damaged: bad row in symbols')
      }
      try {
        return {
          id: entry.id,
          mimeType: entry.mimeType,
          createdAt: entry.createdAt,
          source: entry.source,
          sourceId: entry.sourceId,
          label: entry.label,
          blob: b64ToBlob(entry.dataB64, entry.mimeType),
        }
      } catch {
        throw new Error('Backup is damaged: could not decode image data in symbols')
      }
    })

  // materialize everything first — after this point nothing can throw mid-write
  const categories = requireRows(parsed.categories, 'categories')
  const phrases = requireRows(parsed.phrases, 'phrases')
  const events = (Array.isArray(parsed.events) ? parsed.events : []).map((e) => {
    const { id: _drop, ...rest } = e
    return rest as UsageEvent
  })
  const recordings = decodeRows(parsed.recordings, 'recordings')
  const songs = parsed.version >= 2 ? requireRows(parsed.songs, 'songs') : []
  const scenes = parsed.version >= 2 ? requireRows(parsed.scenes, 'scenes') : []
  const photos = parsed.version >= 2 ? decodeRows(parsed.photos, 'photos') : []
  const symbols = parsed.version >= 3 ? decodeSymbols(parsed.symbols) : []
  const messages = parsed.version >= 4 && Array.isArray(parsed.messages)
    ? parsed.messages.map((message) => {
        const { id: _drop, ...rest } = message
        return rest as SpokenMessage
      })
    : []

  const db = await getDB()
  const tx = db.transaction(
    [
      'categories',
      'phrases',
      'recordings',
      'events',
      'settings',
      'songs',
      'scenes',
      'photos',
      'symbols',
      'messages',
    ],
    'readwrite',
  )
  try {
    await Promise.all([
      tx.objectStore('categories').clear(),
      tx.objectStore('phrases').clear(),
      tx.objectStore('recordings').clear(),
      tx.objectStore('events').clear(),
      tx.objectStore('songs').clear(),
      tx.objectStore('scenes').clear(),
      tx.objectStore('photos').clear(),
      tx.objectStore('symbols').clear(),
      tx.objectStore('messages').clear(),
    ])
    for (const c of categories) await tx.objectStore('categories').put(c)
    for (const p of phrases) await tx.objectStore('phrases').put(p)
    for (const e of events) await tx.objectStore('events').put(e)
    for (const r of recordings) await tx.objectStore('recordings').put(r)
    for (const s of songs) await tx.objectStore('songs').put(s)
    for (const s of scenes) await tx.objectStore('scenes').put(s)
    for (const p of photos) await tx.objectStore('photos').put(p)
    for (const symbol of symbols) await tx.objectStore('symbols').put(symbol)
    for (const message of messages) await tx.objectStore('messages').put(message)
    if (parsed.settings) {
      await tx.objectStore('settings').put({
        key: 'app',
        value: { ...DEFAULT_SETTINGS, ...parsed.settings, onboardingComplete: true },
      })
    }
    await tx.done
  } catch (err) {
    try {
      tx.abort()
    } catch {
      // already aborted/finished
    }
    throw err
  }
  return parsed.settings
    ? { ...DEFAULT_SETTINGS, ...parsed.settings, onboardingComplete: true }
    : null
}
