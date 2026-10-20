/* ==========================================================================
   PREDICTING THE SKY - SMOKE TEST (tools/check/smoke.js)
   A safety net for refactoring: serves the repository on a local port,
   opens every HTML page in Chromium (Playwright) at a desktop and a phone
   width, and fails on any console error or warning, uncaught exception,
   failed request or broken local link, and checks that each page still
   starts its figures when the CDN (KaTeX) is unreachable. It saves a
   full-page screenshot
   per page and width, then (desktop only) moves every slider, presses
   every button, opens every hint and answer, points at every plot and
   drags every sphere.

   After each action the text of the read-outs of that figure (the TeX
   source of each line, and the value beside each slider) is written to a
   log. The log is compared with tools/check/readouts.txt byte for byte,
   and the screenshots with a reference pixel for pixel (up to the noise
   of anti-aliasing, PIXEL_TOLERANCE), so any change of what a page
   displays shows up.

   Usage, from the repository root:
	 node tools/check/smoke.js --against HEAD
		 compare the working tree with a commit (any git ref): the pages
		 of that commit are checked out in a temporary worktree and
		 captured first; read-outs and screenshots must match
	 node tools/check/smoke.js
		 compare with the local baseline (tools/check/baseline/, not in git)
	 node tools/check/smoke.js --update
		 save readouts.txt and the screenshots as the new baseline
	 node tools/check/smoke.js --only 1.3
		 only the pages whose path contains "1.3", or page 1.3 itself
	 node tools/check/smoke.js --ci --against <ref>
		 for the GitHub Action: a problem on a page or a difference from
		 readouts.txt fails; differences from <ref> (screenshots, and
		 read-outs regenerated on purpose) are only reported
   Output: tools/check/out/ (screenshots, the log, images of the
   differences: the differing pixels in red over a faded copy).
   Needs Playwright with its Chromium (npm i -D playwright; npx playwright
   install chromium), or a global install. Not part of the site.

   TABLE OF CONTENTS
	 1. Settings
	 2. Static server
	 3. Pages and errors
	 4. Read-outs
	 5. Exercising the controls
	 6. Screenshots and their comparison
	 7. Main
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const childProcess = require('child_process');

/* ==========================================================================
   1. SETTINGS
   ========================================================================== */

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(__dirname, 'out');
const BASELINE_DIR = path.join(__dirname, 'baseline');
const READOUTS_FILE = path.join(__dirname, 'readouts.txt');

/* Folders that hold no pages of the site. */
const SKIP_FOLDERS = new Set(['.git', '.claude', 'node_modules', 'tools', 'raw']);

const VIEWPORTS = {
	desktop: { width: 1280, height: 900 },
	phone: { width: 390, height: 844, hasTouch: true }
};

/* Time for a page to settle (web fonts, a canvas redrawn once they load). */
const SETTLE_MS = 400;

/* Screenshots: a pixel counts as different when one of its channels
   differs by more than this (out of 255). Chromium's anti-aliasing of a
   few canvas edge pixels varies by 1 or 2 from run to run; any real
   change of a figure (a line, a colour, a digit) is far larger. */
const PIXEL_TOLERANCE = 3;

/* How long a play button runs, and a step button is held. */
const PLAY_MS = 600;
const HOLD_MS = 900;

/* Playwright, from the project or from a global install. */
function loadPlaywright() {
	try {
		return require('playwright');
	} catch {
		const globalRoot = childProcess.execSync('npm root -g', { encoding: 'utf8' }).trim();

		return require(path.join(globalRoot, 'playwright'));
	}
}

/* ==========================================================================
   2. STATIC SERVER
   The site has no build step: the files are served as they are.
   ========================================================================== */

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.md': 'text/plain; charset=utf-8',
	'.csv': 'text/plain; charset=utf-8',
	'.woff2': 'font/woff2'
};

