---
name: astronomy-sources
description: Sources for the celestial sphere simulator - Ptolemy's Almagest (Toomer), Copernicus' De Revolutionibus (Rosen), Fitzpatrick's A Modern Almagest, Neugebauer's A History of Ancient Mathematical Astronomy (Part One) and Voelkel's Johannes Kepler and the New Astronomy, split by chapter. Use it whenever a simulation or explanatory text needs historical models, parameters, definitions or quotations about the celestial sphere, celestial coordinates, equation of time, precession, solar/lunar/planetary models (eccentric, epicycle, equant, heliocentric, Kepler's laws), eclipses, Hipparchus, Babylonian astronomy or the history of astronomy.
---

# Astronomy sources

Reference library for the project. The books are in `references/`, one Markdown
file per chapter, with an `INDEX.md` in each book folder.

| Folder | Book | Best for |
|---|---|---|
| `references/almagest-toomer/` | Ptolemy, *Almagest*, transl. G. J. Toomer (1984) | Historical geocentric models, original parameters, Ptolemy's own reasoning |
| `references/de-revolutionibus-rosen/` | Copernicus, *De Revolutionibus*, transl. E. Rosen | Heliocentric model, precession, Copernican parameters |
| `references/modern-almagest-fitzpatrick/` | R. Fitzpatrick, *A Modern Almagest* | Modern formulas, algorithms and worked examples ready to be coded |
| `references/hama-neugebauer/` | O. Neugebauer, *A History of Ancient Mathematical Astronomy* (HAMA), Part One (1975) | How the Almagest's methods and parameters were derived and how good they are; Hipparchus, Apollonius; Babylonian astronomy |
| `references/kepler-voelkel/` | J. R. Voelkel, *Johannes Kepler and the New Astronomy* (1999) | Kepler's life and the outline of his discoveries (Mars, the first three laws), at an introductory level |

## How to use the library

1. Open the `INDEX.md` of the relevant book to find the chapter (do not load
   whole books: some chapters, e.g. star catalogues and tables, are thousands
   of lines long).
2. For a specific term, search before reading:
   `grep -ril "equant" references/` or `grep -n "equation of time" references/*/*.md`.
3. Read only the chapter (or the part of it) that is needed.
4. When the content is used in the simulator, cite book, chapter and, for
   Copernicus, the folio marker, e.g. *Almagest* III 9, *De Rev.* III 26
   [f. 96r], Fitzpatrick § 5.4, *HAMA* I B 2 (p. 61), Voelkel ch. 3.

## Topic map

| Topic | Almagest (Toomer) | De Revolutionibus | Modern Almagest | HAMA (Neugebauer) |
|---|---|---|---|---|
| Celestial sphere, the two motions | `book-01/03`–`08` | `book-1/01`–`11` | `02-spherical-astronomy.md` | — |
| Chords, plane and spherical trigonometry | `book-01/10`, `13` | `book-1/12`–`14` | `02-spherical-astronomy.md` | `book-1/a1`–`a2`, `e3` |
| Obliquity, declination, right ascension | `book-01/12`–`16` | `book-2/01`–`03` | `02-spherical-astronomy.md` | `book-1/a3` |
| Latitude effects, rising times, ascensions | `book-02/` | `book-2/04`–`13` | `02-spherical-astronomy.md` | `book-1/a4`–`a5`, `book-2/i4` |
| Length of the year, solar model | `book-03/01`–`08` | `book-3/13`–`24` | `05-the-sun.md` | `book-1/b1`, `e2`, `e4`; `book-2/b8`–`b9` |
| Equation of time (inequality of days) | `book-03/09` | `book-3/26` | `05-the-sun.md` (§ 5.4) | `book-1/b2` |
| Eccentric vs. epicycle equivalence | `book-03/03` | `book-3/15`, `book-5/03` | `04-geometric-planetary-orbit-models.md` | `book-1/b1`, `d2` |
| Moon, parallax | `book-04/`, `book-05/` | `book-4/` | `06-the-moon.md` | `book-1/b3`–`b5`, `e5`; `book-2/b1`–`b3` |
| Eclipses | `book-06/` | `book-4/29`–`32` | `07-lunar-solar-syzygies-and-eclipses.md` | `book-1/b6`, `e5`; `book-2/b4`–`b7` |
| Fixed stars, precession, star catalogue | `book-07/`, `book-08/` | `book-2/14`, `book-3/01`–`12` | — | `book-1/e2` |
| Planetary longitude models (equant) | `book-09/`–`book-11/` | `book-5/` | `08-…`, `09-…` | `book-1/c1`–`c5` |
| Retrogradation, stations, elongations | `book-12/` | `book-5/35`–`36` | `08-…`, `09-…` | `book-1/c6`, `c8`, `d3` |
| Planetary latitudes | `book-13/` | `book-6/` | `10-planetary-latitudes.md` | `book-1/c7` |
| Dates, Julian day, calendars | `00-introduzione-toomer.md` (§ 5d) | — | `03-dates.md` | `book-2/i3` |
| Glossary and symbols | `00-introduzione-toomer.md` (§ 5f) | — | `11-glossary.md`, `12-index-of-symbols.md` | — |
| Hipparchus, Apollonius | (cited throughout) | — | — | `book-1/d1`–`d3`, `e1`–`e7` |
| Babylonian astronomy | — | — | — | `book-2/` |
| Historical periods: Hellenistic, Roman, Indian, Islamic | — | — | — | `intro/i2` |

