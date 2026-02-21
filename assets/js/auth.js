/**
 * HealthClouda — Authentication Logic
 * ─────────────────────────────────────────────────────────────
 * Handles login form submission, logout, and protecting
 * pages that require authentication.
 *
 * REQUIRES: config.js and api.js loaded before this file.
 * ─────────────────────────────────────────────────────────────
 */


// ── Protect a page (redirect to login if not authed) ────────
function hc_requireAuth() {
  const token = hc_getAccessToken();
  if (!token) {
    window.location.href = '/public/signin.html';
  }
}


// ── Logout ───────────────────────────────────────────────────
function hc_logout() {
  hc_clearTokens();
  window.location.href = '/public/signin.html';
}


// ── Wire up the main signin form ─────────────────────────────
// Called on signin.html only
function hc_initSigninForm() {
  const form  = document.getElementById('signinForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn   = document.getElementById('signinBtn');
    const error = document.getElementById('signinError');

    btn.textContent   = 'Signing in...';
    btn.disabled      = true;
    error.textContent = '';

    try {
      const res = await apiPost(HC_CONFIG.ENDPOINTS.LOGIN, {
        email:    document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
      });

      hc_saveTokens({
        access:  res.access,
        refresh: res.refresh,
        user:    res.user,
      });

      // Redirect based on user role
      const redirect = HC_CONFIG.ROLE_REDIRECTS[res.user?.role];
      window.location.href = redirect || '/public/index.html';

    } catch (err) {
      error.textContent = err.message || 'Invalid email or password.';
      btn.textContent   = 'Sign In';
      btn.disabled      = false;
    }
  });
}


// ── Wire up the forgot password form ─────────────────────────
function hc_initForgotForm() {
  const form = document.getElementById('forgotForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn   = document.getElementById('submitBtn');
    const error = document.getElementById('forgotError');
    const email = document.getElementById('email').value.trim();

    btn.textContent   = 'Sending...';
    btn.disabled      = true;
    btn.style.opacity = '0.75';
    error.textContent = '';

    try {
      await publicApiRequest(HC_CONFIG.ENDPOINTS.FORGOT_PW, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      // Store email safely — never put in URL
      sessionStorage.setItem('hc_reset_email', email);
      window.location.href = './check-email.html';

    } catch (err) {
      error.textContent   = err.message || 'Failed to send reset email. Please try again.';
      btn.textContent     = 'Reset Password';
      btn.disabled        = false;
      btn.style.opacity   = '1';
    }
  });
}


// ── Wire up the OTP verify form ───────────────────────────────
function hc_initOtpForm(redirectOnSuccess = './reset-password.html') {
  const form      = document.getElementById('otpForm');
  const otpInput  = document.getElementById('otpInput');
  const verifyBtn = document.getElementById('verifyBtn');
  const otpError  = document.getElementById('otpError');
  const OTP_LEN   = 6;

  if (!form || !otpInput) return;

  // Show email from sessionStorage
  const resetEmail = sessionStorage.getItem('hc_reset_email');
  const emailDisplay = document.getElementById('sentEmailDisplay');
  if (resetEmail && emailDisplay) emailDisplay.textContent = resetEmail;

  // OTP box rendering
  const boxes = document.querySelectorAll('.otp-box');
  function renderBoxes() {
    const val       = otpInput.value;
    const focused   = document.activeElement === otpInput;
    const cursorPos = val.length;

    boxes.forEach((box, i) => {
      const char   = val[i] || '';
      const filled = char !== '';
      const active = focused && (i === cursorPos || (cursorPos === OTP_LEN && i === OTP_LEN - 1));
      const empty  = active && !filled;
      box.textContent = char;
      box.classList.toggle('filled', filled && !active);
      box.classList.toggle('active', active);
      box.classList.toggle('empty',  empty);
    });

    verifyBtn.disabled   = val.length !== OTP_LEN;
    otpError.textContent = '';
  }

  otpInput.addEventListener('input', () => {
    otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, OTP_LEN);
    renderBoxes();
  });
  otpInput.addEventListener('focus', renderBoxes);
  otpInput.addEventListener('blur',  renderBoxes);
  document.getElementById('otpWrapper')?.addEventListener('click', () => otpInput.focus());

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = otpInput.value;
    if (code.length !== OTP_LEN) return;

    verifyBtn.textContent = 'Verifying...';
    verifyBtn.disabled    = true;
    otpError.textContent  = '';

    try {
      await publicApiRequest(HC_CONFIG.ENDPOINTS.VERIFY_OTP, {
        method: 'POST',
        body: JSON.stringify({ code, email: resetEmail }),
      });
      window.location.href = redirectOnSuccess;
    } catch (err) {
      otpError.textContent  = err.message || 'Invalid code. Please try again.';
      verifyBtn.textContent = 'Verify';
      verifyBtn.disabled    = false;
    }
  });

  // Resend countdown
  let seconds = 30;
  const timerDisplay = document.getElementById('timerDisplay');
  const resendLink   = document.getElementById('resendLink');
  let countdownInterval = null;

  function startCountdown() {
    resendLink?.classList.add('disabled');
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      seconds--;
      if (timerDisplay) timerDisplay.textContent = `(0:${seconds.toString().padStart(2, '0')})`;
      if (seconds <= 0) {
        clearInterval(countdownInterval);
        if (timerDisplay) timerDisplay.textContent = '';
        resendLink?.classList.remove('disabled');
      }
    }, 1000);
  }
  startCountdown();

  resendLink?.addEventListener('click', async function () {
    if (this.classList.contains('disabled')) return;
    seconds = 30;
    if (timerDisplay) timerDisplay.textContent = '(0:30)';
    startCountdown();
    try {
      await publicApiRequest(HC_CONFIG.ENDPOINTS.RESEND_OTP, {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail }),
      });
    } catch (err) {
      if (otpError) otpError.textContent = 'Failed to resend. Please try again.';
    }
  });
}


