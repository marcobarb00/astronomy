/* ==========================================================================
   PREDICTING THE SKY - HISTORICAL CLAIMS LEDGER CHECK (tools/facts/diff.js)
   Compares the pages with the ledger of checked historical claims
   (tools/facts/claims.json) and prints what a new fact-check has to look
   at:

	 NEW         sentences that look historical (a year, a known name, a
	             verb such as "observed", a quotation, an origin note) and
	             match no ledger entry and no reviewed sentence;
	 CHANGED     ledger entries whose sentence is no longer on its page,
	             while a similar sentence is (the text was edited);
	 REMOVED     ledger entries whose sentence is gone from its page;
	 UNRESOLVED  ledger entries whose status is not "confirmed".

   The script cannot tell what counts as a historical claim, so it flags
   too much on purpose. A flagged sentence that holds no claim is recorded
   once in tools/facts/no-claim.json and is not reported again while its
   text stays the same. See tools/facts/README.md.

   Usage, from the repository root:
	 node tools/facts/diff.js                  the report
	 node tools/facts/diff.js --strict         exit with 1 on NEW or CHANGED
	 node tools/facts/diff.js --dump <folder>  also write, per page, every
	                                           sentence with its hash and
	                                           flags (<page>.json)

   No dependencies: Node's fs, path and crypto only.

   TABLE OF CONTENTS
	 1. Settings: pages, names and words that flag a sentence
	 2. Text helpers: entities, normalisation, hash, similarity
	 3. Reading a page: blocks, sections, origin notes, sentences
	 4. The ledger
	 5. The comparison
	 6. Report and main
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* ==========================================================================
   1. SETTINGS
   ========================================================================== */

const ROOT = path.resolve(__dirname, '..', '..');
const CLAIMS_FILE = path.join(__dirname, 'claims.json');
const NO_CLAIM_FILE = path.join(__dirname, 'no-claim.json');

/* Names whose mention makes a sentence worth checking: astronomers, works,
   peoples and the modern authors a page may cite for a historical fact. */
const NAMES = [
	'Hipparchus',
	'Ptolemy',
	'Copernicus',
	'Tycho',
	'Brahe',
	'Kepler',
	'Timocharis',
	'Aristyllus',
	'Aristarchus',
	'Aristotle',
	'Archimedes',
	'Apollonius',
	'Eratosthenes',
	'Eudoxus',
	'Meton',
	'Euctemon',
	'Callippus',
	'Menelaus',
	'Agrippa',
	'Theon',
	'Thales',
	'Herodotus',
	'Sosigenes',
	'Caesar',
	'Nabonassar',
	'Babylon',
	'Chaldea',
	'Alexandria',
	'Rhodes',
	'Battani',
	'Albategnius',
	'Thabit',
	'Shatir',
	'Tusi',
	'Ulugh Beg',
	'Peurbach',
	'Regiomontanus',
	'Reinhold',
	'Galileo',
	'Newton',
	'Halley',
	'Bradley',
	'Bessel',
	'Foucault',
	'Danjon',
	'Almagest',
	'De Revolutionibus',
	'De Rev',
	'Commentariolus',
	'Handy Tables',
	'Planetary Hypotheses',
	'Rudolphine',
	'Alfonsine',
	'Prutenic',
	'Toomer',
	'Rosen',
	'Neugebauer',
	'Fitzpatrick',
	'Voelkel',
	'Evans',
	'Meeus',
	'Espenak',
	'NASA'
];

/* Words that usually come with a historical statement. */
const WORDS = ['observed', 'observes', 'wrote', 'writes', 'used', 'recorded', 'according to', 'century', 'centuries'];

/* A year: "128 BC", "AD 139", or four digits from 1000 to 2099. */
const YEAR_PATTERN = /\b\d{1,5}(?:·\d{3})?\s?BC\b|\bAD\s?\d{1,5}\b|\b1\d{3}\b|\b20\d{2}\b/;

