export class Router {
    constructor() {
        this.routes = [];
        this.currentView = null;
        this.root = document.getElementById('app');

        // Handle browser Back/Forward
        window.addEventListener('popstate', () => this.handleLocation());
    }

    /**
     * Registers a route
     * @param {string} path - URL path (e.g. '/dashboard' or '/profile/:id')
     * @param {Object} module - The module object containing { render, init }
     */
    addRoute(path, module) {
        // Convert path to Regex
        // /profile/:id -> /^\/profile\/([^/]+)$/
        const paramNames = [];
        const regexPath = path.replace(/:([^/]+)/g, (_, key) => {
            paramNames.push(key);
            return '([^/]+)';
        });

        const regex = new RegExp(`^${regexPath}$`);
        this.routes.push({ regex, module, paramNames, path });
    }

    /**
     * Navigates to a URL
     * @param {string} path 
     */
    navigateTo(path) {
        // Avoid pushing same state twice
        if (window.location.pathname !== path) {
            window.history.pushState({}, '', path);
        }
        this.handleLocation();
    }

    /**
     * Resolves the current URL and renders the matching module
     */
    async handleLocation() {
        const path = window.location.pathname;
        let match = null;
        let params = {};

        // Find matching route
        for (const route of this.routes) {
            const result = path.match(route.regex);

            if (result) {
                match = route;

                // Extract params
                route.paramNames.forEach((name, index) => {
                    params[name] = result[index + 1];
                });

                break;
            }
        }

        // --- FALLBACK LOGIC ---
        if (!match) {
            console.warn(`⚠️ Route not found: ${path} -> Redirecting to /login`);
            this.navigateTo('/login');
            return;
        }

        // Render logic
        this.currentView = match.module;

        // Clean container (Important to prevent memory leaks or duplicate listeners if manually managed)
        if (this.root) this.root.innerHTML = '';

        // 1. Render module
        if (this.currentView.render) {
            if (this.root) {
                // Pass params and the container
                // Some views return a string, others might manipulate DOM directly.
                const viewContent = await this.currentView.render(this.root, params);

                if (typeof viewContent === 'string') {
                    this.root.innerHTML = viewContent;
                }
            }
        }

        // 2. Init module if exists (Attach listeners, fetches, etc.)
        if (this.currentView.init) {
            await this.currentView.init();
        }
    }

    /**
     * Helper to retrieve current Params if needed externally
     */
    getCurrentParams() {
        const path = window.location.pathname;
        for (const route of this.routes) {
            const result = path.match(route.regex);
            if (result) {
                let params = {};
                route.paramNames.forEach((name, index) => params[name] = result[index + 1]);
                return params;
            }
        }
        return {};
    }
}

export const router = new Router();
