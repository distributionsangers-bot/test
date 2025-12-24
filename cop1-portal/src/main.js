
import './style.css';
import { supabase } from './services/supabase.js';
import { store } from './core/store.js';
import { router } from './core/router.js';
import { renderSidebar, updateActiveNavLink, initSidebar } from './components/layout/sidebar.js';
import { renderHeader } from './components/layout/header.js';
import { renderMobileNav, initMobileNav } from './components/layout/mobile-nav.js';
import { toggleLoader, showToast } from './services/utils.js';
import { createIcons, icons } from 'lucide';
import { CookieConsent } from './components/layout/cookie-consent.js';

// Import Views
import { renderLogin, initLogin } from './modules/auth/login.view.js';
import { renderRegister, initRegister } from './modules/auth/register.view.js';
import { renderDashboard, initDashboard } from './modules/dashboard/dashboard.view.js';
import { renderEvents, initEvents } from './modules/events/events.view.js';
import { renderPlanningList, initPlanningList } from './modules/admin/planning-list.view.js';
import { renderDirectory } from './modules/admin/directory.view.js';
import { renderProfile, initProfile } from './modules/profile/profile.view.js';
import { renderChat, initChat } from './modules/chat/chat.view.js';
import { renderPoles } from './modules/poles/poles.view.js';
import { renderLegal } from './modules/legal/legal.view.js';

// Configuration Router
router.addRoute('/login', { render: renderLogin, init: initLogin });
router.addRoute('/register', { render: renderRegister, init: initRegister });
router.addRoute('/dashboard', { render: renderDashboard, init: initDashboard });
router.addRoute('/events', { render: renderEvents, init: initEvents });
router.addRoute('/admin_planning', { render: renderPlanningList, init: initPlanningList });
router.addRoute('/admin_users', { render: renderDirectory });
router.addRoute('/messages', { render: renderChat, init: initChat });
router.addRoute('/messages/:id', { render: renderChat, init: initChat });
router.addRoute('/profile', { render: renderProfile, init: initProfile });
router.addRoute('/legal/:type', { render: renderLegal });
router.addRoute('/poles', { render: renderPoles });

// Routes d'état spéciales (Inline pour l'instant)
router.addRoute('/pending', {
    render: () => `<div class="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in"><div class="w-24 h-24 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-6"><i data-lucide="clock" class="w-10 h-10"></i></div><h2 class="text-2xl font-bold">Inscription en attente</h2><p class="text-slate-500 mt-2 mb-6">Validation administrateur requise.</p><button data-action="logout" class="text-red-500 font-bold hover:underline">Déconnexion</button></div>`,
    init: () => createIcons({ icons })
});

router.addRoute('/rejected', {
    render: () => `<div class="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in"><h2 class="text-xl font-bold text-red-600">Accès refusé</h2><button data-action="logout" class="mt-4 font-bold hover:underline">Déconnexion</button></div>`,
    init: () => { }
});

const app = document.getElementById('app');

async function init() {
    toggleLoader(true);
    try {
        // 1. Setup Realtime
        supabase.channel('global-app-changes')
            .subscribe();

        // 2. Auth & Data
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            store.state.user = session.user;

            // On vérifie le mode admin dans le storage (persistance)
            const savedMode = localStorage.getItem('cop1_admin_mode');
            store.state.adminMode = savedMode !== 'false';

            // Load Profile
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error || !profile) throw new Error('Profil introuvable');
            store.state.profile = profile;

            // Load Globals (Teams/Admins) - Optimisation via Promise.all
            const [{ data: teams }, { data: admins }] = await Promise.all([
                supabase.from('teams').select('*'),
                supabase.from('profiles').select('*').eq('is_admin', true)
            ]);
            store.state.teams = teams || [];
            store.state.admins = admins || [];

            // 3. Status Check
            if (profile.status === 'pending') {
                if (window.location.pathname !== '/pending') router.navigateTo('/pending');
                else router.handleLocation();
            } else if (profile.status === 'rejected') {
                if (window.location.pathname !== '/rejected') router.navigateTo('/rejected');
                else router.handleLocation();
            } else {
                // Redirection depuis Login/Register si connecté
                const currentPath = window.location.pathname;
                if (['/login', '/register', '/'].includes(currentPath)) {
                    const dest = store.state.adminMode ? '/dashboard' : '/events';
                    window.history.pushState({}, '', dest);
                }
                renderAppLayout();
            }

        } else {
            // Pas de session
            const path = window.location.pathname;
            if (!['/login', '/register'].includes(path) && !path.startsWith('/legal')) {
                router.navigateTo('/login');
            } else {
                router.handleLocation();
            }
        }
    } catch (err) {
        console.error("Init Error:", err);
        // En cas d'erreur critique (ex: user deleted), on logout pour éviter la boucle
        // await supabase.auth.signOut(); 
        router.navigateTo('/login');
    } finally {
        toggleLoader(false);
        CookieConsent.init();
    }
}

