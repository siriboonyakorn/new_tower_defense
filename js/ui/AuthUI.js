/**
 * AuthUI.js
 * Handles the Authentication UI (Login/Signup Modal)
 */
import { PlayerService } from '../modules/PlayerService.js';

export const AuthUI = {
    elements: {},
    loginUsernameMode: false,

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
            quickregForm: document.getElementById('quickreg-form'),
            userPanel: document.getElementById('user-panel'),

            // tabs
            tabLogin: document.getElementById('tab-login'),
            tabSignup: document.getElementById('tab-signup'),
            tabQuickreg: document.getElementById('tab-quickreg'),

            // login inputs
            loginEmailGroup: document.getElementById('login-email-group'),
            loginUsernameGroup: document.getElementById('login-username-group'),
            loginEmail: document.getElementById('login-email'),
            loginUsername: document.getElementById('login-username'),
            loginPass: document.getElementById('login-password'),
            toggleLoginModeBtn: document.getElementById('btn-toggle-login-mode'),

            // signup inputs
            signupEmail: document.getElementById('signup-email'),
            signupPass: document.getElementById('signup-password'),
            signupUser: document.getElementById('signup-username'),

            // quickreg inputs
            qrUsername: document.getElementById('qr-username'),
            qrPassword: document.getElementById('qr-password'),

            // msgs
            loginMsg: document.getElementById('login-msg'),
            signupMsg: document.getElementById('signup-msg'),
            quickregMsg: document.getElementById('quickreg-msg'),

            // Edit Name
            nameWrapper: document.querySelector('.user-name-wrapper'),
            editBtn: document.getElementById('btn-edit-name'),
            editForm: document.getElementById('edit-name-form'),
            editInput: document.getElementById('input-edit-username'),
            saveBtn: document.getElementById('btn-save-name'),
            cancelBtn: document.getElementById('btn-cancel-name'),

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
        if (this.elements.tabQuickreg) {
            this.elements.tabQuickreg.addEventListener('click', () => this.switchTab('quickreg'));
        }

        // Forms
        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (this.elements.signupForm) {
            this.elements.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        if (this.elements.quickregForm) {
            this.elements.quickregForm.addEventListener('submit', (e) => this.handleQuickReg(e));
        }

        // Login mode toggle (email <-> username)
        if (this.elements.toggleLoginModeBtn) {
            this.elements.toggleLoginModeBtn.addEventListener('click', () => this.toggleLoginMode());
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

        // Edit Name Logic
        if (this.elements.editBtn) {
            this.elements.editBtn.addEventListener('click', () => this.toggleEditMode(true));
        }
        if (this.elements.saveBtn) {
            this.elements.saveBtn.addEventListener('click', () => this.saveNewName());
        }
        if (this.elements.cancelBtn) {
            this.elements.cancelBtn.addEventListener('click', () => this.toggleEditMode(false));
        }
    },

    toggleLoginMode() {
        this.loginUsernameMode = !this.loginUsernameMode;
        const { loginEmailGroup, loginUsernameGroup, loginEmail, loginUsername, toggleLoginModeBtn } = this.elements;
        if (this.loginUsernameMode) {
            loginEmailGroup.classList.add('hidden');
            loginUsernameGroup.classList.remove('hidden');
            loginEmail.removeAttribute('required');
            loginUsername.setAttribute('required', 'required');
            toggleLoginModeBtn.textContent = '📧 Login with email instead';
        } else {
            loginEmailGroup.classList.remove('hidden');
            loginUsernameGroup.classList.add('hidden');
            loginEmail.setAttribute('required', 'required');
            loginUsername.removeAttribute('required');
            toggleLoginModeBtn.textContent = '⚡ Login with username instead';
        }
    },

    toggleEditMode(show) {
        if (show) {
            this.elements.nameWrapper.classList.add('hidden');
            this.elements.editForm.classList.remove('hidden');
            const currentName = document.getElementById('display-username').textContent;
            this.elements.editInput.value = currentName === 'COMMANDER' ? '' : currentName;
            this.elements.editInput.focus();
        } else {
            this.elements.nameWrapper.classList.remove('hidden');
            this.elements.editForm.classList.add('hidden');
        }
    },

    async saveNewName() {
        const newName = this.elements.editInput.value.trim();
        if (!newName) return;

        if (newName.length > 12) {
            alert("Name too long (Max 12 chars)");
            return;
        }

        const submitBtn = this.elements.saveBtn;
        submitBtn.disabled = true;
        submitBtn.innerHTML = "...";

        try {
            await PlayerService.updateProfile({ username: newName });
            this.toggleEditMode(false);
            // The existing listener for 'player-profile-updated' will handle the display update
        } catch (err) {
            console.error("Name update failed", err);
            alert("Update Failed: " + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "✔";
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
        this.elements.quickregForm.classList.add('hidden');
        this.elements.userPanel.classList.add('hidden');

        // Deactivate all tabs
        this.elements.tabLogin.classList.remove('active');
        this.elements.tabSignup.classList.remove('active');
        this.elements.tabQuickreg.classList.remove('active');

        // Activate selected
        if (tab === 'login') {
            this.elements.loginForm.classList.remove('hidden');
            this.elements.tabLogin.classList.add('active');
            this.elements.loginMsg.textContent = '';
            this.elements.loginMsg.className = 'auth-msg';
        } else if (tab === 'signup') {
            this.elements.signupForm.classList.remove('hidden');
            this.elements.tabSignup.classList.add('active');
            this.elements.signupMsg.textContent = '';
            this.elements.signupMsg.className = 'auth-msg';
        } else if (tab === 'quickreg') {
            this.elements.quickregForm.classList.remove('hidden');
            this.elements.tabQuickreg.classList.add('active');
            this.elements.quickregMsg.textContent = '';
            this.elements.quickregMsg.className = 'auth-msg';
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const submitBtn = this.elements.loginForm.querySelector('button[type="submit"]');

        this.setMessage(this.elements.loginMsg, "AUTHENTICATING...", "");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.originalText = submitBtn.textContent;
            submitBtn.textContent = "...";
        }

        try {
            if (this.loginUsernameMode) {
                const username = this.elements.loginUsername.value.trim();
                const pass = this.elements.loginPass.value;
                console.log('[AuthUI] Starting username login for:', username);
                await PlayerService.signInWithUsername(username, pass);
            } else {
                const email = this.elements.loginEmail.value;
                const pass = this.elements.loginPass.value;
                console.log('[AuthUI] Starting email login for:', email);
                await PlayerService.signInWithEmail(email, pass);
            }
            console.log('[AuthUI] Login successful!');
            this.setMessage(this.elements.loginMsg, "ACCESS GRANTED", "success");
            setTimeout(() => {
                this.close();
                this.updateAuthButtonState();
            }, 1000);
        } catch (err) {
            console.error('[AuthUI] Login error:', err);
            let msg = err.message;
            if (msg.includes('rate limit')) {
                msg = "TOO MANY ATTEMPTS. PLEASE WAIT A FEW MINUTES.";
            }
            this.setMessage(this.elements.loginMsg, "ACCESS DENIED: " + msg, "error");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = submitBtn.dataset.originalText;
            }
        }
    },

    async handleSignup(e) {
        e.preventDefault();
        const email = this.elements.signupEmail.value;
        const pass = this.elements.signupPass.value;
        const username = this.elements.signupUser.value;
        const submitBtn = this.elements.signupForm.querySelector('button[type="submit"]');

        this.setMessage(this.elements.signupMsg, "CREATING IDENTITY...", "");

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.originalText = submitBtn.textContent;
            submitBtn.textContent = "...";
        }

        try {
            const result = await PlayerService.signUpWithEmail(email, pass, username);

            if (result.profile) {
                this.setMessage(this.elements.signupMsg, "IDENTITY CONFIRMED. LOGGING IN...", "success");
                setTimeout(() => {
                    this.close();
                    this.updateAuthButtonState();
                }, 1000);
            } else {
                this.setMessage(this.elements.signupMsg, "CONFIRMATION LINK SENT TO EMAIL.", "success");
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = submitBtn.dataset.originalText;
                }
            }
        } catch (err) {
            console.error(err);
            let msg = err.message;
            if (msg.includes('rate limit')) {
                msg = "TOO MANY ATTEMPTS. PLEASE WAIT A FEW MINUTES.";
            }
            this.setMessage(this.elements.signupMsg, "ERROR: " + msg, "error");

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = submitBtn.dataset.originalText;
            }
        }
    },

    async handleQuickReg(e) {
        e.preventDefault();
        const username = this.elements.qrUsername.value.trim();
        const password = this.elements.qrPassword.value;
        const submitBtn = this.elements.quickregForm.querySelector('button[type="submit"]');

        if (!username) {
            this.setMessage(this.elements.quickregMsg, "ERROR: USERNAME REQUIRED.", "error");
            return;
        }
        if (password.length < 6) {
            this.setMessage(this.elements.quickregMsg, "ERROR: PASSWORD TOO SHORT (MIN 6 CHARS).", "error");
            return;
        }

        this.setMessage(this.elements.quickregMsg, "CREATING IDENTITY...", "");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.originalText = submitBtn.textContent;
            submitBtn.textContent = "...";
        }

        try {
            const result = await PlayerService.signUpWithUsername(username, password);
            if (result.profile) {
                this.setMessage(this.elements.quickregMsg, "IDENTITY CONFIRMED. WELCOME, " + username.toUpperCase() + "!", "success");
                setTimeout(() => {
                    this.close();
                    this.updateAuthButtonState();
                }, 1200);
            } else {
                this.setMessage(this.elements.quickregMsg, "CHECK YOUR EMAIL TO CONFIRM.", "success");
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = submitBtn.dataset.originalText;
                }
            }
        } catch (err) {
            console.error('[AuthUI] Quick signup error:', err);
            let msg = err.message;
            if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('User already registered')) {
                msg = "USERNAME ALREADY TAKEN. CHOOSE ANOTHER.";
            } else if (msg.includes('rate limit')) {
                msg = "TOO MANY ATTEMPTS. PLEASE WAIT A FEW MINUTES.";
            }
            this.setMessage(this.elements.quickregMsg, "ERROR: " + msg, "error");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = submitBtn.dataset.originalText;
            }
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
        this.elements.quickregForm.classList.add('hidden');
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
