---
name: astronomy-sources
description: Primary sources for the celestial sphere simulator - Ptolemy's Almagest (Toomer), Copernicus' De Revolutionibus (Rosen) and Fitzpatrick's A Modern Almagest, split by chapter. Use it whenever a simulation or explanatory text needs historical models, parameters, definitions or quotations about the celestial sphere, celestial coordinates, equation of time, precession, solar/lunar/planetary models (eccentric, epicycle, equant, heliocentric), eclipses or the history of astronomy.
---

# Astronomy sources

Reference library for the project. The books are in `references/`, one Markdown
file per chapter, with an `INDEX.md` in each book folder.

| Folder | Book | Best for |
|---|---|---|
| `references/almagest-toomer/` | Ptolemy, *Almagest*, transl. G. J. Toomer (1984) | Historical geocentric models, original parameters, Ptolemy's own reasoning |
| `references/de-revolutionibus-rosen/` | Copernicus, *De Revolutionibus*, transl. E. Rosen | Heliocentric model, precession, Copernican parameters |
| `references/modern-almagest-fitzpatrick/` | R. Fitzpatrick, *A Modern Almagest* | Modern formulas, algorithms and worked examples ready to be coded |

## How to use the library

1. Open the `INDEX.md` of the relevant book to find the chapter (do not load
   whole books: some chapters, e.g. star catalogues and tables, are thousands
   of lines long).
2. For a specific term, search before reading:
   `grep -ril "equant" references/` or `grep -n "equation of time" references/*/*.md`.
3. Read only the chapter (or the part of it) that is needed.
4. When the content is used in the simulator, cite book, chapter and, for
   Copernicus, the folio marker, e.g. *Almagest* III 9, *De Rev.* III 26
   [f. 96r], Fitzpatrick § 5.4.

## Topic map

| Topic | Almagest (Toomer) | De Revolutionibus | Modern Almagest |
|---|---|---|---|
| Celestial sphere, the two motions | `book-01/03`–`08` | `book-1/01`–`11` | `02-spherical-astronomy.md` |
| Obliquity, declination, right ascension | `book-01/12`–`16` | `book-2/01`–`03` | `02-spherical-astronomy.md` |
| Latitude effects, rising times, ascensions | `book-02/` | `book-2/04`–`13` | `02-spherical-astronomy.md` |
| Length of the year, solar model | `book-03/01`–`08` | `book-3/13`–`24` | `05-the-sun.md` |
| Equation of time (inequality of days) | `book-03/09` | `book-3/26` | `05-the-sun.md` (§ 5.4) |
| Eccentric vs. epicycle equivalence | `book-03/03` | `book-3/15`, `book-5/03` | `04-geometric-planetary-orbit-models.md` |
| Moon, parallax | `book-04/`, `book-05/` | `book-4/` | `06-the-moon.md` |
| Eclipses | `book-06/` | `book-4/29`–`32` | `07-lunar-solar-syzygies-and-eclipses.md` |
| Fixed stars, precession, star catalogue | `book-07/`, `book-08/` | `book-2/14`, `book-3/01`–`12` | — |
| Planetary longitude models (equant) | `book-09/`–`book-11/` | `book-5/` | `08-…`, `09-…` |
| Retrogradation, stations, elongations | `book-12/` | `book-5/35`–`36` | `08-…`, `09-…` |
| Planetary latitudes | `book-13/` | `book-6/` | `10-planetary-latitudes.md` |
| Dates, Julian day, calendars | `00-introduzione-toomer.md` (§ 5d) | — | `03-dates.md` |
| Glossary and symbols | `00-introduzione-toomer.md` (§ 5f) | — | `11-glossary.md`, `12-index-of-symbols.md` |

(Paths are relative to each book folder; the chapter number is the file prefix.)

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
- Prefer Fitzpatrick for formulas to implement; use Ptolemy and Copernicus for
  historical parameters, figures to reproduce and short quotations in the
  explanatory panels (keep quotations short and always attribute them).

## Regenerating the references

The Markdown files are built by `tools/build_book_md.py` from the plain-text
extractions in `raw/`:

```bash
python3 tools/build_book_md.py --raw raw --out .claude/skills/astronomy-sources/references
```
