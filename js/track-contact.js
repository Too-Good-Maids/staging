/* GA4 contact tracking.
   The estimate forms report `generate_lead` inline on submit success. This file
   covers the other two ways people reach Michelle: tapping the phone number and
   clicking the email address. Both are real conversions for a service business,
   and neither leaves a trace in GA4 on its own.
   Delegated from the document so it also covers links inside the mobile nav,
   which Webflow injects after load. */
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (!a || typeof gtag !== 'function') return;
    var href = a.getAttribute('href') || '';
    var isPhone = href.indexOf('tel:') === 0;
    gtag('event', isPhone ? 'phone_click' : 'email_click', {
      link_url: href,
      page_path: location.pathname
    });
  }, true);
})();
