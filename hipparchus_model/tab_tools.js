/* ==========================================================================
   TAB 7 - TOOLS AND LIMITS (tab_tools.js)
   Needs ../shared/common.js and hipparchus_model.js.

   Card 1: the table of chords, Crd θ = 2R sin(θ/2). Hipparchus' table is
	 lost; the reconstruction used here (G. J. Toomer) has steps of 7½°
	 and a radius of 3438 units, i.e. the radius measured in minutes of arc.
   Card 2: the "eclipse diagram" relating the distances of Sun and Moon:
	 π_moon + π_sun = θ_moon + θ_shadow, with π = 1 / distance (radians,
	 distances in Earth radii) and the Sun as large in the sky as the Moon.

   TABLE OF CONTENTS
	 1. Chords: geometry and table
	 2. Chords: drawing
	 3. Eclipse diagram: computation
	 4. Eclipse diagram: drawing
	 5. Read-outs and registration
   ========================================================================== */

(() => {

/* ==========================================================================
   1. CHORDS: GEOMETRY AND TABLE
   ========================================================================== */

const HIPPARCHUS_RADIUS = 3438;         // 21600' / 2π, rounded
const TABLE_STEP = 7.5;                 // degrees

const options = {
	radius: HIPPARCHUS_RADIUS
};

const chord = (theta, R) => 2 * R * sin(theta / 2);

/* The chord table: one row per 7½°, highlighting the row nearest theta. */
function buildChordTable(theta) {
	const header = '<tr><th>arc</th><th>Crd (R = 3438)</th><th>Crd (R = 60)</th><th>sin(arc / 2)</th></tr>';
	const nearest = Math.round(theta / TABLE_STEP);
	const rows = [];

	for (let i = 1; i <= 180 / TABLE_STEP; i++) {
		const arc = i * TABLE_STEP;
		const highlight = (i === nearest) ? ' class="hl"' : '';

		rows.push(
			`<tr${highlight}>` +
			`<td>${arc}°</td>` +
			`<td>${Math.round(chord(arc, HIPPARCHUS_RADIUS))}</td>` +
			`<td>${sexagesimal(chord(arc, 60), 2)}</td>` +
			`<td>${sin(arc / 2).toFixed(4)}</td>` +
			'</tr>'
		);
	}

	byId('chords').innerHTML = header + rows.join('');
}


/* ==========================================================================
   2. CHORDS: DRAWING
   ========================================================================== */

function drawChord(theta) {
	const plane = createPlane('cv-chord', 2.7);
	const start = -90 - theta / 2;                 // the chord is horizontal, below
	const a = polarPoint([0, 0], 1, start);
	const b = polarPoint([0, 0], 1, start + theta);
	const middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

	clearPlane(plane);

	strokeCircle(plane, [0, 0], 1, COL.deferent, 2.5);
	fillWedge(plane, [0, 0], 0.3, start, start + theta, COL.sun, 0.35);
	strokeArc(plane, [0, 0], 1, start, start + theta, COL.sun, 5);

	// radii, chord, half-chord
	strokeSegment(plane, [0, 0], a, COL.muted, 1.5);
	strokeSegment(plane, [0, 0], b, COL.muted, 1.5);
	strokeSegment(plane, [0, 0], middle, COL.muted, 1, [4, 4]);
	strokeSegment(plane, a, b, COL.planet, 3);
	strokeSegment(plane, middle, b, COL.earth, 3);

	fillDot(plane, [0, 0], 4, COL.ink);
	fillDot(plane, a, 4, COL.planet);
	fillDot(plane, b, 4, COL.planet);

	drawText(plane, 'θ', polarPoint([0, 0], 0.4, -90), 0, 0, { color: COL.ink, weight: 600 });
	drawText(plane, 'Crd θ', middle, 0, 20, { color: COL.planet, weight: 600 });
	drawText(plane, 'R sin(θ/2)', [(middle[0] + b[0]) / 2, middle[1]], 0, -14, { color: COL.earth, size: 14 });
	drawText(plane, 'R', polarPoint([0, 0], 0.55, start + theta + 8), 0, 0, { color: COL.muted });
}


/* ==========================================================================
   3. ECLIPSE DIAGRAM: COMPUTATION
   ========================================================================== */

/* Distances in Earth radii; angles in minutes of arc. */
function solveEclipseDiagram(moonDistance, shadowRatio, moonRadiusMinutes) {
	const moonRadius = moonRadiusMinutes / 60 * D2R;               // radians
	const sum = (1 + shadowRatio) * moonRadius;
	const moonParallax = 1 / moonDistance;
	const sunParallax = sum - moonParallax;

	return {
		sum: sum,
		moonParallax: moonParallax,
		sunParallax: sunParallax,
		sunDistance: sunParallax > 0 ? 1 / sunParallax : Infinity
	};
}


/* ==========================================================================
   4. ECLIPSE DIAGRAM: DRAWING
   A schematic, not to scale: the Moon is placed where the shadow cone is
   'shadowRatio' Moon radii wide.
   ========================================================================== */

function drawEclipseDiagram(shadowRatio) {
	const canvas = byId('cv-ecl');
	const ctx = canvas.getContext('2d');
	const cy = canvas.height / 2;
	const sun = { x: 80, r: 64 };
	const earth = { x: 320, r: 32 };
	const moonRadius = earth.r / 3.67;
	const slope = (sun.r - earth.r) / (earth.x - sun.x);        // narrowing per px
	const apexX = earth.x + earth.r / slope;
	const moonX = earth.x + (earth.r - shadowRatio * moonRadius) / slope;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// the shadow cone and the tangent lines from the Sun
	ctx.globalAlpha = 0.18;
	ctx.fillStyle = COL.muted;
	ctx.beginPath();
	ctx.moveTo(earth.x, cy - earth.r);
	ctx.lineTo(apexX, cy);
	ctx.lineTo(earth.x, cy + earth.r);
	ctx.closePath();
	ctx.fill();
	ctx.globalAlpha = 1;

	setStroke(ctx, COL.muted, 1.2, [6, 5]);
	drawLine2D(ctx, sun.x, cy - sun.r, apexX, cy);
	drawLine2D(ctx, sun.x, cy + sun.r, apexX, cy);
	drawLine2D(ctx, sun.x, cy, apexX + 30, cy);
	ctx.setLineDash([]);

	// shadow width at the Moon
	setStroke(ctx, COL.planet, 2);
	drawLine2D(ctx, moonX, cy - shadowRatio * moonRadius, moonX, cy + shadowRatio * moonRadius);

	drawDisc(ctx, sun.x, cy, sun.r, COL.sun);
	drawDisc(ctx, earth.x, cy, earth.r, COL.earth);
	ctx.globalAlpha = 0.6;
	drawDisc(ctx, moonX, cy, moonRadius, COL.planet);
	ctx.globalAlpha = 1;

	ctx.font = `15px ${CANVAS_FONT}`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = COL.ink;
	ctx.fillText('Sun', sun.x, cy + sun.r + 20);
	ctx.fillText('Earth', earth.x, cy + earth.r + 20);
	ctx.fillText('Moon in the shadow', moonX, cy - shadowRatio * moonRadius - 16);
	ctx.fillStyle = COL.muted;
	ctx.fillText('shadow cone', (moonX + apexX) / 2 + 40, cy + 30);
	ctx.fillText('not to scale', canvas.width - 70, 20);
}


/* ==========================================================================
   5. READ-OUTS AND REGISTRATION
   ========================================================================== */

function renderChordReadout(theta) {
	const R = options.radius;
	const value = chord(theta, R);
	const shown = (R === 60) ? `${sexagesimal(value, 2)}^{p}` : `${value.toFixed(1)}`;

	showLines('o-chord', [
		`\\theta=${theta}^\\circ,\\quad R=${R}`,
		`\\text{Crd}\\,\\theta=2R\\sin\\frac{\\theta}{2}=${shown}`,
		`\\sin x=\\frac{\\text{Crd}\\,2x}{2R}=${sin(theta / 2).toFixed(4)}\\quad(x=${theta / 2}^\\circ)`
	]);
}

function renderEclipseReadout(moonDistance, result) {
	const sun = Number.isFinite(result.sunDistance)
		? `${Math.round(result.sunDistance)}\\ \\text{Earth radii}`
		: '\\infty\\ \\text{(no solution: the Sun would be beyond infinity)}';
	const nearer = solveEclipseDiagram(moonDistance - 1, readNumber('ecl-ratio'), readNumber('ecl-size'));
	const nearerText = Number.isFinite(nearer.sunDistance) ? Math.round(nearer.sunDistance) : '\\infty';

	showLines('o-ecl', [
		`\\theta_{\\text{M}}(1+k)=${(result.sum * R2D * 60).toFixed(2)}'`,
		`\\pi_{\\text{M}}=\\frac{1}{${moonDistance.toFixed(1)}}\\ \\text{rad}=${(result.moonParallax * R2D * 60).toFixed(2)}'`,
		`\\pi_{\\text{S}}=\\theta_{\\text{M}}(1+k)-\\pi_{\\text{M}}=${(result.sunParallax * R2D * 60).toFixed(2)}'`,
		`D_{\\text{S}}=\\frac{1}{\\pi_{\\text{S}}}=${sun}`,
		`\\text{with the Moon 1 Earth radius nearer: }D_{\\text{S}}=${nearerText}`
	]);
}

function render() {
	const theta = readNumber('ch-angle');
	const moonDistance = readNumber('ecl-moon');
	const shadowRatio = readNumber('ecl-ratio');
	const result = solveEclipseDiagram(moonDistance, shadowRatio, readNumber('ecl-size'));

	drawChord(theta);
	buildChordTable(theta);
	renderChordReadout(theta);

	drawEclipseDiagram(shadowRatio);
	renderEclipseReadout(moonDistance, result);
}

/* Preset buttons that set the three eclipse sliders together. */
const ECLIPSE_PRESETS = {
	hipparchus: { 'ecl-moon': 67.33, 'ecl-ratio': 2.5, 'ecl-size': 16.62 },
	ptolemy: { 'ecl-moon': 64.17, 'ecl-ratio': 2.6, 'ecl-size': 15.67 }
};

function init() {
	wireChoices('ch-radius', choice => {
		options.radius = Number(choice);
		render();
	});

	wireChoices('ecl-presets', choice => {
		setSliders(ECLIPSE_PRESETS[choice]);
	});
}

registerTab('tools', { init, render });

})();
