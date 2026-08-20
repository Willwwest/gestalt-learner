import type { CSSProperties } from 'react'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import Home from './components/Home'
import Icon, { type IconName } from './components/Icon'
import Board from './components/Board'
import Mix from './components/Mix'
import Letters from './components/Letters'
import Songs from './components/Songs'
import Scenes from './components/Scenes'
import QuickTalk from './components/QuickTalk'
import VoiceDock from './components/VoiceDock'
import Onboarding from './components/Onboarding'
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

  // Access preferences apply to the home screen and every child activity.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.tileSize = settings.tileSize
    root.dataset.contrast = settings.highContrast ? 'high' : 'soft'
    root.dataset.motion = settings.reducedMotion ? 'reduced' : 'gentle'
    root.style.setProperty('--dwell-ms', `${settings.dwellMs}ms`)
  }, [settings.highContrast, settings.reducedMotion, settings.tileSize, settings.dwellMs])

  // Pointer dwell is useful with eye/head-mouse access. Touch and pen input are
  // deliberately ignored so ordinary taps remain immediate.
  useEffect(() => {
    if (settings.dwellMs === 0) return
    let target: HTMLButtonElement | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    const reset = () => {
      if (timer) clearTimeout(timer)
      timer = null
      target?.classList.remove('dwelling')
      target = null
    }
    const onOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') return
      const next = (event.target as Element | null)?.closest<HTMLButtonElement>(
        'button.dwell-target[data-dwell="true"]',
      )
      if (!next || next.disabled || next === target) return
      reset()
      target = next
      target.classList.add('dwelling')
      timer = setTimeout(() => {
        const activationTarget = target
        reset()
        activationTarget?.click()
      }, settings.dwellMs)
    }
    const onOut = (event: PointerEvent) => {
      if (!target) return
      const related = event.relatedTarget as Node | null
      if (related && target.contains(related)) return
      if ((event.target as Element | null)?.closest('button') === target) reset()
    }
    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('click', reset)
    return () => {
      reset()
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('click', reset)
    }
  }, [settings.dwellMs])

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
      <>
        <Home
          settings={settings}
          onNavigate={setView}
          onCaregiverIntent={() => {
            void loadGrownUps()
          }}
        />
        {!settings.onboardingComplete && (
          <Onboarding settings={settings} onComplete={updateSettings} />
        )}
      </>
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
        {view !== 'grownups' && <QuickTalk key={`quick-${view}`} settings={settings} />}
        {view !== 'grownups' && (
          <div className="kid-view-content">
            {view === 'board' && <Board settings={settings} />}
            {view === 'mix' && <Mix settings={settings} />}
            {view === 'letters' && <Letters settings={settings} />}
            {view === 'songs' && <Songs settings={settings} />}
            {view === 'scenes' && <Scenes settings={settings} />}
          </div>
        )}
        {view !== 'grownups' && <VoiceDock settings={settings} />}
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
