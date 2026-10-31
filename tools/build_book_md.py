#!/usr/bin/env python3
"""
build_book_md.py
================

Converts the plain-text extractions of the reference books of the
"celestial sphere simulator" project into Markdown files split by chapter,
ready to be used as the reference material of a Claude Code skill.

Input  (plain text, one file per book, e.g. produced with `pdftotext -layout`
        or exported from the claude.ai project):
    raw/toomer_almagest.txt        Ptolemy's Almagest, transl. G. J. Toomer
    raw/de_revolutionibus.txt      Copernicus, De Revolutionibus, transl. E. Rosen
    raw/modern_almagest.txt        R. Fitzpatrick, A Modern Almagest
    raw/hama_neugebauer_pt1.txt    O. Neugebauer, A History of Ancient
                                   Mathematical Astronomy, Part One
                                   (`pdftotext -layout` of the Springer PDF:
                                   the page breaks must be kept)
    raw/voelkel_kepler.txt         J. R. Voelkel, Johannes Kepler and the
                                   New Astronomy (OCR text)

Output:
    .claude/skills/astronomy-sources/references/<book>/...md
    .claude/skills/astronomy-sources/references/<book>/INDEX.md

Usage:
    python3 tools/build_book_md.py --raw raw --out .claude/skills/astronomy-sources/references
    python3 tools/build_book_md.py --books hama voelkel     (only some books)

A book whose raw file is missing is skipped with a message.

The text comes from OCR / PDF extraction: it is NOT proof-read. Chapter
boundaries are detected with heuristics; when a heading cannot be found the
chapter stays inside the previous file and INDEX.md says so.
"""

import argparse
import re
from pathlib import Path


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------