/* Serve the folder 'root' on a free port; resolves to { server, base }. */
function startServer(root) {
	const server = http.createServer((request, response) => {
		const url = new URL(request.url, 'http://localhost');
		let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));

		if (!file.startsWith(root)) {
			response.writeHead(403).end();
			return;
		}

		if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
			file = path.join(file, 'index.html');
		}

		if (!fs.existsSync(file)) {
			response.writeHead(404).end();
			return;
		}

		response.writeHead(200, {
			'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
		});
		fs.createReadStream(file).pipe(response);
	});

	return new Promise(resolve => {
		server.listen(0, '127.0.0.1', () => {
			resolve({ server, base: `http://127.0.0.1:${server.address().port}/` });
		});
	});
}

/* ==========================================================================
   3. PAGES AND ERRORS
   ========================================================================== */

/* Every .html file of the site in 'root', as paths from it, sorted. */
function findPages(root, folder = '') {
	const pages = [];

	fs.readdirSync(path.join(root, folder), { withFileTypes: true }).forEach(entry => {
		const relative = path.posix.join(folder, entry.name);

		if (entry.isDirectory() && !SKIP_FOLDERS.has(entry.name)) {
			pages.push(...findPages(root, relative));
		} else if (entry.isFile() && entry.name.endsWith('.html')) {
			pages.push(relative);
		}
	});

	return pages.sort();
}

/* A file name for a page: "act1-stage/01-turning-sky/index.html" ->
   "act1-stage_01-turning-sky". */
function slug(page) {
	return page
		.replace(/\/index\.html$/, '')
		.replace(/\.html$/, '')
		.replace(/[\\/]/g, '_');
}

/* Collect every problem the page reports into 'problems'. */
function watchErrors(page, problems) {
	page.on('console', message => {
		if (message.type() === 'error' || message.type() === 'warning') {
			problems.push(`console ${message.type()}: ${message.text()}`);
		}
	});

	page.on('pageerror', error => {
		problems.push(`uncaught: ${error.message}`);
	});

	page.on('requestfailed', request => {
		problems.push(`request failed: ${request.url()} (${request.failure()?.errorText})`);
	});

	page.on('response', response => {
		const url = response.url();

		// browsers ask for a favicon by themselves; the site has none
		if (response.status() >= 400 && !url.endsWith('/favicon.ico')) {
			problems.push(`HTTP ${response.status()}: ${url}`);
		}
	});
}

/* Load a page and wait until its fonts, figures and tests have settled. */
async function openPage(page, url) {
	await page.goto(url, { waitUntil: 'networkidle' });

	// lazy photos below the fold load only when scrolled to: load them all,
	// and every web font, before the screenshot
	await page.evaluate(async () => {
		const images = [...document.images];

		images.forEach(image => {
			image.loading = 'eager';
		});

		await Promise.all(images.map(image => image.decode().catch(() => {})));
		await Promise.all([...document.fonts].map(face => face.load().catch(() => {})));
		await document.fonts.ready;
	});

	// the test page fills its summary when it has run
	await page.waitForFunction(() => {
		const summary = document.getElementById('summary');

		return !summary || summary.textContent !== 'Running…';
	});

	await settle(page);
	await nudgeViewport(page);
}

/* Widen the window by one pixel and back. A canvas is sized when its figure
   starts; if a web font arrives later and moves the layout by less than a
   pixel, the canvas keeps its first size, stretched a little, or not,
   depending on timing. The nudge makes every canvas take its size from
   the final layout, so two runs give the same pixels. */
async function nudgeViewport(page) {
	const size = page.viewportSize();

	await page.setViewportSize({ width: size.width + 1, height: size.height });
	await settle(page);
	await page.setViewportSize(size);
	await settle(page);
}

/* Two animation frames and a short pause. */
async function settle(page, ms = SETTLE_MS) {
	await page.evaluate(
		() =>
			new Promise(resolve => {
				requestAnimationFrame(() => requestAnimationFrame(resolve));
			})
	);
	await page.waitForTimeout(ms);
}

/* Every local link of the page must lead to an existing file of 'root'. */
async function checkLinks(page, root, base, problems) {
	const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href));
	const local = [...new Set(links.map(href => href.split('#')[0]))].filter(href => href.startsWith(base));

	for (const href of local) {
		const file = path.join(root, decodeURIComponent(new URL(href).pathname));
		const target = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;

		if (!fs.existsSync(target)) {
			problems.push(`broken link: ${href}`);
		}
	}
}

