# Predicting the Sky · Writing

How the site's prose should read. STYLE.md covers how it looks; this file
covers how it sounds. Follow it for every new page, and when revising old ones.

The model is a good teacher at a blackboard, writing a careful textbook for
a reader who knows mathematics and is new to astronomy: precise, unhurried,
a little warm, and always clear about *why* the next step is worth taking.

---

## 1. Voice

- **Use "we"** for the work the reader and the author do together: "we can
  now predict…", "we need the Sun's declination", "we'll check this on one
  date". Use **"you"** for what the reader does with the page: "press play",
  "move the latitude", "try your own city".
- **Not the model, the formula, or the clock as the subject of every
  sentence.** "The formula gives θ = 26.44°" is fine once; a page full of
  "the model makes", "the clock gives", "the same clock gives" sounds like a
  machine describing itself.
- **Light contractions are fine** ("we'll", "doesn't", "isn't") where they
  read naturally. Don't force them into mathematics.

## 2. Say why before what

Each section and most paragraphs should open with the reason the reader is
about to do something, in plain words, then do it. Never open with a plan.

| Too rigid | Better |
|---|---|
| "Four steps lead from one to the other. Each is checked on one moment, 20 April 2026 at 20:00 UT, at Greenwich." | "Getting from one to the other takes a few short steps. To make sure each one is right, we'll follow a single moment through all of them: 20 April 2026, 20:00 UT, at Greenwich." |
| "Section 4 tests both against the real sky." | (Cut. The reader will reach section 4.) |

Don't announce what a section will contain, list its steps in advance, or
promise that something "will be given later". If a value is needed later,
give it where it's needed.

## 3. Rhythm

- **Vary sentence length.** The current pages are built from short,
  flat statements of equal weight ("The model keeps the turning sky of
  page 1.1. Their turn takes one sidereal day."). Join ideas that belong
  together; let an important sentence be long if the thought is long.
- **No verdict sentences.** Avoid short aphoristic openers that announce
  a conclusion before the argument: "The rate has a simple meaning.",
  "The reason is the uniform Sun.", "The Sun keeps the clock's 24 hours,
  but only on average." Say the thing itself.
- **Fewer colons and semicolons.** One per paragraph is plenty. A colon
  chain ("…: a great circle tilted by ε to the equator, so it is centred
  on its own pole K: …") is a sign the sentence should be two.
- **Transitions that carry meaning**: "so", "but", "this is why", "now
  that…", "it turns out that". Not "Then", "Here", "Thus" at the start of
  every paragraph.

## 4. Numbers

- **Give the precision the point needs.** "23 h 56 min 4 s" in the text;
  "23 h 56 min 04.091 s" only where the decimals are the point (the
  comparison with Ptolemy's value, an exercise answer).
- **One precise number per idea.** "About four minutes earlier each night,
  almost two hours over a month" says more than three values to the
  hundredth of a second.
- Every number still comes from a script (CLAUDE.md). Rounding for the
  text is fine; the script keeps the full value.

## 5. Sources and history

- **A quotation or historical fact must do work.** Quote Ptolemy when his
  words show how he thought, or when the reader will want the exact
  phrase. Don't stack a second source that says the same thing.
- **Connect an aside to the argument**, or cut it. Not a list of facts
  dropped in after a citation.

| Artificial | Better |
|---|---|
| "Copernicus lists the other customs: the day began at sunrise for the Babylonians, at sunset for the Athenians, at midnight for the Romans and at noon for the Egyptians (*De Revolutionibus* III 26)." | "Noon was not an obvious choice. Every people started its day somewhere else: the Babylonians at sunrise, the Athenians at sunset, the Romans at midnight, as Copernicus recalls (*De Revolutionibus* III 26). Astronomers chose noon for Ptolemy's reason, and the Julian Date still does." (Or cut it.) |

- **Cross-references sparingly.** "(page 1.2)" after every term makes the
  text read like an index. Refer back when the reader genuinely needs to
  look something up, and then say what they'll find: "the conversion
  formula of page 1.2".

## 6. Lead into the mathematics

Before a derivation, say in a sentence what we want and why. After it, say
what it means, if that's not obvious.

| Artificial | Better |
|---|---|
| "The same clock gives the times of sunrise and sunset, once the Sun's declination is known. The model makes the simplest assumption: the Sun moves uniformly along the ecliptic, at the mean longitude, λ = λ̄. Page 1.2 then gives its declination:" | "Now that we can read the sky's angle from a clock, we can predict when the Sun rises and sets. For that we need its declination, and we'll start with the simplest Sun there is: one that moves along the ecliptic at a constant rate, so that its longitude is always the mean longitude, λ = λ̄. Its declination then follows from the conversion formula of page 1.2:" |

## 7. Figures

The reader looks at the figure first. The text around it should help them
see, not re-describe everything.

- **Label things in the figure itself** (P, γ, Vega, N, S) and leave them out
  of the key. A key entry is only for what a label can't say: what a colour
  or line style means, which way an angle is counted, what a band shows.
- **Aim for three to five key entries.** Never more than seven. Drop
  entries that restate the caption or the obvious ("circle: the celestial
  equator" when the circle is labelled; "dashed: the date under the
  pointer").
- **The caption says what to do and what to notice**, in two or three
  sentences: "Press play and watch the arcs θ and H grow together while α
  stays fixed."
- **Read-outs** need a key only for symbols not defined in the text.

Example, page 1.3 Figure 2. Nine key entries become two, because P, the
meridian, the mean Sun and γ are labelled in the figure:

> **H<sub>m</sub>, θ<sub>G</sub>** · counted westward from the meridian
> (clockwise in this view)
> **α<sub>m</sub>** · counted eastward from γ

## 8. Patterns to avoid

A checklist for revision. Each one is a habit that makes the text sound
generated.

1. Announcing a plan: "Four steps lead…", "This page computes…", "Section 4
   tests…".
2. Promising: "will be given later", "is explained below".
3. Short verdict sentences before the content ("The reason is X.").
4. "The model / the formula / the clock" as the subject of sentence after
   sentence.
5. Colon and semicolon chains.
6. Every number to full precision.
7. A cross-reference in parentheses after every other term.
8. A second quotation that adds nothing to the first.
9. Lists of facts attached to a citation, with no link to the argument.
10. Figure keys that list everything visible.
11. The same sentence shape repeated: "X is Y. It does Z. That is W."
12. "Not X, but Y" and "X, not Y" framings where a plain statement works.

## 9. What stays the same

- The mathematics, the numbers (rounded for prose as in §4), and the
  sources.
- The page structure: observation, model, fit, test, residual
  (STRUCTURE.md §5), and the section headings unless a heading is itself
  stiff.
- Exercises keep their exact numbers in the answers.
