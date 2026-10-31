// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: ECLIPSES (models/eclipses.js)
   The eclipse model of page 3.3, built from the models of the earlier
   pages: a Sun (models/solar-eccentric.js) and a Moon in longitude
   (models/lunar-epicycle.js) and in latitude (models/lunar-latitude.js).
   At page 3.3's new and full Moons the crank of page 3.2 changes nothing,
   so the Moon is page 3.1's epicycle.

   At a syzygy (new or full Moon) the Moon passes the Sun, or the centre
   of the Earth's shadow, at the distance |beta|, its latitude. With the
   apparent radii s and the horizontal parallaxes p of the Moon (sM, pM)
   and of the Sun (sS, pS), all seen from the Earth's centre (page 3.3
   writes s, pi, s_sun, pi_sun):
	   umbra:   u = 1.01 pM + pS - sS   the shadow's radius at the Moon;
	   lunar eclipse (umbral) when |beta| < u + sM, total when < u - sM;
	   solar eclipse seen somewhere on the Earth when
				|beta| < pM - pS + sS + sM;
	   central (the shadow's axis meets the Earth) when |beta| < pM - pS;
	   total if the Moon, seen from where the axis meets the Earth (or the
	   point of the Earth nearest the axis), is larger than the Sun, else
	   annular; a non-central eclipse is still total or annular when the
	   shadow's cone touches the Earth, |beta| < pM - pS + |s' - sS|, with
	   s' that apparent radius of the Moon. The angles are small, so the
	   distance of the axis from the Earth's centre is gamma = |beta| /
	   (pM - pS) Earth radii, to first order.
   The 1.01 is Danjon's enlargement of the shadow by the Earth's
   atmosphere, as in NASA's Five Millennium Canon of Lunar Eclipses
   (F. Espenak and J. Meeus, 2009). Penumbral eclipses, in which the Moon
   enters only the half-shadow, are not counted.

   The model's syzygies are its own: the moments when its Moon's
   longitude minus its Sun's is 0° or 180°. Its distances are its own
   too: the epicycle's (page 3.1) scaled so that the deferent is the
   reference Moon's mean distance, and the eccentric's (page 2.1) in au.

   Ptolemy's limits (Almagest VI 5): the mean Moon's distance from a node
   along its circle, at mean syzygy, within which an eclipse is possible.

   The reference sky's eclipses (reference): at each of its new and full
   Moons, the least distance of the Moon from the Sun or from the shadow's
   centre, with the same criteria and the reference distances. They agree
   with NASA's list of 2021 - 2030 (tools/numbers/3.3-eclipses.js).

   Needs common.js, time.js, ephemeris.js, models/mean-sun.js,
   models/solar-eccentric.js, models/lunar-epicycle.js and
   models/lunar-latitude.js. Touches no DOM, so it can be loaded in Node.

   TABLE OF CONTENTS
	 1. Constants and model sets
	 2. Apparent sizes and limits
	 3. Syzygies
	 4. The criteria
	 5. Predictions
	 6. The reference sky's eclipses
	 7. Periods
	 8. Export
   ========================================================================== */

const Eclipses = (function () {
	/* ======================================================================
	   1. CONSTANTS AND MODEL SETS
	   ====================================================================== */

	const EARTH_RADIUS = 6378.14; // equatorial radius (km)
	const MOON_RADIUS = 1737.4; // km
	const MOON_MEAN_DISTANCE = 385000.56; // km, the constant term of Meeus 47
	const SUN_RADIUS_AT_AU = 959.63 / 3600; // the Sun's apparent radius at 1 au (deg)
	const SUN_PARALLAX_AT_AU = 8.794 / 3600; // the Sun's horizontal parallax at 1 au (deg)
	const SHADOW_ENLARGEMENT = 1.01; // Danjon: 1 % of the Moon's parallax

	/* The mean synodic month of Meeus 49.1 (days), the mean motion of the
	   elongation (deg a day), and the mean new Moon k = 0 (6 January 2000,
	   JD(TT)). */
	const SYNODIC_MONTH = 29.530588861;
	const SYNODIC_RATE = 360 / SYNODIC_MONTH;
	const NEW_MOON_0 = 2451550.09766;

	/* Ptolemy's limits of the mean Moon from a node at mean syzygy, along
	   its circle (deg), for his part of the inhabited world (VI 5): the
	   lunar limit on either side, and the solar limits with the Moon north
	   and south of the ecliptic. */
	const PTOLEMY_LIMITS = {
		lunar: 15 + 12 / 60,
		solarNorth: 20 + 41 / 60,
		solarSouth: 11 + 22 / 60
	};

	/* The eclipse models: a Sun and a Moon (longitude and latitude). The
	   model of page 3.3, from pages 2.3 (the Sun with its moving apogee),
	   3.1 and 3.3; and Ptolemy's (Almagest III, IV, V 12). */
	const FIT_2026 = { sun: SolarEccentric.MOVING_2026, moon: LunarLatitude.FIT_2026 };
	const PTOLEMY = { sun: SolarEccentric.PTOLEMY, moon: LunarLatitude.PTOLEMY };

	/* ======================================================================
	   2. APPARENT SIZES AND LIMITS
	   ====================================================================== */

	/* The apparent radii and parallaxes (deg) for the Moon's distance
	   (km) and the Sun's (au): { sM, pM, sS, pS }. */
	function sizes(moonKm, sunAu) {
		return {
			sM: asin(MOON_RADIUS / moonKm),
			pM: asin(EARTH_RADIUS / moonKm),
			sS: SUN_RADIUS_AT_AU / sunAu,
			pS: SUN_PARALLAX_AT_AU / sunAu
		};
	}

	/* The limits on |beta| (deg) for the sizes z: umbra (the shadow's
	   radius), lunar (an umbral eclipse), lunarTotal, solar (seen
	   somewhere on the Earth), central. */
	function limits(z) {
		const umbra = SHADOW_ENLARGEMENT * z.pM + z.pS - z.sS;

		return {
			umbra,
			lunar: umbra + z.sM,
			lunarTotal: umbra - z.sM,
			solar: z.pM - z.pS + z.sS + z.sM,
			central: z.pM - z.pS
		};
	}

	/* The Moon's apparent radius (deg) seen from the point of the Earth
	   where the shadow's axis meets it, or, when the axis misses the
	   Earth, from the point nearest the axis: gamma (Earth radii) is the
	   axis' distance from the Earth's centre, moonKm the Moon's. */
	function axisRadius(moonKm, gamma) {
		const g = Math.min(1, gamma);

		return asin(MOON_RADIUS / (moonKm - EARTH_RADIUS * Math.sqrt(1 - g * g)));
	}

	/* ======================================================================
	   3. SYZYGIES
	   ====================================================================== */

	/* The mean syzygy of index k (JD(TT), Meeus 49.1): a new Moon for an
	   integer k, a full Moon for k + 0.5. */
	function meanSyzygy(k) {
		return NEW_MOON_0 + SYNODIC_MONTH * k;
	}

	/* The index of the mean syzygy nearest a moment (JD), new (solar) or
	   full. */
	function indexNear(jd, solar) {
		const k = (jd - NEW_MOON_0) / SYNODIC_MONTH;

		return solar ? Math.round(k) : Math.round(k - 0.5) + 0.5;
	}

	/* The moment (JD(TT)) near 'guess' when the elongation moonLon(jd) -
	   sunLon(jd) is 'target' (0 new Moon, 180 full Moon): Newton's method
	   with the mean rate of the elongation. */
	function syzygy(sunLon, moonLon, guess, target) {
		let jd = guess;

		for (let i = 0; i < 10; i++) {
			const off = norm180(moonLon(jd) - sunLon(jd) - target);

			jd -= off / SYNODIC_RATE;

			if (Math.abs(off) < 1e-7) {
				break;
			}
		}

		return jd;
	}

	/* ======================================================================
	   4. THE CRITERIA
	   ====================================================================== */

	/* A lunar eclipse at the distance 'distance' (deg) of the Moon's centre
	   from the shadow's, with the sizes z: { kind: 'total', 'partial' or
	   null, magnitude (the fraction of the Moon's diameter in the umbra) }. */
	function lunarEclipse(distance, z) {
		const l = limits(z);
		const b = Math.abs(distance);
		const kind = b < l.lunarTotal ? 'total' : b < l.lunar ? 'partial' : null;

		return { kind, magnitude: (l.lunar - b) / (2 * z.sM) };
	}

	/* A solar eclipse at the distance 'distance' (deg) of the Moon's centre
	   from the Sun's, with the sizes z and the Moon's distance (km):
	   { kind: 'total', 'annular', 'partial' or null, central }. */
	function solarEclipse(distance, z, moonKm) {
		const l = limits(z);
		const b = Math.abs(distance);

		if (b >= l.solar) {
			return { kind: null, central: false };
		}

		const radius = axisRadius(moonKm, b / l.central);
		const umbral = radius > z.sS ? 'total' : 'annular';

		if (b < l.central) {
			return { kind: umbral, central: true };
		}

		return { kind: b < l.central + Math.abs(radius - z.sS) ? umbral : 'partial', central: false };
	}

	/* Ptolemy's test (VI 5): can the syzygy be an eclipse, from the mean
	   argument of latitude F (deg, from the ascending node) at mean
	   syzygy? For a solar eclipse the Moon is north of the ecliptic when
	   sin F > 0. */
	function ptolemyPossible(F, solar) {
		const fromNode = Math.abs(nodeAngle(F));

		if (!solar) {
			return fromNode < PTOLEMY_LIMITS.lunar;
		}

		return fromNode < (sin(F) > 0 ? PTOLEMY_LIMITS.solarNorth : PTOLEMY_LIMITS.solarSouth);
	}

	/* An angle from the ascending node (deg) folded onto the nearer node:
	   in [-90, 90), negative before that node. */
	function nodeAngle(angle) {
		const a = norm180(angle);

		if (a >= 90) {
			return a - 180;
		}
		if (a < -90) {
			return a + 180;
		}

		return a;
	}

	/* ======================================================================
	   5. PREDICTIONS
	   ====================================================================== */

	/* The model's syzygy of index k and its eclipse: { k, solar, jd (TT),
	   beta, F (the true argument of latitude), meanArgument (Fbar), node,
	   moonKm, sunAu, sunLongitude, z (the sizes), kind, magnitude }. */
	function predict(model, k) {
		const solar = Number.isInteger(k);
		const sunLon = SolarEccentric.make(model.sun);
		const moonLon = LunarEpicycle.make(model.moon);
		const jd = syzygy(sunLon, moonLon, meanSyzygy(k), solar ? 0 : 180);
		const moon = LunarLatitude.state(model.moon, jd);
		const sun = SolarEccentric.state(model.sun, jd);
		const e = model.moon.e;
		const moonKm = MOON_MEAN_DISTANCE * Math.sqrt(1 + 2 * e * cos(moon.M) + e * e);
		const sunAu = SolarEccentric.distance(sun.M, model.sun.e);
		const z = sizes(moonKm, sunAu);
		const eclipse = solar ? solarEclipse(moon.beta, z, moonKm) : lunarEclipse(moon.beta, z);

		return {
			k,
			solar,
			jd,
			beta: moon.beta,
			F: moon.F,
			meanArgument: moon.meanArgument,
			node: moon.node,
			moonKm,
			sunAu,
			sunLongitude: sun.lambda,
			z,
			kind: eclipse.kind,
			magnitude: solar ? null : eclipse.magnitude
		};
	}

	/* ======================================================================
	   6. THE REFERENCE SKY'S ECLIPSES
	   ====================================================================== */

	/* Beyond this latitude at a syzygy (deg) no eclipse is possible: the
	   least distance is searched only nearer the ecliptic. */
	const REFERENCE_SEARCH_LATITUDE = 1.8;

	/* Angular distance (deg) between two points of the ecliptic sphere. */
	function separation(lon1, lat1, lon2, lat2) {
		return acos(sin(lat1) * sin(lat2) + cos(lat1) * cos(lat2) * cos(lon1 - lon2));
	}

	/* The minimum of fn on [a, b] by golden-section search: [x, fn(x)]. */
	function minimise(fn, a, b, steps = 36) {
		const g = (Math.sqrt(5) - 1) / 2;
		let c = b - g * (b - a);
		let d = a + g * (b - a);
		let fc = fn(c);
		let fd = fn(d);

		for (let i = 0; i < steps; i++) {
			if (fc < fd) {
				b = d;
				d = c;
				fd = fc;
				c = b - g * (b - a);
				fc = fn(c);
			} else {
				a = c;
				c = d;
				fc = fd;
				d = a + g * (b - a);
				fd = fn(d);
			}
		}

		const x = (a + b) / 2;

		return [x, fn(x)];
	}

	/* The reference sky's syzygy of index k (apparent positions of date):
	   { k, solar, syzygy (JD(TT) of the new or full Moon), betaSyzygy (the
	   latitude there), jd (greatest eclipse: the least distance), least
	   (deg), kind, magnitude, moonKm, sunAu }. Far from a node only the
	   syzygy is computed, and least is |betaSyzygy|. */
	function reference(k) {
		const solar = Number.isInteger(k);
		const sunLon = jd => Ephem.longitude('sun', jd);
		const moonLon = jd => Ephem.longitude('moon', jd);
		const at = syzygy(sunLon, moonLon, meanSyzygy(k), solar ? 0 : 180);
		const betaSyzygy = Ephem.moon(at).lat;
		const result = {
			k,
			solar,
			syzygy: at,
			betaSyzygy,
			jd: at,
			least: Math.abs(betaSyzygy),
			kind: null,
			magnitude: null,
			moonKm: null,
			sunAu: null
		};

		if (Math.abs(betaSyzygy) > REFERENCE_SEARCH_LATITUDE) {
			return result;
		}

		const gap = jd => {
			const m = Ephem.moon(jd);
			const s = Ephem.sun(jd);

			return solar ? separation(m.lon, m.lat, s.lon, s.lat) : separation(m.lon, m.lat, s.lon + 180, -s.lat);
		};
		const [jd, least] = minimise(gap, at - 0.3, at + 0.3);
		const moon = Ephem.moon(jd);
		const sun = Ephem.sun(jd);
		const z = sizes(moon.dist, sun.dist);
		const eclipse = solar ? solarEclipse(least, z, moon.dist) : lunarEclipse(least, z);

		return Object.assign(result, {
			jd,
			least,
			kind: eclipse.kind,
			magnitude: solar ? null : eclipse.magnitude,
			moonKm: moon.dist,
			sunAu: sun.dist
		});
	}

	/* ======================================================================
	   7. PERIODS
	   ====================================================================== */

	/* The convergents p / q of the continued fraction of x: [p, q, a],
	   with a the partial quotient. */
	function convergents(x, count) {
		const result = [];
		let [p0, q0, p1, q1] = [0, 1, 1, 0];
		let y = x;

		for (let i = 0; i < count; i++) {
			const a = Math.floor(y);
			const p = a * p1 + p0;
			const q = a * q1 + q0;

			result.push([p, q, a]);
			[p0, q0, p1, q1] = [p1, q1, p, q];
			y = 1 / (y - a);
		}

		return result;
	}

	/* ======================================================================
	   8. EXPORT
	   ====================================================================== */

	return {
		EARTH_RADIUS,
		MOON_RADIUS,
		MOON_MEAN_DISTANCE,
		SHADOW_ENLARGEMENT,
		SYNODIC_MONTH,
		PTOLEMY_LIMITS,
		FIT_2026,
		PTOLEMY,
		sizes,
		limits,
		axisRadius,
		meanSyzygy,
		indexNear,
		syzygy,
		lunarEclipse,
		solarEclipse,
		ptolemyPossible,
		nodeAngle,
		predict,
		reference,
		minimise,
		convergents
	};
})();
