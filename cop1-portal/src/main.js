import './style.css';
import { supabase } from './services/supabase.js';
import { store } from './core/store.js';
import { router } from './core/router.js';
import { renderSidebar, updateActiveNavLink, initSidebar } from './components/layout/sidebar.js';
import { renderHeader, initHeader } from './components/layout/header.js';
import { renderMobileNav, initMobileNav, updateActiveNavLink as updateActiveMobileNav } from './components/layout/mobile-nav.js';
import { toggleLoader, showToast, showConfirm } from './services/utils.js';
import { createIcons, icons } from 'lucide';
import { CookieConsent } from './components/layout/cookie-consent.js';
import { startInactivityMonitor, stopInactivityMonitor } from './services/inactivity.js';
import { initBadges, cleanupBadges } from './services/notification-badge.service.js';
import { isRouteAllowed } from './services/auth-guard.js';

// Import Views
import { renderLogin, initLogin } from './modules/auth/login.view.js';
import { renderRegister, initRegister } from './modules/auth/register.view.js';
import { renderResetPassword, initResetPassword } from './modules/auth/reset-password.view.js';
import { renderDashboard, initDashboard } from './modules/dashboard/dashboard.view.js';
import { renderEvents, initEvents } from './modules/events/events.view.js';
import { renderPlanningList, initPlanningList } from './modules/admin/planning-list.view.js';
import { renderDirectory } from './modules/admin/directory.view.js';
import { renderProfile, initProfile } from './modules/profile/profile.view.js';
import { renderChat, initChat } from './modules/chat/chat.view.js';
import { renderPoles } from './modules/poles/poles.view.js';
import { renderLegal } from './modules/legal/legal.view.js';

// Configuration Router
// Import Status Views
import { renderPending, initPending, renderRejected, initRejected } from './modules/auth/status.view.js';

// Configuration Router
router.addRoute('/login', { render: renderLogin, init: initLogin });
router.addRoute('/register', { render: renderRegister, init: initRegister });
router.addRoute('/reset-password', { render: renderResetPassword, init: initResetPassword });
router.addRoute('/dashboard', { render: renderDashboard, init: initDashboard });
router.addRoute('/events', { render: renderEvents, init: initEvents });
router.addRoute('/admin_planning', { render: renderPlanningList, init: initPlanningList });
router.addRoute('/admin_users', { render: renderDirectory });
router.addRoute('/messages', { render: renderChat, init: initChat });
router.addRoute('/messages/:id', { render: renderChat, init: initChat });
router.addRoute('/profile', { render: renderProfile, init: initProfile });
router.addRoute('/legal/:type', { render: renderLegal });
router.addRoute('/poles', { render: renderPoles });

// Routes d'état spéciales
router.addRoute('/pending', { render: renderPending, init: initPending });
router.addRoute('/rejected', { render: renderRejected, init: initRejected });

const app = document.getElementById('app');

async function init() {
    toggleLoader(true);

    // CORRECTION ICI : On active les écouteurs globaux (navigation) dès le début
    attachGlobalListeners();

    try {
        // 1. Setup Realtime
        supabase.channel('global-app-changes')
            .subscribe();

        // 1b. Listen for PASSWORD_RECOVERY event
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // User clicked the password reset link in their email
                store.state.isPasswordRecoveryMode = true;
                // Render reset password page standalone (without app layout)
                const { renderResetPassword, initResetPassword } = require('./modules/auth/reset-password.view.js');
                app.innerHTML = renderResetPassword();
                initResetPassword();
            }
        });

        // 2. Auth & Data
        const { data: { session } } = await supabase.auth.getSession();

        // Check if we're in password recovery mode (from URL hash or flag)
        const urlHash = window.location.hash;
        const isRecoveryFromUrl = urlHash.includes('type=recovery') || urlHash.includes('type=password_recovery');

        if (isRecoveryFromUrl || store.state.isPasswordRecoveryMode) {
            // We're in password recovery mode - show reset password page standalone
            store.state.isPasswordRecoveryMode = true;
            const { renderResetPassword, initResetPassword } = await import('./modules/auth/reset-password.view.js');
            app.innerHTML = renderResetPassword();
            initResetPassword();
            toggleLoader(false);
            CookieConsent.init();
            return; // Don't continue with normal flow
        }

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
                // Redirection depuis Login/Register/Pending/Rejected si connecté et validé
                const currentPath = window.location.pathname;
                if (['/login', '/register', '/', '/pending', '/rejected'].includes(currentPath)) {
                    const dest = '/dashboard';
                    window.history.pushState({}, '', dest);
                }
                renderAppLayout();
                // Start inactivity monitor for logged-in users
                startInactivityMonitor();
                // Initialize notification badges (real-time)
                initBadges();
            }

        } else {
            // Pas de session - stop inactivity monitor
            stopInactivityMonitor();
            cleanupBadges();
            const path = window.location.pathname;
            if (!['/login', '/register', '/reset-password'].includes(path) && !path.startsWith('/legal')) {
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
        <div class="flex h-[100dvh] w-full bg-[#F8FAFC]">
            ${renderSidebar(profile, currentView, adminMode)}
            <div class="flex-1 flex flex-col h-full relative min-w-0">
                ${renderHeader(profile)}
                <main id="main-slot" class="flex-1 overflow-y-auto pt-[calc(5rem+env(safe-area-inset-top))] pb-28 px-4 md:p-10 w-full scroll-smooth focus:outline-none" tabindex="-1"></main>
                ${renderMobileNav(profile, currentView, adminMode)}
            </div>
        </div>
    `;

    // Init Sidebar Events (Logout code)
    initSidebar();

    // Init Mobile Nav Events
    initMobileNav();

    // Init Header Events
    initHeader();

    // NOTE: attachGlobalListeners a été déplacé dans init() pour garantir son exécution

    // On définit le root du routeur sur le slot principal
    const mainSlot = document.getElementById('main-slot');
    router.root = mainSlot;

    // On lance le routeur pour injecter la vue courante
    try {
        // 🔒 Guard de route : vérifie les droits avant navigation
        const currentPath = window.location.pathname;
        if (!isRouteAllowed(currentPath)) {
            console.warn(`⛔ Route "${currentPath}" bloquée : droits admin requis.`);
            window.history.replaceState({}, '', '/dashboard');
            showToast('Accès non autorisé', 'error');
        }
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
    // Utilisation d'un flag pour éviter d'attacher plusieurs fois si init est rappelé
    if (window._globalListenersAttached) return;
    window._globalListenersAttached = true;

    document.body.addEventListener('click', (e) => {
        // Navigation Global
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            const path = link.dataset.link;

            // 🔒 Guard de route : vérifie les droits avant navigation
            if (!isRouteAllowed(path)) {
                showToast('Accès non autorisé', 'error');
                return;
            }

            // Mise à jour state view pour Sidebar
            const viewName = path.replace('/', '').split('/')[0];
            store.state.view = viewName;

            router.navigateTo(path);


        }



    });

    // Custom Events
    document.addEventListener('auth:login-success', () => init());

    // Navigation Updates Listener
    window.addEventListener('route-changed', (e) => {
        const path = e.detail.path;
        try { updateActiveNavLink(path); } catch (err) { console.error('Sidebar update error:', err); }
        try { updateActiveMobileNav(path); } catch (err) { console.error('Mobile nav update error:', err); }
    });
}

// Lancement de l'application
init();