/* The test page must pass all its tests. */
async function checkTests(page, problems) {
	const summary = await page.evaluate(() => {
		const element = document.getElementById('summary');

		return element ? { text: element.textContent, pass: element.classList.contains('pass') } : null;
	});

	if (summary && !summary.pass) {
		problems.push(`tests: ${summary.text}`);
	}
}

/* ==========================================================================
   4. READ-OUTS
   What a figure shows in words: each read-out line as its TeX source (or
   its text), each slider's value, the error curve's hover line, the test
   summary.
   ========================================================================== */

/* Runs in the page: the read-outs inside the scope of an element (its
   figure, or the whole page), as lines of text. */
function readoutsInPage(selector) {
	const element = selector ? document.querySelector(selector) : null;
	const scope = element?.closest('figure') ?? element?.closest('.errorcurve') ?? document.body;
	const name = node =>
		node.id ? `#${node.id}` : node.className ? `.${String(node.className).split(' ')[0]}` : node.tagName;
	const lineText = line => {
		const tex = line.querySelector('annotation[encoding="application/x-tex"]');

		return (tex ? tex.textContent : line.textContent).trim();
	};
	const result = [];

	scope.querySelectorAll('.readout, output, .errorcurve-readout, #summary').forEach(node => {
		const parts = node.classList.contains('readout')
			? [...node.querySelectorAll(':scope > .eq')].map(lineText)
			: [node.textContent.trim()];
		const owner = node.tagName === 'OUTPUT' ? (node.parentElement.querySelector('input')?.id ?? '') : '';

		result.push(`${name(node)}${owner ? ` (${owner})` : ''}: ${parts.join(' | ')}`);
	});

	return result;
}

/* Append the read-outs near 'selector' to the log, under a heading. */
async function logReadouts(page, log, heading, selector = null) {
	const found = await page.evaluate(readoutsInPage, selector);

	log.push(`  ${heading}`);
	found.forEach(line => log.push(`    ${line}`));
}

/* ==========================================================================
   5. EXERCISING THE CONTROLS
   Everything that can be recorded exactly comes first; what depends on
   time (play buttons, held step buttons) comes last and is not recorded.
   ========================================================================== */

/* The heading of one action in the log: "slider #sky-lat = 90". */
function describe(kind, info) {
	return `${kind} ${info}`;
}

/* Open every hint and answer. */
async function openDetails(page, log) {
	const count = await page.locator('details > summary').count();

	for (let i = 0; i < count; i++) {
		const summary = page.locator('details > summary').nth(i);

		if (await summary.isVisible()) {
			await summary.click();
		}
	}

	log.push(`  opened ${count} hints and answers`);
}

/* Mark every element matching 'selector' with data-<key>="<index>" and
   return, for each, the selector that finds it and the name the log uses
   (its id, or its kind and index). */
async function markAll(page, selector, key) {
	const marked = await page.evaluate(
		([css, attribute]) => {
			return [...document.querySelectorAll(css)].map((element, i) => {
				element.setAttribute(attribute, String(i));

				return element.id;
			});
		},
		[selector, `data-${key}`]
	);

	return marked.map((id, i) => ({
		selector: `[data-${key}="${i}"]`,
		name: id ? `#${id}` : `${key} ${i}`
	}));
}

/* Each slider to its minimum, its maximum, its middle, then one key step. */
async function moveSliders(page, log) {
	const sliders = await markAll(page, 'input[type=range]', 'smoke-slider');

	for (const { selector, name } of sliders) {
		const input = page.locator(selector);
		const { min, max, step } = await input.evaluate(el => ({
			min: Number(el.min || 0),
			max: Number(el.max || 100),
			step: Number(el.step || 1)
		}));
		const middle = min + Math.round((max - min) / 2 / step) * step;

		if (!(await input.isVisible())) {
			continue;
		}

		for (const value of [min, max, middle]) {
			await input.evaluate((el, v) => {
				el.value = String(v);
				el.dispatchEvent(new Event('input', { bubbles: true }));
				el.dispatchEvent(new Event('change', { bubbles: true }));
			}, value);
			await logReadouts(page, log, describe('slider', `${name} = ${value}`), selector);
		}

		await input.focus();
		await page.keyboard.press('ArrowRight');
		await logReadouts(page, log, describe('slider', `${name} + one key step`), selector);
	}
}

