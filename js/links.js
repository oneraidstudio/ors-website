/* ===========================================================================
   ONE RAID STUDIO — links.js

   >>> THIS IS THE ONLY FILE YOU EDIT TO SET EXTERNAL URLS. <<<

   The same links appear across four pages. Set a URL once here and every page
   picks it up. Anchors opt in with data-link="key".

   Everything below is currently a PLACEHOLDER so the buttons are clickable
   while the real destinations are pending. Replace each one with your actual
   URL — nothing else in the codebase needs to change.

   A key left as an empty string renders as a pending link: not clickable and
   announced as unavailable, rather than an href="#" that silently jumps to
   the top of the page.
   =========================================================================== */
(function () {
  'use strict';

  var LINKS = {
    /* primary CTA — every "Join Discord" button on the site */
    discord: 'https://discord.gg/oneraidstudio',              // PLACEHOLDER

    /* socials */
    x: 'https://x.com/oneraidstudio',                          // PLACEHOLDER
    instagram: 'https://instagram.com/oneraidstudio',          // PLACEHOLDER
    mcmodels: 'https://mcmodels.net/',                         // PLACEHOLDER
    builtbybit: 'https://builtbybit.com/',                     // PLACEHOLDER
    sketchfab: 'https://sketchfab.com/',                       // PLACEHOLDER

    /* the external "full portfolio" destination */
    'portfolio-external': 'https://sketchfab.com/',            // PLACEHOLDER

    /* pack listings — "View on MCModels" / "Get it free" */
    'pack-iconz': 'https://mcmodels.net/',                     // PLACEHOLDER
    'pack-meme': 'https://mcmodels.net/',                      // PLACEHOLDER
    'pack-hamster': 'https://mcmodels.net/'                    // PLACEHOLDER
  };

  var anchors = document.querySelectorAll('[data-link]');

  for (var i = 0; i < anchors.length; i++) {
    var a = anchors[i];
    var url = LINKS[a.getAttribute('data-link')];

    if (url) {
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      a.removeAttribute('aria-disabled');
      a.removeAttribute('data-pending');
      a.removeAttribute('title');
      continue;
    }

    // No URL yet: make the state honest rather than broken.
    a.setAttribute('data-pending', '');
    a.setAttribute('aria-disabled', 'true');
    a.setAttribute('title', 'Coming soon');
    a.removeAttribute('target');
    a.removeAttribute('rel');
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-pending]');
    if (a) e.preventDefault();
  });
})();
