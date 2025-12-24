import { ProfileService } from './profile.service.js';
import { store } from '../../core/store.js';
import { toggleLoader, showToast, escapeHtml } from '../../services/utils.js';
import { createIcons } from 'lucide';
import { router } from '../../core/router.js';
import { supabase } from '../../services/supabase.js';

export async function renderProfile(container, params) {
    if (!container) return;

    // 1. Determine Target User (Me vs Other)
    const currentUserId = store.state.user?.id;
    const targetUserId = params?.id || currentUserId;
    const isMe = (targetUserId === currentUserId);
    const isAdminView = !isMe;

    // 2. Loading State
    container.innerHTML = `
        <div class="animate-pulse max-w-lg mx-auto mt-10 space-y-4">
            <div class="h-32 bg-slate-200 rounded-3xl"></div>
            <div class="h-10 bg-slate-200 rounded-xl w-1/2 mx-auto"></div>
            <div class="h-64 bg-slate-100 rounded-3xl"></div>
        </div>
    `;

    // 3. Fetch Data
    const { profile, history, error } = await ProfileService.getProfileAndHistory(targetUserId);

    if (error || !profile) {
        container.innerHTML = `<div class="text-center text-red-500 py-20 font-bold">Impossible de charger le profil.</div>`;
        return;
    }

    // 4. Prepare Data for Render
    const fullName = escapeHtml(`${profile.first_name || ''} ${profile.last_name || ''}`);
    const email = escapeHtml(profile.email || '');
    const initial = (profile.first_name || '?')[0].toUpperCase();
    const isMandatory = profile.mandatory_hours;
    const hours = profile.total_hours || 0;
    const hasPermit = profile.has_permit;
    const roleBadge = profile.is_admin
        ? `<div class="absolute bottom-0 right-0 bg-yellow-400 text-yellow-900 p-1.5 rounded-full border-4 border-white shadow-sm"><i data-lucide="shield" class="w-4 h-4"></i></div>`
        : '';

    // Status Badge
    let statusBadge = '';
    if (profile.status === 'pending') statusBadge = '<span class="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-sm font-bold">En attente</span>';
    else if (profile.status === 'approved') statusBadge = '<span class="px-2 py-1 rounded bg-green-100 text-green-800 text-sm font-bold">Validé</span>';
    else statusBadge = '<span class="px-2 py-1 rounded bg-red-100 text-red-800 text-sm font-bold">Refusé</span>';

    // 5. Build HTML
    container.innerHTML = `
        <div class="animate-slide-up max-w-lg mx-auto pb-24 space-y-5">
            
            <!-- HEADER CARD -->
            <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 text-center relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-brand-50 to-white"></div>
                
                <div class="relative z-10">
                    <div class="relative w-24 h-24 mx-auto mb-3">
                        <div class="w-full h-full bg-white text-brand-600 rounded-full flex items-center justify-center text-3xl font-extrabold shadow-lg border-4 border-white">
                            ${initial}
                        </div>
                        ${roleBadge}
                    </div>

                    <h2 class="text-xl font-extrabold text-slate-900">${fullName}</h2>
                    <p class="text-slate-400 font-medium text-sm mb-5">${email}</p>

                    <div class="flex justify-center gap-3 flex-wrap">
                        <div class="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Statut</div>
                            ${statusBadge}
                        </div>
                        <div class="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Permis</div>
                            <div class="font-bold ${hasPermit ? 'text-green-600' : 'text-slate-400'} text-sm">${hasPermit ? 'Oui' : 'Non'}</div>
                        </div>
                        <div class="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                             <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Type</div>
                             <div class="font-bold text-brand-600 text-sm">${isMandatory ? 'Scolaire' : 'Bénévole'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- HOURS CARD (Only if Mandatory or for info) -->
            <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden flex items-center justify-between">
                <div class="relative z-10">
                    <p class="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Compteur Heures</p>
                    <p class="text-5xl font-extrabold tracking-tighter">${hours}<span class="text-2xl opacity-60 ml-1">h</span></p>
                </div>
                <i data-lucide="award" class="w-24 h-24 text-white opacity-20 absolute -right-4 -bottom-4 rotate-12"></i>
            </div>

            <!-- TABS & CONTENT -->
            <div class="mt-6">
                <div class="flex p-1 bg-slate-100 rounded-xl mb-4">
                    <button id="tab-history" class="flex-1 py-2 rounded-lg text-sm font-bold bg-white text-slate-900 shadow-sm transition">Historique</button>
                    ${isMe ? `<button id="tab-edit" class="flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 transition">Modifier</button>` : ''}
                    <button id="tab-qr" class="flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 transition">QR Code</button>
                </div>

                <!-- TAB: HISTORY -->
                <div id="content-history" class="space-y-3">
                    ${renderHistoryList(history)}
                </div>

                <!-- TAB: EDIT (Only Me) -->
                ${isMe ? `
                <div id="content-edit" class="hidden bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 class="font-bold text-lg mb-4">Mes Informations</h3>
                    <form id="form-profile-update" class="space-y-4">
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase ml-1">Téléphone</label>
                            <input name="phone" value="${profile.phone || ''}" type="tel" class="w-full p-3 bg-slate-50 rounded-xl font-bold border outline-none focus:ring-2 focus:ring-brand-500" placeholder="06...">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase ml-1">Nouveau Mot de passe (optionnel)</label>
                            <input name="password" type="password" class="w-full p-3 bg-slate-50 rounded-xl font-bold border outline-none focus:ring-2 focus:ring-brand-500" placeholder="********">
                        </div>
                        <button type="submit" class="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition">Enregistrer</button>
                    </form>
                    
                    <div class="pt-6 mt-6 border-t border-slate-100">
                        <button id="btn-delete-account" class="w-full py-3 border border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50 transition text-xs flex items-center justify-center gap-2">
                             <i data-lucide="trash-2" class="w-4 h-4"></i> Supprimer mon compte
                        </button>
                    </div>
                </div>` : ''}

                <!-- TAB: QR CODE -->
                <div id="content-qr" class="hidden flex flex-col items-center justify-center py-10 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                    <p class="text-sm font-bold text-slate-500 mb-4">Votre Code Bénévole</p>
                    <div id="my-qrcode" class="p-4 bg-white rounded-xl shadow-inner border border-slate-100 mb-4">
                        <!-- QR Code Placeholder -->
                        <div class="w-40 h-40 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs text-center p-2">
                            QR Code généré ici automatiquement
                        </div>
                    </div>
                    <p class="text-xs text-slate-400 max-w-xs text-center">Présentez ce code aux responsables pour valider vos missions.</p>
                </div>

            </div>
        </div>
    `;

    createIcons({ root: container });

    // 6. Logic (Tabs, Forms)
    setupTabs(container);

    if (isMe) {
        setupEditForm(container, profile.id);
        setupDelete(container, profile.id);

        // Generate QR code if lib available
        if (root.QRCode && document.getElementById('my-qrcode')) { // Check global var or import
            // Placeholder: functionality usually requires external lib logic linked in html
            // For now we leave the div logic as placeholder unless we import library
        }
    }
}

