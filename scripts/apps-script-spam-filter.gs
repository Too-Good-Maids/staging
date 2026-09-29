/**
 * TGM Form Processing - hardened doPost.
 *
 * Replaces the existing doPost() in the "TGM Form Processing" Apps Script
 * (bound to the "TGM Contact Form Info" sheet). Paste over the old function,
 * keep doGet() as it is, then Deploy > Manage deployments > edit the existing
 * deployment > Version: New > Deploy. Keep the SAME deployment so the URL in
 * the site doesn't change.
 *
 * WHY: the old doPost wrote every POST it received straight to the sheet - no
 * honeypot check, no validation. The endpoint URL is visible in the page
 * source, so bots were posting to it directly, three times a second in places.
 *
 * Rejected submissions are written to a "Blocked" tab with the reason instead
 * of being thrown away, so you can audit for false positives. Check it
 * occasionally for a week or two; if a real lead lands there, tell me which
 * rule caught it and I'll loosen that rule.
 */

// The tab good leads are written to. Named explicitly rather than trusting
// getActiveSheet(), which is ambiguous now that the workbook has three tabs
// and would put leads in the wrong one if it ever resolved to Blocked.
var LEADS_SHEET = 'Success';

// Where lead notifications go.
var NOTIFY_TO = 'toogoodmaidscs@gmail.com';

// Flip to true only AFTER the site is deployed with the matching hidden token
// field. Until then a required token would reject every real submission.
var REQUIRE_TOKEN = false;
var FORM_TOKEN = 'tgm-2026-kuttawa';

// Cloudflare Turnstile. Paste the SECRET key from the Turnstile dashboard
// below (the site key is public and already lives in the page; the secret
// belongs only here). Then flip REQUIRE_TURNSTILE to true - but not before
// the site is live with the widget, or every real submission is rejected.
var TURNSTILE_SECRET = 'PASTE_TURNSTILE_SECRET_KEY_HERE';
var REQUIRE_TURNSTILE = false;

// Two submissions from the same email inside this many seconds = a retry loop.
var DEDUPE_SECONDS = 60;

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(LEADS_SHEET) || ss.getSheets()[0];

    var data = {};
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); }
      catch (parseErr) { data = e.parameter || {}; }
    } else if (e.parameter) {
      data = e.parameter;
    }

    var reject = screenSubmission(data, sheet);
    if (reject) {
      logBlocked(ss, data, reject);
      return tgmJsonOut({ ok: false, blocked: reject });
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Persona', 'Name', 'Email', 'Phone',
                       'Service Type', 'Preferred Date', 'Message', 'Source']);
    }
    sheet.appendRow([
      new Date(),
      data.persona || '',
      data.name || '',
      data.email || '',
      data.phone || '',
      data.service_type || '',
      data.preferred_date || '',
      data.message || '',
      data.from_name || ''
    ]);

    // Email Michelle. Deliberately after appendRow and inside its own
    // try/catch: a mail failure must never cost us the logged lead.
    var emailed = true;
    try { notifyMichelle(data); }
    catch (mailErr) { emailed = false; logMailFailure(ss, data, mailErr); }

    return tgmJsonOut({ ok: true, emailed: emailed });
  } catch (err) {
    return tgmJsonOut({ ok: false, error: String(err) });
  }
}

/**
 * Returns a reason string if the submission should be blocked, or '' to allow.
 * Ordered cheapest-check-first.
 */
function screenSubmission(data, sheet) {
  var name    = String(data.name || '').trim();
  var email   = String(data.email || '').trim();
  var message = String(data.message || '').trim();

  // 1. Honeypot. The form ships a hidden checkbox no human can see or tick.
  if (String(data.botcheck || '').trim() !== '') return 'honeypot';

  // 2. Shared token, once the site sends it. A speed bump for bots that
  //    scraped the endpoint URL without re-reading the page, not a real lock.
  if (REQUIRE_TOKEN && String(data.tgm_token || '') !== FORM_TOKEN) {
    return 'missing token';
  }

  // 3. The basics.
  if (!name)  return 'no name';
  if (!email) return 'no email';
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(email)) return 'bad email format';

  // 4. Message that is nothing but digits. Every spam row in this sheet put a
  //    phone number here; every genuine lead wrote a sentence about their
  //    home. An empty message is fine - only a digits-only one is not.
  if (message && /^[\d\s()+.-]+$/.test(message)) return 'numeric message';

  // 5. Gibberish name: caps scattered mid-word AMONG lowercase, the signature
  //    of a random string generator. Checked per word, and a word in all caps
  //    is skipped - that's caps lock, not a bot. Clears McDonald, MacIntyre,
  //    JoAnne, DeAndre, and JOHN SMITH alike.
  if (hasGibberishWord(name)) return 'gibberish name';

  // 6. Same email again within the minute - a retry loop, not a person.
  if (isRecentDuplicate(sheet, email)) return 'duplicate within ' + DEDUPE_SECONDS + 's';

  // 7. Turnstile last: it is the only check that costs a network round trip,
  //    so obvious spam is already gone before we spend one.
  if (REQUIRE_TURNSTILE) {
    var cf = String(data['cf-turnstile-response'] || '');
    if (!cf) return 'no turnstile token';
    if (!verifyTurnstile(cf)) return 'turnstile failed';
  }

  return '';
}

