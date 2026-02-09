
import { createIcons, icons } from 'lucide';

// ============================================================
// 1. GESTION DU LOADER (Identique à l'original)
// ============================================================
export function toggleLoader(show) {
    const el = document.getElementById('global-loader');

    // SÉCURITÉ : Si l'élément n'existe pas, on arrête tout
    if (!el) {
        console.warn("⚠️ Attention : l'élément #global-loader est introuvable.");
        return;
    }

    if (show) {
        el.style.display = 'flex';
        // Petit délai pour l'animation
        setTimeout(() => { if (el) el.style.opacity = 1; }, 10);
    } else {
        el.style.opacity = 0;
        setTimeout(() => { if (el) el.style.display = 'none'; }, 500);
    }
}

// ============================================================
// 2. GESTION DES TOASTS
// ============================================================
export function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Configuration des styles selon le type
    const styles = {
        success: { bg: 'bg-white', border: 'border-brand-500', text: 'text-slate-800', icon: 'check-circle-2', iconColor: 'text-brand-500' },
        error: { bg: 'bg-white', border: 'border-red-500', text: 'text-red-600', icon: 'alert-circle', iconColor: 'text-red-500' },
        warning: { bg: 'bg-white', border: 'border-orange-400', text: 'text-orange-600', icon: 'alert-triangle', iconColor: 'text-orange-400' }
    };

    const s = styles[type] || styles.success;

    const el = document.createElement('div');
    el.className = `toast ${s.bg} ${s.text} border-l-4 ${s.border} p-4 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all duration-300 translate-y-[-20px] opacity-0 mb-3 min-w-[300px] pointer-events-auto`;

    el.innerHTML = `
        <i data-lucide="${s.icon}" class="w-6 h-6 ${s.iconColor} flex-shrink-0"></i>
        <span class="font-bold text-sm">${escapeHtml(msg)}</span>
    `;

    container.appendChild(el);
    createIcons({ icons });

    // Animation Entrée
    requestAnimationFrame(() => {
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
    });

    // Suppression Auto
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-20px)';
        setTimeout(() => el.remove(), 300);
    }, 4000);
}

// ============================================================
// 3. SÉCURITÉ XSS
// ============================================================
export function escapeHtml(text) {
    if (!text) return text;
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Convertit une date ISO (UTC) en format datetime-local (YYYY-MM-DDTHH:mm)
 * en tenant compte du fuseau horaire local
 */
export function toLocalInputDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
}

// ============================================================
// 3.1 FORMATAGE IDENTITÉ (Prénom Nom)
// ============================================================
export function formatIdentity(firstName, lastName) {
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();

    if (!f && !l) return 'Utilisateur';

    // Prénom : Première lettre Maj, reste minuscule
    const formattedFirst = f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();

    // Nom : Tout en majuscule
    const formattedLast = l.toUpperCase();

    return `${formattedFirst} ${formattedLast}`.trim();
}

// ============================================================
// 4. MODALES PERSONNALISÉES (Replacement alert/confirm/prompt)
// ============================================================

/**
 * Lance une modale de confirmation
 * @param {string} message - Message affiché
 * @param {function} onConfirm - Callback si confirmé
 * @param {object} options - Options (title, confirmText, cancelText, type: 'info'|'danger', onCancel)
 */
/**
 * Lance une modale de confirmation Premium
 * @param {string} message - Message affiché
 * @param {function} onConfirm - Callback si confirmé
 * @param {object} options - Options (title, confirmText, cancelText, type: 'info'|'danger', onCancel)
 */
