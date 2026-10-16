# Prompts for Claude Code

Before the first prompt, put `STRUCTURE.md` and `CLAUDE.md` in the root of the
repository and commit them. Claude Code reads `CLAUDE.md` automatically at the
start of every session, so the style rules never need repeating.

Use one Claude Code session per prompt. Start each one in **plan mode**
(Shift+Tab), read the plan, correct it, then let it build.

---

## Prompt 1 · Foundation

```
Read STRUCTURE.md and CLAUDE.md in full.

Build the foundation of the site described in STRUCTURE.md, without any
content pages yet.

1. Move the existing pages (spherical_astronomy, copernican_revolution,
   hipparchus_model) into archive/. Do not delete them, do not link them.
2. Keep the :root variables in shared/theme.css and the COL palette in
   shared/common.js exactly as they are. You may reuse any helper from the
   current shared/common.js; reorganise it into the files listed in
   STRUCTURE.md §8.
3. Create the shared files in STRUCTURE.md §8:
   - theme.css: article layout with a sticky table of contents, figures,
     badges, exercises (collapsed hint and answer), detour cards,
     previous/next navigation.
   - common.js, sphere3d.js, plot2d.js, time.js, components.js.
   - ephemeris.js: the reference sky. Sun and planets from Standish's
     approximate Keplerian elements (JPL); Moon from the truncated lunar
     theory in Meeus, Astronomical Algorithms. Document the accuracy and
     the valid date range in the file header.
   - errorcurve.js: the widget of STRUCTURE.md §7.3, with ghost curves.
   - tests.html: check time.js and ephemeris.js against the worked examples
     in Meeus and print pass/fail with the error for each case.
4. Create a page template (templates/page.html) that follows the page
   anatomy in STRUCTURE.md §5, using every component once.
5. Create the hub index.html from STRUCTURE.md §4 (Hub), with each page
   listed and greyed out until it exists.
6. Create a demo page (templates/demo.html) with one 3D sphere, one 2D
   plot, one error curve (the Sun with a uniform-circle model against the
   reference) and one exercise, to show that everything works together.

Verify in a browser: no console errors, all tests in tests.html pass, the
demo renders correctly at desktop and phone width. Show me screenshots of
the hub, the demo and the test results before committing.
```

---

## Prompt 2 · One content page (reuse for every page)

Replace `X.Y` and the title. Build pages in the order of STRUCTURE.md §12.

```
Read STRUCTURE.md and CLAUDE.md in full, then the pages already built
before this one, so the new page continues them in notation and tone.

Build page X.Y "<title>" as specified in STRUCTURE.md §4, using
templates/page.html and the shared code.

First, plan only. Give me:
- the outline, section by section, following the rhythm of §5
  (observation, model, fit, test, residual);
- every derivation you will present, in brief;
- every figure: what it shows, its controls, 2D or 3D;
- the exercises with their worked answers, with every number computed by a
  script you run now (show the script and its output);
- the sources you will cite, with the specific chapters or Almagest books;
- anything in STRUCTURE.md you think should change for this page.

Wait for my approval, then implement. Models that later pages reuse go in
shared/models/. Add the page to the hub and link previous/next.

Before committing: serve the site, check the console, exercise every
control, check the KaTeX, and show me screenshots of each figure.
```

---

## Prompt 3 · Review at the end of each act

```
Read STRUCTURE.md and CLAUDE.md, then every page of Act N.

Review the act as a reader with a mathematics degree who is new to
astronomy. Report, without changing anything yet:
- gaps in the argument: a step used before it is explained, or a result
  quoted without derivation;
- inconsistencies in notation, sign conventions and units between pages;
- numbers that disagree between pages, or with the shared ephemeris;
- places where the rhythm of STRUCTURE.md §5 is broken;
- code that duplicates something in shared/ or breaks the style in
  CLAUDE.md;
- whether each page's residual really motivates the next page.

Order the findings by importance. After I choose which to fix, fix them
one commit per finding.
```

---

## Prompt 4 · Small changes

For a quick fix, plan mode is not needed:

```
On page X.Y: <the change>. Keep to CLAUDE.md. Check the page in a browser
and show me a screenshot of the result.
```
