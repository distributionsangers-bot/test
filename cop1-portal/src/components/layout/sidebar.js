
export function Sidebar(user, currentView, adminMode) {
    const LOGO_URL = "logo.png"; // Ideally, this should come from a config or passed prop
    const isAdmin = user?.user_metadata?.is_admin || (user?.profile?.is_admin) || false; // Check profile if available
    // Note: 'user' prop might be the full state object or just the user. 
    // Based on original code: state.profile.is_admin checked.
    // Let's assume 'user' passed here is the 'state' object for better context? 
    // Or we pass (user, profile, view, adminMode).
    // Let's assume the arguments are: (profile, currentView, isAdminModeEnabled)
}

/**
 * Renders the Sidebar component as an HTML string.
 * @param {Object} profile - The user profile object.
 * @param {string} currentView - The current active view (e.g., 'dashboard').
 * @param {boolean} adminMode - Whether admin mode is active.
 * @returns {string} The HTML string for the sidebar.
 */
export function renderSidebar(profile, currentView, adminMode) {
    const LOGO_URL = "logo.png";
    const isProfileAdmin = profile?.is_admin;
    const isEffectiveAdmin = isProfileAdmin && adminMode;

    const desktopItems = isEffectiveAdmin ? [
        { id: 'dashboard', i: 'layout-grid', l: 'Accueil' },
        { id: 'admin_planning', i: 'calendar-days', l: 'Planning' },
        { id: 'messages', i: 'message-circle', l: 'Chat' },
        { id: 'admin_users', i: 'users', l: 'Annuaire' },
        { id: 'poles', i: 'network', l: 'Pôles' },
        { id: 'profile', i: 'user', l: 'Profil' }
    ] : [
        { id: 'events', i: 'calendar-check', l: 'Missions' },
        { id: 'poles', i: 'network', l: 'Pôles' },
        { id: 'messages', i: 'message-circle', l: 'Chat' },
        { id: 'profile', i: 'user', l: 'Profil' }
    ];

    const navItemsHtml = desktopItems.map(i => `
        <button data-link="${i.id}" class="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-sm transition ${currentView === i.id ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}">
            <i data-lucide="${i.i}" class="w-5 h-5"></i> ${i.l}
        </button>
    `).join('');

    const adminToggleHtml = isProfileAdmin ? `
        <div class="mt-8 px-4">
            <div class="text-xs font-bold text-slate-400 uppercase mb-2">Mode</div>
            <button id="btn-toggle-admin" class="w-full py-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition">
                ${adminMode ? 'Vue Bénévole' : 'Vue Responsable'}
            </button>
        </div>` : '';

    return `
        <aside class="hidden md:flex w-72 flex-col bg-white border-r border-slate-100 z-50 flex-shrink-0 h-full">
            <div class="h-24 flex items-center px-8 flex-shrink-0">
                <img src="${LOGO_URL}" class="h-10 w-auto mr-3" alt="Logo">
                <span class="font-extrabold text-2xl text-brand-900">COP1</span>
            </div>
            
            <nav id="sidebar-nav" class="flex-1 px-4 space-y-2 py-4 overflow-y-auto no-scrollbar">
                ${navItemsHtml}
                ${adminToggleHtml}
            </nav>
            
            <div class="p-6 flex-shrink-0 border-t border-slate-50">
                <button id="btn-logout" class="flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-50 w-full p-4 rounded-xl transition">
                    <i data-lucide="log-out" class="w-5 h-5"></i> Déconnexion
                </button>
            </div>
        </aside>
    `;
}
