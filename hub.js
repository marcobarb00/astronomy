// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - THE HUB (hub.js)
   The hub's own figure, the plate of tonight's sky, the link to the
   first page, and the building of the hub from the shared components: the chapters with the drawing of
   each page, the timeline of the astronomers.

   TABLE OF CONTENTS
	 1. The plate of tonight's sky
	 2. The way in
	 3. Entry point
   ========================================================================== */

/* ==========================================================================
   1. THE PLATE OF TONIGHT'S SKY
   A blue plate (shared/plate.js, STYLE.md §7) of twelve hours of right
   ascension centered opposite the Sun: the half of the zodiac above the
   horizon tonight, seen looking south. The ecliptic is a plain line; the
   Moon and the naked-eye planets on the chart are the highlight, at
   their apparent places when the page opens (shared/ephemeris.js). The
   bodies off the chart are named in the caption.
   ========================================================================== */

/* The area shown: twelve hours of right ascension, between these
   declinations (deg), wide enough for the ecliptic, the Moon and the
   figures of the zodiac (Scorpius' tail reaches -43°). */
const TONIGHT_WIDTH = 180;
const TONIGHT_DEC = { min: -45, max: 34 };

/* Room on the screen (px) beside the chart's border: on the left for the
   declinations ("−30°"), on the right for half of the last hour ("0h"),
   under it for the hours.
   plate.js keeps its text at a fixed size on the screen, so on a narrow
   chart (a phone) the margins must grow in chart units (fitMargins). */
const LABEL_ROOM = { left: 46, right: 20, bottom: 26 };
const PLATE_SCALE = 8; // chart units per degree (Plate.rectangular)
const DEFAULT_MARGIN = { left: 108, bottom: 70 }; // chart units (Plate.rectangular)

/* The ecliptic is named this fraction of the chart's width inside its
   western edge. */
const ECLIPTIC_NAME_INSET = 0.22;

/* The figures drawn: the twelve of the zodiac, and Orion. */
const ZODIAC_FIGURES = [
	'ARIES',
	'TAURUS',
	'ORION',
	'GEMINI',
	'CANCER',
	'LEO',
	'VIRGO',
	'LIBRA',
	'SCORPIUS',
	'SAGITTARIUS',
	'CAPRICORNUS',
	'AQUARIUS',
	'PISCES'
];

/* The twinkling of the stars (theme.css §14): each star's brightness
   dips by up to 'depth' (a fraction), more for the stars low on the
   chart, whose light crosses more air when they culminate as seen from
   mid-northern latitudes; each star has its own period, between min and
   max seconds. The planets do not twinkle: they show small disks. */
const TWINKLE = { depthHigh: 0.06, depthLow: 0.6, periodMin: 1.6, periodMax: 4.2 };

/* The bodies, in the order of the caption's list, and their disks on the
   plate (chart units). */
const TONIGHT_BODIES = [
	{ id: 'sun', name: tr('Sun', 'Sole'), radius: 0 },
	{ id: 'moon', name: tr('Moon', 'Luna'), radius: 9 },
	{ id: 'mercury', name: tr('Mercury', 'Mercurio'), radius: 6 },
	{ id: 'venus', name: tr('Venus', 'Venere'), radius: 6 },
	{ id: 'mars', name: tr('Mars', 'Marte'), radius: 6 },
	{ id: 'jupiter', name: tr('Jupiter', 'Giove'), radius: 6 },
	{ id: 'saturn', name: tr('Saturn', 'Saturno'), radius: 6 }
];

