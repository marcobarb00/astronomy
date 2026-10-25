// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - MODEL: PRECESSION (models/precession.js)
   The model of page 2.3: the sphere of the stars turns slowly about the
   poles of the ecliptic, or, which is the same relative motion, the pole P
   of the equator turns about the ecliptic pole K and carries the equinox
   westward along a fixed ecliptic. In the ecliptic frame of the epoch
   (x towards the equinox of the epoch, z towards K) a star keeps its
   latitude and its longitude grows uniformly,
	   lambda(t) = lambda0 + p (t - epoch),   beta(t) = beta0,
   the pole of the equator is at longitude 90° - p (t - epoch) and
   latitude 90° - eps, and the equinox, the direction of P x K, at
   longitude -p (t - epoch). The obliquity eps stays fixed.
   Needs common.js. Touches no DOM, so it can be loaded in Node.

   make(parameters, lon0) returns jd => longitude for a star at longitude
   lon0 at the epoch (JD(TT) in, degrees out), as ErrorCurve.addModel
   expects (README.md).

   Later pages reuse it: Ptolemy's stars, and the apogees of his planets,
   which he takes as fixed relative to the stars, move with PTOLEMY.

   TABLE OF CONTENTS
	 1. Parameter sets, and the recorded longitudes of three stars
	 2. The model
	 3. Consequences: declination, period, the two years
	 4. Export
   ========================================================================== */

