
import { supabase } from '../../services/supabase.js';
import { toggleLoader, showToast } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { APP_CONFIG } from '../../core/constants.js';
import { SCHOOLS } from '../../core/schools.js';

const { LOGO_URL, BUCKET_PROOF } = APP_CONFIG;

export function renderRegister() {
    return `
        <div class="min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-900 relative overflow-hidden flex flex-col items-center justify-center p-4">
            <!-- Background Decorations -->
            <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div class="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-blue-400/20 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div class="absolute top-[40%] -left-[10%] w-[60vw] h-[60vw] bg-brand-400/20 rounded-full blur-[100px] animate-pulse-slow" style="animation-delay: 1s;"></div>
            </div>

            <!-- Card -->
            <div class="relative w-full max-w-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 p-6 z-10 animate-fade-in max-h-[90vh] overflow-y-auto no-scrollbar">
                
                <!-- Header -->
                <div class="text-center mb-8">
                    <div class="inline-flex items-center justify-center h-24 px-6 rounded-2xl bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/30 dark:to-slate-800 shadow-sm mb-4 border border-brand-100/50 dark:border-brand-800/50">
                        <img src="${LOGO_URL}" class="h-16 w-auto object-contain" alt="Logo">
                    </div>
                    <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Inscription</h1>
                    <p class="text-slate-500 dark:text-slate-400 font-medium">Rejoignez la communauté COP1</p>
                </div>

                <!-- Segmented Control -->
                <div class="bg-slate-100/80 dark:bg-slate-700/50 p-1.5 rounded-2xl mb-8 flex relative">
                    <button data-link="/login" class="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-600/50 transition-all duration-300">Connexion</button>
                    <button class="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm transition-all duration-300 cursor-default">Inscription</button>
                </div>

                <!-- Form -->
                <form id="form-register" class="space-y-4 pb-4">
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Prénom</label>
                            <div class="relative group">
                                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                    <i data-lucide="user" class="w-5 h-5"></i>
                                </div>
                                <input id="reg-fn" type="text" required class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="Prénom">
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Nom</label>
                            <div class="relative group">
                                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                    <i data-lucide="user" class="w-5 h-5"></i>
                                </div>
                                <input id="reg-ln" type="text" required class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="Nom">
                            </div>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                        <div class="relative group">
                            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                <i data-lucide="mail" class="w-5 h-5"></i>
                            </div>
                            <input id="reg-email" type="email" autocomplete="username" required class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="exemple@email.com">
                        </div>
                        <!-- Email Validation Feedback -->
                        <div id="email-feedback" class="hidden mt-2 p-2.5 rounded-xl border text-xs font-medium animate-fade-in"></div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-500 uppercase ml-1">Confirmer l'email</label>
                        <div class="relative group">
                            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                <i data-lucide="mail-check" class="w-5 h-5"></i>
                            </div>
                            <input id="reg-email-confirm" type="email" required class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="Confirmez votre email">
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-500 uppercase ml-1">Téléphone</label>
                        <div class="relative group">
                            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                <i data-lucide="phone" class="w-5 h-5"></i>
                            </div>
                            <input id="reg-phone" type="tel" inputmode="tel" pattern="[0-9+\s\-]*" required class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="+33 6 12 34 56 78">
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Mot de passe</label>
                            <div class="relative group">
                                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                    <i data-lucide="lock" class="w-5 h-5"></i>
                                </div>
                                <input id="reg-pass" type="password" autocomplete="new-password" required class="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="••••••••">
                                <button type="button" id="toggle-reg-password" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors" tabindex="-1">
                                    <i data-lucide="eye" class="w-5 h-5"></i>
                                </button>
                            </div>
                            
                            <!-- Password Strength Indicator -->
                            <div id="password-strength-container" class="hidden mt-3 p-3 bg-slate-50/80 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 space-y-2.5 animate-fade-in">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Force du mot de passe</span>
                                    <span id="password-strength-label" class="text-[10px] font-bold uppercase tracking-wide text-slate-400">—</span>
                                </div>
                                <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div id="password-strength-bar" class="h-full w-0 rounded-full transition-all duration-300 ease-out"></div>
                                </div>
                                <div class="grid grid-cols-2 gap-1.5 pt-1">
                                    <div id="req-length" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                        <i data-lucide="circle" class="w-3 h-3"></i>
                                        <span>8 caractères min.</span>
                                    </div>
                                    <div id="req-upper" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                        <i data-lucide="circle" class="w-3 h-3"></i>
                                        <span>1 majuscule</span>
                                    </div>
                                    <div id="req-lower" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                        <i data-lucide="circle" class="w-3 h-3"></i>
                                        <span>1 minuscule</span>
                                    </div>
                                    <div id="req-number" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                        <i data-lucide="circle" class="w-3 h-3"></i>
                                        <span>1 chiffre</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Confirmer</label>
                            <div class="relative group">
                                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                    <i data-lucide="lock" class="w-5 h-5"></i>
                                </div>
                                <input id="reg-pass-confirm" type="password" autocomplete="new-password" required class="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="••••••••">
                                <button type="button" id="toggle-reg-password-confirm" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors" tabindex="-1">
                                    <i data-lucide="eye" class="w-5 h-5"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 1. School Selection (Premium Combobox) -->
                    <div class="space-y-1.5 relative z-50">
                        <label class="text-xs font-bold text-slate-500 uppercase ml-1">École / Université / Structure</label>
                        <div class="relative group">
                            <i data-lucide="graduation-cap" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500 z-10 transition-colors group-hover:text-brand-600"></i>
                            
                            <!-- Hidden Input for Form Submission -->
                            <input type="hidden" id="reg-school" name="school">

                            <!-- Display Input (Search) -->
                            <input type="text" id="school-search" placeholder="Rechercher votre école..." autocomplete="off"
                                class="w-full pl-12 pr-10 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300 cursor-pointer hover:bg-white">
                            
                            <i id="school-chevron" data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform duration-300 pointer-events-none"></i>

                            <!-- Dropdown List -->
                            <div id="school-dropdown" class="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto hidden opacity-0 translate-y-2 transition-all duration-200 scrollbar-hide z-50">
                                <div id="school-list" class="p-1.5 space-y-0.5">
                                    <!-- Options injected via JS -->
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 1b. Precision for "Autre" -->
                    <div id="school-other-container" class="hidden space-y-1.5 animate-fade-in relative z-40">
                        <label class="text-xs font-bold text-slate-500 uppercase ml-1">Précisez votre établissement</label>
                        <div class="relative group">
                            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                <i data-lucide="building-2" class="w-5 h-5"></i>
                            </div>
                            <input id="reg-school-other" type="text" class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="Nom de l'établissement">
                        </div>
                    </div>

                    <!-- 2. Justificatif (Proof) -->
                    <div class="space-y-2 pt-2">
                        <div class="ml-1 mb-2">
                            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Justificatif</label>
                            <p class="text-[10px] text-slate-400 leading-tight mt-1">
                                Acceptés : Carte Étudiant, Certificat de Scolarité, Carte ISIC, Carte d'identité, Certificat d'admission.
                            </p>
                        </div>
                        
                        <div id="upload-zone" class="relative group cursor-pointer bg-slate-50/50 border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center transition-all hover:bg-white/80 hover:shadow-lg hover:shadow-brand-500/5">
                            
                            <input id="reg-proof" type="file" required accept="image/*,.pdf,.heic,.HEIC" class="hidden">
                            
                            <div id="upload-default" class="flex flex-col items-center gap-2">
                                <div class="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-brand-600 group-hover:scale-110 group-hover:text-brand-700 transition-all duration-300 ring-4 ring-slate-50 group-hover:ring-brand-50">
                                    <i data-lucide="upload" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-700 group-hover:text-brand-700 transition-colors">Cliquez pour ajouter</p>
                                    <p class="text-[10px] text-slate-400 font-medium mt-1">PDF, JPG ou PNG (Max 5 Mo)</p>
                                </div>
                            </div>

                            <div id="upload-success" class="hidden flex-col items-center gap-2 animate-fade-in">
                                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm ring-4 ring-green-50">
                                    <i data-lucide="check" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-900" id="file-name-display"></p>
                                    <p class="text-[10px] text-brand-600 font-bold mt-1 hover:underline">Changer le fichier</p>
                                </div>
                            </div>

                        </div>

                        <!-- Privacy Note -->
                        <div class="flex items-start gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                            <i data-lucide="shield-check" class="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0"></i>
                            <p class="text-[10px] text-blue-400/80 leading-snug font-medium">
                                <strong>Vérification :</strong> Ce document sert uniquement à vérifier votre statut. Il sera <strong class="text-blue-500">automatiquement supprimé</strong> de nos serveurs dès validation de votre compte.
                            </p>
                        </div>
                    </div>
                    
                    <!-- 3. Permit Checkbox -->
                    <label class="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-white dark:hover:bg-slate-700/50 transition-all shadow-sm group">
                        <input type="checkbox" id="reg-permit" class="w-5 h-5 text-brand-600 rounded border-slate-300 focus:ring-brand-500 transition-all">
                        <span class="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">J'ai le Permis B 🚗</span>
                    </label>

                    <!-- 4. Mandatory Hours Checkbox -->
                    <!-- Previous Checkboxes -->
                    <label class="flex items-start gap-3 p-3 bg-orange-50/80 border border-orange-100 rounded-xl cursor-pointer hover:bg-orange-100 transition-all shadow-sm group">
                        <input type="checkbox" id="reg-mandatory" class="w-5 h-5 text-orange-500 rounded border-orange-200 focus:ring-orange-500 transition-all">
                        <div>
                            <span class="text-sm font-bold text-orange-900 block">Besoin d'un justificatif d'heures ?</span>
                            <span class="text-[10px] text-orange-700 leading-tight block">Cochez cette case si vous avez des obligations d'heures à justifier pour votre cursus.</span>
                        </div>
                    </label>

                    <!-- 5. CGU & Privacy Consent Checkbox (New) -->
                    <label class="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-white dark:hover:bg-slate-700/50 transition-all shadow-sm group">
                        <input type="checkbox" id="reg-cgu" required class="w-5 h-5 text-brand-600 rounded border-slate-300 focus:ring-brand-500 transition-all mt-0.5">
                        <div class="text-xs text-slate-600 leading-snug">
                            Je certifie avoir lu et accepté les <button type="button" data-link="/legal/cgu" class="text-brand-600 font-bold hover:underline">CGU</button> ainsi que la <button type="button" data-link="/legal/privacy" class="text-brand-600 font-bold hover:underline">Politique de Confidentialité</button>.
                        </div>
                    </label>

                    <button type="submit" class="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 mt-4 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 transform">
                        Créer mon compte
                    </button>
                    
                    <div class="pt-6 text-center flex justify-center gap-4 text-[10px] text-slate-400 font-medium">
                        <button type="button" data-link="/legal/mentions" class="hover:text-slate-600 transition-colors">Mentions</button> •
                        <button type="button" data-link="/legal/privacy" class="hover:text-slate-600 transition-colors">Données</button> •
                        <button type="button" data-link="/legal/cgu" class="hover:text-slate-600 transition-colors">CGU</button>
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
            schoolList.innerHTML = `<div class="px-3 py-2 text-xs text-slate-400 font-medium text-center">Aucun résultat</div>`;
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

    // --- Email Validation System ---
    const emailInput = document.getElementById('reg-email');
    const emailConfirmInput = document.getElementById('reg-email-confirm');
    const emailFeedback = document.getElementById('email-feedback');

    // Common domain typos and corrections
    const DOMAIN_CORRECTIONS = {
        'gmial.com': 'gmail.com',
        'gmal.com': 'gmail.com',
        'gmaill.com': 'gmail.com',
        'gmail.fr': 'gmail.com',
        'gamil.com': 'gmail.com',
        'gnail.com': 'gmail.com',
        'hotmal.com': 'hotmail.com',
        'hotmail.fr': 'hotmail.com',
        'hotmial.com': 'hotmail.com',
        'outloo.com': 'outlook.com',
        'outlok.com': 'outlook.com',
        'yahooo.com': 'yahoo.com',
        'yaho.com': 'yahoo.com',
        'protonmal.com': 'protonmail.com',
        'iclou.com': 'icloud.com',
        'icoud.com': 'icloud.com'
    };

    // Strict email regex
    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    let emailCheckTimeout = null;
    let lastCheckedEmail = '';

    function showEmailFeedback(message, type = 'error') {
        if (!emailFeedback) return;
        emailFeedback.classList.remove('hidden', 'bg-red-50', 'border-red-200', 'text-red-600',
            'bg-amber-50', 'border-amber-200', 'text-amber-600',
            'bg-green-50', 'border-green-200', 'text-green-600',
            'bg-blue-50', 'border-blue-200', 'text-blue-600');

        const styles = {
            error: ['bg-red-50', 'border-red-200', 'text-red-600'],
            warning: ['bg-amber-50', 'border-amber-200', 'text-amber-700'],
            success: ['bg-green-50', 'border-green-200', 'text-green-600'],
            info: ['bg-blue-50', 'border-blue-200', 'text-blue-600']
        };

        emailFeedback.classList.add(...(styles[type] || styles.error));
        emailFeedback.innerHTML = message;
        emailFeedback.classList.remove('hidden');
    }

    function hideEmailFeedback() {
        if (emailFeedback) emailFeedback.classList.add('hidden');
    }

    function normalizeEmail(email) {
        return email.trim().toLowerCase();
    }

    function getSuggestion(email) {
        const parts = email.split('@');
        if (parts.length !== 2) return null;

        const domain = parts[1].toLowerCase();
        if (DOMAIN_CORRECTIONS[domain]) {
            return parts[0] + '@' + DOMAIN_CORRECTIONS[domain];
        }
        return null;
    }

    async function checkEmailUnique(email) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (error) throw error;
            return !data; // true if unique
        } catch (err) {
            console.error('Email check error:', err);
            return true; // Assume unique on error, backend will catch it anyway
        }
    }

    async function validateEmail(email) {
        const normalized = normalizeEmail(email);

        // Empty check
        if (!normalized) {
            hideEmailFeedback();
            return;
        }

        // Format check
        if (!EMAIL_REGEX.test(normalized)) {
            showEmailFeedback('<i data-lucide="alert-circle" class="w-3.5 h-3.5 inline mr-1"></i> Format d\'email invalide', 'error');
            createIcons({ icons, root: emailFeedback });
            return;
        }

        // Typo suggestion
        const suggestion = getSuggestion(normalized);
        if (suggestion) {
            showEmailFeedback(
                `<i data-lucide="lightbulb" class="w-3.5 h-3.5 inline mr-1"></i> Vouliez-vous dire <button type="button" id="apply-email-suggestion" class="font-bold underline hover:no-underline">${suggestion}</button> ?`,
                'warning'
            );
            createIcons({ icons, root: emailFeedback });

            // Attach click handler for suggestion
            document.getElementById('apply-email-suggestion')?.addEventListener('click', () => {
                emailInput.value = suggestion;
                validateEmail(suggestion);
            });
            return;
        }

        // Check uniqueness (debounced)
        if (normalized === lastCheckedEmail) return;
        lastCheckedEmail = normalized;

        showEmailFeedback('<i data-lucide="loader-2" class="w-3.5 h-3.5 inline mr-1 animate-spin"></i> Vérification...', 'info');
        createIcons({ icons, root: emailFeedback });

        const isUnique = await checkEmailUnique(normalized);

        if (!isUnique) {
            showEmailFeedback('<i data-lucide="user-x" class="w-3.5 h-3.5 inline mr-1"></i> Cet email est déjà utilisé', 'error');
            createIcons({ icons, root: emailFeedback });
        } else {
            showEmailFeedback('<i data-lucide="check-circle" class="w-3.5 h-3.5 inline mr-1"></i> Email disponible', 'success');
            createIcons({ icons, root: emailFeedback });
        }
    }

    if (emailInput) {
        // Auto-normalize on blur
        emailInput.addEventListener('blur', () => {
            const normalized = normalizeEmail(emailInput.value);
            emailInput.value = normalized;
        });

        // Validate on input (debounced)
        emailInput.addEventListener('input', () => {
            clearTimeout(emailCheckTimeout);
            emailCheckTimeout = setTimeout(() => {
                validateEmail(emailInput.value);
            }, 500);
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
        const configs = [
            { width: '0%', color: 'bg-slate-300', label: '—', labelColor: 'text-slate-400' },
            { width: '25%', color: 'bg-red-500', label: 'Faible', labelColor: 'text-red-500' },
            { width: '50%', color: 'bg-orange-500', label: 'Moyen', labelColor: 'text-orange-500' },
            { width: '75%', color: 'bg-yellow-500', label: 'Bon', labelColor: 'text-yellow-500' },
            { width: '100%', color: 'bg-green-500', label: 'Fort', labelColor: 'text-green-600' }
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
            const email = document.getElementById('reg-email').value.trim().toLowerCase();
            const emailConfirm = document.getElementById('reg-email-confirm').value.trim().toLowerCase();
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
                if (!schoolOther) return showToast("Veuillez préciser le nom de votre établissement", "error");
                school = schoolOther;
            }

            const file = fileInput.files[0];

            if (!fn || !ln || !email || !emailConfirm || !pass || !passConfirm || !phone) return showToast("Veuillez remplir tous les champs", "error");

            // Email format validation
            const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
            if (!emailRegex.test(email)) return showToast("Format d'email invalide", "error");

            // Email confirmation
            if (email !== emailConfirm) return showToast("Les emails ne correspondent pas", "error");

            // Password strength validation
            const passwordChecks = {
                length: pass.length >= 8,
                upper: /[A-Z]/.test(pass),
                lower: /[a-z]/.test(pass),
                number: /[0-9]/.test(pass)
            };
            const allChecksPassed = Object.values(passwordChecks).every(Boolean);
            if (!allChecksPassed) {
                return showToast("Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre", "error");
            }

            if (pass !== passConfirm) return showToast("Les mots de passe ne correspondent pas", "error");
            if (!file) return showToast("Le justificatif étudiant est obligatoire", "error");
            if (!cguAccepted) return showToast("Vous devez accepter les CGU et la Politique de Confidentialité", "error");

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
                        showToast("Compte créé mais erreur d'upload. Contactez un admin.", "warning");
                    }
                }

                showToast("Inscription réussie ! Redirection...", "success");

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
