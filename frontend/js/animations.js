/* animations.js — GSAP helpers. Requires gsap, ScrollTrigger, TextPlugin, MotionPathPlugin globals */

if (typeof gsap !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, TextPlugin, MotionPathPlugin);
}

/* ─── Letter Pull-Up ─── */
function initLetterPullUp(el, delay = 0) {
  if (!el) return;
  const letters = el.querySelectorAll('.lpu-letter');
  if (!letters.length) return;
  gsap.fromTo(letters,
    { y: '100%', opacity: 0 },
    { y: 0, opacity: 1, stagger: 0.03, duration: 0.6, ease: 'power3.out', delay }
  );
}

/* ─── Scroll Reveal ─── */
function initScrollReveal(els) {
  if (!els || !els.length) return;
  els.forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 50, scale: 0.96, filter: 'blur(6px)' },
      {
        opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
        duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      }
    );
  });
}

/* ─── Stagger Reveal ─── */
function initStaggerReveal(container, stagger = 0.1) {
  if (!container) return;
  const children = Array.from(container.children);
  if (!children.length) return;
  gsap.fromTo(children,
    { opacity: 0, y: 40, scale: 0.96 },
    {
      opacity: 1, y: 0, scale: 1,
      stagger: stagger, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: container, start: 'top 88%', once: true }
    }
  );
}

/* ─── Count Up ─── */
function initCountUp(el, end, duration = 3) {
  if (!el) return;
  const suffix = el.dataset.suffix || '';
  const obj = { val: 0 };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        observer.disconnect();
        gsap.to(obj, {
          val: end, duration: duration, ease: 'power2.out',
          onUpdate: () => { el.textContent = Math.round(obj.val) + suffix; }
        });
      }
    });
  }, { threshold: 0.3 });

  observer.observe(el);
}

/* ─── Text Morph ─── */
function initTextMorph(el, texts, interval = 3500) {
  if (!el || !texts.length) return;
  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % texts.length;
    gsap.to(el, {
      opacity: 0, filter: 'blur(8px)', duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        el.textContent = texts[idx];
        gsap.to(el, { opacity: 1, filter: 'blur(0px)', duration: 0.4, ease: 'power2.out' });
      }
    });
  }, interval);
}

/* ─── Motion Path Orbit ─── */
function initMotionPathOrbit(dotEl, pathId, speed = 8) {
  if (!dotEl) return;
  gsap.to(dotEl, {
    motionPath: {
      path: '#' + pathId,
      align: '#' + pathId,
      alignOrigin: [0.5, 0.5]
    },
    duration: speed,
    repeat: -1,
    ease: 'none'
  });
}

/* ─── GSAP Typewriter ─── */
function initGSAPTypewriter(el, text, delay = 0) {
  if (!el) return;
  gsap.to(el, {
    text: { value: text, delimiter: '' },
    duration: text.length * 0.04,
    ease: 'none',
    delay: delay,
    scrollTrigger: { trigger: el, start: 'top 85%', once: true }
  });
}

/* ─── Hover Scramble Text (Vanilla JS) ─── */
function initScrambleHover(selector) {
  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;
  const chars = "!<>-_\\\\/[]{}—=+*^?#________";
  
  elements.forEach(el => {
    const originalText = el.textContent.trim();
    if (!el.dataset.original) {
      el.dataset.original = originalText;
    }
    
    el.addEventListener('mouseenter', () => {
      let iteration = 0;
      clearInterval(el.dataset.intervalId);
      
      el.dataset.intervalId = setInterval(() => {
        el.textContent = el.dataset.original
          .split("")
          .map((letter, index) => {
            if(index < iteration) {
              return el.dataset.original[index];
            }
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join("");
        
        if(iteration >= el.dataset.original.length){ 
          clearInterval(el.dataset.intervalId);
        }
        
        iteration += 1;
      }, 15);
    });
  });
}

function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('mobile-menu-close');
  const menu = document.getElementById('mobile-menu');
  
  if(btn && closeBtn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.remove('hidden');
      menu.classList.add('flex');
    });
    
    closeBtn.addEventListener('click', () => {
      menu.classList.add('hidden');
      menu.classList.remove('flex');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
});

/* ─── Scroll Velocity Marquee ─── */
function initScrollVelocity(wrapper, speed = 25) {
  if (!wrapper) return;
  const inner = wrapper.querySelector('.marquee-inner') || wrapper;
  let x = 0;
  let rafId;
  function tick() {
    x -= speed / 60;
    const totalW = inner.scrollWidth / 2;
    if (Math.abs(x) >= totalW) x = 0;
    inner.style.transform = `translateX(${x}px)`;
    rafId = requestAnimationFrame(tick);
  }
  tick();
  return () => cancelAnimationFrame(rafId);
}

/* ─── Horizontal Band (ScrollTrigger scrub) ─── */
function initHorizontalBand(el, direction = 1) {
  if (!el) return;
  gsap.fromTo(el,
    { x: 0 },
    {
      x: direction * -200,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
    }
  );
}

/* ─── Parallax Card (3D tilt on hover) ─── */
function initParallaxCard(el) {
  if (!el) return;
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    gsap.to(el, {
      rotateX: -dy * 10,
      rotateY: dx * 10,
      transformPerspective: 800,
      ease: 'power2.out',
      duration: 0.3
    });
  });
  el.addEventListener('mouseleave', () => {
    gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'elastic.out(1,0.7)' });
  });
}

