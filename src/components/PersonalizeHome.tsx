import Icon, { type IconName } from './Icon'

type PersonalizeTool = 'phrases' | 'songs' | 'books' | 'scenes'

const TOOLS: Array<{
  id: PersonalizeTool
  icon: IconName
  title: string
  detail: string
  note: string
}> = [
  {
    id: 'phrases',
    icon: 'record',
    title: 'Words and recordings',
    detail: 'Choose what appears on the communication board.',
    note: 'Add, hide, reorder, star, or record a familiar voice.',
  },
  {
    id: 'songs',
    icon: 'songs',
    title: 'Songs',
    detail: 'Create familiar lines with an optional fill-in pause.',
    note: 'Useful for playful back-and-forth without pressure.',
  },
  {
    id: 'books',
    icon: 'book',
    title: 'Story Time',
    detail: 'Edit shared-reading pages and tappable refrains.',
    note: 'Keep repeated lines predictable and easy to join.',
  },
  {
    id: 'scenes',
    icon: 'photos',
    title: 'Photo scenes',
    detail: 'Turn familiar places and people into visual supports.',
    note: 'Use family photos to make language immediately relevant.',
  },
]

export default function PersonalizeHome({
  onNavigate,
}: {
  onNavigate: (tool: PersonalizeTool) => void
}) {
  return (
    <div className="personalize-home">
      <header className="care-home-head">
        <span className="care-eyebrow">Make it familiar</span>
        <h2>What would you like to change?</h2>
        <p>Choose one tool. Each area keeps its own editing controls out of the way until you need them.</p>
      </header>
      <div className="personalize-grid">
        {TOOLS.map((tool) => (
          <button type="button" key={tool.id} onClick={() => onNavigate(tool.id)}>
            <span className="personalize-icon"><Icon name={tool.icon} size={26} /></span>
            <span className="personalize-copy">
              <strong>{tool.title}</strong>
              <span>{tool.detail}</span>
              <small>{tool.note}</small>
            </span>
            <Icon name="arrow" size={20} />
          </button>
        ))}
      </div>
      <aside className="gentle-note">
        <Icon name="sprout" size={20} />
        <p><strong>You do not need to customize everything.</strong> Start with the words, people, or routines that matter most this week.</p>
      </aside>
    </div>
  )
}