function renderAppLayout() {
    const { profile, view, adminMode } = store.state;
    // Fallback simple si la vue n'est pas définie dans le store (ex: reload)
    const currentView = view || (adminMode ? 'dashboard' : 'events');

    app.innerHTML = `
        <div class="flex h-full w-full overflow-hidden bg-[#F8FAFC]">
            ${renderSidebar(profile, currentView, adminMode)}
            <div class="flex-1 flex flex-col h-full relative min-w-0">
                ${renderHeader(profile)}
                <main id="main-slot" class="flex-1 overflow-y-auto pt-20 pb-28 px-4 md:p-10 w-full scroll-smooth focus:outline-none" tabindex="-1"></main>
                ${renderMobileNav(profile, currentView, adminMode)}
            </div>
        </div>
    `;

    // Init Sidebar Events (Logout code)
    initSidebar();

    // Init Mobile Nav Events
    initMobileNav();

    attachGlobalListeners();

    // On définit le root du routeur sur le slot principal
    const mainSlot = document.getElementById('main-slot');
    router.root = mainSlot;

    // On lance le routeur pour injecter la vue courante
    try {
        router.handleLocation();
    } catch (err) {
        console.error("Router Error:", err);
        mainSlot.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <div class="bg-red-50 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <i data-lucide="alert-triangle" class="w-8 h-8"></i>
                </div>
                <h2 class="text-xl font-bold text-slate-900 mb-2">Une erreur est survenue</h2>
                <p class="text-slate-500 mb-6 max-w-md">L'application a rencontré un problème inattendu. Veuillez rafraîchir la page.</p>
                <button onclick="window.location.reload()" class="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg">
                    Rafraîchir
                </button>
            </div>
        `;
        createIcons({ icons, root: mainSlot });
    }
}

function attachGlobalListeners() {
    // Utilisation d'un flag pour éviter d'attacher plusieurs fois si renderAppLayout est rappelé
    if (window._globalListenersAttached) return;
    window._globalListenersAttached = true;

    document.body.addEventListener('click', (e) => {
        // Navigation Global
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            const path = link.dataset.link;

            // Mise à jour state view pour Sidebar
            const viewName = path.replace('/', '').split('/')[0];
            store.state.view = viewName;

            router.navigateTo(path);

            // Mise à jour visuelle Sidebar sans re-render total
            updateActiveNavLink(viewName);
        }

        // Admin Toggle
        const adminToggle = e.target.closest('[data-action="toggle-admin"]');
        if (adminToggle) {
            store.state.adminMode = !store.state.adminMode;
            localStorage.setItem('cop1_admin_mode', store.state.adminMode);

            // Redirection selon mode
            const dest = store.state.adminMode ? '/dashboard' : '/events';
            store.state.view = dest.replace('/', '');

            router.navigateTo(dest);
            renderAppLayout(); // Re-render complet nécessaire pour changer le menu
        }

        // Logout
        const logoutBtn = e.target.closest('[data-action="logout"]');
        if (logoutBtn) {
            if (confirm("Déconnexion ?")) {
                supabase.auth.signOut().then(() => {
                    store.state.user = null;
                    store.state.profile = null;
                    window.location.href = '/login';
                });
            }
        }

        // Langue Toggle (Simulation)
        if (e.target.closest('#btn-toggle-lang')) {
            showToast("Fonctionnalité multilingue bientôt disponible !", "info");
        }
    });

    // Custom Events
    document.addEventListener('auth:login-success', () => init());
}

// Lancement de l'application
init();