/* ─── Elastic Distortion on Click ─── */
function initElasticDistortion(el) {
  if (!el) return;
  el.addEventListener('click', () => {
    const tl = gsap.timeline();
    tl.to(el, { scaleX: 0.85, scaleY: 1.15, duration: 0.1, ease: 'power2.in' })
      .to(el, { scaleX: 1.15, scaleY: 0.85, duration: 0.1, ease: 'power2.out' })
      .to(el, { scaleX: 1, scaleY: 1, duration: 0.8, ease: 'elastic.out(1,0.4)' });
  });
}

/* ─── Wave Text ─── */
function initWaveText(el) {
  if (!el) return;
  const letters = el.querySelectorAll('.wave-letter');
  letters.forEach((letter, i) => {
    letter.style.animationDelay = `${i * 0.08}s`;
  });
}

/* ─── Orbiting Dots (CSS-based) ─── */
function initOrbitingDots(container, count = 3) {
  if (!container) return;
  const colors = ['#06b6d4', '#a855f7', '#ec4899'];
  const radii = [80, 120, 160];
  const speeds = ['4s', '6s', '8s'];
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute;
      width:8px;height:8px;
      border-radius:50%;
      background:${colors[i % colors.length]};
      box-shadow:0 0 8px ${colors[i % colors.length]};
      top:50%;left:50%;
      --orbit-r:${radii[i % radii.length]}px;
      animation:orbit-spin ${speeds[i % speeds.length]} linear infinite;
      animation-delay:${-i * 1.2}s;
      transform-origin:0 0;
      margin:-4px 0 0 -4px;
    `;
    container.appendChild(dot);
  }
}

/* ─── Variable Proximity Text ─── */
function initVariableProximityText(el) {
  if (!el) return;
  window.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const maxDist = 300;
    const proximity = Math.max(0, 1 - dist / maxDist);
    gsap.to(el, {
      fontWeight: 400 + Math.round(proximity * 500),
      letterSpacing: proximity * 4 + 'px',
      duration: 0.2,
      ease: 'power2.out'
    });
  });
}

/* ─── Rotating Text ─── */
function initRotatingText(el, words) {
  if (!el || !words.length) return;
  let idx = 0;
  el.textContent = words[0];
  setInterval(() => {
    idx = (idx + 1) % words.length;
    gsap.to(el, {
      opacity: 0, y: -10, duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        el.textContent = words[idx];
        gsap.fromTo(el,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        );
      }
    });
  }, 2500);
}

/* ─── Global Theme Toggle (Light/Dark Mode) ─── */
(function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;
  
  // Load saved theme
  const isSavedLight = localStorage.getItem('theme') === 'light';
  if (isSavedLight) {
    document.body.classList.add('light-mode');
    toggleBtn.innerHTML = `<i data-lucide="sun" class="w-5 h-5 theme-icon"></i>`;
  } else {
    toggleBtn.innerHTML = `<i data-lucide="moon" class="w-5 h-5 theme-icon"></i>`;
  }
  if(window.lucide) lucide.createIcons();

  // Toggle theme
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    
    // Save preference
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    // Grab the current SVG
    const currentIcon = toggleBtn.querySelector('svg') || toggleBtn.querySelector('i');
    
    // Animate icon switch
    gsap.to(currentIcon, {
      rotation: 180, scale: 0, duration: 0.3, onComplete: () => {
        toggleBtn.innerHTML = `<i data-lucide="${isLight ? 'sun' : 'moon'}" class="w-5 h-5 theme-icon"></i>`;
        if(window.lucide) lucide.createIcons();
        const newIcon = toggleBtn.querySelector('svg');
        if(newIcon) gsap.fromTo(newIcon, { rotation: -180, scale: 0 }, { rotation: 0, scale: 1, duration: 0.3, ease: "back.out(1.5)" });
      }
    });
  });
})();