const Precession = (function () {
	/* ======================================================================
	   1. PARAMETER SETS
	   rate: the precession in longitude (deg a Julian year); epoch: JD(TT)
	   at which the star longitudes are given; obliquity (deg).
	   ====================================================================== */

	const DAYS_PER_YEAR = 365.25;

	/* Fitted to the reference sky (Vondrák, Capitaine & Wallace 2011, in
	   ephemeris.js): the shift of the equinox over the century centred on
	   2026.0, 50.294" a year, and the mean obliquity of 2026.0 (page 1.2)
	   (tools/numbers/2.3-precession.js). */
	const MODERN = {
		rate: 50.294 / 3600,
		epoch: 2461041.5,
		obliquity: 23.43591
	};

	/* Ptolemy: 1° in 100 years (Almagest VII 2), the rule of his catalogue,
	   whose longitudes are for the beginning of the reign of Antoninus, AD
	   137 July 20 (VII 4), with his obliquity 23°51'20" (I 12). He counts
	   Egyptian years of 365 days; the difference from Julian years, 0.07%,
	   is far below his precision. */
	const PTOLEMY = {
		rate: 1 / 100,
		epoch: 1771297.5,
		obliquity: 23 + 51 / 60 + 20 / 3600
	};

	/* The longitudes of Spica, Regulus and beta Scorpii (the northern star
	   in the forehead of Scorpius) recorded from Timocharis to Copernicus:
	   who, star (a name of stars.js), jd (TT, to the day; JD 1614107.3 is
	   294 BC March 9.8), lon (deg, from the spring equinox) and where it
	   comes from. Ptolemy counts eastward from the solstice or
	   equinox that begins the star's quarter of the ecliptic (Almagest
	   VII 4: "82 1/3 from the summer solstice" is 90 + 82 1/3); 'ptolemy' marks
	   the records reduced with his tables (Almagest VII 2-3).
	   Copernicus' al-Battani is "1,202 years after Alexander's death",
	   about AD 880; his own records are at Frombork, in 1515 and 1525. */
	const RECORDS = [
		// Almagest VII 3: Timocharis' occultations, 294, 283 and 295 BC
		{
			who: 'Timocharis',
			star: 'Spica',
			jd: 1614107.3,
			lon: 90 + 82 + 1 / 3,
			ptolemy: true,
			source: 'Almagest VII 3'
		},
		{ who: 'Timocharis', star: 'Spica', jd: 1618369.6, lon: 90 + 82.5, ptolemy: true, source: 'Almagest VII 3' },
		{ who: 'Timocharis', star: 'β Scorpii', jd: 1614028.6, lon: 180 + 32, ptolemy: true, source: 'Almagest VII 3' },
		// Almagest VII 2 (the year -128/7); De Revolutionibus III 2: 29;50 after the solstice, 128 BC
		{
			who: 'Hipparchus',
			star: 'Regulus',
			jd: 1674671.5,
			lon: 90 + 29 + 50 / 60,
			ptolemy: false,
			source: 'De Rev. III 2'
		},
		// Almagest VII 3: Menelaus' occultations, AD 98
		{ who: 'Menelaus', star: 'Spica', jd: 1756862.7, lon: 90 + 86.25, ptolemy: true, source: 'Almagest VII 3' },
		{
			who: 'Menelaus',
			star: 'β Scorpii',
			jd: 1756865.7,
			lon: 180 + 35 + 55 / 60,
			ptolemy: true,
			source: 'Almagest VII 3'
		},
		// Almagest VII 2 (Regulus, AD 139); the catalogue, AD 137 (VIII 1, Spica at Virgo 26 2/3); De Rev. III 2 (beta Sco)
		{ who: 'Ptolemy', star: 'Regulus', jd: 1771881.3, lon: 90 + 32.5, ptolemy: true, source: 'Almagest VII 2' },
		{
			who: 'Ptolemy',
			star: 'Spica',
			jd: 1771297.5,
			lon: 150 + 26 + 2 / 3,
			ptolemy: true,
			source: 'Almagest VIII 1'
		},
		{
			who: 'Ptolemy',
			star: 'β Scorpii',
			jd: 1771881.3,
			lon: 180 + 36 + 1 / 3,
			ptolemy: true,
			source: 'De Rev. III 2'
		},
		// De Revolutionibus III 2: al-Battani, about AD 880
		{
			who: 'al-Battani',
			star: 'Regulus',
			jd: 2042477.5,
			lon: 90 + 44 + 5 / 60,
			ptolemy: false,
			source: 'De Rev. III 2'
		},
		{
			who: 'al-Battani',
			star: 'β Scorpii',
			jd: 2042477.5,
			lon: 180 + 47 + 50 / 60,
			ptolemy: false,
			source: 'De Rev. III 2'
		},
		// De Revolutionibus III 2: Libra 17;14 (1515) and 17;21 (1525)
		{
			who: 'Copernicus',
			star: 'Spica',
			jd: 2274592.5,
			lon: 180 + 17 + 14 / 60,
			ptolemy: false,
			source: 'De Rev. III 2'
		},
		{
			who: 'Copernicus',
			star: 'Spica',
			jd: 2278245.5,
			lon: 180 + 17 + 21 / 60,
			ptolemy: false,
			source: 'De Rev. III 2'
		}
	];

	/* ======================================================================
	   2. THE MODEL
	   ====================================================================== */

	/* The precession since the epoch (deg): how far every longitude has
	   grown, and the equinox has moved west. */
	function shift(parameters, jd) {
		return (parameters.rate * (jd - parameters.epoch)) / DAYS_PER_YEAR;
	}

	/* The longitude of date (deg, [0, 360)) of a star at lon0 at the epoch. */
	function longitude(parameters, lon0, jd) {
		return norm360(lon0 + shift(parameters, jd));
	}

	/* jd (TT) -> the longitude of date of a star at lon0 at the epoch. */
	function make(parameters, lon0) {
		return jd => longitude(parameters, lon0, jd);
	}

	/* The equinox of date, as a longitude in the frame of the epoch (deg). */
	function equinox(parameters, jd) {
		return norm360(-shift(parameters, jd));
	}

	/* The pole P of the equator of date: unit vector in the ecliptic frame
	   of the epoch. */
	function pole(parameters, jd) {
		return fromLonLat(90 - shift(parameters, jd), 90 - parameters.obliquity);
	}

	/* Right ascension and declination of date (deg) of a star at (lon0,
	   lat0) at the epoch: { ra, dec }. */
	function equatorial(parameters, lon0, lat0, jd) {
		const lon = longitude(parameters, lon0, jd);
		const eps = parameters.obliquity;
		const ra = atan2d(sin(lon) * cos(eps) - tan(lat0) * sin(eps), cos(lon));
		const dec = asin(sin(lat0) * cos(eps) + cos(lat0) * sin(eps) * sin(lon));

		return { ra: norm360(ra), dec: dec };
	}

	/* ======================================================================
	   3. CONSEQUENCES
	   ====================================================================== */

	/* The rate of change of the declination (deg a year) of a star at
	   (lon, lat) and declination dec, from sin dec = sin lat cos eps +
	   cos lat sin eps sin lon with d lon / dt = rate:
		   d dec / dt = rate sin eps cos lat cos lon / cos dec. */
	function declinationRate(rate, eps, lon, lat, dec) {
		return (rate * sin(eps) * cos(lat) * cos(lon)) / cos(dec);
	}

	/* The time for one turn of the pole (years). */
	function period(parameters) {
		return 360 / parameters.rate;
	}

	/* The sidereal year (days) from the tropical year Y (days) and the rate
	   (deg a Julian year). In a tropical year the Sun covers 360° less the
	   precession of that year, p Y; in a sidereal year 360°, at the same
	   rate: Y_s = Y / (1 - p Y / 360°). */
	function siderealYear(tropicalYear, rate) {
		const precessionInYear = (rate * tropicalYear) / DAYS_PER_YEAR;

		return tropicalYear / (1 - precessionInYear / 360);
	}

	/* ======================================================================
	   4. EXPORT
	   ====================================================================== */

	return {
		MODERN,
		PTOLEMY,
		RECORDS,
		shift,
		longitude,
		make,
		equinox,
		pole,
		equatorial,
		declinationRate,
		period,
		siderealYear
	};
})();
