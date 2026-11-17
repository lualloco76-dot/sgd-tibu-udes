"""Readiness only: never starts a scan, downloads a sandbox or contacts an LLM."""
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
executable = ROOT / '.test-tools/strix' / ('Scripts/strix.exe' if os.name == 'nt' else 'bin/strix')
cli = str(executable) if executable.is_file() else shutil.which('strix')
docker = shutil.which('docker')
version = subprocess.run([cli, '--version'], capture_output=True, text=True).stdout.strip() if cli else None
running = False
if docker:
    running = subprocess.run([docker, 'info'], capture_output=True, timeout=20).returncode == 0
report = {'strix_version': version, 'docker_installed': bool(docker), 'docker_running': running,
          'llm_configured': bool(os.environ.get('STRIX_LLM') and os.environ.get('LLM_API_KEY')),
          'scan_executed': False, 'paid_usage_authorized': False, 'cost_usd': 0,
          'reason': 'Usuario solicita preparación sin consumo; Docker y LLM pendientes.'}
out = ROOT / '.test-artifacts/strix-preflight.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
