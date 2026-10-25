"""Exercise the patched universal pip clients, including pip's actual cache format."""
import http.server
import io
import json
from pathlib import Path
import threading
import pip._vendor
import pip._vendor.msgpack as msgpack
import pip._vendor.urllib3 as urllib3
from pip._vendor.requests import Request, Session
from pip._vendor.cachecontrol.serialize import Serializer

assert urllib3.__version__ == '2.8.0'
assert msgpack.__version__ == '1.2.1'
assert msgpack.Packer.__module__ == 'pip._vendor.msgpack.fallback'
value = {'text': 'round trip', 'value': [1, 2, 3]}
assert msgpack.loads(msgpack.dumps(value, use_bin_type=True), raw=False) == value
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'fixture')
    def log_message(self, *args):
        pass
server = http.server.HTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    response = urllib3.HTTPConnectionPool('127.0.0.1', server.server_port).request('GET', '/')
    assert response.status == 200 and response.data == b'fixture'
    with Session() as session:
        session.trust_env = False
        response = session.get('http://127.0.0.1:' + str(server.server_port) + '/', timeout=5)
        assert response.status_code == 200 and response.content == b'fixture'
finally:
    server.shutdown()
    server.server_close()
request = Request('GET', 'http://example.invalid/fixture').prepare()
response = urllib3.HTTPResponse(body=io.BytesIO(b'cached fixture'), headers={'ETag': 'fixture'}, status=200, version=11, reason='OK', preload_content=False)
serializer = Serializer()
cached = serializer.dumps(request, response, body=b'cached fixture')
assert serializer.loads(request, cached).read() == b'cached fixture'
bom = json.loads((Path(pip._vendor.__file__).parent / 'bom.cdx.json').read_text())
for name, version in [('urllib3', '2.8.0'), ('msgpack', '1.2.1')]:
    components = [c for c in bom['components'] if c['name'] == name]
    assert len(components) == 1 and components[0]['version'] == version
print('Patched pip pure-Python vendors, actual HTTP clients and CacheControl serialization passed')
