// @ts-check
/* ==========================================================================
   PREDICTING THE SKY - THE HUB (hub.js)
   The hub's own figure, the plate of tonight's sky, and the building of
   the hub from the shared components: the chapters with the drawing of
   each page, the timeline of the astronomers and the key of origins.

   TABLE OF CONTENTS
	 1. The plate of tonight's sky
	 2. Entry point
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
   declinations (deg), wide enough for the ecliptic and the Moon. */
const TONIGHT_WIDTH = 180;
const TONIGHT_DEC = { min: -30, max: 34 };

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

/* The bodies, in the order of the caption's list, and their disks on the
   plate (chart units). */
const TONIGHT_BODIES = [
	{ id: 'sun', name: 'Sun', radius: 0 },
	{ id: 'moon', name: 'Moon', radius: 9 },
	{ id: 'mercury', name: 'Mercury', radius: 6 },
	{ id: 'venus', name: 'Venus', radius: 6 },
	{ id: 'mars', name: 'Mars', radius: 6 },
	{ id: 'jupiter', name: 'Jupiter', radius: 6 },
	{ id: 'saturn', name: 'Saturn', radius: 6 }
];

const tonightFigure = {
	init() {
		const jdTT = Time.ttFromUt(Time.now());
		const bodies = TONIGHT_BODIES.map(body => Object.assign({}, body, this.place(body.id, jdTT)));
		const container = byId('plate-tonight');
		const area = this.area(bodies[0].ra);
		const chart = Plate.rectangular(container, {
			area: area,
			figures: ['ARIES', 'TAURUS', 'ORION', 'GEMINI', 'CANCER', 'LEO'],
			keep: [],
			names: [['alf Tau', 'Aldebaran', 8, 22]],
			margins: this.fitMargins(container.clientWidth),
			label: "Tonight's half of the zodiac, with the Moon and the planets on it."
		});

		this.drawEcliptic(chart, area);

		const shown = bodies.filter(body => body.id !== 'sun' && this.inside(body.ra, area));
		const hidden = bodies.filter(body => !shown.includes(body));

		shown.forEach(body => {
			Plate.body(chart, body.ra, body.dec, body.name, body.radius);
		});

		byId('tonight-date').textContent = this.dateText(new Date());
		byId('tonight-off').textContent = hidden.map(body => body.name).join(', ');
	},

	/* Apparent right ascension and declination (deg) of a body. */
	place(id, jdTT) {
		const ecliptic = Ephem.position(id, jdTT);

		return Ephem.equatorial(ecliptic, jdTT);
	},

	/* Twelve hours centered opposite the Sun. A chart may not cross 0h
	   (Plate.rectangular draws right ascension increasing to the east
	   without a wrap), so the window is moved to end at 0h or 24h when the
	   center lies within six hours of 0h. */
	area(sunRa) {
		const centre = (sunRa + 180) % 360;
		const raMin = Math.min(Math.max(centre - TONIGHT_WIDTH / 2, 0), 360 - TONIGHT_WIDTH);

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

	inside(ra, area) {
		return ra >= area.raMin && ra <= area.raMax;
	},

	/* The ecliptic of the plate's epoch, inside the chart, in order of
	   right ascension. */
	drawEcliptic(chart, area) {
		const eps = Ephem.meanObliquity(Plate.EPOCH);
		const points = [];

		for (let lon = 0; lon < 360; lon += 1) {
			const point = Frames.eclipticPoint(lon, eps);

			if (this.inside(point.ra, area)) {
				points.push(point);
			}
		}

		points.sort((a, b) => a.ra - b.ra);

		const nameAt = Frames.eclipticPoint(
			this.longitudeAt(area.raMin + ECLIPTIC_NAME_INSET * (area.raMax - area.raMin), eps),
			eps
		);

		Plate.line(chart, points, 'ecliptic', [nameAt.ra, nameAt.dec, 8, 18]);
	},

	/* The ecliptic longitude (deg) at a right ascension: the inverse of
	   the reduction to the equator, tan lambda = tan alpha / cos eps. */
	longitudeAt(ra, eps) {
		return norm360(atan2d(sin(ra), cos(ra) * cos(eps)));
	},

	/* "20 November 2026", the date of the page's opening. */
	dateText(date) {
		return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
	}
};

/* ==========================================================================
   2. ENTRY POINT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.renderHub(byId('map'), Thumbs.svg);
	Site.renderTimeline(byId('timeline'));
	Site.renderOriginKey(byId('origins'));
	tonightFigure.init();
});
