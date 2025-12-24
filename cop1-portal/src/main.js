
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

// ============================================================
// LOGIQUE D'INITIALISATION CRITIQUE
// ============================================================
async function init() {
    toggleLoader(true);

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // 1. Session active -> On charge les données
            store.state.user = session.user;

            // Restauration mode admin
            const savedMode = localStorage.getItem('cop1_admin_mode');
            store.state.adminMode = savedMode !== 'false'; // Par défaut true sauf si explicitement false

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error || !profile) throw error || new Error('Profil introuvable');

            store.state.profile = profile;

            // 2. Vérification STATUS
            if (profile.status === 'pending') {
                if (window.location.pathname !== '/pending') router.navigateTo('/pending');
                else router.handleLocation();
            }
            else if (profile.status === 'rejected') {
                if (window.location.pathname !== '/rejected') router.navigateTo('/rejected');
                else router.handleLocation();
            }
            else {
                // 3. Utilisateur Validé -> App Shell
                // Si on est sur Login/Register ou racine, on redirige vers Dashboard/Events
                const currentPath = window.location.pathname;
                if (currentPath === '/login' || currentPath === '/register' || currentPath === '/') {
                    const dest = store.state.adminMode ? '/dashboard' : '/events';
                    window.history.pushState({}, '', dest);
                }

                // On lance l'app layout (qui s'occupe du router)
                renderAppLayout();
            }

        } else {
            // 4. Pas de Session -> Login
            const path = window.location.pathname;
            if (path !== '/login' && path !== '/register' && !path.startsWith('/legal')) {
                router.navigateTo('/login');
            } else {
                router.handleLocation();
            }
        }
    } catch (err) {
        console.error("Erreur critique init:", err);
        showToast("Erreur de chargement. Reconexion...", "error");
        await supabase.auth.signOut();
        router.navigateTo('/login');
    }

    toggleLoader(false);
}

// Gestion globale des clics (Navigation SPA)
document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-link]');
    if (link) {
        e.preventDefault();
        const path = link.dataset.link;
        const view = path.replace('/', '').split('/')[0];
        store.state.view = view;

        if (store.state.user && store.state.profile?.status === 'approved') {
            router.navigateTo(path);
            // Si on est déjà dans l'app, renderAppLayout va juste mettre à jour le slot
            // Mais pour être sûr que le menu mobile/sidebar se met à jour :
            renderAppLayout();
        } else {
            router.navigateTo(path);
        }
    }

    if (e.target.closest('#btn-toggle-admin')) toggleAdminMode();
    if (e.target.closest('#btn-logout')) handleLogout();
});

// Layout Principal
function renderAppLayout() {
    const { profile, view, adminMode } = store.state;
    // Fallback view
    const currentView = view || (adminMode ? 'dashboard' : 'events');

    // On injecte le layout
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

    // On dit au routeur de rendre les vues DANS le main-slot maintenant
    router.root = document.getElementById('main-slot');
    router.handleLocation();
}

// Helpers exportés
export async function handleLogout() {
    if (!confirm("Déconnexion ?")) return;
    await supabase.auth.signOut();
    window.location.reload(); // Propre
}

export function toggleAdminMode() {
    store.state.adminMode = !store.state.adminMode;
    localStorage.setItem('cop1_admin_mode', store.state.adminMode);

    const dest = store.state.adminMode ? '/dashboard' : '/events';
    store.state.view = dest.replace('/', '');

    router.navigateTo(dest);
    renderAppLayout();
}

// Lancement
init();

// Ecoute Auth Changes (Optionnel mais recommandé pour les expirations)
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
        store.state.user = null;
        store.state.profile = null;
        router.root = document.getElementById('app'); // Reset root
        router.navigateTo('/login');
    }
    // Note: SIGNED_IN est géré par la redirection après login ou le reload
});
