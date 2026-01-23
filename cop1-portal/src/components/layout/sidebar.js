/**
 * ============================================
 * SIDEBAR COMPONENT - Desktop Navigation
 * ============================================
 * Affiche la navigation latérale desktop avec :
 * - Logo et branding
 * - Menu de navigation contextuel (Admin vs Bénévole)
 * - Toggle mode admin (si l'utilisateur est admin)
 * - Bouton de déconnexion
 * 
 * PRINCIPE DRY APPLIQUÉ :
 * - Utilise APP_CONFIG pour les constantes (LOGO_URL)
 * - Utilise AuthService pour la déconnexion
 * - Utilise store pour l'état global (adminMode)
 * - Pas de duplication de logique
 * ============================================
 */

import { APP_CONFIG } from '../../core/constants.js';
import { AuthService } from '../../services/auth.js';
import { store } from '../../core/store.js';

/**
 * Configuration des menus de navigation
 * RESTAURÉ depuis index_originel.html (lignes 669-681)
 */
const NAV_ITEMS = {
    admin: [
        { id: '/dashboard', icon: 'layout-grid', label: 'Accueil' },
        { id: '/admin_planning', icon: 'calendar-days', label: 'Planning' },
        { id: '/messages', icon: 'message-circle', label: 'Chat' },
        { id: '/admin_users', icon: 'users', label: 'Annuaire' },
        { id: '/poles', icon: 'network', label: 'Pôles' },
        { id: '/profile', icon: 'user', label: 'Profil' }
    ],
    volunteer: [
        { id: '/events', icon: 'calendar-check', label: 'Missions' },
        { id: '/poles', icon: 'network', label: 'Pôles' },
        { id: '/messages', icon: 'message-circle', label: 'Chat' },
        { id: '/profile', icon: 'user', label: 'Profil' }
    ]
};

/**
 * Renders the Sidebar component as an HTML string.
 * @param {Object} profile - The user profile object
 * @param {string} currentView - The current active view (e.g., '/dashboard')
 * @param {boolean} adminMode - Whether admin mode is active
 * @returns {string} The HTML string for the sidebar
 */
export function renderSidebar(profile, currentView, adminMode) {
    const { LOGO_URL } = APP_CONFIG;

    // Détermine si l'utilisateur est admin ET en mode admin
    const isProfileAdmin = profile?.is_admin || false;
    const isEffectiveAdmin = isProfileAdmin && adminMode;

    // Sélectionne les items de navigation appropriés
    const navItems = isEffectiveAdmin ? NAV_ITEMS.admin : NAV_ITEMS.volunteer;

    // Génère le HTML des items de navigation
    const navItemsHtml = navItems.map(item => {
        const isActive = isItemActive(item.id, currentView);
        const activeClasses = isActive
            ? 'bg-brand-600 text-white shadow-lg'
            : 'text-slate-500 hover:bg-slate-50';

        return `
            <button 
                data-link="${item.id}" 
                aria-label="${item.label}"
                aria-current="${isActive ? 'page' : 'false'}"
                class="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-sm transition ${activeClasses}"
            >
                <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                <span>${item.label}</span>
            </button>
        `;
    }).join('');

    // Génère le toggle admin si l'utilisateur est admin
    const adminToggleHtml = isProfileAdmin ? `
        <div class="mt-8 px-4">
            <div class="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Mode</div>
            <button 
                data-action="toggle-admin"
                aria-label="${adminMode ? 'Passer en vue bénévole' : 'Passer en vue responsable'}"
                class="w-full py-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 active:scale-95 transition-all shadow-sm"
            >
                ${adminMode ? '👤 Vue Bénévole' : '🛡️ Vue Responsable'}
            </button>
        </div>
    ` : '';

    return `
        <aside class="hidden md:flex w-72 flex-col bg-white border-r border-slate-100 z-50 flex-shrink-0 h-full">
            <!-- Header avec Logo -->
            <div class="h-24 flex items-center px-8 flex-shrink-0 border-b border-slate-50">
                <img src="${LOGO_URL}" class="h-10 w-auto mr-3" alt="Logo COP1 Angers">
                <span class="font-extrabold text-2xl text-brand-900">COP1</span>
            </div>
            
            <!-- Navigation -->
            <nav 
                id="sidebar-nav" 
                class="flex-1 px-4 space-y-2 py-4 overflow-y-auto no-scrollbar"
                role="navigation"
                aria-label="Navigation principale"
            >
                ${navItemsHtml}
                ${adminToggleHtml}
            </nav>
            
            <!-- Footer avec Déconnexion -->
            <div class="p-6 flex-shrink-0 border-t border-slate-50">
                <button 
                    data-action="logout"
                    aria-label="Se déconnecter"
                    class="flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-50 w-full p-4 rounded-xl transition active:scale-95"
                >
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                    <span>Déconnexion</span>
                </button>
            </div>
        </aside>
    `;
}

