import { useState } from 'react'
import {
  activateCommunicatorProfile,
  createCommunicatorProfile,
  deleteCommunicatorProfile,
  getActiveProfile,
  listCommunicatorProfiles,
  renameCommunicatorProfile,
} from '../lib/profiles'
import type { Settings } from '../lib/types'
import Icon from './Icon'

export default function ProfileManager({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (settings: Settings) => void
}) {
  const [profiles, setProfiles] = useState(listCommunicatorProfiles)
  const active = getActiveProfile()
  const [activeName, setActiveName] = useState(
    settings.childName.trim() || active.name,
  )
  const [newName, setNewName] = useState('')
  const [message, setMessage] = useState('')

  const saveName = () => {
    const name = activeName.trim()
    if (!name) return
    renameCommunicatorProfile(active.id, name)
    onChange({ ...settings, childName: name })
    setProfiles(listCommunicatorProfiles())
    setMessage('Profile name saved')
  }

  const create = () => {
    if (!newName.trim()) return
    try {
      const profile = createCommunicatorProfile(newName)
      activateCommunicatorProfile(profile.id)
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const switchTo = (id: string) => {
    try {
      activateCommunicatorProfile(id)
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const remove = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Remove ${name}'s profile and its local phrases, recordings, photos, and history? Export its backup first if it may be needed later.`,
      )
    ) return
    try {
      await deleteCommunicatorProfile(id)
      setProfiles(listCommunicatorProfiles())
      setMessage(`${name}'s local profile was removed`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <section className="profile-manager" aria-labelledby="profile-heading">
      <div className="settings-section-heading">
        <span><Icon name="profile" size={22} /></span>
        <div>
          <h3 id="profile-heading">Communicator profiles</h3>
          <p>Each profile has independent words, recordings, photos, history, and access settings.</p>
        </div>
      </div>

      <div className="active-profile-card">
        <span className="active-profile-avatar">{activeName.trim().slice(0, 1).toLocaleUpperCase() || 'E'}</span>
        <label>
          <span>Current communicator</span>
          <input
            type="text"
            value={activeName}
            onChange={(event) => setActiveName(event.target.value)}
          />
        </label>
        <button type="button" className="btn secondary" onClick={saveName} disabled={!activeName.trim()}>
          Save name
        </button>
      </div>

      {profiles.length > 1 && (
        <div className="profile-list">
          {profiles.map((profile) => (
            <div className={`profile-row${profile.id === active.id ? ' active' : ''}`} key={profile.id}>
              <span className="profile-dot">{profile.name.slice(0, 1).toLocaleUpperCase()}</span>
              <span className="profile-copy">
                <strong>{profile.id === active.id ? activeName || profile.name : profile.name}</strong>
                <small>{profile.id === active.id ? 'Open now' : 'Stored on this device'}</small>
              </span>
              {profile.id !== active.id && (
                <>
                  <button type="button" className="btn secondary" onClick={() => switchTo(profile.id)}>
                    Switch
                  </button>
                  {profile.id !== 'default' && (
                    <button type="button" className="icon-btn danger-icon" onClick={() => void remove(profile.id, profile.name)} aria-label={`Remove ${profile.name}'s profile`}>
                      ×
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="new-profile-row">
        <label>
          <span>Add another communicator</span>
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Name"
            onKeyDown={(event) => {
              if (event.key === 'Enter') create()
            }}
          />
        </label>
        <button type="button" className="btn" onClick={create} disabled={!newName.trim()}>
          Create profile
        </button>
      </div>
      <p className="settings-status" role="status" aria-live="polite">{message}</p>
    </section>
  )
}
