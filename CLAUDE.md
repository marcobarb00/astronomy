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

## Sources

The reference books (Ptolemy's *Almagest*, Copernicus' *De Revolutionibus*,
Fitzpatrick's *A Modern Almagest*) are available, split by chapter, through the
`astronomy-sources` skill (`.claude/skills/astronomy-sources/`). Use it for
historical models, parameters, definitions and short attributed quotations.
