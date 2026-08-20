import { getDB, putCategory, putPhrase, putSong } from './db'
import type { Category, LanguageCode, Phrase, SlotKind, Stage } from './types'

// Built-in starter library.
// Every phrase follows the modeling rules for gestalt language processors:
//  - child's perspective ("I want milk!") or joint perspective ("Let's get milk!")
//  - never "you/your" (the child stores exactly what they hear)
//  - short, warm, and "easily mitigable" — built from frames like
//    "Let's ___", "I'm ___", "It's time for ___" that recombine in stage 2

const CATEGORIES: Omit<Category, 'order'>[] = [
  { id: 'snack', name: 'Snack & Drink', emoji: '🍎', color: '#ff6b6b', builtin: true },
  { id: 'play', name: 'Play', emoji: '🎈', color: '#ffc145', builtin: true },
  { id: 'feelings', name: 'Feelings', emoji: '💛', color: '#06d6a0', builtin: true },
  { id: 'help', name: 'Help', emoji: '🤝', color: '#4ea8de', builtin: true },
  { id: 'go', name: 'Go Places', emoji: '🚗', color: '#b388eb', builtin: true },
  { id: 'letters', name: 'Letters & Numbers', emoji: '🔤', color: '#f77fbe', builtin: true },
]

type SeedPhrase = [text: string, emoji: string]

const BOARD: Record<string, SeedPhrase[]> = {
  snack: [
    ["Let's get milk!", '🥛'],
    ["I'm hungry!", '😋'],
    ["I'm thirsty!", '💧'],
    ['More, please!', '➕'],
    ['I want a snack!', '🍎'],
    ['All done!', '✅'],
  ],
  play: [
    ["Let's play!", '🎈'],
    ["Let's do it again!", '🔁'],
    ['My turn!', '🙋'],
    ['This is fun!', '😄'],
    ["That's so silly!", '🤪'],
    ["Let's build!", '🧱'],
  ],
  feelings: [
    ["I'm happy!", '😊'],
    ["I'm sad.", '😢'],
    ["I'm tired.", '😴'],
    ['I need a break.', '🛋️'],
    ['I need a hug.', '🤗'],
    ["It's too loud!", '🙉'],
  ],
  help: [
    ['Help, please!', '🤝'],
    ['I need help!', '🆘'],
    ["I can't do it.", '😣'],
    ["Let's fix it!", '🔧'],
    ["Let's try again!", '💪'],
    ['Come with me!', '👉'],
  ],
  go: [
    ["Let's go outside!", '🌳'],
    ['Time to go!', '🚗'],
    ['I want to stay!', '🏠'],
    ["Let's go home!", '🏡'],
    ["Let's watch a show!", '📺'],
    ["Let's read a book!", '📖'],
  ],
  letters: [
    ["Let's sing the ABCs!", '🎵'],
    ["Let's count!", '🔢'],
    ['More letters!', '🔤'],
    ["Let's write letters!", '✏️'],
    ['I love letters!', '💙'],
    ["Let's count in Spanish!", '🌟'],
  ],
}

// Stage-2 mix & match parts. `accepts`/`slot` keep combinations grammatical:
// 'stuff' = mass/plural nouns that work bare ("More milk!"), 'thing' = count
// nouns carrying their article/possessive, 'person' = family members.
const STARTERS: [text: string, emoji: string, accepts: SlotKind[]][] = [
  ["Let's get", '👐', ['thing', 'stuff', 'person']],
  ['I want', '💭', ['thing', 'stuff', 'person']],
  ['More', '➕', ['stuff']],
  ['We need', '🧺', ['thing', 'stuff', 'person']],
  ["It's time for", '⏰', ['thing', 'stuff', 'activity']],
  ["I'm", '💛', ['feeling']],
  ["Let's go", '🚗', ['place']],
]

