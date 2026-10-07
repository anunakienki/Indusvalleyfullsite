/* Runs before first paint: flags the boot-up intro so there is no flash of the page behind it.
   The intro plays once per browser session, and never for visitors who prefer reduced motion. */
try {
  if (!sessionStorage.getItem('s31_intro_seen') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('intro-active');
  }
} catch (e) {}

/* Pages: #zone1 … #zoneN, #clearance, #door show one section; anything else shows the entrance. */
try {
  var h = (location.hash || '').slice(1);
  document.documentElement.setAttribute('data-view', /^(zone\d+|clearance|door)$/.test(h) ? h : 'home');
} catch (e) {}
