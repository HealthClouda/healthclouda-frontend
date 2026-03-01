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


// ── Redirect user by role to the correct dashboard ──────────
function hc_redirectByRole(role, fallback) {
  const normalized = (role || '').toUpperCase().replace(/_/g, '');
  const path = HC_CONFIG.ROLE_REDIRECTS[normalized];
  window.location.href = path || fallback || '/public/signin.html';
}


// ── Logout ───────────────────────────────────────────────────
async function hc_logout() {
  const refresh = hc_getRefreshToken();
  try {
    if (refresh) {
      await publicApiRequest(HC_CONFIG.ENDPOINTS.LOGOUT, {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      });
    }
  } catch {
    // Logout even if the API call fails
  }
  hc_clearTokens();
  window.location.href = '/public/signin.html';
}


// ══════════════════════════════════════════════════════════════
//  General portal sign-in (patients only)
// ══════════════════════════════════════════════════════════════

function hc_initSigninForm() {
  console.log('[HC] hc_initSigninForm CALLED');
  const form = document.getElementById('signinForm');
  if (!form) { console.log('[HC] ERROR: signinForm not found'); return; }
  console.log('[HC] Form found, attaching submit listener');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[HC] FORM SUBMITTED - calling API...');

    const btn   = document.getElementById('signinBtn');
    const error = document.getElementById('signinError');

    btn.textContent   = 'Signing in...';
    btn.disabled      = true;
    error.textContent = '';

    try {
      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const loginEndpoint = `${HC_CONFIG.API_BASE_URL}${HC_CONFIG.ENDPOINTS.LOGIN}`;

      console.log('[DEBUG] Login endpoint:', loginEndpoint);
      console.log('[DEBUG] Request body:', { email, password: '***' });

      const res = await publicApiRequest(HC_CONFIG.ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      console.log('[DEBUG] Login response:', res);

      const role = res.user?.role;

      // ── DEBUG: log role comparison ──
      const backendRole  = (role || '').toUpperCase();
      const configRole   = HC_CONFIG.ROLES.PATIENT.toUpperCase();
      const isPatient    = backendRole === configRole;
      console.log('[HC Auth Debug]', {
        'Backend role (raw)':   role,
        'Backend role (upper)': backendRole,
        'Config PATIENT':       configRole,
        'Match?':               isPatient,
        'Full user object':     res.user,
      });

      // Block staff from the general portal
      if (role && !isPatient) {
        const orgSlug = res.user?.organization_slug || '';
        let hint = '';
        if (orgSlug) {
          hint = ' Please use your organization portal: /' + orgSlug + '/signin.html';
        }
        error.textContent = 'Staff members cannot log in here.' + hint;
        btn.textContent = 'Sign In';
        btn.disabled = false;
        return;
      }

      hc_saveTokens({
        access:  res.access,
        refresh: res.refresh,
        user:    res.user,
      });

      hc_redirectByRole(role, '/public/patient/index.html');

    } catch (err) {
      console.error('[LOGIN ERROR]', err);

      // Parse error response for redirect info
      let errorMessage = 'Login failed. Please try again.';
      let redirectUrl = null;

      if (err.response) {
        errorMessage = err.response.error || err.response.detail || errorMessage;
        redirectUrl = err.response.redirect_url;
      } else if (err.message) {
        if (err.message.includes('fetch')) {
          errorMessage = 'Cannot connect to server. Please check if backend is running at ' + HC_CONFIG.API_BASE_URL;
        } else if (err.message.includes('CORS')) {
          errorMessage = 'Server configuration error (CORS). Please contact support.';
        } else if (err.message.includes('NetworkError')) {
          errorMessage = 'Network error. Please check your connection and that the backend is running.';
        } else {
          errorMessage = err.message;
        }
      }

      // Display error message
      error.textContent = errorMessage;
      error.style.display = 'block';

      // Remove any previous redirect link
      const oldLink = error.parentElement.querySelector('.error-link');
      if (oldLink) oldLink.remove();

      // If redirect URL provided, show link with countdown
      if (redirectUrl) {
        let countdown = 5;
        const linkDiv = document.createElement('div');
        linkDiv.className = 'error-link';
        linkDiv.innerHTML =
          '<a href="' + redirectUrl + '">Click here to go to the correct login page</a>' +
          '<p style="margin-top:8px;font-size:13px;color:#6b7280;">' +
          'Redirecting in <span class="redirect-countdown">' + countdown + '</span> seconds...</p>';

        error.parentElement.insertBefore(linkDiv, error.nextSibling);

        const countdownEl = linkDiv.querySelector('.redirect-countdown');
        const interval = setInterval(function () {
          countdown--;
          if (countdownEl) countdownEl.textContent = countdown;
          if (countdown <= 0) {
            clearInterval(interval);
            window.location.href = redirectUrl;
          }
        }, 1000);
      }

      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  });
}


// ══════════════════════════════════════════════════════════════
//  Organization portal sign-in (staff + patients)
// ══════════════════════════════════════════════════════════════