const ENDERS: [text: string, emoji: string, slot: SlotKind][] = [
  ['milk', '🥛', 'stuff'],
  ['water', '💧', 'stuff'],
  ['a snack', '🍎', 'thing'],
  ['letters', '🔤', 'stuff'],
  ['numbers', '🔢', 'stuff'],
  ['music', '🎵', 'stuff'],
  ['a hug', '🤗', 'thing'],
  ['a book', '📖', 'thing'],
  ['singing', '🎤', 'activity'],
  ['counting', '🧮', 'activity'],
  ['happy', '😊', 'feeling'],
  ['sad', '😢', 'feeling'],
  ['tired', '😴', 'feeling'],
  ['silly', '🤪', 'feeling'],
  ['excited', '🤩', 'feeling'],
  ['outside', '🌳', 'place'],
  ['home', '🏡', 'place'],
  ['to the park', '🎠', 'place'],
]

export async function seedIfEmpty(): Promise<boolean> {
  const db = await getDB()
  if ((await db.count('categories')) > 0) return false

  let order = 0
  for (const cat of CATEGORIES) {
    await putCategory({ ...cat, order: order++ })
  }

  const put = async (
    categoryId: string,
    text: string,
    emoji: string,
    stage: Stage,
    extra: Partial<Phrase>,
    ord: number,
  ) => {
    await putPhrase({
      id: `builtin-${categoryId}-${ord}-${stage}${extra.partType ?? ''}`,
      categoryId,
      text,
      emoji,
      lang: 'en',
      stage,
      order: ord,
      builtin: true,
      ...extra,
    })
  }

  for (const [categoryId, phrases] of Object.entries(BOARD)) {
    let i = 0
    for (const [text, emoji] of phrases) {
      await put(categoryId, text, emoji, 1, {}, i++)
    }
  }

  let i = 0
  for (const [text, emoji, accepts] of STARTERS) {
    await put('mix', text, emoji, 2, { partType: 'starter', accepts }, i++)
  }
  i = 0
  for (const [text, emoji, slot] of ENDERS) {
    await put('mix', text, emoji, 2, { partType: 'ender', slot }, i++)
  }
  return true
}

// Conversation-building categories, added later than v1: comments/greetings and
// questions HE owns. Conversation isn't requesting — it's commenting, greeting,
// protesting, and asking. Appended at the END of the rail so existing buttons
// never move. Idempotent: added only if the category ids are missing.
const CONVERSATION_CATEGORIES: {
  cat: Omit<Category, 'order'>
  order: number
  phrases: SeedPhrase[]
}[] = [
  {
    cat: { id: 'chat', name: 'Chatting', emoji: '🗨️', color: '#f4a261', builtin: true },
    order: 6,
    phrases: [
      ['Look at that!', '👀'],
      ['Wow!', '🤩'],
      ['Uh oh!', '😮'],
      ["That's funny!", '😆'],
      ['Hi!', '🙋'],
      ['Bye-bye!', '👋'],
      ['No, thank you.', '🙅'],
      ['Watch this!', '🎬'],
    ],
  },
  {
    cat: { id: 'ask', name: 'Asking', emoji: '❓', color: '#00b4d8', builtin: true },
    order: 7,
    phrases: [
      ["What's that?", '❓'],
      ['Where did it go?', '🔍'],
      ["What's next?", '➡️'],
      ["Who's that?", '🧐'],
      ['Can I see?', '🙈'],
      ['Can I have a turn?', '✋'],
    ],
  },
]

export async function seedConversationIfMissing(): Promise<boolean> {
  const db = await getDB()
  let added = false
  for (const { cat, order, phrases } of CONVERSATION_CATEGORIES) {
    if (await db.get('categories', cat.id)) continue
    added = true
    await putCategory({ ...cat, order })
    let i = 0
    for (const [text, emoji] of phrases) {
      await putPhrase({
        id: `builtin-${cat.id}-${i}-1`,
        categoryId: cat.id,
        text,
        emoji,
        lang: 'en',
        stage: 1,
        order: i++,
        builtin: true,
      })
    }
  }
  return added
}

