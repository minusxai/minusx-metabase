"""Verify the actual installed SQLite package and Python APIs against its source proof."""
import ctypes
import hashlib
import json
import sqlite3
import subprocess
from pathlib import Path

receipt = Path('/usr/share/doc/sqlite-libs/runtime')
library = Path('/usr/lib/libsqlite3.so.0').resolve()
assert hashlib.sha256(library.read_bytes()).hexdigest() == (receipt / 'library.sha256').read_text().strip()
subprocess.run(['apk', 'info', '--exists', 'sqlite-libs=3.53.4_p20261025-r0'], check=True)
assert sqlite3.sqlite_version == '3.53.4'
with sqlite3.connect(':memory:') as db:
    options = sorted(row[0] for row in db.execute('pragma compile_options'))
    assert options == (receipt / 'original-options.txt').read_text().splitlines()
    db.execute('create table t(id integer primary key, value text)')
    db.execute("insert into t values(1, 'roundtrip')")
    assert db.execute('select value from t').fetchone() == ('roundtrip',)
    db.execute('create virtual table f using fts5(value)')
    db.execute("insert into f values('searchable document')")
    assert db.execute("select count(*) from f where f match 'searchable'").fetchone() == (1,)
    assert db.execute('pragma integrity_check').fetchone() == ('ok',)
handle = ctypes.CDLL(str(library))
for symbol in (receipt / 'original-exports.txt').read_text().splitlines():
    getattr(handle, symbol)
subprocess.run(['/tmp/sqlite-check/check-sqlite'], check=True)
print(json.dumps({'version': sqlite3.sqlite_version, 'library': str(library), 'sha256': hashlib.sha256(library.read_bytes()).hexdigest(), 'options': options, 'python_db_fts_integrity': 'pass', 'native_session_regressions': 'pass'}))
