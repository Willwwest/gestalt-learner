import { useCallback, useEffect, useRef, useState } from 'react'
import PhraseEditor from './PhraseEditor'
import PhraseVisual from './PhraseVisual'
import {
  deleteScene,
  getPhoto,
  listPhrases,
  listScenes,
  makeId,
  putPhrase,
  putScene,
  savePhoto,
} from '../lib/db'
import { fileToResizedBlob } from '../lib/photos'
import type { Phrase, Scene, Settings } from '../lib/types'

export default function SceneManager({ settings: _settings }: { settings: Settings }) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [sceneId, setSceneId] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [hotspots, setHotspots] = useState<Phrase[]>([])
  const [editing, setEditing] = useState<{ phrase: Phrase; isNew: boolean } | null>(null)
  const [moving, setMoving] = useState<Phrase | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [ratio, setRatio] = useState('4 / 3')
  const [loadedUrl, setLoadedUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef('')

  const scene = scenes.find((s) => s.id === sceneId) ?? null
  const photoId = scene?.photoId ?? ''

  const refresh = useCallback(async () => {
    const all = await listScenes()
    setScenes(all)
    if (sceneId) setHotspots(await listPhrases(`scene:${sceneId}`))
  }, [sceneId])

  useEffect(() => {
    void refresh()
    setConfirmDelete(false)
    setMoving(null)
  }, [refresh])

  // keyed on the photo ID (a string), not the scene object — list refreshes
  // produce new object identities and must not re-fetch or flicker the photo
  useEffect(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = ''
    setPhotoUrl('')
    setLoadedUrl('')
    if (!photoId) return
    let cancelled = false
    void getPhoto(photoId).then((photo) => {
      if (!photo) return
      const url = URL.createObjectURL(photo.blob)
      if (cancelled) {
        URL.revokeObjectURL(url)
        return
      }
      urlRef.current = url
      setPhotoUrl(url)
    })
    return () => {
      cancelled = true
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = ''
    }
  }, [photoId])

  const addScene = async (file: File) => {
    setBusy(true)
    setPhotoError('')
    try {
      const title = window.prompt('Name this photo (e.g. "Grandma\'s kitchen")?')
      if (!title?.trim()) return
      const { blob, mimeType } = await fileToResizedBlob(file)
      const newPhotoId = makeId()
      await savePhoto({ id: newPhotoId, blob, mimeType, createdAt: Date.now() })
      const id = makeId()
      await putScene({
        id,
        title: title.trim(),
        emoji: '📸',
        photoId: newPhotoId,
        order: scenes.reduce((m, s) => Math.max(m, s.order), -1) + 1,
      })
      setSceneId(id)
      await refresh()
    } catch {
      // most common cause: a photo format the tablet can't decode (e.g. iPhone HEIC)
      setPhotoError(
        "Couldn't read that photo. If it came from an iPhone it may be HEIC — " +
          'convert it to JPG/PNG (or take a screenshot of it) and try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const onPhotoClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scene) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    if (moving) {
      await putPhrase({ ...moving, x, y })
      setMoving(null)
      await refresh()
      return
    }
    setEditing({
      isNew: true,
      phrase: {
        id: makeId(),
        categoryId: `scene:${scene.id}`,
        text: '',
        emoji: '⭐',
        lang: 'en',
        stage: 1,
        x,
        y,
        order: hotspots.reduce((m, h) => Math.max(m, h.order), -1) + 1,
      },
    })
  }

  const removeScene = async () => {
    if (!scene) return
    await deleteScene(scene.id)
    setSceneId('')
    setConfirmDelete(false)
    await refresh()
  }

  return (
    <div>
      <h2>Photo scenes</h2>
      <p>
        A photo of a real place he loves — grandma's kitchen, the bath, his bookshelf —
        with talking spots on it. Tap the photo below to place a spot, give it a
        phrase ("Let's take a bath!"), and record it. Photos of real routines beat
        clip-art every time.
      </p>
      <div className="row" style={{ margin: '14px 0' }}>
        <select
          value={sceneId}
          onChange={(e) => setSceneId(e.target.value)}
          style={{ fontSize: 16, padding: '10px 12px', borderRadius: 10 }}
        >
          <option value="">— pick a photo —</option>
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji} {s.title}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Adding…' : '+ Add photo'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void addScene(f)
            e.target.value = ''
          }}
        />
      </div>
      {photoError && (
        <p style={{ color: 'var(--warn)', fontWeight: 600, fontSize: 14.5 }}>{photoError}</p>
      )}

      {scene && (
        <>
          {moving && (
            <p style={{ color: 'var(--accent)', fontWeight: 700 }}>
              Tap the photo where "{moving.text}" should sit — or{' '}
              <button className="btn secondary" onClick={() => setMoving(null)}>
                cancel move
              </button>
            </p>
          )}
          {photoUrl && (
            <div
              className="scene-edit-stage"
              style={{ aspectRatio: ratio }}
              onClick={(e) => void onPhotoClick(e)}
              role="button"
              aria-label="Tap to place a talking spot"
            >
              <img
                src={photoUrl}
                alt={scene.title}
                draggable={false}
                style={{ visibility: loadedUrl === photoUrl ? 'visible' : 'hidden' }}
                onLoad={(e) => {
                  setRatio(
                    `${e.currentTarget.naturalWidth} / ${e.currentTarget.naturalHeight}`,
                  )
                  setLoadedUrl(photoUrl)
                }}
              />
              {hotspots.map((h, i) => (
                <span
                  key={h.id}
                  className="hotspot editor-dot"
                  style={{ left: `${(h.x ?? 0.5) * 100}%`, top: `${(h.y ?? 0.5) * 100}%` }}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          )}

          {hotspots.map((h, i) => (
            <div className="phrase-row" key={h.id}>
              <span className="hotspot-row-number">{i + 1}</span>
              <PhraseVisual emoji={h.emoji} symbolId={h.symbolId} className="pr-emoji" />
              <div className="pr-main">
                <div className="pr-text">{h.text}</div>
                {h.gloss && <div className="pr-gloss">{h.gloss}</div>}
              </div>
              {h.recordingId ? (
                <span className="badge">🎙 your voice</span>
              ) : (
                <span className="badge muted">robot voice</span>
              )}
              <button className="btn secondary" onClick={() => setMoving(h)}>
                Move
              </button>
              <button
                className="btn secondary"
                onClick={() => setEditing({ phrase: h, isNew: false })}
              >
                Edit
              </button>
            </div>
          ))}

          <div className="row" style={{ marginTop: 14 }}>
            <span style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
              Tap anywhere on the photo to add a talking spot.
            </span>
            <span className="spacer" />
            {confirmDelete ? (
              <button className="btn danger" onClick={() => void removeScene()}>
                Really delete this photo scene?
              </button>
            ) : (
              <button className="btn secondary" onClick={() => setConfirmDelete(true)}>
                Delete scene…
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
