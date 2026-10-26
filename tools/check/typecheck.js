/* ==========================================================================
   PREDICTING THE SKY - TYPE CHECK (tools/check/typecheck.js)
   Runs the TypeScript checker over the site's JavaScript (checkJs,
   non-strict), once per page with the scripts that page loads, in the
   order of its <script> tags, so that names of different pages never
   meet. The JSDoc comments in the code give the types where they are not
   obvious. Exits with 1 on any error.

   Usage, from the repository root:  node tools/check/typecheck.js
   Needs TypeScript (npm install). Not part of the site.
   ========================================================================== */

'use strict';

const path = require('path');
const childProcess = require('child_process');
const { ROOT, pageScripts } = require('./load.js');

/* Every page with scripts of its own, and the test page. */
const PAGES = [
	'act1-stage/01-turning-sky/index.html',
	'act1-stage/02-frames/index.html',
	'act1-stage/03-clocks/index.html',
	'act2-sun/01-uneven-year/index.html',
	'act2-sun/02-equation-of-time/index.html',
	'act2-sun/03-precession/index.html',
	'act3-moon/01-first-anomaly/index.html',
	'templates/page.html',
	'templates/demo.html',
	'shared/tests.html',
	'index.html'
];

const TSC = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const GLOBALS = 'tools/check/types/globals.d.ts';

const OPTIONS = [
	'--allowJs',
	'--checkJs',
	'--noEmit',
	'--strict',
	'false',
	'--target',
	'es2022',
	'--lib',
	'es2022,dom,dom.iterable',
	'--skipLibCheck'
];

/* Check one page; returns the number of errors and prints them. */
function checkPage(page) {
	const files = [GLOBALS, ...pageScripts(page)];
	const result = childProcess.spawnSync(process.execPath, [TSC, ...OPTIONS, ...files], {
		cwd: ROOT,
		encoding: 'utf8'
	});
	const errors = (result.stdout.match(/error TS\d+/g) ?? []).length;

	console.log(`${errors === 0 ? 'ok  ' : 'FAIL'} ${page} (${files.length - 1} scripts)`);

	if (errors > 0) {
		process.stdout.write(result.stdout);
	}

	return errors;
}

function main() {
	const errors = PAGES.reduce((sum, page) => sum + checkPage(page), 0);

	console.log(errors === 0 ? 'typecheck: no errors' : `typecheck: ${errors} errors`);
	process.exitCode = errors === 0 ? 0 : 1;
}

main();
