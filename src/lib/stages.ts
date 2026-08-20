import { logEvent, recentEvents } from './db'
import type { Phrase, UsageEvent } from './types'

/** Where the CHILD is in Natural Language Acquisition.
 *  Distinct from `Phrase.stage`, which describes what a button contains. */
export type ChildStage = 1 | 2 | 3 | 4 | 5 | 6

export interface MilestoneKind {
  id: string
  /** the stage this observation is evidence FOR */
  signals: ChildStage
  label: string
  example: string
  /** why it matters, shown when logging */
  meaning: string
}

/** Observations only a person can make — the app never infers these from taps. */
export const MILESTONES: MilestoneKind[] = [
  {
    id: 'new-context',
    signals: 1,
    label: 'Used a script somewhere new',
    example: '"Let\'s go!" at the library, not just at the front door',
    meaning: 'The script is becoming flexible — it belongs to them now, not just to one moment.',
  },
  {
    id: 'new-gestalt',
    signals: 1,
    label: 'Picked up a brand-new script',
    example: 'Started saying "That\'s so silly!" this week',
    meaning: 'Collecting more gestalts is exactly the work of stage 1.',
  },
  {
    id: 'combined-chunks',
    signals: 2,
    label: 'Joined two chunks in a new way',
    example: '"Let\'s get" + "a hug" — a combination nobody modeled',
    meaning: 'The big one. Chunks are being taken apart and recombined: this is mitigation, stage 2.',
  },
  {
    id: 'trimmed-gestalt',
    signals: 2,
    label: 'Said a shorter piece of a long script',
    example: '"Want some more?" became "Want more"',
    meaning: 'Trimming a gestalt means its edges are becoming visible to them.',
  },
  {
    id: 'swapped-word',
    signals: 2,
    label: 'Swapped a word inside a familiar script',
    example: '"Time for bed" became "Time for snack"',
    meaning: 'A slot inside the chunk has become a variable — real analysis.',
  },
  {
    id: 'single-word',
    signals: 3,
    label: 'Used a single word on its own',
    example: 'Just "milk" — pointing, meaning it',
    meaning: 'Utterances get SHORTER here. That looks like regression and is actually a breakthrough.',
  },
  {
    id: 'two-word',
    signals: 3,
    label: 'Made an original two-word combo',
    example: '"more milk", "big truck", "Daddy shoe"',
    meaning: 'Two words with no grammar between them — self-generated, not borrowed.',
  },
  {
    id: 'original-sentence',
    signals: 4,
    label: 'Built an original sentence (errors and all)',
    example: '"I goed outside", "Me want that one"',
    meaning: 'Grammar mistakes here are the point: an original grammar engine is switching on.',
  },
  {
    id: 'pronoun-shift',
    signals: 4,
    label: 'Started sorting out pronouns',
    example: 'Said "I want" instead of the borrowed "you want"',
    meaning: 'Pronouns untangle on their own once sentences are self-built — never by correction.',
  },
  {
    id: 'conjunction',
    signals: 5,
    label: 'Linked ideas with because / but / so',
    example: '"I want it because it\'s mine"',
    meaning: 'Complex grammar is coming online.',
  },
  {
    id: 'original-question',
    signals: 5,
    label: 'Asked an original question',
    example: '"Why can\'t I have that?" — not a memorized question',
    meaning: 'Questions built from scratch, rather than stored whole.',
  },
]

export const MILESTONES_BY_ID = new Map(MILESTONES.map((m) => [m.id, m]))

export interface StageGuidance {
  stage: ChildStage
  name: string
  whatsHappening: string
  modelThis: string[]
  avoidThis: string[]
  celebrate: string
  /** what would show the child is moving on */
  watchFor: string
  /** how the app itself should be used at this stage */
  appFocus: string
}