// One starter song so the Songs screen isn't empty. The last line is an
// easily mitigable gestalt on purpose ("Let's ___" again).
const ABC_LINES: SeedPhrase[] = [
  ['A B C D E F G', '🎵'],
  ['H I J K L M N O P', '🎵'],
  ['Q R S, T U V', '🎵'],
  ['W X, Y and Z', '🎵'],
  ['Now I know my ABCs!', '⭐'],
  ["Let's sing it again!", '🔁'],
]

export async function seedSongsIfEmpty(): Promise<boolean> {
  const db = await getDB()
  // one-time marker: if a parent deletes the built-in song, it must STAY deleted
  if (await db.get('settings', 'songs-seeded')) return false
  if ((await db.count('songs')) > 0) {
    await db.put('settings', { key: 'songs-seeded', value: true })
    return false
  }
  const songId = 'builtin-abc-song'
  await putSong({
    id: songId,
    title: 'The ABC Song',
    emoji: '🔤',
    pauseSec: 0,
    order: 0,
    builtin: true,
  })
  let i = 0
  for (const [text, emoji] of ABC_LINES) {
    await putPhrase({
      id: `builtin-song-abc-${i}`,
      categoryId: `song:${songId}`,
      text,
      emoji,
      lang: 'en',
      stage: 1,
      order: i++,
      builtin: true,
    })
  }
  await db.put('settings', { key: 'songs-seeded', value: true })
  return true
}

// ---------------------------------------------------------------------------
// Content packs: versioned one-time expansions so an already-installed app
// gains new material on its next launch. Everything APPENDS — existing button
// positions never change (motor-planning rule) — and a pack runs exactly once,
// so anything a parent later deletes stays deleted.
// ---------------------------------------------------------------------------

// Pack 3: more variety everywhere.
const PACK3_PHRASES: Record<string, SeedPhrase[]> = {
  snack: [
    ["Let's have breakfast!", '🥞'],
    ['Yummy!', '🤤'],
    ["I don't like it.", '😖'],
    ['More milk, please!', '🍼'],
    ["Let's make a snack!", '🥪'],
    ['Water, please!', '🚰'],
  ],
  play: [
    ["Let's take turns!", '🔄'],
    ['Ready, set, go!', '🏁'],
    ['One more time!', '🔂'],
    ["Let's clean up!", '🧹'],
    ['That was fun!', '🥳'],
    ["Let's build a tower!", '🗼'],
  ],
  feelings: [
    ["I'm excited!", '🤩'],
    ["I'm scared.", '😨'],
    ["I'm mad!", '😠'],
    ['I feel better now.', '🌈'],
    ['I need quiet.', '🤫'],
    ['My tummy hurts.', '🤢'],
  ],
  help: [
    ["It's stuck!", '🔒'],
    ['Open it, please!', '🍯'],
    ['I did it!', '🎉'],
    ["Let's do it together!", '👫'],
    ["It's too hard.", '🪨'],
    ['Watch me try!', '🤞'],
  ],
  go: [
    ["Let's go to the park!", '🎠'],
    ['Are we there yet?', '⏳'],
    ["Let's take a walk!", '🚶'],
    ['Buckle up!', '🚙'],
    ["We're here!", '📍'],
    ["Let's go fast!", '💨'],
  ],
  letters: [
    ["Let's count in Korean!", '🔟'],
    ["Let's count in Russian!", '💯'],
    ["Let's write my name!", '🖊️'],
    ['What letter is that?', '🤔'],
    ["Let's find letters outside!", '🌳'],
    ['Colors and shapes!', '🎨'],
  ],
  chat: [
    ['Good morning!', '🌞'],
    ['Good night!', '🌙'],
    ['I love you!', '❤️'],
    ['Thank you!', '🙏'],
    ['Oops, sorry!', '😅'],
    ['Look what I did!', '✨'],
  ],
  ask: [
    ['Can I try?', '🤲'],
    ['Is it my turn?', '🎲'],
    ['What happened?', '💥'],
    ["Where's Mommy?", '👩'],
    ["Where's Daddy?", '👨'],
    ['Can I help?', '🤝'],
  ],
}

