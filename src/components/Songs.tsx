import { useEffect, useRef, useState } from 'react'
import { listPhrases, listSongs, logEvent } from '../lib/db'
import { playPhrase, stopAllAudio } from '../lib/audio'
import type { Phrase, Settings, Song } from '../lib/types'
import Icon from './Icon'
import PhraseVisual from './PhraseVisual'
import { selectionFeedback } from '../lib/haptics'

export default function Songs({ settings }: { settings: Settings }) {
  const [songs, setSongs] = useState<Song[]>([])
  const [song, setSong] = useState<Song | null>(null)
  const [lines, setLines] = useState<Phrase[]>([])
  const [currentLine, setCurrentLine] = useState<string | null>(null)
  const [playingAll, setPlayingAll] = useState(false)
  // bump the token to cancel a running play-all loop
  const playToken = useRef(0)

  useEffect(() => {
    void listSongs().then(setSongs)
    return () => {
      playToken.current++
      stopAllAudio()
    }
  }, [])

  useEffect(() => {
    if (!song) return
    void listPhrases(`song:${song.id}`).then((ps) => setLines(ps.filter((p) => !p.hidden)))
  }, [song])

  const stop = () => {
    playToken.current++
    stopAllAudio()
    setCurrentLine(null)
    setPlayingAll(false)
  }

  const playOne = async (line: Phrase) => {
    void selectionFeedback(settings.hapticsEnabled)
    playToken.current++
    setPlayingAll(false)
    setCurrentLine(line.id)
    void logEvent('song-line', line.text)
    await playPhrase(line, settings.ttsRate)
  }

  const playAll = async () => {
    if (!song || lines.length === 0) return
    void selectionFeedback(settings.hapticsEnabled)
    const token = ++playToken.current
    setPlayingAll(true)
    void logEvent('song-play', song.title)
    for (const line of lines) {
      if (playToken.current !== token) return
      setCurrentLine(line.id)
      await playPhrase(line, settings.ttsRate)
      if (playToken.current !== token) return
      if (song.pauseSec > 0) {
        // the fill-in-the-blank pause: leave room for him to sing the next line
        await new Promise((r) => setTimeout(r, song.pauseSec * 1000))
      }
    }
    if (playToken.current === token) {
      setCurrentLine(null)
      setPlayingAll(false)
    }
  }

  if (!song) {
    return (
      <>
        <div className="tile-grid">
          {songs.map((s) => (
            <button
              key={s.id}
              className="tile"
              onClick={() => {
                void selectionFeedback(settings.hapticsEnabled)
                setSong(s)
              }}
            >
              <span className="tile-emoji">{s.emoji}</span>
              <span className="tile-text">{s.title}</span>
            </button>
          ))}
        </div>
        {songs.length === 0 && (
          <div className="caption idle">Grown-ups can add songs in the ⭐ zone!</div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="song-controls">
        <button
          className="subview-back"
          onClick={() => {
            stop()
            setSong(null)
          }}
          aria-label="Back to songs"
        >
          <Icon name="back" size={25} />
        </button>
        <div className="song-title">
          {song.emoji} {song.title}
        </div>
        {playingAll ? (
          <button className="btn-round stop" onClick={stop} aria-label="Stop">
            <Icon name="stop" size={31} />
          </button>
        ) : (
          <button className="btn-round" onClick={() => void playAll()} aria-label="Play the song">
            <Icon name="play" size={31} />
          </button>
        )}
      </div>
      <div className="song-lines">
        {lines.map((line) => (
          <button
            key={line.id}
            className={`part song-line${currentLine === line.id ? ' selected' : ''}`}
            onClick={() => void playOne(line)}
            aria-pressed={currentLine === line.id}
          >
            <PhraseVisual
              emoji={line.emoji}
              symbolId={line.symbolId}
              className="part-emoji"
            />
            {line.text}
          </button>
        ))}
      </div>
    </>
  )
}