export const STAGE_GUIDANCE: Record<ChildStage, StageGuidance> = {
  1: {
    stage: 1,
    name: 'Whole scripts',
    whatsHappening:
      'Whole phrases are stored as single units, melody and all. A long script like "Daddy, would you like milk?" is functionally one word. Echolalia here is communication, not noise.',
    modelThis: [
      'Short, easily mixable frames: "Let\'s ___", "I\'m ___", "It\'s time for ___", "More ___"',
      'Rich, musical intonation — the melody is what gets stored',
      'The child\'s perspective ("I want milk!") or a joint one ("Let\'s get milk!"), never "you"',
      'Comments as often as requests: "Look at that!", "Uh oh!", "Wow!"',
    ],
    avoidThis: [
      'Quizzing ("What color is this?") and "say it like this"',
      'Forcing single words — those come later, on their own',
      'Correcting pronouns; the pronoun is sealed inside the chunk',
      'Trying to stop the scripting',
    ],
    celebrate: 'Any script used to communicate at all, and any script showing up somewhere new.',
    watchFor:
      'Two chunks joined in a way you never modeled, a long script coming out shortened, or a word swapped inside a familiar one. That is stage 2 beginning.',
    appFocus:
      "Let's Talk is the main screen. Press a phrase and say it together during real moments. Record your own voice for the phrases used most.",
  },
  2: {
    stage: 2,
    name: 'Mix & match (mitigation)',
    whatsHappening:
      'Scripts are being broken into parts and recombined. Combinations may sound odd — that is analysis happening out loud, not a mistake.',
    modelThis: [
      'The same frames with varied endings: "Let\'s get milk" → "Let\'s get a book" → "Let\'s get outside"',
      'Break-it-apart on the board (long-press) so the pieces are visible',
      'Two-part combinations at real moments, playfully and often',
    ],
    avoidThis: [
      'Correcting the grammar of a new combination — it will smooth out',
      'Removing or hiding the old whole scripts; they stay as a safety net',
      'Turning Mix & Match into a lesson. It is a toy.',
    ],
    celebrate: 'Every novel combination, especially the odd-sounding ones.',
    watchFor:
      'A single word standing completely alone, or an original two-word combo like "more milk". That is stage 3 — and utterances getting SHORTER is the signal, not a setback.',
    appFocus:
      'Mix & Match becomes the star. Use long-press on Let\'s Talk to show how a familiar phrase comes apart.',
  },
  3: {
    stage: 3,
    name: 'Single words',
    whatsHappening:
      'Words are being isolated and used referentially, plus original two-word combos. Average utterance length often drops here. In this framework that drop is the breakthrough — a child assembling language rather than retrieving it.',
    modelThis: [
      'Single words and two-word combos: "milk", "more milk", "big truck"',
      'Naming what they point at, without asking them to repeat',
      'Keep every old gestalt available — under stress they are still the reliable route',
    ],
    avoidThis: [
      'Worrying that shorter means worse. It does not, at this stage.',
      'Drilling vocabulary or asking "what\'s this?"',
      'Deleting old phrases from the board',
    ],
    celebrate: 'Words arriving alone. Point out what they mean, warmly, and move on.',
    watchFor:
      'A self-built sentence with charming errors — "I goed outside", "Me do it". That is stage 4.',
    appFocus:
      'Use the Mix & Match endings as single words on their own, and star single-word targets in This Week\'s Words.',
  },
  4: {
    stage: 4,
    name: 'Original sentences',
    whatsHappening:
      'Self-generated 2–3 word sentences with developmental errors. The errors are proof the sentences are original rather than borrowed. Expect more stumbling and restarting too — also normal.',
    modelThis: [
      'Gentle expansion instead of correction: they say "I goed outside", you say "You went outside! We went so fast!"',
      'Longer sentences than theirs by about one step',
      'Plenty of wait time; new grammar is effortful',
    ],
    avoidThis: [
      'Explicit correction ("say WENT"). Expansion does the job without the cost.',
      'Rushing or finishing their sentences',
    ],
    celebrate: 'Grammar errors, out loud, quietly to yourself. They are milestones.',
    watchFor: 'because / but / so, and original questions. That is stage 5.',
    appFocus:
      'The board matters less now; conversation in daily life matters more. Keep the app for the phrases still doing work.',
  },
  5: {
    stage: 5,
    name: 'Complex grammar',
    whatsHappening:
      'Sentences link together with conjunctions, questions get built from scratch, and stories start to appear.',
    modelThis: [
      'Rich, varied language — you no longer need to keep it short',
      'Genuine back-and-forth conversation, following their topic',
      'Storytelling about shared events',
    ],
    avoidThis: ['Reverting to simplified speech out of habit'],
    celebrate: 'Original questions — a long way from a stored question gestalt.',
    watchFor: 'Flexible, abstract, hypothetical language across contexts. That is stage 6.',
    appFocus:
      'The app is now a support for specific situations rather than a daily driver. Old scripts stay available.',
  },
  6: {
    stage: 6,
    name: 'Full flexible language',
    whatsHappening:
      'Original, flexible language across contexts, comparable to peers who took the analytic route.',
    modelThis: ['Ordinary conversation', 'Following their lead into their interests'],
    avoidThis: ['Treating earlier scripts as something to be embarrassed about'],
    celebrate: 'The whole arc. Keep the Journal — it is a record of how this happened.',
    watchFor: 'Nothing in particular. Enjoy the conversations.',
    appFocus:
      'Keep the app around for regulation and for scripts that still comfort. There is no need to retire it.',
  },
}