/* A quotation: three words or more between double quotes. */
const QUOTE_PATTERN = /["“][^"”]*\s[^"”]*\s[^"”]*["”]/;

/* Abbreviations after which a full stop does not end a sentence. */
const ABBREVIATIONS = [
	'e.g.',
	'i.e.',
	'cf.',
	'transl.',
	'ed.',
	'eds.',
	'ch.',
	'chap.',
	'p.',
	'pp.',
	'f.',
	'ff.',
	'vol.',
	'no.',
	'c.',
	'ca.',
	'al.',
	'vs.',
	'Fig.',
	'Eq.',
	'Rev.',
	'St.',
	'Dr.',
	'Mr.'
];

/* Tags whose content is never prose. */
const SKIPPED_TAGS = ['head', 'script', 'style', 'canvas', 'svg', 'template', 'noscript'];

/* Tags that end one block of text and start another. */
const BLOCK_TAGS = [
	'p',
	'li',
	'ul',
	'ol',
	'dl',
	'dt',
	'dd',
	'div',
	'aside',
	'section',
	'article',
	'main',
	'header',
	'footer',
	'nav',
	'figure',
	'figcaption',
	'details',
	'summary',
	'blockquote',
	'table',
	'thead',
	'tbody',
	'tr',
	'caption',
	'label',
	'output',
	'button',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6'
];

/* ==========================================================================
   2. TEXT HELPERS
   ========================================================================== */

const ENTITIES = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	thinsp: ' ',
	ensp: ' ',
	emsp: ' ',
	minus: '−',
	ndash: '–',
	mdash: '—',
	hellip: '…',
	deg: '°',
	prime: '′',
	Prime: '″',
	middot: '·',
	times: '×',
	lsquo: '‘',
	rsquo: '’',
	ldquo: '“',
	rdquo: '”',
	frac12: '½',
	frac13: '⅓',
	frac14: '¼',
	frac23: '⅔',
	frac34: '¾'
};

/* Replaces the HTML entities of a text by their characters. */
function decodeEntities(text) {
	return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+\d*);/g, (match, name) => {
		if (name[0] === '#') {
			const code = name[1] === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);

			return String.fromCodePoint(code);
		}

		return name in ENTITIES ? ENTITIES[name] : match;
	});
}

/* The form of a sentence that is hashed: Unicode NFC, straight quotes,
   ordinary spaces, one space between words, no variation selectors. */
function normalise(text) {
	return text
		.normalize('NFC')
		.replace(/[︎️]/g, '')
		.replace(/[‘’]/g, "'")
		.replace(/[“”]/g, '"')
		.replace(/[\u00A0\u2009\u2002\u2003\u202F]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/* The SHA-1 of a normalised sentence, in hexadecimal. */
function hashOf(sentence) {
	return crypto.createHash('sha1').update(normalise(sentence), 'utf8').digest('hex');
}

/* The set of lower-case words of a sentence, for the similarity. */
function wordSet(text) {
	return new Set(
		normalise(text)
			.toLowerCase()
			.split(/[^\p{L}\p{N}]+/u)
			.filter(word => word.length > 0)
	);
}

/* Jaccard similarity of the word sets of two sentences, from 0 to 1. */
function similarity(a, b) {
	const setA = wordSet(a);
	const setB = wordSet(b);
	let common = 0;

	setA.forEach(word => {
		if (setB.has(word)) {
			common++;
		}
	});

	const union = setA.size + setB.size - common;

	return union === 0 ? 0 : common / union;
}

/* Why a sentence looks historical: the list of reasons, empty if none. */
function flagsOf(sentence) {
	const reasons = [];

	if (sentence.startsWith('[origin:')) {
		reasons.push('origin note');
	}

	if (YEAR_PATTERN.test(sentence)) {
		reasons.push('year');
	}

	NAMES.forEach(name => {
		if (new RegExp('\\b' + name + '\\b').test(sentence)) {
			reasons.push(name);
		}
	});

	WORDS.forEach(word => {
		if (new RegExp('\\b' + word + '\\b', 'i').test(sentence)) {
			reasons.push('"' + word + '"');
		}
	});

	if (QUOTE_PATTERN.test(sentence)) {
		reasons.push('quotation');
	}

	return reasons;
}

/* ==========================================================================
   3. READING A PAGE
   ========================================================================== */

/* The pages to check: the hub, the index.html of every page folder of
   every act folder, and the epilogue, in course order (the folder names
   sort that way). */
function findPages() {
	const pages = [];

	if (fs.existsSync(path.join(ROOT, 'index.html'))) {
		pages.push('index.html');
	}

	fs.readdirSync(ROOT)
		.filter(name => /^act\d/.test(name))
		.sort()
		.forEach(act => {
			fs.readdirSync(path.join(ROOT, act))
				.sort()
				.forEach(page => {
					const file = act + '/' + page + '/index.html';

					if (fs.existsSync(path.join(ROOT, file))) {
						pages.push(file);
					}
				});
		});

	if (fs.existsSync(path.join(ROOT, 'beyond-kepler', 'index.html'))) {
		pages.push('beyond-kepler/index.html');
	}

	return pages;
}

/* The page's number from <body data-page="2.3">, or "hub" for the hub. */
function pageNumber(html, file) {
	const match = html.match(/<body[^>]*\sdata-page="([^"]+)"/);

	if (match) {
		return match[1];
	}

	return file === 'index.html' ? 'hub' : file;
}

/* Removes the comments and the elements that hold no prose. */
function stripNonProse(html) {
	let text = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<!DOCTYPE[^>]*>/gi, '');

	SKIPPED_TAGS.forEach(tag => {
		text = text.replace(new RegExp('<' + tag + '\\b[\\s\\S]*?</' + tag + '>', 'gi'), '');
	});

	return text;
}

