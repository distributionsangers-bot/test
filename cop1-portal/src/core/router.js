import { createIcons, icons } from 'lucide';

export class Router {
    constructor() {
        this.routes = [];
        this.currentView = null;
        // On garde une référence fixe à la racine de l'application
        this.appRoot = document.getElementById('app');
        this.root = this.appRoot;

        // Gestion du bouton "Précédent" du navigateur
        window.addEventListener('popstate', () => this.handleLocation());
    }

    /**
     * Enregistre une route avec un Regex plus souple
     */
    addRoute(path, module) {
        const paramNames = [];
        // Transforme /profile/:id en regex, et accepte un slash final optionnel [/]?
        const regexPath = path.replace(/:([^/]+)/g, (_, key) => {
            paramNames.push(key);
            return '([^/]+)';
        });

        const regex = new RegExp(`^${regexPath}[/]?$`);
        this.routes.push({ regex, module, paramNames, path });
    }

    navigateTo(path) {
        if (window.location.pathname !== path) {
            window.history.pushState({}, '', path);
        }
        this.handleLocation();
    }

    async handleLocation() {
        const path = window.location.pathname;
        let match = null;
        let params = {};

        // 1. Trouver la route correspondante
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

        // Fallback: Si aucune route, retour au login
        if (!match) {
            console.warn(`Route inconnue: ${path} -> Redirection Login`);
            this.navigateTo('/login');
            return;
        }

        // 2. Choisir le bon endroit où afficher la vue (Root vs MainSlot)
        // Les pages "Plein écran" (Login, Register...) écrasent tout
        const fullScreenRoutes = ['/login', '/register', '/pending', '/rejected'];
        const isFullScreen = fullScreenRoutes.some(r => path.startsWith(r));

        if (isFullScreen) {
            this.root = this.appRoot;
        } else {
            // Sinon on cherche le slot du dashboard, ou on se replie sur app
            const mainSlot = document.getElementById('main-slot');
            this.root = mainSlot || this.appRoot;
        }

        // 3. Nettoyage de l'ancienne vue
        if (this.currentView && typeof this.currentView.cleanup === 'function') {
            this.currentView.cleanup();
        }
        this.currentView = match.module;

        // Reset du contenu
        if (this.root) this.root.innerHTML = '';

        // 4. Rendu de la nouvelle vue
        if (this.currentView.render) {
            const viewContent = await this.currentView.render(this.root, params);
            if (typeof viewContent === 'string' && this.root) {
                this.root.innerHTML = viewContent;
            }
        }

        // 5. Initialisation JS (Listeners, etc.)
        if (this.currentView.init) {
            await this.currentView.init();
        }

        // 6. IMPORTANT : On force le rendu des icônes Lucide
        createIcons({ icons });

        // Reset du scroll
        if (this.root) this.root.scrollTop = 0;
    }
}

export const router = new Router();
