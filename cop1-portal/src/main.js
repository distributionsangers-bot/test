
import './style.css';
import { supabase } from './services/supabase.js';
import { store } from './core/store.js';
import { router } from './core/router.js';
import { renderSidebar } from './components/layout/sidebar.js';
import { renderHeader } from './components/layout/header.js';
import { renderMobileNav } from './components/layout/mobile-nav.js';
import { toggleLoader, showToast } from './services/utils.js';
import { renderLogin, initLogin } from './modules/auth/login.view.js';
import { renderRegister, initRegister } from './modules/auth/register.view.js';
import { renderDashboard, initDashboard } from './modules/dashboard/dashboard.view.js';
import { renderEvents, initEvents } from './modules/events/events.view.js';
import { renderPlanningList, initPlanningList } from './modules/admin/planning-list.view.js';
import { renderDirectory } from './modules/admin/directory.view.js';
import { renderProfile, initProfile } from './modules/profile/profile.view.js';
import { renderChat, initChat } from './modules/chat/chat.view.js';

// Register Routes
router.addRoute('/login', { render: renderLogin, init: initLogin });
router.addRoute('/register', { render: renderRegister, init: initRegister });
router.addRoute('/dashboard', { render: renderDashboard, init: initDashboard });
router.addRoute('/events', { render: renderEvents, init: initEvents });
router.addRoute('/admin_planning', { render: renderPlanningList, init: initPlanningList });
router.addRoute('/admin_users', { render: renderDirectory });
router.addRoute('/messages', { render: renderChat, init: initChat });
router.addRoute('/messages/:id', { render: renderChat, init: initChat });
router.addRoute('/profile', { render: renderProfile, init: initProfile });
router.addRoute('/profile/:id', { render: renderProfile, init: initProfile });

const app = document.getElementById('app');

/**
 * Main Entry Point
 */
async function init() {
    // 1. Check Session
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        store.state.user = session.user;
        const savedMode = localStorage.getItem('cop1_admin_mode');
        store.state.adminMode = savedMode !== 'false';

        try {
            await loadUserProfile(session.user.id);
            renderAppLayout();
        } catch (error) {
            console.error("Profile Load Error", error);
            showToast("Erreur chargement profil", "error");
            renderLoginView();
        }
    } else {
        renderLoginView();
    }

    // 2. Auth Listener
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && (!store.state.user || session?.user.id !== store.state.user?.id)) {
            window.location.reload();
        } else if (event === 'SIGNED_OUT') {
            store.state.user = null;
            store.state.profile = null;
            renderLoginView();
        }
    });

    // 3. Global Event Delegation
    setupGlobalEvents();
}

/**
 * Loads User Profile from Supabase
 */
async function loadUserProfile(userId) {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    store.state.profile = profile;

    if (!profile.is_admin) {
        store.state.adminMode = false;
    }
}

/**
 * Renders the full App Shell (Sidebar, Header, Main, Nav)
 */
function renderAppLayout() {
    const user = store.state.user;
    const profile = store.state.profile;
    const view = store.state.view || (store.state.adminMode ? 'dashboard' : 'events');
    const adminMode = store.state.adminMode;

    app.innerHTML = `
        <div class="flex h-full w-full overflow-hidden bg-[#F8FAFC]">
            ${renderSidebar(profile, view, adminMode)}

            <div class="flex-1 flex flex-col h-full relative min-w-0">
                ${renderHeader(profile)}

                <main id="main-slot" class="flex-1 overflow-y-auto pt-20 pb-28 px-4 md:p-10 w-full scroll-smooth">
                    <!-- View Content Will Be Mounted Here by Router -->
                </main>

                ${renderMobileNav(profile, view, adminMode)}
            </div>
        </div>
    `;

    createIcons();

    // Router Integration
    const mainSlot = document.getElementById('main-slot');
    if (mainSlot) {
        router.root = mainSlot;

        // Handle Initial Route
        const currentPath = window.location.pathname;
        if (currentPath === '/' || currentPath === '/index.html') {
            router.navigateTo('dashboard');
        } else {
            router.handleLocation();
        }
    }
}

/**
 * Renders the Login Container (Placeholder for Auth Module)
 */
function renderLoginView() {
    app.innerHTML = renderLogin();
    initLogin();
}

/**
 * Global Event Listeners
 */
function setupGlobalEvents() {
    document.addEventListener('click', (e) => {
        // 1. Navigation Links [data-link]
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            const viewName = link.dataset.link;
            store.state.view = viewName; // Update Store
            router.navigateTo(viewName); // Trigger Router
            updateUI(); // Quick UI refresh (active states)
        }

        // 2. Mobile Menu Button
        if (e.target.closest('#btn-mobile-menu')) {
            openMobileMenu();
        }

        // 3. Logout
        if (e.target.closest('#btn-logout')) {
            handleLogout();
        }

        // 4. Toggle Admin Mode
        if (e.target.closest('#btn-toggle-admin')) {
            toggleAdminMode();
        }
    });

    // 5. Mobile Menu Custom Events
    document.addEventListener('nav-click', (e) => {
        const viewName = e.detail;
        store.state.view = viewName;
        router.navigateTo(viewName);
        updateUI();

        // Close modal if open
        const m = document.getElementById('mobile-menu-modal');
        if (m) m.remove();
    });
}

function updateUI() {
    if (store.state.user) renderAppLayout();
}

/**
 * Logic Implementation
 */
export async function handleLogout() {
    if (!confirm("Déconnexion ?")) return;
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.reload();
}

export function toggleAdminMode() {
    store.state.adminMode = !store.state.adminMode;
    localStorage.setItem('cop1_admin_mode', store.state.adminMode);

    const newView = store.state.adminMode ? 'dashboard' : 'events';
    store.state.view = newView;
    router.navigateTo(newView);
    updateUI();
}

function openMobileMenu() {
    const m = document.createElement('div');
    m.id = 'mobile-menu-modal';
    m.className = 'fixed inset-0 bg-slate-900/40 z-[100] flex flex-col justify-end backdrop-blur-sm animate-fade-in md:hidden';
    m.onclick = (e) => { if (e.target === m) m.remove(); };

    m.innerHTML = `
        <div class="bg-white rounded-t-[2rem] p-6 pb-20 shadow-2xl animate-slide-up">
             <h3 class="text-lg font-extrabold text-slate-900 mb-6 px-2">Menu</h3>
             <div class="grid grid-cols-2 gap-4">
                <button class="p-4 bg-slate-50 rounded-2xl font-bold" onclick="document.dispatchEvent(new CustomEvent('nav-click', {detail:'profile'}))">Profil</button>
             </div>
             <button onclick="this.closest('#mobile-menu-modal').remove()" class="w-full py-4 bg-slate-100 font-bold rounded-2xl mt-4">Fermer</button>
        </div>
    `;
    document.body.appendChild(m);
}

// Start
init();