const PACK3_CATEGORIES: { cat: Omit<Category, 'order'>; order: number; phrases: SeedPhrase[] }[] = [
  {
    cat: { id: 'bath', name: 'Bath & Bed', emoji: '🛁', color: '#4ecdc4', builtin: true },
    order: 8,
    phrases: [
      ["It's bath time!", '🛁'],
      ['Splash, splash!', '💦'],
      ["Let's wash hair!", '🧴'],
      ['All clean!', '✨'],
      ["Let's brush teeth!", '🪥'],
      ['Time for pajamas!', '🛌'],
      ['One more book!', '📚'],
      ['Time to sleep. Goodnight!', '😴'],
    ],
  },
  {
    cat: { id: 'morning', name: 'Morning', emoji: '🌅', color: '#ffb703', builtin: true },
    order: 9,
    phrases: [
      ['Wake up time!', '⏰'],
      ["Let's get dressed!", '👕'],
      ['Socks and shoes on!', '🧦'],
      ["Let's eat breakfast!", '🥣'],
      ["Let's pack the bag!", '🎒'],
      ['Ready to go!', '🚪'],
      ['Have a good day!', '🌞'],
      ["Let's go-go-go!", '🏃'],
    ],
  },
]

const PACK3_STARTERS: [text: string, emoji: string, accepts: SlotKind[]][] = [
  ["Let's find", '🔍', ['thing', 'stuff', 'person']],
  ["Let's share", '🤝', ['thing', 'stuff']],
  ['I see', '👀', ['thing', 'stuff', 'person']],
  ['I hear', '👂', ['thing', 'stuff', 'person']],
  ['I need', '🙏', ['thing', 'stuff', 'person']],
]

const PACK3_ENDERS: [text: string, emoji: string, slot: SlotKind][] = [
  ['a banana', '🍌', 'thing'],
  ['juice', '🧃', 'stuff'],
  ['the ball', '⚽', 'thing'],
  ['a car', '🚗', 'thing'],
  ['a dog', '🐶', 'thing'],
  ['a bird', '🐦', 'thing'],
  ['Daddy', '👨', 'person'],
  ['Mommy', '👩', 'person'],
  ['my shoes', '👟', 'thing'],
  ['my teddy', '🧸', 'thing'],
  ['drawing', '🖍️', 'activity'],
  ['dancing', '💃', 'activity'],
  ['jumping', '🤸', 'activity'],
  ['reading', '📚', 'activity'],
  ['to school', '🏫', 'place'],
  ["to grandma's house", '👵', 'place'],
]

type SeedSong = {
  id: string
  title: string
  emoji: string
  lang: LanguageCode
  lines: SeedPhrase[]
}

