
import { createIcons, icons } from 'lucide';
import { escapeHtml } from '../../services/utils.js';

export function renderRegistrationModal(event, shift, isRegistered) {
    const date = new Date(event.date);
    const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const shiftTime = `${(shift.start_time || '').slice(0, 5)} - ${(shift.end_time || '').slice(0, 5)}`;

    return `
        <div id="reg-modal-backdrop" class="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-in relative">
                
                <!-- Close Button -->
                <button id="btn-close-modal" class="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center transition backdrop-blur-sm">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>

                <!-- Header Image/Gradient -->
                <div class="h-32 bg-gradient-to-br from-emerald-500 to-teal-700 relative">
                    <div class="absolute inset-0 opacity-20" style="background-image: url('data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"1\" fill-rule=\"evenodd\"%3E%3Ccircle cx=\"3\" cy=\"3\" r=\"3\"/%3E%3Ccircle cx=\"13\" cy=\"13\" r=\"3\"/%3E%3C/g%3E%3C/svg%3E');"></div>
                    <div class="absolute -bottom-10 left-6 w-20 h-20 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center p-2 z-10 border-4 border-white">
                         <span class="text-2xl font-black text-slate-800 leading-none">${date.getDate()}</span>
                         <span class="text-xs font-bold text-slate-400 uppercase">${date.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                    </div>
                </div>

                <!-- Content -->
                <div class="pt-12 px-6 pb-6">
                    <h2 class="text-2xl font-black text-slate-900 leading-tight mb-1">${escapeHtml(event.title)}</h2>
                    
                    <!-- Shift Info -->
                    <div class="flex items-center gap-3 mb-4">
                        <div class="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                            <i data-lucide="clock" class="w-4 h-4"></i>
                            ${shiftTime}
                        </div>
                        ${shift.title ? `
                            <span class="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">${escapeHtml(shift.title)}</span>
                        ` : ''}
                        ${shift.referent_name ? `
                            <span class="text-xs text-slate-500 flex items-center gap-1">
                                <i data-lucide="user" class="w-3 h-3"></i>
                                ${escapeHtml(shift.referent_name)}
                            </span>
                        ` : ''}
                    </div>

                    <!-- Description Section (Requested by User) -->
                    <div class="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">À propos</h3>
                        <div class="text-sm text-slate-600 leading-relaxed space-y-2 max-h-32 overflow-y-auto">
                            ${event.description
            ? escapeHtml(event.description).replace(/\n/g, '<br>')
            : '<span class="italic text-slate-400">Aucune description disponible pour cet événement.</span>'
        }
                        </div>
                    </div>

                    <!-- Note Field (Only for Registration) -->
                    ${!isRegistered ? `
                        <div class="mb-6">
                            <label class="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                Ajouter une remarque <span class="text-slate-400 font-normal lowercase">(optionnel)</span>
                            </label>
                            <textarea id="reg-note" rows="2" class="w-full rounded-xl bg-slate-50 border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition placeholder:text-slate-400" placeholder="Ex: J'arriverai avec 10 min de retard..."></textarea>
                            <p class="text-[10px] text-slate-400 mt-1">Visible uniquement par les administrateurs.</p>
                        </div>
                    ` : `
                        <div class="mb-6 p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                            <p class="text-sm font-bold text-red-600">Vous êtes déjà inscrit.</p>
                            <p class="text-xs text-red-400">Voulez-vous annuler votre inscription ?</p>
                        </div>
                    `}

                    <!-- Actions -->
                    <div class="flex gap-3">
                         <button id="btn-cancel" class="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition border border-transparent hover:border-slate-200">
                            Fermer
                        </button>
                        <button id="btn-confirm-reg" class="flex-[2] py-3 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2
                            ${isRegistered ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}">
                            ${isRegistered ? '<i data-lucide="x-circle" class="w-5 h-5"></i> Me désister' : '<i data-lucide="check-circle" class="w-5 h-5"></i> Confirmer l\'inscription'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    `;
}
