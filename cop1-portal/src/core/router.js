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
        window.history.pushState({}, '', path);
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

        if (!match) {
            console.warn(`No route found for path: ${path}. Redirecting to / or default.`);
            // Default to login or dashboard if no match, simplified for now:
            // logic usually handled by guards in main.js, but here we just return
            return;
        }

        // Render logic
        this.currentView = match.module;

        // Clean container
        if (this.root) this.root.innerHTML = '';

        // Init module if exists
        if (this.currentView.init) {
            await this.currentView.init();
        }

        // Render module
        if (this.currentView.render) {
            if (this.root) {
                // Pass params and the container
                const viewContent = await this.currentView.render(this.root, params);

                if (typeof viewContent === 'string') {
                    this.root.innerHTML = viewContent;
                }
            }
        }
    }

    /**
     * Helper to retrieve current Params if needed externally
     */
    getCurrentParams() {
        // Logic duplicated for simplicity, ideally cached
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