export function showConfirm(message, onConfirm, options = {}) {
    const modalId = 'custom-confirm-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const {
        title = 'Confirmation',
        confirmText = 'Confirmer',
        cancelText = 'Annuler',
        type = 'info' // 'info' (bleu) ou 'danger' (rouge)
    } = options;

    const isDanger = type === 'danger';
    const iconName = isDanger ? 'alert-triangle' : 'help-circle';
    const headerGradient = isDanger
        ? 'from-red-600 to-red-700'
        : 'from-slate-900 to-slate-800';
    const confirmBtnClass = isDanger
        ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-red-500/30'
        : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-brand-500/30';

    const el = document.createElement('div');
    el.id = modalId;
    el.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in';

    el.innerHTML = `
        <div class="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in">
            <!-- Header -->
            <div class="bg-gradient-to-r ${headerGradient} p-5 relative">
                <div class="absolute inset-0 bg-grid-white/5 bg-[length:20px_20px] pointer-events-none"></div>
                <div class="relative z-10 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${isDanger ? 'bg-white/20' : 'bg-white/10'} flex items-center justify-center">
                        <i data-lucide="${iconName}" class="w-5 h-5 text-white"></i>
                    </div>
                    <h3 class="text-lg font-bold text-white">${title}</h3>
                </div>
            </div>
            
            <!-- Content -->
            <div class="p-5 bg-slate-50">
                <p class="text-slate-600 text-sm font-medium">${message}</p>
            </div>
            
            <!-- Footer -->
            <div class="flex gap-3 p-4 bg-white border-t border-slate-100">
                <button id="confirm-cancel-btn" class="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm transition">
                    ${cancelText}
                </button>
                <button id="confirm-ok-btn" class="flex-1 px-4 py-3 text-white ${confirmBtnClass} rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2">
                    <i data-lucide="${isDanger ? 'trash-2' : 'check'}" class="w-4 h-4"></i>
                    ${confirmText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(el);
    createIcons({ icons, root: el });

    const close = () => {
        el.remove();
        document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            close();
            if (options.onCancel) options.onCancel();
        }
    };
    document.addEventListener('keydown', handleEsc);

    document.getElementById('confirm-cancel-btn').onclick = () => {
        close();
        if (options.onCancel) options.onCancel();
    };

    document.getElementById('confirm-ok-btn').onclick = () => {
        close();
        if (onConfirm) onConfirm();
    };
}

/**
 * Lance une modale de saisie Premium
 * @param {string} message - Message/Question
 * @param {function} onConfirm - Callback avec la valeur saisie
 * @param {object} options - Options (title, confirmText, cancelText, placeholder, inputType, onCancel)
 */
export function showPrompt(message, onConfirm, options = {}) {
    const modalId = 'custom-prompt-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const {
        title = 'Saisie requise',
        confirmText = 'Valider',
        cancelText = 'Annuler',
        placeholder = '',
        defaultValue = '',
        inputType = 'text'
    } = options;

    const el = document.createElement('div');
    el.id = modalId;
    el.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in';

    el.innerHTML = `
        <div class="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in">
            <!-- Header -->
            <div class="bg-gradient-to-r from-slate-900 to-slate-800 p-5 relative">
                <div class="absolute inset-0 bg-grid-white/5 bg-[length:20px_20px] pointer-events-none"></div>
                <div class="relative z-10 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <i data-lucide="edit-3" class="w-5 h-5 text-white"></i>
                    </div>
                    <h3 class="text-lg font-bold text-white">${title}</h3>
                </div>
            </div>
            
            <!-- Content -->
            <div class="p-5 bg-slate-50 space-y-4">
                <p class="text-slate-600 text-sm font-medium">${message}</p>
                <input type="${inputType}" id="prompt-input" value="${escapeHtml(defaultValue)}" 
                    class="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none font-semibold text-slate-900 transition-all" 
                    placeholder="${placeholder}">
            </div>
            
            <!-- Footer -->
            <div class="flex gap-3 p-4 bg-white border-t border-slate-100">
                <button id="prompt-cancel-btn" class="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm transition">
                    ${cancelText}
                </button>
                <button id="prompt-ok-btn" class="flex-1 px-4 py-3 text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 rounded-xl font-bold text-sm shadow-lg shadow-brand-500/30 transition flex items-center justify-center gap-2">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    ${confirmText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(el);
    createIcons({ icons, root: el });

    // Focus input
    setTimeout(() => {
        const input = document.getElementById('prompt-input');
        if (input) input.focus();
    }, 50);

    const close = () => {
        el.remove();
        document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            close();
            if (options.onCancel) options.onCancel();
        }
    };
    document.addEventListener('keydown', handleEsc);

    document.getElementById('prompt-cancel-btn').onclick = () => {
        close();
        if (options.onCancel) options.onCancel();
    };

    const handleConfirm = () => {
        const val = document.getElementById('prompt-input').value;
        close();
        if (onConfirm) onConfirm(val);
    };

    document.getElementById('prompt-ok-btn').onclick = handleConfirm;
    document.getElementById('prompt-input').onkeypress = (e) => {
        if (e.key === 'Enter') handleConfirm();
    };
}
