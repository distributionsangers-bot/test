/**
 * ============================================
 * MOBILE NAVIGATION COMPONENT - Bottom Bar
 * ============================================
 * Affiche la barre de navigation mobile (bottom bar) avec :
 * - Navigation contextuelle (Admin vs Bénévole)
 * - Bouton "Menu" pour accéder aux pages supplémentaires (Admin uniquement)
 * - Modale overlay pour les options admin
 * - Indicateurs visuels de la page active
 * 
 * PRINCIPE DRY APPLIQUÉ :
 * - Utilise router pour la navigation
 * - Utilise store pour l'état global (adminMode)
 * - Utilise createIcons de Lucide (déjà géré par router)
 * 
 * RESTAURÉ depuis index_originel.html (lignes 715-794)
 * AMÉLIORATIONS :
 * - Gestion d'erreur robuste
 * - Accessibilité (aria-label, role)
 * - Cleanup des événements
 * - Modale admin complète
 * ============================================
 */

import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { createIcons, icons } from 'lucide';

/**
 * Configuration des menus de navigation mobile
 * RESTAURÉ depuis index_originel.html (lignes 686-702)
 */
const MOBILE_NAV_ITEMS = {
    admin: [
        { id: '/dashboard', icon: 'layout-grid', label: 'Accueil' },
        { id: '/admin_planning', icon: 'calendar-days', label: 'Planning' },
        { id: '/messages', icon: 'message-circle', label: 'Chat' },
        { id: 'MENU', icon: 'menu', label: 'Menu' } // Bouton spécial pour ouvrir la modale
    ],
    volunteer: [
        { id: '/events', icon: 'calendar-check', label: 'Missions' },
        { id: '/poles', icon: 'network', label: 'Pôles' },
        { id: '/messages', icon: 'message-circle', label: 'Chat' },
        { id: '/profile', icon: 'user', label: 'Profil' }
    ]
};

/**
 * Pages "cachées" qui activent le bouton Menu (Admin)
 * RESTAURÉ depuis index_originel.html (ligne 721)
 */
const MENU_PAGES = ['admin_users', 'poles', 'profile'];

/**
 * Renders the Mobile Navigation (Bottom Bar).
 * @param {Object} profile - User profile object
 * @param {string} currentView - Current view ID (e.g., '/dashboard' or 'dashboard')
 * @param {boolean} adminMode - Is admin mode active
 * @returns {string} HTML string
 */
export function renderMobileNav(profile, currentView, adminMode) {
    const isProfileAdmin = profile?.is_admin || false;
    const isEffectiveAdmin = isProfileAdmin && adminMode;

    // Sélectionne les items appropriés
    const navItems = isEffectiveAdmin ? MOBILE_NAV_ITEMS.admin : MOBILE_NAV_ITEMS.volunteer;

    // Normalise currentView (enlève le '/' si présent)
    const normalizedView = currentView.startsWith('/') ? currentView.substring(1) : currentView;

    // Génère le HTML des boutons
    const navHtml = navItems.map(item => {
        // Cas spécial : Bouton MENU (Admin uniquement)
        if (item.id === 'MENU') {
            const isMenuPageActive = MENU_PAGES.includes(normalizedView);
            return `
                <button 
                    data-action="open-mobile-menu"
                    aria-label="Ouvrir le menu supplémentaire"
                    class="flex flex-col items-center justify-center gap-1.5 py-3 w-1/4 transition active:scale-95 ${isMenuPageActive ? 'text-brand-600' : 'text-slate-400'}"
                >
                    <i data-lucide="${item.icon}" class="w-6 h-6 ${isMenuPageActive ? 'fill-brand-100' : ''}"></i>
                    <span class="text-[10px] font-bold">${item.label}</span>
                </button>
            `;
        }

        // Boutons normaux
        const normalizedItemId = item.id.startsWith('/') ? item.id.substring(1) : item.id;
        const isActive = normalizedView === normalizedItemId || normalizedView.startsWith(normalizedItemId + '/');

        return `
            <button 
                data-link="${item.id}" 
                aria-label="${item.label}"
                aria-current="${isActive ? 'page' : 'false'}"
                class="flex flex-col items-center justify-center gap-1.5 py-3 w-1/4 transition active:scale-95 ${isActive ? 'text-brand-600' : 'text-slate-400'}"
            >
                <i data-lucide="${item.icon}" class="w-6 h-6 ${isActive ? 'fill-brand-100' : ''}"></i>
                <span class="text-[10px] font-bold">${item.label}</span>
            </button>
        `;
    }).join('');

    return `
        <nav 
            id="mobile-nav" 
            class="md:hidden fixed bottom-0 left-0 right-0 w-full pb-safe pt-2 px-2 flex justify-around items-center z-50 border-t border-slate-200/50 bg-white/90 backdrop-blur-md"
            role="navigation"
            aria-label="Navigation mobile"
        >
            ${navHtml}
        </nav>
    `;
}

/**
 * Initialise les événements de la navigation mobile
 * À appeler APRÈS avoir injecté le HTML dans le DOM
 */
export function initMobileNav() {
    // Gestion du bouton Menu (Admin uniquement)
    const btnMenu = document.querySelector('[data-action="open-mobile-menu"]');
    if (btnMenu) {
        btnMenu.addEventListener('click', openMobileMenu);
    }
}