/* The blocks of text of a page, in order: { text, tag, section }. A table
   row is one block, its cells joined by " | "; a key entry (dt, dd) is
   one block, "dt · dd"; an origin note becomes the block
   "[origin: <origin>] <first sentence of the paragraph beside it>". */
function readBlocks(html) {
	const blocks = [];
	const tokens = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)|(<)/g;
	let buffer = '';
	let bufferTag = 'text';
	let inRow = false;
	let inHeading = null;
	let headingText = '';
	let h2 = '';
	let h3 = '';
	let lastParagraph = '';
	let match;

	/* Ends the current block and stores it if it holds any text. */
	function flush() {
		const text = normalise(buffer);

		if (text.length > 0) {
			const section = h3 ? h2 + ' › ' + h3 : h2;

			blocks.push({ text, tag: bufferTag, section });

			if (bufferTag === 'p') {
				lastParagraph = text;
			}
		}

		buffer = '';
	}

	while ((match = tokens.exec(html)) !== null) {
		const closing = match[1] === '/';
		const tag = (match[2] || '').toLowerCase();
		const attributes = match[3] || '';
		const text = match[4] !== undefined ? match[4] : match[5];

		// plain text (or a "<" that opens no tag, as in $a < b$)
		if (text !== undefined) {
			const decoded = decodeEntities(text);

			if (inHeading) {
				headingText += decoded;
			} else {
				buffer += decoded;
			}

			continue;
		}

		// headings set the section; their text is not a claim
		if (/^h[1-6]$/.test(tag)) {
			if (!closing) {
				flush();
				inHeading = tag;
				headingText = '';
			} else if (inHeading === tag) {
				const title = normalise(headingText);

				if (tag === 'h2') {
					h2 = title;
					h3 = '';
				} else if (tag === 'h3') {
					h3 = title;
				}

				inHeading = null;
			}

			continue;
		}

		// the step label inside an h2 ("1 · Observation") is kept apart
		if (inHeading && tag === 'span' && closing) {
			headingText += ' · ';
			continue;
		}

		if (tag === 'br') {
			buffer += ' ';
			continue;
		}

		// an origin note: a block of its own, tied to its paragraph
		const origin = attributes.match(/data-origin="([^"]+)"/);

		if (origin && !closing) {
			flush();
			blocks.push({
				text: '[origin: ' + origin[1] + '] ' + (splitSentences(lastParagraph)[0] || ''),
				tag: 'origin',
				section: h3 ? h2 + ' › ' + h3 : h2
			});
			continue;
		}

		// table rows: the cells of one row form one block
		if (tag === 'tr') {
			flush();
			inRow = !closing;
			bufferTag = 'tr';
			continue;
		}

		if (inRow && (tag === 'td' || tag === 'th')) {
			if (!closing && buffer.trim().length > 0) {
				buffer += ' | ';
			}

			continue;
		}

		// key entries: the dd continues its dt
		if (tag === 'dd' && !closing) {
			buffer += ' · ';
			continue;
		}

		if (tag === 'dd' || (tag === 'dt' && closing)) {
			continue;
		}

		if (BLOCK_TAGS.includes(tag)) {
			flush();
			bufferTag = closing ? 'text' : tag;
		}
	}

	flush();

	return blocks;
}

