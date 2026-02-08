import { supabase } from '../../services/supabase.js';
import { toggleLoader, showToast } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { APP_CONFIG } from '../../core/constants.js';
import { router } from '../../core/router.js';
import { store } from '../../core/store.js';
import { t } from '../../services/i18n.js';

const { LOGO_URL } = APP_CONFIG;

export function renderResetPassword() {
    return `
        <div class="min-h-[100dvh] w-full bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-4">
            <!-- Background Decorations -->
            <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div class="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-emerald-400/20 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div class="absolute top-[40%] -left-[10%] w-[60vw] h-[60vw] bg-brand-400/20 rounded-full blur-[100px] animate-pulse-slow" style="animation-delay: 1s;"></div>
            </div>

            <!-- Card -->
            <div class="relative w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 z-10 animate-fade-in">
                <!-- Header -->
                <div class="text-center mb-8"> 
                    <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-white shadow-sm mb-4 border border-emerald-100/50">
                        <i data-lucide="key-round" class="w-10 h-10 text-emerald-600"></i>
                    </div>
                    <h1 class="text-2xl font-extrabold text-slate-800 tracking-tight">${t('auth.resetPassword.title')}</h1>
                    <p class="text-slate-500 font-medium mt-2">${t('auth.resetPassword.subtitle')}</p>
                </div>

                <!-- Form -->
                <form id="form-reset-password" class="space-y-5">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-500 uppercase ml-1">${t('auth.login.password')}</label>
                        <div class="relative group">
                            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                <i data-lucide="lock" class="w-5 h-5"></i>
                            </div>
                            <input id="new-password" type="password" autocomplete="new-password" required minlength="8"
                                class="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" 
                                placeholder="••••••••">
                            <button type="button" id="toggle-new-password" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors" tabindex="-1">
                                <i data-lucide="eye" class="w-5 h-5"></i>
                            </button>
                        </div>
                        
                        <!-- Password Strength Indicator -->
                        <div id="password-strength" class="hidden mt-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2.5 animate-fade-in">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">${t('auth.password.strength.title')}</span>
                                <span id="password-strength-label" class="text-[10px] font-bold uppercase tracking-wide text-slate-400">—</span>
                            </div>
                            <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div id="password-strength-bar" class="h-full w-0 rounded-full transition-all duration-300 ease-out"></div>
                            </div>
                            <div class="grid grid-cols-2 gap-1.5 pt-1">
                                <div id="req-length" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                    <i data-lucide="circle" class="w-3 h-3"></i>
                                    <span>${t('auth.password.requirements.length')}</span>
                                </div>
                                <div id="req-upper" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                    <i data-lucide="circle" class="w-3 h-3"></i>
                                    <span>${t('auth.password.requirements.upper')}</span>
                                </div>
                                <div id="req-lower" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                    <i data-lucide="circle" class="w-3 h-3"></i>
                                    <span>${t('auth.password.requirements.lower')}</span>
                                </div>
                                <div id="req-number" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                    <i data-lucide="circle" class="w-3 h-3"></i>
                                    <span>${t('auth.password.requirements.number')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-500 uppercase ml-1">${t('auth.register.confirmPassword')}</label>
                        <div class="relative group">
                            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                <i data-lucide="lock-keyhole" class="w-5 h-5"></i>
                            </div>
                            <input id="confirm-password" type="password" autocomplete="new-password" required minlength="8"
                                class="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" 
                                placeholder="••••••••">
                            <button type="button" id="toggle-confirm-password" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors" tabindex="-1">
                                <i data-lucide="eye" class="w-5 h-5"></i>
                            </button>
                        </div>
                        <p id="match-indicator" class="text-[10px] font-bold text-slate-400 ml-1 hidden"></p>
                    </div>
                    
                    <button type="submit" id="btn-submit" class="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                        ${t('auth.resetPassword.submit')}
                    </button>
                    
                    <div class="pt-4 text-center">
                        <button type="button" data-link="/login" class="text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors flex items-center justify-center gap-2 mx-auto">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            ${t('auth.resetPassword.backToLogin')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

export function initResetPassword() {
    createIcons({ icons });

    const form = document.getElementById('form-reset-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const strengthContainer = document.getElementById('password-strength');
    const matchIndicator = document.getElementById('match-indicator');

    // Password visibility toggles
    setupPasswordToggle('toggle-new-password', 'new-password');
    setupPasswordToggle('toggle-confirm-password', 'confirm-password');

    // Password strength indicator
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', () => {
            const password = newPasswordInput.value;
            if (password.length > 0) {
                strengthContainer.classList.remove('hidden');
                updatePasswordStrength(password);
            } else {
                strengthContainer.classList.add('hidden');
            }
            checkPasswordMatch();
        });
    }

    // Password match indicator
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }

    function checkPasswordMatch() {
        const password = newPasswordInput?.value || '';
        const confirm = confirmPasswordInput?.value || '';

        if (confirm.length > 0) {
            matchIndicator.classList.remove('hidden');
            if (password === confirm) {
                matchIndicator.textContent = `✓ ${t('auth.resetPassword.match.success')}`;
                matchIndicator.classList.remove('text-red-500');
                matchIndicator.classList.add('text-emerald-500');
            } else {
                matchIndicator.textContent = `✗ ${t('auth.resetPassword.match.error')}`;
                matchIndicator.classList.remove('text-emerald-500');
                matchIndicator.classList.add('text-red-500');
            }
        } else {
            matchIndicator.classList.add('hidden');
        }
    }

    // Form submission
    if (form) {
        form.addEventListener('submit', handleResetSubmit);
    }
}

function setupPasswordToggle(toggleId, inputId) {
    const toggleBtn = document.getElementById(toggleId);
    const input = document.getElementById(inputId);

    if (toggleBtn && input) {
        toggleBtn.addEventListener('click', () => {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            toggleBtn.innerHTML = `<i data-lucide="${type === 'password' ? 'eye' : 'eye-off'}" class="w-5 h-5"></i>`;
            createIcons({ icons, nameAttr: 'data-lucide', attrs: { class: "w-5 h-5" } });
        });
    }
}

function updateRequirement(el, isValid) {
    if (!el) return;
    // Find existing icon element (could be i or svg after Lucide processing)
    const existingIcon = el.querySelector('i, svg');

    if (isValid) {
        el.classList.remove('text-slate-400');
        el.classList.add('text-green-600');
        // Replace with new icon if needed
        if (existingIcon) {
            existingIcon.outerHTML = '<i data-lucide="check-circle" class="w-3 h-3"></i>';
        }
    } else {
        el.classList.remove('text-green-600');
        el.classList.add('text-slate-400');
        if (existingIcon) {
            existingIcon.outerHTML = '<i data-lucide="circle" class="w-3 h-3"></i>';
        }
    }
}

function updatePasswordStrength(password) {
    const strengthBar = document.getElementById('password-strength-bar');
    const strengthLabel = document.getElementById('password-strength-label');
    const reqLength = document.getElementById('req-length');
    const reqUpper = document.getElementById('req-upper');
    const reqLower = document.getElementById('req-lower');
    const reqNumber = document.getElementById('req-number');

    if (!strengthBar || !strengthLabel) return null;

    const checks = {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password)
    };

    // Update visual indicators
    updateRequirement(reqLength, checks.length);
    updateRequirement(reqUpper, checks.upper);
    updateRequirement(reqLower, checks.lower);
    updateRequirement(reqNumber, checks.number);

    // Refresh icons ONCE after all updates
    createIcons({ icons, nameAttr: 'data-lucide', attrs: { class: 'w-3 h-3' } });

    // Calculate strength score (0-4)
    const score = Object.values(checks).filter(Boolean).length;

    // Update bar and label
    const configs = [
        { width: '0%', color: 'bg-slate-300', label: '—', labelColor: 'text-slate-400' },
        { width: '25%', color: 'bg-red-500', label: t('auth.password.strength.weak'), labelColor: 'text-red-500' },
        { width: '50%', color: 'bg-orange-500', label: t('auth.password.strength.medium'), labelColor: 'text-orange-500' },
        { width: '75%', color: 'bg-yellow-500', label: t('auth.password.strength.good'), labelColor: 'text-yellow-500' },
        { width: '100%', color: 'bg-green-500', label: t('auth.password.strength.strong'), labelColor: 'text-green-600' }
    ];

    const config = configs[score];
    strengthBar.className = `h-full rounded-full transition-all duration-300 ease-out ${config.color}`;
    strengthBar.style.width = config.width;
    strengthLabel.textContent = config.label;
    strengthLabel.className = `text-[10px] font-bold uppercase tracking-wide ${config.labelColor}`;

    return checks;
}

async function handleResetSubmit(e) {
    e.preventDefault();

    const newPassword = document.getElementById('new-password')?.value;
    const confirmPassword = document.getElementById('confirm-password')?.value;

    if (!newPassword || !confirmPassword) {
        return showToast(t('common.error.fillAll'), "error");
    }

    // Password strength validation (same as registration)
    const passwordChecks = {
        length: newPassword.length >= 8,
        upper: /[A-Z]/.test(newPassword),
        lower: /[a-z]/.test(newPassword),
        number: /[0-9]/.test(newPassword)
    };
    const allChecksPassed = Object.values(passwordChecks).every(Boolean);
    if (!allChecksPassed) {
        return showToast(t('auth.register.error.passwordRequirements'), "error");
    }

    if (newPassword !== confirmPassword) {
        return showToast(t('auth.register.error.passwordMismatch'), "error");
    }

    toggleLoader(true);

    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            console.error("Password update error:", error);
            showToast(error.message || t('common.error'), "error");
        } else {
            showToast(t('auth.resetPassword.success'), "success");

            // Reset the password recovery mode flag
            store.state.isPasswordRecoveryMode = false;

            // Redirect to login after a short delay
            setTimeout(() => {
                router.navigateTo('/login');
            }, 1500);
        }
    } catch (err) {
        console.error("Unexpected error:", err);
        showToast(t('common.error'), "error");
    } finally {
        toggleLoader(false);
    }
}

export function cleanup() {
    const form = document.getElementById('form-reset-password');
    if (form) form.removeEventListener('submit', handleResetSubmit);
}
