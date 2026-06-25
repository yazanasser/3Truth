/* signin.js — Auth modal logic (initialized by nav-state.js openAuthModal) */

window._initSigninModal = function(modalRoot) {
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

  // Scope all DOM queries to the modal
  const $ = (sel) => modalRoot.querySelector(sel);

  const authCard = $('#auth-card');
  const form = $('#signin-form');
  const emailSection = $('#email-section');
  const emailInput = $('#signin-email');
  const otpSection = $('#otp-section');
  const otpInput = $('#signin-otp');
  const resendBtn = $('#resend-btn');
  const errorMsg = $('#error-msg');
  const successMsg = $('#success-msg');
  const submitBtn = $('#submit-btn');
  const submitText = $('#submit-text');
  const submitIcon = $('#submit-icon');
  const subtitleSpan = $('#auth-subtitle');
  const titleEl = $('#auth-title');

  // Check if user is already logged in
  if (typeof firebase !== 'undefined') {
    const user = firebase.auth().currentUser;
    if (user && authCard) {
      const alreadySignedIn = escapeHtml(authTr('auth.alreadySignedIn', null, 'Already Signed In'));
      const loggedInAs = escapeHtml(authTr('auth.loggedInAs', null, 'You are logged in as'));
      const goDetector = escapeHtml(authTr('auth.goDetector', null, 'Go to Detector'));
      const signOut = escapeHtml(authTr('auth.signOut', null, 'Sign Out'));
      authCard.innerHTML = `
        <div class="text-center py-12">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-[#2FEECC]/10 border border-[#2FEECC]/40 rounded-3xl mb-6 shadow-[0_0_25px_rgba(47,238,204,0.15)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2FEECC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
          </div>
          <h2 class="text-3xl md:text-4xl font-black tracking-tighter mb-4">${alreadySignedIn}</h2>
          <p class="text-gray-400 mb-8">${loggedInAs} <strong class="text-white font-mono">${escapeHtml(user.email)}</strong></p>
          <div class="flex flex-col gap-4">
            <a href="detector.html" id="modal-go-detector" class="w-full py-4 text-black bg-[var(--accent-1)] font-black rounded-2xl hover:bg-[var(--accent-1)]/80 transition-all text-center text-lg shadow-[0_0_25px_rgba(47,238,204,0.3)]">
              ${goDetector}
            </a>
            <button id="modal-signout-btn" class="w-full py-4 bg-white/5 border border-white/10 text-gray-300 font-bold rounded-2xl hover:bg-[#2FEECC]/10 hover:border-[#2FEECC]/40 hover:text-[#2FEECC] transition-all text-center">
              ${signOut}
            </button>
          </div>
        </div>
      `;
      const goBtn = $('#modal-go-detector');
      if (goBtn) {
        goBtn.addEventListener('click', (e) => {
          e.preventDefault();
          modalRoot.remove();
          window.location.href = 'detector.html';
        });
      }
      const signoutBtn = $('#modal-signout-btn');
      if (signoutBtn) {
        signoutBtn.addEventListener('click', () => {
          firebase.auth().signOut().then(() => window.location.reload());
        });
      }
      return;
    }
  }

  // Application State
  let currentPhase = 'email';
  let generatedOTP = null;
  let userEmail = '';
  let resendCountdown = 60;
  let countdownInterval = null;

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

  function updateTitle(text) {
    if (titleEl) titleEl.textContent = text;
  }

  function updateSubtitle(text) {
    if (subtitleSpan) subtitleSpan.textContent = text;
  }

  function setSubmitIcon(iconType) {
    if (!submitIcon) return;
    const icons = {
      send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
      login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
      loader: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>'
    };
    submitIcon.innerHTML = icons[iconType] || icons.send;
    if (iconType === 'loader') {
      submitIcon.style.animation = 'spin 1s linear infinite';
    } else {
      submitIcon.style.animation = '';
    }
  }

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
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  function resetAuthButtonState() {
    submitBtn.disabled = false;
    submitText.textContent = authTr('auth.verifyEnter', null, 'Verify & Enter');
    setSubmitIcon('login');
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

  // Form submit handler
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      hideAlert(errorMsg);
      errorMsg.textContent = '';
      hideAlert(successMsg);
      successMsg.textContent = '';

      if (currentPhase === 'email') {
        const email = emailInput.value.trim();
        if (!email) return;

        userEmail = email;

        submitBtn.disabled = true;
        submitText.textContent = authTr('auth.sending', null, 'Sending...');
        setSubmitIcon('loader');

        const isSent = await sendOTPCode(userEmail);
        
        submitBtn.disabled = false;

        if (isSent) {
          currentPhase = 'otp';
          emailSection.classList.add('hidden');
          otpSection.classList.remove('hidden');
          otpInput.required = true;
          otpInput.focus();

          updateTitle(authTr('auth.verifyIdentity', null, 'Verify Identity'));
          updateSubtitle(authTr('auth.enterCodeSent', { email: userEmail }, `Enter the 6-digit code sent to ${userEmail}`));
          submitText.textContent = authTr('auth.verifyEnter', null, 'Verify & Enter');
          setSubmitIcon('login');
          startResendCountdown();
        } else {
          if (!errorMsg.textContent) {
            errorMsg.textContent = authTr('auth.failedDispatch', null, 'Failed to dispatch verification code. Please try again.');
            showAlert(errorMsg);
          }
          submitText.textContent = authTr('auth.sendCode', null, 'Send Code');
          setSubmitIcon('send');
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

        submitBtn.disabled = true;
        submitText.textContent = authTr('auth.authenticating', null, 'Authenticating...');
        setSubmitIcon('loader');

        const password = getDeterministicPassword(userEmail);

        try {
          const userCredential = await firebase.auth().signInWithEmailAndPassword(userEmail, password);
          
          const user = userCredential.user;
          if (user) {
            await firebase.firestore().collection("users").doc(user.uid).set({
              plan: "Beta Unlimited",
              beta_access: true
            }, { merge: true });
          }

          // Close modal and reload to reflect signed-in state
          modalRoot.remove();
          window.location.reload();
        } catch (authError) {
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

              modalRoot.remove();
              window.location.reload();
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
};
