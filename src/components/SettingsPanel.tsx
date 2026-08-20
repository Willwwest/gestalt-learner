import { useEffect, useRef, useState } from 'react'
import { listSymbols, requestPersistence } from '../lib/db'
import {
  exportBackup,
  importBackup,
  inspectBackup,
  shareBackup,
  type BackupSummary,
} from '../lib/backup'
import { speak } from '../lib/tts'
import { LANGUAGES, type LanguageCode, type Settings } from '../lib/types'
import { nativeHapticsAvailable } from '../lib/haptics'
import { ARASAAC_ATTRIBUTION } from '../lib/symbols'
import ProfileManager from './ProfileManager'
import Icon from './Icon'

export default function SettingsPanel({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (s: Settings) => void
}) {
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [usage, setUsage] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [symbolCount, setSymbolCount] = useState(0)
  const [pendingImport, setPendingImport] = useState<File | null>(null)
  const [importSummary, setImportSummary] = useState<BackupSummary | null>(null)
  const [shareMsg, setShareMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted)
    void navigator.storage?.estimate?.().then((est) => {
      if (est.usage != null) {
        setUsage(`${(est.usage / 1024 / 1024).toFixed(1)} MB used`)
      }
    })
    void listSymbols().then((symbols) => setSymbolCount(symbols.length))
  }, [])

  const toggleLang = (code: LanguageCode, on: boolean) => {
    const next = on
      ? [...settings.languages, code]
      : settings.languages.filter((l) => l !== code)
    if (next.length === 0) return
    onChange({
      ...settings,
      languages: (Object.keys(LANGUAGES) as LanguageCode[]).filter((l) =>
        next.includes(l),
      ),
    })
  }

  const protect = async () => {
    setPersisted(await requestPersistence())
  }

  const previewImport = async (file: File) => {
    setImportMsg('Checking backup…')
    setPendingImport(null)
    setImportSummary(null)
    try {
      setImportSummary(await inspectBackup(file))
      setPendingImport(file)
      setImportMsg('')
    } catch (err) {
      setImportMsg(`Cannot use this file: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const restoreImport = async () => {
    if (!pendingImport || !importSummary) return
    if (!window.confirm(`Replace the current profile with the previewed backup for ${importSummary.childName}?`)) return
    try {
      const restored = await importBackup(pendingImport)
      if (restored) onChange(restored)
      setImportMsg('Backup restored ✓ — reloading…')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      setImportMsg(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Settings</h2>

      <ProfileManager settings={settings} onChange={onChange} />

      <section className="settings-section" aria-labelledby="access-heading">
        <div className="settings-section-heading">
          <span><Icon name="settings" size={22} /></span>
          <div>
            <h3 id="access-heading">Communication access</h3>
            <p>These controls change size and input support, never the learned order of words.</p>
          </div>
        </div>

        <div className="settings-grid">
          <div className="field">
            <label htmlFor="vocabulary-size">Phrase library</label>
            <select
              id="vocabulary-size"
              value={settings.vocabularySize}
              onChange={(event) => onChange({ ...settings, vocabularySize: event.target.value as Settings['vocabularySize'] })}
            >
              <option value="starter">Starter · first 6 per topic</option>
              <option value="growing">Growing · first 12 per topic</option>
              <option value="full">Full · show every phrase</option>
            </select>
            <small>Growing reveals phrases at the end; existing buttons do not move.</small>
          </div>
          <div className="field">
            <label htmlFor="target-size">Communication target size</label>
            <select
              id="target-size"
              value={settings.tileSize}
              onChange={(event) => onChange({ ...settings, tileSize: event.target.value as Settings['tileSize'] })}
            >
              <option value="standard">Comfortable</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra large</option>
            </select>
            <small>Applies to phrase, letter, song, and scene selection targets.</small>
          </div>
          <div className="field">
            <label htmlFor="dwell-time">Pointer dwell activation</label>
            <select
              id="dwell-time"
              value={settings.dwellMs}
              onChange={(event) => onChange({ ...settings, dwellMs: Number(event.target.value) as Settings['dwellMs'] })}
            >
              <option value={0}>Off</option>
              <option value={600}>Activate after 0.6 seconds</option>
              <option value={1000}>Activate after 1 second</option>
            </select>
            <small>For eye/head-mouse pointers. Touch and switch selection stay immediate.</small>
          </div>
        </div>

        <div className="settings-toggle-grid">
          <label className="settings-toggle-card">
            <span><strong>Quick Talk everywhere</strong><small>Urgent self-advocacy remains one tap away.</small></span>
            <input type="checkbox" checked={settings.quickBarEnabled} onChange={(event) => onChange({ ...settings, quickBarEnabled: event.target.checked })} />
          </label>
          <label className="settings-toggle-card">
            <span><strong>High contrast</strong><small>Stronger boundaries and selection rings.</small></span>
            <input type="checkbox" checked={settings.highContrast} onChange={(event) => onChange({ ...settings, highContrast: event.target.checked })} />
          </label>
          <label className="settings-toggle-card">
            <span><strong>Reduce motion</strong><small>Stops decorative transitions and smooth scrolling.</small></span>
            <input type="checkbox" checked={settings.reducedMotion} onChange={(event) => onChange({ ...settings, reducedMotion: event.target.checked })} />
          </label>
        </div>
        <button type="button" className="btn secondary" onClick={() => onChange({ ...settings, onboardingComplete: false })}>
          Run guided setup again
        </button>
      </section>

      <div className="field">
        <label>Languages shown in Letters & Numbers</label>
        <div className="row">
          {(Object.keys(LANGUAGES) as LanguageCode[]).map((code) => (
            <label key={code} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={settings.languages.includes(code)}
                onChange={(e) => toggleLang(code, e.target.checked)}
              />
              {LANGUAGES[code].label} ({LANGUAGES[code].native})
            </label>
          ))}
        </div>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          For Korean and Russian speech on the tablet: Android Settings → System →
          Text-to-speech → Google engine → install those voice packs (one-time, then
          they work offline).
        </span>
      </div>

      <div className="field">
        <label>
          Robot voice speed: {settings.ttsRate.toFixed(2)} (used only when there's no
          recording)
        </label>
        <div className="row">
          <input
            type="range"
            min={0.6}
            max={1.2}
            step={0.02}
            value={settings.ttsRate}
            onChange={(e) => onChange({ ...settings, ttsRate: Number(e.target.value) })}
            style={{ flex: 1 }}
          />
          <button
            className="btn secondary"
            onClick={() => void speak("Let's get milk!", 'en', settings.ttsRate)}
          >
            ▶ Test
          </button>
        </div>
      </div>

      <div className="settings-feature-card">
        <div>
          <strong>Gentle touch feedback</strong>
          <p>
            A light, consistent tap can confirm a selection in the native Android or
            iOS app. Browser and PWA installs stay silent.
          </p>
        </div>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={settings.hapticsEnabled}
            disabled={!nativeHapticsAvailable()}
            onChange={(event) =>
              onChange({ ...settings, hapticsEnabled: event.target.checked })
            }
          />
          <span>{nativeHapticsAvailable() ? 'Enabled' : 'Native build required'}</span>
        </label>
      </div>

      <h3>Visual supports</h3>
      <p>
        Phrase editors can search ARASAAC once and save the selected pictogram on this
        device. Submitting a search sends only that typed term to ARASAAC; recordings,
        notes, and phrase data stay local. Saved pictograms work offline and are included
        in EchoBloom backups.
        {symbolCount > 0 && ` ${symbolCount} pictogram${symbolCount === 1 ? ' is' : 's are'} cached now.`}
      </p>
      <div className="license-card">
        <strong>ARASAAC is licensed for non-commercial use.</strong>
        <span>{ARASAAC_ATTRIBUTION}</span>
        <a href="https://arasaac.org/terms-of-use" target="_blank" rel="noreferrer">
          Read the ARASAAC terms
        </a>
      </div>

      <h3>Keeping your recordings safe</h3>
      <p>
        Browsers can clear app data when a device runs out of space. Protect the data
        and export a backup now and then (especially after recording a batch of
        phrases).
      </p>
      <div className="row">
        <button className="btn" onClick={() => void protect()} disabled={persisted === true}>
          {persisted === true ? '✓ Storage protected' : 'Protect storage'}
        </button>
        <button className="btn secondary" onClick={() => void exportBackup(settings)}>
          ⬇ Export backup
        </button>
        <button
          className="btn secondary"
          onClick={() => {
            setShareMsg('Preparing private backup…')
            void shareBackup(settings)
              .then((result) => setShareMsg(result === 'shared' ? 'Backup shared' : 'Backup downloaded'))
              .catch((error: unknown) => setShareMsg(error instanceof Error && error.name === 'AbortError' ? '' : 'Could not share the backup'))
          }}
        >
          Share with care team
        </button>
        <button className="btn secondary" onClick={() => fileRef.current?.click()}>
          Preview import…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void previewImport(f)
            e.target.value = ''
          }}
        />
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{usage}</span>
      </div>
      {shareMsg && <p className="settings-status" role="status">{shareMsg}</p>}
      {importSummary && pendingImport && (
        <div className="backup-preview">
          <div className="backup-preview-head">
            <span><Icon name="check" size={21} /></span>
            <div>
              <strong>Valid EchoBloom backup</strong>
              <small>{new Date(importSummary.exportedAt).toLocaleString()}</small>
            </div>
          </div>
          <dl>
            <div><dt>Profile</dt><dd>{importSummary.childName}</dd></div>
            <div><dt>Phrases</dt><dd>{importSummary.phrases}</dd></div>
            <div><dt>Recordings</dt><dd>{importSummary.recordings}</dd></div>
            <div><dt>Songs</dt><dd>{importSummary.songs}</dd></div>
            <div><dt>Photo scenes</dt><dd>{importSummary.scenes}</dd></div>
          </dl>
          <p>Restoring is all-or-nothing and affects only the currently open communicator profile. Export the current profile first if it may be needed later.</p>
          <div className="row">
            <button className="btn danger" type="button" onClick={() => void restoreImport()}>Restore this backup</button>
            <button className="btn secondary" type="button" onClick={() => { setPendingImport(null); setImportSummary(null) }}>Cancel</button>
          </div>
        </div>
      )}
      {importMsg && <p role="status">{importMsg}</p>}

      <h3>Putting it on the tablet</h3>
      <ol>
        <li>Host the built app anywhere with HTTPS (GitHub Pages / Netlify — see README).</li>
        <li>Open that address in Chrome on the tablet → menu → <strong>Install app</strong>. It becomes a real home-screen app that works offline.</li>
        <li>Press "Protect storage" above, on the tablet, after installing.</li>
        <li>
          To keep little fingers in the app: Android Settings → Security →{' '}
          <strong>App pinning</strong> → on. Then open the app, tap Recents, tap the
          app's icon → Pin.
        </li>
      </ol>
    </div>
  )
}
