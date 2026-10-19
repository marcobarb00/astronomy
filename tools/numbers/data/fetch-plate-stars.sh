#!/bin/sh
# Fetch the stars drawn on the blue plates (STYLE.md §7) from SIMBAD (TAP
# service, ADQL query): ICRS J2000 positions, proper motions and V
# magnitudes of every star brighter than V = 5.0 north of declination +20°
# (the polar charts) or in the band of the zodiac around Taurus (right
# ascension 15° to 105°, declination -20° to +40°).
# Usage: sh fetch-plate-stars.sh > plate-stars-YYYY-MM-DD.csv
QUERY="SELECT b.main_id, b.ra, b.dec, b.pmra, b.pmdec, f.V FROM basic AS b JOIN allfluxes AS f ON f.oidref = b.oid WHERE f.V < 5.0 AND b.main_id LIKE '*%' AND (b.dec > 20 OR (b.ra BETWEEN 15 AND 105 AND b.dec BETWEEN -20 AND 40)) ORDER BY V"


# A second query, for the stars of the constellation figures by name (some
# have no V in "allfluxes"; their V comes from the table "flux").
# Usage: sh fetch-plate-stars.sh figures > plate-figure-stars-YYYY-MM-DD.csv
FIGURE_IDS="'* alf UMa','* bet UMa','* gam UMa','* del UMa','* eps UMa','* zet01 UMa','* eta UMa','* alf UMi','* del UMi','* eps UMi','* zet UMi','* eta UMi','* gam UMi','* bet UMi','* alf Cas','* bet Cas','* gam Cas','* del Cas','* eps Cas','* alf Cep','* bet Cep','* gam Cep','* iot Cep','* zet Cep','* alf Cyg','* gam Cyg','* eta Cyg','* bet01 Cyg','* del Cyg','* eps Cyg','* alf Tau','* bet Tau','* gam Tau','* del Tau','* eps Tau','* zet Tau','* lam Tau','* tet02 Tau','* eta Tau','*  17 Tau','* q Tau','*  20 Tau','*  23 Tau','*  27 Tau','*  28 Tau','* alf Ari','* bet Ari','* gam02 Ari','*  41 Ari','* alf Ori','* bet Ori','* gam Ori','* del Ori','* eps Ori','* zet Ori','* kap Ori','* lam Ori'"
FIGURE_QUERY="SELECT b.main_id, b.ra, b.dec, b.pmra, b.pmdec, f.flux AS V FROM basic AS b LEFT OUTER JOIN flux AS f ON f.oidref = b.oid AND f.filter = 'V' WHERE b.main_id IN ($FIGURE_IDS)"

if [ "$1" = "figures" ]; then
	QUERY="$FIGURE_QUERY"
fi

# Two figure stars have no V in SIMBAD at all: eta UMi (HIP 79822) and
# gam Cep (HIP 116727). Their V comes from the Hipparcos catalogue
# (VizieR I/239).
# Usage: sh fetch-plate-stars.sh hipparcos > plate-hipparcos-V-YYYY-MM-DD.csv
if [ "$1" = "hipparcos" ]; then
	curl -sS -m 60 -G "https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync" \
		--data-urlencode "request=doQuery" \
		--data-urlencode "lang=adql" \
		--data-urlencode "format=csv" \
		--data-urlencode 'query=SELECT HIP, Vmag FROM "I/239/hip_main" WHERE HIP IN (79822, 116727)'
	exit
fi

curl -sS -m 60 -G "https://simbad.cds.unistra.fr/simbad/sim-tap/sync" \
	--data-urlencode "request=doQuery" \
	--data-urlencode "lang=adql" \
	--data-urlencode "format=csv" \
	--data-urlencode "query=$QUERY"
