#!/usr/bin/env python3
"""Verify the current public dataset and its review source without network access."""
import hashlib
import json
from pathlib import Path
import re
import sys
import tarfile
import zipfile


def verify(folder, extracted=None):
    manifest = json.loads((folder / 'manifest.json').read_text())
    if manifest['format'] != 'tensor-current-review-package' or manifest['manifestVersion'] != 1:
        raise ValueError('Unexpected current review manifest')
    if not re.fullmatch('[0-9a-f]{40}', manifest['sourceCommit']):
        raise ValueError('Expected exact source commit')
    pins = {item['path']: item for item in manifest['files']}
    if len(pins) != len(manifest['files']):
        raise ValueError('Duplicate source path')
    for name in pins:
        if not name or name.startswith('/') or '\\' in name or any(p in ('', '.', '..') for p in name.split('/')):
            raise ValueError('Unsafe source path')

    def check(data, item, name):
        if len(data) != item['bytes'] or hashlib.sha256(data).hexdigest() != item['sha256']:
            raise ValueError(f'Byte pin differs: {name}')
    archive = manifest['archive']
    if archive['path'] != 'source.tar.gz':
        raise ValueError('Unexpected source archive path')
    check((folder / archive['path']).read_bytes(), archive, archive['path'])
    seen = set()
    dataset = None
    with tarfile.open(folder / archive['path']) as source:
        for member in source:
            if member.isdir():
                continue
            if not member.isfile() or member.name not in pins or member.name in seen:
                raise ValueError(f'Unexpected source member: {member.name}')
            raw = source.extractfile(member).read()
            check(raw, pins[member.name], member.name)
            if member.name == 'dataset/current.json':
                dataset = json.loads(raw)
            seen.add(member.name)
    if seen != set(pins):
        raise ValueError('Source member inventory differs')
    if dataset is None:
        raise ValueError('Current dataset is missing from the source')
    check((folder / 'dataset.json').read_bytes(), pins['dataset/current.json'], 'dataset.json')
    if dataset['id'] != manifest['dataset']['id'] or dataset['counts'] != manifest['dataset']['counts']:
        raise ValueError('Review and current dataset disagree')
    for item in dataset['files']:
        pin = pins.get(item['source'])
        if not pin or any(pin[k] != item[k] for k in ('sha256','bytes')):
            raise ValueError(f'Dataset source pin differs: {item["source"]}')
    if extracted:
        root = Path(extracted).resolve(strict=True)
        for name, item in pins.items():
            candidate = root / name
            if candidate.is_symlink() or not candidate.resolve(strict=True).is_relative_to(root):
                raise ValueError(f'Unsafe extracted source: {name}')
            check(candidate.read_bytes(), item, name)
    bundle = folder / 'review-package.zip'
    if bundle.exists():
        expected = {p.name:p for p in folder.iterdir() if p.is_file() and p.name != bundle.name}
        with zipfile.ZipFile(bundle) as zipped:
            if len(zipped.namelist()) != len(expected) or set(zipped.namelist()) != set(expected):
                raise ValueError('Review ZIP inventory differs')
            for name, file in expected.items():
                if zipped.read(name) != file.read_bytes():
                    raise ValueError(f'Review ZIP file differs: {name}')
    return manifest


if __name__ == '__main__':
    folder = Path(__file__).resolve().parent
    if folder.name == 'scripts':
        folder = folder.parent / 'review/current'
    try:
        if len(sys.argv) > 2:
            raise ValueError('Usage: python3 verify-snapshot.py [extracted-source-directory]')
        result = verify(folder, sys.argv[1] if len(sys.argv) == 2 else None)
        print(f'Verified current dataset: {result["dataset"]["counts"]["questions"]} questions, {result["dataset"]["counts"]["routes"]} routes; {len(result["files"])} source pins; commit {result["sourceCommit"]}')
    except (OSError, ValueError, KeyError, tarfile.TarError, zipfile.BadZipFile) as error:
        sys.exit(f'Current review verification failed: {error}')
