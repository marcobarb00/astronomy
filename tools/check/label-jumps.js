/* ==========================================================================
   PREDICTING THE SKY - LABEL JUMPS (tools/check/label-jumps.js)
   Finds the labels of a figure that jump: a name or a letter that moves
   by several pixels for an arbitrarily small move of a control, instead
   of following its point (CLAUDE.md, "A label never jumps").

   Serves the repository on a local port and opens each page in Chromium
   (Playwright). Every label drawn on a canvas in the atlas fonts (the
   names and symbols of labelFont, not the ticks) is recorded where it is
   drawn. Then, for each figure and each of its views (the buttons of a
   buildChoice row), every slider is swept from its minimum to its
   maximum; between two positions where a label moved by more than
   JUMP_PX, the interval is halved again and again: a label that follows
   its point moves less and less, one that jumps keeps the same leap down
   to an interval of a millionth of the slider's range. Every sphere is
   then dragged by a few pixels at a time, and a leap of more than JUMP_PX
   for one such step is a jump too.

   Usage, from the repository root:
	 node tools/check/label-jumps.js
		 every page, at desktop and phone width
	 node tools/check/label-jumps.js --only 3.2
		 only the pages whose path contains "3.2", or page 3.2 itself
	 node tools/check/label-jumps.js --phone / --desktop
		 one width only
   Output: one line per jump (page, width, figure, control, label, the
   value where it jumps, the leap in px); exits with 1 if there is one.
   Needs Playwright with its Chromium, as smoke.js. Not part of the site.

   TABLE OF CONTENTS
	 1. Settings
	 2. Static server and pages
	 3. Recording the labels in the page
	 4. Sweeping the sliders
	 5. Dragging the spheres
	 6. Main
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

/* Folders that hold no pages of the site, and pages with no figures. */
const SKIP_FOLDERS = new Set(['.git', '.claude', 'node_modules', 'tools', 'raw', 'archive', 'design', 'templates']);

const VIEWPORTS = {
	desktop: { width: 1280, height: 900 },
	phone: { width: 390, height: 844 }
};

/* A label that moves by more than this (CSS px) over an interval too small
   for its point to move visibly has jumped. */
const JUMP_PX = 6;

/* The first sweep of a slider, in steps over its range; then the halving
   of an interval where a label moved by more than JUMP_PX, at most this
   many times (2^-20 of a step: a millionth of the range of a typical
   slider). */
const SWEEP_STEPS = 240;
const HALVINGS = 20;

/* Each sphere is dragged this many pixels right, then down, DRAG_STEP_PX
   at a time: a label that follows its point moves by a few pixels for
   such a step, one that jumps by more than JUMP_PX. */
const DRAG_PX = 80;
const DRAG_STEP_PX = 2;

/* The jumps that are meant: the name of an angle drawn as an arc stands
   at the middle of its arc, and when the angle goes through 360° the arc
   itself goes from a full turn to nothing, so its name restarts with it.
   Keyed by page number, figure and label. */
const ALLOWED = {
	'2.1 figure 3 M': 'the arc M wraps from 360° to 0°',
	'2.3 figure 2 λ': 'the arc λ wraps from 360° to 0°',
	'3.1 figure 2 M': 'the arc M wraps from 360° to 0°',
	'3.3 figure 2 F': 'the arc F wraps from 360° to 0°',
	'3.3 figure 2 Ω': 'the arc Ω wraps from 360° to 0°',
	'4.1 figure 2 μ': 'the arc μ wraps from 360° to 0°',
	'4.2 figure 4 M': 'the arc M wraps from 360° to 0°'
};

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
   2. STATIC SERVER AND PAGES
   ========================================================================== */

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.webp': 'image/webp',
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

/* The content pages of the site: index.html in a folder of an act. */
function findPages(root) {
	const pages = [];

	fs.readdirSync(root, { withFileTypes: true }).forEach(act => {
		if (!act.isDirectory() || SKIP_FOLDERS.has(act.name) || !act.name.startsWith('act')) {
			return;
		}

		fs.readdirSync(path.join(root, act.name), { withFileTypes: true }).forEach(entry => {
			const file = path.posix.join(act.name, entry.name, 'index.html');

			if (entry.isDirectory() && fs.existsSync(path.join(root, file))) {
				pages.push(file);
			}
		});
	});

	return pages.sort();
}

/* The number of a page ("3.2"), from its path. */
function pageNumber(page) {
	const number = page.match(/^act(\d)[^/]*\/0?(\d+)-/);

	return number === null ? '' : `${number[1]}.${number[2]}`;
}

/* Does the page match --only (a part of its path, or its number "3.2")? */
function matchesOnly(page, only) {
	return !only || page.includes(only) || pageNumber(page) === only;
}