/* Every visible, enabled button that is not a play button, in page order,
   pressed once. Returns the play buttons and step buttons for the end. */
async function pressButtons(page, log) {
	const buttons = page.locator('button');
	const count = await buttons.count();
	const later = [];

	for (let i = 0; i < count; i++) {
		const button = buttons.nth(i);
		const info = await button.evaluate((el, index) => {
			el.dataset.smokeIndex = String(index);

			return {
				text: el.textContent.trim().replace(/\s+/g, ' '),
				isPlay: el.classList.contains('play') || el.hasAttribute('aria-pressed'),
				isStep: el.dataset.step !== undefined,
				disabled: el.disabled
			};
		}, i);
		const selector = `button[data-smoke-index="${i}"]`;

		if (info.isPlay || info.isStep) {
			later.push({ selector, info });
		}

		if (info.isPlay || info.disabled || !(await button.isVisible())) {
			continue;
		}

		await button.click();
		await logReadouts(page, log, describe('button', `"${info.text}"`), selector);
	}

	return later;
}

/* Point at three places on every 2D plot, then leave it. */
async function hoverPlots(page, log) {
	const plots = await markAll(page, 'canvas.plot2d', 'smoke-plot');

	for (const { selector, name } of plots) {
		const plot = page.locator(selector);

		if (!(await plot.isVisible())) {
			continue;
		}

		await plot.scrollIntoViewIfNeeded();

		const box = await plot.boundingBox();

		for (const fraction of [0.3, 0.6, 0.9]) {
			await page.mouse.move(box.x + fraction * box.width, box.y + box.height / 2);
			await logReadouts(page, log, describe('hover', `${name} at ${fraction}`), selector);
		}

		await page.mouse.move(0, 0);
		await logReadouts(page, log, describe('hover', `${name} left`), selector);
	}
}

/* Drag every sphere a little (the view turns; nothing to record). */
async function dragSpheres(page, log) {
	const spheres = page.locator('canvas.sphere3d');
	const count = await spheres.count();

	for (let i = 0; i < count; i++) {
		const sphere = spheres.nth(i);

		await sphere.scrollIntoViewIfNeeded();

		const box = await sphere.boundingBox();
		const x = box.x + box.width / 2;
		const y = box.y + box.height / 2;

		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 60, y + 30, { steps: 5 });
		await page.mouse.up();
	}

	log.push(`  dragged ${count} spheres`);
}

/* Run each player for a moment, and hold each step button. */
async function runTimed(page, later) {
	for (const { selector, info } of later) {
		const button = page.locator(selector);

		if (info.disabled || !(await button.isVisible())) {
			continue;
		}

		if (info.isPlay) {
			await button.click();
			await page.waitForTimeout(PLAY_MS);
			await button.click();
		} else {
			const box = await button.boundingBox();

			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.waitForTimeout(HOLD_MS);
			await page.mouse.up();
		}
	}
}

/* A player whose figure leaves the screen must stop moving, stay
   playing, and go on from the same value when the figure comes back
   (not restart from the start, not jump). Problems go to 'problems'. */
async function checkPlayResume(page, problems) {
	const players = await markAll(page, 'button.play[aria-pressed]', 'smoke-play');

	for (const { selector, name } of players) {
		const button = page.locator(selector);

		if (!(await button.isVisible())) {
			continue;
		}

		const report = await playAwayAndBack(page, button);

		if (report) {
			problems.push(`play ${name}: ${report}`);
		}
	}
}

