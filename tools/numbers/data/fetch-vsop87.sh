#!/bin/sh
# Fetch the VSOP87B series of the Earth and Mars (heliocentric ecliptic
# coordinates L, B, R, J2000 ecliptic and equinox; P. Bretagnon and
# G. Francou, A&A 202, 309, 1988) from the IMCCE, and JPL Horizons'
# heliocentric vectors of the two bodies (DE441, J2000 ecliptic, every 300
# days from 1900 to 2150), against which tools/make-vsop87.js checks the
# truncated series it writes into shared/vsop87.js (page 4.5).
# Run from the repository root: sh tools/numbers/data/fetch-vsop87.sh
# Fetched on 2026-11-19.
set -e
DIR=tools/numbers/data/vsop87

for body in ear mar; do
	curl -sS -o "$DIR/VSOP87B.$body" "https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87B.$body"
done

for body in 399 499; do
	curl -sS -G "https://ssd.jpl.nasa.gov/api/horizons.api" \
		--data-urlencode "format=text" \
		--data-urlencode "COMMAND='$body'" \
		--data-urlencode "EPHEM_TYPE='VECTORS'" \
		--data-urlencode "CENTER='500@10'" \
		--data-urlencode "REF_PLANE='ECLIPTIC'" \
		--data-urlencode "REF_SYSTEM='J2000'" \
		--data-urlencode "VEC_TABLE='1'" \
		--data-urlencode "OUT_UNITS='AU-D'" \
		--data-urlencode "CSV_FORMAT='YES'" \
		--data-urlencode "START_TIME='1900-01-01'" \
		--data-urlencode "STOP_TIME='2150-01-01'" \
		--data-urlencode "STEP_SIZE='300d'" \
		-o "$DIR/horizons-vectors-$body.txt"
done