/**
 * Vérifie si un item de navigation est actif
 * AMÉLIORATION : Gère les sous-routes (ex: /messages/123 → /messages)
 * @param {string} itemPath - Le chemin de l'item (ex: '/messages')
 * @param {string} currentView - La vue actuelle (ex: '/messages' ou 'messages')
 * @returns {boolean}
 */
function isItemActive(itemPath, currentView) {
    // Normalise les chemins (ajoute '/' si manquant)
    const normalizedItem = itemPath.startsWith('/') ? itemPath : `/${itemPath}`;
    const normalizedView = currentView.startsWith('/') ? currentView : `/${currentView}`;

    // Correspondance exacte
    if (normalizedItem === normalizedView) return true;

    // Correspondance de la racine (ex: /messages/123 → /messages)
    const viewRoot = `/${normalizedView.split('/')[1]}`;
    return normalizedItem === viewRoot;
}

/**
 * Updates the active state of sidebar navigation links without re-rendering the DOM.
 * OPTIMISATION : Évite un re-render complet de la sidebar lors de la navigation
 * @param {string} path - The current active path (e.g. '/dashboard')
 */
export function updateActiveNavLink(path) {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) {
        console.warn('⚠️ Sidebar: Navigation introuvable. Mise à jour ignorée.');
        return;
    }

    // Normalise le chemin
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Désactive tous les liens
    const allButtons = nav.querySelectorAll('[data-link]');
    allButtons.forEach(btn => {
        btn.className = "w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-sm transition text-slate-500 hover:bg-slate-50";
        btn.setAttribute('aria-current', 'false');
    });

    // Active le lien correspondant
    let targetBtn = nav.querySelector(`[data-link="${normalizedPath}"]`);

    // Fallback : correspondance de la racine (ex: /messages/123 → /messages)
    if (!targetBtn) {
        const rootPath = `/${normalizedPath.split('/')[1]}`;
        targetBtn = nav.querySelector(`[data-link="${rootPath}"]`);
    }

    if (targetBtn) {
        targetBtn.className = "w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-sm transition bg-brand-600 text-white shadow-lg";
        targetBtn.setAttribute('aria-current', 'page');
    }
}

/**
 * Initialise les événements de la sidebar (Déconnexion, Toggle Admin).
 * À appeler APRÈS avoir injecté le HTML de la sidebar dans le DOM.
 * 
 * PRINCIPE DRY :
 * - Utilise AuthService.logout() au lieu de dupliquer la logique
 * - Utilise store.state.adminMode au lieu d'une variable globale
 */
export function initSidebar() {
    // 1. Gestion Déconnexion
    const btnLogout = document.querySelector('[data-action="logout"]');
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }

    // 2. Gestion du Toggle Admin (si présent)
    const btnToggle = document.querySelector('[data-action="toggle-admin"]');
    if (btnToggle) {
        btnToggle.addEventListener('click', handleAdminToggle);
    }
}

/**
 * Gère la déconnexion de l'utilisateur
 * RESTAURÉ depuis index_originel.html avec amélioration
 */
async function handleLogout() {
    // Confirmation utilisateur
    const confirmed = confirm("Voulez-vous vraiment vous déconnecter ?");
    if (!confirmed) return;

    try {
        // Utilise le service d'authentification (DRY)
        await AuthService.logout();

        // Nettoie le state local
        store.state.user = null;
        store.state.profile = null;

        // Redirige vers la page de connexion
        window.location.href = '/login';

    } catch (error) {
        console.error('❌ Erreur lors de la déconnexion:', error);

        // Fallback : force le rechargement (nettoie la session)
        window.location.reload();
    }
}

/**
 * Gère le basculement entre mode admin et mode bénévole
 * RESTAURÉ depuis index_originel.html (lignes 795-807) avec améliorations
 */
function handleAdminToggle() {
    try {
        // Inverse le mode admin dans le store (DRY)
        store.state.adminMode = !store.state.adminMode;

        // Persiste le choix dans le localStorage
        localStorage.setItem('cop1_admin_mode', store.state.adminMode.toString());

        // Feedback visuel immédiat (optionnel)
        const btn = document.querySelector('[data-action="toggle-admin"]');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        // Recharge pour appliquer le changement de mode
        // Note : Le main.js gère la redirection vers la bonne vue
        window.location.reload();

    } catch (error) {
        console.error('❌ Erreur lors du changement de mode:', error);

        // Fallback : recharge quand même
        window.location.reload();
    }
}

/**
 * Cleanup : Supprime les événements de la sidebar
 * Utile pour éviter les fuites mémoire si la sidebar est re-rendue
 */
export function cleanupSidebar() {
    const btnLogout = document.querySelector('[data-action="logout"]');
    if (btnLogout) {
        btnLogout.removeEventListener('click', handleLogout);
    }

    const btnToggle = document.querySelector('[data-action="toggle-admin"]');
    if (btnToggle) {
        btnToggle.removeEventListener('click', handleAdminToggle);
    }
}
