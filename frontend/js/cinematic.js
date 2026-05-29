/* cinematic.js - GSAP Cinematic Engine v2.0 — ALL pages
   No preloader. Smooth scroll. Maximum visual impact. */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger, TextPlugin, MotionPathPlugin);
  } else {
    console.warn("GSAP not loaded. Cinematic effects disabled.");
    return;
  }

  // ========================================
  // 1. SMOOTH SCROLL (Native)
  // ========================================
  document.documentElement.style.scrollBehavior = 'smooth';

  // ========================================
  // 2. INJECT GLOBAL UI ELEMENTS
  // ========================================
  if (!document.getElementById('scroll-progress')) {
    const elements = `
      <div id="scroll-progress" style="width:100%;"></div>
      <div id="cursor-dot"></div>
      <div id="cursor-ring"></div>
    `;
    document.body.insertAdjacentHTML('afterbegin', elements);
  }

  // Remove any leftover preloader
  const oldPreloader = document.getElementById('preloader');
  if (oldPreloader) oldPreloader.remove();

  // ========================================
  // 3. GRAND ENTRANCE SEQUENCE (No preloader)
  // ========================================
  const entranceTL = gsap.timeline({ defaults: { ease: "power4.out" } });

  // Navbar slides in (top fixed bar)
  const topNav = document.querySelector('.fixed.top-0');
  if (topNav) {
    gsap.set(topNav, { y: -100, opacity: 0 });
    entranceTL.to(topNav, { y: 0, opacity: 1, duration: 1, ease: "elastic.out(1, 0.6)" }, 0.1);
  }

  // Hero elements cascade in
  if (document.querySelector('.hero-elem')) {
    gsap.set('.hero-elem', { y: 80, opacity: 0, scale: 0.95 });
    entranceTL.to('.hero-elem', {
      y: 0, opacity: 1, scale: 1,
      duration: 1.2,
      stagger: 0.15,
      ease: "expo.out"
    }, 0.2);
  }

  // Hero subtitle
  if (document.querySelector('.hero-sub')) {
    gsap.set('.hero-sub', { y: 40, opacity: 0 });
    entranceTL.to('.hero-sub', {
      y: 0, opacity: 1,
      duration: 1,
      ease: "power3.out"
    }, 0.5);
  }

  // Hero title character-by-character shimmer
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    entranceTL.fromTo(heroTitle, 
      { backgroundSize: "200% 200%", backgroundPosition: "100% 0%" },
      { backgroundPosition: "0% 100%", duration: 2, ease: "sine.inOut" },
      0.6
    );
  }

  // Auth cards (signin/signup)
  if (document.getElementById('auth-card')) {
    gsap.set('#auth-card', { y: 60, opacity: 0, scale: 0.95 });
    entranceTL.to('#auth-card', { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: "expo.out" }, 0.2);
  }

  // Payment card
  if (document.getElementById('payment-card')) {
    gsap.set('#payment-card', { y: 60, opacity: 0, scale: 0.95 });
    entranceTL.to('#payment-card', { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: "expo.out" }, 0.3);
  }

  // ========================================
  // 4. CUSTOM MAGNETIC CURSOR
  // ========================================
  const cursorDot = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');

  if (cursorDot && cursorRing && window.innerWidth > 768) {
    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    let dotX = mouseX, dotY = mouseY;
    let ringX = mouseX, ringY = mouseY;
    let ringRotation = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function updateCursor() {
      // Smooth linear interpolation (lerp)
      dotX += (mouseX - dotX) * 0.35;
      dotY += (mouseY - dotY) * 0.35;
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ringRotation += 0.5;

      cursorDot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) rotate(${ringRotation}deg)`;

      requestAnimationFrame(updateCursor);
    }
    requestAnimationFrame(updateCursor);

    // Event Delegation for hover state (O(1) complexity, 100% dynamic, zero memory overhead)
    const hoverSelector = 'a, button, .btn-glass, .btn-magnetic, input, textarea, .tab-btn, .nav-link, [data-tab]';
    
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest(hoverSelector);
      if (target) {
        document.body.classList.add('cursor-hover');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest(hoverSelector);
      if (target && (!e.relatedTarget || !e.relatedTarget.closest(hoverSelector))) {
        document.body.classList.remove('cursor-hover');
      }
    });
  } else {
    // Hide cursor on mobile
    if (cursorDot) cursorDot.style.display = 'none';
    if (cursorRing) cursorRing.style.display = 'none';
    document.body.style.cursor = 'auto';
  }

  // ========================================
  // 5. MAGNETIC BUTTONS (Enhanced)
  // ========================================
  document.querySelectorAll('.btn-magnetic, .btn-glass, .tab-btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: "power2.out" });
      const span = btn.querySelector('span');
      if (span) gsap.to(span, { x: x * 0.1, y: y * 0.1, duration: 0.4, ease: "power2.out" });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" });
      const span = btn.querySelector('span');
      if (span) gsap.to(span, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" });
    });
  });

  // ========================================
  // 6. AURORA PARALLAX + PULSE (Optimized via rAF)
  // ========================================
  const auroraBlobs = document.querySelectorAll('.aurora-blob');
  if (auroraBlobs.length > 0) {
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    window.addEventListener('mousemove', e => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 60;
      targetY = (e.clientY / window.innerHeight - 0.5) * 60;
    });

    function updateAurora() {
      currentX += (targetX - currentX) * 0.05; // smooth lag
      currentY += (targetY - currentY) * 0.05;

      if (auroraBlobs[0]) auroraBlobs[0].style.transform = `translate3d(${currentX * 2}px, ${currentY * 2}px, 0)`;
      if (auroraBlobs[1]) auroraBlobs[1].style.transform = `translate3d(${-currentX * 1.5}px, ${-currentY * 1.5}px, 0)`;
      if (auroraBlobs[2]) auroraBlobs[2].style.transform = `translate3d(${currentX * 0.8}px, ${-currentY * 2}px, 0)`;

      requestAnimationFrame(updateAurora);
    }
    requestAnimationFrame(updateAurora);

    gsap.to(auroraBlobs, {
      scale: 1.2, opacity: 0.7,
      duration: 5, yoyo: true, repeat: -1,
      ease: "sine.inOut", stagger: 1.5
    });
  }

  // ========================================
  // 7. 3D TILT HOVER ON CARDS
  // ========================================
  document.querySelectorAll('.spotlight-card, .holo-panel, .glass-card, .parallax-card').forEach(card => {
    card.style.transformStyle = 'preserve-3d';
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      gsap.to(card, {
        rotationX: rotateX,
        rotationY: rotateY,
        transformPerspective: 1000,
        ease: "power2.out",
        duration: 0.4
      });
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotationX: 0, rotationY: 0,
        ease: "elastic.out(1, 0.4)",
        duration: 1.2
      });
    });
  });

  // ========================================
  // 8. SCROLL PROGRESS BAR
  // ========================================
  if (document.getElementById('scroll-progress')) {
    gsap.to('#scroll-progress', {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3
      }
    });
  }

  // ========================================
  // 9. SCROLL-TRIGGERED REVEALS (Global)
  // ========================================
  gsap.utils.toArray('.scroll-reveal').forEach(section => {
    gsap.fromTo(section,
      { y: 80, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 1.2, ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 88%",
        }
      }
    );
  });

  // Staggered children reveal for sections with .stagger-children
  gsap.utils.toArray('.stagger-children').forEach(container => {
    const children = container.children;
    gsap.fromTo(children,
      { y: 50, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: "power3.out",
        scrollTrigger: {
          trigger: container,
          start: "top 85%"
        }
      }
    );
  });

  // ========================================
  // 10. TEXT SPLIT FADE ANIMATION
  // ========================================
  document.querySelectorAll('.split-text-fade').forEach(el => {
    const text = el.textContent;
    const words = text.split(' ');
    el.innerHTML = words.map(word => `<span class="inline-block opacity-0 translate-y-4" style="transition: none;">${word}</span>`).join(' ');

    gsap.to(el.querySelectorAll('span'), {
      y: 0, opacity: 1,
      duration: 0.6,
      stagger: 0.03,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 90%"
      }
    });
  });

  // ========================================
  // 11. HOLOGRAPHIC DATA PARTICLES
  // ========================================
  function createParticles() {
    if (document.getElementById('holo-particles')) return;
    const container = document.createElement('div');
    container.id = 'holo-particles';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:hidden;';
    document.body.appendChild(container);

    const colors = ['var(--accent-1)', 'var(--accent-2)', 'var(--accent-3)'];

    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 3 + 1;
      const height = Math.random() * 30 + 5;

      p.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${height}px;
        background: ${color};
        opacity: ${Math.random() * 0.4 + 0.05};
        box-shadow: 0 0 ${size * 4}px ${color};
        border-radius: 999px;
        top: ${Math.random() * 120}%;
        left: ${Math.random() * 100}%;
      `;
      container.appendChild(p);

      gsap.to(p, {
        y: -(window.innerHeight + 200),
        x: `+=${(Math.random() - 0.5) * 100}`,
        duration: Math.random() * 12 + 6,
        repeat: -1,
        ease: "none",
        delay: Math.random() * -12
      });
    }
  }
  createParticles();

  // ========================================
  // 12. FLOATING GRID GLOW ON SCROLL
  // ========================================
  const gridOverlay = document.querySelector('.grid-overlay');
  if (gridOverlay) {
    window.addEventListener('mousemove', e => {
      gridOverlay.style.maskImage = `radial-gradient(circle 400px at ${e.clientX}px ${e.clientY}px, black 20%, transparent 80%)`;
      gridOverlay.style.webkitMaskImage = `radial-gradient(circle 400px at ${e.clientX}px ${e.clientY}px, black 20%, transparent 80%)`;
    });
  }

  // ========================================
  // 13. CINEMATIC SECTION TRANSITIONS
  // ========================================
  gsap.utils.toArray('section').forEach(section => {
    // Add a subtle scale + blur entrance to every section
    if (!section.classList.contains('scroll-reveal') && !section.querySelector('.hero-elem')) {
      gsap.fromTo(section,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 90%",
          }
        }
      );
    }
  });

  // ========================================
  // 14. HORIZONTAL SCROLL SETUP (if exists)
  // ========================================
  const hTrack = document.getElementById('horizontal-track');
  const hTrigger = document.getElementById('horizontal-trigger');
  if (hTrack && hTrigger) {
    const panels = hTrack.querySelectorAll('.horizontal-panel');
    if (panels.length > 0) {
      const horizontalTween = gsap.to(hTrack, {
        x: () => -(hTrack.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: hTrigger,
          pin: true,
          scrub: 1,
          start: "top top",
          end: () => "+=" + hTrack.scrollWidth,
          invalidateOnRefresh: true
        }
      });

      // Animate panel content on scroll
      panels.forEach((panel, i) => {
        const inner = panel.querySelector('.panel-inner');
        const num = panel.querySelector('.panel-number');
        if (inner) {
          gsap.fromTo(inner,
            { x: 50, opacity: 0 },
            {
              x: 0, opacity: 1, duration: 1,
              scrollTrigger: {
                trigger: panel,
                containerAnimation: horizontalTween,
                start: "left 80%",
                toggleActions: "play none none reverse"
              }
            }
          );
        }
      });
    }
  }

  // ========================================
  // 15. COUNTER ANIMATIONS (if exists)
  // ========================================
  gsap.utils.toArray('.counter-anim').forEach(counter => {
    const target = parseFloat(counter.getAttribute('data-target'));
    gsap.to(counter, {
      innerHTML: target,
      duration: 2.5,
      ease: "power3.out",
      snap: { innerHTML: 0.1 },
      scrollTrigger: {
        trigger: counter,
        start: "top 85%"
      }
    });
  });

  // ========================================
  // 16. SCRAMBLE HOVER EFFECT
  // ========================================
  if (typeof initScrambleHover === 'function') {
    initScrambleHover('.scramble-hover');
  }

  // ========================================
  // 17. MARQUEE CONSTANT SPEED
  // ========================================
  const marquee = document.querySelector('.marquee-content');
  if (marquee) {
    marquee.style.animationDuration = '30s';
  }

  // ========================================
  // 17. PARALLAX DEPTH LAYERS
  // ========================================
  gsap.utils.toArray('.parallax-card').forEach(card => {
    const speed = parseFloat(card.getAttribute('data-speed') || '1');
    gsap.to(card, {
      y: () => (1 - speed) * 120,
      ease: "none",
      scrollTrigger: {
        trigger: card,
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });
  });

  // ========================================
  // 18. SVG LINE DRAW (if exists)
  // ========================================
  const scrollGlow = document.getElementById('scroll-glow');
  if (scrollGlow) {
    const length = scrollGlow.getTotalLength();
    scrollGlow.style.strokeDasharray = length;
    scrollGlow.style.strokeDashoffset = length;

    gsap.to(scrollGlow, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 1
      }
    });
  }

  // ========================================
  // 19. CODE CARD 3D ROTATION (if exists)
  // ========================================
  const codeCard = document.getElementById('code-card');
  const codeGlow = document.getElementById('code-glow');
  if (codeCard) {
    gsap.fromTo(codeCard,
      { rotationY: -15, rotationX: 10, scale: 0.85, opacity: 0 },
      {
        rotationY: 0, rotationX: 0, scale: 1, opacity: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "#code-card-container",
          start: "top 80%",
          end: "center center",
          scrub: 1
        }
      }
    );
    if (codeGlow) {
      gsap.to(codeGlow, {
        opacity: 0.6, scale: 1.3,
        scrollTrigger: {
          trigger: "#code-card-container",
          start: "top 80%",
          end: "center center",
          scrub: true
        }
      });
    }
  }

  // ========================================
  // 20. CTA SECTION EPIC REVEAL
  // ========================================
  const ctaSection = document.querySelector('section.py-32.text-center');
  if (ctaSection) {
    gsap.fromTo(ctaSection,
      { scale: 0.85, opacity: 0, rotationX: 5 },
      {
        scale: 1, opacity: 1, rotationX: 0,
        duration: 1.5, ease: "expo.out",
        scrollTrigger: {
          trigger: ctaSection,
          start: "top 85%"
        }
      }
    );
  }

  // ========================================
  // 21. INIT ALL CARDS 3D HOVER
  // ========================================
  if (typeof initParallaxCard === 'function') {
    document.querySelectorAll('.spotlight-card, .holo-panel').forEach(card => {
      initParallaxCard(card);
    });
  }

  // ========================================
  // 22. SIDEBAR ANIMATION LOGIC
  // ========================================
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenuClose = document.getElementById('mobile-menu-close');
  
  if (mobileMenu && mobileMenuBtn && mobileMenuClose) {
    // Make sure it is displayed but transformed off-screen
    mobileMenu.classList.remove('hidden');
    mobileMenu.classList.add('flex', 'translate-x-full');
    
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.remove('translate-x-full');
    });
    mobileMenuClose.addEventListener('click', () => {
      mobileMenu.classList.add('translate-x-full');
    });
  }

  // ========================================
  // 23. AUTH-AWARE NAVBAR BUTTONS & DYNAMIC PLAN BADGES
  // ========================================
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      // Desktop login button
      const desktopLoginBtn = document.getElementById('nav-login-btn');
      // Sidebar login link
      const sidebarLoginLink = document.getElementById('sidebar-login-link');
      
      if (user) {
        // User is signed in — swap LOGIN to SIGN OUT
        if (desktopLoginBtn) {
          desktopLoginBtn.textContent = 'SIGN OUT';
          desktopLoginBtn.href = '#';
          desktopLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            firebase.auth().signOut().then(() => window.location.reload());
          });

          // Fetch and render plan badge on Desktop
          firebase.firestore().collection('users').doc(user.uid).get().then((doc) => {
            const data = doc.data();
            const plan = (data && data.plan) ? data.plan.toLowerCase() : 'free';
            
            // Remove any existing badge first
            const existingBadge = document.getElementById('nav-live-plan-badge');
            if (existingBadge) existingBadge.remove();

            // Style matching plan tier
            let badgeClasses = 'px-6 py-2 font-black uppercase tracking-wider rounded-none border ';
            if (plan === 'ultimate') {
              badgeClasses += 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]';
            } else if (plan === 'pro') {
              badgeClasses += 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.2)]';
            } else {
              badgeClasses += 'bg-white/5 border-white/15 text-gray-400';
            }

            const badge = document.createElement('span');
            badge.id = 'nav-live-plan-badge';
            badge.className = badgeClasses;
            badge.style.marginRight = '1.5rem';
            badge.innerHTML = `<span class="inline-block w-2 h-2 rounded-full mr-2 ${plan === 'ultimate' ? 'bg-amber-400 animate-pulse' : plan === 'pro' ? 'bg-[#00f0ff] animate-pulse' : 'bg-gray-400'}"></span>${plan} tier`;
            
            desktopLoginBtn.parentNode.insertBefore(badge, desktopLoginBtn);
          }).catch(err => console.warn('Error fetching subscription status:', err));
        }

        if (sidebarLoginLink) {
          sidebarLoginLink.textContent = 'SIGN OUT';
          sidebarLoginLink.href = '#';
          sidebarLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            firebase.auth().signOut().then(() => window.location.reload());
          });

          // Fetch and render plan badge on Sidebar
          firebase.firestore().collection('users').doc(user.uid).get().then((doc) => {
            const data = doc.data();
            const plan = (data && data.plan) ? data.plan.toLowerCase() : 'free';
            
            // Remove any existing badge first
            const existingSidebarBadge = document.getElementById('sidebar-live-plan-badge');
            if (existingSidebarBadge) existingSidebarBadge.remove();

            let badgeClasses = 'px-6 py-3 text-sm font-black uppercase tracking-wider rounded-none border w-full text-center ';
            if (plan === 'ultimate') {
              badgeClasses += 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]';
            } else if (plan === 'pro') {
              badgeClasses += 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.2)]';
            } else {
              badgeClasses += 'bg-white/5 border-white/15 text-gray-400';
            }

            const badge = document.createElement('div');
            badge.id = 'sidebar-live-plan-badge';
            badge.className = badgeClasses;
            badge.style.marginBottom = '1.5rem';
            badge.innerHTML = `<span class="inline-block w-2 h-2 rounded-full mr-2 ${plan === 'ultimate' ? 'bg-amber-400 animate-pulse' : plan === 'pro' ? 'bg-[#00f0ff] animate-pulse' : 'bg-gray-400'}"></span>${plan} tier`;
            
            sidebarLoginLink.parentNode.insertBefore(badge, sidebarLoginLink);
          }).catch(err => console.warn('Error fetching subscription status:', err));
        }
      }
    });
  }

  console.log('[CINEMATIC] v2.0 Engine loaded — All systems operational.');
});
