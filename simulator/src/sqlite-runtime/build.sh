#!/bin/sh
set -eu
recipe=/sqlite-runtime
mkdir -p /sqlite-original /out /sqlite-stage
apk info -v sqlite-libs | grep -Fx 'sqlite-libs-3.53.4-r0'
apk info -L sqlite-libs > /out/original-package-files.txt
python - <<'CHECK'
from pathlib import Path
files = [line.strip() for line in Path('/out/original-package-files.txt').read_text().splitlines() if line.startswith('usr/') and not line.endswith('/')]
assert sorted(files) == ['usr/lib/libsqlite3.so.0', 'usr/lib/libsqlite3.so.3.53.4'], files
CHECK
cp -L /usr/lib/libsqlite3.so.0 /sqlite-original/libsqlite3.so.0
sha256sum /sqlite-original/libsqlite3.so.0 > /out/original-library.sha256
# Snapshot the installed runtime before any build dependency can update it.
apk add --no-cache build-base binutils patch openssl readline-dev tcl-dev unzip
cd "$recipe" && sha256sum -c SHA256SUMS
mkdir /sqlite-amalgamation /sqlite-tests
tar -xzf /tmp/sqlite-autoconf.tar.gz --strip-components=1 -C /sqlite-amalgamation
unzip -q /tmp/sqlite-src.zip -d /sqlite-tests
cd /sqlite-amalgamation
patch --batch --fuzz=0 -p1 < "$recipe/amalgamation.patch"
# These are the exact Alpine 3.53.4-r0 APKBUILD feature flags.
export CFLAGS='-O2 -DSQLITE_ENABLE_FTS3_PARENTHESIS -DSQLITE_ENABLE_COLUMN_METADATA -DSQLITE_SECURE_DELETE -DSQLITE_ENABLE_UNLOCK_NOTIFY -DSQLITE_ENABLE_RTREE -DSQLITE_ENABLE_GEOPOLY -DSQLITE_USE_URI -DSQLITE_ENABLE_DBSTAT_VTAB -DSQLITE_SOUNDEX -DSQLITE_MAX_VARIABLE_NUMBER=250000'
./configure --build="$(gcc -dumpmachine)" --host="$(gcc -dumpmachine)" --prefix=/usr \
 --enable-threadsafe --enable-readline --with-readline-header=/usr/include/readline/readline.h \
 --enable-session --enable-static --enable-fts3 --enable-fts4 --enable-fts5 --soname=legacy
make -j2
make DESTDIR=/sqlite-stage install
cc -DSQLITE_ENABLE_SESSION=1 -DSQLITE_ENABLE_PREUPDATE_HOOK=1 -I. "$recipe/check-sqlite.c" /sqlite-original/libsqlite3.so.0 -ldl -o /out/check-original
LD_LIBRARY_PATH=/sqlite-original /out/check-original --options | sort > /out/original-options.txt
nm -D --defined-only /sqlite-original/libsqlite3.so.0 | awk '{print $3}' | sort -u > /out/original-exports.txt
set +e
LD_LIBRARY_PATH=/sqlite-original timeout 15 /out/check-original > /out/original-regression.log 2>&1
status=$?
set -e
[ "$status" = 1 ]
grep -F 'sqlite3changeset_concat' /out/original-regression.log
cc -DSQLITE_ENABLE_SESSION=1 -DSQLITE_ENABLE_PREUPDATE_HOOK=1 -I. "$recipe/check-sqlite.c" -L/sqlite-stage/usr/lib -lsqlite3 -ldl -o /out/check-sqlite
LD_LIBRARY_PATH=/sqlite-stage/usr/lib /out/check-sqlite
LD_LIBRARY_PATH=/sqlite-stage/usr/lib /out/check-sqlite --options | sort > /out/patched-options.txt
cmp /out/original-options.txt /out/patched-options.txt
LD_LIBRARY_PATH=/sqlite-stage/usr/lib /out/check-sqlite --exports /out/original-exports.txt
old_soname=$(readelf -d /sqlite-original/libsqlite3.so.0 | sed -n 's/.*(SONAME).*\[\(.*\)\].*/\1/p')
new_soname=$(readelf -d /sqlite-stage/usr/lib/libsqlite3.so.0 | sed -n 's/.*(SONAME).*\[\(.*\)\].*/\1/p')
[ "$old_soname" = libsqlite3.so.0 ] && [ "$new_soname" = "$old_soname" ]
cd /sqlite-tests/sqlite-src-3530400
patch --batch --fuzz=0 -p1 < "$recipe/session.patch"
./configure --enable-session --enable-fts5
make -j2 testfixture
for suite in session1 session9 sessionC; do
 ./testfixture "ext/session/$suite.test" > "/out/$suite.log" 2>&1
 cat "/out/$suite.log"
 grep -Eq '^0 errors out of [1-9][0-9]* tests' "/out/$suite.log"
 grep -Fq 'All memory allocations freed - no leaks' "/out/$suite.log"
done
mkdir -p /pkg/usr/lib /pkg/usr/share/doc/sqlite-libs/runtime
cp -a /sqlite-stage/usr/lib/libsqlite3.so.0 /sqlite-stage/usr/lib/libsqlite3.so.3.53.4 /pkg/usr/lib/
# sqlite-libs originally contains only this SONAME link and versioned library.
test "$(find /pkg/usr/lib -maxdepth 1 -type f | wc -l)" = 1
test "$(find /pkg/usr/lib -maxdepth 1 -type l | wc -l)" = 1
cp /sqlite-tests/sqlite-src-3530400/LICENSE.md /pkg/usr/share/doc/sqlite-libs/runtime/copyright
cp "$recipe"/*.patch "$recipe/SOURCE.json" "$recipe/SHA256SUMS" "$recipe/APKBUILD.original" /pkg/usr/share/doc/sqlite-libs/runtime/
cp /out/session*.log /out/original-regression.log /out/original-options.txt /out/original-exports.txt /out/original-package-files.txt /pkg/usr/share/doc/sqlite-libs/runtime/
sha256sum /pkg/usr/lib/libsqlite3.so.3.53.4 | cut -d ' ' -f 1 > /pkg/usr/share/doc/sqlite-libs/runtime/library.sha256
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out /tmp/runtime-sqlite.rsa
openssl pkey -in /tmp/runtime-sqlite.rsa -pubout -out /out/runtime-sqlite.rsa.pub
apk mkpkg --sign-key /tmp/runtime-sqlite.rsa --files /pkg --output /out/sqlite-libs.apk \
 --info name:sqlite-libs --info version:3.53.4_p20261025-r0 --info arch:$(apk --print-arch) \
 --info origin:sqlite --info license:blessing --info url:https://www.sqlite.org/ \
 --info description:'SQLite library with upstream session varint backport' \
 --info depends:so:libc.musl-$(apk --print-arch).so.1 --info provides:so:libsqlite3.so.0=3.53.4
cp /out/runtime-sqlite.rsa.pub /etc/apk/keys/
apk verify /out/sqlite-libs.apk
rm /tmp/runtime-sqlite.rsa
# Test tools stay in the builder; consumers mount them, never copy the baseline ELF.
cp "$recipe/verify.py" /out/verify-sqlite.py