const tonightFigure = {
	init() {
		const jdTT = Time.ttFromUt(Time.now());
		const bodies = TONIGHT_BODIES.map(body => Object.assign({}, body, this.place(body.id, jdTT)));
		const container = byId('plate-tonight');
		const area = this.area(bodies[0].ra);
		const chart = Plate.rectangular(container, {
			area: area,
			figures: ZODIAC_FIGURES,
			keep: [],
			names: [['alf Tau', 'Aldebaran', 8, 22]],
			margins: this.fitMargins(container.clientWidth),
			label: tr(
				"Tonight's half of the zodiac, with the Moon and the planets on it.",
				'La metà dello zodiaco visibile stanotte, con la Luna e i pianeti.'
			)
		});

		this.drawEcliptic(chart, area);

		// right ascensions taken into the chart's range, which may cross 0h
		bodies.forEach(body => {
			body.ra = chart.unwrap(body.ra);
		});

		const shown = bodies.filter(body => body.id !== 'sun' && body.ra <= area.raMax);
		const hidden = bodies.filter(body => !shown.includes(body));

		shown.forEach(body => {
			Plate.body(chart, body.ra, body.dec, body.name, body.radius);
		});

		this.twinkle(chart, area);

		byId('tonight-date').textContent = this.dateText(new Date());
		byId('tonight-off').textContent = hidden.map(body => body.name).join(', ');
	},

	/* Apparent right ascension and declination (deg) of a body. */
	place(id, jdTT) {
		const ecliptic = Ephem.position(id, jdTT);

		return Ephem.equatorial(ecliptic, jdTT);
	},

	/* Twelve hours centered opposite the Sun (the area may cross 0h:
	   raMin below 0 or raMax above 360). */
	area(sunRa) {
		const raMin = norm360(sunRa + 180) - TONIGHT_WIDTH / 2;

		return { raMin: raMin, raMax: raMin + TONIGHT_WIDTH, decMin: TONIGHT_DEC.min, decMax: TONIGHT_DEC.max };
	},

	/* Margins (chart units) that leave LABEL_ROOM on the screen beside the
	   border of a chart drawn 'screenWidth' px wide. With k chart units
	   per px, the whole width is W + k (left + right) = k * screenWidth,
	   so k = W / (screenWidth - left - right). Never less than the
	   plate's default margins on the left and under the chart. */
	fitMargins(screenWidth) {
		const chartWidth = TONIGHT_WIDTH * PLATE_SCALE;
		const room = LABEL_ROOM.left + LABEL_ROOM.right;
		const k = chartWidth / Math.max(screenWidth - room, 1);

		return {
			left: Math.max(DEFAULT_MARGIN.left, LABEL_ROOM.left * k),
			right: Math.max(LABEL_ROOM.right * k, 40),
			bottom: Math.max(DEFAULT_MARGIN.bottom, LABEL_ROOM.bottom * k)
		};
	},

	/* The ecliptic of the plate's epoch, inside the chart, in order of
	   right ascension (taken into the chart's range). */
	drawEcliptic(chart, area) {
		const eps = Ephem.meanObliquity(Plate.EPOCH);
		const points = [];

		for (let lon = 0; lon < 360; lon += 1) {
			const point = Frames.eclipticPoint(lon, eps);
			const ra = chart.unwrap(point.ra);

			if (ra <= area.raMax) {
				points.push({ ra: ra, dec: point.dec });
			}
		}

		points.sort((a, b) => a.ra - b.ra);

		const nameRa = area.raMin + ECLIPTIC_NAME_INSET * (area.raMax - area.raMin);
		const nameAt = Frames.eclipticPoint(this.longitudeAt(nameRa, eps), eps);

		Plate.line(chart, points, tr('ecliptic', 'eclittica'), [chart.unwrap(nameAt.ra), nameAt.dec, 8, 18]);
	},

	/* The ecliptic longitude (deg) at a right ascension: the inverse of
	   the reduction to the equator, tan lambda = tan alpha / cos eps. */
	longitudeAt(ra, eps) {
		return norm360(atan2d(sin(ra), cos(ra) * cos(eps)));
	},

	/* Give each star of the chart its twinkle: a depth that grows towards
	   the bottom of the chart and a period of its own. Nothing for readers
	   who ask for reduced motion. The periods come from a fixed sequence, so
	   that the chart twinkles the same way at every visit. */
	twinkle(chart, area) {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		const top = chart.at(area.raMin, area.decMax).y;
		const bottom = chart.at(area.raMin, area.decMin).y;
		let seed = 1;
		const next = () => {
			seed = (seed * 16807) % 2147483647;

			return seed / 2147483647;
		};

		chart.svg.querySelectorAll('.stars path').forEach(star => {
			const box = star.getBBox();
			const low = clamp((box.y + box.height / 2 - top) / (bottom - top), 0, 1);
			const depth = TWINKLE.depthHigh + (TWINKLE.depthLow - TWINKLE.depthHigh) * low * low;
			const period = TWINKLE.periodMin + (TWINKLE.periodMax - TWINKLE.periodMin) * next();

			star.style.setProperty('--twinkle-depth', depth.toFixed(2));
			star.style.animationDuration = `${period.toFixed(2)}s`;
			star.style.animationDelay = `${(-period * next()).toFixed(2)}s`;
			star.classList.add('twinkle');
		});
	},

	/* "20 November 2026" ("20 novembre 2026"), the date of the page's opening. */
	dateText(date) {
		return date.toLocaleDateString(tr('en-GB', 'it-IT'), { day: 'numeric', month: 'long', year: 'numeric' });
	}
};

/* ==========================================================================
   2. THE WAY IN
   The filled link under the opening leads to the first page of the
   course that is ready, in reading order: the intro (0.1) once it is
   published, page 1.1 until then. index.html writes the link to 1.1, so
   that it works without the script.
   ========================================================================== */

function pointStartLink() {
	const first = SITE_MAP.PAGES.find(page => page.ready);
	const link = byId('begin');

	link.href = first.path;
	byId('begin-text').textContent = tr(
		`Begin with ${first.number}, ${first.title}`,
		`Comincia da ${first.number}, ${first.title}`
	);
}

/* ==========================================================================
   3. ENTRY POINT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	pointStartLink();
	Site.renderHub(byId('map'), Thumbs.svg);
	Site.renderTimeline(byId('timeline'));
	tonightFigure.init();
});
