
/**
 * Renders the Mobile Navigation (Bottom Bar).
 * @param {Object} profile - User profile.
 * @param {string} currentView - Current view ID.
 * @param {boolean} adminMode - Is admin mode active.
 * @returns {string} HTML string.
 */
export function renderMobileNav(profile, currentView, adminMode) {
    const isProfileAdmin = profile?.is_admin;
    const isEffectiveAdmin = isProfileAdmin && adminMode;

    let mobileItems = [];

    if (isEffectiveAdmin) {
        // ADMIN MOBILE
        mobileItems = [
            { id: 'dashboard', i: 'layout-grid', l: 'Accueil' },
            { id: 'admin_planning', i: 'calendar-days', l: 'Planning' },
            { id: 'messages', i: 'message-circle', l: 'Chat' },
            { id: 'MENU', i: 'menu', l: 'Menu' } // Special Menu Button
        ];
    } else {
        // VOLUNTEER MOBILE
        mobileItems = [
            { id: 'events', i: 'calendar-check', l: 'Missions' },
            { id: 'poles', i: 'network', l: 'Pôles' },
            { id: 'messages', i: 'message-circle', l: 'Chat' },
            { id: 'profile', i: 'user', l: 'Profil' }
        ];
    }

    const navHtml = mobileItems.map(i => {
        if (i.id === 'MENU') {
            const isMenuPageActive = ['admin_users', 'poles', 'profile'].includes(currentView);
            return `
            <button id="btn-mobile-menu" class="flex flex-col items-center justify-center gap-1.5 py-3 w-1/4 transition ${isMenuPageActive ? 'text-brand-600' : 'text-slate-400'}">
                <i data-lucide="menu" class="w-6 h-6 ${isMenuPageActive ? 'fill-brand-100' : ''}"></i>
                <span class="text-[10px] font-bold">Menu</span>
            </button>`;
        }

        const isActive = currentView === i.id;
        return `
        <button data-link="${i.id}" class="flex flex-col items-center justify-center gap-1.5 py-3 w-1/4 transition ${isActive ? 'text-brand-600' : 'text-slate-400'}">
            <i data-lucide="${i.i}" class="w-6 h-6 ${isActive ? 'fill-brand-100' : ''}"></i>
            <span class="text-[10px] font-bold">${i.l}</span>
        </button>`;
    }).join('');

    return `
        <nav id="mobile-nav" class="md:hidden glass fixed bottom-0 left-0 right-0 w-full pb-safe pt-2 px-2 flex justify-around items-center z-50 border-t border-slate-200/50 bg-white/90">
            ${navHtml}
        </nav>
    `;
}

export function initMobileNav() {
    const btnMenu = document.getElementById('btn-mobile-menu');
    if (btnMenu) {
        btnMenu.addEventListener('click', () => {
            // Logique simple pour l'instant : on redirige vers /profile ou on ouvre un vrai menu overlay
            // Pour ce MVP, "Menu" -> ouvre /profile qui contient les liens supplémentaires
            // Ou on pourrait toggle une modale. Restons simple : le bouton "Menu" sert de "More"
            // Le user voulait "accéder aux options supplémentaires".
            // Si on regarde renderMobileNav, si on est admin, on a 'MENU'.
            // Si on clique dessus, on va aller sur /dashboard ou /profile?
            // Le code original ne faisait rien.
            // On peut router vers /profile qui a souvent les settings.
            // Ou mieux trigger un event custom pour ouvrir une sidebar mobile.

            // Simulation d'ouverture de sidebar ou navigation vers profile
            window.location.hash = '#/profile';
        });
    }
}
