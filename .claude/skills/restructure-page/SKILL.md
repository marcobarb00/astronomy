---
name: restructure-page
description: Revise the Fit, Test and Residual of an existing content page to the roles of STRUCTURE.md §5 (method-first Fit, Test of the modern model only, short Residual, the historical astronomer's fit and test in short history blocks). Use it for each page of the course that still follows the old five-part layout; page 3.3 is the reference.
---

# Restructure a page

Page 3.3 was the pilot (merged on 2026-11-08). Its Fit and Test had become
streams of facts and numbers; the rules that came out of it are in
STRUCTURE.md §5 and in DECISIONS.md ("Fit, Test and Residual narrowed").
This skill applies them to another page the same way, so every page is
planned, cut and reported alike.

## The rules, in short (STRUCTURE.md §5 has them in full)

- **Fit:** for each parameter, which observation fixes it and why that
  observation is the right one. The method first; the fitted values once,
  as the outcome.
- **Test:** the model fitted to the current period, against the reference
  sky, with the error curve: around the fit year, and over centuries or
  millennia when that shows something about the model. Tested once: not
  again in Hipparchus' or Ptolemy's time. Earlier models stay as ghosts.
- **Residual:** short prose, few numbers, what the model lacks and why,
  ending with the question for the next page.
- **History blocks** (`<div class="history">`, `templates/page.html`), at
  the end of the Fit and of the Test, two or three short paragraphs:
  - in the Fit, how the astronomer measured each parameter: the
    observation, the instrument, why that observation; the result in
    words, at most one number when the agreement is the point;
  - in the Test, how he checked his model and how it fared, in words, at
    most one or two numbers, no tables of his observations, no figures of
    his errors.
- Sections 1 and 2, the exercises (except additions agreed in the plan)
  and the mathematics are not touched.

## Phase 1: plan (no edits)

1. Read CLAUDE.md, STRUCTURE.md §5 and the page's entry in §4, WRITING.md,
   DECISIONS.md, and page 3.3's Fit and Test as the model to follow.
2. Read the page in full, its `page.js` and its script in
   `tools/numbers/`, and run the script.
3. Measure the page:
   `node tools/check/section-counts.js <folder>/index.html`.
4. Find what other pages cite from this one, so that a cut does not break
   them: search every `index.html` for "page N.N" and read each context.
5. Check the sources are readable with the `astronomy-sources` skill. A
   history block that describes how the astronomer measured needs them;
   without them, only shorten wording that is already on the page, and say
   so in the plan.
6. Give me, and wait for approval:
   - the new outline of sections 3 to 5: headings, subsections, one
     sentence each on what the reader takes away;
   - an inventory of every number and fact in sections 3 to 5, each with
     its destination (text, fold, exercise, read-out, history block, cut)
     and a few words of why;
   - what the two history blocks contain;
   - figure and table changes (removed, moved, restricted, new), and
     whether span presets change;
   - the changes to `page.js` and to the numbers script, and whether
     `golden.txt` and `readouts.txt` will change;
   - the citations from other pages that the cuts affect, and the fix;
   - before and after counts (estimated for after).

## Phase 2: implement

1. Branch from `restructure` with a name using `_`, e.g.
   `page_2_1_restructure` (the `preview-link` skill needs it).
2. Edit only the page, its numbers script and, if needed, `golden.txt`
   and `readouts.txt`, plus the page's entry in STRUCTURE.md §4. Ask
   before touching `shared/`, another page or a decision file.
3. Check that sections 1 and 2 and the exercises are byte-identical to
   the branch point (diff them).
4. Numbers: every number on the page still comes from the script
   (`check-numbers` skill). Delete the script's calculations that are no
   longer quoted, but keep the lines that support a claim made in words
   ("very close", "within a few arcminutes"). Regenerate `golden.txt`
   (`node tools/check/golden.js --write`) and review its diff: only the
   intended lines may change.
5. Checks: `npm run check`. The smoke test rewrites `readouts.txt` only
   on a full run (`node tools/check/smoke.js --update`); review its diff.
6. Run the `math-reviewer` and `writing-reviewer` agents on sections 3
   to 5, and fix what they find.
7. Look at the page in a browser at desktop and phone width, with no
   console errors.
8. Commit in Marco's name, then use the `preview-link` skill.

## Phase 3: report

- What changed, with the before and after counts from
  `section-counts.js --against restructure`.
- Anything from the plan changed while implementing, and why.
- What is left open: historical claims that could not be checked, stale
  text on other pages, questions for Marco.
