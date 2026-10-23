---
name: new-page
description: Start a new content page of the course (e.g. 2.1 The uneven year) from the template, wired into the site map, the numbers scripts and the checks. Use it whenever a page listed in STRUCTURE.md §4 is built for the first time.
---

# New page

A page is more than its HTML: it has an entry in the site map, a numbers
script, and a place in the checks. This skill makes sure none is forgotten.
It sets up the page; the content comes from STRUCTURE.md §4, written
following WRITING.md.

## Before writing anything

1. Read the page's entry in STRUCTURE.md §4, and the entries of the
   previous and next pages: the new page answers the question the previous
   one ended on, and ends on the question the next one answers.
2. Read STRUCTURE.md §5 to §7, STYLE.md and WRITING.md.
3. Read the previous page in full, for its notation, its models and its
   voice.
4. Find the sources the entry names with the `astronomy-sources` skill.
5. Show me a plan before building: the five sections with one line each,
   the figures (what each shows, which controls, if any, and why), the
   formulas to derive, the exercises (kind and statement), the margin
   notes (origins and detours), and any model that goes into
   `shared/models/`. Wait for my approval.

## Setting up the files

Folder and file names come from STRUCTURE.md §9, e.g.
`act2-sun/01-uneven-year/`.

1. Copy `templates/page.html` to `<folder>/index.html` and
   `templates/page.js` to `<folder>/page.js`. Change every `../` to
   `../../`. Add `page.css` only if the figures need it, and never with new
   colours.
2. Set `data-page="N.N"` on `<body>`. Leave the header empty so it is
   filled from the site map.
3. In `shared/site-map.js`, check the page's entry (number, title,
   question, path). Keep `ready: false` until I approve the page.
4. A model that later pages or the error-curve ghosts will reuse goes in
   `shared/models/<name>.js`, with `make()` if it predicts a longitude
   (STRUCTURE.md §8), and a test case in `shared/tests.js`.
5. Create `tools/numbers/N.N-<slug>.js` from the structure of
   `tools/numbers/1.3-clocks.js`: it loads the shared code through
   `tools/check/load.js` and prints every number of the page, in page
   order. Add it to the table in `tools/numbers/README.md`.
6. Register the page in the checks: the list of pages and a section for
   the page's own helpers in `tools/check/golden.js`, and the list in
   `tools/check/typecheck.js`. `smoke.js` finds pages by itself.
7. Images go in `<folder>/images/`, public domain or CC0 only, with
   `images/CREDITS.md` (CLAUDE.md, Photos).

## While writing

- Every number comes from the numbers script (the `check-numbers` skill).
- Every figure follows the figure rules in CLAUDE.md, sits in a graduated
  frame, and has a key as short as WRITING.md §7 allows.
- At most one blue plate, and only for a static chart of the sky (the
  `sky-plate` skill).

## Before the commit

1. `npm run check`. Regenerate `golden.txt` and `readouts.txt`
   (`golden.js --write`, `smoke.js --update`) only for the new page, and
   check that nothing else moved.
2. Run the `math-reviewer` and `writing-reviewer` agents and fix what they
   report, or tell me why not.
3. One commit for the page, then the `preview-link` skill.
