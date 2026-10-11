Social cards: local review, October 11, 2026

Run python3 scripts/social-cards/render.py from any directory on macOS.
Requires Pillow. Uses existing site imagery and brand fonts. Supporting text
uses the macOS Arial font; do not redistribute that system font.
The cards.json manifest records each canonical URL, existing SEO copy, image,
headline and alt text. Images are exactly 1200 x 630.

Consent: js/privacy-choices.js and css/privacy-choices.css implement optional
analytics, explicit choices, persistence, keyboard reopening and withdrawal
via page reload. No vendor script loads without analytics permission.
Do not restore old unconditional analytics snippets during a re-export.
Arlo additionally gates remote reel images/feed updates as external content.
Jekyll sites retain production-only analytics; the static TGM site relies on
explicit consent. Do not accept analytics while previewing with real IDs unless
real test traffic is intended. Unit tests use a DOM without network resources.

Privacy copy is a source-grounded website notice. Account settings, provider
retention, server-side access, historical processing and any edge injection
require owner verification before publication. No legal compliance guarantee.
