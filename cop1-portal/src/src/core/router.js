/**
 * ============================================
 * ROUTER - SPA Navigation System
 * ============================================
 * Gère la navigation côté client (SPA) avec :
 * - Routing basé sur les URL (History API)
 * - Support des routes dynamiques (/messages/:id)
 * - Gestion du bouton "Précédent" du navigateur
 * - Rendu conditionnel (Fullscreen vs Main-slot)
 * - Cleanup automatique des vues
 * - Scroll reset et rendu des icônes
 * 
 * PRINCIPE DRY APPLIQUÉ :
 * - Utilise createIcons de Lucide (déjà importé)
 * - Pas de duplication de logique
 * 
 * RESTAURÉ depuis index_originel.html (fonction setView)
 * AMÉLIORATIONS :
 * - Gestion d'erreur robuste
 * - Support des routes dynamiques
 * - Cleanup des vues
 * - Scroll management
 * - Loading states
 * ============================================
 */

import { createIcons, icons } from 'lucide';
import { toggleLoader } from '../services/utils.js';
import { store } from './store.js';

/**
 * Routes qui doivent s'afficher en plein écran (écrasent le layout)
 * RESTAURÉ depuis index_originel.html (pages sans sidebar/header)
 */
const FULLSCREEN_ROUTES = ['/login', '/register', '/pending', '/rejected'];

/**
 * Routes légales qui peuvent être affichées sans authentification
 */
const LEGAL_ROUTES = ['/legal/mentions', '/legal/privacy', '/legal/cgu'];

export class Router {
    constructor() {
        this.routes = [];
        this.currentView = null;
        this.currentCleanup = null;

        // Référence fixe à la racine de l'application
        this.appRoot = document.getElementById('app');
        this.root = this.appRoot;

        // Gestion du bouton "Précédent" du navigateur
        window.addEventListener('popstate', () => this.handleLocation());

        // Gestion des erreurs de navigation
        this.errorHandler = null;
    }

    /**
     * Enregistre une route avec support des paramètres dynamiques
     * @param {string} path - Le chemin de la route (ex: '/messages/:id')
     * @param {Object} module - Le module de la vue { render, init, cleanup }
     */
    addRoute(path, module) {
        const paramNames = [];

        // Transforme /profile/:id en regex, accepte un slash final optionnel
        const regexPath = path.replace(/:([^/]+)/g, (_, key) => {
            paramNames.push(key);
            return '([^/]+)';
        });

        const regex = new RegExp(`^${regexPath}[/]?$`);
        this.routes.push({ regex, module, paramNames, path });
    }

    /**
     * Navigue vers une nouvelle route
     * @param {string} path - Le chemin de destination
     * @param {Object} options - Options de navigation { replace, state }
     */
    navigateTo(path, options = {}) {
        try {
            // Normalise le chemin (ajoute '/' si manquant)
            const normalizedPath = path.startsWith('/') ? path : `/${path}`;

            // Met à jour l'URL dans le navigateur
            if (window.location.pathname !== normalizedPath) {
                if (options.replace) {
                    window.history.replaceState(options.state || {}, '', normalizedPath);
                } else {
                    window.history.pushState(options.state || {}, '', normalizedPath);
                }
            }

            // Déclenche le rendu de la nouvelle vue
            this.handleLocation();

        } catch (error) {
            console.error('❌ Erreur lors de la navigation:', error);
            this.handleNavigationError(error, path);
        }
    }

