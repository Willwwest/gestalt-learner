import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
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
import { databaseNameForProfile, getActiveProfile, getActiveProfileId } from './profiles'

interface EchoBloomDB extends DBSchema {
  categories: { key: string; value: Category }
  phrases: { key: string; value: Phrase; indexes: { byCategory: string } }
  recordings: { key: string; value: RecordingRow }
  events: { key: number; value: UsageEvent; indexes: { byTime: number } }
  settings: { key: string; value: { key: string; value: unknown } }
  songs: { key: string; value: Song }
  scenes: { key: string; value: Scene }
  photos: { key: string; value: PhotoRow }
  symbols: { key: string; value: SymbolRow }
  messages: { key: number; value: SpokenMessage; indexes: { byTime: number } }
}

let dbPromise: Promise<IDBPDatabase<EchoBloomDB>> | null = null

export function getDB() {
  dbPromise ??= openDB<EchoBloomDB>(databaseNameForProfile(getActiveProfileId()), 4, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('categories', { keyPath: 'id' })
        const phrases = db.createObjectStore('phrases', { keyPath: 'id' })
        phrases.createIndex('byCategory', 'categoryId')
        db.createObjectStore('recordings', { keyPath: 'id' })
        const events = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true })
        events.createIndex('byTime', 'at')
        db.createObjectStore('settings', { keyPath: 'key' })
      }
      if (oldVersion < 2) {
        db.createObjectStore('songs', { keyPath: 'id' })
        db.createObjectStore('scenes', { keyPath: 'id' })
        db.createObjectStore('photos', { keyPath: 'id' })
      }
      if (oldVersion < 3) {
        db.createObjectStore('symbols', { keyPath: 'id' })
      }
      if (oldVersion < 4) {
        const messages = db.createObjectStore('messages', {
          keyPath: 'id',
          autoIncrement: true,
        })
        messages.createIndex('byTime', 'at')
      }
    },
    // another tab is trying to upgrade: get out of its way and pick up the new version
    blocking(_current, _blocked, event) {
      ;(event.target as IDBDatabase | null)?.close()
      dbPromise = null
      window.location.reload()
    },
  })
  return dbPromise
}

// ---------- settings ----------
export async function loadSettings(): Promise<Settings> {
  const db = await getDB()
  const row = await db.get('settings', 'app')
  const value = { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) }
  const profile = getActiveProfile()
  if (!value.childName && profile.id !== 'default') value.childName = profile.name
  return value
}

export async function saveSettings(value: Settings) {
  const db = await getDB()
  await db.put('settings', { key: 'app', value })
}

// ---------- categories & phrases ----------
export async function listCategories(): Promise<Category[]> {
  const db = await getDB()
  const all = await db.getAll('categories')
  return all.sort((a, b) => a.order - b.order)
}

export async function putCategory(cat: Category) {
  const db = await getDB()
  await db.put('categories', cat)
}

export async function deleteCategory(id: string) {
  const db = await getDB()
  const tx = db.transaction(['categories', 'phrases'], 'readwrite')
  await tx.objectStore('categories').delete(id)
  const idx = tx.objectStore('phrases').index('byCategory')
  for await (const cursor of idx.iterate(id)) {
    await cursor.delete()
  }
  await tx.done
}

export async function listPhrases(categoryId?: string): Promise<Phrase[]> {
  const db = await getDB()
  const all = categoryId
    ? await db.getAllFromIndex('phrases', 'byCategory', categoryId)
    : await db.getAll('phrases')
  return all.sort((a, b) => a.order - b.order)
}

export async function putPhrase(phrase: Phrase) {
  const db = await getDB()
  await db.put('phrases', phrase)
}

export async function deletePhrase(id: string) {
  const db = await getDB()
  const phrase = await db.get('phrases', id)
  await db.delete('phrases', id)
  if (phrase?.recordingId) await db.delete('recordings', phrase.recordingId)
}

// ---------- recordings ----------
export async function saveRecording(row: RecordingRow) {
  const db = await getDB()
  await db.put('recordings', row)
}

