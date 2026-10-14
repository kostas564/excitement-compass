# Excitement Compass

A free, private web app that helps you find what excites you most right now, act on it, and let go of the outcome.

**Open it:** https://kostas564.github.io/excitement-compass/

## How it works

1. **Choose.** Write the things you could do next, or tap ones you've saved. A short "Arrive. Then choose." breathing moment comes first (you can skip it, or switch it off in About). Then the app shows your options two at a time and asks which pulls you more. If you can't decide, there's "About the same", or "Not sure? Flip a coin": the coin picks one, and your own reaction tells you whether to keep it or choose the other.
2. **Act.** The compass points at your strongest pull. If you can't do it right now, it moves to the next one you can. If it feels too big, **Make it smaller** swaps it for the first small piece (the original is kept in Saved).
3. **Release.** When you're done, tap **Done, let go** and say where it is now: *Complete*, *Still pulling* (nothing is released, you simply carry on) or *It faded*. Complete and faded add an optional line and a closing thought.

Beside the loop:

- **Home** is a night sky (or a dawn, in the light theme) with a rotating quote or question. Tap the line, or swipe, for the next one.
- **Saved** keeps every option you write, sorted into categories you choose.
- **River** is a light log for signs, coincidences, feelings and ideas.
- **Look back** is a film strip of your path, newest first, with search and tag filters.

There are no streaks, points, badges or stats.

## Privacy

Everything you write stays in your browser on your device. There are no accounts, no server and no cookies, and nothing you write is ever sent anywhere.

The live site does send **one anonymous signal the first time the app is opened on a device**, so the author can see roughly how many people it reaches. It is a single page view to [GoatCounter](https://www.goatcounter.com), with no cookies and no identifier, and it carries nothing about you or anything you write. It is skipped when your browser asks not to be tracked, when you're offline, and anywhere other than a `github.io` address (so never on a local copy). The same note appears under **About → Privacy**.

If you fork this project, clear `ANALYTICS_CODE` at the top of `strings.js` (set it to `''`), or the copy would report to the original counter's name. With it empty, the app sends nothing at all and the Privacy note disappears.

Because your data lives only in your browser, clearing your browser data erases it. Use **About → Download backup** now and then, and **Restore backup** to bring it back or move it to another device. Restoring merges with what's already there and never duplicates anything.

## Install it

- **iPhone (Safari):** tap Share, then **Add to Home Screen**.
- **Android (Chrome):** tap the menu, then **Install app** or **Add to Home screen**.
- **Mac or Windows (Safari, Chrome, Edge):** use **Add to Dock**, or the install icon in the address bar.

Once opened, it works without a connection.

## Run it locally

Plain HTML, CSS and JavaScript, with no framework and no build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

| File | What it does |
| --- | --- |
| `index.html` | App shell; every screen is a section shown one at a time |
| `styles.css` | Theme tokens (dark and light), layout from phone to desktop, motion |
| `app.js` | Screens, Choose/Settle/Act/Release, pair ranking, Saved, River, Look back, backup |
| `storage.js` | Load and save to `localStorage`, schema versions |
| `strings.js` | All interface text in one place, plus the settings for the credit link and the counter |
| `sky.js` | Stars and film grain for the night sky |
| `sw.js` | Service worker for offline use |
| `manifest.webmanifest` | Name, colours and icons for installing |
| `fonts/` | The fonts, served from the app itself so it works offline (see below) |
| `images/` | The banner picture used on the About page |
| `icon.svg`, `icons/` | App icon source and exported PNGs |
| `share.html`, `share.png` | The link preview image, and the page that draws it |
| `tools/` | Scripts that rebuild the icons, the share image and the test site |
| `test/` | A built copy of the app for trying changes first (see below) |
| `design/` | Reference mockups for the redesign (not part of the app) |
| `SPEC.md` | The original build spec; the app has grown since |

### Fonts

Inter (including Inter Display for the small labels) and Cormorant Garamond, both under the [SIL Open Font License](https://openfontlicense.org), via [Fontsource](https://fontsource.org).

### Releasing a change

Browsers keep files for a while, so each release bumps one version number in two places:

1. the `?v=` on every CSS and JS link in `index.html`, and
2. `VERSION` in `sw.js`.

To rebuild the icons or the share image, run `node tools/make-icons.mjs` or `node tools/make-share.mjs` (they use [Playwright](https://playwright.dev)).

### Trying a change first

`node tools/make-test-site.mjs` builds a copy of the app into `test/`, served at `/test/`. The copy has its own storage and its own offline cache, sends nothing, is marked with a small "TEST VERSION" tab, and installs as a separate app, so it can never disturb the real one.

## Credit

A free gift from [Fragments of Coherence](https://fragmentsofcoherence.substack.com), a publication about consciousness, meaning and the bigger picture.

## License

[MIT](LICENSE)
