# Historical claims ledger

A permanent record of the historical claims on the pages (who did what,
values an author used, dates, observations, quotations, origin notes), each
checked once against the sources, so that a later fact-check only looks at
what changed. It is a development tool: the site does not load it.

| File | Contents |
|---|---|
| `claims.json` | The ledger: one entry per checked claim. |
| `no-claim.json` | Sentences that `diff.js` flags but that were reviewed and hold no historical claim. |
| `sources.json` | For each work, the chapter files used, so the next run goes straight to them. |
| `diff.js` | Compares the pages with the ledger (no dependencies). |

The audit of 2026-10-31 set up these files but stopped before checking any claim, so the ledger is still empty (`audit/AUDIT-facts.md`).

## Running the check

From the repository root:

```
node tools/facts/diff.js
```

It prints four lists:

- **NEW**: sentences that look historical and match no ledger entry and no
  reviewed sentence. `diff.js` cannot tell what a historical claim is, so it
  flags every sentence with a year (128 BC, AD 139, or four digits from 1000
  to 2099), a name from its list (Hipparchus, Ptolemy, Copernicus, Tycho,
  Kepler, Timocharis, al-Battani, the *Almagest*, Meeus, …), one of the words
  "observed", "wrote", "used", "recorded", "according to", "century", a
  quotation of three words or more, or an origin note. It over-flags on
  purpose.
- **CHANGED**: entries whose sentence is no longer on its page while a
  similar one is (word overlap of at least half): the text was edited, and
  the claim must be checked again.
- **REMOVED**: entries whose sentence is gone from its page.
- **UNRESOLVED**: entries whose status is not `confirmed`.

`--strict` exits with 1 when there is anything NEW or CHANGED (for a check
before a commit). `--dump <folder>` also writes, for each page, every
sentence with its hash and flags (`<page>.json`): the input of a fact-check.

## How a page is read

`diff.js` reads the hub, every `act*/*/index.html` and
`beyond-kepler/index.html`. It drops comments, `<head>`, scripts, styles,
canvases and SVG, and splits the rest into blocks at block-level tags
(paragraphs, list items, captions, key entries, table rows). A block is cut
into sentences at a full stop, question or exclamation mark followed by a
capital, never inside `$…$` mathematics and never after an abbreviation
("transl.", "e.g.", "De Rev.", "p.") or an initial ("G. J. Toomer"). Two
kinds of block are kept whole:

- a table row, its cells joined by ` | `;
- an origin note, `<div class="note" data-origin="ptolemy">`, which becomes
  `[origin: ptolemy] <first sentence of the paragraph beside it>`.

Key entries become `dt · dd`. Headings are not claims; they give each
sentence its `section`.

## Format of `claims.json`

```json
{
	"format": 1,
	"generated": "2026-10-31",
	"claims": [ { … }, … ]
}
```

One entry per claim. A sentence that holds several claims has several
entries with the same `text_hash`.

| Field | Meaning |
|---|---|
| `id` | `p<page>-<nnn>`, e.g. `p2.3-007` (the hub is `phub-…`). Never reused: a removed claim keeps its number retired, and a new claim takes the next free number on its page. |
| `page` | The page file, e.g. `act2-sun/03-precession/index.html`. |
| `section` | The `h2` (and `h3`) the sentence is under. |
| `claim` | One checkable statement, in the checker's words. |
| `sentence` | The page's sentence, normalised, as `diff.js` reads it. |
| `kind` | `attribution`, `value`, `date`, `observation`, `quotation` or `origin`. |
| `text_hash` | SHA-1 (hex) of the normalised sentence: Unicode NFC, curly quotes made straight, non-breaking and thin spaces made plain, runs of white space made one space, trimmed (`normalise` in `diff.js`). |
| `cited` | What the page cites for the claim ("Almagest VII 2"), or `null`. |
| `status` | See below. |
| `source` | `{ work, locator, file, passage }`: the work, the chapter with its page mark (Toomer's Heiberg pages "H 13", Rosen's folios "f. 64r", Neugebauer's printed pages "p. 61", Fitzpatrick's sections), the chapter file relative to the library root, and a short paraphrase (no long quotation). `null` only for `could_not_verify`. |
| `note` | What differs, why it is disputed, or what was searched. |
| `checked` | The date of the check. |
| `checked_by` | Who checked it, e.g. `claude, claude-opus-5-5`. |

### Status values

| Status | Meaning |
|---|---|
| `confirmed` | The source says it, and the page's citation (if any) points to the right book and chapter. |
| `citation_wrong` | The claim is right but the cited book or chapter is not where it is. |
| `citation_missing` | The claim is right, but neither the sentence, its paragraph nor a margin note beside it cites a book and chapter (WRITING.md §5, STRUCTURE.md §7.1). |
| `value_differs` | A number, date, name or wording differs from the source. Quotations are checked word for word against the translation named. |
| `not_in_source` | The cited source does not contain it, and it was not found elsewhere in the library. |
| `disputed` | The library's sources (Toomer's notes, Neugebauer) say it is debated, and the page states it as settled or without the "Debated" origin. |
| `could_not_verify` | The passage was not found, or the work is not in the library (Meeus, Standish, NASA's canons, Galileo, Newton…). Never filled from memory. |

## Format of `no-claim.json`

```json
{ "format": 1, "sentences": [ { "page": "…/index.html", "text_hash": "…", "text": "…" } ] }
```

A sentence `diff.js` flags but that holds no historical claim (a modern
year such as "in 2026", a page that "uses" a formula). It is not reported
again while its text is unchanged. `diff.js` reports how many of these are
no longer on their page; they can be dropped.

## Format of `sources.json`

```json
{
	"format": 1,
	"library": "C:/dev/astronomy_reference/.claude/skills/astronomy-sources/references",
	"works": [
		{ "work": "Toomer Almagest", "folder": "almagest-toomer", "chapters": [ { "file": "…", "chapter": "Almagest VII 2", "pages": "H 12–H 16" } ] }
	]
}
```

The library is the `astronomy-sources` skill (`.claude/skills/astronomy-sources/`).
The copy in this repository has only Toomer, Rosen and Fitzpatrick; the copy
in the `astronomy_reference` repository also has Neugebauer's *HAMA* and
Voelkel. The chapter files are not committed (DECISIONS.md, Workflow).

## A later check, step by step

1. `node tools/facts/diff.js --dump <scratch folder>`.
2. For each **CHANGED** entry, check the claim again on the new sentence;
   update `sentence`, `text_hash`, `claim`, `status`, `source`, `checked`
   and `checked_by`, and keep the `id`.
3. For each **REMOVED** entry, delete it from `claims.json` (its `id` is not
   reused).
4. For each **NEW** sentence, either add one entry per claim (next free
   `id` on its page), checked against the sources in `sources.json`, or add
   the sentence to `no-claim.json` if it holds no historical claim.
5. Look again at the **UNRESOLVED** entries whose page was fixed.
6. Run `node tools/facts/diff.js` again: NEW and CHANGED must both be empty.