function renderHistoryList(history) {
    if (!history || history.length === 0) {
        return `<div class="text-center py-10 text-slate-400 font-medium bg-white rounded-2xl border border-slate-100">Aucune mission pour le moment.</div>`;
    }

    return history.map(item => {
        const shift = item.shifts;
        const event = shift?.events;
        if (!shift || !event) return ''; // Ship corrupted data

        const date = new Date(event.date);
        const isPast = new Date() > new Date(`${event.date}T${shift.end_time}`); // rough check
        const isPresent = item.status === 'present'; // Assuming column or logic
        const isAbsent = item.status === 'absent';

        // Status Colors
        let statusColor = 'border-slate-100 bg-white';
        let icon = 'calendar';
        let iconColor = 'text-slate-400';

        if (isPresent) {
            statusColor = 'border-green-200 bg-green-50';
            icon = 'check-circle-2';
            iconColor = 'text-green-600';
        } else if (isAbsent) {
            statusColor = 'border-red-200 bg-red-50';
            icon = 'x-circle';
            iconColor = 'text-red-500';
        } else if (!isPast) {
            statusColor = 'border-blue-100 bg-blue-50/50';
            icon = 'clock';
            iconColor = 'text-blue-500';
        } else {
            // Past but no status yet (Pending validation)
            statusColor = 'border-orange-200 bg-orange-50';
            icon = 'help-circle';
            iconColor = 'text-orange-500';
        }

        return `
            <div class="flex items-center gap-4 p-4 rounded-2xl border ${statusColor} shadow-sm animate-fade-in">
                <div class="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex-shrink-0">
                    <i data-lucide="${icon}" class="w-6 h-6 ${iconColor}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-900 text-sm truncate">${escapeHtml(event.title)}</h4>
                    <div class="text-xs text-slate-500 truncate">${shift.title} • ${date.toLocaleDateString()}</div>
                </div>
                ${item.hours_added ? `<div class="text-xs font-bold text-green-600 bg-white px-2 py-1 rounded-lg border border-green-100 shadow-sm">+${item.hours_added}h</div>` : ''}
            </div>
        `;
    }).join('');
}

function setupTabs(c) {
    const tabs = ['history', 'edit', 'qr']; // 'edit' might not exist if !isMe

    tabs.forEach(t => {
        const btn = c.querySelector(`#tab-${t}`);
        if (!btn) return;

        btn.addEventListener('click', () => {
            // Reset all
            tabs.forEach(x => {
                const b = c.querySelector(`#tab-${x}`);
                const content = c.querySelector(`#content-${x}`);
                if (b) b.className = "flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 transition";
                if (content) content.classList.add('hidden');
            });
            // Activer current
            btn.className = "flex-1 py-2 rounded-lg text-sm font-bold bg-white text-slate-900 shadow-sm transition";
            c.querySelector(`#content-${t}`).classList.remove('hidden');
        });
    });
}

function setupEditForm(c, uid) {
    const form = c.querySelector('#form-profile-update');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = {
            phone: fd.get('phone'),
            password: fd.get('password')
        };

        toggleLoader(true);
        const res = await ProfileService.updateProfile(uid, data);
        toggleLoader(false);

        if (res.error) showToast("Erreur mise à jour", "error");
        else {
            showToast("Infos mises à jour avec succès");
            if (data.password) form.querySelector('[name=password]').value = '';
        }
    });
}

function setupDelete(c, uid) {
    const btn = c.querySelector('#btn-delete-account');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (!confirm("ATTENTION : Cette action est irréversible. Voulez-vous vraiment supprimer votre compte ?")) return;

        const email = prompt("Pour confirmer, tapez 'SUPPRIMER' en majuscules :");
        if (email !== 'SUPPRIMER') return;

        toggleLoader(true);
        const res = await ProfileService.deleteAccount(uid);

        if (res.error) {
            toggleLoader(false);
            showToast("Erreur suppression: " + res.error.message, "error");
        } else {
            // Logout and reload
            await supabase.auth.signOut();
            window.location.reload();
        }
    });
}

export function initProfile() {}
