import { useEffect, useState } from 'react'
import App from './App'
import Icon from './components/Icon'
import {
  seedContentPacks,
  seedConversationIfMissing,
  seedIfEmpty,
  seedSongsIfEmpty,
} from './lib/seed'

const bootPromise = seedIfEmpty()
  .then(() => seedSongsIfEmpty())
  .then(() => seedConversationIfMissing())
  .then(() => seedContentPacks())

export default function Bootstrap() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let mounted = true
    void bootPromise.then(
      () => mounted && setState('ready'),
      (error: unknown) => {
        console.error('EchoBloom could not start', error)
        if (mounted) setState('error')
      },
    )
    return () => {
      mounted = false
    }
  }, [])

  if (state === 'loading') {
    return (
      <div className="boot-screen" role="status" aria-live="polite">
        <span className="boot-logo">
          <Icon name="sprout" size={42} />
        </span>
        <div>
          <strong>EchoBloom</strong>
          <p>Getting your words ready…</p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="boot-screen boot-error" role="alert">
        <span className="boot-logo">
          <Icon name="sprout" size={42} />
        </span>
        <div>
          <strong>EchoBloom needs a fresh start</strong>
          <p>Your saved words are still safe. Close other EchoBloom tabs, then try again.</p>
          <button className="btn" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  return <App />
}
