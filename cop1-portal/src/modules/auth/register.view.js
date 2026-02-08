
import { supabase } from '../../services/supabase.js';
import { toggleLoader, showToast } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { APP_CONFIG } from '../../core/constants.js';
import { SCHOOLS } from '../../core/schools.js';
import { t } from '../../services/i18n.js';

const { LOGO_URL, BUCKET_PROOF } = APP_CONFIG;

export function renderRegister() {
    return `
        <div class="min-h-[100dvh] w-full bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-4">
            <!-- Background Decorations -->
            <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div class="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-blue-400/20 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div class="absolute top-[40%] -left-[10%] w-[60vw] h-[60vw] bg-brand-400/20 rounded-full blur-[100px] animate-pulse-slow" style="animation-delay: 1s;"></div>
            </div>

            <!-- Card -->
            <div class="relative w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 z-10 animate-fade-in max-h-[90vh] overflow-y-auto no-scrollbar">
                
                <!-- Header -->
                <div class="text-center mb-8"> 
                    <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-50 to-white shadow-sm mb-4 border border-brand-100/50">
                        <img src="${LOGO_URL}" class="w-12 h-12 object-contain" alt="Logo">
                    </div>
                    <h1 class="text-2xl font-extrabold text-slate-800 tracking-tight">${t('auth.register.title')}</h1>
                    <p class="text-slate-500 font-medium">${t('auth.register.subtitle')}</p>
                </div>

                <!-- Segmented Control -->
                <div class="bg-slate-100/80 p-1.5 rounded-2xl mb-8 flex relative">
                    <button data-link="/login" class="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-all duration-300">${t('auth.login.title')}</button>
                    <button class="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white text-brand-600 shadow-sm transition-all duration-300 cursor-default">${t('auth.register.title')}</button>
                </div>

                <!-- Form -->
                <form id="form-register" class="space-y-4 pb-4">
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-500 uppercase ml-1">${t('profile.form.firstName')}</label>
                            <div class="relative group">
                                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                    <i data-lucide="user" class="w-5 h-5"></i>
                                </div>
                                <input id="reg-fn" type="text" required class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="${t('profile.form.firstName')}">
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-500 uppercase ml-1">${t('profile.form.lastName')}</label>
                            <div class="relative group">
                                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                    <i data-lucide="user" class="w-5 h-5"></i>
                                </div>
                                <input id="reg-ln" type="text" required class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="${t('profile.form.lastName')}">
                            </div>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-500 uppercase ml-1">${t('auth.login.email')}</label>
                        <div class="relative group">
                            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                <i data-lucide="mail" class="w-5 h-5"></i>
                            </div>
                            <input id="reg-email" type="email" autocomplete="username" required class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="exemple@email.com">
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-500 uppercase ml-1">${t('profile.form.phone')}</label>
                        <div class="relative group">
                            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                <i data-lucide="phone" class="w-5 h-5"></i>
                            </div>
                            <input id="reg-phone" type="tel" inputmode="tel" pattern="[0-9+\s\-]*" required class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="+33 6 12 34 56 78">
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-500 uppercase ml-1">${t('auth.login.password')}</label>
                            <div class="relative group">
                                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                    <i data-lucide="lock" class="w-5 h-5"></i>
                                </div>
                                <input id="reg-pass" type="password" autocomplete="new-password" required class="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="••••••••">
                                <button type="button" id="toggle-reg-password" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors" tabindex="-1">
                                    <i data-lucide="eye" class="w-5 h-5"></i>
                                </button>
                            </div>
                            
                            <!-- Password Strength Indicator -->
                            <div id="password-strength-container" class="hidden mt-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2.5 animate-fade-in">
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
                                    <i data-lucide="lock" class="w-5 h-5"></i>
                                </div>
                                <input id="reg-pass-confirm" type="password" autocomplete="new-password" required class="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="••••••••">
                                <button type="button" id="toggle-reg-password-confirm" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors" tabindex="-1">
                                    <i data-lucide="eye" class="w-5 h-5"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 1. School Selection (Premium Combobox) -->
                    <div class="space-y-1.5 relative z-50">
                        <label class="text-xs font-bold text-slate-500 uppercase ml-1">${t('profile.form.school')}</label>
                        <div class="relative group">
                            <i data-lucide="graduation-cap" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500 z-10 transition-colors group-hover:text-brand-600"></i>
                            
                            <!-- Hidden Input for Form Submission -->
                            <input type="hidden" id="reg-school" name="school">

                            <!-- Display Input (Search) -->
                            <input type="text" id="school-search" placeholder="${t('profile.form.searchSchool')}" autocomplete="off"
                                class="w-full pl-12 pr-10 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300 cursor-pointer hover:bg-white">
                            
                            <i id="school-chevron" data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform duration-300 pointer-events-none"></i>

                            <!-- Dropdown List -->
                            <div id="school-dropdown" class="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto hidden opacity-0 translate-y-2 transition-all duration-200 scrollbar-hide z-50">
                                <div id="school-list" class="p-1.5 space-y-0.5">
                                    <!-- Options injected via JS -->
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 1b. Precision for "Autre" -->
                    <div id="school-other-container" class="hidden space-y-1.5 animate-fade-in relative z-40">
                        <label class="text-xs font-bold text-slate-500 uppercase ml-1">${t('profile.form.specifySchool')}</label>
                        <div class="relative group">
                            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                <i data-lucide="building-2" class="w-5 h-5"></i>
                            </div>
                            <input id="reg-school-other" type="text" class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="${t('profile.form.schoolName')}">
                        </div>
                    </div>

                    <!-- 2. Justificatif (Proof) -->
                    <div class="space-y-2 pt-2">
                        <div class="ml-1 mb-2">
                            <label class="block text-xs font-bold text-slate-500 uppercase">${t('auth.register.proof.label')}</label>
                            <p class="text-[10px] text-slate-400 leading-tight mt-1">
                                ${t('auth.register.proof.accepted')}
                            </p>
                        </div>
                        
                        <div id="upload-zone" class="relative group cursor-pointer bg-slate-50/50 border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center transition-all hover:bg-white/80 hover:shadow-lg hover:shadow-brand-500/5">
                            
                            <input id="reg-proof" type="file" required accept="image/*,.pdf,.heic,.HEIC" class="hidden">
                            
                            <div id="upload-default" class="flex flex-col items-center gap-2">
                                <div class="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-brand-600 group-hover:scale-110 group-hover:text-brand-700 transition-all duration-300 ring-4 ring-slate-50 group-hover:ring-brand-50">
                                    <i data-lucide="upload" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-700 group-hover:text-brand-700 transition-colors">${t('auth.register.proof.clickAdd')}</p>
                                    <p class="text-[10px] text-slate-400 font-medium mt-1">PDF, JPG, PNG (Max 5 Mo)</p>
                                </div>
                            </div>

                            <div id="upload-success" class="hidden flex-col items-center gap-2 animate-fade-in">
                                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm ring-4 ring-green-50">
                                    <i data-lucide="check" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-900" id="file-name-display"></p>
                                    <p class="text-[10px] text-brand-600 font-bold mt-1 hover:underline">${t('auth.register.proof.changeFile')}</p>
                                </div>
                            </div>

                        </div>

                        <!-- Privacy Note -->
                        <div class="flex items-start gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                            <i data-lucide="shield-check" class="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0"></i>
                            <p class="text-[10px] text-blue-400/80 leading-snug font-medium">
                                ${t('auth.register.proof.privacy')}
                            </p>
                        </div>
                    </div>
                    
                    <!-- 3. Permit Checkbox -->
                    <label class="flex items-center gap-3 p-3 bg-white/50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-all shadow-sm group">
                        <input type="checkbox" id="reg-permit" class="w-5 h-5 text-brand-600 rounded border-slate-300 focus:ring-brand-500 transition-all">
                        <span class="text-sm font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">${t('profile.form.hasPermit')} 🚗</span>
                    </label>

                    <!-- 4. Mandatory Hours Checkbox -->
                    <label class="flex items-start gap-3 p-3 bg-orange-50/80 border border-orange-100 rounded-xl cursor-pointer hover:bg-orange-100 transition-all shadow-sm group">
                        <input type="checkbox" id="reg-mandatory" class="w-5 h-5 text-orange-500 rounded border-orange-200 focus:ring-orange-500 transition-all">
                        <div>
                            <span class="text-sm font-bold text-orange-900 block">${t('auth.register.mandatory.label')}</span>
                            <span class="text-[10px] text-orange-700 leading-tight block">${t('auth.register.mandatory.desc')}</span>
                        </div>
                    </label>

                    <!-- 5. CGU & Privacy Consent Checkbox (New) -->
                    <label class="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-all shadow-sm group">
                        <input type="checkbox" id="reg-cgu" required class="w-5 h-5 text-brand-600 rounded border-slate-300 focus:ring-brand-500 transition-all mt-0.5">
                        <div class="text-xs text-slate-600 leading-snug">
                             ${t('auth.register.consent')}
                        </div>
                    </label>

                    <button type="submit" class="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 mt-4 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 transform">
                        ${t('auth.register.submit')}
                    </button>
                    
                    <div class="pt-6 text-center flex justify-center gap-4 text-[10px] text-slate-400 font-medium">
                        <button type="button" data-link="/legal/mentions" class="hover:text-slate-600 transition-colors">${t('nav.legal.mentions')}</button> •
                        <button type="button" data-link="/legal/privacy" class="hover:text-slate-600 transition-colors">${t('nav.legal.privacy')}</button> •
                        <button type="button" data-link="/legal/cgu" class="hover:text-slate-600 transition-colors">${t('nav.legal.cgu')}</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

export function initRegister() {
    createIcons({ icons });

    // --- Premium School Combobox Logic ---
    const schoolInput = document.getElementById('school-search');
    const schoolHidden = document.getElementById('reg-school');
    const schoolDropdown = document.getElementById('school-dropdown');
    const schoolList = document.getElementById('school-list');
    const schoolChevron = document.getElementById('school-chevron');

    // Sort schools alphabetically for better UX (optional but premium)
    const sortedSchools = [...SCHOOLS].sort((a, b) => a.localeCompare(b));

    function renderSchools(filter = '') {
        if (!schoolList) return;
        const search = filter.toLowerCase();
        const filtered = sortedSchools.filter(s => s.toLowerCase().includes(search));

        if (filtered.length === 0) {
            schoolList.innerHTML = `<div class="px-3 py-2 text-xs text-slate-400 font-medium text-center">${t('common.noResult')}</div>`;
            return;
        }

        schoolList.innerHTML = filtered.map(s => `
            <div data-value="${s}" class="school-option px-3 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-brand-50 hover:text-brand-700 cursor-pointer flex items-center gap-2 transition-colors">
                <span class="w-1.5 h-1.5 rounded-full bg-brand-200 opacity-0 transition-opacity"></span>
                ${s}
            </div>
        `).join('');

        // Re-attach listeners
        schoolList.querySelectorAll('.school-option').forEach(opt => {
            opt.addEventListener('click', () => {
                selectSchool(opt.dataset.value);
            });
        });
    }

    function toggleDropdown(show) {
        if (show) {
            schoolDropdown.classList.remove('hidden');
            requestAnimationFrame(() => {
                schoolDropdown.classList.remove('opacity-0', 'translate-y-2');
            });
            schoolChevron.classList.add('rotate-180');
        } else {
            schoolDropdown.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => schoolDropdown.classList.add('hidden'), 200);
            schoolChevron.classList.remove('rotate-180');
        }
    }

    function selectSchool(val) {
        schoolInput.value = val;
        schoolHidden.value = val;

        // Handle "Autre" logic
        const otherContainer = document.getElementById('school-other-container');
        const otherInput = document.getElementById('reg-school-other');

        if (val === 'Autre') {
            otherContainer.classList.remove('hidden');
            otherInput.setAttribute('required', 'true');
            otherInput.focus();
        } else {
            otherContainer.classList.add('hidden');
            otherInput.removeAttribute('required');
            otherInput.value = ''; // Reset
        }

        toggleDropdown(false);
        schoolInput.classList.remove('text-slate-400');
        schoolInput.classList.add('text-slate-800');
    }

    if (schoolInput) {
        // Init List
        renderSchools();

        // Focus / Click
        schoolInput.addEventListener('focus', () => toggleDropdown(true));
        schoolInput.addEventListener('click', () => toggleDropdown(true));

        // Typing
        schoolInput.addEventListener('input', (e) => {
            renderSchools(e.target.value);
            toggleDropdown(true);
            // Clear hidden value if user types something custom (or force selection?)
            // For now, let's keep it open.
        });

        // Click Outside
        document.addEventListener('click', (e) => {
            if (!schoolInput.contains(e.target) && !schoolDropdown.contains(e.target)) {
                toggleDropdown(false);
            }
        });
    }
    // -------------------------------------

    const form = document.getElementById('form-register');
    const fileInput = document.getElementById('reg-proof');
    const uploadZone = document.getElementById('upload-zone');
    const def = document.getElementById('upload-default');
    const suc = document.getElementById('upload-success');
    const nameDisplay = document.getElementById('file-name-display');

    // 0. Password Toggle
    const toggleBtn = document.getElementById('toggle-reg-password');
    const passInput = document.getElementById('reg-pass');

    if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', () => {
            const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passInput.setAttribute('type', type);
            // Update Icon
            toggleBtn.innerHTML = `<i data-lucide="${type === 'password' ? 'eye' : 'eye-off'}" class="w-5 h-5"></i>`;
            createIcons({ icons, nameAttr: 'data-lucide', attrs: { class: "w-5 h-5" } });
        });
    }

    // 0a. Password Strength Validation
    const strengthContainer = document.getElementById('password-strength-container');
    const strengthBar = document.getElementById('password-strength-bar');
    const strengthLabel = document.getElementById('password-strength-label');
    const reqLength = document.getElementById('req-length');
    const reqUpper = document.getElementById('req-upper');
    const reqLower = document.getElementById('req-lower');
    const reqNumber = document.getElementById('req-number');

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

    function checkPasswordStrength(password) {
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
        createIcons({ icons, nameAttr: 'data-lucide', attrs: { class: "w-3 h-3" } });

        // Calculate strength score (0-4)
        const score = Object.values(checks).filter(Boolean).length;

        // Update bar and label
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

    if (passInput && strengthContainer) {
        passInput.addEventListener('focus', () => {
            strengthContainer.classList.remove('hidden');
        });

        passInput.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value);
        });
    }

    // 0b. Confirm Password Toggle
    const toggleConfirmBtn = document.getElementById('toggle-reg-password-confirm');
    const passConfirmInput = document.getElementById('reg-pass-confirm');

    if (toggleConfirmBtn && passConfirmInput) {
        toggleConfirmBtn.addEventListener('click', () => {
            const type = passConfirmInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passConfirmInput.setAttribute('type', type);
            // Update Icon
            toggleConfirmBtn.innerHTML = `<i data-lucide="${type === 'password' ? 'eye' : 'eye-off'}" class="w-5 h-5"></i>`;
            createIcons({ icons, nameAttr: 'data-lucide', attrs: { class: "w-5 h-5" } });
        });
    }

    // 1. Gestion du clic sur la zone d'upload
    if (uploadZone && fileInput) {
        uploadZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];

                // UX : Mise à jour du design (Vert = Succès)
                uploadZone.classList.remove('border-slate-300', 'bg-slate-50/50');
                uploadZone.classList.add('border-green-500', 'bg-green-50/50');

                def.classList.add('hidden');
                suc.classList.remove('hidden');
                suc.style.display = 'flex';

                // Affichage du nom (tronqué si trop long)
                nameDisplay.innerText = file.name.length > 25 ? file.name.substring(0, 20) + '...' : file.name;

            } else {
                // Reset si annulation
                uploadZone.classList.add('border-slate-300', 'bg-slate-50/50');
                uploadZone.classList.remove('border-green-500', 'bg-green-50/50');

                def.classList.remove('hidden');
                suc.classList.add('hidden');
                suc.style.display = 'none';
            }
        });
    }

    // 2. Gestion du Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Gather inputs
            const fn = document.getElementById('reg-fn').value.trim();
            const ln = document.getElementById('reg-ln').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const pass = document.getElementById('reg-pass').value.trim();
            const passConfirm = document.getElementById('reg-pass-confirm').value.trim();
            const permit = document.getElementById('reg-permit').checked;
            const mandatory = document.getElementById('reg-mandatory').checked;
            const cguAccepted = document.getElementById('reg-cgu').checked;
            let school = document.getElementById('reg-school').value;

            // Handle "Autre" - use custom input
            if (school === 'Autre') {
                const schoolOther = document.getElementById('reg-school-other').value.trim();
                if (!schoolOther) return showToast(t('profile.form.error.specifySchool'), "error");
                school = schoolOther;
            }

            const file = fileInput.files[0];

            if (!fn || !ln || !email || !pass || !passConfirm || !phone) return showToast(t('common.error.fillAll'), "error");

            // Password strength validation
            const passwordChecks = {
                length: pass.length >= 8,
                upper: /[A-Z]/.test(pass),
                lower: /[a-z]/.test(pass),
                number: /[0-9]/.test(pass)
            };
            const allChecksPassed = Object.values(passwordChecks).every(Boolean);
            if (!allChecksPassed) {
                return showToast(t('auth.register.error.passwordRequirements'), "error");
            }

            if (pass !== passConfirm) return showToast(t('auth.register.error.passwordMismatch'), "error");
            if (!file) return showToast(t('auth.register.error.proofRequired'), "error");
            if (!cguAccepted) return showToast(t('auth.register.error.policyRequired'), "error");

            toggleLoader(true);
            try {
                // A. CREATION DU COMPTE
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: pass,
                    options: {
                        data: {
                            first_name: fn,
                            last_name: ln,
                            phone: phone,
                            has_permit: permit,
                            mandatory_hours: mandatory,
                            school: school
                        }
                    }
                });

                if (error) throw error;

                // B. UPLOAD DU FICHIER
                if (data.user) {
                    const { error: uploadError } = await supabase.storage
                        .from(BUCKET_PROOF)
                        .upload(data.user.id, file, { upsert: true });

                    if (uploadError) {
                        console.error('Upload error:', uploadError);
                        // On ne bloque pas l'inscription mais on prévient
                        showToast(t('auth.register.error.upload'), "warning");
                    }
                }

                showToast(t('auth.register.success'), "success");

                // C. REDIRECTION (Reload pour initier la session proprement)
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (err) {
                console.error(err);
                showToast(err.message, "error");
                toggleLoader(false);
            }
        });
    }
}
