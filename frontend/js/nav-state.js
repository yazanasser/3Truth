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

  // ─── Global Sign-in Modal (inline, no separate page) ───
  const AUTH_MODAL_HTML = `
    <style>
      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes modalPopIn {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes slideUpFade {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-modal-bg { animation: modalFadeIn 0.4s ease-out forwards; }
      .animate-modal-content { animation: modalPopIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      
      .stagger-anim { opacity: 0; animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .delay-1 { animation-delay: 0.1s; }
      .delay-2 { animation-delay: 0.2s; }
      .delay-3 { animation-delay: 0.3s; }
      .delay-4 { animation-delay: 0.4s; }
      .delay-5 { animation-delay: 0.5s; }

      .magnetic-btn {
        transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease;
      }
      .magnetic-btn:hover {
        box-shadow: 0 10px 30px -10px rgba(0, 229, 255, 0.4);
      }
    </style>
    <div id="auth-card" dir="auto" class="relative w-full max-w-2xl mx-auto p-10 md:p-16 rounded-[24px] shadow-2xl bg-[#030305]/95 border border-white/10 backdrop-blur-xl animate-modal-content">
      <div class="text-center mt-12 mb-10">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-[var(--accent-1)]/10 rounded-2xl border border-[var(--accent-1)]/20 mb-8 stagger-anim delay-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
        </div>
        <p class="text-lg md:text-2xl font-medium text-white/90 leading-relaxed stagger-anim delay-2" id="auth-title">
          Thank you for visiting! Please sign in to continue.
        </p>
        <div class="h-0.5 w-16 mx-auto mt-8 bg-[var(--accent-1)]/50 stagger-anim delay-2"></div>
      </div>

      <div id="error-msg" class="hidden mb-10 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 text-center font-black text-sm"></div>
      <div id="success-msg" class="hidden mb-10 p-5 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-400 text-center font-black text-sm"></div>

      <form id="signin-form" class="space-y-12">
        <div class="space-y-4 stagger-anim delay-3" id="email-section">
          <label for="signin-email" class="text-sm font-semibold text-gray-400 ml-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Email Address
          </label>
          <input id="signin-email" type="email" required autofocus
            class="w-full h-20 px-8 bg-white/5 border border-white/10 rounded-2xl text-white font-mono focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all text-xl"
            placeholder="you@example.com" />
        </div>

        <div class="space-y-4 hidden stagger-anim delay-3" id="otp-section">
          <div class="flex justify-between items-center px-2">
            <label for="signin-otp" class="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>
              Verification Code
            </label>
            <button type="button" id="resend-btn"
              class="text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:text-gray-500"
              disabled>Resend in 60s</button>
          </div>
          <input id="signin-otp" type="text" maxlength="6"
            class="w-full h-20 px-8 bg-white/5 border border-white/10 rounded-2xl text-white font-mono text-center tracking-[0.5em] focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all text-4xl font-black"
            placeholder="••••••" />
        </div>

        <div class="pt-4 stagger-anim delay-4">
          <button type="submit" id="submit-btn"
            class="magnetic-btn w-full h-20 text-black bg-[var(--accent-1)] font-black rounded-2xl active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-3 text-2xl group">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="submit-icon" class="w-7 h-7 transition-transform group-hover:scale-110"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
            <span id="submit-text">Send Code</span>
          </button>
          <p class="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs text-center mt-8" id="auth-subtitle">
            Verify your email to enter
          </p>
        </div>
      </form>

      <div class="mt-20 text-center stagger-anim delay-5">
        <p class="text-gray-500 font-bold uppercase tracking-widest text-xs">
          Secured by 3truth Cryptography
        </p>
      </div>
    </div>
  `;

  function openAuthModal(e) {
    if (e) e.preventDefault();
    if (document.getElementById('global-auth-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'global-auth-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:1.5rem;';

    const backdrop = document.createElement('div');
    backdrop.className = 'animate-modal-bg';
    backdrop.style.cssText = 'position:absolute;inset:0;background:rgba(3,3,5,0.85);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);cursor:pointer;';
    
    // Add fade out animation when closing
    const closeModal = () => {
      backdrop.style.animation = 'none';
      modal.querySelector('#auth-card').style.animation = 'none';
      backdrop.style.opacity = '1';
      modal.querySelector('#auth-card').style.opacity = '1';
      
      backdrop.style.transition = 'opacity 0.3s ease';
      modal.querySelector('#auth-card').style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      
      // force reflow
      backdrop.offsetHeight;
      
      backdrop.style.opacity = '0';
      modal.querySelector('#auth-card').style.opacity = '0';
      modal.querySelector('#auth-card').style.transform = 'scale(0.95)';
      
      setTimeout(() => modal.remove(), 300);
    };
    
    backdrop.onclick = closeModal;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'animate-modal-bg';
    closeBtn.style.cssText = 'position:absolute;top:2rem;right:2rem;z-index:10;padding:0.75rem;color:white;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:50%;cursor:pointer;transition:all 0.2s ease;display:flex;align-items:center;justify-content:center;';
    closeBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(255,255,255,0.1)'; closeBtn.style.color = '#2FEECC'; closeBtn.style.transform = 'scale(1.1)'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = 'rgba(255,255,255,0.05)'; closeBtn.style.color = 'white'; closeBtn.style.transform = 'scale(1)'; };
    closeBtn.onclick = closeModal;

    const content = document.createElement('div');
    content.style.cssText = 'position:relative;z-index:10;width:100%;max-width:42rem;max-height:95vh;overflow-y:auto;scrollbar-width:none;';
    content.innerHTML = AUTH_MODAL_HTML;

    modal.appendChild(backdrop);
    modal.appendChild(closeBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Setup Magnetic Button Effect
    const btn = modal.querySelector('#submit-btn');
    if (btn) {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        // magnetic pull
        btn.style.transform = `translate(${x * 0.1}px, ${y * 0.15}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        // snap back
        btn.style.transform = 'translate(0px, 0px)';
      });
    }

    // Initialize signin logic on the newly injected elements
    if (typeof window._initSigninModal === 'function') {
      window._initSigninModal(modal);
    }
  }

  // Expose globally so other scripts (detector.js) can call it
  window.openAuthModal = openAuthModal;

  // Intercept all signin.html link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="signin.html"]');
    if (link) {
      openAuthModal(e);
    }
  });

})();