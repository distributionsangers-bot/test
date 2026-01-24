/**
 * ============================================
 * SIDEBAR COMPONENT - Premium Desktop Navigation
 * ============================================
 * Design moderne avec :
 * - Glassmorphism effect
 * - Pill-style navigation avec indicateur animé
 * - Gradient accents
 * - User card premium
 * - Smooth hover states
 * ============================================
 */

import { APP_CONFIG } from '../../core/constants.js';
import { AuthService } from '../../services/auth.js';
import { store } from '../../core/store.js';
import { showConfirm, showToast } from '../../services/utils.js';

/**
 * Configuration des menus de navigation
 */
const NAV_ITEMS = {
    admin: [
        { id: '/dashboard', icon: 'layout-grid', label: 'Accueil', color: 'from-blue-500 to-indigo-600' },
        { id: '/admin_planning', icon: 'calendar-days', label: 'Planning', color: 'from-emerald-500 to-teal-600' },
        { id: '/messages', icon: 'message-circle', label: 'Messages', color: 'from-violet-500 to-purple-600', badge: true },
        { id: '/admin_users', icon: 'users', label: 'Annuaire', color: 'from-amber-500 to-orange-600' },
        { id: '/poles', icon: 'network', label: 'Pôles', color: 'from-pink-500 to-rose-600' },
        { id: '/profile', icon: 'user', label: 'Mon Profil', color: 'from-slate-500 to-slate-700' }
    ],
    volunteer: [
        { id: '/dashboard', icon: 'home', label: 'Accueil', color: 'from-blue-500 to-indigo-600' },
        { id: '/events', icon: 'calendar-check', label: 'Missions', color: 'from-emerald-500 to-teal-600' },
        { id: '/messages', icon: 'message-circle', label: 'Messages', color: 'from-violet-500 to-purple-600', badge: true },
        { id: '/poles', icon: 'network', label: 'Pôles', color: 'from-pink-500 to-rose-600' },
        { id: '/profile', icon: 'user', label: 'Mon Profil', color: 'from-slate-500 to-slate-700' }
    ]
};

/**
 * Renders the Premium Sidebar component
 */
