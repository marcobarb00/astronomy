# Predicting the Sky · Italian translation

The site exists in English and in Italian. This file holds the conventions
of the translation and the glossary of its technical terms, so that every
page uses the same words. The English pages are the originals: change a
page in English first, then its Italian translation in the same commit.

## How the translation is built

- Every page has its translation beside it: `index.it.html` next to
  `index.html`, with `<html lang="it">`. The two files share `page.js`,
  `page.css`, the images and the shared code; the ids of the headings,
  figures, sliders and read-outs are the same in both.
- Each page names its translation in its `<head>`, which also gives it
  the flag of the other language at the top right (components.js §9):
  `<link rel="alternate" hreflang="it" href="index.it.html">` in English,
  `hreflang="en" href="index.html"` in Italian. A page without a
  translation (the intro, for now) has no such link and no flag.
- The scripts choose their words with `tr('English', 'italiano')`
  (common.js §9). The site map (`shared/site-map.js`) does the same for
  the titles, questions, topics and origins; a page with `italian: true`
  there is linked to its `index.it.html` from the Italian pages.
- Numbers are computed identically in both languages. The decimal comma
  is added where they reach the screen: read-outs (`renderTex`), slider
  values, text on a canvas (`canvasText`). A canvas label that is not a
  number but contains one (a page number, "4.2") is drawn with
  `ctx.fillText` or marked `words: true` as a tick.
- The `$...$` and `$$...$$` of the HTML are typeset as written, so an
  Italian page writes its decimal commas there by hand (`0{,}5`).
- A canvas or a column sized for English words may need more room for
  the Italian ones: `tr(100, 136)` (the row names of the error ladder).
- HTML comments and code comments stay in English.

## Conventions

- **Decimal comma** everywhere in Italian: 0,5°; 365,2422 giorni; in
  KaTeX `0{,}5` (without braces KaTeX adds a space after the comma). The
  raised dot between thousands stays as in English (126·007 giorni).
- Page and section numbers keep the point: pagina 2.1, §4.2, Figura 3.
- **Dates**: 21 marzo 2026, il 1º giugno; months in lower case; in the
  read-outs the short months gen, feb, mar, apr, mag, giu, lug, ago, set,
  ott, nov, dic. Eras: 585 a.C., 150 d.C.; "circa" is ca.
- **Cardinal points**: N, E, S, O (ovest).
- **Units**: primi d'arco (′) and secondi d'arco (″) for arcminutes and
  arcseconds; h, min, s as in English.
- **Names**: Ipparco, Tolomeo, Copernico, Keplero, Tycho Brahe, Galileo,
  Newton, Bessel; Marte, Venere, Mercurio, Giove, Saturno. The stars keep
  their names (Vega, Polaris, Deneb, Antares) except those Italian books
  write in Italian: Sirio, Canopo, Arturo, Regolo (`Stars.label`). The
  constellations on the blue plates keep their Latin names, as in an
  atlas.
- **Book titles** stay in the original or in the English edition cited
  (*Almagest*, *De revolutionibus*, *Astronomia nova*); quotations from
  the English translations are given in Italian, with the source as in
  English.
- The voice is the one of WRITING.md: "noi" for the work done together,
  "tu" for what the reader does with the page.
- Every longitude and latitude names its kind, as in English:
  longitudine eclittica, latitudine eclittica, latitudine geografica,
  longitudine eliocentrica.

## Glossary

