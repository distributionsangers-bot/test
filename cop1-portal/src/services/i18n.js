/**
 * ============================================
 * I18N SERVICE - Internationalization
 * ============================================
 * Gestion multilingue (FR/EN) avec :
 * - Détection automatique de la langue navigateur
 * - Persistance localStorage
 * - Système réactif (événements)
 * - Fonction t(key) pour les traductions
 * ============================================
 */

import fr from '../locales/fr.json';
import en from '../locales/en.json';

// Langues supportées
const SUPPORTED_LANGUAGES = ['fr', 'en'];
const DEFAULT_LANGUAGE = 'fr';
const STORAGE_KEY = 'cop1_language';

// Dictionnaires de traduction
const translations = { fr, en };

// Langue courante
let currentLanguage = DEFAULT_LANGUAGE;

/**
 * Détecte la langue du navigateur
 * @returns {string} Code langue (fr ou en)
 */
function detectBrowserLanguage() {
    const browserLang = navigator.language?.split('-')[0] || DEFAULT_LANGUAGE;
    return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : DEFAULT_LANGUAGE;
}

/**
 * Initialise le service i18n
 * - Restaure la langue depuis localStorage
 * - Ou détecte depuis le navigateur
 */
export function initI18n() {
    const savedLang = localStorage.getItem(STORAGE_KEY);

    if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
        currentLanguage = savedLang;
    } else {
        currentLanguage = detectBrowserLanguage();
        localStorage.setItem(STORAGE_KEY, currentLanguage);
    }

    // Met à jour l'attribut lang du HTML
    document.documentElement.lang = currentLanguage;

    console.log(`🌐 i18n: Langue initialisée à "${currentLanguage}"`);
}

/**
 * Récupère la langue courante
 * @returns {string} Code langue actuel
 */
export function getLanguage() {
    return currentLanguage;
}

/**
 * Change la langue de l'application
 * @param {string} lang - Code langue (fr ou en)
 */
export function setLanguage(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
        console.warn(`⚠️ i18n: Langue "${lang}" non supportée`);
        return;
    }

    if (lang === currentLanguage) return;

    currentLanguage = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;

    // Émet un événement pour notifier les composants
    window.dispatchEvent(new CustomEvent('language-changed', { detail: { language: lang } }));

    console.log(`🌐 i18n: Langue changée à "${lang}"`);
}

/**
 * Bascule entre les langues FR/EN
 */
export function toggleLanguage() {
    const newLang = currentLanguage === 'fr' ? 'en' : 'fr';
    setLanguage(newLang);
}

/**
 * Récupère une traduction par sa clé
 * @param {string} key - Clé de traduction (ex: 'nav.home')
 * @param {Object} params - Paramètres optionnels pour interpolation
 * @returns {string} Texte traduit
 */
export function t(key, params = {}) {
    const keys = key.split('.');
    let value = translations[currentLanguage];

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            // Fallback sur le français si la clé n'existe pas
            value = translations.fr;
            for (const fk of keys) {
                if (value && typeof value === 'object' && fk in value) {
                    value = value[fk];
                } else {
                    console.warn(`⚠️ i18n: Clé "${key}" non trouvée`);
                    return key; // Retourne la clé si pas trouvée
                }
            }
            break;
        }
    }

    // Interpolation des paramètres {{param}}
    if (typeof value === 'string' && Object.keys(params).length > 0) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
            return params[paramKey] !== undefined ? params[paramKey] : `{{${paramKey}}}`;
        });
    }

    return typeof value === 'string' ? value : key;
}

/**
 * Retourne les langues supportées
 * @returns {string[]} Liste des codes langues
 */
export function getSupportedLanguages() {
    return [...SUPPORTED_LANGUAGES];
}

// Export par défaut
export default {
    init: initI18n,
    t,
    getLanguage,
    setLanguage,
    toggleLanguage,
    getSupportedLanguages
};