For Kepler use Voelkel: `03-the-new-astronomy.md` (Tycho, Mars, the first two
laws, *Astronomia Nova*), `04-the-harmony-of-the-world.md` (the third law),
`02-the-secret-of-the-universe.md` (*Mysterium Cosmographicum*, the Platonic
solids), `06-the-dream.md` (the Rudolphine Tables), `07-epilogue-vindication.md`
(the transit of Mercury of 1631, Newton). `08-chronology.md` has the dates.

(Paths are relative to each book folder; the chapter number is the file prefix.
In HAMA the prefix is Neugebauer's division and section: `book-1/b2` is
Book I, B § 2; `i` is an introduction.)

## Things to know about the text

- The text comes from OCR/PDF extraction and is **not proof-read**: words can be
  split ("m eridian"), Greek letters and symbols can be garbled, tables lose
  their columns. Check numbers against the context (or against Fitzpatrick)
  before putting them in code.
- Some chapter headings were not recognised: those chapters are inside the
  previous file. `INDEX.md` lists them under "Note sulla suddivisione".
- Toomer's conventions: sexagesimal numbers `6,13;10,0,58`, chords on a circle of
  radius 60 (`Crd`), square brackets = translator's additions, curly brackets =
  later interpolations, `H` + page = Heiberg's Greek edition. "In advance" /
  "towards the rear" refer to the daily motion (west / east).
- Copernicus: `[f. 12r]` is the folio of the 1543 Nuremberg edition.
- HAMA: `[p. 61]` marks the start of a printed page (Toomer's notes cite
  HAMA by these pages, e.g. "HAMA 58-61"). Only Part One is in the library
  (Introduction, Book I on the Almagest and its predecessors, Book II on
  Babylonian astronomy); Part Two (Egypt, early Greek astronomy, the Roman
  period) and Part Three (figures, plates, indices) are not, so the
  "Fig. 57" and "below V C 4" that the text refers to cannot be looked up.
  Neugebauer writes sexagesimal numbers like Toomer and refers to sections
  as "I B 2" (Book I, division B, § 2). The text is clean, but symbols are
  not: zodiac signs, Greek letters and the Babylonian column names come
  out as junk ("§", "cf2", "1Il"; the lunar function Φ as "41" or "<P").
- Voelkel is a short biography for young readers, a secondary source: use
  it for the outline of Kepler's work and dates, and check any precise
  claim elsewhere. It is not Kepler's *Astronomia Nova*, whose text is not
  in the library. The OCR mixes the figure captions into the text, adds
  junk lines where there are pictures, and has no page numbers.
- Prefer Fitzpatrick for formulas to implement; use Ptolemy and Copernicus for
  historical parameters, figures to reproduce and short quotations in the
  explanatory panels (keep quotations short and always attribute them). Use
  Neugebauer to understand and judge the ancient methods and parameters, and
  for the history before Ptolemy.

## Regenerating the references

The Markdown files are built by `tools/build_book_md.py` from the plain-text
extractions in `raw/`:

```bash
python3 tools/build_book_md.py --raw raw --out .claude/skills/astronomy-sources/references
```

`--books hama voelkel` rebuilds only some books; a book whose raw file is
missing is skipped. HAMA's raw file is `pdftotext -layout` of the Springer
PDF in the Internet Archive item
`ahistoryofancientmathematicalastronomypt1oneugebauer1975_932_G` (the
page breaks are needed for the page markers; the item's EPUB is unusable,
its OCR was run as Sanskrit).
