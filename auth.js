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
        btn.innerHTML = isPassword
            ? '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>'
            : '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.574-3.007-9.964-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';
    }

    // ── BOOTSTRAP ─────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();
