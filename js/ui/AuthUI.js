/**
 * AuthUI.js
 * Handles the Authentication UI (Login/Signup Modal)
 * Features: Email/Password, GitHub OAuth, 2FA (TOTP), Account Recovery, Strong Passwords
 */
import { PlayerService } from '../modules/PlayerService.js';

// Password rules: min 8 chars, uppercase, lowercase, digit, special char
const PASSWORD_RULES = [
    { re: /.{8,}/, label: 'At least 8 characters' },
    { re: /[A-Z]/, label: 'One uppercase letter' },
    { re: /[a-z]/, label: 'One lowercase letter' },
    { re: /[0-9]/, label: 'One number' },
    { re: /[^A-Za-z0-9]/, label: 'One special character (!@#$...)' },
];

function scorePassword(password) {
    return PASSWORD_RULES.filter(r => r.re.test(password)).length;
}

function validatePassword(password) {
    const failed = PASSWORD_RULES.filter(r => !r.re.test(password));
    if (failed.length === 0) return null;
    return 'PASSWORD WEAK: ' + failed.map(r => r.label).join(', ');
}

function applyStrengthUI(password, fillEl, labelEl) {
    const score = scorePassword(password);
    const pct = (score / PASSWORD_RULES.length) * 100;
    const levels = ['', 'CRITICAL', 'WEAK', 'MODERATE', 'STRONG', 'MAXIMUM'];
    const colours = ['', '#ff3333', '#ff6600', '#ffcc00', '#66ff66', '#00f3ff'];
    fillEl.style.width = pct + '%';
    fillEl.style.background = colours[score] || '#333';
    labelEl.textContent = password.length ? (levels[score] || '') : '';
    labelEl.style.color = colours[score] || '#888';
}

