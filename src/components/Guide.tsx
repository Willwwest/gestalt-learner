import { useMemo, useState, type ReactNode } from 'react'
import Icon from './Icon'

interface HelpTopic {
  id: string
  title: string
  summary: string
  search: string
  content: ReactNode
}

const TOPICS: HelpTopic[] = [
  {
    id: 'script',
    title: 'My child repeated a phrase that did not seem to fit',
    summary: 'How to respond when a script is hard to understand.',
    search: 'echolalia repeated phrase script meaning television quote respond decode',
    content: (
      <>
        <p><strong>Honor it first.</strong> A smile, “yeah,” or responding to the likely feeling tells your child that communication worked.</p>
        <p>Then offer one short phrase that fits the moment. Say it warmly while the event is happening; do not ask for a repeat.</p>
        <p className="help-example"><span>Example</span> “Daddy, would you like milk?” may mean “I want milk.” Respond with the milk, then casually model “Let’s get milk!”</p>
      </>
    ),
  },
  {
    id: 'pronouns',
    title: 'The pronoun or grammar sounds wrong',
    summary: 'Respond to the message without turning it into a correction.',
    search: 'wrong pronoun you I grammar correct goed error sentence',
    content: (
      <>
        <p>Do not stop the interaction to correct “you,” “I,” or an unusual sentence. A pronoun can be stored inside a larger chunk, and later grammar errors can signal original language.</p>
        <p>Reply naturally with a useful model: “You want milk” → “I want milk!” or “I goed outside” → “You went outside!” No “say it again” is needed.</p>
      </>
    ),
  },
  {
    id: 'not-using-app',
    title: 'My child is not using the app',
    summary: 'The adult can model first; button pressing is not the goal.',
    search: 'not tapping pressing buttons refuses app aac model prompt hand over hand test',
    content: (
      <>
        <p>Use the board yourself during something your child already enjoys. Press one phrase, say it with the app, and let the moment continue.</p>
        <ul>
          <li>Do not quiz, require a tap, or withhold an item.</li>
          <li>Keep the device nearby and available without making it an assignment.</li>
          <li>A look, gesture, sound, script, or button press can all be a meaningful response.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'what-to-say',
    title: 'I do not know what to model',
    summary: 'Use short statements that fit what is happening right now.',
    search: 'what say model questions statements wait pause perspective phrases talk',
    content: (
      <ul>
        <li>Comment more than you question: “That is SO tall!” instead of “What did you build?”</li>
        <li>Use your child’s perspective (“I want…”) or a shared one (“Let’s…” or “We…”).</li>
        <li>Say less, then pause. The pause creates room for any kind of response.</li>
        <li>Follow interests—even letters, numbers, songs, or repeated scenes.</li>
      </ul>
    ),
  },
  {
    id: 'screen',
    title: 'Which part of the app should we use?',
    summary: 'Choose the activity that already matches the moment.',
    search: 'screen board talk mix match letters numbers songs story time books photos scenes use',
    content: (
      <div className="help-screen-list">
        <p><strong>Let’s Talk</strong><span>Model a useful phrase during everyday routines.</span></p>
        <p><strong>Mix & Match</strong><span>Play with pieces of familiar phrases when combinations are emerging.</span></p>
        <p><strong>Letters & Numbers</strong><span>Join an existing interest. Narrate and delight; do not quiz.</span></p>
        <p><strong>Songs & Story Time</strong><span>Pause before a familiar line and welcome any return.</span></p>
        <p><strong>Photo Scenes</strong><span>Talk about familiar people and places using family photos.</span></p>
      </div>
    ),
  },
  {
    id: 'progress',
    title: 'What does progress look like?',
    summary: 'Look for flexibility and new uses—not scores or perfect grammar.',
    search: 'progress milestone stage new context combinations single words original sentences grammar',
    content: (
      <>
        <ul>
          <li>A familiar script appears in a new situation.</li>
          <li>Parts of two phrases are combined in a new way.</li>
          <li>A single word comes out on its own.</li>
          <li>An original sentence appears, even with developmental grammar.</li>
        </ul>
        <p>Save observations in Progress or the Journal. These are patterns to discuss, not grades to improve.</p>
      </>
    ),
  },
  {
    id: 'recording',
    title: 'How should we record a phrase?',
    summary: 'A short, familiar voice is usually more inviting than a perfect take.',
    search: 'record audio voice microphone melody quiet room parent phrase tips',
    content: (
      <ul>
        <li>Record one short phrase at a time in a quiet place.</li>
        <li>Use a warm, natural, slightly musical voice.</li>
        <li>Let different important people record different phrases.</li>
        <li>Consistency matters more than studio-quality sound.</li>
      </ul>
    ),
  },
  {
    id: 'professional',
    title: 'What should I share with an SLP or teacher?',
    summary: 'Bring concrete examples and let the professional interpret them with you.',
    search: 'slp speech therapist teacher school appointment clinician evidence summary diagnosis',
    content: (
      <>
        <p>Use Progress to share the current working stage, dated observations, phrases being modeled, and a few real examples. The plain-text summary stays on this device until you choose to share it.</p>
        <p>The six-stage Natural Language Acquisition framework is widely used clinically, but controlled evidence for the framework remains limited. Treat the stage as shared language for observation—not a diagnosis or a replacement for an SLP.</p>
      </>
    ),
  },
]

export default function Guide() {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLocaleLowerCase()
  const topics = useMemo(
    () => TOPICS.filter((topic) => `${topic.title} ${topic.summary} ${topic.search}`.toLocaleLowerCase().includes(normalized)),
    [normalized],
  )

  return (
    <div className="help-library">
      <header className="help-head">
        <span className="care-eyebrow">Open only when you need it</span>
        <h2>Help for the moment you are in</h2>
        <p>Start with a situation below. The longer explanation stays out of the way until you choose it.</p>
      </header>

      <section className="guide-essentials" aria-labelledby="essentials-heading">
        <h3 id="essentials-heading">If you remember only three things</h3>
        <div>
          <article><span>1</span><strong>Respond</strong><p>Treat every attempt as meaningful.</p></article>
          <article><span>2</span><strong>Model</strong><p>Offer language without requiring imitation.</p></article>
          <article><span>3</span><strong>Pause</strong><p>Leave room for any kind of return.</p></article>
        </div>
      </section>

      <label className="help-search">
        <Icon name="search" size={20} />
        <span className="sr-only">Search caregiver help</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search: pronouns, scripts, recording…"
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear help search">×</button>}
      </label>

      <div className="help-results" aria-live="polite">
        {topics.length > 0 ? topics.map((topic) => (
          <details className="help-topic" key={topic.id} open={topics.length === 1}>
            <summary>
              <span><strong>{topic.title}</strong><small>{topic.summary}</small></span>
              <Icon name="down" size={19} />
            </summary>
            <div className="help-topic-body">{topic.content}</div>
          </details>
        )) : (
          <div className="help-empty">
            <span>🔎</span>
            <strong>No exact match</strong>
            <p>Try a shorter word, or clear the search to browse every topic.</p>
            <button type="button" className="btn secondary" onClick={() => setQuery('')}>Show all help</button>
          </div>
        )}
      </div>

      <details className="deep-dive">
        <summary>
          <span><strong>For curious families and professionals</strong><small>The approach and six stages in one overview</small></span>
          <Icon name="down" size={19} />
        </summary>
        <div>
          <p>Some children learn early language as whole, melodic chunks rather than one word at a time. Those chunks can later be shortened, recombined, and analyzed into words before original grammar grows.</p>
          <ol>
            <li><strong>Whole scripts:</strong> complete phrases function like single units.</li>
            <li><strong>Mix and match:</strong> pieces of familiar scripts recombine.</li>
            <li><strong>Single words:</strong> words separate and short combinations emerge.</li>
            <li><strong>Original sentences:</strong> new grammar appears, often with errors.</li>
            <li><strong>Complex grammar:</strong> original questions, connections, and stories grow.</li>
            <li><strong>Flexible language:</strong> language works freely across contexts.</li>
          </ol>
          <p>Across every stage, the safest foundation is responsive interaction: follow the child’s lead, acknowledge communication, model rich language without demands, and work with a qualified SLP when possible.</p>
        </div>
      </details>
    </div>
  )
}
