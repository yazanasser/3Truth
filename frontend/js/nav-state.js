(() => {
  const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const routeAliases = {
    '': 'index.html',
    home: 'index.html',
    index: 'index.html',
    detector: 'detector.html',
    scan: 'detector.html',
    pricing: 'pricing.html',
    plans: 'pricing.html'
  };
  const activePage = routeAliases[currentPage] || currentPage;
  const primaryPages = new Set(['index.html', 'detector.html', 'pricing.html']);

  function normalizeHref(link) {
    const rawHref = link.getAttribute('href') || '';
    const clean = rawHref.split('#')[0].split('?')[0].toLowerCase();
    // Map path-style hrefs to canonical filenames
    if (clean === '/' || clean === 'index.html') return 'index.html';
    if (clean === '/scan' || clean === 'scan' || clean === 'detector.html') return 'detector.html';
    if (clean === '/plans' || clean === 'plans' || clean === 'pricing.html') return 'pricing.html';
    return clean;
  }

  function refreshActiveNavigation() {
    document.querySelectorAll('a[href]').forEach((link) => {
      const href = normalizeHref(link);
      if (!primaryPages.has(href)) return;
      if (link.querySelector('img')) return; // Skip logo link

      if (href === activePage) {
        link.setAttribute('aria-current', 'page');
        link.classList.add('nav-active');
        link.classList.remove('text-white');
      } else {
        link.removeAttribute('aria-current');
        link.classList.remove('nav-active', 'text-[var(--accent-1)]');
        link.classList.add('text-white');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshActiveNavigation, { once: true });
  } else {
    refreshActiveNavigation();
  }
})();