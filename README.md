# Predicting the Sky

*From the celestial sphere to Kepler: an interactive course in classical
positional astronomy.*

A static site (plain HTML, CSS and JavaScript, no build step) for GitHub Pages.
The plan for the whole site is in [`STRUCTURE.md`](STRUCTURE.md); the coding
and style rules are in [`CLAUDE.md`](CLAUDE.md).

## Layout

| Path | Contents |
|---|---|
| `index.html` | The hub: the five acts as a map. Pages are greyed out until they exist. |
| `shared/` | Theme, shared code, the reference ephemeris and its tests (`shared/tests.html`). |
| `shared/models/` | Models built on one page and reused by later pages. |
| `act1-stage/01-turning-sky/` | Page 1.1 · The turning sky. |
| `act1-stage/02-frames/` | Page 1.2 · Frames. |
| `templates/page.html` | The page template, with every shared component once. |
| `templates/demo.html` | A demo of the sphere, plot, error curve and exercise working together. |
| `archive/` | The earlier pages, kept for reference and not linked from the site. |
| `tools/numbers/` | The script behind each page's numbers, run with Node. |

## Running locally

Any static server from the repository root, for example:

```
python3 -m http.server
```

then open <http://localhost:8000/>. Run `shared/tests.html` after changing
`shared/time.js`, `shared/ephemeris.js`, `shared/stars.js` or a model in
`shared/models/`.

## Publishing a page

Set `ready: true` on the page's entry in the site map at the top of
`shared/components.js`: the hub, the previous / next links and the detour
cards follow.
