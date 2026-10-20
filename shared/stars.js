/* ==========================================================================
   PREDICTING THE SKY - BRIGHT STARS (stars.js)
   A small catalogue of bright stars for the figures and the reference sky,
   and their positions of date. Needs common.js, time.js, ephemeris.js.
   Touches no DOM, so it can be loaded in Node.

   SOURCE
	 SIMBAD (CDS, Strasbourg), table "basic": ICRS right ascension and
	 declination at epoch J2000 (Hipparcos-based) and proper motions,
	 retrieved 2026-10-17 with tools/numbers/data/fetch-stars.sh. Values are
	 copied as returned, in degrees and milliarcseconds per year
	 (pmra = mu_alpha cos delta, as in SIMBAD).
	 V magnitudes from the same query (SIMBAD table "allfluxes", retrieved
	 2026-10-17, tools/numbers/data/stars-2026-10-17.csv). SIMBAD gives no
	 V for Acrux as a whole, only for its two components (alf01 Cru 1.28,
	 alf02 Cru 1.58, table "flux", retrieved 2026-10-19,
	 tools/numbers/data/acrux-components-2026-10-19.csv); their combined
	 light, -2.5 log10(10^(-0.4 * 1.28) + 10^(-0.4 * 1.58)), is 0.67.

   POSITIONS OF DATE
	 Stars.ofDate(star, jdTT) applies the proper motion linearly (as a
	 vector on the sphere, so it also works near the poles), then the
	 long-term precession of ephemeris.js: mean equator and equinox of date.
	 Annual aberration (up to 20") and nutation (up to 17") are left out.

   TABLE OF CONTENTS
	 1. The catalogue
	 2. Positions
	 3. Export
   ========================================================================== */