/* ==========================================================================
   3. RECORDING THE LABELS IN THE PAGE
   Injected before the page's scripts. Each canvas keeps the labels of its
   last drawing: a clearRect over the whole canvas starts a new drawing,
   and every fillText in a Cormorant font (a name or a symbol of
   labelFont) adds { text, x, y }, in CSS px of the canvas, with the
   alignment and the measured width so that the recorded point is the
   label's center whatever its alignment.
   ========================================================================== */

function recorder() {
	const proto = CanvasRenderingContext2D.prototype;
	const clearRect = proto.clearRect;
	const fillText = proto.fillText;

	/* The canvas pixels of a point of the context's current space, in CSS px. */
	function toCss(ctx, x, y) {
		const m = ctx.getTransform();
		const ratio = window.devicePixelRatio || 1;

		return { x: (m.a * x + m.c * y + m.e) / ratio, y: (m.b * x + m.d * y + m.f) / ratio };
	}

	proto.clearRect = function (x, y, w, h) {
		const a = toCss(this, x, y);
		const b = toCss(this, x + w, y + h);
		const ratio = window.devicePixelRatio || 1;
		const area = Math.abs((b.x - a.x) * (b.y - a.y));

		if (area >= (0.9 * this.canvas.width * this.canvas.height) / (ratio * ratio)) {
			this.canvas.__labels = [];
		}

		return clearRect.call(this, x, y, w, h);
	};

	proto.fillText = function (text, x, y, ...rest) {
		if (/Cormorant/.test(this.font) && this.globalAlpha > 0) {
			const m = this.measureText(text);
			const centerX = x + (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
			const centerY = y + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
			const at = toCss(this, centerX, centerY);

			(this.canvas.__labels ??= []).push({ text: String(text), x: at.x, y: at.y });
		}

		return fillText.call(this, text, x, y, ...rest);
	};
}

/* Two animation frames: every figure has drawn what the last event asked. */
function twoFrames() {
	return new Promise(resolve => {
		requestAnimationFrame(() => requestAnimationFrame(resolve));
	});
}

/* The labels of every canvas of the figure 'figureIndex', keyed by canvas
   index, text, occurrence and number of labels with that text ("2|γ|0|2"):
   { key: { x, y } }. A label that appears or disappears (a faint name
   hidden under another) changes the keys of the others with its text, so
   that they are not compared across it. */
function labelsOf(figureIndex) {
	const figure = document.querySelectorAll('figure.fig')[figureIndex];
	const result = {};

	[...figure.querySelectorAll('canvas')].forEach((canvas, c) => {
		const labels = canvas.__labels ?? [];
		const count = {};
		const seen = {};

		labels.forEach(label => {
			count[label.text] = (count[label.text] ?? 0) + 1;
		});

		labels.forEach(label => {
			const n = seen[label.text] ?? 0;

			seen[label.text] = n + 1;
			result[`${c}|${label.text}|${n}|${count[label.text]}`] = { x: label.x, y: label.y };
		});
	});

	return result;
}

/* ==========================================================================
   4. SWEEPING THE SLIDERS
   ========================================================================== */

/* Set the slider 'sliderIndex' of the figure to 'value' (any value: its
   step is lifted while the check runs), wait for the drawing, and return
   the figure's labels. */
async function labelsAt(page, figureIndex, sliderIndex, value) {
	return page.evaluate(
		async ({ figureIndex, sliderIndex, value }) => {
			const figure = document.querySelectorAll('figure.fig')[figureIndex];
			const slider = figure.querySelectorAll('input[type=range]')[sliderIndex];

			slider.value = String(value);
			slider.dispatchEvent(new Event('input', { bubbles: true }));
			await window.__twoFrames();

			return window.__labelsOf(figureIndex);
		},
		{ figureIndex, sliderIndex, value }
	);
}

/* The largest leap of a label between two drawings: { key, leap }. */
function largestLeap(a, b) {
	let worst = { key: null, leap: 0 };

	Object.keys(a).forEach(key => {
		if (b[key]) {
			const leap = Math.hypot(b[key].x - a[key].x, b[key].y - a[key].y);

			if (leap > worst.leap) {
				worst = { key, leap };
			}
		}
	});

	return worst;
}

/* Halve the interval [v0, v1] around the label 'key' until it moves by
   less than JUMP_PX (it follows its point) or HALVINGS halvings are done
   (it jumps). Returns { value, leap } of the jump, or null. */
async function refine(page, figureIndex, sliderIndex, key, v0, v1, a, b) {
	for (let i = 0; i < HALVINGS; i++) {
		const middle = (v0 + v1) / 2;
		const m = await labelsAt(page, figureIndex, sliderIndex, middle);

		if (!m[key]) {
			return null;
		}

		const first = Math.hypot(m[key].x - a[key].x, m[key].y - a[key].y);
		const second = Math.hypot(b[key].x - m[key].x, b[key].y - m[key].y);

		if (first >= second) {
			v1 = middle;
			b = m;
		} else {
			v0 = middle;
			a = m;
		}

		if (Math.max(first, second) <= JUMP_PX) {
			return null;
		}
	}

	return { value: (v0 + v1) / 2, leap: Math.hypot(b[key].x - a[key].x, b[key].y - a[key].y) };
}

/* Sweep one slider of a figure; report each label that jumps, once. */
async function sweepSlider(page, figureIndex, sliderIndex, report) {
	const info = await page.evaluate(
		({ figureIndex, sliderIndex }) => {
			const figure = document.querySelectorAll('figure.fig')[figureIndex];
			const slider = figure.querySelectorAll('input[type=range]')[sliderIndex];
			const visible = slider.offsetParent !== null;

			slider.dataset.labelJumpsStep = slider.step;
			slider.step = 'any';

			return {
				id: slider.id || `slider ${sliderIndex}`,
				min: Number(slider.min || 0),
				max: Number(slider.max || 100),
				value: Number(slider.value),
				visible
			};
		},
		{ figureIndex, sliderIndex }
	);

	if (!info.visible) {
		return;
	}

	const reported = new Set();
	let previous = await labelsAt(page, figureIndex, sliderIndex, info.min);
	let v0 = info.min;

	for (let i = 1; i <= SWEEP_STEPS; i++) {
		const v1 = info.min + ((info.max - info.min) * i) / SWEEP_STEPS;
		const next = await labelsAt(page, figureIndex, sliderIndex, v1);

		for (const key of Object.keys(previous)) {
			if (reported.has(key) || !next[key]) {
				continue;
			}

			const leap = Math.hypot(next[key].x - previous[key].x, next[key].y - previous[key].y);

			if (leap > JUMP_PX) {
				const jump = await refine(page, figureIndex, sliderIndex, key, v0, v1, previous, next);

				if (jump) {
					reported.add(key);
					report(`#${info.id} = ${jump.value.toFixed(4)}`, key, jump.leap);
				}
			}
		}

		previous = next;
		v0 = v1;
	}

	// back to where it was, with its own step
	await page.evaluate(
		({ figureIndex, sliderIndex, value }) => {
			const figure = document.querySelectorAll('figure.fig')[figureIndex];
			const slider = figure.querySelectorAll('input[type=range]')[sliderIndex];

			slider.step = slider.dataset.labelJumpsStep;
			slider.value = String(value);
			slider.dispatchEvent(new Event('input', { bubbles: true }));
		},
		{ figureIndex, sliderIndex, value: info.value }
	);
}

/* ==========================================================================
   5. DRAGGING THE SPHERES
   ========================================================================== */

/* The labels of a figure with the mouse at (x, y), the button held. */
async function labelsAtMouse(page, figureIndex, x, y) {
	await page.mouse.move(x, y);

	return page.evaluate(async index => {
		await window.__twoFrames();

		return window.__labelsOf(index);
	}, figureIndex);
}

/* Halve a step of a drag from a to b ({ x, y }, page px) around the label
   'key', as refine does for a slider: a sphere's view is a function of
   how far the mouse has gone, so any point of the step can be visited.
   Returns the leap that remains, or 0 if the label follows its point. */
async function refineDrag(page, figureIndex, key, a, b, labelsA, labelsB) {
	for (let i = 0; i < HALVINGS; i++) {
		const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
		const m = await labelsAtMouse(page, figureIndex, middle.x, middle.y);

		if (!m[key]) {
			return 0;
		}

		const first = Math.hypot(m[key].x - labelsA[key].x, m[key].y - labelsA[key].y);
		const second = Math.hypot(labelsB[key].x - m[key].x, labelsB[key].y - m[key].y);

		if (Math.max(first, second) <= JUMP_PX) {
			return 0;
		}

		if (first >= second) {
			b = middle;
			labelsB = m;
		} else {
			a = middle;
			labelsA = m;
		}
	}

	return Math.hypot(labelsB[key].x - labelsA[key].x, labelsB[key].y - labelsA[key].y);
}

/* Drag each sphere of a figure DRAG_STEP_PX at a time; a label that leaps
   by more than JUMP_PX over a step, and still does over a step halved
   again and again (refineDrag), has jumped. */
async function dragSpheres(page, figureIndex, report) {
	const spheres = page.locator('figure.fig').nth(figureIndex).locator('canvas.sphere3d');
	const count = await spheres.count();

	for (let s = 0; s < count; s++) {
		const sphere = spheres.nth(s);

		if (!(await sphere.isVisible())) {
			continue;
		}

		await sphere.scrollIntoViewIfNeeded();

		const box = await sphere.boundingBox();
		const reported = new Set();
		let x = box.x + box.width / 2;
		let y = box.y + box.height / 2;

		await page.mouse.move(x, y);
		await page.mouse.down();

		let previous = await page.evaluate(i => window.__labelsOf(i), figureIndex);

		for (let i = 0; i < (2 * DRAG_PX) / DRAG_STEP_PX; i++) {
			const from = { x, y };

			if (i < DRAG_PX / DRAG_STEP_PX) {
				x += DRAG_STEP_PX;
			} else {
				y += DRAG_STEP_PX;
			}

			const next = await labelsAtMouse(page, figureIndex, x, y);
			const worst = largestLeap(previous, next);

			if (worst.leap > JUMP_PX && !reported.has(worst.key)) {
				const leap = await refineDrag(page, figureIndex, worst.key, from, { x, y }, previous, next);

				if (leap > JUMP_PX) {
					reported.add(worst.key);
					report(`drag sphere ${s} (${(i + 1) * DRAG_STEP_PX} px)`, worst.key, leap);
				}

				await labelsAtMouse(page, figureIndex, x, y);
			}

			previous = next;
		}

		await page.mouse.up();
	}
}

/* ==========================================================================
   6. MAIN
   ========================================================================== */

/* The groups of view buttons of a figure (the rows built by buildChoice,
   whose buttons carry aria-pressed; not the play buttons, which do too):
   [[buttonIndex, ...], ...], the indices among the figure's buttons. */
function viewGroups() {
	return [...document.querySelectorAll('figure.fig')].map(figure => {
		const buttons = [...figure.querySelectorAll('button')];
		const groups = new Map();

		buttons.forEach((button, i) => {
			if (button.hasAttribute('aria-pressed') && !button.classList.contains('play')) {
				const group = groups.get(button.parentElement) ?? [];

				group.push(i);
				groups.set(button.parentElement, group);
			}
		});

		return [...groups.values()].filter(group => group.length > 1);
	});
}

/* Check one page at one width; returns the number of jumps. */
async function checkPage(browser, base, file, viewportName) {
	const context = await browser.newContext({ viewport: VIEWPORTS[viewportName] });
	const page = await context.newPage();
	let jumps = 0;

	await page.addInitScript(recorder);
	await page.addInitScript(`window.__twoFrames = ${twoFrames.toString()};`);
	await page.addInitScript(`window.__labelsOf = ${labelsOf.toString()};`);
	await page.goto(base + file, { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);

	const groups = await page.evaluate(viewGroups);

	for (let f = 0; f < groups.length; f++) {
		const figure = page.locator('figure.fig').nth(f);
		const sliders = await figure.locator('input[type=range]').count();
		const buttons = figure.locator('button');

		// the default view, then each other view of each row of view buttons
		const views = [null];

		groups[f].forEach(group => group.slice(1).forEach(i => views.push(i)));

		for (const view of views) {
			let viewName = 'default view';

			if (view !== null) {
				viewName = (await buttons.nth(view).textContent()).trim();
				await buttons.nth(view).click();
			}

			const report = (where, key, leap) => {
				const [canvas, text] = key.split('|');

				if (ALLOWED[`${pageNumber(file)} figure ${f + 1} ${text}`]) {
					return;
				}

				jumps += 1;
				console.log(
					`${file} [${viewportName}] figure ${f + 1}, ${viewName}, canvas ${canvas}: ` +
						`"${text}" jumps ${leap.toFixed(0)} px at ${where}`
				);
			};

			for (let s = 0; s < sliders; s++) {
				await sweepSlider(page, f, s, report);
			}

			await dragSpheres(page, f, report);
		}

		// back to the default view
		for (const group of groups[f]) {
			await buttons.nth(group[0]).click();
		}
	}

	await context.close();

	return jumps;
}

async function main() {
	const args = process.argv.slice(2);
	const onlyIndex = args.indexOf('--only');
	const only = onlyIndex >= 0 ? args[onlyIndex + 1] : null;
	let widths = ['desktop', 'phone'];

	if (args.includes('--phone')) {
		widths = ['phone'];
	} else if (args.includes('--desktop')) {
		widths = ['desktop'];
	}

	const { chromium } = loadPlaywright();
	const browser = await chromium.launch();
	const { server, base } = await startServer(ROOT);
	let jumps = 0;

	for (const file of findPages(ROOT).filter(p => matchesOnly(p, only))) {
		for (const width of widths) {
			jumps += await checkPage(browser, base, file, width);
		}
	}

	await browser.close();
	server.close();
	console.log(jumps === 0 ? 'No label jumps.' : `${jumps} label jumps.`);
	process.exit(jumps === 0 ? 0 : 1);
}

main();
