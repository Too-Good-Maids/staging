# Launch Checklist — Too Good Maids

**Target launch:** July 8, 2026
**Current staging URL:** `https://too-good-maids.github.io/staging/`
**Production URL:** `https://www.toogoodmaidscleaning.com`

This checklist captures the work that's intentionally deferred from staging
until the production domain is live. **Run in order on launch day.**

---

## Pre-launch (any time before July 8)

- [ ] Get Michelle's final design sign-off
- [ ] Re-host Webflow CDN `og:image` files locally — see *Note 1* below
- [ ] In **GA4 admin**, change Data Stream URL from `toogoodmaidscleaning.org` → `toogoodmaidscleaning.com` (handled in GA4 UI, not code)

---

## Launch day sequence

### 1. Configure GitHub Pages for the custom domain

```bash
echo "www.toogoodmaidscleaning.com" > CNAME
git add CNAME && git commit -m "Add custom domain" && git push
```

Then in **GitHub repo → Settings → Pages**, confirm the custom domain is set and HTTPS is enforced.

### 2. Configure DNS

Point `www.toogoodmaidscleaning.com` (CNAME) and the apex `toogoodmaidscleaning.com` (A records) at GitHub Pages per [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

Wait for DNS to propagate. Confirm with: `dig www.toogoodmaidscleaning.com`

### 3. Verify site loads at production URL

- [ ] `https://www.toogoodmaidscleaning.com/` returns the homepage
- [ ] HTTPS is enforced (no mixed content warnings)

### 4. Strip staging-only markers

Removes the `noindex,nofollow` meta tags that blocked search engines from indexing the staging site.

```bash
# preview what will change
grep -rl "STAGING-ONLY" --include="*.html" .

# remove the line on every page
find . -name "*.html" -not -path "./.git/*" -exec sed -i '' '/STAGING-ONLY/d' {} +

# verify zero matches remain
grep -r "STAGING-ONLY" --include="*.html" .
```

### 5. Convert relative paths → root-relative

Root-relative paths (`/css/foo.css`, `/about-us.html`) are unambiguous at the domain root but break on the staging subpath — which is why this is deferred to launch day.

```bash
# preview the change first
python3 scripts/launch_root_relative.py --dry-run

# apply
python3 scripts/launch_root_relative.py

# validate that every link still resolves
python3 scripts/check_links.py
```

### 6. Create `robots.txt`

```bash
cat > robots.txt <<'EOF'
User-agent: *
Allow: /
Disallow: /thank-you.html
Disallow: /404.html

Sitemap: https://www.toogoodmaidscleaning.com/sitemap.xml
EOF

git add robots.txt
```

### 7. Commit + deploy the launch changes

```bash
git add -A
git commit -m "Launch: strip staging markers, convert to root-relative, add robots.txt"
git push origin main
```

Wait ~60 seconds for GitHub Pages to redeploy.

### 8. Smoke test on the production URL

- [ ] Every page in `sitemap.xml` returns 200
- [ ] No 404s on internal links (use the link validator output from step 5)
- [ ] Submit one estimate form end-to-end; verify email arrives and Google Sheet row is added
- [ ] Test on a phone (iPhone Safari at minimum)
- [ ] Visit a page, then check GA4 Real-Time → confirm the hit registers under `toogoodmaidscleaning.com`

### 9. Submit to Google Search Console

- [ ] Verify domain ownership (GA4 verification should pre-populate it)
- [ ] Submit `https://www.toogoodmaidscleaning.com/sitemap.xml`
- [ ] Request indexing of the homepage

---

## Notes

### Note 1 — Webflow CDN `og:image` files

A handful of pages still reference og:images on Webflow's CDN
(`https://uploads-ssl.webflow.com/...`). These currently work because Webflow
hasn't taken them down, but they will break if Mel ever cancels her Webflow
subscription. To migrate before launch:

```bash
# find affected images
grep -rEho 'content="https://uploads-ssl.webflow.com/[^"]+"' --include="*.html" . | sort -u
```

For each, download the file to `images/`, then update the `og:image` and
`twitter:image` references to use the local path
(`https://www.toogoodmaidscleaning.com/images/...`).

### Note 2 — Search Console + sitemap

The current `sitemap.xml` already uses the production URLs
(`https://www.toogoodmaidscleaning.com/...`), so no change needed at launch
beyond submitting it to Search Console.

### Note 3 — Forms

Web3Forms and the Google Sheet logging via Apps Script are already wired
and tested end-to-end. No launch-day reconfiguration needed.
