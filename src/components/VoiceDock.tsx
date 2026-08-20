import { useEffect, useState } from 'react'
import { clearMessages, recentMessages } from '../lib/db'
import { playMessage } from '../lib/audio'
import { selectionFeedback } from '../lib/haptics'
import type { Settings, SpokenMessage } from '../lib/types'
import Icon from './Icon'

const SOURCE_LABELS: Record<SpokenMessage['source'], string> = {
  board: 'Talk board',
  quick: 'Quick Talk',
  mix: 'Mix & Match',
  song: 'Song',
  scene: 'Photo Time',
}

function shortTime(at: number) {
  return new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function VoiceDock({ settings }: { settings: Settings }) {
  const [session, setSession] = useState<SpokenMessage[]>([])
  const [history, setHistory] = useState<SpokenMessage[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onMessage = (event: Event) => {
      const message = (event as CustomEvent<SpokenMessage>).detail
      setSession((current) => [...current.slice(-3), message])
      setHistory((current) => [message, ...current.filter((item) => item.id !== message.id)].slice(0, 24))
    }
    window.addEventListener('echobloom:message', onMessage)
    return () => window.removeEventListener('echobloom:message', onMessage)
  }, [])

  const openHistory = async () => {
    const next = !open
    setOpen(next)
    if (next) setHistory(await recentMessages(24))
  }

  const replay = async (message: SpokenMessage) => {
    void selectionFeedback(settings.hapticsEnabled)
    await playMessage(message, settings.ttsRate)
  }

  const clearHistory = async () => {
    if (!window.confirm('Clear the private recent-message list on this profile?')) return
    await clearMessages()
    setHistory([])
    setSession([])
  }

  const latest = session.at(-1)

  return (
    <div className="voice-dock">
      <div className="voice-dock-main" aria-live="polite">
        <span className="voice-dock-mark">
          <Icon name="wave" size={21} />
        </span>
        <div className={`voice-dock-message${latest ? '' : ' idle'}`}>
          {latest ? (
            <>
              <span className="voice-dock-emoji">{latest.emoji}</span>
              <strong>{latest.text}</strong>
            </>
          ) : (
            <span>Chosen words will stay here for an easy replay.</span>
          )}
        </div>
        <button
          className="voice-dock-action"
          type="button"
          disabled={!latest}
          onClick={() => latest && void replay(latest)}
          aria-label="Say the last message again"
        >
          <Icon name="replay" size={21} />
          <span>Again</span>
        </button>
        <button
          className="voice-dock-action"
          type="button"
          disabled={session.length === 0}
          onClick={() => setSession((current) => current.slice(0, -1))}
          aria-label="Remove the last message from the display"
        >
          <Icon name="back" size={21} />
          <span>Undo</span>
        </button>
        <button
          className={`voice-dock-action${open ? ' active' : ''}`}
          type="button"
          onClick={() => void openHistory()}
          aria-expanded={open}
          aria-controls="recent-message-panel"
        >
          <Icon name="history" size={21} />
          <span>Recent</span>
        </button>
      </div>

      {open && (
        <div className="voice-history" id="recent-message-panel">
          <div className="voice-history-head">
            <div>
              <strong>Recent messages</strong>
              <span>Private to this device and communicator profile.</span>
            </div>
            {history.length > 0 && (
              <button type="button" className="text-button" onClick={() => void clearHistory()}>
                Clear history
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="voice-history-empty">No messages here yet.</p>
          ) : (
            <div className="voice-history-list">
              {history.map((message, index) => (
                <button
                  type="button"
                  className="voice-history-item dwell-target"
                  data-dwell="true"
                  key={message.id ?? `${message.at}-${index}`}
                  onClick={() => void replay(message)}
                >
                  <span className="voice-history-emoji">{message.emoji}</span>
                  <span className="voice-history-copy">
                    <strong>{message.text}</strong>
                    <small>
                      {SOURCE_LABELS[message.source]} · {shortTime(message.at)}
                    </small>
                  </span>
                  <Icon name="play" size={18} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
