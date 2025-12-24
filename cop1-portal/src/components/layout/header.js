
/**
 * Renders the Mobile Header component.
 * @param {Object} profile - User profile.
 * @returns {string} HTML string.
 */
export function renderHeader(profile) {
    const LOGO_URL = "logo.png";
    const initial = profile?.first_name ? profile.first_name[0] : '?';

    return `
        <header class="md:hidden glass absolute top-0 w-full h-16 z-40 flex items-center justify-between px-5 pt-safe border-b border-slate-200/50">
            <div class="flex items-center gap-2">
                <img src="${LOGO_URL}" class="h-8 w-auto" alt="Logo">
                <span class="font-extrabold text-xl text-brand-900">COP1</span>
            </div>
            <div class="flex items-center gap-3">
                <button id="btn-toggle-lang" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs">🌍</button>
                <button data-link="profile" class="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                    ${initial}
                </button>
            </div>
        </header>
    `;
}
