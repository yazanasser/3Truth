/* js/motion.js — Premium Motion System v2
   30 interaction techniques with prefers-reduced-motion support.
   Uses: GSAP, ScrollTrigger, Lenis, VanillaTilt.
   Performant: only transforms & opacity on the GPU path. */

(function () {
  "use strict";

  const IS_MOBILE = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  // ── Reduced Motion Gate ──────────────────────────────────────────
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (REDUCED) {
    document.documentElement.classList.add("reduced-motion");
    // Still allow basic content to show (remove opacity:0 from reveal classes)
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll(".reveal-up, .reveal-blur, .reveal-scale, .clip-reveal, .reveal-mask").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
        el.style.clipPath = "none";
        el.style.filter = "none";
      });
    });
    return; // Exit — no animations
  }

  document.addEventListener("DOMContentLoaded", () => {
    const G = typeof gsap !== "undefined" ? gsap : null;
    const ST = typeof ScrollTrigger !== "undefined" ? ScrollTrigger : null;
    if (!G) return;
    if (ST) G.registerPlugin(ST);

    // ════════════════════════════════════════════════════════════════
    //  1. LENIS SMOOTH SCROLLING
    // ════════════════════════════════════════════════════════════════
    if (typeof Lenis !== "undefined" && !IS_MOBILE) {
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        smoothTouch: false,
      });
      window.lenis = lenis;

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      // Sync Lenis with GSAP ScrollTrigger
      if (ST) {
        lenis.on("scroll", ST.update);
        G.ticker.add((time) => lenis.raf(time * 1000));
        G.ticker.lagSmoothing(0);
      }
    }

    // ════════════════════════════════════════════════════════════════
    //  2. SCROLL-LINKED PROGRESS BAR
    // ════════════════════════════════════════════════════════════════
    let progressBar = document.getElementById("scroll-progress");
    if (!progressBar) {
      progressBar = document.createElement("div");
      progressBar.id = "scroll-progress";
      document.body.prepend(progressBar);
    }
    // Use GSAP ScrollTrigger for smoother progress (defers to cinematic.js if present)
    if (ST && progressBar && !progressBar.dataset.motionInit) {
      progressBar.dataset.motionInit = "1";
      progressBar.style.transformOrigin = "left";
      progressBar.style.transform = "scaleX(0)";
      G.to(progressBar, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: document.documentElement,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.3,
        },
      });
    }



    // ════════════════════════════════════════════════════════════════
    //  4. SPOTLIGHT FOLLOW (desktop only)
    // ════════════════════════════════════════════════════════════════
    if (!IS_MOBILE && !document.getElementById("spotlight")) {
      const spot = document.createElement("div");
      spot.id = "spotlight";
      document.body.appendChild(spot);

      let sx = -400,
        sy = -400,
        tx = -400,
        ty = -400;
      document.addEventListener(
        "mousemove",
        (e) => {
          tx = e.clientX;
          ty = e.clientY;
        },
        { passive: true },
      );

      (function tickSpot() {
        sx += (tx - sx) * 0.08;
        sy += (ty - sy) * 0.08;
        spot.style.transform = `translate3d(${sx - 400}px, ${sy - 400}px, 0)`;
        requestAnimationFrame(tickSpot);
      })();
    }

    // ════════════════════════════════════════════════════════════════
    //  5–6. SCROLL REVEAL (.reveal-up) + SCALE REVEAL (.reveal-scale)
    // ════════════════════════════════════════════════════════════════
    if (ST) {
      G.utils.toArray(".reveal-up").forEach((el) => {
        G.fromTo(
          el,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });

      G.utils.toArray(".reveal-scale").forEach((el) => {
        G.fromTo(
          el,
          { scale: 0.92, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.9,
            ease: "expo.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });
    }

    // ════════════════════════════════════════════════════════════════
    //  7. CLIP-PATH REVEAL
    // ════════════════════════════════════════════════════════════════
    if (ST) {
      G.utils.toArray(".clip-reveal, .reveal-mask").forEach((el) => {
        G.fromTo(
          el,
          { clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)" },
          {
            clipPath: "polygon(0 0%, 100% 0%, 100% 100%, 0 100%)",
            duration: 1.2,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 82%" },
          },
        );
      });
    }

    // ════════════════════════════════════════════════════════════════
    //  8. BLUR-TO-SHARP (.reveal-blur)
    // ════════════════════════════════════════════════════════════════
    if (ST) {
      G.utils.toArray(".reveal-blur").forEach((el) => {
        G.fromTo(
          el,
          { opacity: 0, filter: "blur(12px)" },
          {
            opacity: 1,
            filter: "blur(0px)",
            duration: 1,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 88%" },
          },
        );
      });
    }

    // ════════════════════════════════════════════════════════════════
    //  9. DIRECTIONAL IMAGE MASK (.mask-left-reveal)
    // ════════════════════════════════════════════════════════════════
    if (ST) {
      G.utils.toArray(".mask-left-reveal").forEach((el) => {
        G.fromTo(
          el,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            duration: 1.4,
            ease: "power3.inOut",
            scrollTrigger: { trigger: el, start: "top 80%" },
          },
        );
      });
    }

    // ════════════════════════════════════════════════════════════════
    //  10. CHARACTER-LEVEL TEXT (.char-reveal)
    // ════════════════════════════════════════════════════════════════
    G.utils.toArray(".char-reveal").forEach((el) => {
      const text = el.textContent;
      el.textContent = "";
      el.setAttribute("aria-label", text);
      const frag = document.createDocumentFragment();
      text.split("").forEach((ch) => {
        const span = document.createElement("span");
        span.textContent = ch === " " ? "\u00A0" : ch;
        span.style.cssText =
          "display:inline-block;opacity:0;transform:translateY(30px) rotateX(40deg);will-change:transform,opacity;";
        frag.appendChild(span);
      });
      el.appendChild(frag);

      const trigger = ST
        ? { scrollTrigger: { trigger: el, start: "top 85%" } }
        : {};
      G.to(el.querySelectorAll("span"), {
        y: 0,
        rotateX: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.025,
        ease: "back.out(1.5)",
        ...trigger,
      });
    });

    // ════════════════════════════════════════════════════════════════
    //  11. WORD-BY-WORD TEXT (.word-reveal)
    // ════════════════════════════════════════════════════════════════
    G.utils.toArray(".word-reveal").forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      el.setAttribute("aria-label", words.join(" "));
      const frag = document.createDocumentFragment();
      words.forEach((w, i) => {
        if (i > 0) frag.appendChild(document.createTextNode(" "));
        const span = document.createElement("span");
        span.textContent = w;
        span.style.cssText =
          "display:inline-block;opacity:0;transform:translateY(20px);will-change:transform,opacity;";
        frag.appendChild(span);
      });
      el.appendChild(frag);

      const trigger = ST
        ? { scrollTrigger: { trigger: el, start: "top 88%" } }
        : {};
      G.to(el.querySelectorAll("span"), {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.04,
        ease: "power3.out",
        ...trigger,
      });
    });

    // ════════════════════════════════════════════════════════════════
    //  12. STAGGERED TEXT LINES (.stagger-lines)
    // ════════════════════════════════════════════════════════════════
    if (ST) {
      G.utils.toArray(".stagger-lines").forEach((container) => {
        const children = Array.from(container.children);
        G.set(children, { y: 30, opacity: 0 });
        G.to(children, {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: container, start: "top 85%" },
        });
      });
    }

    // ════════════════════════════════════════════════════════════════
    //  13. PARALLAX ELEMENTS (.parallax-layer)
    // ════════════════════════════════════════════════════════════════
    if (ST) {
      G.utils.toArray(".parallax-layer").forEach((el) => {
        const speed = parseFloat(el.dataset.speed || "0.3");
        G.to(el, {
          y: () => speed * -120,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    }

    // ════════════════════════════════════════════════════════════════
    //  14. MAGNETIC BUTTONS (enhanced, doesn't conflict with cinematic.js)
    // ════════════════════════════════════════════════════════════════
    // Already handled by cinematic.js section 5. Skip duplicate.

    // ════════════════════════════════════════════════════════════════
    //  15. HOVER ELEVATION (.hover-lift)
    // ════════════════════════════════════════════════════════════════
    document.querySelectorAll(".hover-lift").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        G.to(el, {
          y: -6,
          boxShadow: "0 12px 30px rgba(47, 238, 204,0.15)",
          duration: 0.3,
          ease: "power2.out",
        });
      });
      el.addEventListener("mouseleave", () => {
        G.to(el, {
          y: 0,
          boxShadow: "0 0 0 transparent",
          duration: 0.4,
          ease: "power2.out",
        });
      });
    });

    // ════════════════════════════════════════════════════════════════
    //  16. CARD TILT (vanilla-tilt initialization)
    // ════════════════════════════════════════════════════════════════
    if (typeof VanillaTilt !== "undefined" && !IS_MOBILE) {
      document
        .querySelectorAll("[data-tilt]:not([data-vt-init])")
        .forEach((el) => {
          el.dataset.vtInit = "1";
          VanillaTilt.init(el, {
            max: parseInt(el.dataset.tiltMax || "8"),
            speed: parseInt(el.dataset.tiltSpeed || "400"),
            glare: el.hasAttribute("data-tilt-glare"),
            "max-glare": parseFloat(el.dataset.tiltMaxGlare || "0.15"),
            perspective: 1000,
          });
        });
    }

    // ════════════════════════════════════════════════════════════════
    //  17. ANIMATED BORDERS (.animated-border)
    // ════════════════════════════════════════════════════════════════
    document.querySelectorAll(".animated-border").forEach((el) => {
      // Create a rotating conic-gradient border via a pseudo-element approach
      const wrapper = document.createElement("div");
      wrapper.className = "animated-border-inner";
      wrapper.style.cssText = `
        position:absolute; inset:-1px; border-radius:inherit;
        background: conic-gradient(from 0deg, transparent, var(--accent-1), transparent, transparent);
        z-index:-1; will-change:transform;
      `;
      el.style.position = "relative";
      el.style.overflow = "visible";
      el.appendChild(wrapper);

      G.to(wrapper, { rotation: 360, duration: 4, repeat: -1, ease: "none" });
    });

    // ════════════════════════════════════════════════════════════════
    //  18. MOVING GRADIENTS (handled via CSS .moving-gradient-bg)
    // ════════════════════════════════════════════════════════════════
    // Pure CSS animation — no JS needed.

    // ════════════════════════════════════════════════════════════════
    //  19. GLASS/REFRACTION MOTION (scroll-driven blur intensify)
    // ════════════════════════════════════════════════════════════════
    if (ST) {
      G.utils.toArray(".glass-intensify").forEach((el) => {
        G.fromTo(
          el,
          { backdropFilter: "blur(4px)", background: "rgba(6, 53, 45,0.3)" },
          {
            backdropFilter: "blur(20px)",
            background: "rgba(6, 53, 45,0.7)",
            scrollTrigger: {
              trigger: el,
              start: "top 90%",
              end: "top 40%",
              scrub: true,
            },
          },
        );
      });
    }

    // ════════════════════════════════════════════════════════════════
    //  20. COUNT-UP ANIMATION (.count-up)
    // ════════════════════════════════════════════════════════════════
    window.motionCountUp = function (el, target, duration = 1.5, decimals = 1) {
      const obj = { val: 0 };
      G.to(obj, {
        val: target,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = obj.val.toFixed(decimals);
        },
      });
    };

    // ════════════════════════════════════════════════════════════════
    //  21. PROGRESS-LINE ANIMATION (.progress-animate)
    // ════════════════════════════════════════════════════════════════
    window.motionProgressBar = function (el, targetWidth, duration = 1.2) {
      G.fromTo(
        el,
        { width: "0%" },
        { width: targetWidth, duration, ease: "power3.out" },
      );
    };

    // ════════════════════════════════════════════════════════════════
    //  22. DETECTION PIPELINE ANIMATION
    // ════════════════════════════════════════════════════════════════
    window.motionDetectionPipeline = function (stages) {
      // stages = array of DOM elements representing pipeline steps
      if (!stages || !stages.length) return;
      const tl = G.timeline();
      stages.forEach((stage, i) => {
        tl.fromTo(
          stage,
          { opacity: 0.3, scale: 0.95, borderColor: "rgba(255,255,255,0.1)" },
          {
            opacity: 1,
            scale: 1,
            borderColor: "rgba(47, 238, 204,0.6)",
            duration: 0.4,
            ease: "power2.out",
          },
          i * 0.3,
        );
      });
      return tl;
    };

    // ════════════════════════════════════════════════════════════════
    //  23. DETECTION SCAN-LINE
    // ════════════════════════════════════════════════════════════════
    window.motionScanLine = function (container, duration = 2) {
      let laser = container.querySelector(".svg-laser");
      if (!laser) {
        const laserContainer = document.createElement("div");
        laserContainer.className = "svg-laser-container";
        laser = document.createElement("div");
        laser.className = "svg-laser";
        laserContainer.appendChild(laser);
        container.style.position = "relative";
        container.appendChild(laserContainer);
      }

      return G.timeline()
        .set(laser, { opacity: 1, top: 0 })
        .to(laser, { top: "100%", duration, ease: "power1.inOut" })
        .to(laser, { opacity: 0, duration: 0.3 });
    };

    // ════════════════════════════════════════════════════════════════
    //  24. SVG PATH DRAWING (.svg-draw)
    // ════════════════════════════════════════════════════════════════
    if (ST) {
      G.utils
        .toArray(
          ".svg-draw path, .svg-draw line, .svg-draw polyline, .svg-draw circle",
        )
        .forEach((path) => {
          try {
            const length = path.getTotalLength();
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;

            G.to(path, {
              strokeDashoffset: 0,
              duration: 1.5,
              ease: "power2.inOut",
              scrollTrigger: {
                trigger: path.closest("svg") || path,
                start: "top 85%",
              },
            });
          } catch (e) {
            /* not a path-like element */
          }
        });
    }

    // ════════════════════════════════════════════════════════════════
    //  25. SECTION PINNING (.pin-section)
    // ════════════════════════════════════════════════════════════════
    // Already handled by cinematic.js horizontal scroll. Skip duplicate.

    // ════════════════════════════════════════════════════════════════
    //  26. SEQUENTIAL EVIDENCE CARDS (.evidence-stagger)
    // ════════════════════════════════════════════════════════════════
    window.motionEvidenceCards = function (container) {
      const cards = container.querySelectorAll(
        ".evidence-card, [class*='evidence']",
      );
      if (!cards.length) return;
      G.set(cards, { y: 30, opacity: 0, scale: 0.97 });
      G.to(cards, {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.5,
        stagger: 0.1,
        ease: "power3.out",
      });
    };

    // ════════════════════════════════════════════════════════════════
    //  27. SPRING INTERACTIONS (.spring-click)
    // ════════════════════════════════════════════════════════════════
    document.querySelectorAll(".spring-click").forEach((el) => {
      el.addEventListener("click", () => {
        G.timeline()
          .to(el, { scale: 0.92, duration: 0.08, ease: "power2.in" })
          .to(el, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.35)" });
      });
    });

    // ════════════════════════════════════════════════════════════════
    //  28. PAGE TRANSITIONS
    // ════════════════════════════════════════════════════════════════
    let transitionOverlay = document.getElementById("page-transition");
    if (!transitionOverlay) {
      transitionOverlay = document.createElement("div");
      transitionOverlay.id = "page-transition";
      document.body.appendChild(transitionOverlay);
    }

    // Fade in on arrival
    G.fromTo(
      transitionOverlay,
      { opacity: 1 },
      { opacity: 0, duration: 0.5, ease: "power2.out" },
    );

    // ----------------------------------------------------
    // PAGE TRANSITION INTERCEPTOR
    // ----------------------------------------------------
    document.addEventListener("click", (e) => {
      const link = e.target.closest(
        'a[href]:not([target="_blank"]):not([href^="#"]):not([href^="javascript"]):not([href^="mailto"]):not([href*="signin.html"])',
      );
      if (!link) return;
      if (link.href === window.location.href) return;
      // Avoid intercepting sign-out or special handlers
      if (link.getAttribute("href") === "#") return;

      e.preventDefault();
      G.to(transitionOverlay, {
        opacity: 1,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
          window.location = link.href;
        },
      });
    });

    // ════════════════════════════════════════════════════════════════
    //  29. SKELETON-TO-CONTENT (.skeleton-reveal)
    // ════════════════════════════════════════════════════════════════
    window.motionSkeletonReveal = function (container) {
      // Remove skeleton classes and animate content in
      const skeletons = container.querySelectorAll(".skeleton-pulse");
      skeletons.forEach((s) => s.classList.remove("skeleton-pulse"));

      G.fromTo(
        container,
        { opacity: 0.4 },
        { opacity: 1, duration: 0.6, ease: "power2.out" },
      );
    };

    // ════════════════════════════════════════════════════════════════
    //  30. DATA BLUR-DECRYPT (.data-decrypt)
    //  — Numbers start blurry/scrambled and "decrypt" to the real value
    // ════════════════════════════════════════════════════════════════
    window.motionDataDecrypt = function (el, finalText, duration = 0.8) {
      const chars = "0123456789.%ABCDEF";
      let frame = 0;
      const maxFrames = Math.ceil(duration * 60);

      function tick() {
        frame++;
        const progress = frame / maxFrames;

        if (progress >= 1) {
          el.textContent = finalText;
          el.style.filter = "blur(0px)";
          return;
        }

        // Build scrambled text
        let result = "";
        for (let i = 0; i < finalText.length; i++) {
          if (i < finalText.length * progress) {
            result += finalText[i];
          } else {
            result += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        el.textContent = result;
        el.style.filter = `blur(${(1 - progress) * 4}px)`;

        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };

    if (IS_MOBILE) {
      const s = document.getElementById("spotlight");
      if (s) s.style.display = "none";
    }

    console.log(
      "[MOTION] Premium Motion System v2 loaded.",
    );
  });
})();
