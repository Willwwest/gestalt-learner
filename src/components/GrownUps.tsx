import { useRef, useState } from 'react'
import CaregiverHome from './CaregiverHome'
import PhraseManager from './PhraseManager'
import SongManager from './SongManager'
import SceneManager from './SceneManager'
import BookManager from './BookManager'
import Guide from './Guide'
import StageTracker from './StageTracker'
import Journal from './Journal'
import SettingsPanel from './SettingsPanel'
import Icon, { type IconName } from './Icon'
import type { Settings } from '../lib/types'

type Tab =
  | 'today'
  | 'guide'
  | 'progress'
  | 'phrases'
  | 'songs'
  | 'books'
  | 'scenes'
  | 'journal'
  | 'settings'

const TAB_GROUPS: Array<{
  label: string
  tabs: Array<{ id: Tab; label: string; detail: string; icon: IconName }>
}> = [
  {
    label: 'Start here',
    tabs: [
      { id: 'today', label: 'Today', detail: 'One useful next step', icon: 'home' },
      { id: 'progress', label: 'Progress', detail: 'Plan & milestones', icon: 'sprout' },
    ],
  },
  {
    label: 'Personalize',
    tabs: [
      { id: 'phrases', label: 'Phrases', detail: 'Words & recordings', icon: 'record' },
      { id: 'songs', label: 'Songs', detail: 'Lines & pauses', icon: 'songs' },
      { id: 'books', label: 'Story Time', detail: 'Books & refrains', icon: 'book' },
      { id: 'scenes', label: 'Photo scenes', detail: 'Familiar places', icon: 'photos' },
    ],
  },
  {
    label: 'Review & manage',
    tabs: [
      { id: 'journal', label: 'Journal', detail: 'Notes & patterns', icon: 'journal' },
      { id: 'settings', label: 'Settings', detail: 'Access & backup', icon: 'settings' },
      { id: 'guide', label: 'Help library', detail: 'Answers when needed', icon: 'book' },
    ],
  },
]

export default function GrownUps({
  settings,
  onSettingsChange,
}: {
  settings: Settings
  onSettingsChange: (s: Settings) => void
}) {
  const [tab, setTab] = useState<Tab>('today')
  const bodyRef = useRef<HTMLElement>(null)

  const chooseTab = (next: Tab) => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    setTab(next)
  }

  return (
    <div className="grownups">
      <aside className="gu-sidebar">
        <div className="gu-sidebar-title">
          <span className="gu-sidebar-mark">
            <Icon name="grownups" size={25} />
          </span>
          <div>
            <strong>Caregiver tools</strong>
            <span>Start small. Go deeper when useful.</span>
          </div>
        </div>
        <nav className="gu-tabs" aria-label="Caregiver tools">
          {TAB_GROUPS.map((group) => (
            <div className="gu-tab-group" key={group.label}>
              <span className="gu-group-label">{group.label}</span>
              {group.tabs.map((t) => (
                <button
                  key={t.id}
                  className={`gu-tab${tab === t.id ? ' active' : ''}`}
                  onClick={() => chooseTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                >
                  <span className="gu-tab-icon">
                    <Icon name={t.icon} size={21} />
                  </span>
                  <span className="gu-tab-copy">
                    <strong>{t.label}</strong>
                    <small>{t.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="privacy-note">
          <Icon name="lock" size={17} />
          <span>
            <strong>Private by design</strong>
            Everything stays on this device.
          </span>
        </div>
      </aside>
      <main className="gu-body" ref={bodyRef}>
        <div className="gu-content">
          {tab === 'today' && <CaregiverHome settings={settings} onNavigate={chooseTab} />}
          {tab === 'guide' && <Guide />}
          {tab === 'progress' && (
            <StageTracker settings={settings} onSettingsChange={onSettingsChange} />
          )}
          {tab === 'phrases' && <PhraseManager settings={settings} />}
          {tab === 'songs' && <SongManager settings={settings} />}
          {tab === 'books' && <BookManager settings={settings} />}
          {tab === 'scenes' && <SceneManager settings={settings} />}
          {tab === 'journal' && <Journal />}
          {tab === 'settings' && (
            <SettingsPanel settings={settings} onChange={onSettingsChange} />
          )}
        </div>
      </main>
    </div>
  )
}
