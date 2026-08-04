// Kinet.js Advanced Initialization
// Adds extreme spring physics to cards, and buttons (Custom cursor removed per request)

document.addEventListener("DOMContentLoaded", function () {
  // 3. Add kinetics to ALL cards, EXCEPT uno-cards which have their own hover state
  document.querySelectorAll('.spotlight-card, .holo-panel, .tab-btn').forEach(card => {
    if (card.classList.contains('uno-card')) return;

    card.addEventListener('mouseenter', () => {
      card.style.transition = "transform 0.1s ease-out, box-shadow 0.3s ease-out";
      card.style.boxShadow = "0 20px 40px rgba(47, 238, 204, 0.4)";
    });
    
    card.addEventListener('mousemove', (e) => {
      // 3D Tilt removed per user request
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = "box-shadow 0.6s ease-out";
      card.style.boxShadow = "none";
    });
  });
});
