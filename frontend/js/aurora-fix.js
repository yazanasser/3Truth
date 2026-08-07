(() => {
  const blobs = document.querySelectorAll(".aurora-blob");
  if (!blobs.length) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let driftTime = 0;
  let pointerActive = false;
  let pointerTimer;

  window.addEventListener(
    "mousemove",
    (event) => {
      pointerActive = true;
      targetX = (event.clientX / window.innerWidth - 0.5) * 60;
      targetY = (event.clientY / window.innerHeight - 0.5) * 60;
      clearTimeout(pointerTimer);
      pointerTimer = setTimeout(() => {
        pointerActive = false;
      }, 900);
    },
    { passive: true },
  );

  function animateAurora() {
    driftTime += 0.01;
    const autoX =
      Math.sin(driftTime * 0.8) * 34 + Math.sin(driftTime * 0.23) * 18;
    const autoY =
      Math.cos(driftTime * 0.65) * 26 + Math.sin(driftTime * 0.31) * 14;
    const desiredX = pointerActive ? targetX : autoX;
    const desiredY = pointerActive ? targetY : autoY;

    currentX += (desiredX - currentX) * 0.045;
    currentY += (desiredY - currentY) * 0.045;

    blobs.forEach((blob, index) => {
      const depth = 0.42 + index * 0.18;
      blob.style.transform = `translate3d(${currentX * depth}px, ${currentY * depth}px, 0)`;
    });

    requestAnimationFrame(animateAurora);
  }

  requestAnimationFrame(animateAurora);
})();
