#!/usr/bin/env python3
"""Validate every href/src in every HTML file resolves to an existing target."""
import os, re, sys
from pathlib import Path

ROOT = Path("/Users/bluedobiedev/Documents/Client FIles/too good maids/staging")
ATTR_RE = re.compile(r'(?:href|src)="([^"]+)"', re.IGNORECASE)
SKIP_PROTO = re.compile(r'^(https?:|mailto:|tel:|javascript:|data:|#)', re.IGNORECASE)

broken = []
external_anchors_to_check = []  # links with #anchor — need to verify the anchor exists on target

for html_file in sorted(ROOT.rglob("*.html")):
    if ".git" in html_file.parts: continue
    rel_file = html_file.relative_to(ROOT)
    file_dir = html_file.parent
    contents = html_file.read_text(encoding="utf-8", errors="replace")
    for raw in ATTR_RE.findall(contents):
        if SKIP_PROTO.match(raw):
            continue
        # split off fragment + query
        path_part = raw.split("#")[0].split("?")[0]
        anchor_part = raw.split("#")[1] if "#" in raw else None
        if not path_part:
            # pure anchor link (#foo) — check anchor exists in CURRENT file
            if anchor_part and f'id="{anchor_part}"' not in contents and f"name='{anchor_part}'" not in contents and f'name="{anchor_part}"' not in contents:
                broken.append((str(rel_file), raw, f"anchor #{anchor_part} not found in same page"))
            continue
        # resolve
        if path_part.startswith("/"):
            target = ROOT / path_part.lstrip("/")
        else:
            target = (file_dir / path_part).resolve()
        if not target.exists():
            broken.append((str(rel_file), raw, "target file does not exist"))
            continue
        # if there's an anchor, verify it exists in the target
        if anchor_part and target.suffix == ".html":
            tgt_contents = target.read_text(encoding="utf-8", errors="replace")
            if f'id="{anchor_part}"' not in tgt_contents and f"name='{anchor_part}'" not in tgt_contents and f'name="{anchor_part}"' not in tgt_contents:
                broken.append((str(rel_file), raw, f"anchor #{anchor_part} not found in {target.relative_to(ROOT)}"))

# also check onclick="location.href='...'"
ONCLICK_RE = re.compile(r"""onclick\s*=\s*["']\s*(?:window\.)?location\.href\s*=\s*['"]([^'"]+)['"]""", re.IGNORECASE)
for html_file in sorted(ROOT.rglob("*.html")):
    if ".git" in html_file.parts: continue
    rel_file = html_file.relative_to(ROOT)
    file_dir = html_file.parent
    contents = html_file.read_text(encoding="utf-8", errors="replace")
    for raw in ONCLICK_RE.findall(contents):
        if SKIP_PROTO.match(raw): continue
        path_part = raw.split("#")[0].split("?")[0]
        if not path_part: continue
        if path_part.startswith("/"):
            target = ROOT / path_part.lstrip("/")
        else:
            target = (file_dir / path_part).resolve()
        if not target.exists():
            broken.append((str(rel_file), raw, "onclick target does not exist"))

if broken:
    print(f"BROKEN LINKS: {len(broken)}\n")
    for f, link, reason in broken:
        print(f"  {f:55s} → {link}   [{reason}]")
else:
    print("✓ All internal links resolve.")
