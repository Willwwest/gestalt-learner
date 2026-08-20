import { STAGE_GUIDANCE, type ChildStage } from '../lib/stages'
import type { Settings } from '../lib/types'
import Icon, { type IconName } from './Icon'

type Destination = 'progress' | 'phrases' | 'journal' | 'settings' | 'guide'

const TODAY_PLAN: Record<
  ChildStage,
  { moment: string; model: string; remember: string }
> = {
  1: {
    moment: 'Choose one familiar routine—snack, getting dressed, or play.',
    model: 'Say one short, musical phrase while it is happening: “Let’s get it!” or “That is so fun!”',
    remember: 'Do not ask for a repeat. Your warm model is enough.',
  },
  2: {
    moment: 'Take a familiar phrase and change just one piece during play.',
    model: 'Try “Let’s get milk,” then later “Let’s get a book.” Keep the same opening.',
    remember: 'New combinations can sound unusual. That is useful experimentation.',
  },
  3: {
    moment: 'Notice one thing your child is already looking at or reaching for.',
    model: 'Name it naturally with one or two words: “Big truck,” “more bubbles,” or “Daddy.”',
    remember: 'Name it; do not turn it into a “What is this?” quiz.',
  },
  4: {
    moment: 'Listen for one sentence your child builds on their own.',
    model: 'Reply with the same idea, expanded by one step: “I goed out” → “You went outside!”',
    remember: 'Respond to the idea instead of correcting the grammar.',
  },
  5: {
    moment: 'Follow one topic your child brings to you.',
    model: 'Add a real comment or question that keeps their topic going.',
    remember: 'Conversation matters more than practicing a particular form.',
  },
  6: {
    moment: 'Share an ordinary conversation around a real interest.',
    model: 'Listen, respond, wonder, and enjoy where the topic goes.',
    remember: 'Earlier scripts can still be useful or comforting. They do not need to disappear.',
  },
}

const ACTIONS: Array<{
  destination: Destination
  icon: IconName
  title: string
  detail: string
}> = [
  {
    destination: 'phrases',
    icon: 'record',
    title: 'Add or record words',
    detail: 'Shape the communication board.',
  },
  {
    destination: 'journal',
    icon: 'journal',
    title: 'Capture a moment',
    detail: 'Save something you noticed.',
  },
  {
    destination: 'settings',
    icon: 'settings',
    title: 'Adjust access',
    detail: 'Size, contrast, profiles, and backup.',
  },
]

export default function CaregiverHome({
  settings,
  onNavigate,
}: {
  settings: Settings
  onNavigate: (destination: Destination) => void
}) {
  const stage = settings.childStage
  const guidance = STAGE_GUIDANCE[stage]
  const plan = TODAY_PLAN[stage]
  const name = settings.childName.trim() || 'your communicator'

  return (
    <div className="care-home">
      <header className="care-home-head">
        <span className="care-eyebrow">A 30-second plan</span>
        <h2>One useful thing for today</h2>
        <p>
          You do not need to study the whole app. Try one idea in a real moment and
          come back when you need something else.
        </p>
      </header>

      <section className="today-plan" aria-labelledby="today-plan-heading">
        <div className="today-plan-topline">
          <span className="today-stage">Stage {stage}</span>
          <span>{guidance.name}</span>
        </div>
        <h3 id="today-plan-heading">Try this with {name}</h3>
        <div className="today-steps">
          <div>
            <span className="today-step-num">1</span>
            <p>{plan.moment}</p>
          </div>
          <div>
            <span className="today-step-num">2</span>
            <p>{plan.model}</p>
          </div>
        </div>
        <div className="today-reminder">
          <Icon name="sprout" size={20} />
          <span><strong>That is enough.</strong> {plan.remember}</span>
        </div>
        <button type="button" className="btn secondary" onClick={() => onNavigate('progress')}>
          See the full stage plan
        </button>
      </section>

      <section className="care-quick-answer" aria-labelledby="quick-answer-heading">
        <div className="care-section-heading">
          <div>
            <span className="care-eyebrow">In the moment</span>
            <h3 id="quick-answer-heading">Need a quick answer?</h3>
          </div>
          <button type="button" className="text-button" onClick={() => onNavigate('guide')}>
            Browse all help <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="quick-answer-list">
          <details>
            <summary>They repeated a phrase that does not fit</summary>
            <p>
              Treat it as meaningful first. Respond to the likely feeling or purpose,
              then offer a short phrase that fits—without asking them to copy you.
            </p>
          </details>
          <details>
            <summary>They used “you” when they meant “I”</summary>
            <p>
              Honor the message and do not correct the pronoun. Model naturally from
              their perspective later: “I want milk.”
            </p>
          </details>
          <details>
            <summary>They are not pressing any buttons</summary>
            <p>
              Use the board yourself during something enjoyable. No prompt, test, or
              hand-over-hand help is needed; seeing communication work is the lesson.
            </p>
          </details>
        </div>
      </section>

      <section className="care-actions" aria-labelledby="care-actions-heading">
        <div className="care-section-heading">
          <div>
            <span className="care-eyebrow">When you have a minute</span>
            <h3 id="care-actions-heading">Common tasks</h3>
          </div>
        </div>
        <div className="care-action-grid">
          {ACTIONS.map((action) => (
            <button
              type="button"
              className="care-action-card"
              key={action.destination}
              onClick={() => onNavigate(action.destination)}
            >
              <span className="care-action-icon"><Icon name={action.icon} size={22} /></span>
              <span>
                <strong>{action.title}</strong>
                <small>{action.detail}</small>
              </span>
              <Icon name="arrow" size={18} />
            </button>
          ))}
        </div>
      </section>

      <aside className="professional-route">
        <span><Icon name="grownups" size={21} /></span>
        <div>
          <strong>Preparing for an SLP or school conversation?</strong>
          <p>Progress can create a concise, private summary from what you have logged.</p>
        </div>
        <button type="button" className="btn secondary" onClick={() => onNavigate('progress')}>
          Open Progress
        </button>
      </aside>
    </div>
  )
}
