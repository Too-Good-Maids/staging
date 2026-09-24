#!/usr/bin/env python3
"""
Rewrite internal links to match each page's canonical URL.

WHY: canonicals, sitemap.xml and the old Webflow URLs are all extensionless
(/about-us), but every internal href pointed at /about-us.html. Ahrefs flagged
17 pages as "no inlinks to canonical address" — link equity was flowing to a
URL that canonicalises elsewhere. GitHub Pages serves both spellings, so this
is purely about pointing links at the canonical one.

    href="/about-us.html"           -> href="/about-us"
    href="/index.html"              -> href="/"
    href="/about-us-home.html#x"    -> href="/about-us-home#x"

Leaves alone: external URLs, assets (css/js/images/fonts), 404.html (GitHub
Pages needs that filename), and anything already extensionless.

USAGE: python3 scripts/canonical_links.py [--dry-run]
"""
import argparse, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# /path.html  ->  /path   (optionally followed by #anchor or ?query)
LINK_RE = re.compile(r'''(?P<attr>(?:location\.)?href\s*=\s*)(?P<q>["'])(?P<path>/[^"'#?]*?)\.html(?P<rest>[^"']*)(?P=q)''')

def repl(m):
    path = m.group('path')
    if path == '/404':           # GitHub Pages requires the literal 404.html
        return m.group(0)
    if path == '/index':
        path = ''                # /index.html -> /
    new = path + m.group('rest')
    if not new:
        new = '/'
    return f"{m.group('attr')}{m.group('q')}{new}{m.group('q')}"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    files = changed = 0
    for f in sorted(ROOT.rglob('*.html')):
        if '.git' in f.parts:
            continue
        src = f.read_text(encoding='utf-8', errors='replace')
        out, n = LINK_RE.subn(repl, src)
        if n:
            files += 1
            changed += n
            print(f'  {str(f.relative_to(ROOT)):55s} {n:>4d} links')
            if not args.dry_run:
                f.write_text(out, encoding='utf-8')
    mode = 'DRY-RUN' if args.dry_run else 'APPLIED'
    print(f'\n[{mode}] {files} files, {changed} links')

if __name__ == '__main__':
    main()
