
/**
 * ============================================
 * HEADER COMPONENT - Mobile Only
 * ============================================
 * Affiche le header mobile avec :
 * - Logo et branding
 * - Bouton de changement de langue (Google Translate)
 * - Avatar utilisateur cliquable (vers profil)
 * 
 * CORRECTIF CRITIQUE vs index_originel.html :
 * - Ajout de la logique toggleLanguage() manquante
 * - Gestion d'erreur robuste
 * - Accessibilité améliorée (aria-label)
 * - Initialisation Google Translate intégrée
 * ============================================
 */

const LOGO_URL = "logo.png";

/**
 * Renders the Mobile Header component.
 * @param {Object} profile - User profile object
 * @returns {string} HTML string
 */
export function renderHeader(profile) {
    const initial = profile?.first_name ? profile.first_name[0].toUpperCase() : '?';

    return `
        <header class="md:hidden glass-header absolute top-0 w-full h-16 z-40 flex items-center justify-between px-5 pt-safe border-b border-slate-200/50 bg-white/90 backdrop-blur-md">
            <div class="flex items-center gap-2">
                <img src="${LOGO_URL}" class="h-8 w-auto" alt="Logo COP1 Angers">
                <span class="font-extrabold text-xl text-brand-900">COP1</span>
            </div>
            <div class="flex items-center gap-3">
                <button 
                    id="btn-toggle-lang" 
                    aria-label="Changer la langue (FR/EN)" 
                    title="Basculer entre Français et Anglais"
                    class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs transition-all active:scale-95 shadow-sm"
                >
                    🌍
                </button>
                <button 
                    data-link="/profile" 
                    aria-label="Accéder à mon profil" 
                    title="Mon Profil"
                    class="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                    ${initial}
                </button>
            </div>
        </header>
    `;
}

/**
 * Initialise les événements du header (Google Translate)
 * IMPORTANT : À appeler après le rendu du header dans le DOM
 */
export function initHeader() {
    const langBtn = document.getElementById('btn-toggle-lang');

    if (!langBtn) {
        console.warn('⚠️ Header: Bouton langue introuvable. Initialisation ignorée.');
        return;
    }

    // Attache l'événement de changement de langue
    langBtn.addEventListener('click', toggleLanguage);

    // Initialise Google Translate si pas déjà fait
    initGoogleTranslate();
}

/**
 * Bascule entre Français et Anglais via Google Translate
 * RESTAURÉ depuis index_originel.html (lignes 25-30)
 * AMÉLIORATIONS :
 * - Gestion d'erreur ajoutée
 * - Feedback visuel pendant le changement
 * - Prévention des clics multiples
 */
function toggleLanguage() {
    try {
        // Lecture du cookie Google Translate actuel
        const currentCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('googtrans='));

        const isEnglish = currentCookie && currentCookie.includes('/fr/en');

        // Bascule : FR → EN ou EN → FR
        const newLang = isEnglish ? '/fr/fr' : '/fr/en';
        const domain = window.location.hostname;

        // Mise à jour du cookie
        document.cookie = `googtrans=${newLang}; domain=${domain}; path=/; max-age=31536000`; // 1 an

        // Feedback visuel (optionnel, mais améliore l'UX)
        const btn = document.getElementById('btn-toggle-lang');
        if (btn) {
            btn.classList.add('animate-spin');
            btn.disabled = true;
        }

        // Rechargement de la page pour appliquer la traduction
        window.location.reload();

    } catch (error) {
        console.error('❌ Erreur lors du changement de langue:', error);

        // Fallback : on recharge quand même (Google Translate se réinitialisera)
        window.location.reload();
    }
}

/**
 * Initialise le widget Google Translate (invisible)
 * RESTAURÉ depuis index_originel.html (lignes 22-33)
 * AMÉLIORATIONS :
 * - Chargement asynchrone sécurisé
 * - Vérification de disponibilité
 * - Prévention des duplicatas
 */
function initGoogleTranslate() {
    // Évite de charger plusieurs fois
    if (window.googleTranslateInitialized) return;

    try {
        // 1. Crée le conteneur caché pour le widget
        if (!document.getElementById('google_translate_element')) {
            const container = document.createElement('div');
            container.id = 'google_translate_element';
            container.style.display = 'none';
            document.body.appendChild(container);
        }

        // 2. Définit la fonction de callback pour Google Translate
        window.googleTranslateElementInit = function () {
            try {
                if (window.google && window.google.translate) {
                    new window.google.translate.TranslateElement({
                        pageLanguage: 'fr',
                        includedLanguages: 'en,fr',
                        autoDisplay: false,
                        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
                    }, 'google_translate_element');

                    window.googleTranslateInitialized = true;
                }
            } catch (err) {
                console.error('❌ Erreur initialisation Google Translate:', err);
            }
        };

        // 3. Charge le script Google Translate (si pas déjà chargé)
        if (!document.querySelector('script[src*="translate.google.com"]')) {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            script.onerror = () => {
                console.error('❌ Impossible de charger Google Translate. Vérifiez votre connexion.');
            };
            document.head.appendChild(script);
        } else {
            // Si le script existe déjà, on appelle directement l'init
            if (window.googleTranslateElementInit) {
                window.googleTranslateElementInit();
            }
        }

    } catch (error) {
        console.error('❌ Erreur critique lors de l\'initialisation de Google Translate:', error);
    }
}

/**
 * Cleanup : Supprime les événements du header
 * Utile pour éviter les fuites mémoire si le header est re-rendu
 */
export function cleanupHeader() {
    const langBtn = document.getElementById('btn-toggle-lang');
    if (langBtn) {
        langBtn.removeEventListener('click', toggleLanguage);
    }
}
