"""Prove durability across real API and private PostgreSQL server restarts."""
from contextlib import contextmanager
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import httpx
from qa import ROOT, PRIVATE, config, pg, setup

values = config()
BASE = 'http://127.0.0.1:8766'


@contextmanager
def server():
    env = {**os.environ, 'QA_PORT': '8766'}
    with (PRIVATE / 'persistence-server.log').open('a') as log:
        child = subprocess.Popen([sys.executable, str(ROOT / 'scripts/qa.py'), 'serve'], cwd=ROOT,
                                 env=env, stdout=log, stderr=log)
        try:
            for _ in range(100):
                if child.poll() is not None:
                    raise RuntimeError('El servidor de persistencia no inició')
                try:
                    if httpx.get(BASE + '/health', timeout=1, trust_env=False).status_code == 200:
                        break
                except httpx.HTTPError:
                    pass
                time.sleep(0.1)
            else:
                raise RuntimeError('Tiempo de espera de salud agotado')
            yield
        finally:
            child.terminate()
            child.wait(timeout=15)


def login(client):
    response = client.post('/api/auth/login', json={'email': 'secretario_parroquial@evaluacion.example.org',
                          'password': values['QA_PASSWORD'], 'parroquia_id': 1})
    response.raise_for_status()
    return {'Authorization': 'Bearer ' + response.json()['access_token']}


def main():
    with httpx.Client(base_url=BASE, trust_env=False) as client:
        with server():
            headers = login(client)
            people = client.get('/api/personas/', headers=headers).json()
            sacraments = client.get('/api/sacramentos/', headers=headers).json()
            marker = 'PERSISTENCIA-' + str(time.time_ns())
            payload = {'persona_id': people[0]['id'], 'sacramento_id': sacraments[0]['id'],
                       'parroquia_id': people[0]['parroquia_id'], 'fecha_celebracion': '2020-01-10',
                       'libro': 'EVAL-1', 'folio': 'PERSISTENCIA', 'numero': marker, 'datos': {}}
            created = client.post('/api/registros/', headers=headers, json=payload)
            created.raise_for_status()
            record_id = created.json()['id']
            client.post('/api/auth/logout', headers=headers).raise_for_status()
            assert client.get('/api/auth/me', headers=headers).status_code == 401
        pg('pg_ctl', '-D', PRIVATE / 'postgres', '-w', 'stop')
        setup()
        with server():
            headers = login(client)
            response = client.get('/api/registros/', headers=headers, params={'numero': marker})
            response.raise_for_status()
            rows = response.json()
            assert len(rows) == 1 and rows[0]['id'] == record_id
            assert all(rows[0][key] == value for key, value in payload.items())
            assert client.get('/api/registros/' + str(record_id) + '/historial', headers=headers).status_code == 200
    evidence = {'database': 'sgd_evaluacion', 'driver': 'postgresql', 'original_database_accessed': False,
                'logout_revokes_session': True, 'api_restarted': True, 'postgresql_restarted': True,
                'record_persisted': True, 'fields_match': True, 'record_id': record_id}
    out = ROOT / '.test-artifacts/qa-persistence.json'
    out.write_text(json.dumps(evidence, indent=2), encoding='utf-8')
    print(json.dumps(evidence))


if __name__ == '__main__':
    main()
