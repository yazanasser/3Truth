/* signin.js — Logic and animations for the Sign In page with EmailJS OTP */

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- OTP Backend API Configuration ---
  const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5001' 
    : 'https://api.3truth.com:5002';

  function authTr(key, vars, fallback) {
    return window._3truthI18n ? window._3truthI18n.t(key, vars, fallback) : (fallback || key);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  // Check if user is already logged in — show message instead of redirecting
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      const authCard = document.getElementById('auth-card');
      if (authCard) {
        const alreadySignedIn = escapeHtml(authTr('auth.alreadySignedIn', null, 'Already Signed In'));
        const loggedInAs = escapeHtml(authTr('auth.loggedInAs', null, 'You are logged in as'));
        const goDetector = escapeHtml(authTr('auth.goDetector', null, 'Go to Detector'));
        const signOut = escapeHtml(authTr('auth.signOut', null, 'Sign Out'));
        authCard.innerHTML = `
          <div class="text-center py-12">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-[#2FEECC]/10 border border-[#2FEECC]/40 rounded-3xl mb-6 shadow-[0_0_25px_rgba(47,238,204,0.15)]">
              <i data-lucide="check-circle" class="text-[#2FEECC] w-10 h-10"></i>
            </div>
            <h2 class="text-3xl md:text-4xl font-black tracking-tighter mb-4">${alreadySignedIn}</h2>
            <p class="text-gray-400 mb-8">${loggedInAs} <strong class="text-white font-mono">${escapeHtml(user.email)}</strong></p>
            <div class="flex flex-col gap-4">
              <a href="/scan" class="w-full py-4 text-black bg-[var(--accent-1)] font-black rounded-2xl hover:bg-[var(--accent-1)]/80 transition-all text-center text-lg shadow-[0_0_25px_rgba(47,238,204,0.3)]">
                ${goDetector}
              </a>
              <button id="signout-btn" class="w-full py-4 bg-white/5 border border-white/10 text-gray-300 font-bold rounded-2xl hover:bg-[#2FEECC]/10 hover:border-[#2FEECC]/40 hover:text-[#2FEECC] transition-all text-center">
                ${signOut}
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
      const isArabic = window._3truthI18n && window._3truthI18n.isArabic();

      if (isArabic) {
        titleEl.setAttribute('dir', 'rtl');
        text.split(' ').forEach(word => {
          const span = document.createElement('span');
          span.textContent = word + '\u00A0';
          span.style.display = 'inline-block';
          span.className = 'lpu-letter';
          titleEl.appendChild(span);
        });
      } else {
        titleEl.removeAttribute('dir');
        text.split('').forEach(char => {
          const span = document.createElement('span');
          span.textContent = char === ' ' ? '\u00A0' : char;
          span.style.display = 'inline-block';
          span.className = 'lpu-letter';
          titleEl.appendChild(span);
        });
      }
      if (window.initLetterPullUp) {
        window.initLetterPullUp(titleEl);
      }
    }
  }

  // Initialize page title animation
  animateTitle(authTr('auth.secureAccess', null, 'Secure Access'));

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

  function showAlert(el) {
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');
  }

  function hideAlert(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');
  }
  const submitIcon = document.getElementById('submit-icon');
  const subtitleSpan = document.getElementById('auth-subtitle');

  // Application State
  let currentPhase = 'email'; // 'email' or 'otp'
  let generatedOTP = null;
  let userEmail = '';
  let resendCountdown = 60;
  let countdownInterval = null;

  function refreshAuthCopy() {
    if (currentPhase === 'otp') {
      animateTitle(authTr('auth.verifyIdentity', null, 'Verify Identity'));
      if (subtitleSpan) {
        subtitleSpan.textContent = authTr('auth.enterCodeSent', { email: userEmail }, `Enter the 6-digit code sent to ${userEmail}`);
      }
      if (submitText && !submitBtn.disabled) {
        submitText.textContent = authTr('auth.verifyEnter', null, 'Verify & Enter');
      }
      if (resendBtn && resendBtn.disabled) {
        resendBtn.textContent = authTr('auth.resendIn', { seconds: resendCountdown }, `Resend in ${resendCountdown}s`);
      } else if (resendBtn) {
        resendBtn.textContent = authTr('auth.resendCode', null, 'Resend Code');
      }
    } else {
      animateTitle(authTr('auth.secureAccess', null, 'Secure Access'));
      if (subtitleSpan) {
        subtitleSpan.textContent = authTr('auth.verifyEmail', null, 'Verify your email to enter');
      }
      if (submitText && !submitBtn.disabled) {
        submitText.textContent = authTr('auth.sendCode', null, 'Send Code');
      }
    }
  }

  window.addEventListener('3truth:languagechange', refreshAuthCopy);

  // Generate a deterministic password from the email address
  function getDeterministicPassword(email) {
    const prefix = "3truth_Sec_";
    const base64Part = btoa(email.toLowerCase().trim()).replace(/=/g, '');
    return `${prefix}${base64Part}_2026!`;
  }

  // Start Resend Countdown Timer
  function startResendCountdown() {
    resendCountdown = 60;
    resendBtn.disabled = true;
    resendBtn.textContent = authTr('auth.resendIn', { seconds: resendCountdown }, `Resend in ${resendCountdown}s`);
    
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      resendCountdown--;
      if (resendCountdown <= 0) {
        clearInterval(countdownInterval);
        resendBtn.disabled = false;
        resendBtn.textContent = authTr('auth.resendCode', null, 'Resend Code');
      } else {
        resendBtn.textContent = authTr('auth.resendIn', { seconds: resendCountdown }, `Resend in ${resendCountdown}s`);
      }
    }, 1000);
  }

  // Send OTP via Backend API
  async function sendOTPCode(email) {
    // Generate secure 6-digit code
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otp_code: generatedOTP })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to send OTP email");
      }
      
      successMsg.textContent = authTr('auth.codeSent', { email }, `Verification code sent successfully to ${email}`);
      showAlert(successMsg);
      return true;
    } catch (err) {
      console.error("OTP Send Error:", err);
      const errMsgDetail = err.message || "Server error while sending email.";
      errorMsg.textContent = authTr('auth.emailJsError', { detail: errMsgDetail }, `Email Sending Error: ${errMsgDetail}. Make sure SMTP is configured in backend.`);
      showAlert(errorMsg);
      return false;
    }
  }

  // Submit/Send Action Handler
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear alerts
      hideAlert(errorMsg);
      errorMsg.textContent = '';
      hideAlert(successMsg);
      successMsg.textContent = '';

      if (currentPhase === 'email') {
        const email = emailInput.value.trim();
        if (!email) return;

        userEmail = email;

        // Visual loading state
        submitBtn.disabled = true;
        submitText.textContent = authTr('auth.sending', null, 'Sending...');
        const currentIcon = document.getElementById('submit-icon');
        if (currentIcon) {
          currentIcon.setAttribute('data-lucide', 'loader-2');
          currentIcon.classList.add('animate-spin');
        }
        if (window.lucide) window.lucide.createIcons();

        // Send OTP
        const isSent = await sendOTPCode(userEmail);
        
        submitBtn.disabled = false;
        const iconAfterSend = document.getElementById('submit-icon');
        if (iconAfterSend) {
          iconAfterSend.classList.remove('animate-spin');
        }

        if (isSent) {
          // Transition to OTP phase
          currentPhase = 'otp';
          emailSection.classList.add('hidden');
          otpSection.classList.remove('hidden');
          otpInput.required = true;
          otpInput.focus();

          // Animate title and subtitles beautifully
          animateTitle(authTr('auth.verifyIdentity', null, 'Verify Identity'));
          if (subtitleSpan) {
            subtitleSpan.textContent = authTr('auth.enterCodeSent', { email: userEmail }, `Enter the 6-digit code sent to ${userEmail}`);
          }

          // Update submit button
          submitText.textContent = authTr('auth.verifyEnter', null, 'Verify & Enter');
          const iconToLogin = document.getElementById('submit-icon');
          if (iconToLogin) {
            iconToLogin.setAttribute('data-lucide', 'log-in');
          }
          if (window.lucide) window.lucide.createIcons();

          // Start resend timer
          startResendCountdown();
        } else {
          if (!errorMsg.textContent) {
            errorMsg.textContent = authTr('auth.failedDispatch', null, 'Failed to dispatch verification code. Please try again.');
            showAlert(errorMsg);
          }
          submitText.textContent = authTr('auth.sendCode', null, 'Send Code');
          const iconToSend = document.getElementById('submit-icon');
          if (iconToSend) {
            iconToSend.setAttribute('data-lucide', 'send');
          }
          if (window.lucide) window.lucide.createIcons();
        }

      } else if (currentPhase === 'otp') {
        const enteredOTP = otpInput.value.trim();
        
        if (!enteredOTP) {
          errorMsg.textContent = authTr('auth.enterCode', null, 'Please enter the verification code.');
          showAlert(errorMsg);
          return;
        }

        if (enteredOTP !== generatedOTP) {
          errorMsg.textContent = authTr('auth.invalidCode', null, 'Invalid verification code. Please check and try again.');
          showAlert(errorMsg);
          return;
        }

        // OTP Verified successfully! Now sign in/register in Firebase Auth
        submitBtn.disabled = true;
        submitText.textContent = authTr('auth.authenticating', null, 'Authenticating...');
        const iconAuthenticating = document.getElementById('submit-icon');
        if (iconAuthenticating) {
          iconAuthenticating.setAttribute('data-lucide', 'loader-2');
          iconAuthenticating.classList.add('animate-spin');
        }
        if (window.lucide) window.lucide.createIcons();

        const password = getDeterministicPassword(userEmail);

        try {
          // Attempt Login
          const userCredential = await firebase.auth().signInWithEmailAndPassword(userEmail, password);
          
             const user = userCredential.user;
             if (user) {
               await firebase.firestore().collection("users").doc(user.uid).set({
                 plan: "Beta Unlimited",
                 beta_access: true
               }, { merge: true });
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

              await firebase.firestore().collection("users").doc(user.uid).set({
                email: userEmail,
                plan: "Beta Unlimited",
                beta_access: true,
                scans_used: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true });

              window.location.href = 'detector.html';
            } catch (signupError) {
              console.error("Firebase Automatic Signup Error:", signupError);
              if (signupError.code === 'auth/email-already-in-use') {
                errorMsg.textContent = authTr('auth.errors.legacy', null, 'This account was created with a legacy password. Please contact support to migrate to password-less login.');
              } else {
                errorMsg.textContent = getAuthErrorMessage(signupError.code);
              }
              showAlert(errorMsg);
              resetAuthButtonState();
            }
          } else {
            console.error("Firebase Login Error:", authError);
            errorMsg.textContent = getAuthErrorMessage(authError.code);
            showAlert(errorMsg);
            resetAuthButtonState();
          }
        }
      }
    });
  }

  // Resend Button Action
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      hideAlert(errorMsg);
      hideAlert(successMsg);
      
      resendBtn.disabled = true;
      const isSent = await sendOTPCode(userEmail);
      if (isSent) {
        startResendCountdown();
      } else {
        resendBtn.disabled = false;
        errorMsg.textContent = authTr('auth.failedResend', null, 'Failed to resend code. Please try again.');
        showAlert(errorMsg);
      }
    });
  }

  function resetAuthButtonState() {
    submitBtn.disabled = false;
    submitText.textContent = authTr('auth.verifyEnter', null, 'Verify & Enter');
    const iconReset = document.getElementById('submit-icon');
    if (iconReset) {
      iconReset.setAttribute('data-lucide', 'log-in');
      iconReset.classList.remove('animate-spin');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  function getAuthErrorMessage(code) {
    switch (code) {
      case 'auth/invalid-email': return authTr('auth.errors.invalidEmail', null, 'Invalid email address.');
      case 'auth/user-disabled': return authTr('auth.errors.disabled', null, 'This user account has been disabled.');
      case 'auth/too-many-requests': return authTr('auth.errors.tooMany', null, 'Too many attempts. Please try again later.');
      case 'auth/operation-not-allowed': return authTr('auth.errors.methodDisabled', null, 'Authentication method is currently disabled.');
      default: return authTr('auth.errors.default', null, 'An error occurred during authentication. Please try again.');
    }
  }
});
