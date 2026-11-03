"""Serve this project's static files, choosing an available local port."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

parser=argparse.ArgumentParser(description='Run the Human Tetris locally')
parser.add_argument('--port',type=int,default=8094)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
handler=partial(SimpleHTTPRequestHandler,directory=str(root))
for port in range(args.port,min(args.port+20,65536)):
    try:
        server=ThreadingHTTPServer(('127.0.0.1',port),handler)
        break
    except OSError as error:
        if error.errno not in {48,98,10048}: raise
else:
    raise SystemExit('No available port found. Try --port 9000.')
print(f'\nHuman Tetris is ready: http://127.0.0.1:{port}/\nKeep this terminal open. Control+C stops the server.\n',flush=True)
try:server.serve_forever()
except KeyboardInterrupt:print('\nServer stopped.')
finally:server.server_close()
