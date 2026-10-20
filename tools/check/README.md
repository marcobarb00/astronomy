# Checks

Safety nets for changing the code without changing the site. Neither is
loaded by any page; the site runs without them.

| Script | What it checks | Reference |
|---|---|---|
| `golden.js` | The maths, in Node: time scales, sidereal time, the equation of time, the Sun, the Moon and the planets on a set of dates, the stars of date, the models of pages 1.1 to 1.3, the formatting helpers behind every read-out, each page's own helpers, and the output of `tools/numbers/`. | `golden.txt` |
| `tests-node.js` | The cases of `shared/tests.html` (Meeus, SOFA / ERFA, JPL Horizons, the models), run in Node; exits with 1 if one fails. | the tolerances in `shared/tests.js` |
| `typecheck.js` | The site's JavaScript under the TypeScript checker (`// @ts-check`, non-strict, JSDoc types), once per page with the scripts that page loads. | — |
| `smoke.js` | The pages, in Chromium (Playwright): no console error or warning, no failed request or broken link, the tests of `shared/tests.html` pass; every slider moved, every button pressed, every plot pointed at, every sphere dragged. The read-outs after each action, and a full-page screenshot per page at desktop and phone width. | `readouts.txt`, and the screenshots of a commit (`--against`) or of a local baseline |

`load.js` runs the site's scripts in Node for these checks and for
`tools/numbers/`.

Run from the repository root, after every change:

```
node tools/check/golden.js --check
node tools/check/smoke.js --against HEAD
```

or everything at once, with the lint and format checks (after `npm install`,
which installs the development tools listed in `package.json`):

```
npm run check
```

`golden.txt` and `readouts.txt` must stay byte-identical, and the
screenshots pixel-identical, unless the change is meant to alter what a
page shows; then regenerate them (`golden.js --write`, `smoke.js --update`)
and commit them with the change, so the diff shows exactly what moved.

`smoke.js` needs Playwright and its Chromium (`npm i -D playwright`,
`npx playwright install chromium`); a global install also works. It writes
its screenshots, its log and images of any difference to `tools/check/out/`.
