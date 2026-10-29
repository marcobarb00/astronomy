# Numbers scripts

Every numerical answer on a page is computed by a script, not by hand
(STRUCTURE.md §7.2). Each page's script lives here, loads the site's own
shared code in Node, and prints the numbers quoted on the page.

| Script | Page |
|---|---|
| `1.1-turning-sky.js` | 1.1 · The turning sky |
| `1.2-frames.js` | 1.2 · Frames |
| `1.3-clocks.js` | 1.3 · Clocks |
| `2.1-uneven-year.js` | 2.1 · The uneven year |
| `2.2-equation-of-time.js` | 2.2 · The equation of time |
| `2.3-precession.js` | 2.3 · Precession |
| `3.1-first-anomaly.js` | 3.1 · The first anomaly |
| `3.2-evection.js` | 3.2 · Evection and the distance problem |

Run from the repository root, e.g.

```
node tools/numbers/1.1-turning-sky.js
```

`data/` holds the raw downloads the shared data were copied from, with the
script that fetched them.
