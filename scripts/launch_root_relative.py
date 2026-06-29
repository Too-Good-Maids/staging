#!/usr/bin/env python3
"""
Convert all internal HTML paths from relative → root-relative.

WHY: When the site moves from the staging subpath (too-good-maids.github.io/staging/)
to its production domain root (toogoodmaidscleaning.com/), root-relative paths
like /css/foo.css and /about-us.html are unambiguous and don't depend on the
viewing file's depth. Relative paths (../images/x.png) work in both, but
root-relative paths are cleaner and harder to break by moving files.

WHEN TO RUN: On launch day, AFTER DNS has cut over to the production domain.
Running this against the staging subpath would break every link, so this is
explicitly NOT for staging.

USAGE:
    python3 scripts/launch_root_relative.py --dry-run   # preview changes
    python3 scripts/launch_root_relative.py             # apply

Handles:
    href="X"        # links
    src="X"         # images, scripts
    srcset="X w, Y w, ..."  # responsive images
    onclick="location.href='X'" or window.location.href='X'

Skips:
    http://, https://, mailto:, tel:, javascript:, data:, #anchor
    paths that already start with /
"""
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SKIP_PROTO = re.compile(r'^(https?:|mailto:|tel:|javascript:|data:|#)', re.IGNORECASE)

def to_root_relative(path: str, file_dir: Path) -> str:
    """Resolve a path from `file_dir` to a /-prefixed root-relative path."""
    if not path: return path
    if SKIP_PROTO.match(path): return path
    if path.startswith('/'): return path  # already root-relative
    # split off fragment + query so we can reattach
    fragment = ''
    if '#' in path:
        path, fragment = path.split('#', 1); fragment = '#' + fragment
    query = ''
    if '?' in path:
        path, query = path.split('?', 1); query = '?' + query
    # resolve relative to file's directory
    try:
        resolved = (file_dir / path).resolve()
        rel_to_root = resolved.relative_to(ROOT)
    except (ValueError, OSError):
        return path + query + fragment  # can't resolve — leave alone
    return '/' + str(rel_to_root) + query + fragment

ATTR_RE = re.compile(r'\b(href|src)="([^"]*)"', re.IGNORECASE)
SRCSET_RE = re.compile(r'\bsrcset="([^"]*)"', re.IGNORECASE)
ONCLICK_RE = re.compile(r"""(onclick\s*=\s*["'][^"']*location\.href\s*=\s*['"])([^'"]+)(['"])""", re.IGNORECASE)

def rewrite_srcset(srcset: str, file_dir: Path) -> str:
    """A srcset value is `url1 desc1, url2 desc2, ...`. Convert each url."""
    parts = []
    for chunk in srcset.split(','):
        chunk = chunk.strip()
        if not chunk: continue
        # url may be followed by space + descriptor (like "500w" or "2x")
        bits = chunk.split(None, 1)
        url = bits[0]
        desc = ' ' + bits[1] if len(bits) > 1 else ''
        parts.append(to_root_relative(url, file_dir) + desc)
    return ', '.join(parts)

def process(content: str, file_dir: Path) -> tuple[str, int]:
    changes = 0
    def attr_sub(m):
        nonlocal changes
        attr, val = m.group(1), m.group(2)
        new_val = to_root_relative(val, file_dir)
        if new_val != val:
            changes += 1
            return f'{attr}="{new_val}"'
        return m.group(0)
    content = ATTR_RE.sub(attr_sub, content)
    def srcset_sub(m):
        nonlocal changes
        new_val = rewrite_srcset(m.group(1), file_dir)
        if new_val != m.group(1):
            changes += 1
            return f'srcset="{new_val}"'
        return m.group(0)
    content = SRCSET_RE.sub(srcset_sub, content)
    def onclick_sub(m):
        nonlocal changes
        new_val = to_root_relative(m.group(2), file_dir)
        if new_val != m.group(2):
            changes += 1
            return f'{m.group(1)}{new_val}{m.group(3)}'
        return m.group(0)
    content = ONCLICK_RE.sub(onclick_sub, content)
    return content, changes

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    total_files_changed = 0
    total_paths_changed = 0
    for f in sorted(ROOT.rglob('*.html')):
        if '.git' in f.parts: continue
        if 'scripts' in f.parts: continue  # skip this script's own dir
        content = f.read_text(encoding='utf-8', errors='replace')
        new_content, n = process(content, f.parent)
        if n:
            total_files_changed += 1
            total_paths_changed += n
            rel = f.relative_to(ROOT)
            print(f'  {str(rel):55s} {n:>4d} paths')
            if not args.dry_run:
                f.write_text(new_content, encoding='utf-8')

    mode = 'DRY-RUN' if args.dry_run else 'APPLIED'
    print(f'\n[{mode}] {total_files_changed} files would change, {total_paths_changed} paths to convert')

if __name__ == '__main__':
    main()
