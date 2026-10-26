#!/bin/sh
# Fetch the ICRS J2000 positions, proper motions and V magnitudes of the
# stars that page 2.3 adds to shared/stars.js (Regulus, the northern star
# in the forehead of Scorpius, Thuban) from SIMBAD (TAP service, ADQL).
# Usage: sh fetch-stars-2.3.sh > stars-2.3-YYYY-MM-DD.csv
IDS="'* alf Leo','* bet01 Sco','* alf Dra'"
QUERY="SELECT b.main_id, b.ra, b.dec, b.pmra, b.pmdec, f.V FROM basic AS b JOIN allfluxes AS f ON f.oidref = b.oid WHERE b.main_id IN ($IDS)"

curl -sS -m 30 -G "https://simbad.cds.unistra.fr/simbad/sim-tap/sync" \
	--data-urlencode "request=doQuery" \
	--data-urlencode "lang=adql" \
	--data-urlencode "format=csv" \
	--data-urlencode "query=$QUERY"