export interface LoggedMilestone {
  id: string
  kind: MilestoneKind | undefined
  note: string
  at: number
}

const SEP = '␟' // unit separator, avoids clashing with note text

export async function logMilestone(kindId: string, note: string) {
  await logEvent('milestone', `${kindId}${SEP}${note}`)
}

export async function listMilestones(limit = 400): Promise<LoggedMilestone[]> {
  const events = await recentEvents(limit)
  return events
    .filter((e) => e.kind === 'milestone')
    .map((e) => {
      const [id, ...rest] = e.detail.split(SEP)
      return { id, kind: MILESTONES_BY_ID.get(id), note: rest.join(SEP), at: e.at }
    })
}

export interface StageSuggestion {
  /** the stage the evidence points to */
  suggested: ChildStage
  /** true when the evidence is strong enough to raise the question */
  readyToAdvance: boolean
  reason: string
  /** distinct milestone kinds logged for the next stage up */
  distinctSignals: number
  needed: number
}

/** How many DISTINCT kinds of evidence before we suggest moving up.
 *  Deliberately conservative: a single lucky observation should not
 *  restage a child, and the parent always makes the call. */
const REQUIRED_DISTINCT = 2

export function suggestStage(
  milestones: LoggedMilestone[],
  current: ChildStage,
): StageSuggestion {
  const next = Math.min(6, current + 1) as ChildStage
  const forNext = new Set(
    milestones.filter((m) => m.kind?.signals === next).map((m) => m.id),
  )
  const distinct = forNext.size
  const ready = current < 6 && distinct >= REQUIRED_DISTINCT

  if (ready) {
    return {
      suggested: next,
      readyToAdvance: true,
      distinctSignals: distinct,
      needed: REQUIRED_DISTINCT,
      reason: `${distinct} different kinds of stage-${next} evidence have been logged. That is usually the point where the guidance here should change.`,
    }
  }
  if (current === 6) {
    return {
      suggested: 6,
      readyToAdvance: false,
      distinctSignals: distinct,
      needed: REQUIRED_DISTINCT,
      reason: 'This is the last stage in the framework.',
    }
  }
  return {
    suggested: current,
    readyToAdvance: false,
    distinctSignals: distinct,
    needed: REQUIRED_DISTINCT,
    reason:
      distinct === 0
        ? `Nothing pointing to stage ${next} yet. Keep modeling — and log what you notice.`
        : `One kind of stage-${next} evidence so far. One more different kind and it is worth revisiting.`,
  }
}

/** Milestones grouped for the logging UI: the current stage's own wins first,
 *  then the signals that would mean moving on. */
export function milestonesFor(stage: ChildStage): {
  thisStage: MilestoneKind[]
  nextStage: MilestoneKind[]
} {
  return {
    thisStage: MILESTONES.filter((m) => m.signals === stage),
    nextStage: MILESTONES.filter((m) => m.signals === stage + 1),
  }
}

// ---------------------------------------------------------------------------
// Turning the stage into concrete next actions, using the family's own board
// ---------------------------------------------------------------------------

/** Frames that recombine easily — the phrases worth modeling at stages 1-2. */
const MITIGABLE_FRAMES = [
  "let's ",
  "i'm ",
  'i want ',
  'i need ',
  'more ',
  "it's time for ",
  'we need ',
  'i see ',
  'i hear ',
]

export interface PracticeSuggestion {
  id: string
  title: string
  why: string
  /** concrete candidates drawn from this family's own board */
  phrases: Phrase[]
  /** what the caregiver should do with them */
  action: string
}

const boardPhrases = (phrases: Phrase[]) =>
  phrases.filter(
    (p) =>
      p.stage === 1 &&
      !p.hidden &&
      !p.partType &&
      !p.categoryId.startsWith('song:') &&
      !p.categoryId.startsWith('scene:'),
  )

/** Does this phrase come apart against a beginning the child already knows? */
export function splitsAgainst(phrase: Phrase, starters: Phrase[]): Phrase | null {
  for (const s of [...starters].sort((a, b) => b.text.length - a.text.length)) {
    if (phrase.text.toLowerCase().startsWith(`${s.text.toLowerCase()} `)) return s
  }
  return null
}

