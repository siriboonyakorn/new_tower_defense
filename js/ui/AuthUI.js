/**
 * AuthUI.js
 * Handles the Authentication UI (Login/Signup Modal)
 */
import { PlayerService } from '../modules/PlayerService.js';

export const AuthUI = {
    elements: {},

    init() {
        console.log('[AuthUI] Initializing...');
        this.cacheElements();
        this.bindEvents();

        // Listen for profile updates from PlayerService
        window.addEventListener('player-profile-updated', (e) => {
            console.log('[AuthUI] Profile update received:', e.detail.profile?.username);
            this.updateAuthButtonState();
            if (e.detail.profile && !e.detail.profile.is_anonymous) {
                this.showUserPanel(e.detail.profile);
            }
        });

        // Initial check
        this.updateAuthButtonState();
    },

    cacheElements() {
        this.elements = {
            modal: document.getElementById('auth-modal'),
            closeBtn: document.getElementById('close-auth'),
            loginForm: document.getElementById('login-form'),
            signupForm: document.getElementById('signup-form'),
            userPanel: document.getElementById('user-panel'),

            // tabs
            tabLogin: document.getElementById('tab-login'),
            tabSignup: document.getElementById('tab-signup'),

            // inputs
            loginEmail: document.getElementById('login-email'),
            loginPass: document.getElementById('login-password'),
            signupEmail: document.getElementById('signup-email'),
            signupPass: document.getElementById('signup-password'),
            signupUser: document.getElementById('signup-username'),

            // msgs
            loginMsg: document.getElementById('login-msg'),
            signupMsg: document.getElementById('signup-msg'),

            // Buttons
            authTriggerBtn: document.getElementById('btn-auth') // We will add this to main menu
        };
    },

    bindEvents() {
        console.log('[AuthUI] Binding events...');
        // Toggle Modal
        if (this.elements.authTriggerBtn) {
            console.log('[AuthUI] Found authTriggerBtn, adding click listener');
            this.elements.authTriggerBtn.addEventListener('click', () => {
                console.log('[AuthUI] Auth button clicked');
                this.open();
            });
        } else {
            console.warn('[AuthUI] authTriggerBtn (btn-auth) NOT FOUND in DOM');
        }

        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.close());
        }

        // Tabs
        if (this.elements.tabLogin) {
            this.elements.tabLogin.addEventListener('click', () => this.switchTab('login'));
        }
        if (this.elements.tabSignup) {
            this.elements.tabSignup.addEventListener('click', () => this.switchTab('signup'));
        }

        // Forms
        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (this.elements.signupForm) {
            this.elements.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Logout
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Delete Account
        const deleteBtn = document.getElementById('btn-delete-account');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDeleteAccount());
        }
    },

    open() {
        console.log('[AuthUI] Opening modal...');
        // Update view based on auth state
        const profile = PlayerService.getCurrentProfile();

        if (profile && !profile.is_anonymous) {
            this.showUserPanel(profile);
        } else {
            this.switchTab('login');
            this.elements.userPanel.classList.add('hidden');
            this.elements.loginForm.classList.remove('hidden');
            if (this.elements.tabLogin && this.elements.tabLogin.parentElement) {
                this.elements.tabLogin.parentElement.classList.remove('hidden'); // Show tabs
            }
        }

        if (this.elements.modal) {
            this.elements.modal.classList.remove('hidden');
            this.elements.modal.classList.remove('closing');
        }
    },

    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('closing');
            setTimeout(() => {
                this.elements.modal.classList.add('hidden');
                this.elements.modal.classList.remove('closing');
            }, 300);
        }
    },

    switchTab(tab) {
        // Hide all forms
        this.elements.loginForm.classList.add('hidden');
        this.elements.signupForm.classList.add('hidden');
        this.elements.userPanel.classList.add('hidden');

        // Deactivate all tabs
        this.elements.tabLogin.classList.remove('active');
        this.elements.tabSignup.classList.remove('active');

        // Activate selected
        if (tab === 'login') {
            this.elements.loginForm.classList.remove('hidden');
            this.elements.tabLogin.classList.add('active');
            this.elements.loginMsg.textContent = '';
            this.elements.loginMsg.className = 'auth-msg';
        } else {
            this.elements.signupForm.classList.remove('hidden');
            this.elements.tabSignup.classList.add('active');
            this.elements.signupMsg.textContent = '';
            this.elements.signupMsg.className = 'auth-msg';
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = this.elements.loginEmail.value;
        const pass = this.elements.loginPass.value;

        console.log('[AuthUI] Starting login for:', email);
        this.setMessage(this.elements.loginMsg, "AUTHENTICATING...", "");

        try {
            console.log('[AuthUI] Calling signInWithEmail...');
            await PlayerService.signInWithEmail(email, pass);
            console.log('[AuthUI] Login successful!');
            this.setMessage(this.elements.loginMsg, "ACCESS GRANTED", "success");
            setTimeout(() => {
                this.close();
                this.updateAuthButtonState();
            }, 1000);
        } catch (err) {
            console.error('[AuthUI] Login error:', err);
            this.setMessage(this.elements.loginMsg, "ACCESS DENIED: " + err.message, "error");
        }
    },

    async handleSignup(e) {
        e.preventDefault();
        const email = this.elements.signupEmail.value;
        const pass = this.elements.signupPass.value;
        const username = this.elements.signupUser.value;

        this.setMessage(this.elements.signupMsg, "CREATING IDENTITY...", "");

        try {
            const result = await PlayerService.signUpWithEmail(email, pass, username);

            if (result.session) {
                this.setMessage(this.elements.signupMsg, "IDENTITY CONFIRMED. LOGGING IN...", "success");
                setTimeout(() => {
                    this.close();
                    this.updateAuthButtonState();
                }, 1000);
            } else {
                this.setMessage(this.elements.signupMsg, "CONFIRMATION LINK SENT TO EMAIL.", "success");
            }
        } catch (err) {
            console.error(err);
            this.setMessage(this.elements.signupMsg, "ERROR: " + err.message, "error");
        }
    },

    async handleLogout() {
        if (confirm("TERMINATE CONNECTION? ALL UNSAVED PROGRESS WILL BE LOST.")) {
            await PlayerService.logout();
            this.switchTab('login'); // Reset UI
            this.updateAuthButtonState();
        }
    },

    async handleDeleteAccount() {
        const confirm1 = confirm("CRITICAL WARNING: INITIATING DRIVE WIPE.");
        if (confirm1) {
            const confirm2 = confirm("FINAL AUTHORIZATION REQUIRED. This action is PERMANENT. Are you sure?");
            if (confirm2) {
                try {
                    await PlayerService.deleteAccount();
                    this.switchTab('login');
                    this.updateAuthButtonState();
                    alert("DRIVE WIPE COMPLETE. IDENTITY ERASED.");
                } catch (err) {
                    console.error(err);
                    alert("DRIVE WIPE FAILED: " + err.message);
                }
            }
        }
    },

    showUserPanel(profile) {
        this.elements.tabLogin.parentElement.classList.add('hidden'); // Hide tabs
        this.elements.loginForm.classList.add('hidden');
        this.elements.signupForm.classList.add('hidden');
        this.elements.userPanel.classList.remove('hidden');

        // Update user info
        document.getElementById('display-username').textContent = profile.username;
        document.getElementById('display-score').textContent = profile.high_score || 0;
        document.getElementById('display-games').textContent = profile.total_games_played || 0;
    },

    updateAuthButtonState() {
        const profile = PlayerService.getCurrentProfile();
        console.log('[AuthUI] Updating button state. Profile:', profile?.username, 'is_anonymous:', profile?.is_anonymous);

        if (this.elements.authTriggerBtn) {
            if (profile && !profile.is_anonymous) {
                // Change "LOGIN" to "ACCOUNT [NAME]" or just the NAME
                this.elements.authTriggerBtn.innerHTML = `<span class="icon">👤</span> ${profile.username.toUpperCase()}`;
                this.elements.authTriggerBtn.title = "View Account Information";
            } else {
                this.elements.authTriggerBtn.innerHTML = `<span class="icon">👤</span> LOGIN`;
                this.elements.authTriggerBtn.title = "Login or Register";
            }
        }
    },

    setMessage(el, msg, type) {
        el.textContent = msg;
        el.className = 'auth-msg ' + type;
    }
};