/**
 * Ouvre la modale du menu mobile (Admin)
 * RESTAURÉ depuis index_originel.html (lignes 742-794)
 * AMÉLIORATIONS :
 * - Utilise router.navigateTo() au lieu de setView()
 * - Utilise store.state.adminMode au lieu de state global
 * - Gestion d'erreur ajoutée
 * - Cleanup automatique au clic extérieur
 */
function openMobileMenu() {
    try {
        // Crée la modale
        const modal = document.createElement('div');
        modal.id = 'mobile-menu-modal';
        modal.className = 'fixed inset-0 bg-slate-900/40 z-[100] flex flex-col justify-end backdrop-blur-sm animate-fade-in md:hidden';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'mobile-menu-title');

        // Fermeture si on clique sur le fond flou
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeMobileMenu();
            }
        });

        modal.innerHTML = `
            <div class="bg-white rounded-t-[2rem] p-6 pb-safe shadow-2xl animate-slide-up">
                <!-- Handle de glissement -->
                <div class="flex justify-center mb-6">
                    <div class="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>
                
                <!-- Titre -->
                <h3 id="mobile-menu-title" class="text-lg font-extrabold text-slate-900 mb-6 px-2">
                    Menu Administrateur
                </h3>
                
                <!-- Grille de boutons -->
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <!-- Annuaire -->
                    <button 
                        data-menu-action="navigate"
                        data-menu-path="/admin_users"
                        aria-label="Accéder à l'annuaire"
                        class="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 active:scale-95 transition hover:bg-slate-100"
                    >
                        <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-600 shadow-sm mb-3">
                            <i data-lucide="users" class="w-6 h-6"></i>
                        </div>
                        <span class="font-bold text-slate-700 text-sm">Annuaire</span>
                    </button>

                    <!-- Pôles -->
                    <button 
                        data-menu-action="navigate"
                        data-menu-path="/poles"
                        aria-label="Accéder aux pôles"
                        class="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 active:scale-95 transition hover:bg-slate-100"
                    >
                        <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-purple-600 shadow-sm mb-3">
                            <i data-lucide="network" class="w-6 h-6"></i>
                        </div>
                        <span class="font-bold text-slate-700 text-sm">Pôles</span>
                    </button>

                    <!-- Profil -->
                    <button 
                        data-menu-action="navigate"
                        data-menu-path="/profile"
                        aria-label="Accéder à mon profil"
                        class="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 active:scale-95 transition hover:bg-slate-100"
                    >
                        <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-600 shadow-sm mb-3">
                            <i data-lucide="user" class="w-6 h-6"></i>
                        </div>
                        <span class="font-bold text-slate-700 text-sm">Mon Profil</span>
                    </button>

                    <!-- Toggle Admin Mode -->
                    <button 
                        data-menu-action="toggle-admin"
                        aria-label="Passer en vue bénévole"
                        class="flex flex-col items-center justify-center p-4 bg-slate-900 text-white rounded-2xl shadow-lg active:scale-95 transition hover:bg-slate-800"
                    >
                        <div class="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white mb-3">
                            <i data-lucide="arrow-left-right" class="w-6 h-6"></i>
                        </div>
                        <span class="font-bold text-xs">Vue Bénévole</span>
                    </button>
                </div>

                <!-- Bouton Fermer -->
                <button 
                    data-menu-action="close"
                    aria-label="Fermer le menu"
                    class="w-full py-4 bg-slate-100 font-bold text-slate-500 rounded-2xl hover:bg-slate-200 transition active:scale-95"
                >
                    Fermer
                </button>
            </div>
        `;

        // Ajoute au DOM
        document.body.appendChild(modal);

        // Rend les icônes Lucide
        createIcons({ icons, root: modal });

        // Attache les événements
        attachMenuEvents(modal);

    } catch (error) {
        console.error('❌ Erreur lors de l\'ouverture du menu mobile:', error);
    }
}

/**
 * Attache les événements aux boutons de la modale
 * @param {HTMLElement} modal - L'élément modal
 */
function attachMenuEvents(modal) {
    // Délégation d'événements sur tous les boutons
    modal.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-menu-action]');
        if (!btn) return;

        const action = btn.dataset.menuAction;

        try {
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

                case 'close':
                    closeMobileMenu();
                    break;

                default:
                    console.warn(`Action inconnue: ${action}`);
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'action du menu:', error);
            closeMobileMenu();
        }
    });
}

/**
 * Ferme la modale du menu mobile
 */
function closeMobileMenu() {
    const modal = document.getElementById('mobile-menu-modal');
    if (modal) {
        // Animation de sortie
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 200);
    }
}

/**
 * Gère le basculement entre mode admin et mode bénévole
 * RESTAURÉ depuis index_originel.html (lignes 795-807)
 * AMÉLIORATIONS :
 * - Utilise store.state.adminMode (DRY)
 * - Gestion d'erreur ajoutée
 * - Feedback visuel
 */
function handleAdminToggle() {
    try {
        // Inverse le mode admin dans le store
        store.state.adminMode = !store.state.adminMode;

        // Persiste le choix dans le localStorage
        localStorage.setItem('cop1_admin_mode', store.state.adminMode.toString());

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
 * Cleanup : Supprime les événements de la navigation mobile
 * Utile pour éviter les fuites mémoire si la nav est re-rendue
 */
export function cleanupMobileNav() {
    const btnMenu = document.querySelector('[data-action="open-mobile-menu"]');
    if (btnMenu) {
        btnMenu.removeEventListener('click', openMobileMenu);
    }

    // Ferme la modale si elle est ouverte
    closeMobileMenu();
}
