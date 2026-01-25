/**
 * ============================================
 * MOBILE NAVIGATION COMPONENT - Premium Bottom Bar
 * ============================================
 * Design moderne avec :
 * - Pill-style active indicator (Animated)
 * - Glassmorphism effect
 * - Smooth animations
 * - Premium bottom sheet menu
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
        { id: '/messages', icon: 'message-circle', label: 'Messages', badge: true },
        { id: 'MENU', icon: 'menu', label: 'Menu' }
    ],
    volunteer: [
        { id: '/dashboard', icon: 'home', label: 'Accueil' },
        { id: '/events', icon: 'calendar-check', label: 'Missions' },
        { id: '/messages', icon: 'message-circle', label: 'Messages', badge: true },
        { id: 'MENU', icon: 'menu', label: 'Menu' }
    ]
};

const MENU_PAGES = ['admin_users', 'poles', 'profile'];

export function renderMobileNav(profile, currentView, adminMode) {
    const isProfileAdmin = profile?.is_admin || false;
    const isEffectiveAdmin = isProfileAdmin && adminMode;
    const navItems = isEffectiveAdmin ? MOBILE_NAV_ITEMS.admin : MOBILE_NAV_ITEMS.volunteer;

    const navHtml = navItems.map(item => {
        // Special Case: Menu
        if (item.id === 'MENU') {
            const isMenuPageActive = isPageInMenu(currentView);
            return renderNavItem(item, isMenuPageActive, true);
        }

        // Standard Links
        const isActive = isItemActive(item.id, currentView);
        return renderNavItem(item, isActive, false);
    }).join('');

    return `
        <nav 
            id="mobile-nav" 
            class="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200/50 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
            role="navigation"
            style="padding-bottom: max(env(safe-area-inset-bottom), 8px);"
        >
            <div class="flex justify-around items-stretch px-2">
                ${navHtml}
            </div>
        </nav>
    `;
}

/**
 * Helper: Strict Path Matching Logic
 */
function isItemActive(itemPath, currentView) {
    const p1 = itemPath.replace(/^\/|\/$/g, '');
    const p2 = currentView.replace(/^\/|\/$/g, '');
    if (p1 === p2) return true;
    if (p2.startsWith(p1 + '/')) return true;
    return false;
}

/**
 * Helper: Check if current view belongs to Menu
 */
function isPageInMenu(currentView) {
    // Also clean view for comparison
    const viewName = currentView.replace(/^\/|\/$/g, '');
    return MENU_PAGES.includes(viewName) || MENU_PAGES.some(p => viewName.startsWith(p + '/'));
}

/**
 * Helper to render a single nav item
 */
function renderNavItem(item, isActive, isMenu) {
    const actionAttr = isMenu ? 'data-action="open-mobile-menu"' : `data-link="${item.id}"`;

    return `
        <button 
            ${actionAttr}
            aria-label="${item.label}"
            aria-current="${isActive ? 'page' : 'false'}"
            class="nav-item relative flex flex-col items-center justify-center gap-0.5 py-2 flex-1 transition-all duration-200 ${isActive ? 'text-brand-600' : 'text-slate-400'}"
        >
            <!-- Animated Pill Indicator -->
            <div class="active-pill absolute top-0 w-10 h-1 bg-brand-600 rounded-full transition-all duration-300 ease-out origin-center ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}"></div>
            
            <div class="icon-container relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${isActive ? 'bg-brand-50' : 'bg-transparent'}">
                <i data-lucide="${item.icon}" class="w-6 h-6 transition-all duration-200 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}"></i>
                ${item.badge ? '<span id="mobile-chat-badge" class="hidden absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>' : ''}
            </div>
            
            <span class="text-[10px] font-semibold transition-colors duration-200">${item.label}</span>
        </button>
    `;
}

/**
 * Updates the active state of mobile navigation links
 * Called by main.js on route-changed event
 */