/* One player: returns what went wrong, or null. */
async function playAwayAndBack(page, button) {
	const sliders = () =>
		button.evaluate(el => {
			return [...el.closest('figure').querySelectorAll('input[type=range]')].map(input => ({
				value: Number(input.value),
				min: Number(input.min),
				max: Number(input.max)
			}));
		});

	await button.scrollIntoViewIfNeeded();

	const start = await sliders();

	await button.click();
	await page.waitForTimeout(400);

	const playing = await sliders();
	const k = playing.findIndex((slider, i) => slider.value !== start[i].value);

	if (k < 0) {
		await button.click();
		return 'its slider did not move';
	}

	const offScreen = await scrollFigureAway(button);

	await page.waitForTimeout(150);
	const awayFirst = (await sliders())[k].value;
	await page.waitForTimeout(700);
	const awayLast = (await sliders())[k].value;

	await button.scrollIntoViewIfNeeded();
	await page.waitForTimeout(700);

	const back = (await sliders())[k];
	const pressed = await button.getAttribute('aria-pressed');
	const range = back.max - back.min;
	const advance = (((back.value - awayLast) % range) + range) % range;

	await button.click();

	if (!offScreen) {
		return null; // the page is too short to take this figure off the screen
	}

	if (awayFirst !== awayLast) {
		return `kept moving off the screen (${awayFirst} -> ${awayLast})`;
	}

	if (pressed !== 'true') {
		return 'stopped playing while off the screen';
	}

	if (advance === 0 || advance > range / 2) {
		return `did not go on from ${awayLast} when back on the screen (now ${back.value})`;
	}

	return null;
}

/* Scroll so that the figure of 'button' is off the screen; returns
   whether it is. */
async function scrollFigureAway(button) {
	return button.evaluate(el => {
		const figure = el.closest('figure');
		const box = figure.getBoundingClientRect();
		const below = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;

		const by = below > box.bottom + 50 ? box.bottom + 50 : box.top - window.innerHeight - 50;

		// at once: the page itself scrolls smoothly (theme.css)
		window.scrollTo({ top: window.scrollY + by, behavior: 'instant' });

		const after = figure.getBoundingClientRect();

		return after.bottom < 0 || after.top > window.innerHeight;
	});
}

/* Everything above, in order. */
async function exercise(page, log, problems) {
	await logReadouts(page, log, 'as loaded');
	await openDetails(page, log);
	await moveSliders(page, log);

	const later = await pressButtons(page, log);

	await hoverPlots(page, log);
	await dragSpheres(page, log);
	await checkPlayResume(page, problems);
	await runTimed(page, later);
	await settle(page);
}

/* ==========================================================================
   6. SCREENSHOTS AND THEIR COMPARISON
   Compared in the browser itself, pixel by pixel, so no image library is
   needed. A difference is reported with its bounding box, and an image of
   it (the differing pixels in red over a faded copy) is saved.
   ========================================================================== */

/* Runs in the page: compare two PNGs given as data URLs, { a, b }, up to
   'tolerance' per channel. */
async function comparePngsInPage({ a, b, tolerance }) {
	const load = src =>
		new Promise((resolve, reject) => {
			const image = new Image();

			image.onload = () => resolve(image);
			image.onerror = reject;
			image.src = src;
		});
	const [imageA, imageB] = await Promise.all([load(a), load(b)]);

	if (imageA.width !== imageB.width || imageA.height !== imageB.height) {
		return {
			size: `${imageA.width}x${imageA.height} -> ${imageB.width}x${imageB.height}`,
			count: -1
		};
	}

	const width = imageA.width;
	const height = imageA.height;
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d', { willReadFrequently: true });

	canvas.width = width;
	canvas.height = height;
	ctx.drawImage(imageA, 0, 0);
	const pixelsA = ctx.getImageData(0, 0, width, height);
	ctx.clearRect(0, 0, width, height);
	ctx.drawImage(imageB, 0, 0);
	const pixelsB = ctx.getImageData(0, 0, width, height);
	const diff = ctx.createImageData(width, height);
	const box = { left: width, top: height, right: -1, bottom: -1 };
	let count = 0;

	for (let i = 0; i < pixelsA.data.length; i += 4) {
		const same =
			Math.abs(pixelsA.data[i] - pixelsB.data[i]) <= tolerance &&
			Math.abs(pixelsA.data[i + 1] - pixelsB.data[i + 1]) <= tolerance &&
			Math.abs(pixelsA.data[i + 2] - pixelsB.data[i + 2]) <= tolerance &&
			Math.abs(pixelsA.data[i + 3] - pixelsB.data[i + 3]) <= tolerance;
		const x = (i / 4) % width;
		const y = Math.floor(i / 4 / width);

		if (same) {
			diff.data[i] = 255 - (255 - pixelsB.data[i]) / 4;
			diff.data[i + 1] = 255 - (255 - pixelsB.data[i + 1]) / 4;
			diff.data[i + 2] = 255 - (255 - pixelsB.data[i + 2]) / 4;
		} else {
			count++;
			diff.data[i] = 220;
			box.left = Math.min(box.left, x);
			box.top = Math.min(box.top, y);
			box.right = Math.max(box.right, x);
			box.bottom = Math.max(box.bottom, y);
		}

		diff.data[i + 3] = 255;
	}

	if (count === 0) {
		return { count: 0 };
	}

	ctx.putImageData(diff, 0, 0);

	return { count, box, image: canvas.toDataURL('image/png') };
}

