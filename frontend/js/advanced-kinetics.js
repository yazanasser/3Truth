/**
 * advanced-kinetics.js
 * 10 Advanced Animation Modules applied globally.
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof gsap === 'undefined') return;



  // 2. Loading Matrix Rain (Fires briefly on load)
  const matrixCanvas = document.createElement('canvas');
  matrixCanvas.style.position = 'fixed';
  matrixCanvas.style.top = '0';
  matrixCanvas.style.left = '0';
  matrixCanvas.style.width = '100vw';
  matrixCanvas.style.height = '100vh';
  matrixCanvas.style.pointerEvents = 'none';
  matrixCanvas.style.zIndex = '100';
  matrixCanvas.style.opacity = '0.3';
  document.body.appendChild(matrixCanvas);
  
  const ctx = matrixCanvas.getContext('2d');
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
  const chars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const drops = Array(Math.floor(matrixCanvas.width / 20)).fill(0);
  
  let matrixInterval = setInterval(() => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    ctx.fillStyle = '#2FEECC';
    ctx.font = '15px monospace';
    
    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * 20, drops[i] * 20);
      if (drops[i] * 20 > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }, 33);
  
  // Fade out matrix after 1.5 seconds
  gsap.to(matrixCanvas, { opacity: 0, duration: 1, delay: 1.5, onComplete: () => { clearInterval(matrixInterval); matrixCanvas.remove(); } });

  // 3. Glitch Overdrive (.kinet-glitch)
  document.querySelectorAll('.kinet-glitch').forEach(el => {
    setInterval(() => {
      if (Math.random() > 0.8) {
        gsap.to(el, { x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10, textShadow: "4px 0 #ff00ea, -4px 0 #00ffff", duration: 0.05, yoyo: true, repeat: 3, onComplete: () => {
          gsap.set(el, { x: 0, y: 0, textShadow: "none" });
        }});
      }
    }, 2000);
  });

  // 4. Elastic Scroll Reveal (.kinet-elastic-reveal)
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.utils.toArray('.kinet-elastic-reveal').forEach(el => {
      gsap.fromTo(el, 
        { y: 150, opacity: 0, scale: 0.8 }, 
        { 
          y: 0, opacity: 1, scale: 1, 
          duration: 1.5, ease: "elastic.out(1, 0.5)",
          scrollTrigger: { trigger: el, start: "top 90%" }
        }
      );
    });
  }

  // 5. Continuous Icon Orbit (.kinet-orbit)
  document.querySelectorAll('.kinet-orbit').forEach(el => {
    gsap.to(el, {
      rotation: 360,
      transformOrigin: "center 50px",
      duration: 5,
      ease: "linear",
      repeat: -1
    });
  });

  // 6. Neon Breathing Shadows (.kinet-breathe)
  document.querySelectorAll('.kinet-breathe').forEach(el => {
    gsap.to(el, {
      boxShadow: "0 0 30px var(--accent-1), 0 0 10px var(--accent-3)",
      duration: 1.5,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  });

  // 7. Magnetic Text Spread (.kinet-text-spread)
  document.querySelectorAll('.kinet-text-spread').forEach(el => {
    el.addEventListener('mouseenter', () => gsap.to(el, { letterSpacing: "4px", duration: 0.4, ease: "back.out(2)" }));
    el.addEventListener('mouseleave', () => gsap.to(el, { letterSpacing: "normal", duration: 0.4, ease: "power2.out" }));
  });

  // 8. 3D Flip Entrances (.kinet-flip)
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.utils.toArray('.kinet-flip').forEach(el => {
      gsap.fromTo(el, 
        { rotationY: 180, opacity: 0, scale: 0.5 }, 
        { 
          rotationY: 0, opacity: 1, scale: 1, 
          duration: 1.2, ease: "back.out(1.2)",
          scrollTrigger: { trigger: el, start: "top 85%" }
        }
      );
    });
  }

  // 9. Scramble Code Effect (.kinet-scramble)
  document.querySelectorAll('.kinet-scramble').forEach(el => {
    const originalText = el.innerText;
    el.addEventListener('mouseenter', () => {
      let temp = originalText.split('');
      let iter = 0;
      let interval = setInterval(() => {
        el.innerText = temp.map((char, i) => {
          if (i < iter) return originalText[i];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        iter += 1;
        if (iter > originalText.length) clearInterval(interval);
      }, 30);
    });
  });

  // 10. Parallax Depth Distortion (.kinet-parallax)
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    
    document.querySelectorAll('.kinet-parallax').forEach(el => {
      const depth = el.getAttribute('data-depth') || 20;
      gsap.to(el, { x: x * depth, y: y * depth, duration: 0.5, ease: "power2.out" });
    });
  });

});