// Traditional / public-domain songs, plus counting chants written for this app.
const PACK3_SONGS: SeedSong[] = [
  {
    id: 'builtin-song-twinkle',
    title: 'Twinkle Twinkle Little Star',
    emoji: '⭐',
    lang: 'en',
    lines: [
      ['Twinkle, twinkle, little star', '⭐'],
      ['How I wonder what you are!', '💭'],
      ['Up above the world so high', '🌍'],
      ['Like a diamond in the sky', '💎'],
      ['Twinkle, twinkle, little star', '⭐'],
      ['How I wonder what you are!', '💫'],
    ],
  },
  {
    id: 'builtin-song-row',
    title: 'Row Your Boat',
    emoji: '🚣',
    lang: 'en',
    lines: [
      ['Row, row, row your boat', '🚣'],
      ['Gently down the stream', '🌊'],
      ['Merrily, merrily, merrily, merrily', '😄'],
      ['Life is but a dream!', '💭'],
    ],
  },
  {
    id: 'builtin-song-macdonald',
    title: 'Old MacDonald',
    emoji: '🐄',
    lang: 'en',
    lines: [
      ['Old MacDonald had a farm', '🚜'],
      ['E-I-E-I-O!', '🎶'],
      ['And on that farm he had a cow', '🐄'],
      ['E-I-E-I-O!', '🎶'],
      ['With a moo moo here', '🐮'],
      ['And a moo moo there', '🐮'],
      ['Old MacDonald had a farm', '🚜'],
      ['E-I-E-I-O!', '🎉'],
    ],
  },
  {
    id: 'builtin-song-spider',
    title: 'Itsy Bitsy Spider',
    emoji: '🕷️',
    lang: 'en',
    lines: [
      ['The itsy bitsy spider went up the water spout', '🕷️'],
      ['Down came the rain and washed the spider out', '🌧️'],
      ['Out came the sun and dried up all the rain', '☀️'],
      ['And the itsy bitsy spider went up the spout again', '🕸️'],
    ],
  },
  {
    id: 'builtin-song-head-shoulders',
    title: 'Head, Shoulders, Knees & Toes',
    emoji: '🙆',
    lang: 'en',
    lines: [
      ['Head, shoulders, knees and toes, knees and toes', '🙆'],
      ['Head, shoulders, knees and toes, knees and toes', '🙆'],
      ['Eyes and ears and mouth and nose', '👀'],
      ['Head, shoulders, knees and toes, knees and toes!', '🎉'],
    ],
  },
  {
    id: 'builtin-song-bingo',
    title: 'BINGO',
    emoji: '🐶',
    lang: 'en',
    lines: [
      ['There was a farmer had a dog', '🐶'],
      ['And Bingo was his name-o!', '🎶'],
      ['B-I-N-G-O!', '🔤'],
      ['B-I-N-G-O!', '🔤'],
      ['B-I-N-G-O!', '🔤'],
      ['And Bingo was his name-o!', '🎉'],
    ],
  },
  {
    id: 'builtin-song-baabaa',
    title: 'Baa Baa Black Sheep',
    emoji: '🐑',
    lang: 'en',
    lines: [
      ['Baa, baa, black sheep', '🐑'],
      ['Have you any wool?', '🧶'],
      ['Yes sir, yes sir, three bags full!', '👍'],
      ['One for the master, one for the dame', '🎩'],
      ['One for the little boy who lives down the lane', '👦'],
    ],
  },
  {
    id: 'builtin-song-dressed',
    title: 'This Is the Way',
    emoji: '👕',
    lang: 'en',
    lines: [
      ['This is the way we put on our shirt', '👕'],
      ['Put on our shirt, put on our shirt', '👕'],
      ['This is the way we put on our shoes', '👟'],
      ['Put on our shoes, put on our shoes', '👟'],
      ['This is the way we brush our teeth', '🪥'],
      ['So early in the morning!', '🌅'],
    ],
  },
  {
    id: 'builtin-song-pollitos',
    title: 'Los Pollitos Dicen',
    emoji: '🐤',
    lang: 'es',
    lines: [
      ['Los pollitos dicen', '🐤'],
      ['pío, pío, pío', '🎶'],
      ['cuando tienen hambre', '😋'],
      ['cuando tienen frío', '🥶'],
    ],
  },
  {
    id: 'builtin-song-estrellita',
    title: 'Estrellita',
    emoji: '🌟',
    lang: 'es',
    lines: [
      ['Estrellita, ¿dónde estás?', '🌟'],
      ['Me pregunto qué serás', '💭'],
      ['En el cielo y en el mar', '🌊'],
      ['Un diamante de verdad', '💎'],
    ],
  },
  {
    id: 'builtin-song-sutja',
    title: '숫자 노래 (Counting Song)',
    emoji: '🔢',
    lang: 'ko',
    lines: [
      ['하나, 둘, 셋!', '1️⃣'],
      ['넷, 다섯, 여섯!', '2️⃣'],
      ['일곱, 여덟, 아홉, 열!', '3️⃣'],
      ['우리 같이 세었다!', '🎉'],
      ['만세!', '🙌'],
    ],
  },
  {
    id: 'builtin-song-schitalochka',
    title: 'Считалочка (Counting Chant)',
    emoji: '🧮',
    lang: 'ru',
    lines: [
      ['Раз, два, три!', '1️⃣'],
      ['Четыре, пять!', '2️⃣'],
      ['Мы умеем считать!', '🎉'],
      ['Ура!', '🙌'],
    ],
  },
]