/* Compare one screenshot with its baseline (in the folders 'before' and
   'after'); returns a line of report, or null when they are identical. */
async function compareScreenshot(browser, name, before, after) {
	const baseline = path.join(before, name);
	const current = path.join(after, name);

	if (!fs.existsSync(baseline)) {
		return `${name}: no baseline`;
	}

	const dataUrl = file => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
	const page = await browser.newPage();
	const result = await page.evaluate(comparePngsInPage, {
		a: dataUrl(baseline),
		b: dataUrl(current),
		tolerance: PIXEL_TOLERANCE
	});

	await page.close();

	if (result.count === 0) {
		return null;
	}

	if (result.count < 0) {
		return `${name}: size changed, ${result.size}`;
	}

	const diffFile = path.join(OUT_DIR, 'diff', name);
	const { left, top, right, bottom } = result.box;

	fs.mkdirSync(path.dirname(diffFile), { recursive: true });
	fs.writeFileSync(diffFile, Buffer.from(result.image.split(',')[1], 'base64'));

	return (
		`${name}: ${result.count} pixels differ, in x ${left}-${right}, y ${top}-${bottom} ` +
		`(see ${path.relative(ROOT, diffFile)})`
	);
}

/* ==========================================================================
   7. MAIN
   ========================================================================== */

/* Command line: --update, --against <git ref>, --only <text>, --ci. */
function readArguments() {
	const args = process.argv.slice(2);
	const valueOf = flag => (args.indexOf(flag) >= 0 ? args[args.indexOf(flag) + 1] : null);

	return {
		update: args.includes('--update'),
		ci: args.includes('--ci'),
		against: valueOf('--against'),
		only: valueOf('--only')
	};
}

/* Does a page match --only? "1.3" also matches "03-clocks". */
function matchesOnly(page, only) {
	if (!only) {
		return true;
	}

	const pageNumber = page.match(/act(\d)[^/]*\/0?(\d+)-/);
	const number = pageNumber ? `${pageNumber[1]}.${pageNumber[2]}` : '';

	return page.includes(only) || number === only;
}

/* With the CDN unreachable (KaTeX missing), a page must still start
   every figure: no uncaught error, no blank canvas. The failed requests
   themselves are expected here. */
async function checkWithoutCdn(browser, site, pageFile, problems) {
	const html = fs.readFileSync(path.join(site.root, pageFile), 'utf8');

	if (!html.includes('cdnjs.cloudflare.com')) {
		return;
	}

	const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
	const page = await context.newPage();
	const errors = [];

	page.on('pageerror', error => errors.push(error.message));
	await page.route(/cdnjs\.cloudflare\.com/, route => route.abort());
	await page.goto(site.base + pageFile, { waitUntil: 'networkidle' });
	await settle(page);

	const blank = await page.evaluate(() => {
		return [...document.querySelectorAll('canvas')]
			.filter(canvas => {
				const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;

				return !pixels.some((value, i) => i % 4 === 3 && value > 0);
			})
			.map(canvas => canvas.id || 'a canvas');
	});

	errors.forEach(message => problems.push(`without the CDN: uncaught ${message}`));
	blank.forEach(id => problems.push(`without the CDN: ${id} stays blank`));
	await context.close();
}

