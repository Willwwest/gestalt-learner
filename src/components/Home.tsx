import type { CSSProperties } from 'react'
import HoldButton from './HoldButton'
import Icon, { type IconName } from './Icon'
import type { View } from '../App'
import type { Settings } from '../lib/types'
import QuickTalk from './QuickTalk'

interface Activity {
  id: Exclude<View, 'home' | 'grownups'>
  icon: IconName
  kicker: string
  label: string
  note: string
  color: string
  soft: string
  primary?: boolean
}

const ACTIVITIES: Activity[] = [
  {
    id: 'board',
    icon: 'talk',
    kicker: 'My voice',
    label: "Let's Talk!",
    note: 'Tap a thought to say it together.',
    color: '#f06f5f',
    soft: '#fff0e8',
    primary: true,
  },
  {
    id: 'mix',
    icon: 'mix',
    kicker: 'Build a phrase',
    label: 'Mix & Match',
    note: 'Join familiar pieces in a new way.',
    color: '#7258c9',
    soft: '#f0edff',
  },
  {
    id: 'letters',
    icon: 'letters',
    kicker: 'Explore symbols',
    label: 'Letters & Numbers',
    note: 'Listen in four languages.',
    color: '#147d78',
    soft: '#e2f7f2',
  },
  {
    id: 'songs',
    icon: 'songs',
    kicker: 'Sing together',
    label: 'Songs',
    note: 'Play a line or the whole song.',
    color: '#c27a10',
    soft: '#fff4d7',
  },
  {
    id: 'scenes',
    icon: 'photos',
    kicker: 'Family moments',
    label: 'Photo Time',
    note: 'Find words inside familiar places.',
    color: '#b24d78',
    soft: '#ffedf4',
  },
]

export default function Home({
  onNavigate,
  onCaregiverIntent,
  settings,
}: {
  onNavigate: (v: View) => void
  onCaregiverIntent: () => void
  settings: Settings
}) {
  return (
    <div className="home">
      <header className="home-header">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Icon name="sprout" size={34} />
          </span>
          <div>
            <h1 className="home-title">EchoBloom</h1>
            <p>Words grow here.</p>
          </div>
        </div>
        <div className="grownup-access">
          <div className="grownup-hint">
            <strong>Caregiver space</strong>
            <span>Press and hold to open</span>
          </div>
          <HoldButton
            seconds={2.5}
            onStart={onCaregiverIntent}
            onComplete={() => onNavigate('grownups')}
            label="Grown-Ups"
            emoji="✦"
            compact
          />
        </div>
      </header>

      <QuickTalk settings={settings} home />

      <div className="home-prompt">
        <span className="eyebrow">
          <Icon name="wave" size={17} /> Choose an activity
        </span>
        <h2>What should we explore?</h2>
      </div>

      <nav className="doors" aria-label="Activities">
        {ACTIVITIES.map((activity) => {
          const style = {
            '--door-color': activity.color,
            '--door-soft': activity.soft,
          } as CSSProperties
          return (
            <button
              key={activity.id}
              className={`door${activity.primary ? ' door-primary' : ''}`}
              style={style}
              onClick={() => onNavigate(activity.id)}
            >
              <span className="door-art">
                <Icon name={activity.icon} size={activity.primary ? 62 : 38} />
              </span>
              <span className="door-copy">
                <span className="door-kicker">{activity.kicker}</span>
                <span className="door-label">{activity.label}</span>
                <span className="door-note">{activity.note}</span>
              </span>
              <span className="door-arrow" aria-hidden="true">
                <Icon name="arrow" size={22} />
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
