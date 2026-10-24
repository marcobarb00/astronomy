# Predicting the Sky · Style

The visual style of the whole site: a **star atlas**. Engraved-plate typography
and ink on parchment, used with restraint, around modern, plain wording.

`design/references/index.html` shows every rule below on the top of page 1.1.
Open it next to this file. When the two disagree, this file wins.

---

## 1. Principles

1. **Atlas look, modern words.** The typography and ornament come from old
   star atlases. The words do not: "Act I", "Figure 1", "Play", "latitude",
   decimal degrees. No Latin labels, no "Plate", no archaic phrasing.
2. **Ink on parchment.** Navy ink on warm paper. Colour appears only where it
   carries meaning (a circle in a figure, an origin note).
3. **The blue plate is rare.** The Prussian-blue style (§7) is used only for
   static 2D charts of the sky, at most one per page, and never for
   mathematical constructions.
4. **Restraint.** One ornament (the four-pointed star), one frame (§6), one
   rule style (§4.3). Nothing else decorative.

## 2. Palette

The `:root` variables in `shared/theme.css` and the `COL` palette in
`shared/common.js` hold these values, in sync. Pages never add colours.

### Page

| Variable | Value | Role |
|---|---|---|
| `--bg` | `#f3eee2` | parchment, page background |
| `--card` | `#f7f3ea` | inside figures and frames |
| `--ink` | `#1d2a44` | text, rules, frames, figure outlines |
| `--muted` | `#5b6475` | secondary text |
| `--line` | `#c9bc9c` | light rules and table lines |
| `--accent` | `#7a5718` | gold-brown: section labels, Play button, figure labels, links |

### Figures (mathematical, on parchment)

| Variable | Line | Text (labels) | Role |
|---|---|---|---|
| `--earth` | `#2f5687` | `#2f5687` | celestial equator, Earth |
| `--planet` | `#a23b2e` | `#8d2f24` | object of interest: the chosen star, a planet |
| `--sun` | `#b8862b` | `#7a5718` | Sun, ecliptic |
| `--deferent` | `#4d7a55` | `#3e6346` | horizon, deferent |
| `--epicycle` | `#6e5a9a` | `#5e4a87` | epicycle, Ptolemy's circles |

Line colours are for strokes only. Text in a figure uses the "Text" column
(every text colour is at least 4.5:1 on `--bg`; `#4d7a55` is not, so it is
never used for text).

### Plate (static sky charts only, §7)

| Variable | Value | Role |
|---|---|---|
| `--plate` | `#1f3a6b` | Prussian-blue ground |
| `--plate-ink` | `#eef3fb` | lines, stars, labels |
| `--plate-soft` | `#c9d5ea` | secondary labels |
| `--plate-accent` | `#f2c96b` | the one highlighted element (e.g. a circumpolar limit) |

## 3. Type