/* Open one page at one width: screenshot (into shotDir), and (desktop)
   the controls, with their read-outs appended to 'log'. */
async function checkPage(browser, site, pageFile, viewportName, shotDir, log) {
	const context = await browser.newContext({ viewport: VIEWPORTS[viewportName], ...VIEWPORTS[viewportName] });
	const page = await context.newPage();
	const problems = [];
	const name = `${viewportName}/${slug(pageFile)}.png`;

	watchErrors(page, problems);

	try {
		await openPage(page, site.base + pageFile);
		await checkTests(page, problems);
		await checkLinks(page, site.root, site.base, problems);

		fs.mkdirSync(path.join(shotDir, viewportName), { recursive: true });
		await page.screenshot({ path: path.join(shotDir, name), fullPage: true });

		if (viewportName === 'desktop') {
			log.push(`\n=== ${pageFile} ===`);
			await exercise(page, log, problems);
			await checkWithoutCdn(browser, site, pageFile, problems);
		}
	} catch (error) {
		problems.push(`smoke test stopped: ${error.message.split('\n')[0]}`);
	}

	await context.close();

	return { name, problems };
}

/* Check every page of the folder 'root' at every width. Returns the
   read-out log (as one text), the screenshot names and the problems. */
async function capture(browser, root, shotDir, only, label) {
	const { server, base } = await startServer(root);
	const site = { root, base };
	const pages = findPages(root).filter(page => matchesOnly(page, only));
	const log = [
		'PREDICTING THE SKY - READ-OUTS (tools/check/smoke.js)',
		'Regenerate with: node tools/check/smoke.js --update'
	];
	const screenshots = [];
	const failures = [];

	console.log(`\nsmoke: ${label}`);

	for (const pageFile of pages) {
		for (const viewportName of Object.keys(VIEWPORTS)) {
			const { name, problems } = await checkPage(browser, site, pageFile, viewportName, shotDir, log);

			screenshots.push(name);
			console.log(`${problems.length === 0 ? 'ok  ' : 'FAIL'} ${viewportName.padEnd(7)} ${pageFile}`);
			problems.forEach(problem => console.log(`       ${problem}`));
			failures.push(...problems.map(problem => `${viewportName} ${pageFile}: ${problem}`));
		}
	}

	server.close();

	return { readouts: log.join('\n') + '\n', screenshots, failures };
}

/* A checkout of 'ref' in a temporary git worktree; returns its folder
   and a function that removes it. */
function checkoutRef(ref) {
	const folder = path.join(OUT_DIR, 'against-source');
	const git = args => childProcess.execFileSync('git', args, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });

	git(['worktree', 'add', '--detach', folder, ref]);

	return {
		folder,
		remove: () => git(['worktree', 'remove', '--force', folder])
	};
}

async function main() {
	const options = readArguments();
	const { chromium } = loadPlaywright();
	const browser = await chromium.launch();
	const nowDir = path.join(OUT_DIR, 'now');
	const failures = [];

	// with --ci, what may legitimately change from one commit to the next
	// (screenshots, read-outs regenerated on purpose) is reported, not failed
	const reported = options.ci ? [] : failures;

	fs.rmSync(OUT_DIR, { recursive: true, force: true });
	fs.mkdirSync(OUT_DIR, { recursive: true });

	// the reference to compare with: a commit, or the saved baseline
	let before = { dir: BASELINE_DIR, readouts: null, label: 'the baseline' };

	if (options.against) {
		const source = checkoutRef(options.against);
		const againstDir = path.join(OUT_DIR, 'against');

		try {
			const result = await capture(
				browser,
				source.folder,
				againstDir,
				options.only,
				`pages of ${options.against}`
			);

			before = { dir: againstDir, readouts: result.readouts, label: options.against };
		} finally {
			source.remove();
		}
	}

	const now = await capture(browser, ROOT, nowDir, options.only, 'pages of the working tree');

	failures.push(...now.failures);
	fs.writeFileSync(path.join(OUT_DIR, 'readouts.txt'), now.readouts);

	if (options.update) {
		saveBaseline(now, nowDir, options.only);
	} else {
		await compareAll(browser, now, nowDir, before, options.only, failures, reported);
	}

	await browser.close();

	if (options.ci) {
		writeSummary(failures, reported, before.label);
	}

	console.log(failures.length === 0 ? '\nsmoke: all pages pass' : `\nsmoke: ${failures.length} problems`);
	process.exitCode = failures.length === 0 ? 0 : 1;
}

