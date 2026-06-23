/* payment.js — Logic and animations for the Payment page */

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  function payTr(key, vars, fallback) {
    return window._3truthI18n ? window._3truthI18n.t(key, vars, fallback) : (fallback || key);
  }

  function planDisplay(planName) {
    return window._3truthI18n && window._3truthI18n.planDisplay
      ? window._3truthI18n.planDisplay(planName)
      : `${planName} Plan`;
  }

  function planLabel(planName) {
    return window._3truthI18n && window._3truthI18n.planLabel
      ? window._3truthI18n.planLabel(planName)
      : planName;
  }

  // Parse URL parameters for plan
  const urlParams = new URLSearchParams(window.location.search);
  const planKey = (urlParams.get('plan') || '').toLowerCase();
  const PLAN_OPTIONS = {
    free: { name: 'Beta Unlimited', price: '$0' },
  pro: { name: 'Basic Beta Plan', price: '$0' },
  ultimate: { name: 'Basic Beta Plan', price: '$0' }
  };
  const selectedPlan = PLAN_OPTIONS[planKey] || { name: 'Beta Unlimited', price: '$0' };

  function updateSelectedPlanDisplays() {
    if (!selectedPlan) return;
    const planNameDisplay = document.getElementById('plan-name-display');
    const planPriceDisplay = document.getElementById('plan-price-display');
    const mobilePlanDisplay = document.getElementById('mobile-plan-display');

    if (planNameDisplay) planNameDisplay.textContent = planDisplay(selectedPlan.name);
    if (mobilePlanDisplay) {
      mobilePlanDisplay.textContent = payTr(
        'payment.initializingPlan',
        { plan: planLabel(selectedPlan.name) },
        `Initializing ${selectedPlan.name} Plan`
      );
    }
    if (planPriceDisplay) {
      planPriceDisplay.textContent = selectedPlan.price || '';
      const suffix = document.createElement('span');
      suffix.className = 'text-xs text-gray-600';
      suffix.textContent = ' BETA';
      planPriceDisplay.appendChild(suffix);
    }
  }

  window.addEventListener('3truth:languagechange', updateSelectedPlanDisplays);

  // Check auth and plan
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'signin.html';
      return;
    }
    try {
      await firebase.firestore().collection("users").doc(user.uid).set({
        plan: "Beta Unlimited",
        beta_access: true
      }, { merge: true });
    } catch (e) {
      console.warn("Beta access activation skipped:", e);
    }
    updateSelectedPlanDisplays();
  });

  // Spotlight Card Hover Effect (Replaces 3D Parallax to prevent Stripe iframe lag)
  document.querySelectorAll('.spotlight-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
  });

  // Letter Pull Up
  const titleEl = document.getElementById('payment-title');
  if (titleEl && window.initLetterPullUp) {
    const text = titleEl.textContent.trim();
    titleEl.innerHTML = '';
    text.split('').forEach(char => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.display = 'inline-block';
      span.className = 'lpu-letter';
      titleEl.appendChild(span);
    });
    initLetterPullUp(titleEl);
  }

  // Handle back button
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'pricing.html';
    });
  }

  const betaForm = document.getElementById('payment-form');
  const betaError = document.getElementById('error-msg');
  const betaSubmit = document.getElementById('submit-btn');
  const betaSubmitText = document.getElementById('submit-text');
  const betaSubmitIcon = document.getElementById('submit-icon');
  if (betaError) {
    betaError.textContent = 'Beta v is free and unlimited. Paid subscriptions are locked, and no card is required.';
    betaError.classList.remove('hidden', 'bg-red-500/10', 'border-red-500/30', 'text-red-500');
    betaError.classList.add('flex', 'bg-[#2FEECC]/10', 'border', 'border-[#2FEECC]/40', 'text-[#2FEECC]');
  }
  if (betaSubmitText) betaSubmitText.textContent = 'Go To Detector';
  if (betaSubmitIcon) betaSubmitIcon.setAttribute('data-lucide', 'unlock');
  if (betaSubmit) betaSubmit.disabled = false;
  if (betaForm) {
    betaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = firebase.auth().currentUser;
      if (user) {
        try {
          const IS_BETA_LOCKED = true; // Toggle this to false when ready to unlock monthly subscriptions

          if (IS_BETA_LOCKED) {
            await firebase.firestore().collection("users").doc(user.uid).set({
              plan: "Beta Unlimited",
              beta_access: true
            }, { merge: true });
          } else {
            // Real Monthly Subscription Logic
            const now = new Date();
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            await firebase.firestore().collection("users").doc(user.uid).set({
              plan: selectedPlan.name,
              subscription_status: "active",
              billing_cycle: "monthly",
              current_period_start: firebase.firestore.Timestamp.fromDate(now),
              current_period_end: firebase.firestore.Timestamp.fromDate(nextMonth),
              auto_renew: true
            }, { merge: true });

            // Note: Integrate actual payment gateway (like local processor API) before marking active in production.
          }
        } catch (err) {
          console.warn("Subscription sync skipped:", err);
        }
      }
      window.location.href = 'detector.html';
    });
  }
  if (window.lucide) window.lucide.createIcons();
});
