# Excitement Compass

A free, private web app that helps you find what excites you most right now, act on it, and let go of the outcome.

**Open it:** https://kostas564.github.io/excitement-compass/

## How it works

1. **Choose.** Write the things you could do next, or tap ones you've saved. The app shows them two at a time and asks which pulls you more.
2. **Act.** The compass points at your strongest pull. If you can't do it right now, it moves to the next one you can.
3. **Release.** When it's done, let it go. Add a line about what happened, if you like.

Beside the loop:

- **Saved** keeps every option you write, sorted into categories you choose.
- **River** is a light log for signs, coincidences, feelings and ideas.
- **Look back** shows your path day by day, with search and tag filters.

There are no streaks, points, badges or stats.

## Privacy

Everything you write stays in your browser on your device. There are no accounts, no server, no analytics and no cookies, and nothing is sent anywhere.

Because it lives only in your browser, clearing your browser data erases it. Use **About → Download backup** now and then, and **Restore backup** to bring it back or move it to another device. Restoring merges with what's already there and never duplicates anything.

## Install it on your phone

- **iPhone (Safari):** tap Share, then **Add to Home Screen**.
- **Android (Chrome):** tap the menu, then **Install app** or **Add to Home screen**.

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
| `styles.css` | Theme tokens (dark and light), layout, motion |
| `app.js` | Screens, Choose/Act/Release, pair ranking, Saved, River, Look back, backup |
| `storage.js` | Load and save to `localStorage`, schema versions |
| `strings.js` | All interface text in one place |
| `sky.js` | Stars and film grain for the night sky |
| `sw.js` | Service worker for offline use |
| `manifest.webmanifest` | Name, colours and icons for home-screen install |
| `icon.svg`, `icons/` | App icon source and exported PNGs |
| `share.svg`, `share.png` | Link preview image |
| `tools/make-images.sh` | Rebuilds the PNGs from the SVGs (macOS) |
| `SPEC.md` | The build spec |

### Releasing a change

Browsers keep files for a while, so each release bumps one version number in two places:

1. the `?v=` on every CSS and JS link in `index.html`, and
2. `VERSION` in `sw.js`.

To rebuild the icons or share image after editing an SVG, run `sh tools/make-images.sh`.

## Credit

A free gift from [Fragments of Coherence](https://fragmentsofcoherence.substack.com), a publication about consciousness, meaning and the bigger picture.

## License

[MIT](LICENSE)