| English | Italiano |
|---|---|
| right ascension | ascensione retta |
| declination | declinazione |
| hour angle | angolo orario |
| altitude, azimuth | altezza, azimut |
| zenith, nadir | zenit, nadir |
| horizon | orizzonte |
| meridian | meridiano |
| upper / lower culmination | culminazione superiore / inferiore |
| circumpolar | circumpolare |
| celestial sphere, celestial pole | sfera celeste, polo celeste |
| celestial equator | equatore celeste |
| ecliptic | eclittica |
| ecliptic longitude / latitude | longitudine / latitudine eclittica |
| geographic latitude / longitude | latitudine / longitudine geografica |
| heliocentric longitude | longitudine eliocentrica |
| frame (of reference) | sistema di riferimento |
| horizon / equatorial / ecliptic frame | sistema orizzontale / equatoriale / eclittico |
| vernal equinox, March equinox | equinozio di primavera, equinozio di marzo |
| vernal point γ | punto γ (punto vernale) |
| solstice | solstizio |
| obliquity of the ecliptic | obliquità dell'eclittica |
| sidereal day / year / month | giorno sidereo / anno sidereo / mese sidereo |
| sidereal time | tempo siderale |
| tropical year | anno tropico |
| solar day, mean solar day | giorno solare, giorno solare medio |
| apparent / mean solar time | tempo solare vero / medio |
| equation of time | equazione del tempo |
| mean Sun, true Sun | Sole medio, Sole vero |
| sundial | meridiana |
| Universal Time, Terrestrial Time | Tempo Universale, Tempo Terrestre |
| precession of the equinoxes | precessione degli equinozi |
| nutation, aberration | nutazione, aberrazione |
| refraction | rifrazione |
| parallax, stellar parallax | parallasse, parallasse stellare |
| proper motion | moto proprio |
| magnitude | magnitudine |
| anomaly (first, second) | anomalia (prima, seconda) |
| equation of anomaly, equation of the epicycle, zodiacal equation | equazione dell'anomalia, equazione dell'epiciclo, equazione zodiacale |
| mean / true / eccentric anomaly | anomalia media / vera / eccentrica |
| equation of center | equazione del centro |
| mean motion | moto medio |
| mean longitude | longitudine media |
| apogee, perigee | apogeo, perigeo |
| aphelion, perihelion | afelio, perielio |
| apsides, line of apsides | apsidi, linea degli apsidi |
| eccentric (circle), eccentricity | eccentrico, eccentricità |
| deferent, epicycle | deferente, epiciclo |
| epicyclet (Copernicus) | epiciclo minore |
| equant | equante |
| crank (Ptolemy's lunar model) | manovella |
| prosneusis | prosneusi |
| evection, variation, annual equation | evezione, variazione, equazione annua |
| synodic / anomalistic / draconic month | mese sinodico / anomalistico / draconitico |
| synodic period | periodo sinodico |
| node, ascending / descending node | nodo, nodo ascendente / discendente |
| argument of latitude | argomento della latitudine |
| syzygy, quadrature, octant | sizigia, quadratura, ottante |
| new / full Moon, first / last quarter | Luna nuova / piena, primo / ultimo quarto |
| elongation, greatest elongation | elongazione, massima elongazione |
| inner / outer planet | pianeta interno / esterno |
| phase angle, illuminated fraction | angolo di fase, frazione illuminata |
| opposition, conjunction | opposizione, congiunzione |
| retrograde motion, station | moto retrogrado, stazione |
| loop (retrograde) | cappio |
| umbra, penumbra | ombra, penombra |
| eclipse limits | limiti delle eclissi |
| eclipse year, eclipse season | anno delle eclissi, stagione delle eclissi |
| geostatic, heliostatic | geostatico, eliostatico |
| arrangement (Copernicus', Tycho's) | disposizione |
| astronomical unit (au) | unità astronomica (au) |
| ellipse, focus, empty focus | ellisse, fuoco, fuoco vuoto |
| semi-major / semi-minor axis | semiasse maggiore / minore |
| area law, Kepler's equation | legge delle aree, equazione di Keplero |
| third law | terza legge |
| ephemeris | effemeride |
| time-degrees | gradi di tempo |
| convergents (of a continued fraction) | ridotte |
| *Rudolphine Tables* | *Tavole rudolfine* |
| reference sky | cielo di riferimento |
| error curve | curva dell'errore |
| ghost (an earlier curve, faint) | fantasma |
| read-out | lettura |
| blue plate | tavola blu |
| observation, model, fit, test, residual (the steps of a page) | osservazione, modello, adattamento, verifica, residuo |
| to fit (a parameter) | adattare, ricavare da un adattamento |
| detour (margin note) | digressione |
| origin (margin note) | origine |
| Today (margin note) | Oggi |
| exercise, hint, answer | esercizio, suggerimento, soluzione |
| Act, Epilogue | Atto, Epilogo |
| toolbox | cassetta degli attrezzi |
