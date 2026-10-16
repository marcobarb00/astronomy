/* ==========================================================================
   TAB 2 - THE CELESTIAL SPHERE AND THE STAR CATALOGUE (tab_catalogue.js)
   Needs ../shared/common.js and hipparchus_model.js.

   The world basis is the equator of date: x towards the vernal equinox of
   the chosen epoch, z towards the north celestial pole. Star positions are
   modern (J2000, rounded) and are carried to the epoch by a uniform
   precession in ecliptic longitude: a simple model, good to a fraction of a
   degree over two thousand years, which is enough for a picture.

   TABLE OF CONTENTS
	 1. Star data
	 2. Coordinates   (J2000 -> ecliptic -> epoch -> equator of date)
	 3. Drawing the sphere
	 4. Magnitude chart
	 5. Read-out and registration
   ========================================================================== */

(() => {

/* ==========================================================================
   1. STAR DATA
   Right ascension [h, m], declination (deg), visual magnitude (J2000).
   ========================================================================== */

const STARS = [
	{ name: 'Sirius',     ra: [6, 45.1],  dec: -16.72, v: -1.46 },
	{ name: 'Arcturus',   ra: [14, 15.7], dec: 19.18,  v: -0.05 },
	{ name: 'Vega',       ra: [18, 36.9], dec: 38.78,  v: 0.03 },
	{ name: 'Capella',    ra: [5, 16.7],  dec: 46.00,  v: 0.08 },
	{ name: 'Rigel',      ra: [5, 14.5],  dec: -8.20,  v: 0.13 },
	{ name: 'Procyon',    ra: [7, 39.3],  dec: 5.23,   v: 0.34 },
	{ name: 'Betelgeuse', ra: [5, 55.2],  dec: 7.41,   v: 0.50 },
	{ name: 'Altair',     ra: [19, 50.8], dec: 8.87,   v: 0.77 },
	{ name: 'Aldebaran',  ra: [4, 35.9],  dec: 16.51,  v: 0.85 },
	{ name: 'Spica',      ra: [13, 25.2], dec: -11.16, v: 0.97 },
	{ name: 'Antares',    ra: [16, 29.4], dec: -26.43, v: 1.06 },
	{ name: 'Pollux',     ra: [7, 45.3],  dec: 28.03,  v: 1.14 },
	{ name: 'Fomalhaut',  ra: [22, 57.7], dec: -29.62, v: 1.16 },
	{ name: 'Deneb',      ra: [20, 41.4], dec: 45.28,  v: 1.25 },
	{ name: 'Regulus',    ra: [10, 8.4],  dec: 11.97,  v: 1.35 },
	{ name: 'Castor',     ra: [7, 34.6],  dec: 31.89,  v: 1.58 },
	{ name: 'Shaula',     ra: [17, 33.6], dec: -37.10, v: 1.62 },
	{ name: 'Bellatrix',  ra: [5, 25.1],  dec: 6.35,   v: 1.64 },
	{ name: 'Alnilam',    ra: [5, 36.2],  dec: -1.20,  v: 1.69 },
	{ name: 'Alnitak',    ra: [5, 40.8],  dec: -1.94,  v: 1.77 },
	{ name: 'Alioth',     ra: [12, 54.0], dec: 55.96,  v: 1.77 },
	{ name: 'Dubhe',      ra: [11, 3.7],  dec: 61.75,  v: 1.79 },
	{ name: 'Alkaid',     ra: [13, 47.5], dec: 49.31,  v: 1.86 },
	{ name: 'Polaris',    ra: [2, 31.8],  dec: 89.26,  v: 1.98 },
	{ name: 'Hamal',      ra: [2, 7.2],   dec: 23.46,  v: 2.00 },
	{ name: 'Alpheratz',  ra: [0, 8.4],   dec: 29.09,  v: 2.06 },
	{ name: 'Algieba',    ra: [10, 20.0], dec: 19.84,  v: 2.08 },
	{ name: 'Saiph',      ra: [5, 47.8],  dec: -9.67,  v: 2.09 },
	{ name: 'Denebola',   ra: [11, 49.1], dec: 14.57,  v: 2.13 },
	{ name: 'Alphecca',   ra: [15, 34.7], dec: 26.71,  v: 2.22 },
	{ name: 'Mizar',      ra: [13, 23.9], dec: 54.93,  v: 2.23 },
	{ name: 'Mintaka',    ra: [5, 32.0],  dec: -0.30,  v: 2.23 },
	{ name: 'Schedar',    ra: [0, 40.5],  dec: 56.54,  v: 2.24 },
	{ name: 'Caph',       ra: [0, 9.2],   dec: 59.15,  v: 2.28 },
	{ name: 'Dschubba',   ra: [16, 0.3],  dec: -22.62, v: 2.29 },
	{ name: 'Merak',      ra: [11, 1.8],  dec: 56.38,  v: 2.37 },
	{ name: 'Phecda',     ra: [11, 53.8], dec: 53.69,  v: 2.44 },
	{ name: 'Gamma Cas',  ra: [0, 56.7],  dec: 60.72,  v: 2.47 },
	{ name: 'Zosma',      ra: [11, 14.1], dec: 20.52,  v: 2.56 },
	{ name: 'Acrab',      ra: [16, 5.4],  dec: -19.81, v: 2.62 },
	{ name: 'Ruchbah',    ra: [1, 25.8],  dec: 60.24,  v: 2.68 },
	{ name: 'Porrima',    ra: [12, 41.7], dec: -1.45,  v: 2.74 },
	{ name: 'Vindemiatrix', ra: [13, 2.2], dec: 10.96, v: 2.83 },
	{ name: 'Alcyone',    ra: [3, 47.5],  dec: 24.11,  v: 2.87 },
	{ name: 'Epsilon Leo', ra: [9, 45.9], dec: 23.77,  v: 2.98 },
	{ name: 'Gamma Lyr',  ra: [18, 59.0], dec: 32.69,  v: 3.24 },
	{ name: 'Megrez',     ra: [12, 15.4], dec: 57.03,  v: 3.31 },
	{ name: 'Chertan',    ra: [11, 14.2], dec: 15.43,  v: 3.33 },
	{ name: 'Zeta Vir',   ra: [13, 34.7], dec: -0.60,  v: 3.37 },
	{ name: 'Delta Vir',  ra: [12, 55.6], dec: 3.40,   v: 3.38 },
	{ name: 'Meissa',     ra: [5, 35.1],  dec: 9.93,   v: 3.39 },
	{ name: 'Beta Lyr',   ra: [18, 50.1], dec: 33.36,  v: 3.45 },
	{ name: 'Thuban',     ra: [14, 4.4],  dec: 64.38,  v: 3.65 },
	{ name: 'Beta CrB',   ra: [15, 27.8], dec: 29.11,  v: 3.68 },
	{ name: 'Gamma CrB',  ra: [15, 42.7], dec: 26.30,  v: 3.84 },
	{ name: 'Eta Vir',    ra: [12, 19.9], dec: -0.67,  v: 3.89 },
	{ name: 'Theta CrB',  ra: [15, 32.9], dec: 31.36,  v: 4.14 },
	{ name: 'Epsilon CrB', ra: [15, 57.6], dec: 26.88, v: 4.15 },
	{ name: 'Zeta Lyr',   ra: [18, 44.8], dec: 37.60,  v: 4.36 },
	{ name: 'Delta CrB',  ra: [15, 49.6], dec: 26.07,  v: 4.63 },
	{ name: 'Epsilon Lyr', ra: [18, 44.3], dec: 39.67, v: 4.67 },
	{ name: 'Iota CrB',   ra: [16, 1.4],  dec: 29.85,  v: 4.98 },
	{ name: 'Pleione',    ra: [3, 49.2],  dec: 24.14,  v: 5.05 },
	{ name: 'Asterope',   ra: [3, 45.9],  dec: 24.55,  v: 5.76 }
];

/* Stars offered in the "featured star" menu. */
const FEATURED = ['Spica', 'Regulus', 'Aldebaran', 'Antares', 'Arcturus', 'Alphecca', 'Polaris', 'Sirius'];

const RHODES_LATITUDE = 36.4;       // where Hipparchus observed (deg)


/* ==========================================================================
   2. COORDINATES
   ========================================================================== */

/* Position of a star at the epoch: precession adds to the ecliptic longitude
   and leaves the latitude unchanged (Hipparchus' own conclusion, VII 3). */
function starAtEpoch(star, year) {
	const j2000 = starEcliptic(star);
	const lon = longitudeAtEpoch(j2000.lon, year);
	const equatorial = eclipticToEquatorial(lon, j2000.lat);
	const radec = toLonLat(equatorial);

	return {
		vector: equatorial,
		lon: lon,
		lat: j2000.lat,
		ra: radec.lon,
		dec: radec.lat
	};
}

/* Ancient magnitude class: the nearest whole class between 1 and 6. */
const magnitudeClass = v => clamp(Math.round(v), 1, 6);

/* Drawn radius (px) for a magnitude class. */
const starRadius = magnitude => 1.6 + 1.2 * (6 - magnitude);


/* ==========================================================================
   3. DRAWING THE SPHERE
   ========================================================================== */

/* Parallel of latitude lat in a frame [e1, e2, e3]. */
function parallel(axes, lat) {
	const [e1, e2, e3] = axes;
	const lift = scale(e3, sin(lat));

	return sampleParametric(t => {
		const ring = lin2(e1, e2, cos(lat) * cos(t), cos(lat) * sin(t));

		return add3(ring, lift);
	});
}

/* Parallels and meridians of a frame given by its axes [e1, e2, e3]. */
function drawGrid(stage, axes, color) {
	const [e1, e2, e3] = axes;

	[-60, -30, 30, 60].forEach(lat => {
		strokePath(stage, parallel(axes, lat), color, 0.8, [3, 4]);
	});

	for (let lon = 0; lon < 180; lon += 30) {
		const direction = lin2(e1, e2, cos(lon), sin(lon));

		strokePath(stage, sampleCircle(direction, e3), color, 0.8, [3, 4]);
	}
}

/* Axes of the ecliptic frame written in the equatorial (world) basis. */
const ECLIPTIC_AXES = [[1, 0, 0], [0, cosEps, sinEps], [0, -sinEps, cosEps]];
const EQUATOR_AXES = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/* One star: dimmer on the far side of the sphere. */
function drawStar(stage, star, position) {
	const q = project(stage, position.vector);

	stage.ctx.globalAlpha = q.d > 0 ? FAR_SIDE_ALPHA : 1;
	drawDisc(stage.ctx, q.x, q.y, starRadius(magnitudeClass(star.v)), COL.ink);
	stage.ctx.globalAlpha = 1;
}

/* The two coordinates of the featured star, as arcs. */
function drawCoordinateArcs(stage, grid, position) {
	if (grid === 'ecliptic') {
		const [e1, e2, e3] = ECLIPTIC_AXES;
		const foot = lin2(e1, e2, cos(position.lon), sin(position.lon));

		strokePath(stage, sampleArc(e1, e2, position.lon, 1, 60), COL.sun, 4);
		strokePath(stage, sampleArc(foot, e3, position.lat, 1, 20), COL.planet, 4);
	} else {
		const foot = [cos(position.ra), sin(position.ra), 0];

		strokePath(stage, sampleArc([1, 0, 0], [0, 1, 0], position.ra, 1, 60), COL.earth, 4);
		strokePath(stage, sampleArc(foot, [0, 0, 1], position.dec, 1, 20), COL.planet, 4);
	}
}

function drawScene(year, grid, featuredName) {
	const stage = createStage('cv-cat');
	const axes = grid === 'ecliptic' ? ECLIPTIC_AXES : EQUATOR_AXES;
	const gridColor = grid === 'ecliptic' ? COL.sun : COL.earth;
	let featured = null;

	beginScene(stage);
	drawGrid(stage, axes, gridColor);

	// equator, ecliptic, poles
	strokePath(stage, greatCircle([0, 0, 1]), COL.earth, 2.2);
	strokePath(stage, greatCircle(ECLIPTIC_AXES[2]), COL.sun, 2.2);
	strokePath(stage, [[0, 0, -POLE_LENGTH], [0, 0, POLE_LENGTH]], COL.muted, 1);
	drawLabel(stage, 'P', [0, 0, POLE_LENGTH], COL.ink);

	// stars that never rise at Rhodes lie inside this circle
	strokePath(stage, smallCircle([0, 0, -1], RHODES_LATITUDE), COL.muted, 1.2, [8, 5]);

	STARS.forEach(star => {
		const position = starAtEpoch(star, year);

		drawStar(stage, star, position);

		if (star.name === featuredName) {
			featured = { star, position };
		}
	});

	// vernal equinox of the epoch
	drawPoint(stage, [1, 0, 0], COL.ink, 4);
	drawLabel(stage, 'V', [1, 0, 0], COL.ink, 6, 16);

	if (featured) {
		drawCoordinateArcs(stage, grid, featured.position);
		drawPoint(stage, featured.position.vector, COL.planet, 6);
		drawLabel(stage, featured.star.name, featured.position.vector, COL.planet, 10, -10);
	}

	return featured;
}


/* ==========================================================================
   4. MAGNITUDE CHART
   Six classes: a disc for each, and a bar for the light it sends us
   (modern scale: each class is 100^(1/5) = 2.512 times fainter).
   ========================================================================== */

function drawMagnitudeChart() {
	const canvas = byId('cv-mag');
	const ctx = canvas.getContext('2d');
	const left = 70;
	const columnWidth = (canvas.width - left - 20) / 6;
	const barBottom = canvas.height - 40;
	const barTop = 110;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.font = `14px ${CANVAS_FONT}`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	ctx.fillStyle = COL.muted;
	ctx.textAlign = 'left';
	ctx.fillText('as seen', 6, 50);
	ctx.fillText('light', 6, (barTop + barBottom) / 2);
	ctx.textAlign = 'center';

	for (let m = 1; m <= 6; m++) {
		const x = left + columnWidth * (m - 0.5);
		const flux = Math.pow(100, -(m - 1) / 5);
		const height = (barBottom - barTop) * flux;

		drawDisc(ctx, x, 50, starRadius(m), COL.ink);

		ctx.fillStyle = COL.sun;
		ctx.fillRect(x - columnWidth * 0.3, barBottom - height, columnWidth * 0.6, height);

		ctx.fillStyle = COL.ink;
		ctx.fillText(`class ${m}`, x, barBottom + 16);
		ctx.fillStyle = COL.muted;
		ctx.fillText(m === 1 ? '1' : `1/${Math.round(1 / flux)}`, x, barBottom - height - 12);
	}
}


/* ==========================================================================
   5. READ-OUT AND REGISTRATION
   ========================================================================== */

const options = {
	grid: 'equator',
	year: -128
};

function renderReadout(featured, year) {
	if (!featured) {
		return;
	}

	const { star, position } = featured;
	const visible = position.dec > -(90 - RHODES_LATITUDE);

	showLines('o-cat', [
		`\\text{${star.name}, ${formatYear(year)}}`,
		`${texAngle('\\lambda', position.lon)},\\ ${texAngle('\\beta', position.lat)}`,
		`${texAngle('\\alpha', position.ra)}\\ (${hmTex(position.ra / 15)}),\\ ${texAngle('\\delta', position.dec)}`,
		`\\text{magnitude: class }${magnitudeClass(star.v)}\\ \\ (\\text{modern }V=${star.v.toFixed(2)})`,
		visible ? '\\text{rises at Rhodes}' : '\\text{never rises at Rhodes}'
	]);
}

function render() {
	const featuredName = byId('cat-star').value;
	const featured = drawScene(options.year, options.grid, featuredName);

	renderReadout(featured, options.year);
}

/* Fill the featured-star menu. */
function buildStarMenu() {
	const menu = byId('cat-star');

	FEATURED.forEach(name => {
		const option = el('option', '', name);

		option.value = name;
		menu.appendChild(option);
	});

	menu.addEventListener('change', render);
}

function init() {
	buildStarMenu();
	drawMagnitudeChart();

	wireChoices('cat-grid', choice => {
		options.grid = choice;
		render();
	});

	wireChoices('cat-epoch', choice => {
		options.year = Number(choice);
		render();
	});
}

registerTab('catalogue', { init, render });

})();
