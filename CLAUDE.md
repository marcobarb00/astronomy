# Celestial Sphere Simulator

## Project description

I'd like to create an educational aid that allows you to learn some astronomy
concepts. I'm mostly interested in the celestial sphere (celestial coordinates,
equation of time, planetary models, etc.). I also want some concept related to
the history of astronomy. The project would be educational and web-based so it
can be hosted on a GitHub page.

## Instructions

### Target

- Write code that can be used in GitHub Pages (static HTML, CSS and JavaScript,
  no build step or server).
- The current state of the project is in this repository: read the existing
  files before writing new ones.

### Code style

- Readable formatting for the code.
- Both the CSS and the JavaScript must be well formatted and commented.
- Good indentation in a C style.
- Avoid stacking many instructions on the same line.
- Organize the code in a comprehensible way, making use of helper functions.

### Shared look of the simulations

The simulations are generated in multiple sessions, so they must all have the
same style:

- Light theme, soft palette.
- The `:root` CSS variables at the top (background, card, ink,
  earth / planet / sun / deferent / epicycle colours) and the shared `COL`
  palette in the JS are the shared theme: reuse them, do not invent new colours.
- Format the equations with KaTeX.
- Only when it is useful, generate 3D diagrams.

### Rules for every figure

- Every element shown in a figure (a labelled point, a letter, a curve, a
  shaded region, a symbol in a read-out, a line that follows the pointer)
  is explained. If it is not worth explaining, remove it. Shared widgets
  explain their own built-in elements (the error curve does it for its
  pointer line and its bands), so pages need not repeat them.
- Explain the elements in a figure key, one line per element, not in a
  paragraph: `<div class="keys">` with one or more `<dl class="key">`
  ("In the figure", "Read-out"), styled by `shared/theme.css` (see
  `templates/page.html`). The caption only says what to do with the figure
  and what to notice.
- Choose the frame of a figure so that a control moves only what it is
  about. An observer's sky is drawn in the horizon frame: changing the date,
  the time or the latitude turns the sky, never the ground.
- Text in and next to a figure is easy to read: read-outs and slider values
  at the size of the body text, labels drawn on a canvas at 13 px or more.
  The shared theme and `plot2d.js` / `sphere3d.js` already do this; do not
  shrink them per page.
- A legend sample looks like the mark it describes: a dot for a point, a line
  for a curve, a band for a filled region, faint and dashed for a ghost
  (`Plot2D.legend` takes `mark: 'line' | 'dot' | 'band'`).
- A control never moves under the pointer. The value beside a slider sits in
  a fixed-width column (`--ctl-output` in `shared/theme.css`): never let it
  follow its text, or the track resizes while dragging and the value
  jitters. For a quantity the reader steps through one unit at a time (a
  day), add previous / next buttons centred under the slider
  (`.ctl.stepper` with `button[data-target][data-step]`, see
  `templates/demo.html`); held down, they repeat and speed up.
- Scales never jump while a control moves. When a slider changes what is
  plotted, fix the axis range to cover every value the slider allows, with
  the bound computed by a script. A scale may change only when the reader
  changes the view (e.g. a span preset). `Plot2D` and `ErrorCurve` print a
  console warning when data leaves the scale: a page must not trigger it.

### Photos

- When a photo helps (the sky itself, an instrument, a historical object),
  add one. Use only images in the public domain or under CC0: check the
  licence on the source page, never assume it.
- Save it, at web size, in the page's `images/` folder, and record the
  author, date, source URL and licence in `images/CREDITS.md`.
- Show it as `<figure class="photo">` (styled by `shared/theme.css`, which
  makes it as wide as the paragraphs, never wider). The caption says what to
  notice, as for a figure, and ends with a credit line (author, year, source,
  licence). Everything visible in the photo that the caption relies on is
  explained (e.g. the satellite streaks across star trails).

### Writing

- No walls of text: short paragraphs of one idea each, about four lines at
  most. Split a longer explanation, or move what belongs to a figure into
  its key.

## Sources

The reference books (Ptolemy's *Almagest*, Copernicus' *De Revolutionibus*,
Fitzpatrick's *A Modern Almagest*) are available, split by chapter, through the
`astronomy-sources` skill (`.claude/skills/astronomy-sources/`). Use it for
historical models, parameters, definitions and short attributed quotations.