export async function getRecording(id: string): Promise<RecordingRow | undefined> {
  const db = await getDB()
  return db.get('recordings', id)
}

export async function deleteRecording(id: string) {
  const db = await getDB()
  await db.delete('recordings', id)
}

// ---------- visual symbols ----------
export async function saveSymbol(row: SymbolRow) {
  const db = await getDB()
  await db.put('symbols', row)
}

export async function getSymbol(id: string): Promise<SymbolRow | undefined> {
  const db = await getDB()
  return db.get('symbols', id)
}

export async function listSymbols(): Promise<SymbolRow[]> {
  const db = await getDB()
  return db.getAll('symbols')
}

/** Remove every phrase in a category plus their recordings (used by song/scene deletes). */
async function deletePhrasesInCategory(categoryId: string) {
  const db = await getDB()
  const phrases = await db.getAllFromIndex('phrases', 'byCategory', categoryId)
  for (const p of phrases) {
    await db.delete('phrases', p.id)
    if (p.recordingId) await db.delete('recordings', p.recordingId)
  }
}

// ---------- songs ----------
export async function listSongs(): Promise<Song[]> {
  const db = await getDB()
  const all = await db.getAll('songs')
  return all.sort((a, b) => a.order - b.order)
}

export async function putSong(song: Song) {
  const db = await getDB()
  await db.put('songs', song)
}

export async function deleteSong(id: string) {
  const db = await getDB()
  await deletePhrasesInCategory(`song:${id}`)
  await db.delete('songs', id)
}

// ---------- photo scenes ----------
export async function listScenes(): Promise<Scene[]> {
  const db = await getDB()
  const all = await db.getAll('scenes')
  return all.sort((a, b) => a.order - b.order)
}

export async function putScene(scene: Scene) {
  const db = await getDB()
  await db.put('scenes', scene)
}

export async function deleteScene(id: string) {
  const db = await getDB()
  const scene = await db.get('scenes', id)
  await deletePhrasesInCategory(`scene:${id}`)
  if (scene) await db.delete('photos', scene.photoId)
  await db.delete('scenes', id)
}

export async function savePhoto(row: PhotoRow) {
  const db = await getDB()
  await db.put('photos', row)
}

export async function getPhoto(id: string): Promise<PhotoRow | undefined> {
  const db = await getDB()
  return db.get('photos', id)
}

// ---------- usage log ----------
export async function logEvent(kind: string, detail: string) {
  const db = await getDB()
  await db.add('events', { at: Date.now(), kind, detail })
}

export async function recentEvents(limit = 200): Promise<UsageEvent[]> {
  const db = await getDB()
  const out: UsageEvent[] = []
  const tx = db.transaction('events')
  for await (const cursor of tx.store.index('byTime').iterate(null, 'prev')) {
    out.push(cursor.value)
    if (out.length >= limit) break
  }
  return out
}

export async function clearEvents() {
  const db = await getDB()
  await db.clear('events')
}

// ---------- child-facing communication history ----------
export async function rememberMessage(message: Omit<SpokenMessage, 'id' | 'at'>) {
  const db = await getDB()
  const saved: SpokenMessage = { ...message, at: Date.now() }
  const id = await db.add('messages', saved)
  const withId = { ...saved, id }
  window.dispatchEvent(new CustomEvent<SpokenMessage>('echobloom:message', { detail: withId }))
  return withId
}

export async function recentMessages(limit = 30): Promise<SpokenMessage[]> {
  const db = await getDB()
  const out: SpokenMessage[] = []
  const tx = db.transaction('messages')
  for await (const cursor of tx.store.index('byTime').iterate(null, 'prev')) {
    out.push(cursor.value)
    if (out.length >= limit) break
  }
  return out
}

export async function clearMessages() {
  const db = await getDB()
  await db.clear('messages')
}

/** Ask the browser to protect our data from low-storage eviction. */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

export function makeId() {
  return crypto.randomUUID()
}
