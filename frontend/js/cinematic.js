/* cinematic.js - GSAP Cinematic Engine v2.0 — ALL pages
   No preloader. Smooth scroll. Maximum visual impact. */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof gsap !== "undefined") {
    const plugins = [
      window.ScrollTrigger,
      window.TextPlugin,
      window.MotionPathPlugin,
    ].filter(Boolean);
    if (plugins.length) gsap.registerPlugin(...plugins);
  } else {
    console.warn("GSAP not loaded. Cinematic effects disabled.");
    return;
  }

  // ========================================
  // 1. SMOOTH SCROLL (Native) - Disabled in favor of Lenis in motion.js
  // document.documentElement.style.scrollBehavior = "smooth";

  // ========================================
  // 2. INJECT GLOBAL UI ELEMENTS
  // ========================================
  if (!document.getElementById("scroll-progress")) {
    const elements = `
      <div id="scroll-progress" style="width:100%;"></div>
    `;
    document.body.insertAdjacentHTML("afterbegin", elements);
  }

  // Remove any leftover preloader
  const oldPreloader = document.getElementById("preloader");
  if (oldPreloader) oldPreloader.remove();

  // ========================================
  // 3. GRAND ENTRANCE SEQUENCE (No preloader)
  // ========================================
  const entranceTL = gsap.timeline({ defaults: { ease: "power4.out" } });

  // Navbar slides in (top fixed bar)
  const topNav = document.querySelector(".fixed.top-0");
  if (topNav) {
    gsap.set(topNav, { y: -100, opacity: 0 });
    entranceTL.to(
      topNav,
      { y: 0, opacity: 1, duration: 1, ease: "elastic.out(1, 0.6)" },
      0.1,
    );
  }

  // Hero elements cascade in
  if (document.querySelector(".hero-elem")) {
    gsap.set(".hero-elem", { y: 80, opacity: 0, scale: 0.95 });
    entranceTL.to(
      ".hero-elem",
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1.2,
        stagger: 0.15,
        ease: "expo.out",
      },
      0.2,
    );
  }

  // Hero subtitle
  if (document.querySelector(".hero-sub")) {
    gsap.set(".hero-sub", { y: 40, opacity: 0 });
    entranceTL.to(
      ".hero-sub",
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out",
      },
      0.5,
    );
  }

  // Hero title character-by-character shimmer
  const heroTitle = document.querySelector(".hero-title");
  if (heroTitle) {
    entranceTL.fromTo(
      heroTitle,
      { backgroundSize: "200% 200%", backgroundPosition: "100% 0%" },
      { backgroundPosition: "0% 100%", duration: 2, ease: "sine.inOut" },
      0.6,
    );
  }

  // Auth cards (signin/signup)
  if (document.getElementById("auth-card")) {
    gsap.set("#auth-card", { y: 60, opacity: 0, scale: 0.95 });
    entranceTL.to(
      "#auth-card",
      { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: "expo.out" },
      0.2,
    );
  }

  // Payment card
  if (document.getElementById("payment-card")) {
    gsap.set("#payment-card", { y: 60, opacity: 0, scale: 0.95 });
    entranceTL.to(
      "#payment-card",
      { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: "expo.out" },
      0.3,
    );
  }

  // ========================================
  // 5. MAGNETIC BUTTONS (Enhanced)
  // ========================================
  document
    .querySelectorAll(".btn-magnetic, .btn-glass, .tab-btn")
    .forEach((btn) => {
      let rect;
      btn.addEventListener("mouseenter", () => {
        rect = btn.getBoundingClientRect();
      });
      btn.addEventListener("mousemove", (e) => {
        if (!rect) rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.4,
          ease: "power2.out",
        });
        const span = btn.querySelector("span");
        if (span)
          gsap.to(span, {
            x: x * 0.1,
            y: y * 0.1,
            duration: 0.4,
            ease: "power2.out",
          });
      });
      btn.addEventListener("mouseleave", () => {
        rect = null;
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.8,
          ease: "elastic.out(1, 0.3)",
        });
        const span = btn.querySelector("span");
        if (span)
          gsap.to(span, {
            x: 0,
            y: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.3)",
          });
      });
    });

  // ========================================
  // 6. AURORA PARALLAX + PULSE (Optimized via rAF)
  // ========================================
  const auroraBlobs = document.querySelectorAll(".aurora-blob");
  if (auroraBlobs.length > 0) {
    let winW = window.innerWidth;
    let winH = window.innerHeight;
    window.addEventListener(
      "resize",
      () => {
        winW = window.innerWidth;
        winH = window.innerHeight;
      },
      { passive: true },
    );

    let targetX = 0,
      targetY = 0;
    let currentX = 0,
      currentY = 0;
    let driftTime = 0;
    let pointerActive = false;
    let pointerTimer;

    window.addEventListener(
      "mousemove",
      (e) => {
        pointerActive = true;
        targetX = (e.clientX / winW - 0.5) * 60;
        targetY = (e.clientY / winH - 0.5) * 60;
        clearTimeout(pointerTimer);
        pointerTimer = setTimeout(() => {
          pointerActive = false;
        }, 900);
      },
      { passive: true },
    );

    let lastAuroraTime = 0;
    function updateAurora(time) {
      requestAnimationFrame(updateAurora);
      if (time - lastAuroraTime < 33) return; // ~30fps throttle
      lastAuroraTime = time;

      driftTime += 0.01;
      const autoX =
        Math.sin(driftTime * 0.85) * 34 + Math.sin(driftTime * 0.26) * 18;
      const autoY =
        Math.cos(driftTime * 0.72) * 26 + Math.sin(driftTime * 0.34) * 14;
      const desiredX = pointerActive ? targetX : autoX;
      const desiredY = pointerActive ? targetY : autoY;

      currentX += (desiredX - currentX) * 0.05; // smooth lag
      currentY += (desiredY - currentY) * 0.05;

      if (auroraBlobs[0])
        auroraBlobs[0].style.transform = `translate3d(${currentX * 2}px, ${currentY * 2}px, 0)`;
      if (auroraBlobs[1])
        auroraBlobs[1].style.transform = `translate3d(${-currentX * 1.5}px, ${-currentY * 1.5}px, 0)`;
      if (auroraBlobs[2])
        auroraBlobs[2].style.transform = `translate3d(${currentX * 0.8}px, ${-currentY * 2}px, 0)`;
    }
    requestAnimationFrame(updateAurora);

    gsap.to(auroraBlobs, {
      scale: 1.2,
      opacity: 0.7,
      duration: 5,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      stagger: 1.5,
    });
  }

  // ========================================
  // 7. 3D TILT HOVER ON CARDS (REMOVED)
  // ========================================

  // ========================================
  // 8. SCROLL PROGRESS BAR
  // ========================================
  if (document.getElementById("scroll-progress")) {
    gsap.to("#scroll-progress", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
    });
  }

  // ========================================
  // 9. SCROLL-TRIGGERED REVEALS (Global)
  // ========================================
  gsap.utils.toArray(".scroll-reveal").forEach((section) => {
    gsap.fromTo(
      section,
      { y: 80, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 88%",
        },
      },
    );
  });

  // Staggered children reveal for sections with .stagger-children
  gsap.utils.toArray(".stagger-children").forEach((container) => {
    const children = container.children;
    gsap.fromTo(
      children,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: container,
          start: "top 85%",
        },
      },
    );
  });

  // ========================================
  // 10. TEXT SPLIT FADE ANIMATION
  // ========================================
  function processChunked(items, processItem, delay = 15) {
    let i = 0;
    const idleCb =
      window.requestIdleCallback || ((cb) => setTimeout(cb, delay));
    function next() {
      if (i >= items.length) return;
      processItem(items[i++]);
      idleCb(next);
    }
    idleCb(next);
  }

  const splitTexts = Array.from(document.querySelectorAll(".split-text-fade"));
  processChunked(
    splitTexts,
    (el) => {
      const text = el.textContent;
      const words = text.split(" ");
      el.textContent = "";

      // Use DocumentFragment for faster DOM insertion
      const frag = document.createDocumentFragment();
      words.forEach((word, index) => {
        if (index > 0) frag.appendChild(document.createTextNode(" "));
        const span = document.createElement("span");
        span.className = "inline-block opacity-0 translate-y-4";
        span.style.transition = "none";
        span.textContent = word;
        frag.appendChild(span);
      });
      el.appendChild(frag);

      gsap.to(el.querySelectorAll("span"), {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.03,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
        },
      });
    },
    20,
  );

  // ========================================
  // 11. HOLOGRAPHIC DATA PARTICLES
  // ========================================
  function spawnParticles(container, count, winH) {
    const colors = ["var(--accent-1)", "var(--accent-2)", "var(--accent-3)"];
    const frag = document.createDocumentFragment();
    const particles = [];

    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 3 + 1;
      const height = Math.random() * 30 + 5;

      p.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${height}px;
        background: ${color};
        opacity: ${Math.random() * 0.5 + 0.2};
        border-radius: 999px;
        top: ${Math.random() * 120}%;
        left: ${Math.random() * 100}%;
        will-change: transform;
      `;
      frag.appendChild(p);
      particles.push(p);
    }

    container.appendChild(frag);

    particles.forEach((p) => {
      gsap.to(p, {
        y: -(winH + 200),
        x: `+=${(Math.random() - 0.5) * 100}`,
        duration: Math.random() * 12 + 6,
        repeat: -1,
        ease: "none",
        delay: Math.random() * -12,
        force3D: true,
      });
    });
  }

  function createParticles() {
    const winH = window.innerHeight;
    const idleCb = window.requestIdleCallback || ((cb) => setTimeout(cb, 15));

    // 1. Global body particles
    if (!document.getElementById("holo-particles")) {
      const container = document.createElement("div");
      container.id = "holo-particles";
      container.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:hidden;";
      document.body.appendChild(container);
      spawnParticles(container, 40, winH);
    }

    // 2. Inject into all horizontal panels (phases) using asynchronous chunking
    const panels = Array.from(
      document.querySelectorAll(".horizontal-panel, .panel-particles"),
    );
    let currentIndex = 0;

    function processNextPanel() {
      if (currentIndex >= panels.length) return;
      const panel = panels[currentIndex++];
      let pCont = panel.classList.contains("panel-particles")
        ? panel
        : panel.querySelector(".panel-particles");
      if (!pCont) {
        pCont = document.createElement("div");
        pCont.className =
          "panel-particles absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-80";
        panel.appendChild(pCont);
      } else {
        pCont.innerHTML = "";
      }
      spawnParticles(pCont, 15, winH);

      // Yield to the browser before processing the next panel
      idleCb(processNextPanel);
    }

    // Start processing panels
    idleCb(processNextPanel);
  }

  // Defer particle generation to free up main thread during initial load
  const initIdleCb = window.requestIdleCallback || ((cb) => setTimeout(cb, 50));
  initIdleCb(createParticles);

  // ========================================
  // 12. FLOATING GRID GLOW ON SCROLL
  // ========================================
  const gridOverlay = document.querySelector(".grid-overlay");
  if (gridOverlay) {
    let winW = window.innerWidth;
    let winH = window.innerHeight;
    window.addEventListener(
      "resize",
      () => {
        winW = window.innerWidth;
        winH = window.innerHeight;
      },
      { passive: true },
    );

    let gridTargetX = winW * 0.5;
    let gridTargetY = winH * 0.5;
    let gridCurrentX = gridTargetX;
    let gridCurrentY = gridTargetY;
    let gridTime = 0;
    let gridPointerActive = false;
    let gridPointerTimer;

    window.addEventListener(
      "mousemove",
      (e) => {
        gridPointerActive = true;
        gridTargetX = e.clientX;
        gridTargetY = e.clientY;
        clearTimeout(gridPointerTimer);
        gridPointerTimer = setTimeout(() => {
          gridPointerActive = false;
        }, 900);
      },
      { passive: true },
    );

    let lastGridTime = 0;
    function updateGridGlow(time) {
      requestAnimationFrame(updateGridGlow);
      if (time - lastGridTime < 33) return; // ~30fps throttle
      lastGridTime = time;

      gridTime += 0.008;
      const autoX = winW * (0.5 + Math.sin(gridTime * 0.9) * 0.28);
      const autoY = winH * (0.5 + Math.cos(gridTime * 0.7) * 0.24);
      const desiredX = gridPointerActive ? gridTargetX : autoX;
      const desiredY = gridPointerActive ? gridTargetY : autoY;

      gridCurrentX += (desiredX - gridCurrentX) * 0.04;
      gridCurrentY += (desiredY - gridCurrentY) * 0.04;

      gridOverlay.style.setProperty("--grid-x", `${gridCurrentX}px`);
      gridOverlay.style.setProperty("--grid-y", `${gridCurrentY}px`);
    }

    requestAnimationFrame(updateGridGlow);
  }

  // ========================================
  // 13. CINEMATIC SECTION TRANSITIONS
  // ========================================
  gsap.utils.toArray("section").forEach((section) => {
    // Add a subtle scale + blur entrance to every section
    if (
      !section.classList.contains("scroll-reveal") &&
      !section.querySelector(".hero-elem")
    ) {
      gsap.fromTo(
        section,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 90%",
          },
        },
      );
    }
  });

  // ========================================
  // 14. HORIZONTAL SCROLL SETUP (if exists)
  // ========================================
  const idleCallback =
    window.requestIdleCallback || ((cb) => setTimeout(cb, 50));

  idleCallback(() => {
    const hTrack = document.getElementById("horizontal-track");
    const hTrigger = document.getElementById("horizontal-trigger");
    if (hTrack && hTrigger) {
      const panels = Array.from(hTrack.querySelectorAll(".horizontal-panel"));
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
            invalidateOnRefresh: true,
          },
        });

        // Animate panel content on scroll (chunked)
        if (typeof processChunked === "function") {
          processChunked(
            panels,
            (panel) => {
              const inner = panel.querySelector(".panel-inner");
              if (inner) {
                gsap.fromTo(
                  inner,
                  { x: 50, opacity: 0 },
                  {
                    x: 0,
                    opacity: 1,
                    duration: 1,
                    scrollTrigger: {
                      trigger: panel,
                      containerAnimation: horizontalTween,
                      start: "left 80%",
                      toggleActions: "play none none reverse",
                    },
                  },
                );
              }
            },
            15,
          );
        }
      }
    }

    // ========================================
    // 15. COUNTER ANIMATIONS (if exists)
    // ========================================
    gsap.utils.toArray(".counter-anim").forEach((counter) => {
      const target = parseFloat(counter.getAttribute("data-target"));
      gsap.to(counter, {
        innerHTML: target,
        duration: 2.5,
        ease: "power3.out",
        snap: { innerHTML: 0.1 },
        scrollTrigger: {
          trigger: counter,
          start: "top 85%",
        },
      });
    });
  });

  // ========================================
  // 16. SCRAMBLE HOVER EFFECT
  // ========================================
  if (typeof initScrambleHover === "function") {
    initScrambleHover(".scramble-hover");
  }

  // ========================================
  // 17. MARQUEE CONSTANT SPEED
  // ========================================
  const marquee = document.querySelector(".marquee-content");
  if (marquee) {
    marquee.style.animationDuration = "30s";
  }

  // ========================================
  // 17. PARALLAX DEPTH LAYERS
  // ========================================
  gsap.utils.toArray(".parallax-card").forEach((card) => {
    const speed = parseFloat(card.getAttribute("data-speed") || "1");
    gsap.to(card, {
      y: () => (1 - speed) * 120,
      ease: "none",
      scrollTrigger: {
        trigger: card,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });

  // ========================================
  // 18. SVG LINE DRAW (if exists)
  // ========================================
  idleCallback(() => {
    const scrollGlow = document.getElementById("scroll-glow");
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
          scrub: 1,
        },
      });
    }
  });

  // ========================================
  // 19. CODE CARD 3D ROTATION (if exists)
  // ========================================
  const codeCard = document.getElementById("code-card");
  const codeGlow = document.getElementById("code-glow");
  if (codeCard) {
    gsap.fromTo(
      codeCard,
      { rotationY: -15, rotationX: 10, scale: 0.85, opacity: 0 },
      {
        rotationY: 0,
        rotationX: 0,
        scale: 1,
        opacity: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "#code-card-container",
          start: "top 80%",
          end: "center center",
          scrub: 1,
        },
      },
    );
    if (codeGlow) {
      gsap.to(codeGlow, {
        opacity: 0.6,
        scale: 1.3,
        scrollTrigger: {
          trigger: "#code-card-container",
          start: "top 80%",
          end: "center center",
          scrub: true,
        },
      });
    }
  }

  // ========================================
  // 20. CTA SECTION EPIC REVEAL
  // ========================================
  const ctaSection = document.querySelector("section.py-32.text-center");
  if (ctaSection) {
    gsap.fromTo(
      ctaSection,
      { scale: 0.85, opacity: 0, rotationX: 5 },
      {
        scale: 1,
        opacity: 1,
        rotationX: 0,
        duration: 1.5,
        ease: "expo.out",
        scrollTrigger: {
          trigger: ctaSection,
          start: "top 85%",
        },
      },
    );
  }

  // ========================================
  // 21. INIT ALL CARDS 3D HOVER
  // ========================================
  if (typeof initParallaxCard === "function") {
    document
      .querySelectorAll(".spotlight-card, .holo-panel")
      .forEach((card) => {
        initParallaxCard(card);
      });
  }

  // ========================================
  // 22. SIDEBAR ANIMATION LOGIC
  // ========================================
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenuClose = document.getElementById("mobile-menu-close");

  if (mobileMenu && mobileMenuBtn && mobileMenuClose) {
    // Make sure it is displayed but transformed off-screen
    mobileMenu.classList.remove("hidden");
    mobileMenu.classList.add("flex", "flex-col", "translate-x-full");

    mobileMenuBtn.addEventListener("click", () => {
      mobileMenu.classList.remove("translate-x-full");
    });
    mobileMenuClose.addEventListener("click", () => {
      mobileMenu.classList.add("translate-x-full");
    });
  }

  // ========================================
  // 23. AUTH-AWARE NAVBAR BUTTONS & DYNAMIC PLAN BADGES
  // ========================================
  if (typeof firebase !== "undefined" && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      // Desktop login button
      const desktopLoginBtn = document.getElementById("nav-login-btn");
      // Sidebar login link
      const sidebarLoginLink = document.getElementById("sidebar-login-link");

      if (user) {
        // User is signed in — swap LOGIN to SIGN OUT
        if (desktopLoginBtn) {
          desktopLoginBtn.textContent = window._3truthI18n
            ? window._3truthI18n.t("ui.signOut", null, "SIGN OUT")
            : "SIGN OUT";
          desktopLoginBtn.href = "#";
          desktopLoginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            firebase
              .auth()
              .signOut()
              .then(() => window.location.reload());
          });
        }

        if (sidebarLoginLink) {
          sidebarLoginLink.textContent = window._3truthI18n
            ? window._3truthI18n.t("ui.signOut", null, "SIGN OUT")
            : "SIGN OUT";
          sidebarLoginLink.href = "#";
          sidebarLoginLink.addEventListener("click", (e) => {
            e.preventDefault();
            firebase
              .auth()
              .signOut()
              .then(() => window.location.reload());
          });
        }
      }
    });
  }

  console.log("[CINEMATIC] v2.0 Engine loaded — All systems operational.");
});