async function applyPack3() {
  const db = await getDB()

  // more phrases for existing categories, appended after what's already there
  for (const [categoryId, phrases] of Object.entries(PACK3_PHRASES)) {
    if (!(await db.get('categories', categoryId))) continue
    let order = 20 // well past the originals; positions of known buttons never change
    let i = 0
    for (const [text, emoji] of phrases) {
      await putPhrase({
        id: `builtin-p3-${categoryId}-${i++}`,
        categoryId,
        text,
        emoji,
        lang: 'en',
        stage: 1,
        order: order++,
        builtin: true,
      })
    }
  }

  // two new routine categories at the end of the rail
  for (const { cat, order, phrases } of PACK3_CATEGORIES) {
    if (await db.get('categories', cat.id)) continue
    await putCategory({ ...cat, order })
    let i = 0
    for (const [text, emoji] of phrases) {
      await putPhrase({
        id: `builtin-p3-${cat.id}-${i}`,
        categoryId: cat.id,
        text,
        emoji,
        lang: 'en',
        stage: 1,
        order: i++,
        builtin: true,
      })
    }
  }

  // more mix & match pieces, appended
  let s = 0
  for (const [text, emoji, accepts] of PACK3_STARTERS) {
    await putPhrase({
      id: `builtin-p3-mix-starter-${s}`,
      categoryId: 'mix',
      text,
      emoji,
      lang: 'en',
      stage: 2,
      partType: 'starter',
      accepts,
      order: 20 + s++,
      builtin: true,
    })
  }
  let e = 0
  for (const [text, emoji, slot] of PACK3_ENDERS) {
    await putPhrase({
      id: `builtin-p3-mix-ender-${e}`,
      categoryId: 'mix',
      text,
      emoji,
      lang: 'en',
      stage: 2,
      partType: 'ender',
      slot,
      order: 40 + e++,
      builtin: true,
    })
  }

  // the song library
  const existingSongs = await db.count('songs')
  let songOrder = existingSongs + 10
  for (const song of PACK3_SONGS) {
    if (await db.get('songs', song.id)) continue
    await putSong({
      id: song.id,
      title: song.title,
      emoji: song.emoji,
      pauseSec: 0,
      order: songOrder++,
      builtin: true,
    })
    let i = 0
    for (const [text, emoji] of song.lines) {
      await putPhrase({
        id: `${song.id}-line-${i}`,
        categoryId: `song:${song.id}`,
        text,
        emoji,
        lang: song.lang,
        stage: 1,
        order: i++,
        builtin: true,
      })
    }
  }
}