/** Ask Cloudflare whether this Turnstile token is genuine. */
function verifyTurnstile(token) {
  try {
    var r = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'post',
      payload: { secret: TURNSTILE_SECRET, response: token },
      muteHttpExceptions: true
    });
    return JSON.parse(r.getContentText()).success === true;
  } catch (err) {
    // Never let a Cloudflare outage silently swallow real leads: if we cannot
    // reach them, let the submission through. Everything else still screened it.
    return true;
  }
}

/**
 * True if any single word mixes lowercase with 3+ capitals after its first
 * letter - e.g. "JwXhCtudvfILBa". A word with no lowercase at all (JOHN,
 * TESTING) is caps lock and is skipped.
 */
function hasGibberishWord(str) {
  var words = String(str).split(/[\s'\-.]+/);
  for (var w = 0; w < words.length; w++) {
    var word = words[w];
    if (word.length < 6) continue;
    if (!/[a-z]/.test(word)) continue;          // all caps = shouty human
    var inner = 0;
    for (var i = 1; i < word.length; i++) {
      var c = word.charAt(i);
      if (c >= 'A' && c <= 'Z') inner++;
    }
    if (inner >= 3) return true;
  }
  return false;
}

/** Was this email already logged in the last DEDUPE_SECONDS? */
function isRecentDuplicate(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var from = Math.max(2, last - 9);               // only the tail matters
  var rows = sheet.getRange(from, 1, last - from + 1, 4).getValues();
  var cutoff = Date.now() - DEDUPE_SECONDS * 1000;
  var target = email.toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    var ts = rows[i][0];
    var seen = String(rows[i][3] || '').trim().toLowerCase();
    if (seen === target && ts instanceof Date && ts.getTime() >= cutoff) return true;
  }
  return false;
}

/** Keep rejects on their own tab so false positives are recoverable. */
function logBlocked(ss, data, reason) {
  try {
    var tab = ss.getSheetByName('Blocked');
    if (!tab) {
      tab = ss.insertSheet('Blocked');
      tab.appendRow(['Timestamp', 'Reason', 'Persona', 'Name', 'Email', 'Phone',
                     'Service Type', 'Preferred Date', 'Message', 'Source']);
    }
    tab.appendRow([
      new Date(), reason,
      data.persona || '', data.name || '', data.email || '', data.phone || '',
      data.service_type || '', data.preferred_date || '', data.message || '',
      data.from_name || ''
    ]);
  } catch (err) {
    // Never let audit logging break a real submission path.
  }
}

function tgmJsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Send the lead to Michelle. Sends from the script owner's Google account
 * with Reply-To set to the customer, so hitting reply in Gmail answers the
 * customer directly rather than the website.
 *
 * Only clean submissions reach this - screenSubmission() has already run, so
 * spam never generates an email.
 */
function notifyMichelle(data) {
  var name    = String(data.name || '').trim() || 'Someone';
  var service = String(data.service_type || '').trim();
  var persona = String(data.persona || '').trim();
  var email   = String(data.email || '').trim();

  var subject = 'New estimate request: ' + name + (service ? ' (' + service + ')' : '');

  var lines = [
    'Name:           ' + name,
    'Email:          ' + email,
    'Phone:          ' + (data.phone || '(not given)'),
    'Service:        ' + (service || '(not given)'),
    'Preferred date: ' + (data.preferred_date || '(not given)'),
    'Came in via:    ' + (persona || 'contact page'),
    '',
    'What they said:',
    String(data.message || '(no message)'),
    '',
    '---',
    'Sent automatically from toogoodmaidscleaning.com.',
    'Reply to this email and it goes straight to the customer.',
    'Every request is also logged in the TGM Contact Form Info sheet.'
  ];

  var options = { name: 'Too Good Maids Website' };
  if (email) options.replyTo = email;

  MailApp.sendEmail(NOTIFY_TO, subject, lines.join('\n'), options);
}

/** If the mail ever fails, record it next to the lead rather than losing it. */
function logMailFailure(ss, data, err) {
  try {
    var tab = ss.getSheetByName('Mail failures');
    if (!tab) {
      tab = ss.insertSheet('Mail failures');
      tab.appendRow(['Timestamp', 'Error', 'Name', 'Email', 'Phone']);
    }
    tab.appendRow([new Date(), String(err), data.name || '', data.email || '', data.phone || '']);
  } catch (ignored) {}
}

function doGet() {
  return ContentService.createTextOutput("Too Good Maids form webhook is live.");
}
