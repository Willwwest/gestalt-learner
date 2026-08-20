import { useEffect, useState } from 'react'
import { getPhoto, listPhrases, listScenes, logEvent } from '../lib/db'
import { playPhrase, stopAllAudio } from '../lib/audio'
import type { Phrase, Scene, Settings } from '../lib/types'
import Icon from './Icon'
import PhraseVisual from './PhraseVisual'
import { selectionFeedback } from '../lib/haptics'

export default function Scenes({ settings }: { settings: Settings }) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [scene, setScene] = useState<Scene | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [hotspots, setHotspots] = useState<Phrase[]>([])
  const [nowPlaying, setNowPlaying] = useState<Phrase | null>(null)
  const [ratio, setRatio] = useState('4 / 3')
  const [loadedUrl, setLoadedUrl] = useState('')

  useEffect(() => {
    void listScenes().then(setScenes)
  }, [])

  useEffect(() => {
    if (!scene) return
    let url = ''
    void (async () => {
      const photo = await getPhoto(scene.photoId)
      if (photo) {
        url = URL.createObjectURL(photo.blob)
        setPhotoUrl(url)
      }
      const ps = await listPhrases(`scene:${scene.id}`)
      setHotspots(ps.filter((p) => !p.hidden))
    })()
    return () => {
      if (url) URL.revokeObjectURL(url)
      setPhotoUrl('')
      setLoadedUrl('')
      setNowPlaying(null)
      stopAllAudio()
    }
  }, [scene])

  const onHotspot = async (spot: Phrase) => {
    void selectionFeedback(settings.hapticsEnabled)
    setNowPlaying(spot)
    void logEvent('scene-tap', spot.text)
    await playPhrase(spot, settings.ttsRate)
  }

  if (!scene) {
    return (
      <>
        <div className="tile-grid">
          {scenes.map((s) => (
            <button key={s.id} className="tile" onClick={() => setScene(s)}>
              <span className="tile-emoji">{s.emoji}</span>
              <span className="tile-text">{s.title}</span>
            </button>
          ))}
        </div>
        {scenes.length === 0 && (
          <div className="caption idle">
            Grown-ups can add family photos with talking spots in the ⭐ zone!
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="song-controls">
        <button
          className="subview-back"
          onClick={() => setScene(null)}
          aria-label="Back to photo list"
        >
          <Icon name="back" size={25} />
        </button>
        <div className="song-title">
          {scene.emoji} {scene.title}
        </div>
      </div>
      <div className="scene-stage">
        {photoUrl && (
          <div className="scene-frame" style={{ aspectRatio: ratio }}>
            <img
              src={photoUrl}
              alt={scene.title}
              style={{ visibility: loadedUrl === photoUrl ? 'visible' : 'hidden' }}
              onLoad={(e) => {
                setRatio(`${e.currentTarget.naturalWidth} / ${e.currentTarget.naturalHeight}`)
                setLoadedUrl(photoUrl)
              }}
            />
            {hotspots.map((spot) => (
              <button
                key={spot.id}
                className={`hotspot${nowPlaying?.id === spot.id ? ' playing' : ''}`}
                style={{ left: `${(spot.x ?? 0.5) * 100}%`, top: `${(spot.y ?? 0.5) * 100}%` }}
                onClick={() => void onHotspot(spot)}
                aria-label={spot.text}
                aria-pressed={nowPlaying?.id === spot.id}
              >
                <PhraseVisual
                  emoji={spot.emoji}
                  symbolId={spot.symbolId}
                  className="hotspot-visual"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={`caption${nowPlaying ? '' : ' idle'}`} aria-live="polite">
        {nowPlaying ? (
          <>
            <PhraseVisual
              emoji={nowPlaying.emoji}
              symbolId={nowPlaying.symbolId}
              className="cap-emoji"
            />
            {nowPlaying.text}
          </>
        ) : (
          'Tap a circle on the photo!'
        )}
      </div>
    </>
  )
}