/** Stage-specific, board-specific "do this next" — never generic advice alone. */
export function practiceSuggestions(
  stage: ChildStage,
  phrases: Phrase[],
  starters: Phrase[],
  events: UsageEvent[] = [],
): PracticeSuggestion[] {
  const board = boardPhrases(phrases)
  const unstarred = board.filter((p) => !p.focus)
  const out: PracticeSuggestion[] = []

  // real tap counts, so "used most" actually means used most
  const taps = new Map<string, number>()
  for (const e of events) {
    if (['phrase-tap', 'quick-talk', 'scene-tap'].includes(e.kind)) {
      taps.set(e.detail, (taps.get(e.detail) ?? 0) + 1)
    }
  }
  const byUse = (a: Phrase, b: Phrase) => (taps.get(b.text) ?? 0) - (taps.get(a.text) ?? 0)

  if (stage === 1) {
    const mitigable = unstarred.filter((p) =>
      MITIGABLE_FRAMES.some((f) => p.text.toLowerCase().startsWith(f)),
    )
    if (mitigable.length > 0) {
      out.push({
        id: 'star-mitigable',
        title: 'Star three phrases that come apart later',
        why: 'These are built from frames that recombine in stage 2, so modeling them now pays off twice.',
        phrases: mitigable.slice(0, 3),
        action: 'Star these in Phrases, then model them at the real moments they belong to.',
      })
    }
    const comments = board.filter((p) => p.categoryId === 'chat').slice(0, 3)
    if (comments.length > 0) {
      out.push({
        id: 'model-comments',
        title: 'Model comments, not just requests',
        why: 'Requests get needs met; comments are what conversation is actually made of.',
        phrases: comments,
        action: 'Use one of these out loud today when something surprising happens.',
      })
    }
    const noVoice = board.filter((p) => !p.recordingId).sort(byUse)
    const used = noVoice.filter((p) => (taps.get(p.text) ?? 0) > 0)
    if (noVoice.length > 0) {
      out.push({
        id: 'record-voices',
        title: used.length
          ? 'Record your voice on the phrases used most'
          : 'Record your voice on a few starting phrases',
        why: used.length
          ? 'Gestalt learners store the melody. These are the ones actually being tapped, so they earn a real voice first.'
          : 'Gestalt learners store the melody. A real voice teaches in a way the device voice cannot.',
        phrases: (used.length ? used : noVoice).slice(0, 3),
        action: 'Open Phrases, tap Edit, then Record. Ten seconds each.',
      })
    }
  }

  if (stage === 2) {
    const splittable = board
      .filter((p) => splitsAgainst(p, starters))
      .slice(0, 4)
    if (splittable.length > 0) {
      out.push({
        id: 'split-these',
        title: 'Break these apart together',
        why: 'Long-press each one on the talk board to show that a big word is made of moveable pieces.',
        phrases: splittable,
        action: 'Long-press on the board, tap each piece, be casual about it.',
      })
    }
    out.push({
      id: 'vary-endings',
      title: 'Take one beginning and change the ending all day',
      why: 'Hearing the same frame with different endings is exactly what makes the frame come loose.',
      phrases: starters.slice(0, 3),
      action: 'Pick one beginning in Mix & Match and use it with three different endings today.',
    })
  }

  if (stage === 3) {
    const words = phrases
      .filter((p) => p.partType === 'ender' && !p.hidden)
      .slice(0, 6)
    if (words.length > 0) {
      out.push({
        id: 'single-words',
        title: 'Model single words on their own',
        why: 'At this stage shorter is the breakthrough. These now appear as their own Words board.',
        phrases: words,
        action: 'Name what they point at, one word, no request to repeat.',
      })
    }
    const oldGestalts = board.filter((p) => p.focus).slice(0, 3)
    out.push({
      id: 'keep-gestalts',
      title: 'Keep the old scripts available',
      why: 'Under stress or illness the whole gestalts are still the reliable route. Hide nothing.',
      phrases: oldGestalts,
      action: 'No action needed — just resist tidying the board.',
    })
  }

  if (stage >= 4) {
    out.push({
      id: 'expand',
      title: 'Expand instead of correcting',
      why: 'They say "I goed outside"; you say "You went outside! We went so fast!" The correction lands without the cost.',
      phrases: [],
      action: 'Add about one step of length to whatever they just said.',
    })
  }

  return out
}

// ---------------------------------------------------------------------------
// What the app itself observed — offered as prompts, never as proof
// ---------------------------------------------------------------------------

export interface UsageHint {
  id: string
  headline: string
  detail: string
  /** the milestone this would be evidence for, if it also happened in speech */
  suggestMilestone?: string
}

const DAY = 24 * 60 * 60 * 1000

/** Honest framing: these are TAPS in the app, which are not speech. They are a
 *  prompt to go notice something, not a measurement of the child's language. */
