import { AuthService } from '../../services/auth.js';
import { toggleLoader, showToast, showPrompt } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { APP_CONFIG } from '../../core/constants.js';

const { LOGO_URL } = APP_CONFIG;

export function renderLogin() {
    return `
        <div class="min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-900 relative overflow-hidden flex flex-col items-center justify-center p-4">
            <!-- Background Decorations -->
            <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div class="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-blue-400/20 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div class="absolute top-[40%] -left-[10%] w-[60vw] h-[60vw] bg-brand-400/20 rounded-full blur-[100px] animate-pulse-slow" style="animation-delay: 1s;"></div>
            </div>

            <!-- Card -->
            <div class="relative w-full max-w-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 p-6 z-10 animate-fade-in">
                <!-- Header -->
                <div class="text-center mb-8"> 
                    <div class="inline-flex items-center justify-center h-24 px-6 rounded-2xl bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/30 dark:to-slate-800 shadow-sm mb-4 border border-brand-100/50 dark:border-brand-800/50">
                        <img src="${LOGO_URL}" class="h-16 w-auto object-contain" alt="Logo">
                    </div>
                    <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Espace Bénévoles</h1>
                    <p class="text-slate-500 dark:text-slate-400 font-medium">Connectez-vous pour accéder au portail</p>
                </div>
                
                <!-- Segmented Control -->
                <div class="bg-slate-100/80 dark:bg-slate-700/50 p-1.5 rounded-2xl mb-8 flex relative">
                    <button class="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm transition-all duration-300 cursor-default">Connexion</button>
                    <button data-link="/register" class="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-600/50 transition-all duration-300">Inscription</button>
                </div>

                <!-- Form -->
                <form id="form-login" class="space-y-5">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Email</label>
                        <div class="relative group">
                            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                <i data-lucide="mail" class="w-5 h-5"></i>
                            </div>
                            <input id="login-email" type="email" autocomplete="username" required 
                                class="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" 
                                placeholder="exemple@email.com">
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <div class="flex justify-between items-center ml-1">
                            <label class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Mot de passe</label>
                            <button type="button" id="btn-forgot-password" class="text-[10px] font-bold text-brand-600 hover:text-brand-700 hover:underline">Oublié ?</button>
                        </div>
                        <div class="relative group">
                            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                <i data-lucide="lock" class="w-5 h-5"></i>
                            </div>
                            <input id="login-password" type="password" autocomplete="current-password" required 
                                class="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" 
                                placeholder="••••••••">
                            <button type="button" id="toggle-password" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors" tabindex="-1">
                                <i data-lucide="eye" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                    
                    <button type="submit" class="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 transform">
                        Se connecter
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

export function initLogin() {
    createIcons({ icons });

    // 1. Submit Listener
    const form = document.getElementById('form-login');
    if (form) {
        form.addEventListener('submit', handleLoginSubmit);
    }

    // 2. Forgot Password Listener
    const forgotBtn = document.getElementById('btn-forgot-password');
    if (forgotBtn) {
        forgotBtn.addEventListener('click', handleForgotPassword);
    }

    // 3. Password Toggle
    const toggleBtn = document.getElementById('toggle-password');
    const passInput = document.getElementById('login-password');
    if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', () => {
            const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passInput.setAttribute('type', type);

            // Update Icon
            const icon = toggleBtn.querySelector('svg') || toggleBtn.querySelector('i'); // Lucide replaces with svg, check both
            if (icon) {
                // Re-render icon logic or simple attribute switch if Lucide supports it
                // Since Lucide replaces the node, we might need to recreate it. 
                // Easier: Just change innerHTML because 'eye-off' is a different icon
                toggleBtn.innerHTML = `<i data-lucide="${type === 'password' ? 'eye' : 'eye-off'}" class="w-5 h-5"></i>`;
                createIcons({ icons, nameAttr: 'data-lucide', attrs: { class: "w-5 h-5" } });
            }
        });
    }
}



export function cleanup() {
    const form = document.getElementById('form-login');
    if (form) form.removeEventListener('submit', handleLoginSubmit);

    const forgotBtn = document.getElementById('btn-forgot-password');
    if (forgotBtn) forgotBtn.removeEventListener('click', handleForgotPassword);
}

async function handleLoginSubmit(e) {
    e.preventDefault();

    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');

    if (!emailInput || !passInput) return;

    const email = emailInput.value.trim();
    const password = passInput.value.trim();

    if (!email || !password) return showToast("Veuillez remplir tous les champs", "error");

    toggleLoader(true);
    try {
        const { error } = await AuthService.login(email, password);
        if (error) {
            let msg = error.message;
            if (msg && msg.includes('Invalid login credentials')) {
                msg = "Email ou mot de passe incorrect";
            }
            showToast(msg, "error");
        } else {
            showToast("Connexion réussie", "success");
            document.dispatchEvent(new CustomEvent('auth:login-success'));
        }
    } catch (err) {
        console.error(err);
        showToast("Erreur inattendue", "error");
    } finally {
        toggleLoader(false);
    }
}

async function handleForgotPassword() {
    showPrompt("Veuillez entrer votre email pour réinitialiser le mot de passe :", async (email) => {
        if (!email) return;

        toggleLoader(true);
        const { error } = await AuthService.resetPassword(email);
        toggleLoader(false);

        if (error) {
            let msg = error.message;
            if (msg && msg.includes('Invalid login credentials')) {
                msg = "Email ou mot de passe incorrect";
            }
            showToast(msg, "error");
        } else {
            showToast('Email de réinitialisation envoyé', 'success');
        }
    }, {
        title: 'Mot de passe oublié',
        placeholder: 'Email',
        inputType: 'email',
        confirmText: 'Envoyer'
    });
}
