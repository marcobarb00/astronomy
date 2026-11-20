#!/bin/sh
# The stars of page 3.3's blue plate (the sky from Gemini to Virgo) that
# the SIMBAD queries of fetch-plate-stars.sh do not cover: right ascension
# 105° to 195°, declination -20° to +20°, V < 5.0.
#
# On 2026-10-30 no CDS host (SIMBAD, VizieR and its mirrors) answered
# from the session that built page 3.3, so these come from XHIP, the
# Extended Hipparcos Compilation (E. Anderson and C. Francis, 2012,
# VizieR V/137D), as packaged in the data folder of the npm package
# d3-celestial 0.7.35 (BSD-3-Clause): stars.6.json (positions ICRS J2000
# to 0.0001°, V magnitudes) and starnames.json (Bayer and Flamsteed
# designations). The proper motions are not in that file and are left
# empty (0): over 26 years they move these stars by 20" at most, a
# twentieth of a pixel on the plate. Replace them by a SIMBAD query (the
# region added to fetch-plate-stars.sh) when CDS answers again.
#
# Usage: sh fetch-plate-stars-xhip.sh > plate-stars-xhip-YYYY-MM-DD.csv
#
# With the argument "hub", the rest of the band of the zodiac for the
# plate of tonight's sky on the hub (index.html), which can show any
# twelve hours of right ascension between declinations -45° and +34°:
# right ascension 195° to 15° (through 0°) from declination -47° to +20°,
# and right ascension 15° to 195° from -47° to -20°; and, whatever their
# magnitude, the stars of the zodiac's figures from Virgo to Pisces
# (FIGURE_STARS, as plate.js names them). North of +20° and the rest of
# the band are already in the SIMBAD files. On 2026-11-20 CDS did not
# answer from the session that built the hub either.
#
# XHIP writes some double stars without their index (alf Lib, bet Sco,
# mu. Sco, zet Sco, alf Cap): the stars are listed brightest first, and
# the first of a name keeps it, the bright component that the figures
# join; in "hub" mode the next ones are written as their HIP number, so
# that tools/make-plate-stars.py, which keeps one star per name, loses
# none (two stars XHIP calls ups Eri are 3° apart).
# Usage: sh fetch-plate-stars-xhip.sh hub > plate-stars-xhip-hub-YYYY-MM-DD.csv
set -e
REGION=${1:-page-3.3}
WORK=$(mktemp -d)
curl -sS -m 120 -o "$WORK/d3c.tgz" https://registry.npmjs.org/d3-celestial/-/d3-celestial-0.7.35.tgz
tar -xzf "$WORK/d3c.tgz" -C "$WORK" package/data/stars.6.json package/data/starnames.json
python3 -I - "$WORK/package/data" "$REGION" <<'PY'
import json, sys
folder = sys.argv[1]
region = sys.argv[2]
stars = json.load(open(folder + '/stars.6.json'))['features']
names = json.load(open(folder + '/starnames.json'))
GREEK = dict(zip('αβγδεζηθικλμνξοπρστυφχψω',
    ['alf', 'bet', 'gam', 'del', 'eps', 'zet', 'eta', 'tet', 'iot', 'kap', 'lam', 'mu.',
     'nu.', 'ksi', 'omi', 'pi.', 'rho', 'sig', 'tau', 'ups', 'phi', 'chi', 'psi', 'ome']))
SUPERSCRIPT = {'¹': '01', '²': '02', '³': '03'}

def identifier(hip):
    """SIMBAD-style identifier: 'gam01 Leo', '31 Leo' or 'HIP 49669'."""
    n = names.get(str(hip), {})
    bayer = n.get('bayer', '')
    if bayer and bayer[0] in GREEK:
        return GREEK[bayer[0]] + ''.join(SUPERSCRIPT.get(c, '') for c in bayer[1:]) + ' ' + n['c']
    if n.get('flam'):
        return n['flam'] + ' ' + n['c']
    return 'HIP %d' % hip

# The stars of the figures from Virgo to Pisces (plate.js, FIGURES).
FIGURE_STARS = set('''
alf Vir,bet Vir,gam Vir,del Vir,eps Vir,zet Vir,eta Vir,tet Vir,
alf Lib,bet Lib,gam Lib,sig Lib,ups Lib,
alf Sco,bet Sco,del Sco,pi. Sco,sig Sco,tau Sco,eps Sco,mu. Sco,zet Sco,eta Sco,tet Sco,kap Sco,lam Sco,
gam Sgr,del Sgr,eps Sgr,lam Sgr,phi Sgr,zet Sgr,sig Sgr,tau Sgr,
alf Cap,bet Cap,psi Cap,ome Cap,zet Cap,del Cap,gam Cap,iot Cap,tet Cap,
alf Aqr,bet Aqr,gam Aqr,del Aqr,eps Aqr,zet Aqr,eta Aqr,tet Aqr,lam Aqr,
alf Psc,gam Psc,kap Psc,lam Psc,iot Psc,tet Psc,ome Psc,del Psc,eps Psc,zet Psc,mu. Psc,nu. Psc,omi Psc,eta Psc,phi Psc,tau Psc
'''.replace('\n', '').split(','))
figures_done = set()
names_used = set()


def unique(hip):
    """The identifier, or 'HIP n' when an earlier star took it (hub mode)."""
    name = identifier(hip)
    if region == 'hub' and name in names_used:
        return 'HIP %d' % hip
    names_used.add(name)
    return name

print('main_id,ra,dec,pmra,pmdec,V')
for f in sorted(stars, key=lambda f: f['properties']['mag']):
    ra, dec = f['geometry']['coordinates']
    ra = ra % 360
    mag = f['properties']['mag']
    if region == 'hub':
        inside = (-47 <= dec <= 20 and (ra > 195 or ra < 15)) or (15 <= ra <= 195 and -47 <= dec < -20)
        if identifier(f['id']) in FIGURE_STARS and identifier(f['id']) not in figures_done:
            figures_done.add(identifier(f['id']))
            if mag >= 5.0 or not inside:
                print('"* %s",%s,%s,,,%s' % (unique(f['id']), ra, dec, mag))
                continue
    else:
        inside = 105 < ra <= 195 and -20 <= dec <= 20
    if mag < 5.0 and inside:
        print('"* %s",%s,%s,,,%s' % (unique(f['id']), ra, dec, mag))
PY
rm -rf "$WORK"
