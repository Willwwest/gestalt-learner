import type { CSSProperties } from 'react'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import Home from './components/Home'
import Icon, { type IconName } from './components/Icon'
import Board from './components/Board'
import Mix from './components/Mix'
import Letters from './components/Letters'
import Songs from './components/Songs'
import Scenes from './components/Scenes'
import { loadSettings, saveSettings } from './lib/db'
import { stopAllAudio } from './lib/audio'
import type { Settings } from './lib/types'
import { DEFAULT_SETTINGS } from './lib/types'

const loadGrownUps = () => import('./components/GrownUps')
const GrownUps = lazy(loadGrownUps)

export type View = 'home' | 'board' | 'mix' | 'letters' | 'songs' | 'scenes' | 'grownups'

const TITLES: Record<
  Exclude<View, 'home'>,
  { icon: IconName; label: string; eyebrow: string; accent: string; soft: string }
> = {
  board: {
    icon: 'talk',
    label: "Let's Talk!",
    eyebrow: 'My voice',
    accent: '#e65f52',
    soft: '#fff0e8',
  },
  mix: {
    icon: 'mix',
    label: 'Mix & Match',
    eyebrow: 'Build a phrase',
    accent: '#7258c9',
    soft: '#f0edff',
  },
  letters: {
    icon: 'letters',
    label: 'Letters & Numbers',
    eyebrow: 'Explore symbols',
    accent: '#147d78',
    soft: '#e2f7f2',
  },
  songs: {
    icon: 'songs',
    label: 'Songs',
    eyebrow: 'Sing together',
    accent: '#b56c08',
    soft: '#fff4d7',
  },
  scenes: {
    icon: 'photos',
    label: 'Photo Time',
    eyebrow: 'Family moments',
    accent: '#b24d78',
    soft: '#ffedf4',
  },
  grownups: {
    icon: 'grownups',
    label: 'Caregiver Studio',
    eyebrow: 'Grown-ups',
    accent: '#6254b7',
    soft: '#eeecfb',
  },
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s)
      setReady(true)
    })
  }, [])

  // keep the screen awake while the app is open (re-request when returning)
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null
      } catch {
        // not critical
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [])

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next)
    void saveSettings(next)
  }, [])

  const goHome = useCallback(() => {
    stopAllAudio()
    setView('home')
  }, [])

  if (!ready) {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <span className="loading-mark">
          <Icon name="sprout" size={42} />
        </span>
        <strong>Getting your words ready…</strong>
      </div>
    )
  }

  if (view === 'home') {
    return (
      <Home
        onNavigate={setView}
        onCaregiverIntent={() => {
          void loadGrownUps()
        }}
      />
    )
  }

  const title = TITLES[view]
  const appStyle = {
    '--view-accent': title.accent,
    '--view-soft': title.soft,
  } as CSSProperties

  return (
    <div className={`app view-${view}`} style={appStyle}>
      <header className="kid-header">
        <button className="back-btn" onClick={goHome} aria-label="Back to home">
          <Icon name="back" size={26} />
          <span>Home</span>
        </button>
        <div className="screen-title">
          <span className="screen-mark">
            <Icon name={title.icon} size={29} />
          </span>
          <div>
            <span className="screen-eyebrow">{title.eyebrow}</span>
            <h1>{title.label}</h1>
          </div>
        </div>
        <div className="header-brand" aria-label="EchoBloom">
          <Icon name="sprout" size={20} />
          <span>EchoBloom</span>
        </div>
      </header>
      <div className="kid-body">
        {view === 'board' && <Board settings={settings} />}
        {view === 'mix' && <Mix settings={settings} />}
        {view === 'letters' && <Letters settings={settings} />}
        {view === 'songs' && <Songs settings={settings} />}
        {view === 'scenes' && <Scenes settings={settings} />}
        {view === 'grownups' && (
          <Suspense
            fallback={
              <div className="caregiver-loading" role="status" aria-live="polite">
                <span className="loading-mark">
                  <Icon name="grownups" size={34} />
                </span>
                <strong>Opening caregiver studio…</strong>
              </div>
            }
          >
            <GrownUps settings={settings} onSettingsChange={updateSettings} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
