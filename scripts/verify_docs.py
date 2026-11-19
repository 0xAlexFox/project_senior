#!/usr/bin/env python3
"""Offline checks for the repository's documentation and OpenAPI references."""

import argparse
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit


def inventory(root):
    if (root / '.git').exists():
        result = subprocess.run(
            ['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
            cwd=root, check=True, capture_output=True,
        )
        return {root / p for p in result.stdout.decode().split('\0') if p and (root / p).is_file()}
    return {p for p in root.rglob('*') if p.is_file()}


def prose(text):
    return re.sub(r'^```[^\n]*\n.*?^```[^\n]*$', '', text, flags=re.M | re.S)


def heading_anchors(text):
    seen, anchors = {}, set()
    for heading in re.findall(r'^#{1,6} (.+)$', prose(text), re.M):
        slug = re.sub(r'[^\w\- ]', '', heading.lower()).replace(' ', '-')
        count = seen.get(slug, 0)
        anchors.add(f'{slug}-{count}' if count else slug)
        seen[slug] = count + 1
    return anchors


def verify(root):
    files = inventory(root)
    markdown = sorted(p for p in files if p.suffix == '.md')
    errors, link_count, sample_count, ref_count = [], 0, 0, 0

    for path in markdown:
        relative = path.relative_to(root)
        text = path.read_text()
        if relative.parts[0] == 'docs' and path.name != 'README.md':
            pattern = (r'IT-\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md'
                       if 'history' in relative.parts else
                       r'(?:\d{2}-)?[a-z0-9]+(?:-[a-z0-9]+)*\.md')
            if not re.fullmatch(pattern, path.name):
                errors.append(f'{relative}: имя не соответствует docs/README.md')
        if len(re.findall(r'^```', text, re.M)) % 2:
            errors.append(f'{relative}: незакрытый блок кода')
        body = prose(text)
        if relative != Path('основа.md') and len(re.findall(r'^# ', body, re.M)) != 1:
            errors.append(f'{relative}: требуется один заголовок H1')
        for sample in re.findall(r'^```json\s*\n(.*?)^```', text, re.M | re.S):
            sample_count += 1
            try:
                json.loads(sample)
            except ValueError as error:
                errors.append(f'{relative}: некорректный JSON-пример: {error}')
        for destination in re.findall(r'\[[^\]\n]*\]\(([^)\n]+)\)', body):
            destination = destination.strip().strip('<>')
            uri = urlsplit(destination)
            if uri.scheme or uri.netloc:
                continue
            target = (path.parent / unquote(uri.path)).resolve() if uri.path else path
            link_count += 1
            available = target in files or (target.is_dir() and any(target in p.parents for p in files))
            if not available:
                errors.append(f'{relative}: ссылка вне переносимого комплекта: {destination}')
            elif uri.fragment and target.suffix == '.md':
                if unquote(uri.fragment) not in heading_anchors(target.read_text()):
                    errors.append(f'{relative}: нет якоря: {destination}')

    spec = (root / 'docs/01-product-requirements.md').read_text()
    acceptance = (root / 'docs/05-implementation-and-acceptance.md').read_text()
    req = re.findall(r'^\*\*REQ-(\d+)', spec, re.M)
    ac = re.findall(r'^\| AC-(\d+) \|', acceptance, re.M)
    if req != [f'{n:02d}' for n in range(1, 21)]:
        errors.append('Нарушены определения REQ-01–20')
    if ac != [f'{n:02d}' for n in range(1, 31)]:
        errors.append('Нарушены определения AC-01–30')
    tasks = sorted((root / 'docs/tasks').glob('*.md'))
    task_ids = [re.search(r'^# TASK-(\d+)\.', p.read_text()) for p in tasks]
    if [m.group(1) if m else None for m in task_ids] != [f'{n:02d}' for n in range(7)]:
        errors.append('Нарушены определения TASK-00–06')

    for path in sorted(p for p in files if p.suffix == '.json'):
        try:
            document = json.loads(path.read_text())
        except ValueError as error:
            errors.append(f'{path.relative_to(root)}: JSON: {error}')
            continue

        def walk(value):
            nonlocal ref_count
            if isinstance(value, dict):
                ref = value.get('$ref')
                if isinstance(ref, str) and ref.startswith('#/'):
                    ref_count += 1
                    current = document
                    try:
                        for key in unquote(ref[2:]).split('/'):
                            key = key.replace('~1', '/').replace('~0', '~')
                            current = current[int(key)] if isinstance(current, list) else current[key]
                    except (KeyError, IndexError, ValueError, TypeError):
                        errors.append(f'{path.relative_to(root)}: отсутствует $ref {ref}')
                for child in value.values():
                    walk(child)
            elif isinstance(value, list):
                for child in value:
                    walk(child)
        walk(document)

    api = json.loads((root / 'api/openapi.json').read_text())
    api_doc = (root / 'docs/03-api.md').read_text().split('## 2. Внешние endpoints')[1].split('## 3.')[0]
    documented = {(method.lower(), path) for method, path in
                  re.findall(r'^\| `(GET|POST|PUT|PATCH|DELETE) ([^`]+)` \|', api_doc, re.M)}
    contracted = {(method, path) for path, item in api['paths'].items()
                  for method in item if method in ('get', 'post', 'put', 'patch', 'delete')}
    if documented != contracted:
        errors.append('Таблица внешних endpoints не совпадает с OpenAPI')

    print(f'Markdown: {len(markdown)}; локальных ссылок/якорей: {link_count}; JSON-примеров: {sample_count}; $ref: {ref_count}.')
    print('Проверены имена docs, REQ-01–20, AC-01–30, TASK-00–06 и внешние endpoints.')
    for error in errors:
        print(f'FAIL: {error}')
    print('FAIL' if errors else 'PASS. Pixso, внешние URL и приложение этой командой не проверяются.')
    return bool(errors)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    raise SystemExit(verify(parser.parse_args().root.resolve()))
