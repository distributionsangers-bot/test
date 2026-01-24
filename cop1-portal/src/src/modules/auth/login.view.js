import { AuthService } from '../../services/auth.js';
import { toggleLoader, showToast, showPrompt } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { APP_CONFIG } from '../../core/constants.js';

const { LOGO_URL } = APP_CONFIG;

export function renderLogin() {
    return `
        <div class="h-full w-full bg-white overflow-y-auto scroll-smooth">
            <div class="min-h-full flex flex-col justify-center px-6 py-10 max-w-md mx-auto">
                <div class="text-center mb-8"> 
                    <img src="${LOGO_URL}" class="w-20 h-20 mx-auto mb-4 object-contain" alt="Logo">
                    <h1 class="text-3xl font-extrabold text-slate-900">Espace Bénévoles</h1>
                    <p class="text-slate-500">COP1 Angers</p>
                </div>
                
                <div class="bg-slate-50 p-1 rounded-xl mb-6 flex shrink-0">
                    <button class="flex-1 py-3 rounded-lg text-sm font-bold bg-white text-brand-600 shadow-sm transition cursor-default">Connexion</button>
                    <button data-link="/register" class="flex-1 py-3 rounded-lg text-sm font-bold text-slate-400 hover:text-slate-600 transition">Inscription</button>
                </div>

                <form id="form-login" class="space-y-4 animate-fade-in">
                    <input id="login-email" type="email" autocomplete="username" required class="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-500" placeholder="Email">
                    <input id="login-password" type="password" autocomplete="current-password" required class="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-500" placeholder="Mot de passe">
                    
                    <button type="submit" class="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition">Se connecter</button>
                    <button type="button" id="btn-forgot-password" class="w-full text-xs font-bold text-slate-400 hover:text-brand-600 transition">Mot de passe oublié ?</button>
                    
                    <div class="pt-8 text-center flex justify-center gap-4 text-[10px] text-slate-400 font-bold">
                        <button type="button" data-link="/legal/mentions" class="hover:text-slate-600">Mentions</button> •
                        <button type="button" data-link="/legal/privacy" class="hover:text-slate-600">Données</button> •
                        <button type="button" data-link="/legal/cgu" class="hover:text-slate-600">CGU</button>
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
            showToast(error.message, "error");
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
            showToast(error.message, "error");
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
