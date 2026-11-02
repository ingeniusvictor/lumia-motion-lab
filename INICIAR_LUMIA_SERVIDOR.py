#!/usr/bin/env python3
"""Servidor local de L.U.M.I.A.; evita abrir el navegador antes del bind."""
import argparse
import errno
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import webbrowser

ROOT = Path(__file__).resolve().parent

class LumiaHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

class LumiaHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    parser = argparse.ArgumentParser(description='L.U.M.I.A. Motion R8 - Conversacion natural y compositor - servidor local')
    parser.add_argument('--no-browser', action='store_true', help='No abrir navegador (diagnostico)')
    parser.add_argument('--port', type=int, default=8787, help='Puerto inicial (predeterminado 8787)')
    args = parser.parse_args()
    if not (1 <= args.port <= 65525):
        parser.error('El puerto inicial debe estar entre 1 y 65525')

    httpd = None
    for port in range(args.port, args.port + 11):
        try:
            httpd = LumiaHTTPServer(('127.0.0.1', port), LumiaHTTPRequestHandler)
            break
        except OSError as e:
            # Windows WSAEADDRINUSE = 10048; Unix EADDRINUSE = 98.
            if e.errno in (errno.EADDRINUSE, 10048):
                print(f'Puerto {port} en uso, probando el siguiente...', flush=True)
                continue
            print(f'ERROR iniciando servidor en 127.0.0.1:{port}: {e}', file=sys.stderr, flush=True)
            return 1
    if httpd is None:
        print('ERROR: los 11 puertos consecutivos estan ocupados. Cierra otros visores o usa --port 8800.', file=sys.stderr, flush=True)
        return 2

    port = httpd.server_port
    url = f'http://127.0.0.1:{port}/'
    print('============================================================', flush=True)
    print('  L.U.M.I.A. MOTION v0.8.5 R8  |  SERVIDOR ACTIVO', flush=True)
    print('============================================================', flush=True)
    print(f'Directorio: {ROOT}', flush=True)
    print(f'Abre exactamente esta direccion: {url}', flush=True)
    print('El navegador se abre DESPUES de iniciar el servidor.', flush=True)
    print('Mantén abierta esta ventana. Pulsa Ctrl+C para detener.', flush=True)
    print('============================================================', flush=True)
    try:
        if not args.no_browser:
            try:
                if not webbrowser.open(url):
                    print('El navegador no se abrio automaticamente; copia la direccion de arriba.', flush=True)
            except Exception as e:
                print(f'No se pudo abrir el navegador automaticamente: {e}', flush=True)
        httpd.serve_forever(poll_interval=0.2)
    except KeyboardInterrupt:
        print('\nServidor detenido por el usuario.', flush=True)
    finally:
        httpd.server_close()
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
