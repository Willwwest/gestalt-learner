import { useEffect, useRef, useState } from 'react'
import { listSymbols, requestPersistence } from '../lib/db'
import { exportBackup, importBackup } from '../lib/backup'
import { speak } from '../lib/tts'
import { LANGUAGES, type LanguageCode, type Settings } from '../lib/types'
import { nativeHapticsAvailable } from '../lib/haptics'
import { ARASAAC_ATTRIBUTION } from '../lib/symbols'

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

  const onImport = async (file: File) => {
    if (
      !window.confirm(
        'Importing replaces everything in the app (phrases, recordings, notes) with the backup. Continue?',
      )
    ) {
      return
    }
    try {
      const restored = await importBackup(file)
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
        <button className="btn secondary" onClick={() => fileRef.current?.click()}>
          ⬆ Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onImport(f)
            e.target.value = ''
          }}
        />
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{usage}</span>
      </div>
      {importMsg && <p>{importMsg}</p>}

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
