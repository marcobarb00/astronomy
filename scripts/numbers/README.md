# Numbers scripts

Every numerical answer on a page is computed by a script, not by hand
(STRUCTURE.md §7.2). Each page's script lives here, loads the site's own
shared code in Node, and prints the numbers quoted on the page.

| Script | Page |
|---|---|
| `1.1-turning-sky.js` | 1.1 · The turning sky |

Run from the repository root, e.g.

```
node scripts/numbers/1.1-turning-sky.js
```

`data/` holds the raw downloads the shared data were copied from, with the
script that fetched them.