From Google Fonts, loaded once in `shared/theme.css` (or each page's head):

| Use | Font | Notes |
|---|---|---|
| Body text | **Spectral** 400, italic 400, 500 | 18 px, line height 1.7, measure ≤ 700 px |
| Titles (h1, h2, h3, figure titles) | **Cormorant Garamond** 600, italic 500, italic 600 | h1 64–68 px, h2 34 px, h3 26 px bold italic |
| Labels in small caps | **Cormorant SC** 500, 600 | letter-spacing 0.1–0.3em |
| Mathematics | KaTeX, unchanged | |

Rules:

- **Small caps labels** for: the act line ("Act I · 1.1"), section step
  labels ("1 · Observation"), the table of contents, figure labels
  ("Figure 1."), margin-note headings ("Origin · Greek"). Colour `--accent`,
  or `--ink` for the table of contents.
- The page subtitle is Cormorant Garamond italic, 24 px, `--muted`.
- The first paragraph of a page opens with a **drop cap** (Cormorant Garamond
  600, about 74 px, `--accent`, three lines tall).
- Numbers in readouts and controls use tabular figures.
- Controls (sliders, buttons, readouts) use Spectral, 15–16 px.

## 4. Page layout

### 4.1 Grid

- Container max-width about 1320 px, 24 px side padding.
- **Contents column** on the left, 220 px, 48 px gap: the table of contents,
  which follows the reader down the page (sticky). Below about 1100 px it
  moves under the header and stays there.
- **Text column** ≤ 700 px. **Margin column** about 200–280 px to its right,
  40 px gap. Below about 800 px the margin note drops under its paragraph.
- Each paragraph that has a note is a flex row: paragraph + margin note,
  aligned to the top of the paragraph.

### 4.2 Header

1. "Predicting the Sky" link (small caps).
2. The act line, h1 title, italic subtitle. In the contents column on the
   left (§4.1): the table of contents, small caps, with a 1 px `--ink` rule
   on its left; the current section in `--accent`. Each entry is the
   section number and the h2 title ("1 Circles about one point"); sections
   without a number ("Exercises", "Sources") show the title alone. The step
   labels ("1 · Observation") stay above each h2 (§4.4), not in the
   contents.
3. Under the header, a **double rule** (§4.3), full width.

### 4.3 Rules

- Double rule: two 1 px `--ink` lines 3 px apart. Used once, under the header.
- Single rule: 1 px `--ink` (structure) or `--line` (light separation).
- The four-pointed star (§5) may sit in the middle of a double rule as the
  page's only ornament, or not at all. Pick one and use it everywhere.

### 4.4 Sections

h2 with a small-caps step label above it: "1 · Observation", "2 · Model",
"3 · Fit", "4 · Test", "5 · Residual" (the rhythm of STRUCTURE.md §5).
Left-aligned, Cormorant Garamond 600, 34 px.

### 4.5 Margin notes

Everything that comments on a paragraph moves into the margin:

- **Origin badges** become notes: a small-caps heading "Origin · Greek"
  (colour per origin, from the figure "Text" colours), with a 1 px `--ink`
  rule on top. For now the note is the heading only, with no tooltip
  (tooltips do not work on phones); a one-sentence explanation will be
  added later, with the content work. The hub explains the origins once
  (Babylonian, Greek, an author, Debated, Modern) in a short key.
- **Citations** ("Almagest I 3, transl. Toomer"): plain, 15 px, no rule.
- **Detours**: heading "Detour · coming later" in `--accent`, a 1 px dashed
  `--accent` rule on top. Becomes a link when the page exists.

Inline badges in the text are no longer used.

### 4.6 Equations

Display equations centred in the text column. An equation is numbered only
when the text, an exercise or another page refers to it; the number `(1.1)`
then sits at the right, in `--muted`.

No equation scrolls sideways, on a phone either. KaTeX never breaks a
display equation, so `renderMath` (`shared/common.js`) cuts each one at its
top level and lets the pieces wrap: write several equations in one display
separated by `\qquad` (or `, \quad`), and a system as one `aligned`
environment with one `&` per line. On a wide screen they are set as
written; on a phone the equations stack, a long chain `a = b = c` breaks
before a relation, and a long right side continues after a `+` or `−`. A
read-out line is never split (it keeps its fixed lines), so keep it short
enough for a phone. The smoke test reports any equation wider than its
column.

## 5. Stars

Stars are always drawn as **four-pointed stars**, never as dots:

```
M x, y−s  L x+0.28s, y−0.28s  L x+s, y  L x+0.28s, y+0.28s
L x, y+s  L x−0.28s, y+0.28s  L x−s, y  L x−0.28s, y−0.28s  Z
```

- Size `s` grows with brightness, from the star's V magnitude (`mag` in
  `shared/stars.js`, from SIMBAD): from 3 px for the faintest to 8 px for
  the brightest, so the chosen star (9 px) still stands out. The mapping is
  one helper, `starSize(mag)`, next to `drawStar` in `shared/common.js`.
- Background stars: `--ink` at about 55% opacity.
- The chosen star: `--planet`, `s` about 9 px, with its name in Cormorant SC.
- On a plate (§7): `--plate-ink`, the highlighted one in `--plate-accent`.

The drawing is one shared helper, `drawStar(ctx, x, y, s)` in
`shared/common.js` (and `starPath(x, y, s)` for SVG), used everywhere:
`Sphere3D.star` and `Plot2D.star` call it.

