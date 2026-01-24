/**
 * ============================================
 * MOBILE NAVIGATION COMPONENT - Premium Bottom Bar
 * ============================================
 */

import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { createIcons, icons } from 'lucide';
import { supabase } from '../../services/supabase.js';
import { showConfirm, showToast } from '../../services/utils.js';

const MOBILE_NAV_ITEMS = {
    admin: [
        { id: '/dashboard', icon: 'home', label: 'Accueil' },
        { id: '/admin_planning', icon: 'calendar', label: 'Planning' },
        { id: '/messages', icon: 'message-circle', label: 'Chat' },
        { id: 'MENU', icon: 'grid-2x2', label: 'Plus' }
    ],
    volunteer: [
        { id: '/dashboard', icon: 'home', label: 'Accueil' },
        { id: '/events', icon: 'calendar-check', label: 'Missions' },
        { id: '/messages', icon: 'message-circle', label: 'Chat' },
        { id: 'MENU', icon: 'user', label: 'Profil' }
    ]
};

const MENU_PAGES = ['admin_users', 'poles', 'profile'];

export function renderMobileNav(profile, currentView, adminMode) {
    const isProfileAdmin = profile?.is_admin || false;
    const isEffectiveAdmin = isProfileAdmin && adminMode;
    const navItems = isEffectiveAdmin ? MOBILE_NAV_ITEMS.admin : MOBILE_NAV_ITEMS.volunteer;
    const normalizedView = currentView.startsWith('/') ? currentView.substring(1) : currentView;

    const navHtml = navItems.map(item => {
        if (item.id === 'MENU') {
            const isMenuPageActive = MENU_PAGES.includes(normalizedView) || normalizedView === 'profile';
            return `
                <button 
                    data-action="open-mobile-menu"
                    aria-label="Menu"
                    class="nav-item flex flex-col items-center justify-center gap-0.5 py-2 flex-1 transition ${isMenuPageActive ? 'text-brand-600' : 'text-slate-400'}"
                >
                    <div class="relative">
                        <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                    </div>
                    <span class="text-[10px] font-semibold">${item.label}</span>
                </button>
            `;
        }

        const normalizedItemId = item.id.startsWith('/') ? item.id.substring(1) : item.id;
        const isActive = normalizedView === normalizedItemId || normalizedView.startsWith(normalizedItemId + '/');

        return `
            <button 
                data-link="${item.id}" 
                aria-label="${item.label}"
                class="nav-item flex flex-col items-center justify-center gap-0.5 py-2 flex-1 transition ${isActive ? 'text-brand-600' : 'text-slate-400'}"
            >
                <div class="relative">
                    <i data-lucide="${item.icon}" class="w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}"></i>
                    ${item.id === '/messages' ? '<span id="chat-badge" class="hidden absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>' : ''}
                </div>
                <span class="text-[10px] font-semibold">${item.label}</span>
            </button>
        `;
    }).join('');

    return `
        <nav 
            id="mobile-nav" 
            class="md:hidden fixed bottom-0 left-0 right-0 w-full pb-safe bg-white border-t border-slate-100 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
            role="navigation"
        >
            <div class="flex justify-around items-stretch">
                ${navHtml}
            </div>
        </nav>
    `;
}

export function initMobileNav() {
    const btnMenu = document.querySelector('[data-action="open-mobile-menu"]');
    if (btnMenu) {
        btnMenu.addEventListener('click', openMobileMenu);
    }
}

