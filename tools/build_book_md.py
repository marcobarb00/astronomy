#!/usr/bin/env python3
"""
build_book_md.py
================

Converts the plain-text extractions of the three reference books of the
"celestial sphere simulator" project into Markdown files split by chapter,
ready to be used as the reference material of a Claude Code skill.

Input  (plain text, one file per book, e.g. produced with `pdftotext -layout`
        or exported from the claude.ai project):
    raw/toomer_almagest.txt        Ptolemy's Almagest, transl. G. J. Toomer
    raw/de_revolutionibus.txt      Copernicus, De Revolutionibus, transl. E. Rosen
    raw/modern_almagest.txt        R. Fitzpatrick, A Modern Almagest

Output:
    .claude/skills/astronomy-sources/references/<book>/...md
    .claude/skills/astronomy-sources/references/<book>/INDEX.md

Usage:
    python3 tools/build_book_md.py --raw raw --out .claude/skills/astronomy-sources/references

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
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--raw", default="raw", type=Path)
    parser.add_argument("--out", default=".claude/skills/astronomy-sources/references", type=Path)
    args = parser.parse_args()

    builders = [
        ("Almagest (Toomer)", build_toomer),
        ("De Revolutionibus (Rosen)", build_copernicus),
        ("A Modern Almagest (Fitzpatrick)", build_fitzpatrick),
    ]

    for label, builder in builders:
        files, missing = builder(args.raw, args.out)
        print(f"{label:35s} {files:4d} file   {missing:3d} capitoli non separati")


if __name__ == "__main__":
    main()
