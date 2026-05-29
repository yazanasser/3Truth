/* signin.js — Logic and animations for the Sign In page with EmailJS OTP */

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- EmailJS Credentials ---
  // If you have a Public Key, configure it here:
  const EMAILJS_PUBLIC_KEY = "0ESSxwLxdIwZp8yvr"; // Standard public key or left editable
  const EMAILJS_SERVICE_ID = "service_cqw3gb9";
  const EMAILJS_TEMPLATE_ID = "template_b80liqh";

  // Initialize EmailJS if public key is available
  if (typeof emailjs !== "undefined" && EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
    emailjs.init({
      publicKey: EMAILJS_PUBLIC_KEY,
    });
  }

  // Check if user is already logged in — show message instead of redirecting
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      const authCard = document.getElementById('auth-card');
      if (authCard) {
        authCard.innerHTML = `
          <div class="text-center py-12">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-3xl mb-6 shadow-[0_0_25px_rgba(34,197,94,0.15)]">
              <i data-lucide="check-circle" class="text-green-400 w-10 h-10"></i>
            </div>
            <h2 class="text-3xl md:text-4xl font-black tracking-tighter mb-4">Already Signed In</h2>
            <p class="text-gray-400 mb-8">You are logged in as <strong class="text-white font-mono">${user.email}</strong></p>
            <div class="flex flex-col gap-4">
              <a href="detector.html" class="w-full py-4 text-black bg-[var(--accent-1)] font-black rounded-2xl hover:bg-[var(--accent-1)]/80 transition-all text-center text-lg shadow-[0_0_25px_rgba(0,229,255,0.3)]">
                Go to Detector
              </a>
              <button id="signout-btn" class="w-full py-4 bg-white/5 border border-white/10 text-gray-300 font-bold rounded-2xl hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all text-center">
                Sign Out
              </button>
            </div>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        const signoutBtn = document.getElementById('signout-btn');
        if (signoutBtn) {
          signoutBtn.addEventListener('click', () => {
            firebase.auth().signOut().then(() => window.location.reload());
          });
        }
      }
    }
  });

  // Parallax / Hover effect on card
  const authCard = document.getElementById('auth-card');
  if (authCard && window.initParallaxCard) {
    window.initParallaxCard(authCard);
  }

  // Title Letter Pull-up Animation helper
  function animateTitle(text) {
    const titleEl = document.getElementById('auth-title');
    if (titleEl) {
      titleEl.innerHTML = '';
      text.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.display = 'inline-block';
        span.className = 'lpu-letter';
        titleEl.appendChild(span);
      });
      if (window.initLetterPullUp) {
        window.initLetterPullUp(titleEl);
      }
    }
  }

  // Initialize page title animation
  animateTitle("Secure Access");

  // DOM Elements
  const form = document.getElementById('signin-form');
  const emailSection = document.getElementById('email-section');
  const emailInput = document.getElementById('signin-email');
  const otpSection = document.getElementById('otp-section');
  const otpInput = document.getElementById('signin-otp');
  const resendBtn = document.getElementById('resend-btn');
  const errorMsg = document.getElementById('error-msg');
  const successMsg = document.getElementById('success-msg');
  const submitBtn = document.getElementById('submit-btn');
  const submitText = document.getElementById('submit-text');
  const submitIcon = document.getElementById('submit-icon');
  const subtitleSpan = document.getElementById('auth-subtitle');

  // Application State
  let currentPhase = 'email'; // 'email' or 'otp'
  let generatedOTP = null;
  let userEmail = '';
  let resendCountdown = 60;
  let countdownInterval = null;

  // Generate a deterministic password from the email address
  function getDeterministicPassword(email) {
    const prefix = "Aetheris_Sec_";
    const base64Part = btoa(email.toLowerCase().trim()).replace(/=/g, '');
    return `${prefix}${base64Part}_2026!`;
  }

  // Start Resend Countdown Timer
  function startResendCountdown() {
    resendCountdown = 60;
    resendBtn.disabled = true;
    resendBtn.textContent = `Resend in ${resendCountdown}s`;
    
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      resendCountdown--;
      if (resendCountdown <= 0) {
        clearInterval(countdownInterval);
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend Code";
      } else {
        resendBtn.textContent = `Resend in ${resendCountdown}s`;
      }
    }, 1000);
  }

  // Send OTP via EmailJS
  async function sendOTPCode(email) {
    // Generate secure 6-digit code
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[DEVELOPER MODE] Generated OTP for ${email}: ${generatedOTP}`);

    // Check if public key is valid or placeholder
    const isMockKey = !EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY";

    if (isMockKey) {
      console.warn("[DEVELOPER MODE] EmailJS Public Key is not set. Simulating successful send.");
      successMsg.innerHTML = `<span class="text-cyan-400">[DEV MODE]</span> Code sent! Check developer console or use: <strong class="text-white">${generatedOTP}</strong>`;
      successMsg.classList.remove('hidden');
      return true;
    }

    try {
      // Invoke EmailJS Send API with universal parameter mapping
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: email,
        email: email,
        to: email,
        user_email: email,
        recipient: email,
        otp_code: generatedOTP,
        code: generatedOTP,
        otp: generatedOTP,
        message: `Your Aetheris secure verification code is: ${generatedOTP}`
      }, EMAILJS_PUBLIC_KEY);
      
      successMsg.textContent = `Verification code sent successfully to ${email}`;
      successMsg.classList.remove('hidden');
      return true;
    } catch (err) {
      console.error("EmailJS Error:", err);
      // Display the actual error so the user knows why Gmail isn't receiving the email
      const errMsgDetail = err.text || err.message || "Please check your EmailJS Public Key configuration.";
      errorMsg.textContent = `EmailJS Error: ${errMsgDetail}. Make sure your Public Key in js/signin.js is correct.`;
      errorMsg.classList.remove('hidden');
      return false;
    }
  }

  // Submit/Send Action Handler
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear alerts
      errorMsg.classList.add('hidden');
      errorMsg.textContent = '';
      successMsg.classList.add('hidden');
      successMsg.textContent = '';

      if (currentPhase === 'email') {
        const email = emailInput.value.trim();
        if (!email) return;

        userEmail = email;

        // Visual loading state
        submitBtn.disabled = true;
        submitText.textContent = 'Sending...';
        submitIcon.setAttribute('data-lucide', 'loader-2');
        submitIcon.classList.add('animate-spin');
        if (window.lucide) window.lucide.createIcons();

        // Send OTP
        const isSent = await sendOTPCode(userEmail);
        
        submitBtn.disabled = false;
        submitIcon.classList.remove('animate-spin');

        if (isSent) {
          // Transition to OTP phase
          currentPhase = 'otp';
          emailSection.classList.add('hidden');
          otpSection.classList.remove('hidden');
          otpInput.required = true;
          otpInput.focus();

          // Animate title and subtitles beautifully
          animateTitle("Verify Identity");
          if (subtitleSpan) {
            subtitleSpan.textContent = `Enter the 6-digit code sent to ${userEmail}`;
          }

          // Update submit button
          submitText.textContent = 'Verify & Enter';
          submitIcon.setAttribute('data-lucide', 'log-in');
          if (window.lucide) window.lucide.createIcons();

          // Start resend timer
          startResendCountdown();
        } else {
          if (!errorMsg.textContent) {
            errorMsg.textContent = "Failed to dispatch verification code. Please try again.";
            errorMsg.classList.remove('hidden');
          }
          submitText.textContent = 'Send Code';
          submitIcon.setAttribute('data-lucide', 'send');
          if (window.lucide) window.lucide.createIcons();
        }

      } else if (currentPhase === 'otp') {
        const enteredOTP = otpInput.value.trim();
        
        if (!enteredOTP) {
          errorMsg.textContent = "Please enter the verification code.";
          errorMsg.classList.remove('hidden');
          return;
        }

        if (enteredOTP !== generatedOTP) {
          errorMsg.textContent = "Invalid verification code. Please check and try again.";
          errorMsg.classList.remove('hidden');
          return;
        }

        // OTP Verified successfully! Now sign in/register in Firebase Auth
        submitBtn.disabled = true;
        submitText.textContent = 'Authenticating...';
        submitIcon.setAttribute('data-lucide', 'loader-2');
        submitIcon.classList.add('animate-spin');
        if (window.lucide) window.lucide.createIcons();

        const password = getDeterministicPassword(userEmail);

        try {
          // Attempt Login
          const userCredential = await firebase.auth().signInWithEmailAndPassword(userEmail, password);
          
          if (userEmail.toLowerCase() === "yazanasser2013@gmail.com") {
             const user = userCredential.user;
             if (user) {
               await firebase.firestore().collection("users").doc(user.uid).set({
                 plan: "Ultimate"
               }, { merge: true });
             }
          }

          window.location.href = 'detector.html';
        } catch (authError) {
          // Modern Firebase Auth maps "user-not-found" and "wrong-password" to "invalid-login-credentials" to prevent email enumeration.
          // If we receive any of these errors, we treat this as a sign-up trigger.
          const isSignupTrigger = 
            authError.code === 'auth/user-not-found' || 
            authError.code === 'auth/invalid-login-credentials' || 
            authError.code === 'auth/wrong-password';

          if (isSignupTrigger) {
            try {
              const userCredential = await firebase.auth().createUserWithEmailAndPassword(userEmail, password);
              const user = userCredential.user;

              // Initialize user document in Firestore
              let initialPlan = "Free";
              if (userEmail.toLowerCase() === "yazanasser2013@gmail.com") {
                initialPlan = "Ultimate";
              }

              await firebase.firestore().collection("users").doc(user.uid).set({
                email: userEmail,
                plan: initialPlan,
                scans_used: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true });

              window.location.href = 'detector.html';
            } catch (signupError) {
              console.error("Firebase Automatic Signup Error:", signupError);
              if (signupError.code === 'auth/email-already-in-use') {
                errorMsg.textContent = "This account was created with a legacy password. Please contact support to migrate to password-less login.";
              } else {
                errorMsg.textContent = getAuthErrorMessage(signupError.code);
              }
              errorMsg.classList.remove('hidden');
              resetAuthButtonState();
            }
          } else {
            console.error("Firebase Login Error:", authError);
            errorMsg.textContent = getAuthErrorMessage(authError.code);
            errorMsg.classList.remove('hidden');
            resetAuthButtonState();
          }
        }
      }
    });
  }

  // Resend Button Action
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      errorMsg.classList.add('hidden');
      successMsg.classList.add('hidden');
      
      resendBtn.disabled = true;
      const isSent = await sendOTPCode(userEmail);
      if (isSent) {
        startResendCountdown();
      } else {
        resendBtn.disabled = false;
        errorMsg.textContent = "Failed to resend code. Please try again.";
        errorMsg.classList.remove('hidden');
      }
    });
  }

  function resetAuthButtonState() {
    submitBtn.disabled = false;
    submitText.textContent = 'Verify & Enter';
    submitIcon.setAttribute('data-lucide', 'log-in');
    submitIcon.classList.remove('animate-spin');
    if (window.lucide) window.lucide.createIcons();
  }

  function getAuthErrorMessage(code) {
    switch (code) {
      case 'auth/invalid-email': return 'Invalid email address.';
      case 'auth/user-disabled': return 'This user account has been disabled.';
      case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
      case 'auth/operation-not-allowed': return 'Authentication method is currently disabled.';
      default: return 'An error occurred during authentication. Please try again.';
    }
  }
});