// ── Wire up the reset password form ──────────────────────────
function hc_initResetForm(redirectOnSuccess = './password-success.html') {
  const form = document.getElementById('resetForm');
  if (!form) return;

  const pwInput       = document.getElementById('password');
  const confirmInput  = document.getElementById('confirmPassword');
  const strengthBar   = document.getElementById('strengthBar');
  const strengthLabel = document.getElementById('strengthLabel');
  const matchMsg      = document.getElementById('matchMsg');
  const updateBtn     = document.getElementById('updateBtn');

  function checkStrength(pw) {
    const checks = {
      len:     pw.length >= 8,
      upper:   /[A-Z]/.test(pw),
      num:     /[0-9]/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw),
    };
    document.getElementById('req-len')?.classList.toggle('met',     checks.len);
    document.getElementById('req-upper')?.classList.toggle('met',   checks.upper);
    document.getElementById('req-num')?.classList.toggle('met',     checks.num);
    document.getElementById('req-special')?.classList.toggle('met', checks.special);

    const score  = Object.values(checks).filter(Boolean).length;
    const colors = ['#dc2626','#f97316','#eab308','#16a34a'];
    const labels = ['Weak','Fair','Good','Strong'];
    const widths = ['25%','50%','75%','100%'];

    if (pw.length === 0) {
      if (strengthBar)  strengthBar.style.width = '0';
      if (strengthLabel) strengthLabel.textContent = '';
    } else {
      if (strengthBar) {
        strengthBar.style.width      = widths[score - 1] || '25%';
        strengthBar.style.background = colors[score - 1] || colors[0];
      }
      if (strengthLabel) {
        strengthLabel.textContent = labels[score - 1] || 'Weak';
        strengthLabel.style.color = colors[score - 1] || colors[0];
      }
    }
    return score === 4;
  }

  function validateForm() {
    const pw      = pwInput.value;
    const confirm = confirmInput.value;
    const strong  = checkStrength(pw);

    if (confirm.length > 0) {
      if (pw === confirm) {
        matchMsg.textContent = '✓ Passwords match';
        matchMsg.className   = 'match-msg ok';
      } else {
        matchMsg.textContent = '✗ Passwords do not match';
        matchMsg.className   = 'match-msg err';
      }
    } else {
      matchMsg.textContent = '';
      matchMsg.className   = 'match-msg';
    }
    updateBtn.disabled = !(strong && pw === confirm && confirm.length > 0);
  }

  pwInput?.addEventListener('input',      validateForm);
  confirmInput?.addEventListener('input', validateForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = document.getElementById('resetError');
    updateBtn.textContent   = 'Updating...';
    updateBtn.disabled      = true;
    updateBtn.style.opacity = '0.75';
    if (error) error.textContent = '';

    try {
      const email = sessionStorage.getItem('hc_reset_email');
      await publicApiRequest(HC_CONFIG.ENDPOINTS.RESET_PW, {
        method: 'POST',
        body: JSON.stringify({
          email,
          password:  pwInput.value,
          password2: confirmInput.value,
        }),
      });
      sessionStorage.removeItem('hc_reset_email');
      window.location.href = redirectOnSuccess;
    } catch (err) {
      if (error) error.textContent = err.message || 'Failed to update password. Please try again.';
      updateBtn.textContent   = 'Update Password';
      updateBtn.disabled      = false;
      updateBtn.style.opacity = '1';
    }
  });
}


// ── Card fade-in (shared across all auth pages) ──────────────
function hc_fadeInCard() {
  const card = document.querySelector('.signin-card');
  if (!card) return;
  card.style.opacity    = '0';
  card.style.transform  = 'translateY(24px)';
  card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  requestAnimationFrame(() => {
    card.style.opacity   = '1';
    card.style.transform = 'translateY(0)';
  });
}


// ── Password toggle (shared across all auth pages) ───────────
function hc_makePasswordToggle(btnId, iconId, inputId) {
  const btn   = document.getElementById(btnId);
  const icon  = document.getElementById(iconId);
  const input = document.getElementById(inputId);
  if (!btn || !icon || !input) return;

  btn.addEventListener('click', () => {
    const show   = input.type === 'password';
    input.type   = show ? 'text' : 'password';
    icon.innerHTML = show
      ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  });
}