export function usageHints(events: UsageEvent[], days = 14): UsageHint[] {
  const since = Date.now() - days * DAY
  const recent = events.filter((e) => e.at >= since)
  const hints: UsageHint[] = []

  const combos = new Set(recent.filter((e) => e.kind === 'mix-play').map((e) => e.detail))
  if (combos.size > 0) {
    hints.push({
      id: 'combos',
      headline: `${combos.size} different sentence${combos.size === 1 ? '' : 's'} built in Mix & Match`,
      detail: `Most recent: "${[...combos].slice(-1)[0]}". If a combination like this turned up in real speech, that is the stage-2 milestone.`,
      suggestMilestone: 'combined-chunks',
    })
  }

  const splits = recent.filter((e) => e.kind === 'split-open').length
  if (splits > 0) {
    hints.push({
      id: 'splits',
      headline: `Phrases broken apart ${splits} time${splits === 1 ? '' : 's'}`,
      detail: 'Long-press is being used. Watch for a shortened version of a long script showing up in speech.',
      suggestMilestone: 'trimmed-gestalt',
    })
  }

  const words = new Set(recent.filter((e) => e.kind === 'mix-part').map((e) => e.detail))
  if (words.size >= 3) {
    hints.push({
      id: 'single-parts',
      headline: `${words.size} individual words played on their own`,
      detail: 'Single pieces are being explored in the app. A single word used alone in real life is the stage-3 milestone.',
      suggestMilestone: 'single-word',
    })
  }

  const spoken = new Set(
    recent
      .filter((e) => ['phrase-tap', 'quick-talk', 'scene-tap'].includes(e.kind))
      .map((e) => e.detail),
  )
  if (spoken.size > 0) {
    hints.push({
      id: 'breadth',
      headline: `${spoken.size} different message${spoken.size === 1 ? '' : 's'} used`,
      detail: 'Breadth of use, not a score. A familiar phrase turning up in a brand-new place is worth logging.',
      suggestMilestone: 'new-context',
    })
  }

  return hints
}

// ---------------------------------------------------------------------------
// A summary a caregiver can hand to an SLP
// ---------------------------------------------------------------------------

export function buildSummary(opts: {
  childName: string
  stage: ChildStage
  milestones: LoggedMilestone[]
  notes: { at: number; detail: string }[]
  focusPhrases: Phrase[]
  hints: UsageHint[]
}): string {
  const { childName, stage, milestones, notes, focusPhrases, hints } = opts
  const g = STAGE_GUIDANCE[stage]
  const date = (at: number) => new Date(at).toLocaleDateString()
  const name = childName.trim() || 'This communicator'
  const lines: string[] = []

  lines.push(`EchoBloom summary — ${name}`)
  lines.push(`Prepared ${new Date().toLocaleDateString()}`)
  lines.push('')
  lines.push(`CURRENT STAGE (caregiver-set): ${stage} — ${g.name}`)
  lines.push(g.whatsHappening)
  lines.push('')

  lines.push('OBSERVED MILESTONES')
  if (milestones.length === 0) {
    lines.push('  (none logged yet)')
  } else {
    for (const m of [...milestones].reverse()) {
      lines.push(
        `  ${date(m.at)} — ${m.kind?.label ?? m.id}${m.kind ? ` [signals stage ${m.kind.signals}]` : ''}`,
      )
      if (m.note) lines.push(`      "${m.note}"`)
    }
  }
  lines.push('')

  lines.push('PHRASES BEING MODELED NOW')
  if (focusPhrases.length === 0) lines.push('  (none starred)')
  else for (const p of focusPhrases) lines.push(`  - ${p.text}`)
  lines.push('')

  if (notes.length > 0) {
    lines.push('CAREGIVER NOTES')
    for (const n of notes.slice(0, 20)) lines.push(`  ${date(n.at)} — ${n.detail}`)
    lines.push('')
  }

  if (hints.length > 0) {
    lines.push('APP USE IN THE LAST 2 WEEKS (taps in the app, not speech samples)')
    for (const h of hints) lines.push(`  - ${h.headline}`)
    lines.push('')
  }

  lines.push('WHAT WE ARE DOING AT THIS STAGE')
  for (const line of g.modelThis) lines.push(`  + ${line}`)
  for (const line of g.avoidThis) lines.push(`  - avoiding: ${line}`)
  lines.push('')
  lines.push(`WATCHING FOR: ${g.watchFor}`)
  lines.push('')
  lines.push(
    'Note: stages follow the Natural Language Acquisition framework (Blanc), which is',
  )
  lines.push(
    'widely used clinically but does not yet have controlled effectiveness research.',
  )
  lines.push('The stage above was set by a caregiver, not measured by the app.')

  return lines.join('\n')
}
