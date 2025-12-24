
import { createIcons } from 'lucide';

export function toggleLoader(show) {
    const el = document.getElementById('global-loader');
    if (!el) return;
    if (show) {
        el.classList.remove('hidden');
        el.style.display = 'flex';
        setTimeout(() => el.style.opacity = '1', 10);
    } else {
        el.style.opacity = '0';
        setTimeout(() => {
            el.style.display = 'none';
            el.classList.add('hidden');
        }, 300);
    }
}

export function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const styles = {
        success: { bg: 'bg-white', border: 'border-brand-500', text: 'text-slate-800', icon: 'check-circle-2', iconColor: 'text-brand-500' },
        error: { bg: 'bg-white', border: 'border-red-500', text: 'text-red-600', icon: 'alert-circle', iconColor: 'text-red-500' }
    };
    const s = styles[type] || styles.success;

    const el = document.createElement('div');
    el.className = `toast ${s.bg} ${s.text} border-l-4 ${s.border} p-4 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all duration-300 translate-y-[-20px] opacity-0 mb-3 min-w-[300px] pointer-events-auto bg-white`;
    el.innerHTML = `<i data-lucide="${s.icon}" class="w-6 h-6 ${s.iconColor}"></i><span class="font-bold text-sm">${msg}</span>`;

    container.appendChild(el);
    createIcons();

    requestAnimationFrame(() => {
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
    });

    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-20px)';
        setTimeout(() => el.remove(), 300);
    }, 4000);
}

export function escapeHtml(text) {
    if (!text) return text;
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
