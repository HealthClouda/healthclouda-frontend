/**
 * HealthClouda — Authentication Logic
 * ─────────────────────────────────────────────────────────────
 * Handles login form submission, logout, and protecting
 * pages that require authentication.
 *
 * REQUIRES: config.js and api.js loaded before this file.
 * ─────────────────────────────────────────────────────────────
 */


// ── Helpers ───────────────────────────────────────────────────

function hc_isSafeRedirectUrl(url) {
  try {
    var parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch (_) {
    return false;
  }
}

function hc_isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

var _hcLoginAttempts = { count: 0, lockedUntil: 0 };

function hc_checkRateLimit(errorEl) {
  var now = Date.now();
  if (_hcLoginAttempts.lockedUntil > now) {
    var secs = Math.ceil((_hcLoginAttempts.lockedUntil - now) / 1000);
    if (errorEl) {
      errorEl.textContent = 'Too many attempts. Try again in ' + secs + ' seconds.';
      errorEl.style.display = 'block';
    }
    return false;
  }
  return true;
}

function hc_recordFailedAttempt() {
  _hcLoginAttempts.count++;
  if (_hcLoginAttempts.count >= 5) {
    var lockSeconds = _hcLoginAttempts.count >= 10 ? 60 : 30;
    _hcLoginAttempts.lockedUntil = Date.now() + (lockSeconds * 1000);
  }
}

function hc_resetAttempts() {
  _hcLoginAttempts.count = 0;
  _hcLoginAttempts.lockedUntil = 0;
}

function hc_getSigninRedirect(user) {
  return HC_ROUTER.signinPath(user);
}


// ── Protect a page (redirect to login if not authed) ────────
function hc_requireAuth() {
  const token = hc_getAccessToken();
  if (!token) {
    window.location.href = HC_ROUTER.signinPath();
  }
}


// ── Redirect user by role to the correct dashboard ──────────
function hc_redirectByRole(role, fallback) {
  var path = HC_ROUTER.roleDashboardPath(role);
  window.location.href = path || fallback || HC_ROUTER.signinPath();
}


// ── Logout ───────────────────────────────────────────────────
async function hc_logout() {
  const user = hc_getUser();
  const refresh = hc_getRefreshToken();
  try {
    if (refresh) {
      await apiPost(HC_CONFIG.ENDPOINTS.LOGOUT, { refresh });
    }
  } catch {
    // Logout even if the API call fails
  }
  hc_clearTokens();
  window.location.href = hc_getSigninRedirect(user);
}


// ══════════════════════════════════════════════════════════════
//  General portal sign-in (patients only)
// ══════════════════════════════════════════════════════════════

function hc_initSigninForm() {
  const form = document.getElementById('signinForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('signinBtn');
    const error = document.getElementById('signinError');

    if (!hc_checkRateLimit(error)) { btn.disabled = false; return; }

    btn.textContent   = 'Signing in...';
    btn.disabled      = true;
    error.textContent = '';

    try {
      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!hc_isValidEmail(email)) {
        error.textContent = 'Please enter a valid email address.';
        error.style.display = 'block';
        btn.textContent = 'Sign In';
        btn.disabled = false;
        return;
      }

      const res = await publicApiRequest(HC_CONFIG.ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const role = res.user?.role;

      const backendRole = (role || '').toUpperCase();
      const isPatient   = backendRole === HC_CONFIG.ROLES.PATIENT.toUpperCase();

      // Block non-patients from the general portal
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

      hc_resetAttempts();
      hc_saveTokens({
        access:  res.access,
        refresh: res.refresh,
        user:    res.user,
      });

      hc_redirectByRole(role, HC_ROUTER.roleDashboardPath('PATIENT'));

    } catch (err) {
      hc_recordFailedAttempt();

      // Parse error response for redirect info
      let errorMessage = 'Login failed. Please try again.';
      let redirectUrl = null;

      if (err.status >= 500) {
        errorMessage = 'Our server is temporarily unavailable. Please try again later.';
      } else if (err.response) {
        errorMessage = err.response.error || err.response.detail || errorMessage;
        redirectUrl = err.response.redirect_url;
      } else if (err.message) {
        if (err.message.includes('fetch')) {
          errorMessage = 'Cannot connect to server. Please check your connection.';
        } else if (err.message.includes('CORS')) {
          errorMessage = 'Server configuration error (CORS). Please contact support.';
        } else if (err.message.includes('NetworkError')) {
          errorMessage = 'Network error. Please check your connection.';
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

      // If redirect URL provided, show safe link with countdown
      if (redirectUrl && hc_isSafeRedirectUrl(redirectUrl)) {
        let countdown = 5;
        const linkDiv = document.createElement('div');
        linkDiv.className = 'error-link';

        const anchor = document.createElement('a');
        anchor.href = redirectUrl;
        anchor.textContent = 'Click here to go to the correct login page';
        linkDiv.appendChild(anchor);

        const p = document.createElement('p');
        p.style.cssText = 'margin-top:8px;font-size:13px;color:#6b7280;';
        p.textContent = 'Redirecting in ';
        const countdownSpan = document.createElement('span');
        countdownSpan.className = 'redirect-countdown';
        countdownSpan.textContent = countdown;
        p.appendChild(countdownSpan);
        p.appendChild(document.createTextNode(' seconds...'));
        linkDiv.appendChild(p);

        error.parentElement.insertBefore(linkDiv, error.nextSibling);

        const interval = setInterval(function () {
          countdown--;
          countdownSpan.textContent = countdown;
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

    if (!hc_checkRateLimit(error)) { btn.disabled = false; return; }

    btn.textContent   = 'Signing in...';
    btn.disabled      = true;
    error.textContent = '';

    try {
      const emailVal = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (emailVal.includes('@') && !hc_isValidEmail(emailVal)) {
        error.textContent = 'Please enter a valid email address.';
        error.style.display = 'block';
        btn.textContent = 'Sign In';
        btn.disabled = false;
        return;
      }

      const loginEndpoint = '/auth/login/' + orgSlug + '/';

      const res = await publicApiRequest(loginEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          email:    emailVal,
          password: password,
        }),
      });

      // Block superadmins from org portal
      const orgRole = (res.user?.role || '').toUpperCase().replace(/_/g, '');
      if (orgRole === 'SUPERADMIN') {
        error.textContent = 'Superadmins cannot log in here. Please use the admin portal.';
        error.style.display = 'block';
        btn.textContent = 'Sign In';
        btn.disabled = false;
        return;
      }

      hc_resetAttempts();
      hc_saveTokens({
        access:  res.access,
        refresh: res.refresh,
        user:    res.user,
      });

      hc_redirectByRole(res.user?.role, HC_ROUTER.roleDashboardPath('PATIENT'));

    } catch (err) {
      hc_recordFailedAttempt();

      // Parse error response for redirect info
      let errorMessage = 'Login failed. Please try again.';
      let redirectUrl = null;

      if (err.status >= 500) {
        errorMessage = 'Our server is temporarily unavailable. Please try again later.';
      } else if (err.response) {
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

      // If redirect URL provided, show safe link with countdown
      if (redirectUrl && hc_isSafeRedirectUrl(redirectUrl)) {
        let countdown = 5;
        const linkDiv = document.createElement('div');
        linkDiv.className = 'error-link';

        const anchor = document.createElement('a');
        anchor.href = redirectUrl;
        anchor.textContent = 'Click here to go to the correct login page';
        linkDiv.appendChild(anchor);

        const p = document.createElement('p');
        p.style.cssText = 'margin-top:8px;font-size:13px;color:#6b7280;';
        p.textContent = 'Redirecting in ';
        const countdownSpan = document.createElement('span');
        countdownSpan.className = 'redirect-countdown';
        countdownSpan.textContent = countdown;
        p.appendChild(countdownSpan);
        p.appendChild(document.createTextNode(' seconds...'));
        linkDiv.appendChild(p);

        error.parentElement.insertBefore(linkDiv, error.nextSibling);

        const interval = setInterval(function () {
          countdown--;
          countdownSpan.textContent = countdown;
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
//  Superadmin portal sign-in (dedicated route)
// ══════════════════════════════════════════════════════════════

function hc_initAdminSigninForm() {
  const form = document.getElementById('signinForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn   = document.getElementById('signinBtn');
    const error = document.getElementById('signinError');

    if (!hc_checkRateLimit(error)) { btn.disabled = false; return; }

    btn.textContent   = 'Signing in...';
    btn.disabled      = true;
    error.textContent = '';

    try {
      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!hc_isValidEmail(email)) {
        error.textContent = 'Please enter a valid email address.';
        error.style.display = 'block';
        btn.textContent = 'Sign In';
        btn.disabled = false;
        return;
      }

      const res = await publicApiRequest(HC_CONFIG.ENDPOINTS.LOGIN_ADMIN, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      hc_resetAttempts();
      hc_saveTokens({
        access:  res.access,
        refresh: res.refresh,
        user:    res.user,
      });

      const dest = res.redirect_to;
      window.location.href = (dest && hc_isSafeRedirectUrl(dest))
        ? dest
        : HC_ROUTER.roleDashboardPath('SUPERADMIN');

    } catch (err) {
      hc_recordFailedAttempt();

      let errorMessage = 'Login failed. Please try again.';

      if (err.status >= 500) {
        errorMessage = 'Our server is temporarily unavailable. Please try again later.';
      } else if (err.response) {
        errorMessage = err.response.error || err.response.detail || errorMessage;
      } else if (err.message) {
        if (err.message.includes('fetch')) {
          errorMessage = 'Cannot connect to server. Please check your connection.';
        } else {
          errorMessage = err.message;
        }
      }

      error.textContent = errorMessage;
      error.style.display = 'block';
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
      setTimeout(() => { window.location.href = HC_ROUTER.signinPath(); }, 3000);
    } else {
      if (errorEl) errorEl.textContent = 'Cannot connect to server. Please try again.';
    }
    return null;
  }
}


// ══════════════════════════════════════════════════════════════
//  Password reset flows
// ══════════════════════════════════════════════════════════════

function hc_initForgotForm(redirectOnSuccess) {
  if (!redirectOnSuccess) redirectOnSuccess = HC_ROUTER.passwordFlowPath('check-email');
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

    if (!hc_isValidEmail(email)) {
      error.textContent   = 'Please enter a valid email address.';
      btn.textContent     = 'Reset Password';
      btn.disabled        = false;
      btn.style.opacity   = '1';
      return;
    }

    try {
      await publicApiRequest(HC_CONFIG.ENDPOINTS.FORGOT_PW, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      sessionStorage.setItem('hc_reset_email', email);
      window.location.href = redirectOnSuccess;

    } catch (err) {
      let msg = 'Failed to send reset email. Please try again.';
      if (err.status >= 500) {
        msg = 'Our server is temporarily unavailable. Please try again later.';
      } else if (err.response) {
        msg = err.response.error || err.response.detail || msg;
      } else if (err.message && err.message.includes('fetch')) {
        msg = 'Cannot connect to server. Please check your connection.';
      } else if (err.message) {
        msg = err.message;
      }
      error.textContent   = msg;
      btn.textContent     = 'Reset Password';
      btn.disabled        = false;
      btn.style.opacity   = '1';
    }
  });
}


function hc_initOtpForm(redirectOnSuccess) {
  if (!redirectOnSuccess) redirectOnSuccess = HC_ROUTER.passwordFlowPath('reset-password');
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
      let msg = 'Invalid code. Please try again.';
      if (err.status >= 500) {
        msg = 'Our server is temporarily unavailable. Please try again later.';
      } else if (err.response) {
        msg = err.response.error || err.response.detail || msg;
      } else if (err.message && err.message.includes('fetch')) {
        msg = 'Cannot connect to server. Please check your connection.';
      } else if (err.message) {
        msg = err.message;
      }
      otpError.textContent  = msg;
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
      let msg = 'Failed to resend. Please try again.';
      if (err.status >= 500) {
        msg = 'Our server is temporarily unavailable. Please try again later.';
      } else if (err.message && err.message.includes('fetch')) {
        msg = 'Cannot connect to server. Please check your connection.';
      }
      if (otpError) otpError.textContent = msg;
    }
  });
}


function hc_initResetForm(redirectOnSuccess) {
  if (!redirectOnSuccess) redirectOnSuccess = HC_ROUTER.passwordFlowPath('password-success');
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
      let msg = 'Failed to update password. Please try again.';
      if (err.status >= 500) {
        msg = 'Our server is temporarily unavailable. Please try again later.';
      } else if (err.response) {
        msg = err.response.error || err.response.detail || msg;
      } else if (err.message && err.message.includes('fetch')) {
        msg = 'Cannot connect to server. Please check your connection.';
      } else if (err.message) {
        msg = err.message;
      }
      if (error) error.textContent = msg;
      updateBtn.textContent   = 'Update Password';
      updateBtn.disabled      = false;
      updateBtn.style.opacity = '1';
    }
  });
}


function hc_initPasswordSuccess(redirectTo) {
  if (!redirectTo) redirectTo = HC_ROUTER.signinPath();
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


// ══════════════════════════════════════════════════════════════
//  Change password (for authenticated users)
// ══════════════════════════════════════════════════════════════

function hc_initChangePasswordForm() {
  const form = document.getElementById('changePasswordForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn        = document.getElementById('changePwBtn');
    const errorEl    = document.getElementById('changePwError');
    const successEl  = document.getElementById('changePwSuccess');
    const oldPw      = document.getElementById('oldPassword').value;
    const newPw      = document.getElementById('newPassword').value;

    const originalText = btn.textContent;
    if (errorEl)   errorEl.textContent   = '';
    if (successEl) successEl.textContent = '';

    // Client-side validation
    if (!oldPw || !newPw) {
      if (errorEl) errorEl.textContent = 'Please fill in both fields.';
      return;
    }
    var pwOk = newPw.length >= 8 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) && /[^A-Za-z0-9]/.test(newPw);
    if (!pwOk) {
      if (errorEl) errorEl.textContent = 'Password must be at least 8 characters with an uppercase letter, a number, and a special character.';
      return;
    }

    btn.textContent = 'Updating...';
    btn.disabled    = true;

    try {
      await apiPost(HC_CONFIG.ENDPOINTS.CHANGE_PW, {
        old_password: oldPw,
        new_password: newPw,
      });

      if (successEl) successEl.textContent = 'Password changed successfully.';
      form.reset();

    } catch (err) {
      if (err.status === 400 && err.data) {
        // Field-level errors (e.g. { old_password: ["Old password is incorrect"] })
        const messages = [];
        for (const [field, errors] of Object.entries(err.data)) {
          const fieldName = field.replace(/_/g, ' ');
          if (Array.isArray(errors)) {
            messages.push(fieldName + ': ' + errors.join(', '));
          } else if (typeof errors === 'string') {
            messages.push(fieldName + ': ' + errors);
          }
        }
        if (errorEl) errorEl.textContent = messages.join(' | ') || 'Please check your input.';
      } else if (err.status >= 500) {
        if (errorEl) errorEl.textContent = 'Our server is temporarily unavailable. Please try again later.';
      } else {
        if (errorEl) errorEl.textContent = err.message || 'Failed to change password. Please try again.';
      }
    } finally {
      btn.textContent = originalText;
      btn.disabled    = false;
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