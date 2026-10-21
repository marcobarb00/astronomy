/* ==========================================================================
   PREDICTING THE SKY - LOADING THE SITE'S CODE IN NODE (tools/check/load.js)
   The site's scripts are plain browser scripts that share one global
   scope. This module runs them in a Node vm context, with the smallest
   stand-in for the browser that lets them load (nothing runs before
   DOMContentLoaded, which never fires here), and hands back their global
   names. Used by the checks in tools/check/ and the scripts in
   tools/numbers/.

	 const { loadFiles, loadPage, inContext } = require('../check/load.js');
	 const site = loadFiles(['shared/common.js', 'shared/time.js']);
	 site.Time.julianDay(2000, 1, 1.5);

   TABLE OF CONTENTS
	 1. The browser stand-in
	 2. Loading files and pages
	 3. Export
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

/* The key under which a loaded object hands back its vm context. */
const CONTEXT = Symbol('context');

/* ==========================================================================
   1. THE BROWSER STAND-IN
   ========================================================================== */

/* A new global object for a context. The handlers registered for
   DOMContentLoaded are kept, so a caller can run them on purpose
   (tests-node.js does, for shared/tests.js). */
function browserStub() {
	const handlers = [];

	return {
		console: console,
		document: {
			currentScript: null,
			addEventListener: (type, handler) => {
				if (type === 'DOMContentLoaded') {
					handlers.push(handler);
				}
			}
		},
		window: {
			devicePixelRatio: 1
		},
		__domContentLoaded: handlers
	};
}

/* ==========================================================================
   2. LOADING FILES AND PAGES
   ========================================================================== */

/* Run the given files (paths from the repository root) in a new context.
   Returns an object whose properties are the context's global names: a
   top-level const of a script is not a property of the context, so each
   name is looked up by evaluating it there. */
function loadFiles(files) {
	const context = browserStub();

	vm.createContext(context);

	files.forEach(file => {
		const source = fs.readFileSync(path.join(ROOT, file), 'utf8');

		vm.runInContext(source, context, { filename: file });
	});

	return new Proxy(
		{},
		{
			get: (target, name) => (name === CONTEXT ? context : vm.runInContext(String(name), context))
		}
	);
}

/* The local scripts of a page (path from the root), in the order of its
   <script> tags. */
function pageScripts(htmlFile) {
	const html = fs.readFileSync(path.join(ROOT, htmlFile), 'utf8');
	const folder = path.dirname(htmlFile);
	const sources = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);

	return sources
		.filter(source => !/^https?:/.test(source))
		.map(source => path.posix.normalize(path.posix.join(folder, source)));
}

/* Every local script of a page, loaded in a context of its own. */
function loadPage(htmlFile) {
	return loadFiles(pageScripts(htmlFile));
}

/* Evaluate an expression in the context of a loaded object. */
function inContext(names, expression) {
	return vm.runInContext(expression, names[CONTEXT]);
}

/* Run the DOMContentLoaded handlers that the loaded scripts registered. */
function fireDomContentLoaded(names) {
	names[CONTEXT].__domContentLoaded.forEach(handler => handler());
}

/* ==========================================================================
   3. EXPORT
   ========================================================================== */

module.exports = {
	ROOT,
	loadFiles,
	loadPage,
	pageScripts,
	inContext,
	fireDomContentLoaded
};
