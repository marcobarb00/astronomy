#!/bin/sh
# Fetch the ICRS J2000 position, proper motion, parallax and V magnitude of
# 61 Cygni A, which page 4.4 adds to shared/stars.js, from SIMBAD (TAP
# service, ADQL). On 2026-11-17 the Strasbourg host did not answer from a
# cloud session, so the query goes to SIMBAD's mirror at Harvard (CfA),
# which serves the same database.
# Usage: sh fetch-stars-4.4.sh > stars-4.4-YYYY-MM-DD.csv
IDS="'*  61 Cyg A'"
QUERY="SELECT b.main_id, b.ra, b.dec, b.pmra, b.pmdec, b.plx_value, b.plx_err, b.plx_bibcode, f.V FROM basic AS b JOIN allfluxes AS f ON f.oidref = b.oid WHERE b.main_id IN ($IDS)"

curl -sS -m 30 -G "https://simbad.harvard.edu/simbad/sim-tap/sync" \
	--data-urlencode "request=doQuery" \
	--data-urlencode "lang=adql" \
	--data-urlencode "format=csv" \
	--data-urlencode "query=$QUERY"
