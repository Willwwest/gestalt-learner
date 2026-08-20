import { logEvent, recentEvents } from './db'

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
