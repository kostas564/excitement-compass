# Excitement Compass — Build Spec

Sep 28, 2026 · @Kostas

## What it is

Excitement Compass is a free, private web app that helps you find what excites you most right now, act on it, and let go of the outcome. It runs in the browser, installs to a phone's home screen, and stores nothing on any server.

Three principles shape every screen:

1. **Follow the strongest pull that is actually available.** The app asks which option excites you more, not which is most useful. Then it asks if you can act on it now. If not, it offers the next one you can.
2. **Act fully, then let go.** Finishing something is a release, not a score. There are no streaks, points, badges or productivity stats anywhere.
3. **Notice what comes back.** A light log for synchronicities and small signs, so over weeks you can see how one choice led to the next.

The app credits no teacher or tradition. Its About screen speaks only in its own words about excitement as a guide.

## Screens and flow

The app is one loop of three steps, with a log beside it that you can add to at any moment.

&#91;embedded content: the core loop · 3 steps, plus the river log\]

If the top pick can't happen now, Act moves down the ranking instead of sending you back to Choose.

- **Home.** Shows the current pick if one is active, with a "Done, let go" button. Otherwise one large button: "Find my pull". A small + opens the River log from here. Bottom navigation: Home, Saved, River, Look back, About.
- **Choose.** One text field: "What could you do next?" Enter adds each option as a chip, 2 to 7 options. Saved options appear as tap-to-add suggestions, with category tabs when more than one category has something in it. "Find my pull" starts the pair comparison. With only one option, skip straight to Act.
- **Act.** The top pick shown large, a compass needle swinging to point at it. Two buttons: "I'm on it" and "Not possible right now". The second moves to the next option in the ranking with a calm line such as "That's fine. Here's the next strongest pull you can follow." "I'm on it" returns Home with the pick active.
- **Release.** Tapping "Done, let go" opens an optional one-line field, "What happened?", with a Skip. A short closing line appears ("Released."), then Home. No counters, no congratulations.
- **Saved.** Every option typed on Choose is saved automatically, so it never needs typing again. Options can also be added here directly, into a chosen category. Options are sorted into categories the user creates, renames and deletes; the app starts with "Daily goals" and "Long-term goals", and anything not sorted sits in Unsorted. Tap an option to move it to another category or delete it. Deleting a category moves its options to Unsorted. Deleting a saved option never changes history in Look back.
- **River log.** One text line, an optional tag (sign, synchronicity, feeling, idea), and an automatic timestamp. If a pick is active, the entry links to it.
- **Look back.** Subtitle: "Step back and see the whole film." A reverse timeline grouped by day: picks, skipped options shown faintly, release notes and river entries side by side. Filter by tag, plus a simple text search. No charts or totals.
- **Editing.** Tap a river entry (in River or Look back) to change its text or tag, or delete it. Tap a pick in Look back to change its release note, or delete it. Every delete asks first.
- **About.** What the app is for, in its own words, plus settings: export, import, and two ways to start over, each behind a confirm dialog: **Clear history** (picks, notes and river entries; saved options stay) and **Reset the app** (everything, including saved options and categories).

## Words in the app

All text below goes in `strings.js`. Where a screen has several lines, show one at random and never the same one twice in a row.

### About screen

The three lines sit at the top, large, one per line:

**Do what lights you up.**

**Give it everything.**

**Let go of how it turns out.**

Then, in smaller text:

Excitement is information. The pull you feel toward one thing over another is your own inner compass. You don't need to know where it leads. You only need to follow the strongest pull you can act on right now, one step at a time.

When you can't do the most exciting thing, do the next one you can. When something is done, let it go. What comes back, like a coincidence, a new idea or an open door, often shows you the next step.

People across many traditions have pointed to this same simple practice: act fully, and don't cling to the results. This app is a small tool to help you remember it.

Everything you write stays on this device. Nothing is sent anywhere.

At the very bottom, small: "A free gift from Fragments of Coherence, a publication about consciousness, meaning and the bigger picture." The name links to the Fragments of Coherence Substack.

### Home, when no pick is active

- What feels most alive right now?
- You don't need the whole map. Just the next step.
- Small steps count. Follow the pull you can follow.
- Excitement is a direction, not a destination.
- Begin with what's in front of you.
- If nothing excites you, choose what feels lightest.
- Step back. See the whole film. Then choose the next frame.
- Every choice opens a different path. Which one is calling you?
- What would you do if you trusted the bigger picture?