export const AuthUI = {
    elements: {},
    loginUsernameMode: false,
    _mfaEnrollId: null, // factorId during 2FA setup

    init() {
        console.log('[AuthUI] Initializing...');
        this.cacheElements();
        this.bindEvents();

        // Password recovery: triggered by Supabase onAuthStateChange PASSWORD_RECOVERY event.
        // This fires when the user clicks the reset-password email link.
        window.addEventListener('auth-password-recovery', () => {
            this.open();
            this._showRecoveryForm();
        });

        // Fallback: also check URL hash in case the event fired before this listener was set up
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        if (hashParams.get('type') === 'recovery') {
            this.open();
            this._showRecoveryForm();
        }

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
            forgotPasswordForm: document.getElementById('forgot-password-form'),
            resetPasswordForm: document.getElementById('reset-password-form'),
            mfaChallengeForm: document.getElementById('mfa-challenge-form'),
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
            signupStrengthFill: document.getElementById('signup-strength-fill'),
            signupStrengthLabel: document.getElementById('signup-strength-label'),

            // quickreg inputs
            qrUsername: document.getElementById('qr-username'),
            qrPassword: document.getElementById('qr-password'),
            qrStrengthFill: document.getElementById('qr-strength-fill'),
            qrStrengthLabel: document.getElementById('qr-strength-label'),

            // forgot/reset
            forgotEmail: document.getElementById('forgot-email'),
            forgotMsg: document.getElementById('forgot-msg'),
            resetPassword: document.getElementById('reset-password'),
            resetPasswordConfirm: document.getElementById('reset-password-confirm'),
            resetStrengthFill: document.getElementById('reset-strength-fill'),
            resetStrengthLabel: document.getElementById('reset-strength-label'),
            resetMsg: document.getElementById('reset-msg'),

            // 2FA challenge
            mfaCode: document.getElementById('mfa-code'),
            mfaMsg: document.getElementById('mfa-msg'),

            // 2FA setup (in user panel)
            mfaStatusText: document.getElementById('mfa-status-text'),
            btnEnable2FA: document.getElementById('btn-enable-2fa'),
            btnDisable2FA: document.getElementById('btn-disable-2fa'),
            mfaSetupPanel: document.getElementById('mfa-setup-panel'),
            mfaQrImg: document.getElementById('mfa-qr-img'),
            mfaSecret: document.getElementById('mfa-secret'),
            mfaSetupCode: document.getElementById('mfa-setup-code'),
            mfaSetupMsg: document.getElementById('mfa-setup-msg'),

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
            authTriggerBtn: document.getElementById('btn-auth')
        };
    },

    bindEvents() {
        console.log('[AuthUI] Binding events...');

        if (this.elements.authTriggerBtn) {
            this.elements.authTriggerBtn.addEventListener('click', () => this.open());
        }
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.close());
        }

        // Tabs
        if (this.elements.tabLogin)    this.elements.tabLogin.addEventListener('click', () => this.switchTab('login'));
        if (this.elements.tabSignup)   this.elements.tabSignup.addEventListener('click', () => this.switchTab('signup'));
        if (this.elements.tabQuickreg) this.elements.tabQuickreg.addEventListener('click', () => this.switchTab('quickreg'));

        // Forms
        if (this.elements.loginForm)         this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        if (this.elements.signupForm)         this.elements.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        if (this.elements.quickregForm)       this.elements.quickregForm.addEventListener('submit', (e) => this.handleQuickReg(e));
        if (this.elements.forgotPasswordForm) this.elements.forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        if (this.elements.resetPasswordForm)  this.elements.resetPasswordForm.addEventListener('submit', (e) => this.handlePasswordReset(e));

        // Login mode toggle
        if (this.elements.toggleLoginModeBtn) {
            this.elements.toggleLoginModeBtn.addEventListener('click', () => this.toggleLoginMode());
        }

        // Forgot password
        const forgotBtn = document.getElementById('btn-forgot-password');
        if (forgotBtn) forgotBtn.addEventListener('click', () => this._showForgotForm());

        const backToLoginBtn = document.getElementById('btn-back-to-login');
        if (backToLoginBtn) backToLoginBtn.addEventListener('click', () => this.switchTab('login'));

        // GitHub OAuth
        const githubLoginBtn = document.getElementById('btn-github-login');
        if (githubLoginBtn) githubLoginBtn.addEventListener('click', () => this.handleGithubLogin());

        const githubSignupBtn = document.getElementById('btn-github-signup');
        if (githubSignupBtn) githubSignupBtn.addEventListener('click', () => this.handleGithubLogin());

        // 2FA Challenge (after login)
        const mfaVerifyBtn = document.getElementById('btn-mfa-verify');
        if (mfaVerifyBtn) mfaVerifyBtn.addEventListener('click', () => this.handleMFAVerify());

        const mfaCancelBtn = document.getElementById('btn-mfa-cancel');
        if (mfaCancelBtn) mfaCancelBtn.addEventListener('click', () => this.handleMFACancelLogin());

        // 2FA Setup (in user panel)
        if (this.elements.btnEnable2FA)  this.elements.btnEnable2FA.addEventListener('click', () => this.open2FASetup());
        if (this.elements.btnDisable2FA) this.elements.btnDisable2FA.addEventListener('click', () => this.handleDisable2FA());

        const confirm2FABtn = document.getElementById('btn-confirm-2fa');
        if (confirm2FABtn) confirm2FABtn.addEventListener('click', () => this.confirmMFASetup());

        const cancel2FASetup = document.getElementById('btn-cancel-2fa-setup');
        if (cancel2FASetup) cancel2FASetup.addEventListener('click', () => {
            this.elements.mfaSetupPanel.classList.add('hidden');
            this._mfaEnrollId = null;
        });

        // Logout / Delete
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());

        const deleteBtn = document.getElementById('btn-delete-account');
        if (deleteBtn) deleteBtn.addEventListener('click', () => this.handleDeleteAccount());

        // Edit Name
        if (this.elements.editBtn)    this.elements.editBtn.addEventListener('click', () => this.toggleEditMode(true));
        if (this.elements.saveBtn)    this.elements.saveBtn.addEventListener('click', () => this.saveNewName());
        if (this.elements.cancelBtn)  this.elements.cancelBtn.addEventListener('click', () => this.toggleEditMode(false));

        // Password strength meters (live)
        if (this.elements.signupPass) {
            this.elements.signupPass.addEventListener('input', () =>
                applyStrengthUI(this.elements.signupPass.value, this.elements.signupStrengthFill, this.elements.signupStrengthLabel));
        }
        if (this.elements.qrPassword) {
            this.elements.qrPassword.addEventListener('input', () =>
                applyStrengthUI(this.elements.qrPassword.value, this.elements.qrStrengthFill, this.elements.qrStrengthLabel));
        }
        if (this.elements.resetPassword) {
            this.elements.resetPassword.addEventListener('input', () =>
                applyStrengthUI(this.elements.resetPassword.value, this.elements.resetStrengthFill, this.elements.resetStrengthLabel));
        }
    },

    // ----------------------------------------------------------------
    // GitHub OAuth
    // ----------------------------------------------------------------
    async handleGithubLogin() {
        try {
            await PlayerService.signInWithGithub();
            // Page will redirect to GitHub; nothing else to do here
        } catch (err) {
            console.error('[AuthUI] GitHub login error:', err);
            alert('GITHUB LOGIN FAILED: ' + err.message);
        }
    },

    // ----------------------------------------------------------------
    // Forgot / Reset Password
    // ----------------------------------------------------------------
    _showForgotForm() {
        this._hideAllForms();
        this.elements.forgotPasswordForm.classList.remove('hidden');
        if (this.elements.forgotMsg) {
            this.elements.forgotMsg.textContent = '';
            this.elements.forgotMsg.className = 'auth-msg';
        }
    },

    _showRecoveryForm() {
        this._hideAllForms();
        if (this.elements.tabLogin && this.elements.tabLogin.parentElement) {
            this.elements.tabLogin.parentElement.classList.add('hidden');
        }
        this.elements.resetPasswordForm.classList.remove('hidden');
    },

    async handleForgotPassword(e) {
        e.preventDefault();
        const email = this.elements.forgotEmail.value.trim();
        const submitBtn = this.elements.forgotPasswordForm.querySelector('button[type="submit"]');

        this.setMessage(this.elements.forgotMsg, 'SENDING RESET LINK...', '');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '...'; }

        try {
            await PlayerService.sendPasswordResetEmail(email);
            this.setMessage(this.elements.forgotMsg, 'RESET LINK SENT. CHECK YOUR EMAIL.', 'success');
        } catch (err) {
            this.setMessage(this.elements.forgotMsg, 'ERROR: ' + err.message, 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'SEND RESET LINK'; }
        }
    },

    async handlePasswordReset(e) {
        e.preventDefault();
        const pass = this.elements.resetPassword.value;
        const confirm = this.elements.resetPasswordConfirm.value;
        const submitBtn = this.elements.resetPasswordForm.querySelector('button[type="submit"]');

        const err = validatePassword(pass);
        if (err) { this.setMessage(this.elements.resetMsg, err, 'error'); return; }
        if (pass !== confirm) { this.setMessage(this.elements.resetMsg, 'PASSWORDS DO NOT MATCH.', 'error'); return; }

        this.setMessage(this.elements.resetMsg, 'UPDATING PASSWORD...', '');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '...'; }

        try {
            await PlayerService.updatePassword(pass);
            this.setMessage(this.elements.resetMsg, 'PASSWORD UPDATED. LOGGING IN...', 'success');
            setTimeout(() => {
                // Clean the recovery params from the URL
                history.replaceState(null, '', window.location.pathname);
                this.close();
                this.updateAuthButtonState();
            }, 1500);
        } catch (err2) {
            this.setMessage(this.elements.resetMsg, 'ERROR: ' + err2.message, 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'SET NEW PASSWORD'; }
        }
    },

    // ----------------------------------------------------------------
    // 2FA â€” Login-time challenge
    // ----------------------------------------------------------------
    _pendingMFAFactorId: null,

    async _checkMFARequired() {
        try {
            const { currentLevel, nextLevel } = await PlayerService.getMFALevel();
            if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
                // Need 2FA step-up
                const factors = await PlayerService.listMFAFactors();
                const totp = factors?.totp?.[0];
                if (totp) {
                    this._pendingMFAFactorId = totp.id;
                    this._showMFAChallenge();
                    return true;
                }
            }
        } catch (_) { /* If MFA check fails, continue login normally */ }
        return false;
    },

    _showMFAChallenge() {
        this._hideAllForms();
        if (this.elements.tabLogin?.parentElement) {
            this.elements.tabLogin.parentElement.classList.add('hidden');
        }
        this.elements.mfaChallengeForm.classList.remove('hidden');
        this.setMessage(this.elements.mfaMsg, '', '');
        this.elements.mfaCode.value = '';
        this.elements.mfaCode.focus();
    },

    async handleMFAVerify() {
        const code = this.elements.mfaCode.value.trim();
        if (!code || code.length !== 6) {
            this.setMessage(this.elements.mfaMsg, 'ENTER A 6-DIGIT CODE.', 'error');
            return;
        }
        const btn = document.getElementById('btn-mfa-verify');
        if (btn) { btn.disabled = true; btn.textContent = '...'; }

        try {
            await PlayerService.challengeAndVerifyMFA(this._pendingMFAFactorId, code);
            this._pendingMFAFactorId = null;
            this.setMessage(this.elements.mfaMsg, '2FA VERIFIED. ACCESS GRANTED.', 'success');
            setTimeout(() => { this.close(); this.updateAuthButtonState(); }, 1000);
        } catch (err) {
            this.setMessage(this.elements.mfaMsg, 'INVALID CODE: ' + err.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'VERIFY CODE'; }
        }
    },

    async handleMFACancelLogin() {
        this._pendingMFAFactorId = null;
        await PlayerService.logout();
        this.switchTab('login');
    },

    // ----------------------------------------------------------------
    // 2FA â€” Enrollment from user panel
    // ----------------------------------------------------------------
    async open2FASetup() {
        this.setMessage(this.elements.mfaSetupMsg, 'GENERATING QR CODE...', '');
        this.elements.mfaSetupPanel.classList.remove('hidden');
        this.elements.btnEnable2FA.disabled = true;

        try {
            const data = await PlayerService.enrollMFA();
            this._mfaEnrollId = data.id;
            this.elements.mfaQrImg.src = data.totp.qr_code;
            this.elements.mfaSecret.textContent = data.totp.secret;
            this.elements.mfaSetupCode.value = '';
            this.setMessage(this.elements.mfaSetupMsg, '', '');
        } catch (err) {
            this.setMessage(this.elements.mfaSetupMsg, 'ERROR: ' + err.message, 'error');
            this.elements.mfaSetupPanel.classList.add('hidden');
        } finally {
            this.elements.btnEnable2FA.disabled = false;
        }
    },

    async confirmMFASetup() {
        const code = this.elements.mfaSetupCode.value.trim();
        if (!code || code.length !== 6) {
            this.setMessage(this.elements.mfaSetupMsg, 'ENTER THE 6-DIGIT CODE FROM YOUR APP.', 'error');
            return;
        }
        const btn = document.getElementById('btn-confirm-2fa');
        if (btn) { btn.disabled = true; btn.textContent = '...'; }

        try {
            await PlayerService.verifyMFAEnrollment(this._mfaEnrollId, code);
            this._mfaEnrollId = null;
            this.elements.mfaSetupPanel.classList.add('hidden');
            this._set2FAStatus(true);
            this.setMessage(this.elements.mfaSetupMsg, '', '');
        } catch (err) {
            this.setMessage(this.elements.mfaSetupMsg, 'INVALID CODE: ' + err.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'CONFIRM & ENABLE'; }
        }
    },

    async handleDisable2FA() {
        if (!confirm('DISABLE two-factor authentication? Your account will be less secure.')) return;

        try {
            const factors = await PlayerService.listMFAFactors();
            const totp = factors?.totp?.[0];
            if (totp) {
                await PlayerService.unenrollMFA(totp.id);
                this._set2FAStatus(false);
            }
        } catch (err) {
            alert('FAILED TO DISABLE 2FA: ' + err.message);
        }
    },

    _set2FAStatus(enabled) {
        if (!this.elements.mfaStatusText) return;
        if (enabled) {
            this.elements.mfaStatusText.textContent = '2FA: ENABLED âœ”';
            this.elements.mfaStatusText.className = 'mfa-status-on';
            this.elements.btnEnable2FA.classList.add('hidden');
            this.elements.btnDisable2FA.classList.remove('hidden');
        } else {
            this.elements.mfaStatusText.textContent = '2FA: DISABLED';
            this.elements.mfaStatusText.className = 'mfa-status-off';
            this.elements.btnEnable2FA.classList.remove('hidden');
            this.elements.btnDisable2FA.classList.add('hidden');
        }
    },

    async _refreshMFAStatus() {
        try {
            const factors = await PlayerService.listMFAFactors();
            const enabled = (factors?.totp?.length ?? 0) > 0;
            this._set2FAStatus(enabled);
        } catch (_) { /* silently skip if MFA API unavailable */ }
    },

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------
    _hideAllForms() {
        const allForms = [
            this.elements.loginForm,
            this.elements.signupForm,
            this.elements.quickregForm,
            this.elements.forgotPasswordForm,
            this.elements.resetPasswordForm,
            this.elements.mfaChallengeForm,
            this.elements.userPanel,
        ];
        allForms.forEach(f => f && f.classList.add('hidden'));
    },

    toggleLoginMode() {
        this.loginUsernameMode = !this.loginUsernameMode;
        const { loginEmailGroup, loginUsernameGroup, loginEmail, loginUsername, toggleLoginModeBtn } = this.elements;
        if (this.loginUsernameMode) {
            loginEmailGroup.classList.add('hidden');
            loginUsernameGroup.classList.remove('hidden');
            loginEmail.removeAttribute('required');
            loginUsername.setAttribute('required', 'required');
            toggleLoginModeBtn.textContent = 'ðŸ“§ Login with email instead';
        } else {
            loginEmailGroup.classList.remove('hidden');
            loginUsernameGroup.classList.add('hidden');
            loginEmail.setAttribute('required', 'required');
            loginUsername.removeAttribute('required');
            toggleLoginModeBtn.textContent = 'âš¡ Login with username instead';
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
        if (newName.length > 12) { alert('Name too long (Max 12 chars)'); return; }

        const submitBtn = this.elements.saveBtn;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '...';

        try {
            await PlayerService.updateProfile({ username: newName });
            this.toggleEditMode(false);
        } catch (err) {
            console.error('Name update failed', err);
            alert('Update Failed: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'âœ”';
        }
    },

    open() {
        console.log('[AuthUI] Opening modal...');
        const profile = PlayerService.getCurrentProfile();

        if (profile && !profile.is_anonymous) {
            this.showUserPanel(profile);
        } else {
            this.switchTab('login');
            this.elements.userPanel.classList.add('hidden');
            this.elements.loginForm.classList.remove('hidden');
            if (this.elements.tabLogin?.parentElement) {
                this.elements.tabLogin.parentElement.classList.remove('hidden');
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
        this._hideAllForms();

        // Re-show tabs bar
        if (this.elements.tabLogin?.parentElement) {
            this.elements.tabLogin.parentElement.classList.remove('hidden');
        }

        this.elements.tabLogin.classList.remove('active');
        this.elements.tabSignup.classList.remove('active');
        this.elements.tabQuickreg.classList.remove('active');

        if (tab === 'login') {
            this.elements.loginForm.classList.remove('hidden');
            this.elements.tabLogin.classList.add('active');
            this.setMessage(this.elements.loginMsg, '', '');
        } else if (tab === 'signup') {
            this.elements.signupForm.classList.remove('hidden');
            this.elements.tabSignup.classList.add('active');
            this.setMessage(this.elements.signupMsg, '', '');
        } else if (tab === 'quickreg') {
            this.elements.quickregForm.classList.remove('hidden');
            this.elements.tabQuickreg.classList.add('active');
            this.setMessage(this.elements.quickregMsg, '', '');
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const submitBtn = this.elements.loginForm.querySelector('button[type="submit"]');
        let mfaNeeded = false;

        this.setMessage(this.elements.loginMsg, 'AUTHENTICATING...', '');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.textContent; submitBtn.textContent = '...'; }

        try {
            if (this.loginUsernameMode) {
                await PlayerService.signInWithUsername(this.elements.loginUsername.value.trim(), this.elements.loginPass.value);
            } else {
                await PlayerService.signInWithEmail(this.elements.loginEmail.value, this.elements.loginPass.value);
            }

            // Check if MFA step-up is required
            mfaNeeded = await this._checkMFARequired();
            if (!mfaNeeded) {
                this.setMessage(this.elements.loginMsg, 'ACCESS GRANTED', 'success');
                setTimeout(() => { this.close(); this.updateAuthButtonState(); }, 1000);
            }
        } catch (err) {
            console.error('[AuthUI] Login error:', err);
            let msg = err.message;
            if (msg.includes('rate limit')) msg = 'TOO MANY ATTEMPTS. PLEASE WAIT A FEW MINUTES.';
            this.setMessage(this.elements.loginMsg, 'ACCESS DENIED: ' + msg, 'error');
        } finally {
            // Only restore button if MFA screen did NOT take over
            if (!mfaNeeded && submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
        }
    },

    async handleSignup(e) {
        e.preventDefault();
        const email = this.elements.signupEmail.value;
        const pass = this.elements.signupPass.value;
        const username = this.elements.signupUser.value;
        const submitBtn = this.elements.signupForm.querySelector('button[type="submit"]');

        const passErr = validatePassword(pass);
        if (passErr) { this.setMessage(this.elements.signupMsg, passErr, 'error'); return; }

        this.setMessage(this.elements.signupMsg, 'CREATING IDENTITY...', '');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.textContent; submitBtn.textContent = '...'; }

        try {
            const result = await PlayerService.signUpWithEmail(email, pass, username);
            if (result.profile) {
                this.setMessage(this.elements.signupMsg, 'IDENTITY CONFIRMED. LOGGING IN...', 'success');
                setTimeout(() => { this.close(); this.updateAuthButtonState(); }, 1000);
            } else {
                this.setMessage(this.elements.signupMsg, 'CONFIRMATION LINK SENT TO EMAIL.', 'success');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
            }
        } catch (err) {
            console.error(err);
            let msg = err.message;
            if (msg.includes('rate limit')) msg = 'TOO MANY ATTEMPTS. PLEASE WAIT A FEW MINUTES.';
            this.setMessage(this.elements.signupMsg, 'ERROR: ' + msg, 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
        }
    },

    async handleQuickReg(e) {
        e.preventDefault();
        const username = this.elements.qrUsername.value.trim();
        const password = this.elements.qrPassword.value;
        const submitBtn = this.elements.quickregForm.querySelector('button[type="submit"]');

        if (!username) { this.setMessage(this.elements.quickregMsg, 'ERROR: USERNAME REQUIRED.', 'error'); return; }

        const passErr = validatePassword(password);
        if (passErr) { this.setMessage(this.elements.quickregMsg, passErr, 'error'); return; }

        this.setMessage(this.elements.quickregMsg, 'CREATING IDENTITY...', '');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.textContent; submitBtn.textContent = '...'; }

        try {
            const result = await PlayerService.signUpWithUsername(username, password);
            if (result.profile) {
                this.setMessage(this.elements.quickregMsg, 'IDENTITY CONFIRMED. WELCOME, ' + username.toUpperCase() + '!', 'success');
                setTimeout(() => { this.close(); this.updateAuthButtonState(); }, 1200);
            } else {
                this.setMessage(this.elements.quickregMsg, 'CHECK YOUR EMAIL TO CONFIRM.', 'success');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
            }
        } catch (err) {
            console.error('[AuthUI] Quick signup error:', err);
            let msg = err.message;
            if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('User already registered')) {
                msg = 'USERNAME ALREADY TAKEN. CHOOSE ANOTHER.';
            } else if (msg.includes('rate limit')) {
                msg = 'TOO MANY ATTEMPTS. PLEASE WAIT A FEW MINUTES.';
            }
            this.setMessage(this.elements.quickregMsg, 'ERROR: ' + msg, 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
        }
    },

    async handleLogout() {
        if (confirm('TERMINATE CONNECTION? ALL UNSAVED PROGRESS WILL BE LOST.')) {
            await PlayerService.logout();
            this.switchTab('login');
            this.updateAuthButtonState();
        }
    },

    async handleDeleteAccount() {
        const confirm1 = confirm('CRITICAL WARNING: INITIATING DRIVE WIPE.');
        if (confirm1) {
            const confirm2 = confirm('FINAL AUTHORIZATION REQUIRED. This action is PERMANENT. Are you sure?');
            if (confirm2) {
                try {
                    await PlayerService.deleteAccount();
                    this.switchTab('login');
                    this.updateAuthButtonState();
                    alert('DRIVE WIPE COMPLETE. IDENTITY ERASED.');
                } catch (err) {
                    console.error(err);
                    alert('DRIVE WIPE FAILED: ' + err.message);
                }
            }
        }
    },

    showUserPanel(profile) {
        if (this.elements.tabLogin?.parentElement) {
            this.elements.tabLogin.parentElement.classList.add('hidden');
        }
        this._hideAllForms();
        this.elements.userPanel.classList.remove('hidden');

        document.getElementById('display-username').textContent = profile.username;
        document.getElementById('display-score').textContent = profile.high_score || 0;
        document.getElementById('display-games').textContent = profile.total_games_played || 0;

        // Refresh 2FA status badge
        this._refreshMFAStatus();
    },

    updateAuthButtonState() {
        const profile = PlayerService.getCurrentProfile();
        if (this.elements.authTriggerBtn) {
            if (profile && !profile.is_anonymous) {
                this.elements.authTriggerBtn.innerHTML = `<span class="icon">ðŸ‘¤</span> ${profile.username.toUpperCase()}`;
                this.elements.authTriggerBtn.title = 'View Account Information';
            } else {
                this.elements.authTriggerBtn.innerHTML = `<span class="icon">ðŸ‘¤</span> LOGIN`;
                this.elements.authTriggerBtn.title = 'Login or Register';
            }
        }
    },

    setMessage(el, msg, type) {
        if (!el) return;
        el.textContent = msg;
        el.className = 'auth-msg ' + type;
    }
};