function openMobileMenu() {
    const profile = store.state.profile;
    const isAdmin = profile?.is_admin && store.state.adminMode;
    const firstName = profile?.first_name || 'Utilisateur';
    const initial = firstName[0]?.toUpperCase() || '?';

    const modal = document.createElement('div');
    modal.id = 'mobile-menu-modal';
    modal.className = 'fixed inset-0 bg-black/40 z-[100] flex flex-col justify-end backdrop-blur-sm animate-fade-in md:hidden';

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeMobileMenu();
    });

    modal.innerHTML = `
        <div class="bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-2">
                <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
            </div>
            
            <!-- User Card -->
            <div class="px-5 pb-4 border-b border-slate-100">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        ${initial}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-slate-900 truncate">${firstName} ${profile?.last_name || ''}</div>
                        <div class="text-xs text-slate-400 truncate">${profile?.email || ''}</div>
                    </div>
                    ${isAdmin ? '<span class="text-[9px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Admin</span>' : ''}
                </div>
            </div>
            
            <!-- Menu Items -->
            <div class="p-4 space-y-1">
                ${isAdmin ? `
                    <!-- Admin Menu -->
                    <button data-menu-action="navigate" data-menu-path="/profile" class="menu-item w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left">
                        <div class="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                            <i data-lucide="user" class="w-4 h-4"></i>
                        </div>
                        <span class="font-medium text-slate-700 text-sm">Mon Profil</span>
                    </button>
                    
                    <button data-menu-action="navigate" data-menu-path="/admin_users" class="menu-item w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left">
                        <div class="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                            <i data-lucide="users" class="w-4 h-4"></i>
                        </div>
                        <span class="font-medium text-slate-700 text-sm">Annuaire</span>
                    </button>
                    
                    <button data-menu-action="navigate" data-menu-path="/poles" class="menu-item w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left">
                        <div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                            <i data-lucide="network" class="w-4 h-4"></i>
                        </div>
                        <span class="font-medium text-slate-700 text-sm">Pôles</span>
                    </button>
                    
                    <div class="h-px bg-slate-100 my-2"></div>
                    
                    <button data-menu-action="toggle-admin" class="menu-item w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left">
                        <div class="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                            <i data-lucide="arrow-right-left" class="w-4 h-4"></i>
                        </div>
                        <span class="font-medium text-slate-700 text-sm">Vue Bénévole</span>
                    </button>
                ` : `
                    <!-- Volunteer Menu -->
                    <button data-menu-action="navigate" data-menu-path="/profile" class="menu-item w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left">
                        <div class="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                            <i data-lucide="user" class="w-4 h-4"></i>
                        </div>
                        <span class="font-medium text-slate-700 text-sm">Mon Profil</span>
                    </button>
                    
                    <button data-menu-action="navigate" data-menu-path="/poles" class="menu-item w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left">
                        <div class="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                            <i data-lucide="network" class="w-4 h-4"></i>
                        </div>
                        <span class="font-medium text-slate-700 text-sm">Pôles</span>
                    </button>
                    
                    ${profile?.is_admin ? `
                    <div class="h-px bg-slate-100 my-2"></div>
                    
                    <button data-menu-action="toggle-admin" class="menu-item w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left">
                        <div class="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                            <i data-lucide="shield" class="w-4 h-4"></i>
                        </div>
                        <span class="font-medium text-slate-700 text-sm">Mode Admin</span>
                    </button>
                    ` : ''}
                `}
                
                <div class="h-px bg-slate-100 my-2"></div>
                
                <!-- LOGOUT - Always visible -->
                <button data-menu-action="logout" class="menu-item w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition text-left group">
                    <div class="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center text-red-500 group-hover:bg-red-200 transition">
                        <i data-lucide="log-out" class="w-4 h-4"></i>
                    </div>
                    <span class="font-medium text-red-600 text-sm">Se déconnecter</span>
                </button>
            </div>
            
            <!-- Close Button -->
            <div class="p-4 pt-0 pb-safe">
                <button data-menu-action="close" class="w-full py-3 bg-slate-100 font-semibold text-slate-500 rounded-xl hover:bg-slate-200 transition text-sm">
                    Fermer
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    createIcons({ icons, root: modal });
    attachMenuEvents(modal);
}

function attachMenuEvents(modal) {
    modal.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-menu-action]');
        if (!btn) return;

        const action = btn.dataset.menuAction;

        switch (action) {
            case 'navigate':
                const path = btn.dataset.menuPath;
                if (path) {
                    closeMobileMenu();
                    router.navigateTo(path);
                }
                break;

            case 'toggle-admin':
                closeMobileMenu();
                handleAdminToggle();
                break;

            case 'logout':
                closeMobileMenu();
                await handleLogout();
                break;

            case 'close':
                closeMobileMenu();
                break;
        }
    });
}

function closeMobileMenu() {
    const modal = document.getElementById('mobile-menu-modal');
    if (modal) {
        modal.style.opacity = '0';
        modal.querySelector('.bg-white')?.classList.add('translate-y-full');
        setTimeout(() => modal.remove(), 200);
    }
}

function handleAdminToggle() {
    store.state.adminMode = !store.state.adminMode;
    localStorage.setItem('cop1_admin_mode', store.state.adminMode.toString());
    showToast(store.state.adminMode ? 'Mode Admin activé' : 'Mode Bénévole activé');
    window.location.reload();
}

async function handleLogout() {
    showConfirm('Voulez-vous vous déconnecter ?', async () => {
        try {
            await supabase.auth.signOut();
            store.state.user = null;
            store.state.profile = null;
            localStorage.removeItem('cop1_admin_mode');
            showToast('Déconnexion réussie');
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Erreur déconnexion', 'error');
        }
    }, { type: 'danger', confirmText: 'Déconnecter' });
}

export function cleanupMobileNav() {
    const btnMenu = document.querySelector('[data-action="open-mobile-menu"]');
    if (btnMenu) {
        btnMenu.removeEventListener('click', openMobileMenu);
    }
    closeMobileMenu();
}
