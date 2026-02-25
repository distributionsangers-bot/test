/**
 * ============================================
 * HEADER COMPONENT - Premium Mobile Header
 * ============================================
 * Design moderne avec :
 * - Glassmorphism effect
 * - Premium user avatar
 * - Smooth interactions
 * ============================================
 */

import { APP_CONFIG } from '../../core/constants.js';

const { LOGO_URL } = APP_CONFIG;

/**
 * Renders the Premium Mobile Header
 */
export function renderHeader(profile) {
    const firstName = profile?.first_name || 'U';
    const initial = firstName[0].toUpperCase();

    return `
        <header class="md:hidden fixed top-0 left-0 right-0 w-full z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm" style="padding-top: env(safe-area-inset-top);">
            <!-- Navbar Content Container -->
            <div class="h-16 w-full flex items-center justify-between px-4">
                <!-- Logo + Brand -->
                <div class="flex items-center gap-2.5">
                    <div class="h-9 flex items-center justify-center">
                        <img src="${LOGO_URL}" class="h-7 w-auto object-contain" alt="Logo">
                    </div>
                    <div class="flex items-baseline gap-0.5">
                        <span class="font-extrabold text-lg text-slate-900">COP1</span>
                        <span class="font-bold text-lg text-brand-600">Angers</span>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-2">                
                    <!-- Profile Avatar -->
                    <button 
                        data-link="/profile" 
                        aria-label="Mon profil" 
                        title="Mon Profil"
                        class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-brand-500/25 hover:shadow-xl hover:scale-105 transition-all active:scale-95"
                    >
                        ${initial}
                    </button>
                </div>
            </div>
        </header>
    `;
}

/**
 * Initialise les événements du header
 */
export function initHeader() {
    // Plus d'événements spécifiques initialement (le routeur gère les liens)
}

/**
 * Cleanup
 */
export function cleanupHeader() {
    // Rien à nettoyer
}