/* --ci: the problems and the reported differences, also in the summary
   of the GitHub Actions job when there is one. */
function writeSummary(failures, reported, label) {
	const lines = ['## Smoke test', ''];

	lines.push(failures.length === 0 ? 'No problems on any page.' : `**${failures.length} problems:**`);
	failures.forEach(text => lines.push(`- ${text}`));
	lines.push('', `### Differences from ${label} (reported, not failed)`, '');
	lines.push(reported.length === 0 ? 'None: every screenshot and read-out is identical.' : '');
	reported.forEach(text => lines.push(`- ${text}`));

	if (reported.length > 0) {
		lines.push('', 'The images of the differences are in the artifact of this run.');
	}

	console.log(`\n${lines.join('\n')}`);

	if (process.env.GITHUB_STEP_SUMMARY) {
		fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
	}
}

/* --update: the read-outs (only for a full run) and the screenshots. */
function saveBaseline(now, nowDir, only) {
	if (!only) {
		fs.writeFileSync(READOUTS_FILE, now.readouts);
		console.log(`\nsmoke: wrote ${path.relative(ROOT, READOUTS_FILE)}`);
	}

	now.screenshots.forEach(name => {
		const target = path.join(BASELINE_DIR, name);

		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.copyFileSync(path.join(nowDir, name), target);
	});

	console.log(`smoke: saved ${now.screenshots.length} screenshots in ${path.relative(ROOT, BASELINE_DIR)}/`);
}

/* Compare two read-out logs; push a failure and print the first
   difference when they differ. */
function compareReadouts(expected, actual, label, failures) {
	if (expected === actual) {
		console.log(`smoke: read-outs identical to ${label}`);
		return;
	}

	const a = expected.split('\n');
	const b = actual.split('\n');
	const first = a.findIndex((line, i) => line !== b[i]);

	failures.push(`read-outs differ from ${label} from line ${first + 1}`);
	console.log(`smoke: read-outs DIFFER from ${label} (line ${first + 1})`);
	console.log(`  before: ${a[first]}\n  now:    ${b[first]}`);
}

/* Compare the read-outs (with readouts.txt on a full run, and with the
   commit of --against) and the screenshots (with the baseline or the
   commit of --against). A difference from readouts.txt always goes to
   'failures'; the others to 'reported' (the same list, without --ci). */
async function compareAll(browser, now, nowDir, before, only, failures, reported) {
	let differing = 0;

	console.log('');

	if (!only && fs.existsSync(READOUTS_FILE)) {
		compareReadouts(fs.readFileSync(READOUTS_FILE, 'utf8'), now.readouts, 'readouts.txt', failures);
	}

	if (before.readouts !== null) {
		compareReadouts(before.readouts, now.readouts, before.label, reported);
	}

	if (!fs.existsSync(before.dir)) {
		console.log(`smoke: no screenshots to compare with (run with --update or --against <ref>)`);
		return;
	}

	for (const name of now.screenshots) {
		const report = await compareScreenshot(browser, name, before.dir, nowDir);

		if (report) {
			differing++;
			reported.push(`screenshot ${report}`);
			console.log(`smoke: screenshot ${report}`);
		}
	}

	if (differing === 0) {
		console.log(`smoke: ${now.screenshots.length} screenshots identical to ${before.label}`);
	}
}

main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
