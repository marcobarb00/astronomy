/* ==========================================================================
   PREDICTING THE SKY - THE TEST PAGE IN NODE (tools/check/tests-node.js)
   Runs the cases of shared/tests.html (shared/tests.js: Meeus' worked
   examples, SOFA / ERFA values, JPL Horizons positions, the models of
   pages 1.1 to 1.3) in Node, without a browser, and exits with 1 if any
   case fails. The page itself is still the place to read the table.

   Usage, from the repository root:  node tools/check/tests-node.js
   Not part of the site.
   ========================================================================== */

'use strict';

const { loadPage, inContext, fireDomContentLoaded } = require('./load.js');

function main() {
	const site = loadPage('shared/tests.html');

	// the page's render() writes a table: here the results are read instead
	inContext(site, 'render = () => {}');
	fireDomContentLoaded(site);

	const cases = inContext(site, 'results').filter(result => !result.group);
	const failed = cases.filter(result => !result.pass);

	failed.forEach(result => {
		console.log(
			`FAIL ${result.name} (${result.source}): expected ${result.expected}, ` +
				`computed ${result.computed}, error ${result.error}, tolerance ${result.tolerance}`
		);
	});

	console.log(`tests: ${cases.length - failed.length} / ${cases.length} pass`);
	process.exitCode = failed.length === 0 ? 0 : 1;
}

main();