## 6. The graduated frame

Every **interactive figure** sits in a graduated frame, like the border of an
atlas page.

- Outer 1 px `--ink` border; band thickness 14 px; inside `--card`.
- **The four corners are solid `--ink` squares**, 14 × 14 px.
- Each edge between two corners is split into bands alternating
  **light, dark, light, …, light**: it always starts and ends with a light
  band next to a dark corner.
- The number of bands on an edge of length `L` is the **odd number closest to
  `L / 28`**, at least 3:

  ```
  k = round((L / 28 − 1) / 2)
  n = max(3, 2k + 1)
  band length = L / n
  ```

  So the bands stretch or squish to fit exactly. Horizontal and vertical
  edges are computed separately.
- The frame recomputes when the figure resizes (`ResizeObserver`), so it stays
  aligned at phone width.
- Build it once in `shared/components.js` (for example
  `GraduatedFrame.attach(figureElement)`), and use it for every interactive
  figure. The reference page has a working implementation.

Inside the frame: the canvas on the left, controls on the right; they stack
on a phone. The caption goes **under** the frame: "Figure 1." in small caps
`--accent`, then the caption text; the colour key in the margin column.

## 7. The blue plate

The style of an old cyanotype star atlas: white lines and stars on Prussian
blue.

**Use it only for static 2D charts of the sky**: a map of the sky around the
pole, a planisphere, the zodiac band, the path of an eclipse. **At most one
per page**, and only where the page is about the sky itself.

**Never** for mathematical constructions (spheres with axes, eccentrics,
epicycles, equants, error curves). Those are always ink on parchment, in a
graduated frame.

Anatomy (see the reference page and `design/references/polar-sky.svg`;
pages 1.1 and 1.2 have one each):

- `--plate` ground, with a thin inner line in the parchment colour 6 px in
  from the edge.
- Graduated **hour ring** around a polar chart (or a graduated border around a
  rectangular chart), alternating light and dark segments, labelled in hours
  or degrees.
- Thin graticule (declination circles, hour lines) at low opacity.
- Constellation lines thin; constellation names in spaced capitals.
- The Milky Way as fine stipple.
- **One** element highlighted in `--plate-accent` (e.g. the circumpolar
  limit for the observer's latitude).
- Star positions from `shared/stars.js` or a catalogue, never invented
  (`shared/plate-stars.js`, from SIMBAD).
- The title and caption may sit on the plate, beside the chart:
  "Figure 1" in small caps `--plate-accent`, title in Cormorant Garamond.
  A plate is a figure: it is numbered with the other figures and has its
  keys under it.
- A polar chart shows the sky as seen from the ground: around the north
  pole, right ascension increases clockwise (the reference SVG is drawn the
  other way, as seen from outside the sphere). A rectangular chart is seen
  looking south: north up, east to the left.
- Text on a chart keeps its size on the screen, at least 13 px, whatever
  the width of the chart. On a chart drawn narrower than 480 px (a phone)
  the names are left out (stars, constellations, circles), except the
  star the caption speaks of (`keep` in `Plate.polar` / `Plate.rectangular`:
  Capella on page 1.1, Aldebaran on page 1.2); the numbers of the ring or
  border and the pole's P remain.
- Built by `shared/plate.js` (`Plate.polar`, `Plate.rectangular`, the
  highlights) and styled by `shared/theme.css` §13: a page never draws its
  own.

## 8. Controls

- Sliders: native range inputs, `accent-color: var(--ink)`; label left, value
  right with tabular figures.
- Presets: rectangular buttons, 1 px `--ink` border, no radius; the active one
  filled `--ink` with `--bg` text. Minimum 40 px tall.
- Play: filled `--accent`, light text, a small triangle icon (inline SVG, not
  an emoji character), 44 px tall.
- Readouts: a small table, 1 px `--ink` rules top and bottom, `--line`
  between rows, symbols in italics.

## 9. What stays the same

- The content, mathematics, numbers and behaviour of every figure.
- KaTeX for equations.
- Page structure (STRUCTURE.md §5) and the site map.
- Code style (CLAUDE.md).
