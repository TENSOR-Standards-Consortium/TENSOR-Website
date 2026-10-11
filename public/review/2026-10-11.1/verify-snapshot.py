#!/usr/bin/env python3
"""Verify frozen source bytes without extraction, fetching, or execution."""
import hashlib
import json
import pathlib
import sys
import tarfile


def verify():
    folder = pathlib.Path(__file__).resolve().parent
    manifest = json.loads((folder / 'manifest.json').read_text())
    if (manifest['format'], manifest['manifestVersion'], manifest['reviewId'], manifest['sourceCommit']) != ('tensor-institutional-review-snapshot', 1, '2026-10-11.1', 'c82cd1c540b2ca6fbf5ba7ee3e38edcd2e1e6f8f'):
        raise ValueError('Unexpected snapshot identity')
    expected = {}
    for item in manifest['files']:
        name = item['path']
        if not name or name.startswith('/') or '\\' in name or any(part in ('', '.', '..') for part in name.split('/')) or name in expected:
            raise ValueError('Invalid or duplicate source path')
        expected[name] = item
    archive = manifest['archive']
    if archive['path'] != 'source.tar.gz':
        raise ValueError('Unexpected archive path')

    def check(data, item, name):
        if len(data) != item['bytes'] or hashlib.sha256(data).hexdigest() != item['sha256']:
            raise ValueError(f'Byte pin mismatch: {name}')

    check((folder / archive['path']).read_bytes(), archive, archive['path'])
    seen = set()
    with tarfile.open(folder / archive['path'], 'r:gz') as source:
        for member in source:
            if member.isdir():
                continue
            if not member.isfile() or member.name not in expected or member.name in seen:
                raise ValueError(f'Unexpected archive member: {member.name}')
            check(source.extractfile(member).read(), expected[member.name], member.name)
            seen.add(member.name)
    if seen != set(expected):
        raise ValueError('Archive file inventory differs from manifest')
    if len(sys.argv) > 2:
        raise ValueError('Usage: python3 verify-snapshot.py [extracted-source-directory]')
    if len(sys.argv) == 2:
        root = pathlib.Path(sys.argv[1]).resolve(strict=True)
        for name, item in expected.items():
            candidate = root / name
            if candidate.is_symlink() or not candidate.resolve(strict=True).is_relative_to(root):
                raise ValueError(f'Unsafe extracted source path: {name}')
            check(candidate.read_bytes(), item, name)
    print(f"Verified review {manifest['reviewId']}: archive and {len(expected)} source files; commit {manifest['sourceCommit']}")


if __name__ == '__main__':
    try:
        verify()
    except (OSError, ValueError, KeyError, tarfile.TarError) as error:
        sys.exit(f'Snapshot verification failed: {error}')
