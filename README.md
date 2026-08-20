# 🌱 EchoBloom

A communication companion for a young **gestalt language processor** — built for one
particular almost-five-year-old who loves letters and numbers in English, Spanish,
Korean, and Russian.

Gestalt learners pick up language in whole, melody-rich chunks ("gestalts") and later
break them apart into flexible language. EchoBloom is designed around that path:

- **💬 Let's Talk** — a phrase board of short, warm, *easily mitigable* gestalts
  ("Let's get milk!", "I'm tired.", "Help, please!"), spoken in **your recorded voice**
  (falls back to text-to-speech until you record). Organized by routine, big print on
  every button, buttons never move.
- **🧩 Mix & Match** — stage-2 "mitigation" play: beginnings ("Let's get…", "I'm…")
  combine with endings ("milk", "happy", "outside") into new sentences. Grammar-safe
  pairings only; incompatible pieces dim but never move.
- **🔤 Letters & Numbers** — alphabets and counting in all four languages (including
  Hangul jamo and Cyrillic with proper letter names). Tapping speaks the letter; a
  bubble models a reusable phrase like "I found the letter B!" — interest-led, never
  a quiz.
- **🎵 Songs** — songs are usually a gestalt learner's first gestalts. Record each
  line in your own singing voice; an optional *fill-in pause* after each line leaves
  room for him to sing the next bit (serve-and-return practice). Ships with the ABC
  song.
- **📸 Photo Time** — real family photos with talking hotspots (visual scene
  displays, the strongest-evidence pattern for shared parent-child AAC use). Tap the
  photo in the manager to place a spot, give it a phrase, record it.
- **⭐ Grown-Ups** (hold the star 2.5s) — record phrases in your own voice, add his
  real scripts with *meaning notes* ("what he means / how to respond"), a coaching
  guide distilled from gestalt-language research, a progress journal, settings, and
  full backup/restore.

Progression mechanics (the road from scripts to conversation):

- **Break-it-apart** — long-press any board phrase to split it into its chunks
  ("Let's get" + "milk"), the bridge from whole scripts to stage-2 mitigation.
- **🗨️ Chatting and ❓ Asking categories** — conversation isn't requesting;
  comments, greetings, and questions *he owns* are what build back-and-forth.
- **⭐ This Week's Words** — star up to 5 focus phrases; they're marked on his board
  and the Journal tracks when he uses them and suggests what to model next.

Design rules baked in (see the in-app Guide for sources): no quizzing mechanics
anywhere, no "you/your" in any phrase, phrases are hidden rather than deleted,
identical gentle feedback on every tap, no flashing or random rewards.

## Develop

```bash
npm install
npm run dev        # → http://localhost:5173 (also on your LAN: --host is on)
npm run build      # production build in dist/
npm run preview    # serve the production build locally
```

Icons are generated (no image tools needed): `node scripts/gen-icons.mjs`.

## Put it on the Android tablet

The app is a **PWA**: installed from Chrome it becomes a real home-screen app
(Android mints a WebAPK for it), fullscreen, fully offline.

1. **Host it** (one-time): push this repo to GitHub and enable GitHub Pages with a
   build action, or drag `dist/` into Netlify/Cloudflare Pages. Any HTTPS static host
   works — the app never needs a server after install.
2. On the tablet, open the URL in **Chrome → ⋮ menu → Install app** (or "Add to home
   screen").
3. Open the installed app → Grown-Ups → Settings → **Protect storage** (guards your
   recordings against low-storage cleanup).
4. **Voices**: Android Settings → System → Text-to-speech → Google engine → download
   the **Spanish, Korean, and Russian** voice packs once; they then work offline.
   (Your recordings always work offline regardless.)
5. **Keep him in the app**: Android Settings → Security → **App pinning** → on.
   Open the app, tap Recents, tap the app icon → Pin. Unpinning can require your PIN.

### Developing against the real tablet (optional, no hosting needed)

Install [platform-tools](https://developer.android.com/tools/releases/platform-tools)
(~10 MB), enable USB debugging on the tablet, then:

```bash
adb reverse tcp:5173 tcp:5173
```

Now Chrome on the tablet reaches your PC's dev server at `http://localhost:5173`,
with mic + service worker working (localhost counts as secure).

### Native Android app

The Capacitor Android project is included and uses the same web build. Native installs
keep data in app-private storage and can enable the app's gentle haptic feedback.

```bash
npm run native:sync   # build the web app and copy it into Android
npm run native:open   # open the Android project
```

Launcher artwork is generated with the PWA icons by `npm run icons`. A signed release
still requires the normal Android signing setup.

## Backups matter

Recordings of your voices live in the browser's IndexedDB on the tablet. Export a
backup (Grown-Ups → Settings → Export backup) after recording sessions and keep the
file somewhere safe. Import restores everything, including recordings.

## Visual supports and licensing

Caregivers can search ARASAAC pictograms while online. A selected pictogram is cached
in IndexedDB, works offline, and travels with EchoBloom backups. ARASAAC pictograms are
for non-commercial use under CC BY-NC-SA; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
for the required attribution and terms. Submitting a pictogram search sends that search
term to ARASAAC; recordings, notes, and phrase data remain local.

## Stack

Vite + React + TypeScript, React Aria Components (accessible dialogs), dnd-kit
(caregiver-only sorting), Fontsource (bundled variable typography), `idb` (IndexedDB),
`vite-plugin-pwa` (offline service worker), Capacitor + Haptics (native Android), Web
Speech API (TTS fallback), and MediaRecorder (voice recording). No accounts, analytics,
or ads.
