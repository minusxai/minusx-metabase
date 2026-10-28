"""Report the concrete notebook XML runtime and check its Python reader boundary."""
import json
import importlib
import platform
import struct
from pathlib import Path
import sys
import pyexpat

runtime_modules = ["ssl", "sqlite3", "bz2", "lzma", "ctypes", "readline", "tkinter", "uuid", "dbm.gnu", "dbm.ndbm"]
for module in runtime_modules:
    importlib.import_module(module)

parser = pyexpat.ParserCreate()
elements = []
parser.StartElementHandler = lambda name, attrs: elements.append(name)
parser.Parse(b"<root><child/></root>", True)
assert elements == ["root", "child"]


class OverlongReader:
    def read(self, requested):
        return b"x" * (requested + 1)


try:
    pyexpat.ParserCreate().ParseFile(OverlongReader())
except ValueError as error:
    rejection = str(error)
    assert "read() returned too much data" in rejection, rejection
else:
    raise AssertionError("ParseFile accepted a reader exceeding its requested capacity")

pointer_bits = struct.calcsize("P") * 8
assert pointer_bits == 64, "This runtime proof is scoped to a 64-bit notebook image"
loaded_libraries = sorted({line.split()[-1] for line in Path("/proc/self/maps").read_text().splitlines()
                           if any(name in line for name in ("pyexpat", "libexpat", "libpython"))})
assert sys.version_info[:3] == (3, 13, 18), sys.version
assert pyexpat.EXPAT_VERSION == "expat_2.9.0", pyexpat.EXPAT_VERSION
assert any(path.startswith("/usr/lib/libexpat.so.1") for path in loaded_libraries), loaded_libraries
print(json.dumps({
    "python": sys.version.split()[0],
    "expat": pyexpat.EXPAT_VERSION,
    "machine": platform.machine(),
    "pointer_bits": pointer_bits,
    "module": getattr(pyexpat, "__file__", "built into interpreter"),
    "loaded_libraries": loaded_libraries,
    "normal_parse": "pass",
    "standard_library_imports": runtime_modules,
    "overlong_reader_rejection": rejection,
    "scope": "Concrete image architecture and reviewed Python interface only; no blanket Expat or native caller clearance.",
}, sort_keys=True))