// Pack 4: grammar & emoji corrections for rows pack 3 already seeded.
// Patches by id and preserves everything else on the row (recordings, hidden,
// focus) — a parent's customizations must survive a content fix.
async function applyPack4Fixups() {
  const db = await getDB()
  const patch = async (id: string, fields: Partial<Phrase>) => {
    const existing = await db.get('phrases', id)
    if (existing) await db.put('phrases', { ...existing, ...fields })
  }

  // finer slot grammar (see STARTERS/ENDERS comments)
  await patch('builtin-mix-0-2starter', { emoji: '👐', accepts: ['thing', 'stuff', 'person'] })
  await patch('builtin-mix-1-2starter', { accepts: ['thing', 'stuff', 'person'] })
  await patch('builtin-mix-2-2starter', { accepts: ['stuff'] }) // "More" — mass/plural only
  await patch('builtin-mix-3-2starter', { accepts: ['thing', 'stuff', 'person'] })
  await patch('builtin-mix-4-2starter', { accepts: ['thing', 'stuff', 'activity'] })
  for (const [i, slot] of [
    [0, 'stuff'], // milk
    [1, 'stuff'], // water
    [3, 'stuff'], // letters
    [4, 'stuff'], // numbers
    [5, 'stuff'], // music
  ] as [number, SlotKind][]) {
    await patch(`builtin-mix-${i}-2ender`, { slot })
  }
  await patch('builtin-mix-17-2ender', { emoji: '🎠' }) // 'to the park' tofu-safe emoji

  await patch('builtin-p3-mix-starter-0', { accepts: ['thing', 'stuff', 'person'] })
  await patch('builtin-p3-mix-starter-1', {
    text: "Let's share",
    emoji: '🤝',
    accepts: ['thing', 'stuff'],
  }) // was "Let's make" — produced "Let's make Daddy!"
  await patch('builtin-p3-mix-starter-2', { accepts: ['thing', 'stuff', 'person'] })
  await patch('builtin-p3-mix-starter-3', { accepts: ['thing', 'stuff', 'person'] })
  await patch('builtin-p3-mix-starter-4', { accepts: ['thing', 'stuff', 'person'] })
  await patch('builtin-p3-mix-ender-1', { slot: 'stuff' }) // juice
  await patch('builtin-p3-mix-ender-6', { slot: 'person' }) // Daddy
  await patch('builtin-p3-mix-ender-7', { slot: 'person' }) // Mommy

  // emoji corrections: Emoji-14 glyphs are tofu on Android 11 tablets;
  // 🤕 (head bandage) misled for a tummy ache
  await patch('builtin-p3-feelings-5', { emoji: '🤢' })
  await patch('builtin-p3-help-1', { emoji: '🍯' })
  await patch('builtin-p3-go-0', { emoji: '🎠' })
}

// Pack 5: an always-available self-advocacy set. These are ordinary phrases,
// so caregivers can replace any of them without creating a separate vocabulary.
async function applyPack5QuickTalk() {
  const db = await getDB()
  const quickIds = [
    'builtin-help-0-1', // Help, please!
    'builtin-feelings-3-1', // I need a break.
    'builtin-feelings-5-1', // It's too loud!
    'builtin-chat-6-1', // No, thank you.
  ]
  for (const id of quickIds) {
    const existing = await db.get('phrases', id)
    if (existing) await db.put('phrases', { ...existing, quickAccess: true })
  }

  if (!(await db.get('phrases', 'builtin-p5-help-stop'))) {
    await putPhrase({
      id: 'builtin-p5-help-stop',
      categoryId: 'help',
      text: 'Stop, please.',
      emoji: '✋',
      lang: 'en',
      stage: 1,
      quickAccess: true,
      order: 99,
      builtin: true,
    })
  }
}

/** Apply any content packs newer than what this install has seen. */
export async function seedContentPacks(): Promise<boolean> {
  const db = await getDB()
  const row = await db.get('settings', 'content-version')
  const version = typeof row?.value === 'number' ? row.value : 2
  let applied = false
  if (version < 3) {
    await applyPack3()
    applied = true
  }
  if (version < 4) {
    await applyPack4Fixups()
    applied = true
  }
  if (version < 5) {
    await applyPack5QuickTalk()
    applied = true
  }
  if (applied) await db.put('settings', { key: 'content-version', value: 5 })
  return applied
}