function hc_initOrgSigninForm(orgSlug) {
  const form = document.getElementById('signinForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn   = document.getElementById('signinBtn');
    const error = document.getElementById('signinError');

    btn.textContent   = 'Signing in...';
    btn.disabled      = true;
    error.textContent = '';

    try {
      const loginEndpoint = '/auth/login/' + orgSlug + '/';

      const res = await publicApiRequest(loginEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          email:    document.getElementById('email').value.trim(),
          password: document.getElementById('password').value,
        }),
      });

      hc_saveTokens({
        access:  res.access,
        refresh: res.refresh,
        user:    res.user,
      });

      hc_redirectByRole(res.user?.role, '/public/patient/index.html');

    } catch (err) {
      console.error('[ORG LOGIN ERROR]', err);

      // Parse error response for redirect info
      let errorMessage = 'Login failed. Please try again.';
      let redirectUrl = null;

      if (err.response) {
        errorMessage = err.response.error || err.response.detail || errorMessage;
        redirectUrl = err.response.redirect_url;
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Display error message
      error.textContent = errorMessage;
      error.style.display = 'block';

      // Remove any previous redirect link
      const oldLink = error.parentElement.querySelector('.error-link');
      if (oldLink) oldLink.remove();

      // If redirect URL provided, show link with countdown
      if (redirectUrl) {
        let countdown = 5;
        const linkDiv = document.createElement('div');
        linkDiv.className = 'error-link';
        linkDiv.innerHTML =
          '<a href="' + redirectUrl + '">Click here to go to the correct login page</a>' +
          '<p style="margin-top:8px;font-size:13px;color:#6b7280;">' +
          'Redirecting in <span class="redirect-countdown">' + countdown + '</span> seconds...</p>';

        error.parentElement.insertBefore(linkDiv, error.nextSibling);

        const countdownEl = linkDiv.querySelector('.redirect-countdown');
        const interval = setInterval(function () {
          countdown--;
          if (countdownEl) countdownEl.textContent = countdown;
          if (countdown <= 0) {
            clearInterval(interval);
            window.location.href = redirectUrl;
          }
        }, 1000);
      }

      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  });
}


// ══════════════════════════════════════════════════════════════
//  Organization branding loader
// ══════════════════════════════════════════════════════════════

async function hc_loadOrgBranding(slug) {
  const errorEl = document.getElementById('signinError');

  try {
    const org = await publicApiRequest(HC_CONFIG.ENDPOINTS.ORG_BY_SLUG + slug + '/', {
      method: 'GET',
    });

    document.title = org.name + ' | HealthClouda';

    const navOrgName = document.getElementById('nav-org-name');
    if (navOrgName) navOrgName.textContent = 'HealthClouda';

    const navLogo = document.getElementById('nav-logo');
    if (navLogo && org.logo_url) {
      navLogo.src = org.logo_url;
      navLogo.alt = org.name + ' logo';
      navLogo.style.display = '';
    } else if (navLogo) {
      navLogo.style.display = 'none';
    }

    const headerOrgName = document.getElementById('header-org-name');
    if (headerOrgName) headerOrgName.textContent = org.name;

    const emailInput = document.getElementById('email');
    if (emailInput && org.email_domain) {
      emailInput.placeholder = 'e.g. user@' + org.email_domain;
    }

    return org;

  } catch (err) {
    if (err.status === 404) {
      if (errorEl) errorEl.textContent = 'Organization not found. Redirecting to general login...';
      setTimeout(() => { window.location.href = '/public/signin.html'; }, 3000);
    } else {
      if (errorEl) errorEl.textContent = 'Cannot connect to server. Please try again.';
    }
    return null;
  }
}


// ══════════════════════════════════════════════════════════════
//  Password reset flows
// ══════════════════════════════════════════════════════════════

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


function hc_initOtpForm(redirectOnSuccess = './reset-password.html') {
  const form      = document.getElementById('otpForm');
  const otpInput  = document.getElementById('otpInput');
  const verifyBtn = document.getElementById('verifyBtn');
  const otpError  = document.getElementById('otpError');
  const OTP_LEN   = 6;

  if (!form || !otpInput) return;

  const resetEmail   = sessionStorage.getItem('hc_reset_email');
  const emailDisplay = document.getElementById('sentEmailDisplay');
  if (resetEmail && emailDisplay) emailDisplay.textContent = resetEmail;

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

  let seconds = 30;
  const timerDisplay    = document.getElementById('timerDisplay');
  const resendLink      = document.getElementById('resendLink');
  let countdownInterval = null;

  function startCountdown() {
    resendLink?.classList.add('disabled');
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      seconds--;
      if (timerDisplay) timerDisplay.textContent = '(0:' + seconds.toString().padStart(2, '0') + ')';
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
      if (strengthBar)   strengthBar.style.width = '0';
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
        matchMsg.textContent = 'Passwords match';
        matchMsg.className   = 'match-msg ok';
      } else {
        matchMsg.textContent = 'Passwords do not match';
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


function hc_initPasswordSuccess(redirectTo = '/public/signin.html') {
  sessionStorage.removeItem('hc_reset_email');

  let seconds = 5;
  const countdownEl = document.getElementById('countdown');
  const continueBtn = document.getElementById('continueBtn');

  function tick() {
    if (countdownEl) countdownEl.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(timer);
      window.location.href = redirectTo;
      return;
    }
    seconds--;
  }

  tick();
  const timer = setInterval(tick, 1000);

  continueBtn?.addEventListener('click', () => {
    clearInterval(timer);
    window.location.href = redirectTo;
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