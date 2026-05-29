/* payment.js — Logic and animations for the Payment page */

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Parse URL parameters for plan
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get('plan');

  // Check auth and plan
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'signin.html';
      return;
    }
    if (!plan) {
      window.location.href = 'pricing.html';
      return;
    }

    // Direct Bypass for Free plan — update in Firestore and redirect instantly!
    if (plan.toLowerCase() === 'free') {
      const mobilePlanDisplay = document.getElementById('mobile-plan-display');
      if (mobilePlanDisplay) mobilePlanDisplay.textContent = 'Activating Basic Plan...';
      
      try {
        await firebase.firestore().collection("users").doc(user.uid).set({
          plan: 'Free',
          scans_used: 0
        }, { merge: true });
        window.location.href = 'detector.html';
      } catch (e) {
        console.error("Free plan activation error:", e);
        window.location.href = 'detector.html';
      }
      return;
    }

    // Update display texts based on plan
    const planNameDisplay = document.getElementById('plan-name-display');
    const planPriceDisplay = document.getElementById('plan-price-display');
    const mobilePlanDisplay = document.getElementById('mobile-plan-display');

    if (planNameDisplay) planNameDisplay.textContent = plan + ' Plan';
    if (mobilePlanDisplay) mobilePlanDisplay.textContent = 'Initializing ' + plan + ' Plan';
    if (planPriceDisplay) {
      const price = plan.toLowerCase() === 'pro' ? '$1' : '$5';
      planPriceDisplay.innerHTML = `${price}<span class="text-xs text-gray-600"> ONE-TIME</span>`;
    }
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

  // --- STRIPE INTEGRATION ---
  // IMPORTANT: Replace this placeholder with your REAL Stripe Publishable Key (starts with pk_live_ or pk_test_)
  // You must register for an account at stripe.com to process real money.
  const stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx');
  const elements = stripe.elements();

  // Create a Stripe Card Element with custom dark-mode styling
  const style = {
    base: {
      color: '#ffffff',
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontSmoothing: 'antialiased',
      fontSize: '14px',
      '::placeholder': {
        color: '#6b7280'
      }
    },
    invalid: {
      color: '#f87171',
      iconColor: '#f87171'
    }
  };

  const card = elements.create('card', { 
    style: style,
    hidePostalCode: true 
  });
  
  card.mount('#card-element');

  // Real-time validation errors
  card.on('change', function(event) {
    const displayError = document.getElementById('card-errors');
    if (event.error) {
      displayError.textContent = event.error.message;
    } else {
      displayError.textContent = '';
    }
    
    // Auto-update the holographic preview
    const previewNumber = document.getElementById('preview-number');
    if (previewNumber && event.brand) {
       // Just update the visual state to show it's working
       previewNumber.textContent = event.brand.toUpperCase() + " ••••";
    }
  });

  const inputName = document.getElementById('input-name');
  if (inputName) {
    inputName.addEventListener('input', () => {
      const previewName = document.getElementById('preview-name');
      if (previewName) previewName.textContent = inputName.value.toUpperCase() || "CARDHOLDER NAME";
    });
  }

  // Form submission
  const form = document.getElementById('payment-form');
  const errorMsg = document.getElementById('error-msg');
  const submitBtn = document.getElementById('submit-btn');
  const submitText = document.getElementById('submit-text');
  const submitIcon = document.getElementById('submit-icon');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      errorMsg.classList.add('hidden');
      errorMsg.textContent = '';

      // Loading state
      submitBtn.disabled = true;
      submitText.textContent = 'Processing Payment...';
      submitIcon.setAttribute('data-lucide', 'loader-2');
      submitIcon.classList.add('animate-spin');
      if (window.lucide) window.lucide.createIcons();

      // Ask Stripe to create a secure token from the card
      const {token, error} = await stripe.createToken(card, {
        name: inputName.value
      });

      if (error) {
        // Validation failed! Card declined or invalid details.
        const displayError = document.getElementById('card-errors');
        displayError.textContent = error.message;
        
        submitBtn.disabled = false;
        submitText.textContent = 'Pay Now';
        submitIcon.setAttribute('data-lucide', 'lock');
        submitIcon.classList.remove('animate-spin');
        if (window.lucide) window.lucide.createIcons();
      } else {
        // Token successfully created! The card is real and validated by Stripe!
        // In a real production app, you would send this token to your NodeJS backend to charge the card.
        // For this frontend, we will proceed to activate their plan.
        
        try {
          const user = firebase.auth().currentUser;
          if (!user) throw new Error("Not authenticated");

          // Update user plan in Firestore securely and reset their scans
          await firebase.firestore().collection("users").doc(user.uid).set({
            plan: plan,
            scans_used: 0
          }, { merge: true });

          // Redirect to the detector interface
          window.location.href = 'detector.html';
        } catch (err) {
          errorMsg.textContent = err.message;
          errorMsg.classList.remove('hidden');
          
          submitBtn.disabled = false;
          submitText.textContent = 'Pay Now';
          submitIcon.setAttribute('data-lucide', 'lock');
          submitIcon.classList.remove('animate-spin');
          if (window.lucide) window.lucide.createIcons();
        }
      }
    });
  }
});
