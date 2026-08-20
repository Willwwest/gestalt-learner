import { useCallback, useEffect, useState } from 'react'
import PhraseEditor from './PhraseEditor'
import PhraseVisual from './PhraseVisual'
import { deleteSong, listPhrases, listSongs, makeId, putPhrase, putSong } from '../lib/db'
import { playPhrase } from '../lib/audio'
import type { Phrase, Settings, Song } from '../lib/types'

export default function SongManager({ settings }: { settings: Settings }) {
  const [songs, setSongs] = useState<Song[]>([])
  const [songId, setSongId] = useState<string>('')
  const [lines, setLines] = useState<Phrase[]>([])
  const [editing, setEditing] = useState<{ phrase: Phrase; isNew: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // local draft of the editable song fields: inputs read from here, never from the
  // async DB refresh, so typing mid-string doesn't bounce the caret to the end
  const [draft, setDraft] = useState<{
    id: string
    title: string
    emoji: string
    pauseSec: number
  } | null>(null)

  const song = songs.find((s) => s.id === songId) ?? null

  const refresh = useCallback(async () => {
    const all = await listSongs()
    setSongs(all)
    if (songId && !all.some((s) => s.id === songId)) setSongId('')
    if (songId) setLines(await listPhrases(`song:${songId}`))
  }, [songId])

  useEffect(() => {
    void refresh()
    setConfirmDelete(false)
  }, [refresh])

  // re-sync the draft only when switching to a DIFFERENT song — a background
  // refresh of `songs` must never clobber in-progress typing
  useEffect(() => {
    const s = songs.find((x) => x.id === songId)
    if (!s) {
      if (draft !== null && !songs.some((x) => x.id === draft.id)) setDraft(null)
      return
    }
    if (draft?.id !== songId) {
      setDraft({ id: s.id, title: s.title, emoji: s.emoji, pauseSec: s.pauseSec })
    }
  }, [songId, songs, draft])

  const addSong = async () => {
    const title = window.prompt('Song name?')
    if (!title?.trim()) return
    const id = makeId()
    await putSong({
      id,
      title: title.trim(),
      emoji: '🎵',
      pauseSec: 0,
      order: songs.reduce((m, s) => Math.max(m, s.order), -1) + 1,
    })
    setSongId(id)
    await refresh()
  }

  const updateSong = async (patch: Partial<Pick<Song, 'title' | 'emoji' | 'pauseSec'>>) => {
    if (!song || !draft) return
    const nextDraft = { ...draft, ...patch }
    setDraft(nextDraft)
    await putSong({
      ...song,
      title: nextDraft.title,
      emoji: nextDraft.emoji,
      pauseSec: nextDraft.pauseSec,
    })
    await refresh()
  }

  const addLine = () => {
    if (!song) return
    setEditing({
      isNew: true,
      phrase: {
        id: makeId(),
        categoryId: `song:${song.id}`,
        text: '',
        emoji: '🎵',
        lang: 'en',
        stage: 1,
        order: lines.reduce((m, l) => Math.max(m, l.order), -1) + 1,
      },
    })
  }

  const moveLine = async (line: Phrase, dir: -1 | 1) => {
    const idx = lines.findIndex((l) => l.id === line.id)
    const other = lines[idx + dir]
    if (!other) return
    await putPhrase({ ...line, order: other.order })
    await putPhrase({ ...other, order: line.order })
    await refresh()
  }

  const removeSong = async () => {
    if (!song) return
    await deleteSong(song.id)
    setSongId('')
    setConfirmDelete(false)
    await refresh()
  }

  return (
    <div>
      <h2>Songs</h2>
      <p>
        Songs are usually a gestalt learner's very first language — melody carries the
        words in. Record each line in your own singing voice. A <strong>fill-in
        pause</strong> after each line leaves room to sing the next bit:
        pause, look expectant, and wait.
      </p>
      <div className="row" style={{ margin: '14px 0' }}>
        <select
          value={songId}
          onChange={(e) => setSongId(e.target.value)}
          style={{ fontSize: 16, padding: '10px 12px', borderRadius: 10 }}
        >
          <option value="">— pick a song —</option>
          {songs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji} {s.title}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <button className="btn" onClick={() => void addSong()}>
          + New song
        </button>
      </div>

      {song && draft && draft.id === song.id && (
        <>
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <label>Title</label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => void updateSong({ title: e.target.value })}
              />
            </div>
            <div className="field" style={{ width: 90, margin: 0 }}>
              <label>Emoji</label>
              <input
                type="text"
                value={draft.emoji}
                onChange={(e) => void updateSong({ emoji: e.target.value })}
                style={{ textAlign: 'center' }}
              />
            </div>
            <div className="field" style={{ width: 190, margin: 0 }}>
              <label>Fill-in pause: {draft.pauseSec}s</label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={draft.pauseSec}
                onChange={(e) => void updateSong({ pauseSec: Number(e.target.value) })}
              />
            </div>
          </div>

          {lines.map((line, i) => (
            <div className="phrase-row" key={line.id}>
              <PhraseVisual
                emoji={line.emoji}
                symbolId={line.symbolId}
                className="pr-emoji"
              />
              <div className="pr-main">
                <div className="pr-text">{line.text}</div>
              </div>
              {line.recordingId ? (
                <span className="badge">🎙 your voice</span>
              ) : (
                <span className="badge muted">robot voice</span>
              )}
              <button
                className="btn secondary"
                disabled={i === 0}
                onClick={() => void moveLine(line, -1)}
                aria-label="Move line up"
              >
                ↑
              </button>
              <button
                className="btn secondary"
                disabled={i === lines.length - 1}
                onClick={() => void moveLine(line, 1)}
                aria-label="Move line down"
              >
                ↓
              </button>
              <button
                className="btn secondary"
                onClick={() => void playPhrase(line, settings.ttsRate)}
              >
                ▶
              </button>
              <button
                className="btn secondary"
                onClick={() => setEditing({ phrase: line, isNew: false })}
              >
                Edit
              </button>
            </div>
          ))}

          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" onClick={addLine}>
              + Add line
            </button>
            <span className="spacer" />
            {confirmDelete ? (
              <button className="btn danger" onClick={() => void removeSong()}>
                Really delete the whole song?
              </button>
            ) : (
              <button className="btn secondary" onClick={() => setConfirmDelete(true)}>
                Delete song…
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
