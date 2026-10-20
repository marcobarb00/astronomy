// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - REFERENCE EPHEMERIS (ephemeris.js)
   The "reference sky" every model on the site is compared with.
   Needs common.js and time.js. Touches no DOM, so it can be loaded in Node.

   WHAT IT RETURNS
	 Geocentric ecliptic longitude and latitude, referred to the mean
	 ecliptic and equinox OF DATE (tropical longitudes, the kind the ancient
	 models predict), in degrees. By default the positions are APPARENT
	 (light-time, aberration and nutation included), as an observer would
	 measure them; pass { apparent: false } for geometric mean positions.
	 Input time: Julian Date in Terrestrial Time, JD(TT). Use
	 Time.ttFromUt(jdUT) to convert a clock time.

   SOURCES
	 - Sun, planets: E. M. Standish, "Keplerian Elements for Approximate
	   Positions of the Major Planets" (JPL Solar System Dynamics), Tables 2a
	   and 2b, the fit valid from 3000 BC to 3000 AD. Elements are referred to
	   the J2000 ecliptic and equinox; the Earth is the Earth-Moon barycentre
	   corrected by the Moon's position below.
	 - Moon: J. Meeus, Astronomical Algorithms (2nd ed., 1998), ch. 47, the
	   truncated ELP-2000/82 lunar theory (60 + 60 periodic terms).
	 - Precession: Vondrak, Capitaine & Wallace (2011) long-term expressions,
	   as in SOFA / ERFA (eraLtpecl, eraLtpequ).
	 - Obliquity: Laskar's formula, Meeus 22.3.
	 - Nutation: the short series of Meeus ch. 22 (0.5" in longitude).
	 - Aberration: Meeus 25.10 (Sun) and 23.2 (planets).
	 - Equation of time: Meeus 28.1.
	 - Atmospheric refraction: Meeus 16.3 (Bennett) and 16.4 (Saemundsson).

   VALID RANGE
	 3000 BC to 3000 AD (Ephem.RANGE), the range of Standish's Table 2.
	 Outside it the functions still return numbers, but Ephem.inRange(jd)
	 is false and the error grows without bound.

   ACCURACY (apparent geocentric longitude; measured, not quoted)
	 Largest difference from JPL Horizons (DE441, observer quantity 31,
	 apparent ecliptic longitude of date, TT), sampled every 5 days in
	 1800-2050 and every 73 days over 3000 BC - 3000 AD (retrieved 2026-10-17;
	 Mars, Jupiter, Saturn as system barycentres). RMS in brackets.
	                     1800 - 2050      500 BC - 2500 AD    3000 BC - 3000 AD
	   Sun              0.7'  (0.2')       0.8'  (0.2')        1.1'  (0.3')
	   Moon             0.3'  (0.05')      1.7'  (0.5')        11'   (3.3')
	   Mercury          1.1'  (0.2')       1.1'  (0.2')        1.5'  (0.3')
	   Venus            2.6'  (0.4')       3.7'  (0.4')        3.7'  (0.5')
	   Mars             6.3'  (1.1')       8.8'  (1.1')        9.9'  (1.1')
	   Jupiter          14'   (4.0')       14'   (4.2')        17'   (4.2')
	   Saturn           24'   (9.5')       25'   (9.9')        32'   (10.5')
	 For comparison, JPL's nominal errors of Table 2 in HELIOCENTRIC
	 longitude are 20" (Mercury), 40" (Venus, EM barycentre), 100" (Mars),
	 600" (Jupiter) and 1000" (Saturn).
	 - Planets: the errors do not grow with time, because Standish's Table 2
	   is a fit over the whole range. Its residuals (mostly the mutual
	   perturbations of Jupiter and Saturn) are periodic. Near opposition or
	   inferior conjunction a planet's geocentric error is the heliocentric
	   one magnified by r / Delta, hence Venus and Mars.
	 - Moon: the error grows roughly as T^2 away from 2000 (about 6' of mean
	   offset at 3000 BC). This is the secular acceleration of the truncated
	   ELP-2000/82 series, which differs slightly from DE441's. In antiquity
	   the uncertainty of Delta T (minutes of time, i.e. several arcminutes
	   of the Moon's motion) is larger anyway whenever a model is tied to a
	   clock time in UT.
	 These numbers are well below the errors of the historical models on the
	 site (tens of arcminutes to degrees). They are NOT small enough to judge
	 a Keplerian model at the arcminute level: the planets here are
	 themselves Keplerian (see STRUCTURE.md, page 4.4).

   TABLE OF CONTENTS
	 1. Constants and range
	 2. Standish's Keplerian elements (Tables 2a, 2b)
	 3. Heliocentric positions from the elements (Kepler's equation)
	 4. The Moon (Meeus ch. 47)
	 5. Obliquity, nutation, precession
	 6. Coordinate transformations
	 7. Geocentric positions: Sun, Moon, planets
	 8. Derived quantities: sidereal time, equation of time, refraction
	 9. Export
   ========================================================================== */

const Ephem = (function () {
	/* ======================================================================
	   1. CONSTANTS AND RANGE
	   ====================================================================== */

	const ARCSEC = 1 / 3600; // one arcsecond in degrees
	const AU_KM = 149597870.7; // astronomical unit (km)
	const LIGHT_TIME_PER_AU = 0.0057755183; // days for light to cross 1 AU
	const EARTH_MOON_MASS_RATIO = 81.30056; // M_earth / M_moon
	const ABERRATION_CONSTANT = 20.49552; // kappa (arcsec)

	const RANGE = {
		start: Time.julianDay(-2999, 1, 1), // 3000 BC January 1
		end: Time.julianDay(3000, 12, 31) // 3000 AD December 31
	};

	const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

	function inRange(jd) {
		return jd >= RANGE.start && jd <= RANGE.end;
	}

	/* ======================================================================
	   2. STANDISH'S KEPLERIAN ELEMENTS
	   Table 2a: for each body, the elements at J2000 and their rates per
	   Julian century: a (au), e, I (deg), L mean longitude (deg),
	   varpi longitude of perihelion (deg), Omega longitude of the ascending
	   node (deg).
	   Table 2b: extra terms of the mean anomaly for the outer planets,
	   M = L - varpi + b T^2 + c cos(f T) + s sin(f T).
	   Source: ssd.jpl.nasa.gov/planets/approx_pos.html (Standish & Williams,
	   1992); all 112 numbers were checked against that page, one by one, on
	   2026-10-17.
	   ====================================================================== */

	// prettier-ignore
	const ELEMENTS = {
		mercury: {
			at:   [0.38709843, 0.20563661, 7.00559432, 252.25166724, 77.45771895, 48.33961819],
			rate: [0.00000000, 0.00002123, -0.00590158, 149472.67486623, 0.15940013, -0.12214182]
		},
		venus: {
			at:   [0.72332102, 0.00676399, 3.39777545, 181.97970850, 131.76755713, 76.67261496],
			rate: [-0.00000026, -0.00005107, 0.00043494, 58517.81560260, 0.05679648, -0.27274174]
		},
		emb: {
			at:   [1.00000018, 0.01673163, -0.00054346, 100.46691572, 102.93005885, -5.11260389],
			rate: [-0.00000003, -0.00003661, -0.01337178, 35999.37306329, 0.31795260, -0.24123856]
		},
		mars: {
			at:   [1.52371243, 0.09336511, 1.85181869, -4.56813164, -23.91744784, 49.71320984],
			rate: [0.00000097, 0.00009149, -0.00724757, 19140.29934243, 0.45223625, -0.26852431]
		},
		jupiter: {
			at:   [5.20248019, 0.04853590, 1.29861416, 34.33479152, 14.27495244, 100.29282654],
			rate: [-0.00002864, 0.00018026, -0.00322699, 3034.90371757, 0.18199196, 0.13024619],
			extra: { b: -0.00012452, c: 0.06064060, s: -0.35635438, f: 38.35125000 }
		},
		saturn: {
			at:   [9.54149883, 0.05550825, 2.49424102, 50.07571329, 92.86136063, 113.63998702],
			rate: [-0.00003065, -0.00032044, 0.00451969, 1222.11494724, 0.54179478, -0.25015002],
			extra: { b: 0.00025899, c: -0.13434469, s: 0.87320147, f: 38.35125000 }
		},
		uranus: {
			at:   [19.18797948, 0.04685740, 0.77298127, 314.20276625, 172.43404441, 73.96250215],
			rate: [-0.00020455, -0.00001550, -0.00180155, 428.49512595, 0.09266985, 0.05739699],
			extra: { b: 0.00058331, c: -0.97731848, s: 0.17689245, f: 7.67025000 }
		},
		neptune: {
			at:   [30.06952752, 0.00895439, 1.77005520, 304.22289287, 46.68158724, 131.78635853],
			rate: [0.00006447, 0.00000818, 0.00022400, 218.46515314, 0.01009938, -0.00606302],
			extra: { b: -0.00041348, c: 0.68346318, s: -0.10162547, f: 7.67025000 }
		}
	};

	/* ======================================================================
	   3. HELIOCENTRIC POSITIONS FROM THE ELEMENTS
	   ====================================================================== */

	/* Elements of a body at T Julian centuries from J2000. */
	function elementsAt(body, T) {
		const table = ELEMENTS[body];
		const value = i => table.at[i] + table.rate[i] * T;
		const elements = {
			a: value(0),
			e: value(1),
			incl: value(2),
			L: value(3),
			varpi: value(4),
			node: value(5)
		};
		let M = elements.L - elements.varpi;

		if (table.extra) {
			const { b, c, s, f } = table.extra;

			M += b * T * T + c * cos(f * T) + s * sin(f * T);
		}

		elements.M = norm180(M);

		return elements;
	}

	/* Kepler's equation M = E - e sin E, solved by Newton's iteration.
	   M and the result in degrees. */
	function solveKepler(M, e) {
		const eDeg = e * R2D;
		let E = M + eDeg * sin(M);

		for (let i = 0; i < 30; i++) {
			const dM = M - (E - eDeg * sin(E));
			const dE = dM / (1 - e * cos(E));

			E += dE;

			if (Math.abs(dE) < 1e-10) {
				break;
			}
		}

		return E;
	}

	/* Heliocentric rectangular position (au) in the J2000 ecliptic frame. */
	function heliocentricJ2000(body, jdTT) {
		const T = Time.centuries(jdTT);
		const el = elementsAt(body, T);
		const E = solveKepler(el.M, el.e);

		// position in the orbital plane, x' towards perihelion
		const xp = el.a * (cos(E) - el.e);
		const yp = el.a * Math.sqrt(1 - el.e * el.e) * sin(E);

		// rotate by the argument of perihelion, inclination and node
		const omega = el.varpi - el.node;
		const orbitToEcliptic = matMul(rotZ(el.node), rotX(el.incl), rotZ(omega));

		return matApply(orbitToEcliptic, [xp, yp, 0]);
	}

	/* ======================================================================
	   4. THE MOON (Meeus, Astronomical Algorithms, ch. 47)
	   Each row of MOON_LR: multiples of D, M, M', F, then the coefficients of
	   sin (longitude, 1e-6 deg) and cos (distance, 1e-3 km).
	   Each row of MOON_B: multiples of D, M, M', F, then the coefficient of
	   sin (latitude, 1e-6 deg).
	   Meeus' Tables 47.A and 47.B. The 120 rows were taken from the
	   astronomia package (MIT), not typed by hand, and compared term by term
	   with an independent transcription (PyMeeus 0.5.12): no differences.
	   Example 47.a is reproduced to 1e-6 deg (tests.html).
	   ====================================================================== */

	const MOON_LR = [
		[0, 0, 1, 0, 6288774, -20905355],
		[2, 0, -1, 0, 1274027, -3699111],
		[2, 0, 0, 0, 658314, -2955968],
		[0, 0, 2, 0, 213618, -569925],
		[0, 1, 0, 0, -185116, 48888],
		[0, 0, 0, 2, -114332, -3149],
		[2, 0, -2, 0, 58793, 246158],
		[2, -1, -1, 0, 57066, -152138],
		[2, 0, 1, 0, 53322, -170733],
		[2, -1, 0, 0, 45758, -204586],
		[0, 1, -1, 0, -40923, -129620],
		[1, 0, 0, 0, -34720, 108743],
		[0, 1, 1, 0, -30383, 104755],
		[2, 0, 0, -2, 15327, 10321],
		[0, 0, 1, 2, -12528, 0],
		[0, 0, 1, -2, 10980, 79661],
		[4, 0, -1, 0, 10675, -34782],
		[0, 0, 3, 0, 10034, -23210],
		[4, 0, -2, 0, 8548, -21636],
		[2, 1, -1, 0, -7888, 24208],
		[2, 1, 0, 0, -6766, 30824],
		[1, 0, -1, 0, -5163, -8379],
		[1, 1, 0, 0, 4987, -16675],
		[2, -1, 1, 0, 4036, -12831],
		[2, 0, 2, 0, 3994, -10445],
		[4, 0, 0, 0, 3861, -11650],
		[2, 0, -3, 0, 3665, 14403],
		[0, 1, -2, 0, -2689, -7003],
		[2, 0, -1, 2, -2602, 0],
		[2, -1, -2, 0, 2390, 10056],
		[1, 0, 1, 0, -2348, 6322],
		[2, -2, 0, 0, 2236, -9884],
		[0, 1, 2, 0, -2120, 5751],
		[0, 2, 0, 0, -2069, 0],
		[2, -2, -1, 0, 2048, -4950],
		[2, 0, 1, -2, -1773, 4130],
		[2, 0, 0, 2, -1595, 0],
		[4, -1, -1, 0, 1215, -3958],
		[0, 0, 2, 2, -1110, 0],
		[3, 0, -1, 0, -892, 3258],
		[2, 1, 1, 0, -810, 2616],
		[4, -1, -2, 0, 759, -1897],
		[0, 2, -1, 0, -713, -2117],
		[2, 2, -1, 0, -700, 2354],
		[2, 1, -2, 0, 691, 0],
		[2, -1, 0, -2, 596, 0],
		[4, 0, 1, 0, 549, -1423],
		[0, 0, 4, 0, 537, -1117],
		[4, -1, 0, 0, 520, -1571],
		[1, 0, -2, 0, -487, -1739],
		[2, 1, 0, -2, -399, 0],
		[0, 0, 2, -2, -381, -4421],
		[1, 1, 1, 0, 351, 0],
		[3, 0, -2, 0, -340, 0],
		[4, 0, -3, 0, 330, 0],
		[2, -1, 2, 0, 327, 0],
		[0, 2, 1, 0, -323, 1165],
		[1, 1, -1, 0, 299, 0],
		[2, 0, 3, 0, 294, 0],
		[2, 0, -1, -2, 0, 8752]
	];

	const MOON_B = [
		[0, 0, 0, 1, 5128122],
		[0, 0, 1, 1, 280602],
		[0, 0, 1, -1, 277693],
		[2, 0, 0, -1, 173237],
		[2, 0, -1, 1, 55413],
		[2, 0, -1, -1, 46271],
		[2, 0, 0, 1, 32573],
		[0, 0, 2, 1, 17198],
		[2, 0, 1, -1, 9266],
		[0, 0, 2, -1, 8822],
		[2, -1, 0, -1, 8216],
		[2, 0, -2, -1, 4324],
		[2, 0, 1, 1, 4200],
		[2, 1, 0, -1, -3359],
		[2, -1, -1, 1, 2463],
		[2, -1, 0, 1, 2211],
		[2, -1, -1, -1, 2065],
		[0, 1, -1, -1, -1870],
		[4, 0, -1, -1, 1828],
		[0, 1, 0, 1, -1794],
		[0, 0, 0, 3, -1749],
		[0, 1, -1, 1, -1565],
		[1, 0, 0, 1, -1491],
		[0, 1, 1, 1, -1475],
		[0, 1, 1, -1, -1410],
		[0, 1, 0, -1, -1344],
		[1, 0, 0, -1, -1335],
		[0, 0, 3, 1, 1107],
		[4, 0, 0, -1, 1021],
		[4, 0, -1, 1, 833],
		[0, 0, 1, -3, 777],
		[4, 0, -2, 1, 671],
		[2, 0, 0, -3, 607],
		[2, 0, 2, -1, 596],
		[2, -1, 1, -1, 491],
		[2, 0, -2, 1, -451],
		[0, 0, 3, -1, 439],
		[2, 0, 2, 1, 422],
		[2, 0, -3, -1, 421],
		[2, 1, -1, 1, -366],
		[2, 1, 0, 1, -351],
		[4, 0, 0, 1, 331],
		[2, -1, 1, 1, 315],
		[2, -2, 0, -1, 302],
		[0, 0, 1, 3, -283],
		[2, 1, 1, -1, -229],
		[1, 1, 0, -1, 223],
		[1, 1, 0, 1, 223],
		[0, 1, -2, -1, -220],
		[2, 1, -1, -1, -220],
		[1, 0, 1, 1, -185],
		[2, -1, -2, -1, 181],
		[0, 1, 2, 1, -177],
		[4, 0, -2, -1, 176],
		[4, -1, -1, -1, 166],
		[1, 0, 1, -1, -164],
		[4, 0, 1, -1, 132],
		[1, 0, -1, -1, -119],
		[4, -1, 0, -1, 115],
		[2, -2, 0, 1, 107]
	];

	/* The Moon's fundamental arguments (deg), Meeus 47.1 - 47.6. */
	function moonArguments(T) {
		// prettier-ignore
		return {
			Lp: polynomial(T, [218.3164477, 481267.88123421, -0.0015786, 1 / 538841, -1 / 65194000]),
			D: polynomial(T, [297.8501921, 445267.1114034, -0.0018819, 1 / 545868, -1 / 113065000]),
			M: polynomial(T, [357.5291092, 35999.0502909, -0.0001536, 1 / 24490000]),
			Mp: polynomial(T, [134.9633964, 477198.8675055, 0.0087414, 1 / 69699, -1 / 14712000]),
			F: polynomial(T, [93.2720950, 483202.0175233, -0.0036539, -1 / 3526000, 1 / 863310000]),
			A1: 119.75 + 131.849 * T,
			A2: 53.09 + 479264.290 * T,
			A3: 313.45 + 481266.484 * T,
			E: polynomial(T, [1, -0.002516, -0.0000074])
		};
	}

	/* Factor E^|m| for terms that contain the Sun's anomaly M. */
	function eccentricityFactor(E, m) {
		return Math.pow(E, Math.abs(m));
	}

	/* Geometric geocentric Moon, mean ecliptic and equinox of date:
	   { lon, lat (deg), dist (km) }. */
	function moonGeometric(jdTT) {
		const T = Time.centuries(jdTT);
		const a = moonArguments(T);
		let sumL = 3958 * sin(a.A1) + 1962 * sin(a.Lp - a.F) + 318 * sin(a.A2);
		let sumR = 0;
		let sumB =
			-2235 * sin(a.Lp) +
			382 * sin(a.A3) +
			175 * sin(a.A1 - a.F) +
			175 * sin(a.A1 + a.F) +
			127 * sin(a.Lp - a.Mp) -
			115 * sin(a.Lp + a.Mp);

		MOON_LR.forEach(([d, m, mp, f, cl, cr]) => {
			const argument = d * a.D + m * a.M + mp * a.Mp + f * a.F;
			const factor = eccentricityFactor(a.E, m);

			sumL += cl * factor * sin(argument);
			sumR += cr * factor * cos(argument);
		});

		MOON_B.forEach(([d, m, mp, f, cb]) => {
			const argument = d * a.D + m * a.M + mp * a.Mp + f * a.F;

			sumB += cb * eccentricityFactor(a.E, m) * sin(argument);
		});

		return {
			lon: norm360(a.Lp + sumL / 1e6),
			lat: sumB / 1e6,
			dist: 385000.56 + sumR / 1000
		};
	}

	/* ======================================================================
	   5. OBLIQUITY, NUTATION, PRECESSION
	   ====================================================================== */

	/* Mean obliquity of the ecliptic (deg), Laskar, Meeus 22.3.
	   Valid within 0.01" over 1000 years and a few arcseconds over 10000. */
	function meanObliquity(jdTT) {
		const U = Time.centuries(jdTT) / 100;
		const seconds = polynomial(
			U,
			[21.448, -4680.93, -1.55, 1999.25, -51.38, -249.67, -39.05, 7.12, 27.87, 5.79, 2.45]
		);

		return 23 + 26 / 60 + seconds * ARCSEC;
	}

	/* Nutation in longitude and obliquity (deg), Meeus ch. 22 short series. */
	function nutation(jdTT) {
		const T = Time.centuries(jdTT);
		const node = polynomial(T, [125.04452, -1934.136261, 0.0020708, 1 / 450000]);
		const sunL = 280.4665 + 36000.7698 * T;
		const moonL = 218.3165 + 481267.8813 * T;
		// prettier-ignore
		const dpsi = -17.20 * sin(node) - 1.32 * sin(2 * sunL) -
			0.23 * sin(2 * moonL) + 0.21 * sin(2 * node);
		// prettier-ignore
		const deps = 9.20 * cos(node) + 0.57 * cos(2 * sunL) +
			0.10 * cos(2 * moonL) - 0.09 * cos(2 * node);

		return { dpsi: dpsi * ARCSEC, deps: deps * ARCSEC };
	}

	/* Obliquity (deg): true (with nutation) or mean. */
	function obliquity(jdTT, apparent = true) {
		const mean = meanObliquity(jdTT);

		return apparent ? mean + nutation(jdTT).deps : mean;
	}

	/* ---------- Long-term precession ----------
	   J. Vondrák, N. Capitaine, P. Wallace, "New precession expressions,
	   valid for long time intervals", A&A 534, A22 (2011), as implemented
	   in SOFA / ERFA (eraLtpecl, eraLtpequ). Valid for +-200 000 years.
	   The poles of the ecliptic and of the equator of date are unit vectors
	   in the J2000 mean equatorial frame; the equinox of date is the
	   direction of their cross product. (The shorter Meeus 21.5 polynomials
	   drift by 1' at 2000 BC and 2.5' at 3000 BC.)
	   Rows: period (centuries), then cos and sin coefficients (arcsec). */

	const EPS0_LTP = 84381.406 * ARCSEC; // obliquity at J2000 (deg)

	// prettier-ignore
	const LTP_ECLIPTIC_POLY = [
		[5851.607687, -0.1189000, -0.00028913, 0.000000101],      // P_A
		[-1600.886300, 1.1689818, -0.00000020, -0.000000437]      // Q_A
	];

	// period, cos P_A, cos Q_A, sin P_A, sin Q_A
	// prettier-ignore
	const LTP_ECLIPTIC_PERIODIC = [
		[708.15, -5486.751211, -684.661560, 667.666730, -5523.863691],
		[2309.00, -17.127623, 2446.283880, -2354.886252, -549.747450],
		[1620.00, -617.517403, 399.671049, -428.152441, -310.998056],
		[492.20, 413.442940, -356.652376, 376.202861, 421.535876],
		[1183.00, 78.614193, -186.387003, 184.778874, -36.776172],
		[622.00, -180.732815, -316.800070, 335.321713, -145.278396],
		[882.00, -87.676083, 198.296701, -185.138669, -34.744450],
		[547.00, 46.140315, 101.135679, -120.972830, 22.885731]
	];

	// prettier-ignore
	const LTP_EQUATOR_POLY = [
		[5453.282155, 0.4252841, -0.00037173, -0.000000152],      // X
		[-73750.930350, -0.7675452, -0.00018725, 0.000000231]     // Y
	];

	// period, cos X, cos Y, sin X, sin Y
	// prettier-ignore
	const LTP_EQUATOR_PERIODIC = [
		[256.75, -819.940624, 75004.344875, 81491.287984, 1558.515853],
		[708.15, -8444.676815, 624.033993, 787.163481, 7774.939698],
		[274.20, 2600.009459, 1251.136893, 1251.296102, -2219.534038],
		[241.45, 2755.175630, -1102.212834, -1257.950837, -2523.969396],
		[2309.00, -167.659835, -2660.664980, -2966.799730, 247.850422],
		[492.20, 871.855056, 699.291817, 639.744522, -846.485643],
		[396.10, 44.769698, 153.167220, 131.600209, -1393.124055],
		[288.90, -512.313065, -950.865637, -445.040117, 368.526116],
		[231.10, -819.415595, 499.754645, 584.522874, 749.045012],
		[1610.00, -538.071099, -145.188210, -89.756563, 444.704518],
		[620.00, -189.793622, 558.116553, 524.429630, 235.934465],
		[157.87, -402.922932, -23.923029, -13.549067, 374.049623],
		[220.30, 179.516345, -165.405086, -210.157124, -171.330180],
		[1200.00, -9.814756, 9.344131, -44.919798, -22.899655]
	];

	/* The two angles of a pole series at T centuries, in radians. */
	function poleAngles(T, poly, periodic) {
		let a = polynomial(T, poly[0]);
		let b = polynomial(T, poly[1]);

		periodic.forEach(([period, cosA, cosB, sinA, sinB]) => {
			const angle = (TAU * T) / period;

			a += cosA * Math.cos(angle) + sinA * Math.sin(angle);
			b += cosB * Math.cos(angle) + sinB * Math.sin(angle);
		});

		return [a * ARCSEC * D2R, b * ARCSEC * D2R];
	}

	/* Pole of the ecliptic of date, J2000 mean equatorial frame (eraLtpecl). */
	function eclipticPole(jdTT) {
		const [p, q] = poleAngles(Time.centuries(jdTT), LTP_ECLIPTIC_POLY, LTP_ECLIPTIC_PERIODIC);
		const w = Math.sqrt(Math.max(0, 1 - p * p - q * q));

		return [p, -q * cos(EPS0_LTP) - w * sin(EPS0_LTP), -q * sin(EPS0_LTP) + w * cos(EPS0_LTP)];
	}

	/* Pole of the mean equator of date, J2000 mean equatorial frame (eraLtpequ). */
	function equatorPole(jdTT) {
		const [x, y] = poleAngles(Time.centuries(jdTT), LTP_EQUATOR_POLY, LTP_EQUATOR_PERIODIC);

		return [x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))];
	}

	/* J2000 ecliptic -> J2000 mean equator. */
	const ECLIPTIC_J2000_TO_EQUATOR = rotX(EPS0_LTP);

	/* Matrix taking J2000 ecliptic vectors to the mean ecliptic and equinox
	   of date: its rows are the equinox, the 90° point and the pole of the
	   ecliptic of date. */
	function buildEclipticMatrix(jdTT) {
		const pole = eclipticPole(jdTT);
		const equinox = normalize3(cross3(equatorPole(jdTT), pole));
		const rows = [equinox, cross3(pole, equinox), pole];

		return matMul(rows, ECLIPTIC_J2000_TO_EQUATOR);
	}

	/* Cached: the J2000 matrix once, and the last other date (one position
	   asks for the same date several times). */
	const eclipticCache = { j2000: null, jd: null, matrix: null };

	function eclipticOfDateMatrix(jdTT) {
		if (jdTT === Time.J2000) {
			eclipticCache.j2000 = eclipticCache.j2000 ?? buildEclipticMatrix(jdTT);

			return eclipticCache.j2000;
		}

		if (eclipticCache.jd !== jdTT) {
			eclipticCache.jd = jdTT;
			eclipticCache.matrix = buildEclipticMatrix(jdTT);
		}

		return eclipticCache.matrix;
	}

	/* Precess a rectangular ecliptic vector from the ecliptic and equinox
	   of jdFrom to those of jdTo (keeps its length). */
	function precessVector(v, jdFrom, jdTo) {
		const toJ2000 = transpose(eclipticOfDateMatrix(jdFrom));
		const j2000 = matApply(toJ2000, v);

		return matApply(eclipticOfDateMatrix(jdTo), j2000);
	}

	/* The same for ecliptic coordinates (deg). */
	function precessEcliptic(lon, lat, jdFrom, jdTo) {
		const p = toLonLat(precessVector(fromLonLat(lon, lat), jdFrom, jdTo));

		return { lon: p.lon, lat: p.lat };
	}

	/* Matrix taking J2000 mean equatorial vectors to the mean equator and
	   equinox of date: its rows are the equinox, the 90° point and the
	   pole of the equator of date (frame bias neglected, < 0.03"). */
	function equatorOfDateMatrix(jdTT) {
		const pole = equatorPole(jdTT);
		const equinox = normalize3(cross3(pole, eclipticPole(jdTT)));

		return [equinox, cross3(pole, equinox), pole];
	}

	/* Precess equatorial coordinates (deg) from the mean equator and
	   equinox of jdFrom to those of jdTo: { ra, dec }. */
	function precessEquatorial(ra, dec, jdFrom, jdTo) {
		const j2000 = matApply(transpose(equatorOfDateMatrix(jdFrom)), fromLonLat(ra, dec));
		const p = toLonLat(matApply(equatorOfDateMatrix(jdTo), j2000));

		return { ra: p.lon, dec: p.lat };
	}

	/* ======================================================================
	   6. COORDINATE TRANSFORMATIONS
	   ====================================================================== */

	/* Ecliptic (lon, lat) -> equatorial { ra, dec } for obliquity eps (deg). */
	function eclipticToEquatorial(lon, lat, eps) {
		const ra = atan2d(sin(lon) * cos(eps) - tan(lat) * sin(eps), cos(lon));
		const dec = asin(sin(lat) * cos(eps) + cos(lat) * sin(eps) * sin(lon));

		return { ra: norm360(ra), dec: dec };
	}

	/* Equatorial (ra, dec) -> ecliptic { lon, lat } for obliquity eps (deg). */
	function equatorialToEcliptic(ra, dec, eps) {
		const lon = atan2d(sin(ra) * cos(eps) + tan(dec) * sin(eps), cos(ra));
		const lat = asin(sin(dec) * cos(eps) - cos(dec) * sin(eps) * sin(ra));

		return { lon: norm360(lon), lat: lat };
	}

	/* Equatorial coordinates of an ecliptic position of date. Apparent
	   positions use the true obliquity, geometric ones the mean obliquity. */
	function equatorial(ecliptic, jdTT, apparent = true) {
		return eclipticToEquatorial(ecliptic.lon, ecliptic.lat, obliquity(jdTT, apparent));
	}

	/* ======================================================================
	   7. GEOCENTRIC POSITIONS
	   ====================================================================== */

	/* Heliocentric position of the Earth (au, J2000 ecliptic): the
	   Earth-Moon barycentre minus the Moon's share of the Earth-Moon vector. */
	function earthJ2000(jdTT) {
		const emb = heliocentricJ2000('emb', jdTT);
		const moonNow = moonGeometric(jdTT);
		const moonOfDate = fromLonLat(moonNow.lon, moonNow.lat, moonNow.dist / AU_KM);
		const moonJ2000 = precessVector(moonOfDate, jdTT, Time.J2000);

		return sub3(emb, scale(moonJ2000, 1 / (1 + EARTH_MOON_MASS_RATIO)));
	}

	/* Turn a geocentric J2000 vector into { lon, lat, dist } of date. */
	function ofDate(vectorJ2000, jdTT) {
		const s = toLonLat(vectorJ2000);
		const p = precessEcliptic(s.lon, s.lat, Time.J2000, jdTT);

		return { lon: p.lon, lat: p.lat, dist: s.r };
	}

	/* The Sun: { lon, lat (deg), dist (au) }. */
	function sun(jdTT, options = {}) {
		const { apparent = true } = options;
		const result = ofDate(negate(earthJ2000(jdTT)), jdTT);

		if (apparent) {
			result.lon = norm360(result.lon + nutation(jdTT).dpsi - (20.4898 * ARCSEC) / result.dist);
		}

		return result;
	}

	/* The Moon: { lon, lat (deg), dist (km) }. Apparent = with nutation
	   (the Moon's aberration, 0.7", is neglected as in Meeus). */
	function moon(jdTT, options = {}) {
		const { apparent = true } = options;
		const result = moonGeometric(jdTT);

		if (apparent) {
			result.lon = norm360(result.lon + nutation(jdTT).dpsi);
		}

		return result;
	}

	/* Annual aberration of a body at (lon, lat) of date, Meeus 23.2.
	   Returns { dlon, dlat } in degrees. */
	function aberration(lon, lat, jdTT) {
		const T = Time.centuries(jdTT);
		const kappa = ABERRATION_CONSTANT * ARCSEC;
		const e = 0.016708634 - 0.000042037 * T;
		const perihelion = 102.93735 + 1.71946 * T + 0.00046 * T * T;
		const sunLon = sun(jdTT, { apparent: false }).lon;

		return {
			dlon: (-kappa * cos(sunLon - lon) + e * kappa * cos(perihelion - lon)) / cos(lat),
			dlat: -kappa * sin(lat) * (sin(sunLon - lon) - e * sin(perihelion - lon))
		};
	}

	/* Heliocentric planet { lon, lat (deg), r (au) }, frame 'date' (mean
	   ecliptic and equinox of date, default) or 'J2000'. */
	function heliocentric(body, jdTT, options = {}) {
		const { frame = 'date' } = options;
		const v = heliocentricJ2000(body, jdTT);
		const s = toLonLat(v);

		if (frame === 'J2000') {
			return { lon: s.lon, lat: s.lat, r: s.r };
		}

		const p = precessEcliptic(s.lon, s.lat, Time.J2000, jdTT);

		return { lon: p.lon, lat: p.lat, r: s.r };
	}

	/* A planet seen from the Earth: { lon, lat (deg), dist (au) }.
	   Apparent positions include light-time (the planet is taken where it
	   was when the light left it), annual aberration and nutation. */
	function planet(body, jdTT, options = {}) {
		const { apparent = true } = options;
		const earth = earthJ2000(jdTT);
		let geocentric = sub3(heliocentricJ2000(body, jdTT), earth);

		if (apparent) {
			for (let i = 0; i < 3; i++) {
				const tau = LIGHT_TIME_PER_AU * length3(geocentric);

				geocentric = sub3(heliocentricJ2000(body, jdTT - tau), earth);
			}
		}

		const result = ofDate(geocentric, jdTT);

		if (apparent) {
			const ab = aberration(result.lon, result.lat, jdTT);

			result.lon = norm360(result.lon + ab.dlon + nutation(jdTT).dpsi);
			result.lat += ab.dlat;
		}

		return result;
	}

	/* Any body by name: 'sun', 'moon' or a planet. */
	function position(body, jdTT, options = {}) {
		if (body === 'sun') {
			return sun(jdTT, options);
		}

		if (body === 'moon') {
			return moon(jdTT, options);
		}

		if (!ELEMENTS[body] || body === 'emb') {
			throw new Error(`Ephem: unknown body "${body}"`);
		}

		return planet(body, jdTT, options);
	}

	/* Geocentric ecliptic longitude only: what the error curves compare. */
	function longitude(body, jdTT, options = {}) {
		return position(body, jdTT, options).lon;
	}

	/* ======================================================================
	   8. DERIVED QUANTITIES
	   ====================================================================== */

	/* Greenwich apparent sidereal time (deg) = GMST + nutation in RA (the
	   equation of the equinoxes). GMST takes the clock time, JD(UT); the
	   nutation and the obliquity take Terrestrial Time, JD(TT). */
	function apparentSiderealTime(jdUT) {
		const jdTT = Time.ttFromUt(jdUT);
		const n = nutation(jdTT);
		const trueObliquity = meanObliquity(jdTT) + n.deps;

		return norm360(Time.gmst(jdUT) + n.dpsi * cos(trueObliquity));
	}

	/* The Sun's mean longitude (deg), Meeus 28.2 (tau in Julian millennia). */
	function sunMeanLongitude(jdTT) {
		const tau = Time.centuries(jdTT) / 10;

		return norm360(polynomial(tau, [280.4664567, 360007.6982779, 0.03032028, 1 / 49931, -1 / 15300, -1 / 2000000]));
	}

	/* Equation of time in minutes of time, apparent minus mean solar time
	   (positive when the sundial is ahead of the clock), Meeus 28.1. */
	function equationOfTime(jdTT) {
		const sunPosition = sun(jdTT);
		const eq = equatorial(sunPosition, jdTT);
		const n = nutation(jdTT);
		const eps = obliquity(jdTT);
		const E = sunMeanLongitude(jdTT) - 0.0057183 - eq.ra + n.dpsi * cos(eps);

		return norm180(E) * 4;
	}

	/* ---------- Atmospheric refraction ----------
	   Standard air (1010 mbar, 10 °C), J. Meeus, Astronomical Algorithms,
	   ch. 16. The two formulas agree within 4" (checked in tests.html).
	   Near the horizon the real refraction changes with the weather by
	   several arcminutes. */

	/* Refraction R (deg) of a star at TRUE (airless) altitude h (deg),
	   Saemundsson, Meeus 16.4: apparent altitude = h + R. Below the
	   apparent horizon (h < -0.6°) a star is not seen: returns 0 under
	   h = -1°, where the formula stops being meaningful. */
	function refraction(trueAltitude) {
		if (trueAltitude < -1) {
			return 0;
		}

		const R = 1.02 / tan(trueAltitude + 10.3 / (trueAltitude + 5.11));

		return Math.max(0, R) / 60;
	}

	/* Refraction R (deg) of a star seen at APPARENT altitude h0 (deg),
	   Bennett, Meeus 16.3: true altitude = h0 - R. */
	function refractionOfApparent(apparentAltitude) {
		if (apparentAltitude < -1) {
			return 0;
		}

		const R = 1 / tan(apparentAltitude + 7.31 / (apparentAltitude + 4.4));

		return Math.max(0, R) / 60;
	}

	/* ======================================================================
	   9. EXPORT
	   ====================================================================== */

	return {
		RANGE,
		PLANETS,
		AU_KM,
		inRange,
		sun,
		moon,
		planet,
		position,
		longitude,
		heliocentric,
		heliocentricJ2000,
		solveKepler,
		meanObliquity,
		obliquity,
		nutation,
		precessEcliptic,
		precessEquatorial,
		eclipticPole,
		equatorPole,
		eclipticToEquatorial,
		equatorialToEcliptic,
		equatorial,
		apparentSiderealTime,
		sunMeanLongitude,
		equationOfTime,
		refraction,
		refractionOfApparent
	};
})();