def slugify(text, max_len=60):
    """Turns a chapter title into a short, file-system friendly slug."""
    text = text.lower()
    text = re.sub(r"[’'`]", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text[:max_len].rstrip("-") or "untitled"


def fix_ocr_spacing(text):
    """Repairs the most frequent OCR word splits found in the chapter titles."""
    fixes = {
        r"\bO n\b": "On",
        r"\bT h at\b": "That",
        r"\bT able\b": "Table",
        r"\bH ow\b": "How",
        r"\bm ean\b": "mean",
        r"\bm eridian\b": "meridian",
        r"\bprim ary\b": "primary",
        r"\bdifi'erent\b": "different",
        r"\bcom pute\b": "compute",
        r"\bw hat\b": "what",
        r"\banom aly\b": "anomaly",
        r"\bphenom ena\b": "phenomena",
        r"\babove-m entioned\b": "above-mentioned",
    }
    for pattern, replacement in fixes.items():
        text = re.sub(pattern, replacement, text)

    for broken, whole in [("determ ination", "determination"), ("dem onstration", "demonstration"),
                          ("Dem onstration", "Demonstration"), ("am ount", "amount"),
                          ("rearw ard", "rearward"), ("instm m ent", "instrument"),
                          ("m ethod", "method"), ("fii-st", "first"), ("lables", "tables"),
                          ("o i'a", "of a")]:
        text = text.replace(broken, whole)

    # Generic fixes: "T hat" -> "That", "M ercury" -> "Mercury" (not for "a", "I",
    # and not for the "s" of a possessive such as "moon’s epicycle").
    text = re.sub(r"(?<![’'\w])([B-HJ-Zb-z]) ([a-z]{2,})", r"\1\2", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def write_markdown(path, title, source_line, body):
    """Writes one chapter file with a small, uniform header."""
    path.parent.mkdir(parents=True, exist_ok=True)

    header = f"# {title}\n\n> {source_line}\n\n"
    path.write_text(header + body.strip() + "\n", encoding="utf-8")


def find_heading(lines, start, end, patterns):
    """
    Returns the index of the first line in [start, end) matching one of the
    compiled regular expressions in `patterns`, or None.
    """
    for i in range(start, end):
        for pattern in patterns:
            if pattern.search(lines[i]):
                return i
    return None


def write_index(out_dir, title, entries, notes):
    """Writes INDEX.md: list of files plus the chapters that were not split."""
    rows = [f"# {title} — indice dei capitoli\n"]

    for entry in entries:
        rows.append(f"- [{entry['label']}]({entry['file']})")

    if notes:
        rows.append("\n## Note sulla suddivisione\n")
        for note in notes:
            rows.append(f"- {note}")

    (out_dir / "INDEX.md").write_text("\n".join(rows) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# Ptolemy, Almagest (Toomer)
# ---------------------------------------------------------------------------

ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII",
         "VIII", "IX", "X", "XI", "XII", "XIII"]


def parse_toomer_toc(lines):
    """
    Parses "Contents of the Almagest". A chapter numbered 1 starts a new book.
    Returns a list (one item per book) of lists of chapter titles.
    """
    start = next(i for i, l in enumerate(lines) if l.startswith("Contents of the Almagest^"))
    end = next(i for i in range(start, len(lines)) if lines[i].startswith("T ranslation"))

    books = []
    current = None

    for line in lines[start:end]:
        match = re.match(r"^(\d+)\.\s+(.*)$", line.strip())

        if match:
            number = int(match.group(1))
            if number == 1:
                books.append([])
            current = [number, match.group(2)]
            books[-1].append(current)
        elif current is not None and line.strip() and not line.startswith(("B", "page", "‘", "by the", "that the", "5).")):
            # Continuation of a wrapped title.
            current[1] += " " + line.strip()

    cleaned = []
    for book in books:
        titles = []
        for number, title in book:
            title = re.sub(r"\s\d+\s+(Contents|In the text|’|‘).*$", "", title)  # running header / footnote
            title = re.sub(r"[\s,']*\d+\s*$", "", title)      # trailing page number
            title = re.sub(r"[\^*]+$", "", title)
            titles.append(fix_ocr_spacing(title))
        cleaned.append(titles)
    return cleaned


def build_toomer(raw_dir, out_root):
    lines = (raw_dir / "toomer_almagest.txt").read_text(encoding="utf-8").splitlines()
    out_dir = out_root / "almagest-toomer"
    toc = parse_toomer_toc(lines)
    source = "Ptolemy, *Almagest*, transl. G. J. Toomer (Duckworth 1984). Testo OCR non revisionato."

    # Book start lines ("Book I" ... ; Book VIII is missing in the OCR, use its ch. 1).
    book_starts = []
    for roman in ROMAN:
        if roman == "VIII":
            idx = find_heading(lines, 15000, len(lines),
                               [re.compile(r"^1 \{Tabular layout")])
        else:
            idx = find_heading(lines, 1700, len(lines),
                               [re.compile(rf"^Book {roman}\s*$")])
        book_starts.append(idx)

    appendix_start = find_heading(lines, 29000, len(lines), [re.compile(r"^Appendix A\s*$")])
    entries = []
    notes = []

    # Front matter: preface + introduction (before Book I).
    front = "\n".join(lines[:book_starts[0]])
    write_markdown(out_dir / "00-introduzione-toomer.md",
                   "Almagest — Preface and Introduction (Toomer)", source, front)
    entries.append({"label": "Prefazione e introduzione del traduttore",
                    "file": "00-introduzione-toomer.md"})

    for b, roman in enumerate(ROMAN):
        b_start = book_starts[b]
        b_end = book_starts[b + 1] if b + 1 < len(ROMAN) else appendix_start
        titles = toc[b] if b < len(toc) else []
        book_dir = f"book-{b + 1:02d}"

        # Locate each chapter heading sequentially ("N. {Title}").
        starts = []
        cursor = b_start
        for n, title in enumerate(titles, start=1):
            pattern = re.compile(rf"^\s*(H[\d—\-]+\s+)?{n}\s*[.,]?\s*[\{{\[\(]\s*[A-Z\[]")
            idx = find_heading(lines, cursor, b_end, [pattern])
            if idx is None:
                notes.append(f"Libro {roman}, cap. {n} «{title}»: intestazione non trovata, "
                             f"il testo è incluso nel file del capitolo precedente.")
                continue
            starts.append((n, title, idx))
            cursor = idx + 1

        if not starts or starts[0][2] != b_start:
            # Text between the book heading and the first detected chapter.
            first = starts[0][2] if starts else b_end
            if first > b_start and starts and starts[0][0] != 1 and titles:
                # The book heading is immediately followed by chapter 1.
                starts.insert(0, (1, titles[0], b_start))
                notes[:] = [x for x in notes if not x.startswith(f"Libro {roman}, cap. 1 ")]
            elif starts:
                starts[0] = (starts[0][0], starts[0][1], b_start)

        for k, (n, title, idx) in enumerate(starts):
            end = starts[k + 1][2] if k + 1 < len(starts) else b_end
            name = f"{book_dir}/{n:02d}-{slugify(title)}.md"
            write_markdown(out_dir / name,
                           f"Almagest, Book {roman}, ch. {n} — {title}",
                           source, "\n".join(lines[idx:end]))
            entries.append({"label": f"Libro {roman}, cap. {n}: {title}", "file": name})

    # Appendices, bibliography (the index of names is skipped: useless as reference).
    bib_start = find_heading(lines, appendix_start, len(lines), [re.compile(r"^Bibliography\s*$")])
    write_markdown(out_dir / "99-appendici.md", "Almagest — Appendices A–C (Toomer)",
                   source, "\n".join(lines[appendix_start:bib_start]))
    entries.append({"label": "Appendici A–C (esempi svolti, correzioni al testo, moti medi)",
                    "file": "99-appendici.md"})

    write_index(out_dir, "Ptolemy, Almagest (transl. Toomer)", entries, notes)
    return len(entries), len(notes)


# ---------------------------------------------------------------------------
# Copernicus, De Revolutionibus (Rosen)
# ---------------------------------------------------------------------------

BOOK_WORDS = ["One", "Two", "Three", "Four", "Five", "Six"]
FOOTER = re.compile(r"^\d+ Nicolaus Copernicus\. De Revolutionibus.*$")
PAGE_MARK = re.compile(r"\s*page (\d+[rv])(\[\*\*ILLUS\.\])?\s*")


def clean_copernicus(lines):
    """Removes page footers and turns the margin folio marks into [f. 12r]."""
    cleaned = []
    for line in lines:
        if FOOTER.match(line):
            continue
        line = PAGE_MARK.sub(lambda m: f" [f. {m.group(1)}]", line)
        cleaned.append(line)
    return cleaned


def parse_copernicus_toc(lines):
    """Parses the 'Index of topics': returns list of books, each a list of titles."""
    start = next(i for i, l in enumerate(lines) if l.startswith("Index of topics"))
    end = next(i for i in range(start, len(lines)) if lines[i].startswith("Nicolaus Copernicus [f. 1r]"))

    books = []
    current = None
    for line in lines[start:end]:
        text = line.strip()
        if re.match(r"^Book (One|Two|Three|Four|Five|Six)$", text):
            books.append([])
            current = None
            continue
        match = re.match(r"^(\d+)\.\s+(.*)$", text)
        if match and books:
            current = [int(match.group(1)), match.group(2)]
            books[-1].append(current)
        elif current is not None and text and not text[0].isdigit():
            current[1] += " " + text

    # Drop the "index N" margin references of the Octavo edition.
    return [[fix_ocr_spacing(re.sub(r"\s+index \d+", "", t)) for _, t in book] for book in books]


def build_copernicus(raw_dir, out_root):
    raw = (raw_dir / "de_revolutionibus.txt").read_text(encoding="utf-8").splitlines()
    lines = clean_copernicus(raw)
    out_dir = out_root / "de-revolutionibus-rosen"
    toc = parse_copernicus_toc(lines)
    source = ("Copernicus, *De Revolutionibus*, transl. E. Rosen (Octavo ed.). "
              "Il marcatore [f. 12r] indica il foglio dell'edizione di Norimberga 1543.")

    text_start = next(i for i, l in enumerate(lines) if l.startswith("Nicolaus Copernicus [f. 1r]"))

    book_starts = []
    cursor = text_start
    for word in BOOK_WORDS:
        idx = find_heading(lines, cursor, len(lines), [re.compile(rf"^Book {word}\s*$")])
        book_starts.append(idx)
        cursor = idx + 1

    entries = []
    notes = []

    write_markdown(out_dir / "00-prefazioni.md",
                   "De Revolutionibus — front matter (Osiander, Schönberg, dedication to Paul III)",
                   source, "\n".join(lines[:text_start]))
    entries.append({"label": "Note sulla traduzione, prefazione di Osiander, lettera di Schönberg, "
                             "dedica a Paolo III, indice degli argomenti",
                    "file": "00-prefazioni.md"})

    for b, word in enumerate(BOOK_WORDS):
        b_start = book_starts[b]
        b_end = book_starts[b + 1] if b + 1 < len(BOOK_WORDS) else len(lines)
        titles = toc[b] if b < len(toc) else []
        book_dir = f"book-{b + 1}"

        # Headings end with "Chapter N." (title on the same or the previous lines).
        starts = []
        cursor = b_start
        for n, title in enumerate(titles, start=1):
            patterns = [
                re.compile(rf"Chapter {n}\.?\s*$"),
                re.compile(rf"^Chapter {n}\b"),
            ]
            idx = find_heading(lines, cursor, b_end, patterns)
            if idx is None:
                notes.append(f"Libro {b + 1}, cap. {n} «{title}»: intestazione non trovata, "
                             f"il testo è incluso nel file del capitolo precedente.")
                continue
            starts.append((n, title, idx))
            cursor = idx + 1

        # Move each boundary back over the title lines that precede "Chapter N.".
        starts = [(n, title, idx - title_span(lines, idx, title)) for n, title, idx in starts]

        # The first chapter file also takes the book heading line.
        if starts:
            starts[0] = (starts[0][0], starts[0][1], b_start)

        for k, (n, title, idx) in enumerate(starts):
            end = starts[k + 1][2] if k + 1 < len(starts) else b_end
            name = f"{book_dir}/{n:02d}-{slugify(title)}.md"
            write_markdown(out_dir / name,
                           f"De Revolutionibus, Book {b + 1}, ch. {n} — {title}",
                           source, "\n".join(lines[idx:end]))
            entries.append({"label": f"Libro {b + 1}, cap. {n}: {title}", "file": name})

    write_index(out_dir, "Copernicus, De Revolutionibus (transl. Rosen)", entries, notes)
    return len(entries), len(notes)


def title_span(lines, heading_idx, title):
    """
    How many lines before `heading_idx` belong to the chapter title
    (titles can wrap over up to three lines before "Chapter N.").
    """
    words = set(re.findall(r"[a-z]{4,}", title.lower()))
    span = 0
    for back in range(1, 4):
        line = lines[heading_idx - back].lower()
        line_words = set(re.findall(r"[a-z]{4,}", line))
        if line_words and len(line_words & words) / len(line_words) >= 0.6:
            span = back
        else:
            break
    return span


# ---------------------------------------------------------------------------
# Fitzpatrick, A Modern Almagest
# ---------------------------------------------------------------------------

FITZ_CHAPTERS = [
    "Introduction", "Spherical Astronomy", "Dates", "Geometric Planetary Orbit Models",
    "The Sun", "The Moon", "Lunar-Solar Syzygies and Eclipses", "The Superior Planets",
    "The Inferior Planets", "Planetary Latitudes", "Glossary", "Index of Symbols", "Bibliography",
]


def build_fitzpatrick(raw_dir, out_root):
    raw = (raw_dir / "modern_almagest.txt").read_text(encoding="utf-8").splitlines()
    out_dir = out_root / "modern-almagest-fitzpatrick"
    source = "R. Fitzpatrick, *A Modern Almagest* (University of Texas at Austin). Testo estratto da PDF."

    # Drop running page headers such as "12 MODERN ALMAGEST" or "The Sun 77".
    header_re = re.compile(r"^(\d+ MODERN ALMAGEST|MODERN ALMAGEST|CONTENTS)$")
    running_re = re.compile(rf"^({'|'.join(map(re.escape, FITZ_CHAPTERS))}) \d+$")
    lines = [l for l in raw if not header_re.match(l.strip()) and not running_re.match(l.strip())]

    entries = []
    starts = []
    cursor = 0
    for n, title in enumerate(FITZ_CHAPTERS, start=1):
        idx = find_heading(lines, cursor, len(lines), [re.compile(rf"^{n} {re.escape(title)}\s*$")])
        starts.append((n, title, idx))
        cursor = idx + 1

    for k, (n, title, idx) in enumerate(starts):
        end = starts[k + 1][2] if k + 1 < len(starts) else len(lines)
        name = f"{n:02d}-{slugify(title)}.md"
        write_markdown(out_dir / name, f"A Modern Almagest, ch. {n} — {title}",
                       source, "\n".join(lines[idx + 1:end]))
        entries.append({"label": f"Cap. {n}: {title}", "file": name})

    write_index(out_dir, "Fitzpatrick, A Modern Almagest", entries, [])
    return len(entries), 0


# ---------------------------------------------------------------------------
# Neugebauer, A History of Ancient Mathematical Astronomy (HAMA), Part One
# ---------------------------------------------------------------------------

# Printed page = PDF page - offset. The offset changes at the title pages of
# Book I and Book II, and at the blank pages after them, which are not in
# the scan. Pages before PDF page 22 are front matter (Roman numerals).
HAMA_PAGE_OFFSETS = [(22, 21), (41, 20), (364, 19), (365, 18)]
HAMA_FIRST_PAGE = 22

# The divisions of Part One and their sections (§), with the printed page
# where each section starts, from the table of contents. `book_heading` is
# the title line of the book that opens before the division, if any.
HAMA_DIVISIONS = [
    {"folder": "intro", "book": "Introduction", "letter": "", "title": "Introduction",
     "book_heading": None,
     "sections": [(1, "Limitations", 1),
                  (2, "The Major Historical Periods, An Outline", 2),
                  (3, "General Bibliography", 15)]},
    {"folder": "book-1", "book": "I", "letter": "A", "title": "Spherical Astronomy",
     "book_heading": r"^\s*Book I\s*$",
     "sections": [(1, "Plane Trigonometry", 21),
                  (2, "Spherical Trigonometry", 26),
                  (3, "Equatorial and Ecliptic Coordinates", 30),
                  (4, "Geographical Latitude; Length of Daylight", 34),
                  (5, "Ecliptic and Horizon Coordinates", 45)]},
    {"folder": "book-1", "book": "I", "letter": "B", "title": "Lunar Theory",
     "book_heading": None,
     "sections": [(1, "Solar Theory", 53),
                  (2, "Equation of Time", 61),
                  (3, "Theory of the Moon. First Inequality; Latitude", 68),
                  (4, "Theory of the Moon. Second Inequality", 84),
                  (5, "Parallax", 100),
                  (6, "Theory of Eclipses", 118)]},
    {"folder": "book-1", "book": "I", "letter": "C", "title": "Planetary Theory",
     "book_heading": None,
     "sections": [(1, "Introduction", 145),
                  (2, "Venus", 152),
                  (3, "Mercury", 158),
                  (4, "The Ptolemaic Theory of the Motion of an Outer Planet", 170),
                  (5, "Planetary Tables", 183),
                  (6, "Theory of Retrogradation", 190),
                  (7, "Planetary Latitudes", 206),
                  (8, "Heliacal Phenomena (\"Phases\")", 230)]},
    {"folder": "book-1", "book": "I", "letter": "D", "title": "Apollonius",
     "book_heading": None,
     "sections": [(1, "Biographical Data", 262),
                  (2, "Equivalence of Eccenters and Epicycles", 263),
                  (3, "Planetary Motion; Stationary Points", 267)]},
    {"folder": "book-1", "book": "I", "letter": "E", "title": "Hipparchus",
     "book_heading": None,
     "sections": [(1, "Introduction", 274),
                  (2, "Fixed Stars. The Length of the Year", 277),
                  (3, "Trigonometry and Spherical Astronomy", 299),
                  (4, "Solar Theory", 306),
                  (5, "The Theory of the Moon", 308),
                  (6, "Additional Topics", 329),
                  (7, "Hipparchus' Astronomy. Summary", 339)]},
    {"folder": "book-2", "book": "II", "letter": "", "title": "Introduction",
     "book_heading": r"^\s*Book II\s*$",
     "sections": [(1, "The Decipherment of the Astronomical Texts", 348),
                  (2, "The Sources", 351),
                  (3, "Calendaric Concepts", 353),
                  (4, "Length of Daylight", 366),
                  (5, "Solar Motion", 371),
                  (6, "Mathematical Methodology", 373)]},
    {"folder": "book-2", "book": "II", "letter": "A", "title": "Planetary Theory",
     "book_heading": None,
     "sections": [(1, "Basic Concepts", 380),
                  (2, "Periods and Mean Motions", 388),
                  (3, "System A", 392),
                  (4, "Dates", 394),
                  (5, "Subdivision of the Synodic Arc; Daily Motion", 397),
                  (6, "The Fundamental Patterns of Planetary Theory", 420),
                  (7, "The Single Planets", 434)]},
    {"folder": "book-2", "book": "II", "letter": "B", "title": "Lunar Theory",
     "book_heading": None,
     "sections": [(1, "Introduction", 474),
                  (2, "Lunar Velocity", 476),
                  (3, "The Length of the Synodic Months", 482),
                  (4, "The \"Saros\" and Column Φ", 497),
                  (5, "Lunar Latitude", 514),
                  (6, "Eclipse Magnitudes", 521),
                  (7, "Eclipse Tables", 525),
                  (8, "Solar Mean Motion and Length of Year", 528),
                  (9, "Variable Solar Velocity", 530),
                  (10, "Visibility", 533)]},
    {"folder": "book-2", "book": "II", "letter": "C", "title": "Early Babylonian Astronomy",
     "book_heading": None,
     "sections": [(1, "Calendaric Data, Celestial Coordinates", 541),
                  (2, "The Moon", 547),
                  (3, "The Planets", 553)]},
]


def hama_printed_page(pdf_page):
    """Printed page number of a PDF page (None for the front matter)."""
    if pdf_page < HAMA_FIRST_PAGE:
        return None

    offset = HAMA_PAGE_OFFSETS[0][1]
    for first, value in HAMA_PAGE_OFFSETS:
        if pdf_page >= first:
            offset = value
    return pdf_page - offset


def hama_pdf_page(printed):
    """PDF page of a printed page (inverse of hama_printed_page)."""
    for first, offset in reversed(HAMA_PAGE_OFFSETS):
        if printed + offset >= first:
            return printed + offset
    return printed + HAMA_PAGE_OFFSETS[0][1]


def is_hama_running_header(line, printed):
    """
    True for the running header at the top of a page, e.g.
    "54        I B 1, 1. Length of the Year" or
    "      I B 1, 2. Solar Mean Motion        55".
    The header carries the page number at one end, or (when the OCR lost
    it) a section reference such as "I B 3," or "II A 6.".
    """
    text = line.strip()
    if not text or len(text) > 90:
        return False

    number = re.escape(str(printed))
    if re.match(rf"^{number}\s{{2,}}\S", text) or re.search(rf"\S\s{{2,}}{number}$", text):
        return True

    # Damaged page number ("S28" for 528) or none at all: look for the
    # section reference that every running header contains.
    reference = r"(I{1,2}|l|II)\s?(Intr\.|[A-E]|[a-e]|[A-E][IlI\d])\s?[IlI\d]*[,.]?"
    return bool(re.match(rf"^(\S{{1,4}}\s{{2,}})?{reference}\s", text)) and "§" not in text


def hama_pages_to_lines(pages):
    """
    Joins the pages into one list of lines. The running header of every
    numbered page is replaced by a page marker "[p. 61]". Returns the lines
    and, for each line, the PDF page it comes from.
    """
    lines = []
    page_of_line = []

    for pdf_page, page in enumerate(pages, start=1):
        printed = hama_printed_page(pdf_page)
        page_lines = [l.rstrip() for l in page.splitlines()]
        if not any(page_lines):
            continue

        if printed is not None:
            lines.append(f"[p. {printed}]")
            page_of_line.append(pdf_page)

            # Drop the running header (the first non-empty line).
            first = next((i for i, l in enumerate(page_lines) if l.strip()), None)
            if first is not None and is_hama_running_header(page_lines[first], printed):
                del page_lines[first]

        for line in page_lines:
            lines.append(line)
            page_of_line.append(pdf_page)

    return lines, page_of_line


def find_hama_heading(lines, page_of_line, pdf_pages, patterns, after=0):
    """
    Index of the first line (from `after` on) on one of `pdf_pages` that
    matches one of the regular expressions in `patterns`, or None.
    """
    for i in range(after, len(lines)):
        if page_of_line[i] > max(pdf_pages):
            break
        if page_of_line[i] in pdf_pages:
            for pattern in patterns:
                if re.search(pattern, lines[i]):
                    return i
    return None


def hama_section_patterns(number, title):
    """
    Regular expressions for a centred heading "§ 3. Mercury". The OCR
    sometimes reads 1 as I or l and drops the space after §; the first
    letters of the title are required, to skip references in the text.
    """
    digits = "[1Il]" if number == 1 else str(number)
    word = re.match(r"\W*(\w{1,3})", title).group(1)
    return [rf"^\s{{4,}}§\s*{digits}\s*\.\s*\W?{re.escape(word)}"]


def collapse_blank_lines(text):
    """Leaves at most two consecutive empty lines."""
    return re.sub(r"\n{4,}", "\n\n\n", text)


def build_hama(raw_dir, out_root):
    text = (raw_dir / "hama_neugebauer_pt1.txt").read_text(encoding="utf-8")
    pages = text.split("\f")
    lines, page_of_line = hama_pages_to_lines(pages)
    out_dir = out_root / "hama-neugebauer"
    source = ("O. Neugebauer, *A History of Ancient Mathematical Astronomy*, Part One "
              "(Springer 1975). Testo estratto da PDF, non revisionato. "
              "Il marcatore [p. 61] indica la pagina dell'edizione a stampa.")

    entries = []
    notes = []

    # Every section: (division, number, title, first printed page, start line).
    starts = []
    cursor = 0
    for division in HAMA_DIVISIONS:
        for k, (number, title, printed) in enumerate(division["sections"]):
            pdf = hama_pdf_page(printed)
            window = [pdf - 1, pdf, pdf + 1]
            idx = find_hama_heading(lines, page_of_line, window,
                                    hama_section_patterns(number, title), cursor)

            if idx is None:
                # Start at the marker of the page given by the table of contents.
                idx = lines.index(f"[p. {printed}]", cursor)
                notes.append(f"{hama_label(division, number, title)}: intestazione non "
                             f"trovata, il file inizia all'inizio di p. {printed}.")

            if k == 0:
                idx = hama_division_start(lines, page_of_line, division, pdf, cursor, idx)

            starts.append((division, number, title, printed, idx))
            cursor = idx + 1

    # Front matter: title pages, preface and table of contents of the whole work.
    write_markdown(out_dir / "00-front-matter.md",
                   "A History of Ancient Mathematical Astronomy — front matter",
                   source, collapse_blank_lines("\n".join(lines[:starts[0][4]])))
    entries.append({"label": "Frontespizio, prefazione, indice generale delle tre parti",
                    "file": "00-front-matter.md"})

    for k, (division, number, title, printed, idx) in enumerate(starts):
        end = starts[k + 1][4] if k + 1 < len(starts) else len(lines)
        body = lines[idx:end]

        # A section that starts in the middle of a page opens with the
        # marker of that page, so that every line can be cited.
        first_page = hama_printed_page(page_of_line[idx])
        if not body[0].startswith("[p. "):
            body.insert(0, f"[p. {first_page}]")
        last_page = hama_printed_page(page_of_line[end - 1])

        prefix = (division["letter"] or "i").lower()
        name = f"{division['folder']}/{prefix}{number}-{slugify(title.replace('Φ', 'Phi'))}.md"
        pages_label = f"pp. {printed}–{last_page}" if last_page > printed else f"p. {printed}"

        write_markdown(out_dir / name,
                       f"HAMA, {hama_reference(division, number)} — {title} ({pages_label})",
                       source, collapse_blank_lines("\n".join(body)))
        entries.append({"label": f"{hama_label(division, number, title)} ({pages_label})",
                        "file": name})

    write_index(out_dir, "Neugebauer, A History of Ancient Mathematical Astronomy, Part One",
                entries, notes)
    return len(entries), len(notes)


def hama_division_start(lines, page_of_line, division, pdf, cursor, section_idx):
    """
    The first section of a division also takes the division heading
    ("B. Lunar Theory", with its epigraph) and, for the first division of
    a book, the title page of the book.
    """
    start = section_idx
    word = re.escape(division["title"].split()[0])

    if division["letter"]:
        heading = rf"^\s{{4,}}{division['letter']}\.\s+{word}"
    else:
        heading = rf"^\s{{4,}}{word}\s*$"
    idx = find_hama_heading(lines, page_of_line, [pdf - 1, pdf], [heading], cursor)
    if idx is not None and idx < start:
        start = idx

    if division["book_heading"]:
        idx = find_hama_heading(lines, page_of_line, [pdf - 3, pdf - 2, pdf - 1, pdf],
                                [division["book_heading"]], cursor)
        if idx is not None and idx < start:
            start = idx

    # Begin at the page marker when the heading is the first text of its page.
    while start > cursor and not lines[start - 1].strip():
        start -= 1
    if start > cursor and lines[start - 1].startswith("[p. "):
        start -= 1
    return start


def hama_reference(division, number):
    """Neugebauer's own reference, e.g. "I B 2" or "II Intr. 3"."""
    if division["book"] == "Introduction":
        return f"Introduction § {number}"
    letter = division["letter"] or "Intr."
    return f"{division['book']} {letter} {number}"


def hama_label(division, number, title):
    """Label of a section in INDEX.md, e.g. "Libro I, B (Lunar Theory) § 2: ..."."""
    if division["book"] == "Introduction":
        return f"Introduzione, § {number}: {title}"
    part = f"{division['letter']} ({division['title']})" if division["letter"] else "Introduction"
    return f"Libro {division['book']}, {part} § {number}: {title}"


# ---------------------------------------------------------------------------
# Voelkel, Johannes Kepler and the New Astronomy
# ---------------------------------------------------------------------------

# Chapters in order: (file name, title, regular expression of the first
# title line). The text before the first one is the front matter; the text
# from VOELKEL_END on (index, picture credits) is left out.
VOELKEL_CHAPTERS = [
    ("01-the-comet.md", "Chapter 1 — The Comet", r"^The Comet\s*$"),
    ("02-the-secret-of-the-universe.md", "Chapter 2 — The Secret of the Universe",
     r"^The Secret of the\s*$"),
    ("03-the-new-astronomy.md", "Chapter 3 — The New Astronomy", r"^The New\s*$"),
    ("04-the-harmony-of-the-world.md", "Chapter 4 — The Harmony of the World",
     r"^The Harmony of\s*$"),
    ("05-witch-trial.md", "Chapter 5 — Witch Trial", r"^Witch Trial\s*$"),
    ("06-the-dream.md", "Chapter 6 — The Dream", r"^The Dream\s*$"),
    ("07-epilogue-vindication.md", "Epilogue — Vindication", r"^Vindication\s*$"),
    ("08-chronology.md", "Chronology", r"^CHRONOLOGY\s*$"),
    ("09-further-reading.md", "Further Reading", r"^FURTHER\s*$"),
]
VOELKEL_END = r"^Page numbers in italics"

# The sidebars (boxed explanations) and the chapter that contains them.
VOELKEL_SIDEBARS = [
    ("Copernicus's Model of Retrograde Motion", "01-the-comet.md"),
    ("The Platonic Solids", "02-the-secret-of-the-universe.md"),
    ("Uraniborg Observatory", "03-the-new-astronomy.md"),
    ("Kepler's First Two Laws", "03-the-new-astronomy.md"),
    ("Kepler's Third Law", "04-the-harmony-of-the-world.md"),
]


def is_voelkel_running_header(line, chapter_title):
    """
    True for the running headers of the book: "CHAPTER", "Johannes Kepler"
    on the left pages (often with OCR noise: "Mi Johannes Kepler",
    "MM Jotharnes: Ke pl re") and the chapter title on the right pages
    ("The Comet Ij").
    """
    text = line.strip()
    if text == "CHAPTER":
        return True
    if re.match(r"^\S{0,3}\s*[Jj]o\s?t?h\s?a\s?r?n+es:?\s+Ke\s?p\s?\w*\s*\w*\s*$", text):
        return True

    short_title = chapter_title.split("—")[-1].strip()
    return bool(re.match(rf"^{re.escape(short_title)}(\s+\S{{1,3}})?$", text))


def build_voelkel(raw_dir, out_root):
    raw = (raw_dir / "voelkel_kepler.txt").read_text(encoding="utf-8")
    lines = [l.rstrip() for l in raw.splitlines()]
    out_dir = out_root / "kepler-voelkel"
    source = ("J. R. Voelkel, *Johannes Kepler and the New Astronomy* (Oxford University "
              "Press 1999, Oxford Portraits in Science). Testo OCR non revisionato; "
              "le didascalie delle figure sono mescolate al testo.")

    # Chapter boundaries, found in order.
    starts = []
    cursor = 0
    for name, title, pattern in VOELKEL_CHAPTERS:
        idx = find_heading(lines, cursor, len(lines), [re.compile(pattern)])
        starts.append((name, title, idx))
        cursor = idx + 1
    end_of_text = find_heading(lines, cursor, len(lines), [re.compile(VOELKEL_END)])

    entries = []
    write_markdown(out_dir / "00-front-matter.md",
                   "Johannes Kepler and the New Astronomy — front matter and contents",
                   source, collapse_blank_lines("\n".join(lines[:starts[0][2]])))
    entries.append({"label": "Frontespizio e indice", "file": "00-front-matter.md"})

    for k, (name, title, idx) in enumerate(starts):
        end = starts[k + 1][2] if k + 1 < len(starts) else end_of_text
        body = [lines[idx]] + [l for l in lines[idx + 1:end]
                               if not is_voelkel_running_header(l, title)]
        write_markdown(out_dir / name, f"Johannes Kepler and the New Astronomy, {title}",
                       source, collapse_blank_lines("\n".join(body)))

        sidebars = [s for s, file in VOELKEL_SIDEBARS if file == name]
        label = title + (f" (riquadri: {'; '.join(sidebars)})" if sidebars else "")
        entries.append({"label": label, "file": name})

    notes = ["L'indice analitico e i crediti delle immagini non sono stati inclusi.",
             "Le didascalie che aprono un capitolo restano in fondo al file del "
             "capitolo precedente."]
    write_index(out_dir, "Voelkel, Johannes Kepler and the New Astronomy", entries, notes)
    return len(entries), 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

# Builders: (option name, label, raw file, function).
BUILDERS = [
    ("toomer", "Almagest (Toomer)", "toomer_almagest.txt", build_toomer),
    ("copernicus", "De Revolutionibus (Rosen)", "de_revolutionibus.txt", build_copernicus),
    ("fitzpatrick", "A Modern Almagest (Fitzpatrick)", "modern_almagest.txt", build_fitzpatrick),
    ("hama", "HAMA, Part One (Neugebauer)", "hama_neugebauer_pt1.txt", build_hama),
    ("voelkel", "Kepler and the New Astronomy (Voelkel)", "voelkel_kepler.txt", build_voelkel),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--raw", default="raw", type=Path)
    parser.add_argument("--out", default=".claude/skills/astronomy-sources/references", type=Path)
    parser.add_argument("--books", nargs="*", choices=[b[0] for b in BUILDERS],
                        help="books to build (default: all)")
    args = parser.parse_args()

    for key, label, raw_name, builder in BUILDERS:
        if args.books and key not in args.books:
            continue
        if not (args.raw / raw_name).exists():
            print(f"{label:40s} saltato: manca {args.raw / raw_name}")
            continue

        files, missing = builder(args.raw, args.out)
        print(f"{label:40s} {files:4d} file   {missing:3d} capitoli non separati")


if __name__ == "__main__":
    main()
