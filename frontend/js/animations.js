/* animations.js - shared browser animation helpers used by page scripts. */

if (typeof window.gsap === "undefined") {
  window.gsap = {
    registerPlugin: () => {},
    to: (target, vars = {}) => {
      if (vars.onUpdate) vars.onUpdate.call({ targets: () => [target] });
      if (vars.onComplete) vars.onComplete();
      return { kill: () => {} };
    },
    fromTo: (target, fromVars, toVars = {}) => {
      if (toVars.onUpdate) toVars.onUpdate.call({ targets: () => [target] });
      if (toVars.onComplete) toVars.onComplete();
      return { kill: () => {} };
    },
    timeline: () => ({
      to() {
        return this;
      },
      fromTo() {
        return this;
      },
      add() {
        return this;
      },
      play() {
        return this;
      },
    }),
    set: () => {},
    killTweensOf: () => {},
    utils: {
      toArray: (value) =>
        Array.from(
          typeof value === "string"
            ? document.querySelectorAll(value)
            : value || [],
        ),
    },
  };
}

if (typeof gsap !== "undefined") {
  const plugins = [
    window.ScrollTrigger,
    window.TextPlugin,
    window.MotionPathPlugin,
  ].filter(Boolean);
  if (plugins.length) gsap.registerPlugin(...plugins);
}

function initLetterPullUp(el, delay = 0) {
  if (!el) return;
  const letters = el.querySelectorAll(".lpu-letter");
  if (!letters.length) return;
  gsap.fromTo(
    letters,
    { y: "100%", opacity: 0 },
    {
      y: 0,
      opacity: 1,
      stagger: 0.03,
      duration: 0.6,
      ease: "power3.out",
      delay,
    },
  );
}

function initScrambleHover(selector) {
  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;
  const chars = "!<>-_\\\\/[]{}—=+*^?#________";

  elements.forEach((el) => {
    const originalText = el.textContent.trim();
    if (!el.dataset.original) {
      el.dataset.original = originalText;
    }

    el.addEventListener("mouseenter", () => {
      let iteration = 0;
      clearInterval(el.dataset.intervalId);

      el.dataset.intervalId = setInterval(() => {
        el.textContent = el.dataset.original
          .split("")
          .map((letter, index) => {
            if (index < iteration) {
              return el.dataset.original[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");

        if (iteration >= el.dataset.original.length) {
          clearInterval(el.dataset.intervalId);
        }

        iteration += 1;
      }, 15);
    });
  });

  window.addEventListener("3truth:languagechange", () => {
    setTimeout(() => {
      elements.forEach((el) => {
        el.dataset.original = el.textContent.trim();
      });
    }, 100);
  });
}

function initMobileMenu() {
  const btn = document.getElementById("mobile-menu-btn");
  const closeBtn = document.getElementById("mobile-menu-close");
  const menu = document.getElementById("mobile-menu");

  if (btn && closeBtn && menu) {
    btn.addEventListener("click", () => {
      menu.classList.remove("hidden");
      menu.classList.add("flex");
    });

    closeBtn.addEventListener("click", () => {
      menu.classList.add("hidden");
      menu.classList.remove("flex");
    });

    // Fix language toggle menu fly-across animation
    window.addEventListener("3truth:languagechange", () => {
      menu.classList.remove("transition-transform", "duration-300");
      setTimeout(() => {
        menu.classList.add("transition-transform", "duration-300");
      }, 50);
    });
  }
}

function initParallaxCard(el) {
  if (!el) return;
  // 3D tilt functionality has been completely removed per user request.
}

function initElasticDistortion(el) {
  if (!el) return;
  el.addEventListener("click", () => {
    const tl = gsap.timeline();
    tl.to(el, { scaleX: 0.85, scaleY: 1.15, duration: 0.1, ease: "power2.in" })
      .to(el, { scaleX: 1.15, scaleY: 0.85, duration: 0.1, ease: "power2.out" })
      .to(el, {
        scaleX: 1,
        scaleY: 1,
        duration: 0.8,
        ease: "elastic.out(1,0.4)",
      });
  });
}

document.addEventListener("DOMContentLoaded", initMobileMenu);
