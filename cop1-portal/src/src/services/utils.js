
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
        <span class="font-bold text-sm">${msg}</span>
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

// ============================================================
// 4. MODALES PERSONNALISÉES (Replacement alert/confirm/prompt)
// ============================================================

/**
 * Lance une modale de confirmation
 * @param {string} message - Message affiché
 * @param {function} onConfirm - Callback si confirmé
 * @param {object} options - Options (title, confirmText, cancelText, type: 'info'|'danger', onCancel)
 */
export function showConfirm(message, onConfirm, options = {}) {
    // S'assurer que le container de modale n'existe pas déjà
    const modalId = 'custom-confirm-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const {
        title = 'Confirmation',
        confirmText = 'Confirmer',
        cancelText = 'Annuler',
        type = 'info' // 'info' (bleu/brand) ou 'danger' (rouge)
    } = options;

    const el = document.createElement('div');
    el.id = modalId;
    el.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in';

    const confirmBtnClass = type === 'danger'
        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        : 'bg-brand-600 hover:bg-brand-700 focus:ring-brand-500';

    el.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 border border-slate-100">
            <h3 class="text-xl font-bold text-slate-800 mb-2">${title}</h3>
            <p class="text-slate-600 mb-6">${message}</p>
            <div class="flex justify-end gap-3">
                <button id="confirm-cancel-btn" class="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                    ${cancelText}
                </button>
                <button id="confirm-ok-btn" class="px-4 py-2 text-white ${confirmBtnClass} rounded-lg font-medium shadow-lg shadow-brand-500/20 transition-all hover:shadow-xl focus:ring-2 focus:ring-offset-2">
                    ${confirmText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(el);

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
 * Lance une modale de saisie textuelle
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
    el.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in';

    el.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 border border-slate-100">
            <h3 class="text-xl font-bold text-slate-800 mb-2">${title}</h3>
            <p class="text-slate-600 mb-4">${message}</p>
            <input type="${inputType}" id="prompt-input" value="${escapeHtml(defaultValue)}" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none mb-6 transition-all" placeholder="${placeholder}">
            <div class="flex justify-end gap-3">
                <button id="prompt-cancel-btn" class="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                    ${cancelText}
                </button>
                <button id="prompt-ok-btn" class="px-4 py-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg font-medium shadow-lg shadow-brand-500/20 transition-all hover:shadow-xl focus:ring-2 focus:ring-offset-2 focus:ring-brand-500">
                    ${confirmText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(el);

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
