// ChatIn Professional Authentication Client-Side Handler
document.addEventListener('DOMContentLoaded', () => {
  // 1. Password Visibility Toggles
  function setupPasswordToggle(btnId, inputId, iconId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (btn && input && icon) {
      btn.addEventListener('click', () => {
        const isPassword = input.getAttribute('type') === 'password';
        input.setAttribute('type', isPassword ? 'text' : 'password');
        icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
      });
    }
  }

  setupPasswordToggle('togglePassword', 'password', 'eyeIcon');
  setupPasswordToggle('toggleConfirmPassword', 'confirmPassword', 'eyeIconConfirm');

  // 2. Alert & Submission Helpers
  function showError(msg) {
    const alertBox = document.getElementById('errorAlert');
    const alertText = document.getElementById('errorText') || alertBox;
    if (alertBox) {
      alertText.textContent = msg;
      alertBox.classList.remove('d-none');
      // Subtle shake animation
      alertBox.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 350 }
      );
    }
  }

  function hideError() {
    const alertBox = document.getElementById('errorAlert');
    if (alertBox) {
      alertBox.classList.add('d-none');
    }
  }

  function setSubmitting(submitting, text) {
    const btn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('btnSpinner');

    if (btn) btn.disabled = submitting;
    if (btnText) btnText.textContent = text;
    if (spinner) {
      if (submitting) spinner.classList.remove('d-none');
      else spinner.classList.add('d-none');
    }
  }

  // 3. Dynamic Live Avatar Initials Preview
  const usernameInput = document.getElementById('username');
  const avatarPreview = document.getElementById('avatarPreview');

  if (usernameInput && avatarPreview) {
    usernameInput.addEventListener('input', () => {
      const val = usernameInput.value.trim();
      let initials = 'CI';
      if (val.length >= 2) {
        initials = val.substring(0, 2).toUpperCase();
      } else if (val.length === 1) {
        initials = val.substring(0, 1).toUpperCase();
      }
      avatarPreview.textContent = initials;
      avatarPreview.classList.add('bump');
      setTimeout(() => avatarPreview.classList.remove('bump'), 200);
    });
  }

  // 4. Real-Time Username Live Validation
  const usernameStatusIcon = document.getElementById('usernameStatusIcon');
  const usernameFeedback = document.getElementById('usernameFeedback');

  if (usernameInput) {
    usernameInput.addEventListener('input', () => {
      const val = usernameInput.value.trim();
      const parentGroup = usernameInput.closest('.custom-input-group');
      hideError();

      if (val.length === 0) {
        if (parentGroup) parentGroup.classList.remove('is-valid', 'is-invalid');
        if (usernameStatusIcon) usernameStatusIcon.classList.add('d-none');
        if (usernameFeedback) usernameFeedback.classList.add('d-none');
        return;
      }

      const isValid = /^[a-zA-Z0-9_]{3,30}$/.test(val);
      if (parentGroup) {
        parentGroup.classList.toggle('is-valid', isValid);
        parentGroup.classList.toggle('is-invalid', !isValid);
      }

      if (usernameStatusIcon) {
        usernameStatusIcon.classList.remove('d-none');
        usernameStatusIcon.innerHTML = isValid
          ? '<i class="bi bi-check-circle-fill text-success"></i>'
          : '<i class="bi bi-exclamation-circle-fill text-danger"></i>';
      }

      if (usernameFeedback) {
        if (!isValid) {
          usernameFeedback.textContent =
            val.length < 3
              ? 'Username must be at least 3 characters'
              : 'Letters, numbers, and underscores only';
          usernameFeedback.classList.remove('d-none');
        } else {
          usernameFeedback.classList.add('d-none');
        }
      }
    });
  }

  // 5. Real-Time Email Validation
  const emailInput = document.getElementById('email');
  const emailStatusIcon = document.getElementById('emailStatusIcon');
  const emailFeedback = document.getElementById('emailFeedback');

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      const val = emailInput.value.trim();
      const parentGroup = emailInput.closest('.custom-input-group');
      hideError();

      if (val.length === 0) {
        if (parentGroup) parentGroup.classList.remove('is-valid', 'is-invalid');
        if (emailStatusIcon) emailStatusIcon.classList.add('d-none');
        if (emailFeedback) emailFeedback.classList.add('d-none');
        return;
      }

      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (parentGroup) {
        parentGroup.classList.toggle('is-valid', isValid);
        parentGroup.classList.toggle('is-invalid', !isValid);
      }

      if (emailStatusIcon) {
        emailStatusIcon.classList.remove('d-none');
        emailStatusIcon.innerHTML = isValid
          ? '<i class="bi bi-check-circle-fill text-success"></i>'
          : '<i class="bi bi-exclamation-circle-fill text-danger"></i>';
      }

      if (emailFeedback) {
        if (!isValid) {
          emailFeedback.textContent = 'Please enter a valid email address';
          emailFeedback.classList.remove('d-none');
        } else {
          emailFeedback.classList.add('d-none');
        }
      }
    });
  }

  // 6. Interactive Password Strength Meter & Rules
  const passwordInput = document.getElementById('password');
  const strengthMeter = document.getElementById('strengthMeter');
  const strengthText = document.getElementById('strengthText');
  const ruleLength = document.getElementById('ruleLength');
  const ruleComplexity = document.getElementById('ruleComplexity');

  if (passwordInput && strengthMeter) {
    passwordInput.addEventListener('input', () => {
      const val = passwordInput.value;
      hideError();

      let score = 0;
      const hasLength = val.length >= 6;
      const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val);
      const isLong = val.length >= 10;
      const hasMixedCase = /[a-z]/.test(val) && /[A-Z]/.test(val);

      if (hasLength) score += 30;
      if (hasNumberOrSymbol) score += 30;
      if (isLong) score += 20;
      if (hasMixedCase) score += 20;

      // Update rules checklist
      if (ruleLength) {
        ruleLength.classList.toggle('rule-checked', hasLength);
        ruleLength.innerHTML = `<i class="bi ${hasLength ? 'bi-check-circle-fill text-success' : 'bi-circle'} me-1"></i> Min 6 characters`;
      }

      if (ruleComplexity) {
        ruleComplexity.classList.toggle('rule-checked', hasNumberOrSymbol);
        ruleComplexity.innerHTML = `<i class="bi ${hasNumberOrSymbol ? 'bi-check-circle-fill text-success' : 'bi-circle'} me-1"></i> Number or symbol`;
      }

      // Update Meter Bar & Text
      if (val.length === 0) {
        strengthMeter.style.width = '0%';
        strengthMeter.className = 'progress-bar';
        if (strengthText) strengthText.textContent = 'Strength: None';
      } else if (score < 40) {
        strengthMeter.style.width = '25%';
        strengthMeter.className = 'progress-bar bg-danger';
        if (strengthText) strengthText.innerHTML = '<span class="text-danger fw-semibold">Weak</span>';
      } else if (score < 70) {
        strengthMeter.style.width = '60%';
        strengthMeter.className = 'progress-bar bg-warning';
        if (strengthText) strengthText.innerHTML = '<span class="text-warning fw-semibold">Fair</span>';
      } else if (score < 90) {
        strengthMeter.style.width = '85%';
        strengthMeter.className = 'progress-bar bg-info';
        if (strengthText) strengthText.innerHTML = '<span class="text-info fw-semibold">Good</span>';
      } else {
        strengthMeter.style.width = '100%';
        strengthMeter.className = 'progress-bar bg-success';
        if (strengthText) strengthText.innerHTML = '<span class="text-success fw-semibold">Strong</span>';
      }

      // Check confirm password match if already entered
      checkPasswordMatch();
    });
  }

  // 7. Real-Time Confirm Password Match Check
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const matchFeedback = document.getElementById('matchFeedback');

  function checkPasswordMatch() {
    if (!confirmPasswordInput || !passwordInput) return;
    const pwd = passwordInput.value;
    const confirm = confirmPasswordInput.value;
    const parentGroup = confirmPasswordInput.closest('.custom-input-group');

    if (confirm.length === 0) {
      if (parentGroup) parentGroup.classList.remove('is-valid', 'is-invalid');
      if (matchFeedback) matchFeedback.classList.add('d-none');
      return;
    }

    const matches = pwd === confirm;
    if (parentGroup) {
      parentGroup.classList.toggle('is-valid', matches);
      parentGroup.classList.toggle('is-invalid', !matches);
    }

    if (matchFeedback) {
      matchFeedback.classList.remove('d-none');
      if (matches) {
        matchFeedback.className = 'extra-small mt-1 text-success fw-semibold';
        matchFeedback.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Passwords match';
      } else {
        matchFeedback.className = 'extra-small mt-1 text-danger fw-semibold';
        matchFeedback.innerHTML = '<i class="bi bi-x-circle-fill me-1"></i> Passwords do not match';
      }
    }
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
  }

  // 8. Register Form Submission Handler
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const username = usernameInput ? usernameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
      const termsCheck = document.getElementById('termsCheck');

      // Client Validations
      if (!username || !email || !password) {
        showError('Please complete all required fields.');
        return;
      }

      if (username.length < 3 || username.length > 30) {
        showError('Username must be between 3 and 30 characters.');
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showError('Username can only contain letters, numbers, and underscores.');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Please enter a valid email address.');
        return;
      }

      if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
      }

      if (confirmPasswordInput && password !== confirmPassword) {
        showError('Passwords do not match. Please re-enter your password.');
        return;
      }

      if (termsCheck && !termsCheck.checked) {
        showError('Please agree to the Terms of Service to continue.');
        return;
      }

      setSubmitting(true, 'Creating account...');

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (data.token) {
            localStorage.setItem('chatin_token', data.token);
            localStorage.setItem('chatin_user', JSON.stringify(data.user));
          }
          setSubmitting(true, 'Account created! Redirecting...');
          setTimeout(() => {
            window.location.href = '/chat';
          }, 350);
        } else {
          showError(data.message || 'Registration failed. Please try again.');
          setSubmitting(false, 'Create ChatIn Account');
        }
      } catch (err) {
        showError('Network error. Unable to reach the ChatIn server.');
        setSubmitting(false, 'Create ChatIn Account');
      }
    });
  }

  // 9. Login Form Handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const identifier = document.getElementById('identifier').value.trim();
      const password = document.getElementById('password').value;

      if (!identifier || !password) {
        showError('Please provide both username/email and password.');
        return;
      }

      setSubmitting(true, 'Signing in...');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (data.token) {
            localStorage.setItem('chatin_token', data.token);
            localStorage.setItem('chatin_user', JSON.stringify(data.user));
          }
          setSubmitting(true, 'Redirecting to workspace...');
          setTimeout(() => {
            window.location.href = '/chat';
          }, 250);
        } else {
          showError(data.message || 'Login failed. Please check your credentials.');
          setSubmitting(false, 'Sign In');
        }
      } catch (err) {
        showError('Network error. Unable to connect to server.');
        setSubmitting(false, 'Sign In');
      }
    });
  }
});
