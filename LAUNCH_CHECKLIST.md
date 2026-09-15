# Launch Checklist — Too Good Maids

**Staging URL:** `https://too-good-maids.github.io/staging/`
**Production URL:** `https://www.toogoodmaidscleaning.com`
**DNS lives in:** Hostinger (nameservers `ns1/ns2.dns-parking.com`)
**Currently live on the domain:** the old Webflow site

All launch-day *code* changes are already prepared on the `launch` branch
(CNAME, noindex tags stripped, root-relative paths, robots.txt, sitemap
lastmod). Launch day is: **DNS → merge `launch` → verify → Search Console.**

---

## Pre-launch (done ✅ / still open ☐)

- [x] Re-host Webflow CDN `og:image` files locally (commit `65e40af`)
- [x] Dedupe GA4 tag on `index.html` — now `G-5Z85WWSYVK` everywhere
- [x] Staging Pages deploy green (had been failing since 2026-07-06)
- [x] Michelle's final design sign-off (2026-09-15)
- [x] GA4 already configured for the `.com` stream — no admin change needed
- [x] `G-5Z85WWSYVK` confirmed as Michelle's GA4 property; `G-3XPBT7BZ10` removed

---

## Launch day sequence

### 1. Change DNS in Hostinger

In Hostinger → Domains → `toogoodmaidscleaning.com` → DNS / Name Servers:

| Type  | Name  | Value                                | Action |
|-------|-------|--------------------------------------|--------|
| CNAME | `www` | `too-good-maids.github.io`           | **replace** `proxy-ssl.webflow.com` |
| A     | `@`   | `185.199.108.153`                    | add |
| A     | `@`   | `185.199.109.153`                    | add |
| A     | `@`   | `185.199.110.153`                    | add |
| A     | `@`   | `185.199.111.153`                    | add |
| A     | `@`   | `99.83.190.102`, `75.2.70.75`        | **delete** (Webflow) |

Keep TTL low (300) if offered. Confirm:

```bash
dig +short www.toogoodmaidscleaning.com CNAME
dig +short toogoodmaidscleaning.com A
```

Expect `too-good-maids.github.io.` and the four `185.199.*` addresses. Propagation is usually minutes with Hostinger, occasionally up to an hour.

### 2. Merge the `launch` branch

```bash
git checkout main && git pull && git merge launch && git push origin main
```

(Or open a PR from `launch` → `main` on GitHub and merge it.)

Then in **GitHub → Settings → Pages**: the custom domain should show
`www.toogoodmaidscleaning.com` (picked up from the `CNAME` file). Wait for the
DNS check to pass, then tick **Enforce HTTPS**. The certificate can take
5–30 min after DNS resolves.

Watch the deploy:

```bash
gh run list -R Too-Good-Maids/staging -L 1
```

### 3. Verify the production URL

- [ ] `https://www.toogoodmaidscleaning.com/` loads the new site (not Webflow)
- [ ] `https://toogoodmaidscleaning.com/` redirects to `www`
- [ ] Padlock / HTTPS enforced, no mixed-content warnings
- [ ] `https://www.toogoodmaidscleaning.com/robots.txt` returns the file
- [ ] `https://www.toogoodmaidscleaning.com/sitemap.xml` returns the file
- [ ] View source on the homepage: **no** `<meta name="robots" content="noindex…">`

Quick script — every sitemap URL should return 200:

```bash
grep -oE '<loc>[^<]+</loc>' sitemap.xml | sed 's/<\/\?loc>//g' | while read u; do printf "%s  %s\n" "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"; done
```

### 4. Smoke test

- [ ] Submit one estimate form end-to-end; verify email arrives and Google Sheet row is added
- [ ] Test on a phone (iPhone Safari at minimum)
- [ ] Visit a page, then check GA4 Real-Time → hit registers under `toogoodmaidscleaning.com`

### 5. Google Search Console

- [ ] Open the existing property for `toogoodmaidscleaning.com` (should still be verified)
- [ ] Sitemaps → resubmit `https://www.toogoodmaidscleaning.com/sitemap.xml`
- [ ] URL Inspection → `https://www.toogoodmaidscleaning.com/` → **Request indexing**
- [ ] Optionally also request indexing for the three `services/` pages

### 6. After launch

- [ ] Wait 24–48 h, then confirm Search Console shows pages as indexed
- [ ] Once confident, unpublish / cancel the Webflow site (no assets depend on it any more)
- [ ] Delete the `launch` branch

---

## Notes

### Extensionless URLs
`sitemap.xml`, canonicals and JSON-LD all use extensionless URLs
(`/about-us`) which match the old Webflow URLs, so existing rankings carry
over with no redirects. GitHub Pages serves both `/about-us` and
`/about-us.html`; internal links use the `.html` form and the canonical
tag consolidates them.

### Forms
Web3Forms and the Google Sheet logging via Apps Script are already wired
and tested end-to-end. No launch-day reconfiguration needed.

### If something goes wrong
Revert DNS in Hostinger to the Webflow values above and the old site is
back within minutes. Nothing on the Webflow side is touched by this launch.