export function updateActiveNavLink(path) {
    const nav = document.getElementById('mobile-nav');
    if (!nav) return;

    const allButtons = nav.querySelectorAll('.nav-item');

    allButtons.forEach(btn => {
        let isActive = false;

        if (btn.hasAttribute('data-link')) {
            isActive = isItemActive(btn.dataset.link, path);
        } else if (btn.dataset.action === 'open-mobile-menu') {
            isActive = isPageInMenu(path);
        }

        // Apply visual updates
        if (isActive) {
            btn.classList.remove('text-slate-400');
            btn.classList.add('text-brand-600');
            btn.setAttribute('aria-current', 'page');
        } else {
            btn.classList.remove('text-brand-600');
            btn.classList.add('text-slate-400');
            btn.setAttribute('aria-current', 'false');
        }

        // Update Pill
        const pill = btn.querySelector('.active-pill');
        if (pill) {
            if (isActive) {
                pill.classList.remove('scale-0', 'opacity-0');
                pill.classList.add('scale-100', 'opacity-100');
            } else {
                pill.classList.remove('scale-100', 'opacity-100');
                pill.classList.add('scale-0', 'opacity-0');
            }
        }

        // Update Icon Container
        const iconContainer = btn.querySelector('.icon-container');
        if (iconContainer) {
            if (isActive) {
                iconContainer.classList.remove('bg-transparent');
                iconContainer.classList.add('bg-brand-50');
            } else {
                iconContainer.classList.remove('bg-brand-50');
                iconContainer.classList.add('bg-transparent');
            }

            // Update Icon
            // (Stroke manipulation removed for stability)
            const icon = iconContainer.querySelector('svg') || iconContainer.querySelector('i');
            if (icon) {
                // Optional: Add other stable manipulations if needed
            }
        }
    });
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
    const lastName = profile?.last_name || '';
    const email = profile?.email || '';
    const initial = firstName[0]?.toUpperCase() || '?';

    const modal = document.createElement('div');
    modal.id = 'mobile-menu-modal';
    modal.className = 'fixed inset-0 bg-black/50 z-[100] flex flex-col justify-end backdrop-blur-sm animate-fade-in md:hidden';

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeMobileMenu();
    });

    modal.innerHTML = `
        <div class="bg-white rounded-t-[2rem] shadow-2xl animate-slide-up" style="max-height: 85vh; overflow-y: auto; padding-bottom: max(env(safe-area-inset-bottom), 16px);">
            <!-- Handle Bar -->
            <div class="flex justify-center pt-3 pb-1">
                <div class="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <!-- User Card -->
            <div class="px-5 py-4">
                <div class="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-100">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/30">
                        ${initial}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-slate-900 text-lg truncate">${firstName} ${lastName}</div>
                        <div class="text-sm text-slate-400 truncate">${email}</div>
                    </div>
                    ${profile?.is_admin ? `
                        <span class="text-xs font-bold px-2.5 py-1 rounded-lg ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">
                            ${isAdmin ? 'Admin' : 'Volontaire'}
                        </span>
                    ` : ''}
                </div>
            </div>
            
            <!-- Menu Grid -->
            <div class="px-5 pb-4">
                <div class="grid grid-cols-3 gap-3">
                    <button data-menu-action="navigate" data-menu-path="/profile" class="menu-card flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                            <i data-lucide="user" class="w-5 h-5"></i>
                        </div>
                        <span class="text-xs font-semibold text-slate-700">Profil</span>
                    </button>
                    
                    <button data-menu-action="navigate" data-menu-path="/poles" class="menu-card flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
                            <i data-lucide="network" class="w-5 h-5"></i>
                        </div>
                        <span class="text-xs font-semibold text-slate-700">Pôles</span>
                    </button>
                    
                    ${isAdmin ? `
                        <button data-menu-action="navigate" data-menu-path="/admin_users" class="menu-card flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
                                <i data-lucide="users" class="w-5 h-5"></i>
                            </div>
                            <span class="text-xs font-semibold text-slate-700">Annuaire</span>
                        </button>
                    ` : `
                        <button data-menu-action="navigate" data-menu-path="/events" class="menu-card flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                                <i data-lucide="calendar-check" class="w-5 h-5"></i>
                            </div>
                            <span class="text-xs font-semibold text-slate-700">Missions</span>
                        </button>
                    `}
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="px-5 pb-4 space-y-2">
                ${profile?.is_admin ? `
                    <button data-menu-action="toggle-admin" class="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${isAdmin ? 'from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100' : 'from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100'} transition-all active:scale-[0.98]">
                        <div class="w-11 h-11 rounded-xl ${isAdmin ? 'bg-emerald-500' : 'bg-amber-500'} flex items-center justify-center text-white shadow-lg">
                            <i data-lucide="${isAdmin ? 'user' : 'shield'}" class="w-5 h-5"></i>
                        </div>
                        <div class="flex-1 text-left">
                            <div class="font-bold ${isAdmin ? 'text-emerald-700' : 'text-amber-700'}">${isAdmin ? 'Passer en Vue Bénévole' : 'Passer en Mode Admin'}</div>
                            <div class="text-xs ${isAdmin ? 'text-emerald-500' : 'text-amber-500'}">Changer de vue</div>
                        </div>
                        <i data-lucide="arrow-right" class="w-5 h-5 ${isAdmin ? 'text-emerald-400' : 'text-amber-400'}"></i>
                    </button>
                ` : ''}
                
                <!-- Déconnexion -->
                <button data-menu-action="logout" class="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 transition-all active:scale-[0.98]">
                    <div class="w-11 h-11 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/25">
                        <i data-lucide="log-out" class="w-5 h-5"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <div class="font-bold text-red-700">Se déconnecter</div>
                        <div class="text-xs text-red-400">Quitter l'application</div>
                    </div>
                    <i data-lucide="chevron-right" class="w-5 h-5 text-red-300"></i>
                </button>
            </div>
            
            <!-- Close Button -->
            <div class="px-5 pb-2">
                <button data-menu-action="close" class="w-full py-3.5 bg-slate-100 font-bold text-slate-500 rounded-2xl hover:bg-slate-200 active:scale-[0.98] transition-all text-sm">
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
    showToast(store.state.adminMode ? 'Mode Admin activé' : 'Mode Bénévole activé', 'success');
    window.location.reload();
}

async function handleLogout() {
    showConfirm('Voulez-vous vous déconnecter ?', async () => {
        try {
            await supabase.auth.signOut();
            store.state.user = null;
            store.state.profile = null;
            // On garde le mode admin en mémoire ou non ? Le main.js ne l'enlève pas.
            // Par sécurité, on peut le laisser ou l'enlever.
            localStorage.removeItem('cop1_admin_mode');

            showToast('Déconnexion réussie');

            // Force reload vers login pour purger l'état
            window.location.href = '/login';
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