### Act, when the top pick isn't possible

- That's fine. Here's the next strongest pull you can follow.
- Not now isn't never. Here's what you can do now.
- The path bends. Follow the next pull.
- Not every door opens today. This one does.

### After Release

- Released.
- Done. Let it land wherever it lands.
- You showed up fully. The rest isn't yours to carry.
- Let it go. Notice what comes back.
- The outcome isn't the measure. The doing was.
- Open hands.
- One more fragment falls into place.
- You don't need to see the whole picture. You're part of it.

### Empty screens

- **River log, nothing yet:** Small coincidences are where the pieces start to connect. Note them here.
- **Look back, nothing yet:** Your path will appear here as you walk it. Later, you'll see the whole film.

## How the pair comparison works

The app ranks options by showing two at a time and asking "Which pulls you more?" Choosing between two is easier and more honest than giving each option a number.

- **Layout.** Two large cards side by side (stacked on narrow phones). Tap one. A small "About the same" link sits underneath.
- **Method.** Binary insertion sort. Each new option is placed into the ranked list by comparing it to the middle item, then halving. Five options take at most 8 taps, seven options at most 14.
- **No repeat questions.** Every answer is cached for that session, so the same pair is never asked twice.
- **"About the same".** Counts as a tie; the option entered first stays ahead.
- **Card order.** Which card appears on the left is random, so position doesn't bias the choice.
- **Progress.** A thin line fills as comparisons run. No numbers shown.
- **Undo.** One back arrow re-asks the previous pair.

The finished ranking is saved with the session, so Act can move down it when the top pick isn't possible and Look back can show it later.

## Data, privacy, offline

All data stays in the user's browser. There are no accounts, no server, no analytics and no cookies.

- **Storage.** `localStorage`, one versioned JSON object under the key `excitement-compass-v1`. Every read and write wrapped in try/catch; the app still works (without saving) if storage is blocked.
- **Data model.**
  - `sessions`: id, createdAt, options (text list), ranking (ordered option list), skipped (options marked "not possible"), pick, status (active / released), releasedAt, note.
  - `river`: id, createdAt, text, tag, sessionId (if a pick was active).
  - `library`: `categories` (id, name, createdAt) and `items` (id, text, categoryId or null for Unsorted, createdAt, lastUsedAt). Built on first load from options in earlier sessions (schema version 2).
  - `settings`: theme, schemaVersion.
- **Backup.** Export downloads a dated `.json` file. Import reads one back and merges by id, never duplicating entries. A clear warning that clearing browser data erases everything not exported.
- **Delete all.** In About, behind a confirm dialog.
- **Offline and install.** A web app manifest and a service worker that caches the app's files, so it opens with no connection and can be added to the home screen on iPhone and Android.

## Look and feel

The app is inspired by the Fragments of Coherence brand, not a copy of its paintings: a modern, clean interface built on the same idea of warm gold light in a deep, cold dark, with one luminous point in the middle. The compass is that point.

- **Palette.** Deep navy, indigo and violet for backgrounds. Radiant warm gold and amber for the compass, the main button and anything "alive". Cyan as a small secondary accent (links, focus rings). Soft off-white text. Warm light against cold dark is the signature, so gold is used sparingly and always means something.
- **Background.** Generated in code, no image files. A deep night gradient with soft, blurred glows of light, fine grain and tiny stars (details below). Modern and calm, with no paint effect.
- **Sacred geometry compass.** The compass is drawn in SVG with fine gold lines: a flower of life ring, a hexagon inside, and a star-shaped needle. It glows softly. When the needle settles on the pick, the geometry brightens for a moment, then calms.
- **Warmth means the pull.** In the pair comparison, both cards start cool (indigo, cyan edge). The one you tap fills with warm gold light before the next pair appears. The chosen pick on Act is the only fully warm element on the screen.
- **Light theme.** A dawn version: pale sky tones with the same gold, following the phone's setting, with a manual toggle in About.
- **Type.** One readable sans-serif for everything, large sizes, generous spacing. Body text at least 17 px on phones. The three About lines can use an elegant serif.
- **Motion.** Soft fades between screens and the one needle animation. Everything respects the phone's reduced-motion setting.
- **Voice.** Short, second person, never pushy. No exclamation marks, no emoji.
- **Layout.** One-handed phone use first: main buttons in the lower half, tap targets at least 48 px. On desktop the same layout sits centred, no wider than 480 px.
- **Language.** English only in v1, all interface text in one strings file so Greek can be added later.

