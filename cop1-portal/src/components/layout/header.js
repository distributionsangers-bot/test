/**
 * ============================================
 * HEADER COMPONENT - Premium Mobile Header
 * ============================================
 * Design moderne avec :
 * - Glassmorphism effect
 * - Premium user avatar
 * - Language selector toggle
 * - Smooth interactions
 * ============================================
 */

import { t, getLanguage, toggleLanguage } from '../../services/i18n.js';

const LOGO_URL = "logo.png";

/**
 * Renders the Premium Mobile Header
 */
export function renderHeader(profile) {
    const firstName = profile?.first_name || 'U';
    const initial = firstName[0].toUpperCase();
    const currentLang = getLanguage().toUpperCase();

    return `
        <header class="md:hidden fixed top-0 left-0 right-0 w-full z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm" style="padding-top: env(safe-area-inset-top);">
            <!-- Navbar Content Container -->
            <div class="h-16 w-full flex items-center justify-between px-4">
                <!-- Logo + Brand -->
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center">
                        <img src="${LOGO_URL}" class="h-5 w-auto" alt="Logo">
                    </div>
                    <div class="flex items-baseline gap-0.5">
                        <span class="font-extrabold text-lg text-slate-900">COP1</span>
                        <span class="font-bold text-lg text-brand-600">Angers</span>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-2">
                    <!-- Language Toggle -->
                    <button 
                        id="lang-toggle-mobile"
                        data-action="toggle-language"
                        aria-label="${t('language.select')}"
                        title="${t('language.select')}"
                        class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs transition-all active:scale-95"
                    >
                        ${currentLang}
                    </button>
                    
                    <!-- Profile Avatar -->
                    <button 
                        data-link="/profile" 
                        aria-label="${t('nav.profile')}" 
                        title="${t('nav.profile')}"
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
    const langToggle = document.getElementById('lang-toggle-mobile');
    if (langToggle) {
        langToggle.addEventListener('click', handleLanguageToggle);
    }
}

/**
 * Gère le changement de langue
 */
function handleLanguageToggle() {
    toggleLanguage();
    // Recharge la page pour appliquer les traductions
    window.location.reload();
}

/**
 * Cleanup
 */
export function cleanupHeader() {
    const langToggle = document.getElementById('lang-toggle-mobile');
    if (langToggle) {
        langToggle.removeEventListener('click', handleLanguageToggle);
    }
}