/* Splits a block into sentences. Mathematics between $ signs is never
   split, and a full stop after an abbreviation or an initial ("G. J.
   Toomer") does not end a sentence. */
function splitSentences(text) {
	const maths = [];
	const masked = text.replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g, formula => {
		maths.push(formula);

		return '\uE000' + (maths.length - 1) + '\uE000';
	});
	const sentences = [];
	const boundary = /([.!?])(["”’)]?)\s+(?=["“‘(]?[A-Z0-9\uE000])/g;
	let start = 0;
	let match;

	while ((match = boundary.exec(masked)) !== null) {
		const end = match.index + match[1].length + match[2].length;
		const before = masked.slice(start, end);
		const lastWord = before.split(/\s+/).pop();

		if (ABBREVIATIONS.includes(lastWord) || /^[A-Z]\.$/.test(lastWord)) {
			continue;
		}

		sentences.push(before);
		start = boundary.lastIndex;
	}

	sentences.push(masked.slice(start));

	return sentences
		.map(sentence => sentence.replace(/\uE000(\d+)\uE000/g, (whole, index) => maths[Number(index)]))
		.map(normalise)
		.filter(sentence => sentence.length > 0);
}

/* Every sentence of a page: { page, file, n, section, tag, text, hash, flags }.
   Table rows and origin notes are kept whole. */
function readPage(file) {
	const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
	const page = pageNumber(html, file);
	const sentences = [];

	readBlocks(stripNonProse(html)).forEach(block => {
		const parts = block.tag === 'tr' || block.tag === 'origin' ? [block.text] : splitSentences(block.text);

		parts.forEach(text => {
			sentences.push({
				page,
				file,
				n: sentences.length + 1,
				section: block.section,
				tag: block.tag,
				text,
				hash: hashOf(text),
				flags: flagsOf(text)
			});
		});
	});

	return sentences;
}

/* ==========================================================================
   4. THE LEDGER
   ========================================================================== */

