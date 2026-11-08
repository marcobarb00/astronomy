/* ==========================================================================
   SECTION COUNTS (tools/check/section-counts.js)
   How heavy each part of a page is: words, numbers, figures, tables and
   folds in its Fit, Test and Residual (STRUCTURE.md §5), with the running
   text, the history blocks and the folds counted apart. Used to plan and
   report a page's restructuring (the restructure-page skill); a report,
   not a pass or fail.

   Run from the repository root:
	 node tools/check/section-counts.js act2-sun/01-uneven-year/index.html
	 node tools/check/section-counts.js <page> --against restructure
		 also counts the page as it is at a git ref, for before / after

   What is counted
	 words    whitespace-separated tokens with a letter or a digit, in the
			  text the reader sees (tags and comments removed)
	 numbers  digit groups (3, 1.9, 385·000, 23:15) and vulgar fractions
			  in the prose, without the tables, without cross-references
			  (page 3.1, section 2, Figure 7, Exercise 3, Meeus 47, ch. 47,
			  § 6.3) and without book and chapter citations (IV 6, V 12)
	 figures  <figure> elements (figures, plates, photos)
	 tables   <table> elements, whose values are left out of "numbers"

   TABLE OF CONTENTS
	 1. Reading the page
	 2. Cutting it into parts
	 3. Counting a part
	 4. Report
   ========================================================================== */

'use strict';

const fs = require('fs');
const childProcess = require('child_process');

/* The sections counted, by the id of their <h2>, and the one after the
   last of them. */
const SECTIONS = ['fit', 'test', 'residual'];
const AFTER_LAST = 'exercises';

/* ==========================================================================
   1. READING THE PAGE
   ========================================================================== */

/* The page's HTML, from the working tree or from a git ref. */
function readPage(path, ref) {
	if (!ref) {
		return fs.readFileSync(path, 'utf8');
	}

	return childProcess.execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8' });
}

/* The HTML of one section: from its <h2> to the next section's <h2>. */
function sectionHtml(html, id, nextId) {
	const start = html.indexOf(`<h2 id="${id}"`);
	const end = html.indexOf(`<h2 id="${nextId}"`);

	if (start < 0 || end < 0) {
		return '';
	}

	return html.slice(start, end);
}

/* ==========================================================================
   2. CUTTING IT INTO PARTS
   ========================================================================== */

/* The end of the element that opens at 'start' with the tag 'tag',
   following the nesting of that tag (a <div> holds other <div>s). */
function elementEnd(html, start, tag) {
	const pattern = new RegExp(`<${tag}[\\s>]|</${tag}>`, 'g');
	let depth = 0;

	pattern.lastIndex = start;

	for (let match = pattern.exec(html); match; match = pattern.exec(html)) {
		depth += match[0].startsWith('</') ? -1 : 1;

		if (depth === 0) {
			return match.index + match[0].length;
		}
	}

	return html.length;
}

/* Take every element that opens with 'opening' out of 'html': returns
   the elements and what is left. */
function takeOut(html, opening, tag) {
	const taken = [];
	let rest = '';
	let from = 0;

	for (let start = html.indexOf(opening); start >= 0; start = html.indexOf(opening, from)) {
		const end = elementEnd(html, start, tag);

		rest += html.slice(from, start);
		taken.push(html.slice(start, end));
		from = end;
	}

	return { taken: taken.join('\n'), rest: rest + html.slice(from) };
}

/* A section cut into its running text, its history blocks and its folds
   (a fold inside a history block counts as a fold). */
function parts(html) {
	const history = takeOut(html, '<div class="history"', 'div');
	const foldsOfText = takeOut(history.rest, '<details class="fold"', 'details');
	const foldsOfHistory = takeOut(history.taken, '<details class="fold"', 'details');

	return {
		'running text': foldsOfText.rest,
		'history blocks': foldsOfHistory.rest,
		folds: foldsOfText.taken + '\n' + foldsOfHistory.taken
	};
}

/* ==========================================================================
   3. COUNTING A PART
   ========================================================================== */

/* The text the reader sees, without tags, comments and entities. */
function visibleText(html) {
	return html
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&[a-z]+;/g, ' ');
}

/* Digit groups and fractions that are quantities, not references. */
function countNumbers(text) {
	const all = text.match(/\d+(?:[.·:]\d+)*|[¼½¾⅓⅔⅛⅗]/g) || [];
	const references =
		text.match(
			/(?:pages?|sections?|Figures?|Exercises?|Meeus|ch\.|§)\s*\d+(?:\.\d+)?(?:\s*(?:and|,|–)\s*\d+(?:\.\d+)?)*/g
		) || [];
	const referenceNumbers = references.join(' ').match(/\d+(?:\.\d+)?/g) || [];
	const citations = text.match(/\b[IVX]+\s+\d+/g) || [];

	return all.length - referenceNumbers.length - citations.length;
}

/* Words, numbers, figures, tables and folds of one part. */
function count(html) {
	const withoutTables = html.replace(/<table[\s\S]*?<\/table>/g, ' ');
	const text = visibleText(html);
	const words = text.split(/\s+/).filter(word => /[A-Za-z0-9]/.test(word)).length;

	return {
		words,
		numbers: countNumbers(visibleText(withoutTables)),
		figures: (html.match(/<figure[\s>]/g) || []).length,
		tables: (html.match(/<table[\s>]/g) || []).length,
		folds: (html.match(/<details class="fold"/g) || []).length
	};
}

/* ==========================================================================
   4. REPORT
   ========================================================================== */

/* One row per section and part that has any words. */
function rows(html) {
	const result = [];

	SECTIONS.forEach((id, index) => {
		const section = sectionHtml(html, id, SECTIONS[index + 1] ?? AFTER_LAST);
		const whole = count(section);

		result.push({ section: id, part: 'all', ...whole });

		/* The running text always; history blocks and folds only when
		   the section has them. */
		Object.entries(parts(section)).forEach(([part, partHtml]) => {
			const counted = count(partHtml);

			if (part === 'running text' || counted.words > 0) {
				result.push({ section: '', part, ...counted });
			}
		});
	});

	return result.map(row => ({
		...row,
		'per 100 words': row.words ? ((100 * row.numbers) / row.words).toFixed(1) : '-'
	}));
}

function main() {
	const args = process.argv.slice(2);
	const path = args.find(arg => !arg.startsWith('--'));
	const refIndex = args.indexOf('--against');
	const ref = refIndex >= 0 ? args[refIndex + 1] : null;

	if (!path) {
		console.log('Usage: node tools/check/section-counts.js <page index.html> [--against <git ref>]');
		process.exit(1);
	}

	if (ref) {
		console.log(`${path} at ${ref}`);
		console.table(rows(readPage(path, ref)));
	}

	console.log(`${path}${ref ? ' now' : ''}`);
	console.table(rows(readPage(path, null)));
}

main();
