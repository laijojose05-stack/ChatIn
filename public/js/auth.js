// ChatIn Authentication Client-Side Handler
document.addEventListener('DOMContentLoaded', () => {
  // Password show/hide toggle
  const toggleBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');

  if (toggleBtn && passwordInput && eyeIcon) {
    toggleBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      eyeIcon.className = type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
    });
  }

  // Error Alert Helper
  function showError(msg) {
    const alertBox = document.getElementById('errorAlert');
    if (alertBox) {
      alertBox.textContent = msg;
      alertBox.classList.remove('d-none');
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

  // Login Form Submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
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
          // Store token in localStorage for Socket.IO if needed
          if (data.token) {
            localStorage.setItem('chatin_token', data.token);
            localStorage.setItem('chatin_user', JSON.stringify(data.user));
          }
          window.location.href = '/chat';
        } else {
          showError(data.message || 'Login failed. Please check your credentials.');
          setSubmitting(false, 'Sign In');
        }
      } catch (err) {
        showError('Network error. Unable to reach server.');
        setSubmitting(false, 'Sign In');
      }
    });
  }

  // Register Form Submission
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!username || !email || !password) {
        showError('All fields are required.');
        return;
      }

      if (password.length < 6) {
        showError('Password must be at least 6 characters.');
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
          window.location.href = '/chat';
        } else {
          showError(data.message || 'Registration failed.');
          setSubmitting(false, 'Create Account');
        }
      } catch (err) {
        showError('Network error. Unable to connect to server.');
        setSubmitting(false, 'Create Account');
      }
    });
  }
});
