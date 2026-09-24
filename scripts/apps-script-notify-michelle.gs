/**
 * Paste this into the existing Google Apps Script (the one deployed at
 * script.google.com/macros/s/AKfycbzWlihJOHKLut8B93QkiWwn9yW3MN0B8tteDBc_7CJwraarrLJFAQ-QZ5ekUbuN9sI/exec).
 *
 * Add the NOTIFY_TO constant + notifyMichelle() function, then call
 * notifyMichelle(e) from inside your existing doPost(e) right after the
 * row is appended to the Sheet. Then Deploy → Manage deployments → edit the
 * existing deployment → New version → Deploy. (Keep the SAME deployment so
 * the URL in the site doesn't change.) Apps Script will ask you to
 * re-authorize once because MailApp is a new permission.
 */

var NOTIFY_TO = 'toogoodmaidscs@gmail.com';

function notifyMichelle(e) {
  var p = (e && e.parameter) || {};
  if (p.botcheck) return; // honeypot tripped — skip
  var lines = [
    'Name:            ' + (p.name || ''),
    'Email:           ' + (p.email || ''),
    'Phone:           ' + (p.phone || ''),
    'Service:         ' + (p.service_type || ''),
    'Persona/page:    ' + (p.persona || ''),
    'Preferred date:  ' + (p.preferred_date || ''),
    '',
    'Message:',
    (p.message || ''),
    '',
    '— Sent automatically from the toogoodmaidscleaning.com estimate form.',
    'Reply to this email to respond directly to the customer.'
  ];
  var opts = { name: 'Too Good Maids Website' };
  if (p.email) opts.replyTo = p.email;
  MailApp.sendEmail(NOTIFY_TO,
    'New Estimate Request - Too Good Maids' + (p.persona ? ' (' + p.persona + ')' : ''),
    lines.join('\n'),
    opts);
}

/* ---- Example of where it goes in doPost ----
function doPost(e) {
  // ...existing code that appends the row to the Sheet...
  try { notifyMichelle(e); } catch (err) { Logger.log('notify failed: ' + err); }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
------------------------------------------------ */