    /**
     * Gère la navigation en fonction de l'URL actuelle
     * RESTAURÉ depuis index_originel.html (fonction setView)
     * AMÉLIORATIONS :
     * - Support des routes dynamiques
     * - Cleanup automatique
     * - Gestion d'erreur
     * - Loading states
     * - Scroll management
     */
    async handleLocation() {
        const path = window.location.pathname;
        let match = null;
        let params = {};

        try {
            // 1. Trouver la route correspondante
            for (const route of this.routes) {
                const result = path.match(route.regex);
                if (result) {
                    match = route;
                    // Extrait les paramètres dynamiques (ex: :id)
                    route.paramNames.forEach((name, index) => {
                        params[name] = result[index + 1];
                    });
                    break;
                }
            }

            // Fallback: Si aucune route trouvée
            if (!match) {
                console.warn(`⚠️ Route inconnue: ${path}`);

                // Si on est sur une route légale, on laisse passer
                if (LEGAL_ROUTES.some(r => path.startsWith(r))) {
                    return;
                }

                // Sinon, redirection vers login
                this.navigateTo('/login', { replace: true });
                return;
            }

            // 2. Détermine où afficher la vue (Root vs Main-slot)
            const isFullScreen = FULLSCREEN_ROUTES.some(r => path.startsWith(r));

            if (isFullScreen) {
                // Pages plein écran (Login, Register, etc.)
                this.root = this.appRoot;
            } else {
                // Pages dans le layout (Dashboard, Events, etc.)
                const mainSlot = document.getElementById('main-slot');
                this.root = mainSlot || this.appRoot;
            }

            // 3. Cleanup de l'ancienne vue
            if (this.currentCleanup && typeof this.currentCleanup === 'function') {
                try {
                    await this.currentCleanup();
                } catch (cleanupError) {
                    console.warn('⚠️ Erreur lors du cleanup de la vue:', cleanupError);
                }
            }

            // Ou si le module a une fonction cleanup
            if (this.currentView && typeof this.currentView.cleanup === 'function') {
                try {
                    await this.currentView.cleanup();
                } catch (cleanupError) {
                    console.warn('⚠️ Erreur lors du cleanup du module:', cleanupError);
                }
            }

            // 4. Sauvegarde de la vue actuelle
            this.currentView = match.module;
            this.currentCleanup = null;

            // 5. Reset du contenu (évite les contenus fantômes)
            if (this.root) {
                this.root.innerHTML = '';
            }

            // 6. Affiche un loader si la vue prend du temps
            const loadingTimeout = setTimeout(() => {
                toggleLoader(true);
            }, 100); // Délai de 100ms avant d'afficher le loader

            // 7. Rendu de la nouvelle vue
            if (this.currentView.render) {
                const viewContent = await this.currentView.render(this.root, params);

                // Si la vue retourne une string HTML, on l'injecte
                if (typeof viewContent === 'string' && this.root) {
                    this.root.innerHTML = viewContent;
                }
            }

            // 8. Initialisation JS de la vue (event listeners, etc.)
            if (this.currentView.init) {
                const cleanup = await this.currentView.init(params);

                // Si init() retourne une fonction de cleanup, on la sauvegarde
                if (typeof cleanup === 'function') {
                    this.currentCleanup = cleanup;
                }
            }

            // 9. Arrête le loader
            clearTimeout(loadingTimeout);
            toggleLoader(false);

            // 10. Force le rendu des icônes Lucide
            // RESTAURÉ depuis index_originel.html (ligne 658)
            createIcons({ icons });

            // 11. Reset du scroll (UX)
            // RESTAURÉ depuis index_originel.html (ligne 640)
            if (this.root && this.root.scrollTop !== undefined) {
                this.root.scrollTop = 0;
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            // 12. Met à jour le store avec la vue actuelle
            const viewName = path.replace('/', '').split('/')[0] || 'login';
            store.state.view = viewName;

            // 13. Sauvegarde de la dernière vue (pour restauration après F5)
            // RESTAURÉ depuis index_originel.html (ligne 634)
            if (!isFullScreen) {
                localStorage.setItem('cop1_last_view', viewName);
            }

        } catch (error) {
            console.error('❌ Erreur critique lors du rendu de la vue:', error);
            toggleLoader(false);
            this.handleNavigationError(error, path);
        }
    }

    /**
     * Gère les erreurs de navigation
     * @param {Error} error - L'erreur survenue
     * @param {string} path - Le chemin qui a causé l'erreur
     */
    handleNavigationError(error, path) {
        // Si un handler personnalisé est défini, on l'utilise
        if (this.errorHandler && typeof this.errorHandler === 'function') {
            this.errorHandler(error, path);
            return;
        }

        // Sinon, affichage d'une page d'erreur par défaut
        if (this.root) {
            this.root.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                    <div class="bg-red-50 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <i data-lucide="alert-triangle" class="w-8 h-8"></i>
                    </div>
                    <h2 class="text-xl font-bold text-slate-900 mb-2">Une erreur est survenue</h2>
                    <p class="text-slate-500 mb-6 max-w-md">
                        L'application a rencontré un problème inattendu lors du chargement de cette page.
                    </p>
                    <div class="flex gap-3">
                        <button 
                            onclick="window.location.reload()" 
                            class="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg"
                        >
                            Rafraîchir
                        </button>
                        <button 
                            onclick="window.history.back()" 
                            class="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                        >
                            Retour
                        </button>
                    </div>
                    ${error.message ? `<p class="text-xs text-slate-400 mt-6 font-mono">${error.message}</p>` : ''}
                </div>
            `;
            createIcons({ icons });
        }
    }

    /**
     * Définit un handler personnalisé pour les erreurs de navigation
     * @param {Function} handler - La fonction à appeler en cas d'erreur
     */
    setErrorHandler(handler) {
        this.errorHandler = handler;
    }

    /**
     * Retourne la route actuelle
     * @returns {Object} { path, params }
     */
    getCurrentRoute() {
        const path = window.location.pathname;
        let match = null;
        let params = {};

        for (const route of this.routes) {
            const result = path.match(route.regex);
            if (result) {
                match = route;
                route.paramNames.forEach((name, index) => {
                    params[name] = result[index + 1];
                });
                break;
            }
        }

        return {
            path: match ? match.path : null,
            params,
            fullPath: path
        };
    }

    /**
     * Vérifie si une route existe
     * @param {string} path - Le chemin à vérifier
     * @returns {boolean}
     */
    hasRoute(path) {
        return this.routes.some(route => route.regex.test(path));
    }

    /**
     * Supprime toutes les routes (utile pour les tests)
     */
    clearRoutes() {
        this.routes = [];
        this.currentView = null;
        this.currentCleanup = null;
    }
}

// Export d'une instance singleton
export const router = new Router();
