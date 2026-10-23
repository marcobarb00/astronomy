---
name: check-numbers
description: Check that every number on a page (prose, captions, keys, read-out examples, exercise answers) comes from the page's script in tools/numbers/ and matches its output. Use it after writing or changing a page's text or numbers, and before any commit that touches a page.
---

# Check the numbers

CLAUDE.md: no number is written from memory. Each page has a script,
`tools/numbers/N.N-<slug>.js`, that prints every number the page quotes, in
page order. This skill checks the page and the script agree.

## Steps

1. Run the page's script from the repository root and keep its output:
   `node tools/numbers/N.N-<slug>.js > <scratchpad>/numbers.txt`
2. List every number in the page's `index.html` that the reader sees:
   prose, `$…$` and `$$…$$` mathematics, captions, figure keys, margin
   notes, hints and answers. Leave out what is not a quantity (page and
   section numbers, figure numbers, years used only as names, the
   `data-*` attributes and slider bounds, which the checks cover).
3. For each number, find the line of the script's output it comes from.
   Then classify it:
   - **matches**: same value, at the precision the page shows;
   - **rounded**: the page rounds the script's value as WRITING.md §4
     allows (correct rounding, and never in an exercise answer);
   - **wrong**: a different value, or a rounding error;
   - **orphan**: no line of the output gives it.
4. A historical value (Ptolemy's year length, Copernicus' eccentricity) is
   not computed: it must cite its source (book and chapter). Check the
   citation exists; check the value against the text with the
   `astronomy-sources` skill.
5. Report in one table: number, where it is (section and a few words of
   context), class, script line. Wrong and orphan numbers first.

## Fixing

- For an orphan, add the computation to the script (in page order, with a
  comment saying what it is for), run it, and copy its output into the
  page. Never type the number by hand.
- For a wrong number, find out whether the page or the script is wrong.
  If the script is wrong, tell me before changing it: other numbers may
  depend on it.
- The output of `tools/numbers/` is part of `tools/check/golden.txt`.
  After changing a script, run `node tools/check/golden.js --check`, and
  regenerate with `--write` only for the lines that should change, in the
  same commit.
