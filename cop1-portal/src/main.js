
import './style.css';
import { supabase } from './services/supabase.js';
import { store } from './core/store.js';
import { router } from './core/router.js';
import { renderSidebar } from './components/layout/sidebar.js';
import { renderHeader } from './components/layout/header.js';
import { renderMobileNav } from './components/layout/mobile-nav.js';
import { toggleLoader, showToast } from './services/utils.js';
import { createIcons } from 'lucide';

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
import './modules/scanner/scanner.view.js';

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

// Routes d'état spéciales
router.addRoute('/pending', {
    render: () => `<div class="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in"><div class="w-24 h-24 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-6"><i data-lucide="clock" class="w-10 h-10"></i></div><h2 class="text-2xl font-bold">Inscription en attente</h2><p class="text-slate-500 mt-2 mb-6">Validation administrateur requise.</p><button id="btn-logout-pending" class="text-red-500 font-bold">Déconnexion</button></div>`,
    init: () => { createIcons(); document.getElementById('btn-logout-pending').onclick = handleLogout; }
});
router.addRoute('/rejected', {
    render: () => `<div class="min-h-screen flex flex-col items-center justify-center p-6 text-center"><h2 class="text-xl font-bold text-red-600">Accès refusé</h2><button id="btn-logout-rejected" class="mt-4 font-bold">Déconnexion</button></div>`,
    init: () => { document.getElementById('btn-logout-rejected').onclick = handleLogout; }
});

const app = document.getElementById('app');

async function init() {
    toggleLoader(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        store.state.user = session.user;
        // Restauration mode admin
        const savedMode = localStorage.getItem('cop1_admin_mode');
        store.state.adminMode = savedMode !== 'false';

        try {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            store.state.profile = profile;

            // --- LOGIQUE DE REDIRECTION CRITIQUE ---
            if (profile.status === 'pending') {
                router.navigateTo('/pending');
                app.innerHTML = router.currentView.render(); // Force render sans layout
                router.currentView.init();
            } else if (profile.status === 'rejected') {
                router.navigateTo('/rejected');
                app.innerHTML = router.currentView.render();
                router.currentView.init();
            } else {
                renderAppLayout(); // Utilisateur validé
            }
        } catch (err) {
            console.error(err);
            router.navigateTo('/login');
            app.innerHTML = renderLogin();
            initLogin();
        }
    } else {
        router.navigateTo('/login');
        app.innerHTML = renderLogin();
        initLogin();
    }
    toggleLoader(false);
}

// Gestion globale des clics
document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-link]');
    if (link) {
        e.preventDefault();
        const path = link.dataset.link;
        // Handle /legal/mentions etc for view state
        const view = path.replace('/', '').split('/')[0];
        store.state.view = view;

        // Si on est connecté et validé, on reste dans le layout
        if (store.state.user && store.state.profile?.status === 'approved') {
            router.navigateTo(path);
            renderAppLayout();
        } else {
            // Sinon (Login/Register), on prend tout l'écran
            router.navigateTo(path);
            router.handleLocation();
        }
    }
    if (e.target.closest('#btn-toggle-admin')) toggleAdminMode();
    if (e.target.closest('#btn-logout')) handleLogout();
});

function renderAppLayout() {
    const { profile, view, adminMode } = store.state;
    // Fallback view if undefined (e.g. from data-link)
    const currentView = view || (adminMode ? 'dashboard' : 'events');

    app.innerHTML = `
        <div class="flex h-full w-full overflow-hidden bg-[#F8FAFC]">
            ${renderSidebar(profile, currentView, adminMode)}
            <div class="flex-1 flex flex-col h-full relative min-w-0">
                ${renderHeader(profile)}
                <main id="main-slot" class="flex-1 overflow-y-auto pt-20 pb-28 px-4 md:p-10 w-full scroll-smooth"></main>
                ${renderMobileNav(profile, currentView, adminMode)}
            </div>
        </div>
    `;
    createIcons();
    router.root = document.getElementById('main-slot');
    router.handleLocation();
}

export async function handleLogout() {
    if (!confirm("Déconnexion ?")) return;
    await supabase.auth.signOut();
    window.location.reload();
}

export function toggleAdminMode() {
    store.state.adminMode = !store.state.adminMode;
    localStorage.setItem('cop1_admin_mode', store.state.adminMode);
    router.navigateTo(store.state.adminMode ? '/dashboard' : '/events');
    renderAppLayout();
}

init();
