import { useRef, useState } from 'react'
import PhraseManager from './PhraseManager'
import SongManager from './SongManager'
import SceneManager from './SceneManager'
import Guide from './Guide'
import StageTracker from './StageTracker'
import Journal from './Journal'
import SettingsPanel from './SettingsPanel'
import Icon, { type IconName } from './Icon'
import type { Settings } from '../lib/types'

type Tab = 'guide' | 'progress' | 'phrases' | 'songs' | 'scenes' | 'journal' | 'settings'

const TABS: { id: Tab; label: string; detail: string; icon: IconName }[] = [
  { id: 'guide', label: 'Guide', detail: 'Learn the approach', icon: 'book' },
  { id: 'progress', label: 'Progress', detail: 'Stage & next steps', icon: 'sprout' },
  {
    id: 'phrases',
    label: 'Phrases',
    detail: 'Words & recordings',
    icon: 'record',
  },
  { id: 'songs', label: 'Songs', detail: 'Lines & pauses', icon: 'songs' },
  { id: 'scenes', label: 'Photo scenes', detail: 'Familiar places', icon: 'photos' },
  { id: 'journal', label: 'Journal', detail: 'Notice progress', icon: 'journal' },
  { id: 'settings', label: 'Settings', detail: 'Device & backup', icon: 'settings' },
]

export default function GrownUps({
  settings,
  onSettingsChange,
}: {
  settings: Settings
  onSettingsChange: (s: Settings) => void
}) {
  const [tab, setTab] = useState<Tab>('guide')
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
            <strong>Caregiver studio</strong>
            <span>Shape the experience</span>
          </div>
        </div>
        <nav className="gu-tabs" aria-label="Caregiver tools">
          {TABS.map((t) => (
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
          {tab === 'guide' && <Guide />}
          {tab === 'progress' && (
            <StageTracker settings={settings} onSettingsChange={onSettingsChange} />
          )}
          {tab === 'phrases' && <PhraseManager settings={settings} />}
          {tab === 'songs' && <SongManager settings={settings} />}
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
