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

const LOGO_URL = "logo.png";

/**
 * Renders the Premium Mobile Header
 */
export function renderHeader(profile) {
    const firstName = profile?.first_name || 'U';
    const initial = firstName[0].toUpperCase();

    return `
        <header class="md:hidden fixed top-0 left-0 right-0 w-full h-16 z-40 flex items-center justify-between px-4 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm" style="padding-top: env(safe-area-inset-top);">
            <!-- Logo + Brand -->
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
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
                    id="btn-toggle-lang" 
                    aria-label="Changer la langue" 
                    title="Français / English"
                    class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm transition-all active:scale-95"
                >
                    🌍
                </button>
                
                <!-- Profile Avatar -->
                <button 
                    data-link="/profile" 
                    aria-label="Mon profil" 
                    title="Mon Profil"
                    class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-brand-500/25 hover:shadow-xl hover:scale-105 transition-all active:scale-95"
                >
                    ${initial}
                </button>
            </div>
        </header>
    `;
}

/**
 * Initialise les événements du header
 */
export function initHeader() {
    const langBtn = document.getElementById('btn-toggle-lang');
    if (!langBtn) return;

    langBtn.addEventListener('click', toggleLanguage);
    initGoogleTranslate();
}

/**
 * Toggle language FR/EN
 */
function toggleLanguage() {
    try {
        const currentCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('googtrans='));

        const isEnglish = currentCookie && currentCookie.includes('/fr/en');
        const newLang = isEnglish ? '/fr/fr' : '/fr/en';
        const domain = window.location.hostname;

        document.cookie = `googtrans=${newLang}; domain=${domain}; path=/; max-age=31536000`;

        const btn = document.getElementById('btn-toggle-lang');
        if (btn) {
            btn.classList.add('animate-spin');
            btn.disabled = true;
        }

        window.location.reload();

    } catch (error) {
        console.error('Language toggle error:', error);
        window.location.reload();
    }
}

/**
 * Init Google Translate widget (hidden)
 */
function initGoogleTranslate() {
    if (window.googleTranslateInitialized) return;

    try {
        if (!document.getElementById('google_translate_element')) {
            const container = document.createElement('div');
            container.id = 'google_translate_element';
            container.style.display = 'none';
            document.body.appendChild(container);
        }

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
                console.error('Google Translate init error:', err);
            }
        };

        if (!document.querySelector('script[src*="translate.google.com"]')) {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.head.appendChild(script);
        } else if (window.googleTranslateElementInit) {
            window.googleTranslateElementInit();
        }

    } catch (error) {
        console.error('Google Translate critical error:', error);
    }
}

/**
 * Cleanup
 */
export function cleanupHeader() {
    const langBtn = document.getElementById('btn-toggle-lang');
    if (langBtn) {
        langBtn.removeEventListener('click', toggleLanguage);
    }
}
