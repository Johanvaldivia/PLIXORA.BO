// =============================================================
// PLIXORA.BO — Authentication Module
// Firebase Auth: Login / Logout / Session Guard
// =============================================================
(function () {
    'use strict';

    // No credentials should be stored in plain text here.

    let auth = null;

    // ── INIT ─────────────────────────────────────────────────
    function initAuth() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            console.warn('⚠️ Firebase Auth SDK not loaded');
            showApp(); // fallback: show app if SDK missing
            return;
        }
        auth = firebase.auth();

        // Listen for auth state changes
        auth.onAuthStateChanged(function (user) {
            if (user) {
                // User is signed in — show the app
                console.log('✅ Sesión activa:', user.email);
                hideLogin();
                showApp();
            } else {
                // No user — show login
                console.log('🔒 Sin sesión — mostrando login');
                hideApp();
                showLogin();
            }
        });

        // Setup form handler
        const form = document.getElementById('login-form');
        if (form) {
            form.addEventListener('submit', handleLogin);
        }

        // Toggle password visibility
        const toggleBtn = document.getElementById('toggle-password');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', togglePassword);
        }

        // Enter key on password field
        const passInput = document.getElementById('login-password');
        if (passInput) {
            passInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    form.dispatchEvent(new Event('submit'));
                }
            });
        }

        // No auto-account creation. Account must be managed via Firebase Console.
    }

    // ── HANDLE LOGIN ─────────────────────────────────────────
    async function handleLogin(e) {
        e.preventDefault();

        const emailInput = document.getElementById('login-email');
        const passInput  = document.getElementById('login-password');
        const btn        = document.getElementById('login-submit');
        const errorEl    = document.getElementById('login-error');

        const email    = (emailInput.value || '').trim();
        const password = (passInput.value || '').trim();

        // Validate
        if (!email || !password) {
            showError('Ingresa tu correo y contraseña');
            shakeField(emailInput);
            shakeField(passInput);
            return;
        }

        // Loading state
        btn.classList.add('loading');
        btn.disabled = true;
        hideError();

        try {
            await auth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged will handle the rest
        } catch (err) {
            btn.classList.remove('loading');
            btn.disabled = false;

            let msg = 'Error al iniciar sesión';
            switch (err.code) {
                case 'auth/user-not-found':
                    msg = '❌ No existe una cuenta con ese correo';
                    break;
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    msg = '❌ Contraseña incorrecta';
                    break;
                case 'auth/invalid-email':
                    msg = '❌ El correo no es válido';
                    break;
                case 'auth/too-many-requests':
                    msg = '⚠️ Demasiados intentos. Espera un momento.';
                    break;
                default:
                    msg = '❌ ' + err.message;
            }
            showError(msg);
        }
    }

    // ── LOGOUT ───────────────────────────────────────────────
    window.plixoraLogout = async function () {
        if (!auth) return;
        try {
            await auth.signOut();
            // Clear all local data to prevent offline leaks
            localStorage.removeItem('plixora_sales');
            localStorage.removeItem('nf_accounts');
            localStorage.removeItem('plixora_contacts');
            localStorage.removeItem('ga_accounts');
            // Destroy the app DOM to prevent CSS bypass
            const appContent = document.getElementById('app-content');
            if (appContent) appContent.innerHTML = '';
            // Force reload to completely clear memory
            window.location.reload();
        } catch (err) {
            console.error('Error al cerrar sesión:', err);
        }
    };

    // ── UI HELPERS ───────────────────────────────────────────
    function showLogin() {
        const screen = document.getElementById('login-screen');
        if (screen) {
            screen.classList.remove('hidden-login', 'fade-out');
            screen.style.display = 'flex';
        }
        
        // Reset form state on logout/show
        const btn = document.getElementById('login-submit');
        if (btn) {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
        const passInput = document.getElementById('login-password');
        if (passInput) {
            passInput.value = '';
        }
        hideError();
    }

    function hideLogin() {
        const screen = document.getElementById('login-screen');
        if (!screen) return;

        // Fade out animation
        screen.classList.add('fade-out');
        setTimeout(function () {
            screen.classList.add('hidden-login');
        }, 500);
    }

    function showApp() {
        const app = document.getElementById('app-content');
        if (app) {
            app.style.display = '';
            app.classList.remove('app-hidden');
        }
    }

    function hideApp() {
        const app = document.getElementById('app-content');
        if (app) {
            app.style.display = 'none';
            app.classList.add('app-hidden');
        }
    }

    function showError(msg) {
        const el = document.getElementById('login-error');
        if (el) {
            el.textContent = msg;
            el.classList.add('show');
        }
    }

    function hideError() {
        const el = document.getElementById('login-error');
        if (el) {
            el.textContent = '';
            el.classList.remove('show');
        }
    }

    function shakeField(input) {
        if (!input) return;
        const wrap = input.closest('.login-input-wrap');
        if (!wrap) return;
        wrap.style.animation = 'none';
        void wrap.offsetWidth; // reflow
        wrap.style.animation = 'loginShake 0.4s ease';
    }

    function togglePassword() {
        const input = document.getElementById('login-password');
        const btn   = document.getElementById('toggle-password');
        if (!input || !btn) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        // Switch icon
        const eyeIcon = btn.querySelector('svg');
        if (eyeIcon) {
            eyeIcon.innerHTML = isPassword
                ? '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-3.22 4.44M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
                : '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path><circle cx="12" cy="12" r="3"></circle>';
        }
    }

    // ── BOOTSTRAP ─────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();
