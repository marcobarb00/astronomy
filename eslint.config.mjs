/* ==========================================================================
   PREDICTING THE SKY - ESLINT CONFIGURATION (eslint.config.mjs)
   Development only: the site does not need it. Run with `npm run lint`.

   The site's scripts are plain <script> files that share one global
   scope. Each shared script's top-level names are read from its source,
   so that:
	 - every other script may use them (no-undef knows them);
	 - no script may declare a name another script already declares
	   (no-redeclare with builtinGlobals): such a page would stop with a
	   SyntaxError in the browser.
   Layout is left to Prettier (.prettierrc.json); these rules are about
   correctness only.
   ========================================================================== */

import fs from 'node:fs';
import js from '@eslint/js';
import globals from 'globals';


/* ==========================================================================
   1. THE SHARED GLOBALS
   ========================================================================== */

const SHARED_SCRIPTS = [
	'shared/common.js',
	'shared/time.js',
	'shared/ephemeris.js',
	'shared/stars.js',
	'shared/plate-stars.js',
	'shared/plate.js',
	'shared/models/diurnal.js',
	'shared/models/frames.js',
	'shared/models/mean-sun.js',
	'shared/models/clock.js',
	'shared/models/solar-eccentric.js',
	'shared/models/equation-of-time.js',
	'shared/models/precession.js',
	'shared/models/lunar-epicycle.js',
	'shared/models/lunar-crank.js',
	'shared/sphere3d.js',
	'shared/plot2d.js',
	'shared/errorcurve.js',
	'shared/site-map.js',
	'shared/components.js'
];

/* Names declared at the top level of a script (at the start of a line). */
function topLevelNames(file) {
	const source = fs.readFileSync(file, 'utf8');
	const pattern = /^(?:const|let|var|function|class|async function)\s+([A-Za-z_$][\w$]*)/gm;

	return [...source.matchAll(pattern)].map(match => match[1]);
}

/* { name: 'readonly' } for every shared name, except those of 'skip'. */
function sharedGlobals(skip = null) {
	const names = {};

	SHARED_SCRIPTS.filter(file => file !== skip).forEach(file => {
		topLevelNames(file).forEach(name => {
			names[name] = 'readonly';
		});
	});

	return names;
}

/* The libraries loaded from cdnjs. */
const LIBRARY_GLOBALS = {
	katex: 'readonly',
	renderMathInElement: 'readonly'
};


/* ==========================================================================
   2. RULES
   ========================================================================== */

const BROWSER_RULES = {
	'no-redeclare': ['error', { builtinGlobals: true }],
	'no-unused-vars': ['error', { vars: 'local', args: 'none' }],
	'no-shadow': ['error', { builtinGlobals: false }],
	eqeqeq: ['error', 'always'],
	'no-var': 'error',
	'prefer-const': 'error'
};

export default [
	{
		ignores: ['archive/**', 'node_modules/**', 'tools/check/out/**', '.claude/**']
	},
	js.configs.recommended,

	// each shared script sees the others' names (not its own: it declares them)
	...SHARED_SCRIPTS.map(file => ({
		files: [file],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'script',
			globals: { ...globals.browser, ...LIBRARY_GLOBALS, ...sharedGlobals(file) }
		},
		rules: BROWSER_RULES
	})),

	// the pages, the templates and the test page see every shared name
	{
		files: ['act*/**/*.js', 'templates/**/*.js', 'shared/tests.js', 'beyond-kepler/**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'script',
			globals: { ...globals.browser, ...LIBRARY_GLOBALS, ...sharedGlobals() }
		},
		rules: BROWSER_RULES
	},

	// the tools run in Node
	{
		files: ['tools/**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'commonjs',
			globals: { ...globals.node }
		},
		rules: {
			'no-unused-vars': ['error', { args: 'none' }],
			eqeqeq: ['error', 'always']
		}
	},

	// in-page functions of the smoke test run in the browser
	{
		files: ['tools/check/smoke.js'],
		languageOptions: {
			globals: { ...globals.browser }
		}
	},

	{
		files: ['eslint.config.mjs'],
		languageOptions: {
			sourceType: 'module',
			globals: { ...globals.node }
		}
	}
];