export function renderSidebar(profile, currentView, adminMode) {
    const { LOGO_URL } = APP_CONFIG;
    const isProfileAdmin = profile?.is_admin || false;
    const isEffectiveAdmin = isProfileAdmin && adminMode;
    const navItems = isEffectiveAdmin ? NAV_ITEMS.admin : NAV_ITEMS.volunteer;

    // User info
    const firstName = profile?.first_name || 'Utilisateur';
    const lastName = profile?.last_name || '';
    const email = profile?.email || '';
    const initial = firstName[0]?.toUpperCase() || '?';

    // Generate nav items HTML
    const navItemsHtml = navItems.map(item => {
        const isActive = isItemActive(item.id, currentView);

        return `
            <button 
                data-link="${item.id}" 
                aria-label="${item.label}"
                aria-current="${isActive ? 'page' : 'false'}"
                class="nav-link group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${isActive
                ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg shadow-brand-500/25'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }"
            >
                <div class="relative flex items-center justify-center w-9 h-9 rounded-lg ${isActive
                ? 'bg-white/20'
                : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm'
            } transition-all duration-200">
                    <i data-lucide="${item.icon}" class="w-[18px] h-[18px]"></i>
                    ${item.badge ? `<span id="sidebar-chat-badge" class="hidden absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>` : ''}
                </div>
                <span class="flex-1 ${isActive ? 'font-semibold' : ''}">${item.label}</span>
                ${isActive ? '<div class="w-1.5 h-1.5 rounded-full bg-white/80"></div>' : ''}
            </button>
        `;
    }).join('');

    // Admin toggle section
    const adminToggleHtml = isProfileAdmin ? `
        <div class="px-4 py-3">
            <button 
                data-action="toggle-admin"
                aria-label="${adminMode ? 'Passer en vue bénévole' : 'Passer en vue responsable'}"
                class="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${adminMode
            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        }"
            >
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg ${adminMode ? 'bg-amber-100' : 'bg-emerald-100'} flex items-center justify-center">
                        <i data-lucide="${adminMode ? 'user' : 'shield'}" class="w-4 h-4"></i>
                    </div>
                    <span>${adminMode ? 'Vue Bénévole' : 'Vue Admin'}</span>
                </div>
                <i data-lucide="arrow-right-left" class="w-4 h-4 opacity-50"></i>
            </button>
        </div>
    ` : '';

    return `
        <aside class="hidden md:flex w-72 flex-col bg-white/80 backdrop-blur-xl border-r border-slate-200/50 z-50 flex-shrink-0 h-full shadow-xl shadow-slate-200/50">
            <!-- Header avec Logo -->
            <div class="h-20 flex items-center gap-3 px-6 flex-shrink-0 border-b border-slate-100/50">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <img src="${LOGO_URL}" class="h-6 w-auto" alt="Logo COP1">
                </div>
                <div>
                    <span class="font-extrabold text-xl text-slate-900">COP1</span>
                    <span class="font-bold text-xl text-brand-600"> Angers</span>
                </div>
            </div>
            
            <!-- User Card -->
            <div class="px-4 py-4 border-b border-slate-100/50">
                <div class="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/50">
                    <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/25">
                        ${initial}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-slate-900 text-sm truncate">${firstName} ${lastName}</div>
                        <div class="text-xs text-slate-400 truncate">${email}</div>
                    </div>
                    ${isEffectiveAdmin ? '<span class="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">Admin</span>' : ''}
                </div>
            </div>
            
            <!-- Navigation -->
            <nav 
                id="sidebar-nav" 
                class="flex-1 px-3 space-y-1 py-4 overflow-y-auto no-scrollbar"
                role="navigation"
                aria-label="Navigation principale"
            >
                ${navItemsHtml}
            </nav>
            
            <!-- Admin Toggle -->
            ${adminToggleHtml}
            
            <!-- Footer avec Déconnexion -->
            <div class="p-4 flex-shrink-0 border-t border-slate-100/50">
                <button 
                    data-action="logout"
                    aria-label="Se déconnecter"
                    class="group flex items-center gap-3 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 w-full p-3 rounded-xl transition-all duration-200"
                >
                    <div class="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                        <i data-lucide="log-out" class="w-4 h-4 group-hover:text-red-500 transition-colors"></i>
                    </div>
                    <span>Déconnexion</span>
                </button>
            </div>
        </aside>
    `;
}

/**
 * Vérifie si un item de navigation est actif
 */
function isItemActive(itemPath, currentView) {
    const normalizedItem = itemPath.startsWith('/') ? itemPath : `/${itemPath}`;
    const normalizedView = currentView.startsWith('/') ? currentView : `/${currentView}`;

    if (normalizedItem === normalizedView) return true;

    const viewRoot = `/${normalizedView.split('/')[1]}`;
    return normalizedItem === viewRoot;
}

/**
 * Updates the active state of sidebar navigation links
 */
export function updateActiveNavLink(path) {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const allButtons = nav.querySelectorAll('[data-link]');

    allButtons.forEach(btn => {
        const btnPath = btn.dataset.link;
        const isActive = isItemActive(btnPath, normalizedPath);

        btn.classList.remove('bg-gradient-to-r', 'text-white', 'shadow-lg', 'shadow-brand-500/25');
        btn.classList.add('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
        btn.setAttribute('aria-current', 'false');

        const iconContainer = btn.querySelector('div');
        if (iconContainer) {
            iconContainer.classList.remove('bg-white/20');
            iconContainer.classList.add('bg-slate-100', 'group-hover:bg-white');
        }

        // Remove active dot
        const activeDot = btn.querySelector('.bg-white\\/80');
        if (activeDot) activeDot.remove();

        if (isActive) {
            // Get the color from nav items
            const navItems = store.state.adminMode ? NAV_ITEMS.admin : NAV_ITEMS.volunteer;
            const navItem = navItems.find(item => item.id === btnPath);
            const colorClass = navItem?.color || 'from-brand-500 to-brand-600';

            btn.classList.remove('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
            btn.classList.add('bg-gradient-to-r', colorClass, 'text-white', 'shadow-lg', 'shadow-brand-500/25');
            btn.setAttribute('aria-current', 'page');

            if (iconContainer) {
                iconContainer.classList.remove('bg-slate-100', 'group-hover:bg-white');
                iconContainer.classList.add('bg-white/20');
            }

            // Add active dot
            const dot = document.createElement('div');
            dot.className = 'w-1.5 h-1.5 rounded-full bg-white/80';
            btn.appendChild(dot);
        }
    });
}

/**
 * Initialise les événements de la sidebar
 */
export function initSidebar() {
    const btnLogout = document.querySelector('aside [data-action="logout"]');
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }
}

/**
 * Gère la déconnexion
 */
async function handleLogout() {
    showConfirm("Voulez-vous vraiment vous déconnecter ?", async () => {
        try {
            await AuthService.logout();
            store.state.user = null;
            store.state.profile = null;
            showToast('Déconnexion réussie');
            window.location.href = '/login';
        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
            window.location.reload();
        }
    }, { confirmText: 'Se déconnecter', type: 'danger' });
}

/**
 * Cleanup
 */
export function cleanupSidebar() {
    const btnLogout = document.querySelector('aside [data-action="logout"]');
    if (btnLogout) {
        btnLogout.removeEventListener('click', handleLogout);
    }
}
