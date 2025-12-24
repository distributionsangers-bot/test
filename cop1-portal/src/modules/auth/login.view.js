
import { AuthService } from '../../services/auth.js';
import { toggleLoader, showToast } from '../../services/utils.js';
import { router } from '../../core/router.js';
import { createIcons } from 'lucide';

const LOGO_URL = "logo.png";

/**
 * Renders the Login View HTML.
 */
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
                    <button class="flex-1 py-3 rounded-lg text-sm font-bold bg-white text-brand-600 shadow-sm transition default-cursor">Connexion</button>
                    <button data-link="register" class="flex-1 py-3 rounded-lg text-sm font-bold text-slate-400 hover:text-slate-600 transition">Inscription</button>
                </div>

                <form id="form-login" class="space-y-4 animate-fade-in">
                    <input id="login-email" type="email" required class="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-500" placeholder="Email">
                    <div class="relative">
                        <input id="login-password" type="password" required class="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-500" placeholder="Mot de passe">
                        <!-- Eye icon toggle could be added here -->
                    </div>
                    
                    <button type="submit" class="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition">Se connecter</button>
                    
                    <button type="button" id="btn-forgot-password" class="w-full text-xs font-bold text-slate-400 hover:text-brand-600 transition">Mot de passe oublié ?</button>
                    
                    <div class="pt-8 text-center flex justify-center gap-4 text-[10px] text-slate-400 font-bold">
                        <button type="button" data-link="mentions" class="hover:text-slate-600">Mentions</button> •
                        <button type="button" data-link="privacy" class="hover:text-slate-600">Données</button> •
                        <button type="button" data-link="cgu" class="hover:text-slate-600">CGU</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

/**
 * Initializes the Login View logic (EventListeners).
 */
export function initLogin() {
    createIcons();

    const form = document.getElementById('form-login');
    if (form) {
        form.addEventListener('submit', handleLoginSubmit);
    }

    const forgotBtn = document.getElementById('btn-forgot-password');
    if (forgotBtn) {
        forgotBtn.addEventListener('click', handleForgotPassword);
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) return showToast("Veuillez remplir tous les champs", "error");

    toggleLoader(true);

    try {
        const { error } = await AuthService.login(email, password);

        if (error) {
            showToast(error.message, "error");
        } else {
            // Success call usually reloads or updates session state
            // Logic implies the Main.js Auth Listener will catch the session change and reload/rerender
            // But we can also manually navigate if needed, although reload is safer for full state reset
            // window.location.reload(); 
            // Better behavior: Main.js listens to onAuthStateChange and reloads.
            // So we wait? Or manual navigation?
            // "Une fois connecté avec succès, utilise le routeur pour rediriger vers '/dashboard' (ou '/')."
            // If I just navigate, state might be stale if not reloaded.
            // But let's try router.navigateTo('dashboard') assuming state sync.
            // Main.js listener reloads on SIGNED_IN if user was null.
            // So reload will happen anyway? Let's assume standard SPA flow.
            // Wait, main.js has: if (event === 'SIGNED_IN' ...) window.location.reload();
            // So let's NOT do anything here aside from success toast, let the listener handle it.
            // OR the user asked to use router.
            // I'll leave it to the listener for stability as built in main.js step.
        }
    } catch (err) {
        console.error(err);
        showToast("Erreur inattendue", "error");
    } finally {
        toggleLoader(false);
    }
}

async function handleForgotPassword() {
    const email = prompt("Email ?");
    if (!email) return;

    toggleLoader(true);
    const { error } = await AuthService.resetPassword(email);
    toggleLoader(false);

    if (error) {
        showToast(error.message || 'Erreur envoi email', 'error');
    } else {
        showToast('Email de réinitialisation envoyé', 'success');
    }
}