/* Reads a JSON file, or returns 'fallback' when it does not exist. */
function readJson(file, fallback) {
	if (!fs.existsSync(file)) {
		return fallback;
	}

	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/* The ledger's claims (claims.json is { format, claims: [...] }). */
function readClaims() {
	const ledger = readJson(CLAIMS_FILE, { claims: [] });

	return Array.isArray(ledger) ? ledger : ledger.claims;
}

/* The reviewed sentences that hold no claim (no-claim.json is
   { format, sentences: [{ page, text_hash, text }] }). */
function readNoClaim() {
	return readJson(NO_CLAIM_FILE, { sentences: [] }).sentences;
}

/* ==========================================================================
   5. THE COMPARISON
   ========================================================================== */

/* Compares the pages with the ledger; returns the four lists and the
   reviewed sentences no longer found (which can be dropped). */
function compare() {
	const pages = findPages();
	const sentencesByFile = {};

	pages.forEach(file => {
		sentencesByFile[file] = readPage(file);
	});

	const claims = readClaims();
	const noClaim = readNoClaim();
	const known = new Set();

	claims.forEach(claim => known.add(claim.page + ' ' + claim.text_hash));
	noClaim.forEach(entry => known.add(entry.page + ' ' + entry.text_hash));

	const changed = [];
	const removed = [];
	const matchedByChange = new Set();

	claims.forEach(claim => {
		const sentences = sentencesByFile[claim.page] || [];

		if (sentences.some(sentence => sentence.hash === claim.text_hash)) {
			return;
		}

		// the sentence is gone: is a similar one there instead?
		let best = null;
		let bestScore = 0;

		sentences.forEach(sentence => {
			if (known.has(claim.page + ' ' + sentence.hash)) {
				return;
			}

			const score = similarity(claim.sentence || claim.claim, sentence.text);

			if (score > bestScore) {
				best = sentence;
				bestScore = score;
			}
		});

		if (best && bestScore >= 0.5) {
			changed.push({ claim, now: best, score: bestScore });
			matchedByChange.add(claim.page + ' ' + best.hash);
		} else {
			removed.push(claim);
		}
	});

	const fresh = [];

	pages.forEach(file => {
		sentencesByFile[file].forEach(sentence => {
			const key = file + ' ' + sentence.hash;

			if (sentence.flags.length > 0 && !known.has(key) && !matchedByChange.has(key)) {
				fresh.push(sentence);
			}
		});
	});

	const unresolved = claims.filter(claim => claim.status !== 'confirmed');
	const staleNoClaim = noClaim.filter(entry => {
		const sentences = sentencesByFile[entry.page] || [];

		return !sentences.some(sentence => sentence.hash === entry.text_hash);
	});

	return { pages, sentencesByFile, fresh, changed, removed, unresolved, staleNoClaim, claims };
}

/* ==========================================================================
   6. REPORT AND MAIN
   ========================================================================== */

/* Shortens a sentence for one line of the report. */
function excerpt(text, length = 150) {
	return text.length > length ? text.slice(0, length - 1) + '…' : text;
}

/* Prints the report of compare(). */
function printReport(result) {
	const flagged = result.pages.reduce(
		(sum, file) => sum + result.sentencesByFile[file].filter(sentence => sentence.flags.length > 0).length,
		0
	);

	console.log(
		'Historical claims ledger: ' +
			result.claims.length +
			' entries, ' +
			result.pages.length +
			' pages, ' +
			flagged +
			' flagged sentences.'
	);
	console.log('');

	console.log('NEW (' + result.fresh.length + ')');
	result.fresh.forEach(sentence => {
		console.log('  ' + sentence.file + ' #' + sentence.n + ' [' + sentence.flags.join(', ') + ']');
		console.log('    ' + excerpt(sentence.text));
		console.log('    hash ' + sentence.hash);
	});
	console.log('');

	console.log('CHANGED (' + result.changed.length + ')');
	result.changed.forEach(item => {
		console.log('  ' + item.claim.id + ' (' + item.claim.page + ')');
		console.log('    was: ' + excerpt(item.claim.sentence || item.claim.claim));
		console.log('    now: ' + excerpt(item.now.text));
		console.log('    new hash ' + item.now.hash);
	});
	console.log('');

	console.log('REMOVED (' + result.removed.length + ')');
	result.removed.forEach(claim => {
		console.log('  ' + claim.id + ' (' + claim.page + '): ' + excerpt(claim.claim));
	});
	console.log('');

	console.log('UNRESOLVED (' + result.unresolved.length + ')');
	result.unresolved.forEach(claim => {
		console.log('  ' + claim.id + ' ' + claim.status + ': ' + excerpt(claim.claim, 120));
	});

	if (result.staleNoClaim.length > 0) {
		console.log('');
		console.log(
			'Reviewed sentences no longer on their page (can be dropped from no-claim.json): ' +
				result.staleNoClaim.length
		);
	}
}

/* Writes every sentence of every page, with hash and flags, one JSON file
   per page, for the next fact-check. */
function dumpSentences(result, folder) {
	fs.mkdirSync(folder, { recursive: true });

	result.pages.forEach(file => {
		const sentences = result.sentencesByFile[file];
		const name = (sentences.length > 0 ? sentences[0].page : file).replace(/[^\w.-]/g, '_');

		fs.writeFileSync(path.join(folder, name + '.json'), JSON.stringify(sentences, null, '\t') + '\n');
	});
}

function main() {
	const args = process.argv.slice(2);
	const result = compare();
	const dumpIndex = args.indexOf('--dump');

	if (dumpIndex >= 0) {
		dumpSentences(result, path.resolve(args[dumpIndex + 1]));
	}

	printReport(result);

	if (args.includes('--strict') && (result.fresh.length > 0 || result.changed.length > 0)) {
		process.exitCode = 1;
	}
}

if (require.main === module) {
	main();
}

module.exports = { normalise, hashOf, readPage, findPages, compare };
