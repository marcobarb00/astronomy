#!/bin/sh
# Fetch the ICRS J2000 positions, proper motions and V magnitudes of the
# bright stars in shared/stars.js from SIMBAD (Regulus, alf Leo, was
# added on 2026-10-24: its row is in stars-2.3-2026-10-24.csv) (TAP service, ADQL query).
# Usage: sh fetch-stars.sh > stars-YYYY-MM-DD.csv
IDS="'* alf UMi','* bet UMi','* alf UMa','* alf Aur','* alf Lyr','* alf Cyg','* alf Boo','* alf Aql','* alf Ori','* bet Ori','* del Ori','* alf CMa','* alf Car','* alf Vir','* alf Leo','* alf Sco','* alf Tau','* alf Cru','* alf Cen','* alf Eri','* sig Oct'"
QUERY="SELECT b.main_id, b.ra, b.dec, b.pmra, b.pmdec, f.V FROM basic AS b JOIN allfluxes AS f ON f.oidref = b.oid WHERE b.main_id IN ($IDS)"

curl -sS -m 30 -G "https://simbad.cds.unistra.fr/simbad/sim-tap/sync" \
	--data-urlencode "request=doQuery" \
	--data-urlencode "lang=adql" \
	--data-urlencode "format=csv" \
	--data-urlencode "query=$QUERY"