const Stars = (function () {
	/* ======================================================================
	   1. THE CATALOGUE
	   name, SIMBAD identifier, ra and dec (deg, ICRS J2000),
	   pmra and pmdec (mas / yr), mag (V magnitude, sets the size of the
	   star's mark in the figures, starSize in common.js).
	   ====================================================================== */

	// prettier-ignore
	const LIST = [
		{ name: 'Polaris',    id: 'alf UMi', ra: 37.954560670189856,  dec: 89.26410896994187,   pmra: 44.48,    pmdec: -11.85, mag: 2.02 },
		{ name: 'Kochab',     id: 'bet UMi', ra: 222.67635749796767,  dec: 74.15550393675127,   pmra: -32.61,   pmdec: 11.42, mag: 2.08 },
		{ name: 'Dubhe',      id: 'alf UMa', ra: 165.9319646738126,   dec: 61.751034687818226,  pmra: -134.11,  pmdec: -34.7, mag: 1.79 },
		{ name: 'Capella',    id: 'alf Aur', ra: 79.17232794433404,   dec: 45.99799146983673,   pmra: 75.25,    pmdec: -426.89, mag: 0.08 },
		{ name: 'Deneb',      id: 'alf Cyg', ra: 310.35797975307673,  dec: 45.280338806527574,  pmra: 2.01,     pmdec: 1.85, mag: 1.25 },
		{ name: 'Vega',       id: 'alf Lyr', ra: 279.234734787025,    dec: 38.783688956244,     pmra: 200.94,   pmdec: 286.23, mag: 0.03 },
		{ name: 'Arcturus',   id: 'alf Boo', ra: 213.915300294925,    dec: 19.1824091615312,    pmra: -1093.39, pmdec: -2000.06, mag: -0.05 },
		{ name: 'Aldebaran',  id: 'alf Tau', ra: 68.9801627900154,    dec: 16.5093023507718,    pmra: 63.45,    pmdec: -188.94, mag: 0.86 },
		{ name: 'Altair',     id: 'alf Aql', ra: 297.69582729638694,  dec: 8.868321196436963,   pmra: 536.23,   pmdec: 385.29, mag: 0.76 },
		{ name: 'Betelgeuse', id: 'alf Ori', ra: 88.79293899077537,   dec: 7.407063995272694,   pmra: 27.54,    pmdec: 11.3, mag: 0.42 },
		{ name: 'Mintaka',    id: 'del Ori', ra: 83.00166705557675,   dec: -0.29909510708333326, pmra: 0.64,    pmdec: -0.69, mag: 2.41 },
		{ name: 'Rigel',      id: 'bet Ori', ra: 78.63446706693006,   dec: -8.201638364722209,  pmra: 1.31,     pmdec: 0.5, mag: 0.13 },
		{ name: 'Spica',      id: 'alf Vir', ra: 201.2982473615632,   dec: -11.161319485111932, pmra: -42.35,   pmdec: -30.67, mag: 0.97 },
		{ name: 'Sirius',     id: 'alf CMa', ra: 101.28715533333335,  dec: -16.71611586111111,  pmra: -546.01,  pmdec: -1223.07, mag: -1.46 },
		{ name: 'Antares',    id: 'alf Sco', ra: 247.3519154198264,   dec: -26.432002611950832, pmra: -12.11,   pmdec: -23.3, mag: 0.91 },
		{ name: 'Canopus',    id: 'alf Car', ra: 95.98795782918306,   dec: -52.69566138386201,  pmra: 19.93,    pmdec: 23.24, mag: -0.74 },
		{ name: 'Achernar',   id: 'alf Eri', ra: 24.428522833333336,  dec: -57.236752805555554, pmra: 87.0,     pmdec: -38.24, mag: 0.46 },
		{ name: 'α Centauri', id: 'alf Cen', ra: 219.9020833333333,   dec: -60.83397222222223,  pmra: -3608.0,  pmdec: 686.0, mag: -0.1 },
		{ name: 'Acrux',      id: 'alf Cru', ra: 186.64956340120452,  dec: -63.099092857925115, pmra: -35.83,   pmdec: -14.86, mag: 0.67 },
		{ name: 'σ Octantis', id: 'sig Oct', ra: 317.19526487582993,  dec: -88.95649953627,     pmra: 26.323,   pmdec: 4.721, mag: 5.42 }
	];

	const MAS_TO_DEG = 1 / 3.6e6;
	const DAYS_PER_YEAR = 365.25;

	/* The star with this name (throws on a typo, so a page fails loudly). */
	function find(name) {
		const star = LIST.find(entry => entry.name === name);

		if (!star) {
			throw new Error(`Stars.find: no star named "${name}"`);
		}

		return star;
	}

	/* ======================================================================
	   2. POSITIONS
	   ====================================================================== */

	/* Unit vector (ICRS / J2000 axes) at JD(TT), with the proper motion
	   added along the local east and north directions on the sphere. */
	function vectorJ2000(star, jdTT) {
		const years = (jdTT - Time.J2000) / DAYS_PER_YEAR;
		const east = [-sin(star.ra), cos(star.ra), 0];
		const north = [-sin(star.dec) * cos(star.ra), -sin(star.dec) * sin(star.ra), cos(star.dec)];
		const shiftEast = star.pmra * MAS_TO_DEG * years * D2R;
		const shiftNorth = star.pmdec * MAS_TO_DEG * years * D2R;
		const moved = add3(fromLonLat(star.ra, star.dec), lin2(east, north, shiftEast, shiftNorth));

		return normalize3(moved);
	}

	/* Right ascension and declination (deg) at epoch J2000 with proper
	   motion to JD(TT): { ra, dec }. */
	function atEpoch(star, jdTT) {
		const p = toLonLat(vectorJ2000(star, jdTT));

		return { ra: p.lon, dec: p.lat };
	}

	/* Mean right ascension and declination of date (deg): { ra, dec }. */
	function ofDate(star, jdTT) {
		const p = atEpoch(star, jdTT);

		return Ephem.precessEquatorial(p.ra, p.dec, Time.J2000, jdTT);
	}

	/* ======================================================================
	   3. EXPORT
	   ====================================================================== */

	return {
		LIST,
		find,
		vectorJ2000,
		atEpoch,
		ofDate
	};
})();
