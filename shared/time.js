// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - TIME (time.js)
   Julian Date, calendar conversions, Delta T and sidereal time.
   Needs common.js. Touches no DOM, so it can be loaded in Node.

   Conventions
	 - Years use astronomical numbering: year 0 = 1 BC, year -584 = 585 BC.
	 - Dates before 1582 October 15 are in the Julian calendar, later ones in
	   the Gregorian calendar (Meeus, Astronomical Algorithms, ch. 7), unless a
	   calendar is forced.
	 - JD(UT) is used for clock time and sidereal time; JD(TT) (Terrestrial
	   Time, Meeus' "TD") is used by the ephemeris. JD(TT) = JD(UT) + Delta T.

   TABLE OF CONTENTS
	 1. Constants
	 2. Calendar date <-> Julian Date   (Meeus 7.1 and the inverse algorithm)
	 3. Calendar helpers                (day of week, day of year, JS Date)
	 4. Delta T and time scales         (Espenak & Meeus polynomials)
	 5. Sidereal time and hour angle    (Meeus 12.4)
	 6. Formatting
	 7. Export
   ========================================================================== */

const Time = (function () {
	/* ======================================================================
	   1. CONSTANTS
	   ====================================================================== */

	const J2000 = 2451545.0; // 2000 January 1.5 TT
	const DAYS_PER_CENTURY = 36525;
	const MJD_OFFSET = 2400000.5; // MJD = JD - 2400000.5
	const UNIX_EPOCH_JD = 2440587.5; // 1970 January 1.0 UT
	const GREGORIAN_START_JD = 2299160.5; // 1582 October 15.0
	const MS_PER_DAY = 86400000;

	const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	/* ======================================================================
	   2. CALENDAR DATE <-> JULIAN DATE
	   ====================================================================== */

	/* Is (year, month, day) on or after 1582 October 15? */
	function isGregorianDate(year, month, day) {
		if (year !== 1582) {
			return year > 1582;
		}

		if (month !== 10) {
			return month > 10;
		}

		return day >= 15;
	}

	/* Julian Date of a calendar date; 'day' may carry a fraction
	   (1957 Oct 4.81). calendar: 'auto' | 'gregorian' | 'julian'. */
	function julianDay(year, month, day, calendar = 'auto') {
		let y = year;
		let m = month;

		if (m <= 2) {
			y -= 1;
			m += 12;
		}

		const gregorian = calendar === 'gregorian' || (calendar === 'auto' && isGregorianDate(year, month, day));
		let b = 0;

		if (gregorian) {
			const a = Math.floor(y / 100);

			b = 2 - a + Math.floor(a / 4);
		}

		return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
	}

	/* Calendar date of a Julian Date (Meeus ch. 7). Returns
	   { year, month, day } where day carries the fraction of the day.
	   calendar: 'auto' (Julian before 1582 Oct 15) | 'gregorian' | 'julian'. */
	function calendarDate(jd, calendar = 'auto') {
		const z = Math.floor(jd + 0.5);
		const f = jd + 0.5 - z;
		const gregorian = calendar === 'gregorian' || (calendar === 'auto' && z >= GREGORIAN_START_JD + 0.5);
		let a = z;

		if (gregorian) {
			const alpha = Math.floor((z - 1867216.25) / 36524.25);

			a = z + 1 + alpha - Math.floor(alpha / 4);
		}

		const b = a + 1524;
		const c = Math.floor((b - 122.1) / 365.25);
		const d = Math.floor(365.25 * c);
		const e = Math.floor((b - d) / 30.6001);
		const day = b - d - Math.floor(30.6001 * e) + f;
		const month = e < 14 ? e - 1 : e - 13;
		const year = month > 2 ? c - 4716 : c - 4715;

		return { year, month, day };
	}

	/* Julian Date from calendar date and clock time (hours, minutes, seconds). */
	function julianDayTime(year, month, day, h = 0, min = 0, s = 0, calendar = 'auto') {
		return julianDay(year, month, day + (h + min / 60 + s / 3600) / 24, calendar);
	}

	/* Julian centuries since J2000.0. */
	function centuries(jd) {
		return (jd - J2000) / DAYS_PER_CENTURY;
	}

	/* Modified Julian Date. */
	function mjd(jd) {
		return jd - MJD_OFFSET;
	}

	/* ======================================================================
	   3. CALENDAR HELPERS
	   ====================================================================== */

	/* Leap year in the calendar in force for that year. */
	function isLeapYear(year) {
		if (year < 1583) {
			return ((year % 4) + 4) % 4 === 0;
		}

		return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	}

	/* Day of the week: 0 = Sunday ... 6 = Saturday (Meeus ch. 7). */
	function dayOfWeek(jd) {
		return ((Math.floor(jd + 1.5) % 7) + 7) % 7;
	}

	function weekdayName(jd) {
		return WEEKDAY_NAMES[dayOfWeek(jd)];
	}

	/* Day number in the year, 1 = January 1 (Meeus ch. 7). */
	function dayOfYear(year, month, day) {
		const k = isLeapYear(year) ? 1 : 2;

		return Math.floor((275 * month) / 9) - k * Math.floor((month + 9) / 12) + Math.floor(day) - 30;
	}

	/* Year with its fraction, e.g. 1992.78 (for axes and Delta T). */
	function decimalYear(jd) {
		const year = calendarDate(jd).year;
		const start = julianDay(year, 1, 1);
		const end = julianDay(year + 1, 1, 1);

		return year + (jd - start) / (end - start);
	}

	/* Julian Date of the start of a (possibly fractional) year. */
	function jdFromDecimalYear(decimal) {
		const year = Math.floor(decimal);
		const start = julianDay(year, 1, 1);
		const end = julianDay(year + 1, 1, 1);

		return start + (decimal - year) * (end - start);
	}

	/* JS Date (an instant, UTC) -> JD(UT), and back. */
	function fromDate(date) {
		return date.getTime() / MS_PER_DAY + UNIX_EPOCH_JD;
	}

	function toDate(jd) {
		return new Date((jd - UNIX_EPOCH_JD) * MS_PER_DAY);
	}

	/* JD(UT) of the present instant. */
	function now() {
		return fromDate(new Date());
	}

	/* ======================================================================
	   4. DELTA T AND TIME SCALES
	   Delta T = TT - UT in seconds, from the polynomials of Espenak & Meeus
	   (NASA, Five Millennium Canon of Solar Eclipses, 2006), valid from
	   -1999 to +3000. Outside 1600-2020 Delta T comes from historical
	   eclipse records and its uncertainty grows to several minutes in
	   antiquity (about +-5 min at -500, +-15 min at -2000).
	   ====================================================================== */

	/* Evaluate c0 + c1 t + c2 t^2 + ... */
	function poly(t, coefficients) {
		let result = 0;

		for (let i = coefficients.length - 1; i >= 0; i--) {
			result = result * t + coefficients[i];
		}

		return result;
	}

	/* The long-term parabola, used before -500 and after 2150. */
	function deltaTParabola(y) {
		const u = (y - 1820) / 100;

		return -20 + 32 * u * u;
	}

	/* Delta T in seconds for a decimal year y. */
	// prettier-ignore
	function deltaT(y) {
		if (y < -500) {
			return deltaTParabola(y);
		}
		if (y < 500) {
			return poly(y / 100, [10583.6, -1014.41, 33.78311, -5.952053,
				-0.1798452, 0.022174192, 0.0090316521]);
		}
		if (y < 1600) {
			return poly((y - 1000) / 100, [1574.2, -556.01, 71.23472, 0.319781,
				-0.8503463, -0.005050998, 0.0083572073]);
		}
		if (y < 1700) {
			return poly(y - 1600, [120, -0.9808, -0.01532, 1 / 7129]);
		}
		if (y < 1800) {
			return poly(y - 1700, [8.83, 0.1603, -0.0059285, 0.00013336, -1 / 1174000]);
		}
		if (y < 1860) {
			return poly(y - 1800, [13.72, -0.332447, 0.0068612, 0.0041116,
				-0.00037436, 0.0000121272, -0.0000001699, 0.000000000875]);
		}
		if (y < 1900) {
			return poly(y - 1860, [7.62, 0.5737, -0.251754, 0.01680668,
				-0.0004473624, 1 / 233174]);
		}
		if (y < 1920) {
			return poly(y - 1900, [-2.79, 1.494119, -0.0598939, 0.0061966, -0.000197]);
		}
		if (y < 1941) {
			return poly(y - 1920, [21.20, 0.84493, -0.076100, 0.0020936]);
		}
		if (y < 1961) {
			return poly(y - 1950, [29.07, 0.407, -1 / 233, 1 / 2547]);
		}
		if (y < 1986) {
			return poly(y - 1975, [45.45, 1.067, -1 / 260, -1 / 718]);
		}
		if (y < 2005) {
			return poly(y - 2000, [63.86, 0.3345, -0.060374, 0.0017275,
				0.000651814, 0.00002373599]);
		}
		if (y < 2050) {
			return poly(y - 2000, [62.92, 0.32217, 0.005589]);
		}
		if (y < 2150) {
			return deltaTParabola(y) - 0.5628 * (2150 - y);
		}

		return deltaTParabola(y);
	}

	/* JD(UT) -> JD(TT). */
	function ttFromUt(jdUT) {
		return jdUT + deltaT(decimalYear(jdUT)) / 86400;
	}

	/* JD(TT) -> JD(UT); Delta T changes slowly, so one evaluation suffices. */
	function utFromTt(jdTT) {
		return jdTT - deltaT(decimalYear(jdTT)) / 86400;
	}

	/* ======================================================================
	   5. SIDEREAL TIME AND HOUR ANGLE
	   ====================================================================== */

	/* Greenwich mean sidereal time in degrees [0, 360), Meeus 12.4. */
	function gmst(jdUT) {
		const t = centuries(jdUT);
		const theta = 280.46061837 + 360.98564736629 * (jdUT - J2000) + 0.000387933 * t * t - (t * t * t) / 38710000;

		return norm360(theta);
	}

	/* Local mean sidereal time in degrees; longitude positive east. */
	function lst(jdUT, longitudeEast) {
		return norm360(gmst(jdUT) + longitudeEast);
	}

	/* Hour angle H = LST - alpha, in degrees [0, 360). */
	function hourAngle(lstDegrees, rightAscension) {
		return norm360(lstDegrees - rightAscension);
	}

	/* ======================================================================
	   6. FORMATTING
	   ====================================================================== */

	/* Year as text: "1992", "585 BC" (era 'bcad') or "-584" ('astronomical'). */
	function formatYear(year, era = 'bcad') {
		if (era === 'bcad' && year <= 0) {
			return `${1 - year} BC`;
		}

		return String(year);
	}

	/* "13 Oct 1992" or, with time, "13 Oct 1992 06:30". */
	function formatDate(jd, options = {}) {
		const { time = false, era = 'bcad' } = options;
		const date = calendarDate(jd + (time ? 0.5 / 1440 : 0));
		const dayNumber = Math.floor(date.day);
		let text = `${dayNumber} ${MONTH_NAMES[date.month - 1]} ${formatYear(date.year, era)}`;

		if (time) {
			const minutes = Math.floor((date.day - dayNumber) * 1440);

			text += ` ${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
		}

		return text;
	}

	/* ======================================================================
	   7. EXPORT
	   ====================================================================== */

	return {
		J2000,
		DAYS_PER_CENTURY,
		MONTH_NAMES,
		julianDay,
		julianDayTime,
		calendarDate,
		centuries,
		mjd,
		isLeapYear,
		dayOfWeek,
		weekdayName,
		dayOfYear,
		decimalYear,
		jdFromDecimalYear,
		fromDate,
		toDate,
		now,
		deltaT,
		ttFromUt,
		utFromTt,
		gmst,
		lst,
		hourAngle,
		formatYear,
		formatDate
	};
})();
