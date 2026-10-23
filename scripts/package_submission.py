#!/usr/bin/env python3
"""Build credential-free source and supporting-document ZIPs with stdlib only."""
from pathlib import Path
import hashlib
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'
ROOT_FILES = {'README.md', 'CLAUDE.md', 'REQUIREMENTS.md', '.env.example', '.gitignore',
              'docker-compose.yml', 'openapi.yaml'}
SOURCE_DIRS = {'backend', 'frontend', 'db', 'docs', 'scripts'}
BLOCKED_DIRS = {'node_modules', '.git', 'dist', 'uploads', '.cache', '.vite',
                '__pycache__', 'coverage', '.playwright-mcp', '.claude', '.vscode'}
SECRET = re.compile(rb'(?:AIza[0-9A-Za-z_-]{30,}|nvapi-[0-9A-Za-z_-]{20,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----)')


def allowed(path):
    relative = path.relative_to(ROOT)
    if path.is_symlink() or not path.is_file():
        return False
    if any(part in BLOCKED_DIRS for part in relative.parts):
        return False
    if path.name.startswith('.env') and path.name != '.env.example':
        return False
    if path.suffix.lower() in {'.zip', '.log', '.pem', '.key', '.tsbuildinfo', '.pyc'}:
        return False
    return relative.parts[0] in SOURCE_DIRS or str(relative) in ROOT_FILES


def write_archive(target, paths):
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(paths):
            payload = path.read_bytes()
            if SECRET.search(payload):
                raise RuntimeError(f'Possible credential in {path.relative_to(ROOT)}; archive aborted')
            archive.writestr('LoanLens-AI/' + path.relative_to(ROOT).as_posix(), payload)
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None:
            raise RuntimeError(f'Archive integrity failed: {target.name}')
    print(f'{target.name}: {len(paths)} files, {target.stat().st_size:,} bytes; integrity PASS')


def main():
    OUT.mkdir(exist_ok=True)
    paths = [p for p in ROOT.rglob('*') if allowed(p)]
    source = [p for p in paths if not p.is_relative_to(ROOT / 'docs/archive')]
    support = [p for p in paths if p.is_relative_to(ROOT / 'docs') or p.name == 'README.md' and p.parent == ROOT]
    required = ['README.md', '.env.example', 'docker-compose.yml', 'backend/package-lock.json',
                'frontend/package-lock.json', 'backend/prisma/schema.prisma', 'backend/prisma/seed.ts',
                'db/knowledge/manifest.json', 'docs/architecture.png', 'docs/SUBMISSION.md',
                'docs/VERIFICATION.md', 'docs/TEST_PROMPTS.md', 'docs/GUARDRAILS.md']
    included = {p.relative_to(ROOT).as_posix() for p in source}
    missing = set(required) - included
    if missing:
        raise RuntimeError(f'Missing submission files: {sorted(missing)}')
    targets = [OUT / 'LoanLens-AI-submission.zip', OUT / 'LoanLens-AI-supporting-docs.zip']
    write_archive(targets[0], source)
    write_archive(targets[1], support)
    (OUT / 'SHA256SUMS.txt').write_text(''.join(
        hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name + '\n' for p in targets))


if __name__ == '__main__':
    main()