### Visuals made in code

Every visual is drawn by the app's own code, so Claude Code builds all of it and no image tool is needed.

- **Night sky (`sky.js` and CSS).** A navy-to-violet gradient with two or three large, very blurred glows, like distant light in a clear night sky: a gold-amber glow behind the compass, and faint indigo and cyan glows near the edges. The glows drift very slowly, about one full cycle a minute, and stay still when reduced motion is on. On top: a subtle film grain (a tiny tiled noise texture made in code) and about 120 small white stars, a few twinkling gently. A soft vignette darkens the edges.
- **Compass (inline SVG).** Crisp, thin gold lines: a flower of life ring, a hexagon, a faint Metatron's cube pattern, and a slim star-shaped needle. A soft gold glow via an SVG blur filter. Clean and precise, like a modern instrument.
- **Cards and buttons.** Frosted glass panels: slightly transparent indigo with a background blur and a fine cyan edge. The chosen card fills with a warm gold glow. The main button is solid gold with dark text.
- **App icons.** A hand-written `icon.svg`: a gold compass star in a thin flower of life circle on deep indigo. A small Node script (`tools/make-icons.mjs`, using `sharp`) exports the 192 px, 512 px and maskable PNGs.
- **Share image.** A `share.html` page draws the sky and the compass at 1200 × 630 px with the name "Excitement Compass". Claude Code screenshots it with Playwright to make `share.png` for link previews on Substack and social media.

## Tech stack and files

Plain HTML, CSS and JavaScript with no framework and no build step, hosted free on GitHub Pages. Anyone can open the files and see how it works.

| File | Purpose |
| --- | --- |
| `index.html` | App shell, all screens as sections shown one at a time |
| `styles.css` | Theme tokens (dark and light), layout, motion |
| `app.js` | Screen routing, Choose/Act/Release logic, pair ranking |
| `storage.js` | Load, save, export, import, schema versioning |
| `strings.js` | All interface text in one place |
| `sw.js` | Service worker for offline use |
| `manifest.webmanifest` | Name, colours, icons for home-screen install |
| `icons/` | App icons at 192 and 512 px, plus a maskable version |
| `README.md` | What it is, privacy note, how to run locally |
| `LICENSE` | MIT, so others can reuse it |

Suggested repo: `kostas564/excitement-compass`, published at `kostas564.github.io/excitement-compass`.

## Build steps for Claude Code

Build in six small phases, one cloud session each, and commit after every phase. Short, clear sessions use far fewer credits than one long open-ended one.

First, save this whole spec as `SPEC.md` in the new repo. Then start each session with:

```text
Read SPEC.md. We are building Excitement Compass in phases. Do only phase N below, keep to the spec, test it in a browser at phone width, then commit with a clear message. Do not add features that aren't in the spec.
```

1. **Skeleton.** Files from the table above, theme tokens, Home screen, bottom navigation, screen switching, `storage.js` with load/save.
2. **Choose.** Option entry with chips and suggestions, the pair comparison with caching, ties, random sides, undo and progress line.
3. **Act and Release.** Top pick with the compass needle, "not possible" moving down the ranking, active pick on Home, release note and closing line.
4. **River log and Look back.** Quick-add from any screen, tags, link to the active pick, the day-grouped timeline with filter and search.
5. **Offline, install, backup.** Manifest, icons, service worker, export, import with merge, delete all.
6. **Polish.** Reduced motion, light theme toggle, accessibility pass (labels, contrast, focus), test on a real phone, write the README, turn on GitHub Pages.

After phase 6, use it yourself for a week before sharing it. Note what feels clunky and fix that in one final session.

## Out of scope for v1

These stay out so the first version is small, private and finished before the credits expire in November.

- Accounts, login or syncing between devices
- Reminders or push notifications
- Streaks, points, stats or charts of any kind
- AI suggestions or anything that sends data off the device
- Sharing to social media
- Greek translation (the strings file makes it easy later)
