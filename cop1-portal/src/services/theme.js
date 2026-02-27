/**
 * ============================================
 * THEME SERVICE - Dark Mode Management
 * ============================================
 * Gère le thème de l'application avec :
 * - 3 modes : 'light', 'dark', 'system'
 * - Détection automatique du thème système
 * - Persistance dans localStorage
 * - Écoute en temps réel des changements système
 * - Transition douce entre les thèmes
 * ============================================
 */

const STORAGE_KEY = 'cop1_theme';
const DARK_CLASS = 'dark';

/** @type {'light'|'dark'|'system'} */
let currentMode = 'system';

/** @type {MediaQueryList|null} */
let systemMediaQuery = null;

/** @type {Set<Function>} */
const listeners = new Set();

/**
 * Initialise le thème au démarrage de l'application.
 * Lit la préférence depuis localStorage, applique le thème,
 * et écoute les changements du thème système.
 */
export function initTheme() {
    // Lire la préférence sauvegardée
    const saved = localStorage.getItem(STORAGE_KEY);
    currentMode = (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';

    // Appliquer le thème
    applyTheme();

    // Écouter les changements du thème système
    if (window.matchMedia) {
        systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        systemMediaQuery.addEventListener('change', handleSystemChange);
    }
}

/**
 * Change le thème de l'application.
 * @param {'light'|'dark'|'system'} mode - Le mode à appliquer
 */
export function setTheme(mode) {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'system') {
        console.warn(`⚠️ Theme: mode invalide "${mode}", ignoré.`);
        return;
    }

    currentMode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    applyTheme();

    // Notifier les listeners
    listeners.forEach(cb => {
        try { cb(mode); } catch (e) { console.error('❌ Theme listener error:', e); }
    });
}

/**
 * Retourne le mode actuel ('light', 'dark', ou 'system').
 * @returns {'light'|'dark'|'system'}
 */
export function getTheme() {
    return currentMode;
}

/**
 * Retourne le thème résolu ('light' ou 'dark').
 * Si le mode est 'system', retourne le thème du système.
 * @returns {'light'|'dark'}
 */
export function getResolvedTheme() {
    if (currentMode === 'system') {
        return getSystemTheme();
    }
    return currentMode;
}

/**
 * Souscrit aux changements de thème.
 * @param {Function} callback - Reçoit le nouveau mode
 * @returns {Function} Fonction de désinscription
 */
export function onThemeChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

/**
 * Nettoyage (pour les tests ou le démontage).
 */
export function cleanupTheme() {
    if (systemMediaQuery) {
        systemMediaQuery.removeEventListener('change', handleSystemChange);
        systemMediaQuery = null;
    }
    listeners.clear();
}

// ─── INTERNAL ──────────────────────────────────────────

/**
 * Détecte le thème du système via matchMedia.
 * @returns {'light'|'dark'}
 */
function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

/**
 * Applique la classe 'dark' sur <html> selon le mode résolu.
 */
function applyTheme() {
    const resolved = getResolvedTheme();
    const root = document.documentElement;

    if (resolved === 'dark') {
        root.classList.add(DARK_CLASS);
    } else {
        root.classList.remove(DARK_CLASS);
    }

    // Met à jour la meta theme-color pour la barre de statut mobile
    updateMetaThemeColor(resolved);
}

/**
 * Met à jour la meta tag theme-color pour correspondre au thème.
 * @param {'light'|'dark'} resolved
 */
function updateMetaThemeColor(resolved) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', resolved === 'dark' ? '#0f172a' : '#F8FAFC');
}

/**
 * Gestionnaire des changements du thème système.
 * N'applique que si le mode est 'system'.
 */
function handleSystemChange() {
    if (currentMode === 'system') {
        applyTheme();
        // Notifier les listeners que le thème résolu a changé
        listeners.forEach(cb => {
            try { cb('system'); } catch (e) { console.error('❌ Theme listener error:', e); }
        });
    }
}
