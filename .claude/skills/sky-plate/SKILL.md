---
name: sky-plate
description: Add a blue plate (a static 2D chart of the sky in the cyanotype star-atlas style) to a page with shared/plate.js. Use it when a page needs a chart of the sky itself (around the pole, the zodiac, an eclipse path), and to decide whether it should have one at all.
---

# Blue plate

The rules are in STYLE.md §7. This skill is how to apply them. Pages 1.1
(polar, around the pole) and 1.2 (rectangular, the zodiac around Taurus)
are the worked examples: read their Figure 1 in `index.html` and `page.js`
before starting.

## First, should there be a plate?

Say no, and tell me why, if any of these holds:

- The page already has one (at most one per page).
- The figure is mathematics: a sphere with axes, an eccentric, an
  epicycle, an equant, an error curve. Those are ink on parchment.
- The figure moves. A plate is static; a figure with controls is not a
  plate.
- The page is not about the sky itself at that point.

## Building it

1. Choose the chart: `Plate.polar` for the sky around a pole,
   `Plate.rectangular` for a band of the sky (seen looking south: north
   up, east to the left). Never draw a chart by hand in a page.
2. Stars come from `shared/plate-stars.js` (SIMBAD and Hipparcos, V < 5.0
   in the charted regions). If the new chart covers a region they don't,
   fetch the data into `tools/numbers/data/` with the date in the file
   name, extend `tools/make-plate-stars.py`, and regenerate
   `shared/plate-stars.js` with `python3 tools/make-plate-stars.py`. Never
   type a star position.
3. Constellation figures and names: only those the text talks about. A
   plate with every constellation is a poster, not a figure.
4. Highlight exactly **one** element with the highlight functions
   (`Plate.highlightCircle`, `Plate.highlightCurve`), and compute its
   geometry in the page's numbers script (e.g. the circumpolar limit,
   90° minus the latitude).
5. The plate is a figure like the others: numbered, with a caption that
   says what to notice and a key only for what a label can't say
   (WRITING.md §7).
6. Text on the chart stays at least 13 px on the screen; `plate.js` drops
   the minor labels on a phone.
7. If the chart shows a moment (a sky of a date), say which in the
   caption. Every plate shows the sky of 2026.0 unless stated.

## Checking

Look at the plate at 1280 px and 390 px width (`smoke.js` saves both):
orientation (right ascension increases clockwise around the north pole as
seen from the ground), labels not overlapping, the highlight the only gold
element, no star drawn as a dot.
