
import { supabase } from '../../services/supabase.js';
import { toggleLoader, showToast } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { store } from '../../core/store.js';

export function renderDashboard() {
    return `<div id="dashboard-view" class="h-full w-full"></div>`;
}

export async function initDashboard() {
    const container = document.getElementById('dashboard-view');
    if (!container) return;

    toggleLoader(true);

    try {
        const { profile, adminMode } = store.state;

        if (profile?.is_admin && adminMode) {
            await renderAdminDashboard(container);
            await attachAdminListeners(container);
        } else {
            await renderUserDashboard(container);
        }
    } catch (err) {
        console.error("Init Dashboard Error:", err);
        showToast("Erreur chargement dashboard", "error");
    } finally {
        toggleLoader(false);
        createIcons({ icons });
    }
}

// ============================================================
// ADMIN DASHBOARD (Logique importée de index_originel.html)
// ============================================================
// 3. Cleanup
export function cleanup() {
    // Si on avait des listeners globaux ou des intervals, on les nettoie ici
    const container = document.getElementById('dashboard-view');
    if (container) {
        // Remove event listeners if they were named functions
    }
}

// ============================================================
// ADMIN DASHBOARD (Logique importée de index_originel.html)
// ============================================================
async function renderAdminDashboard(container) {
    // 1. Stats générales (Optimisation COUNT)

    // a) Total Heures (Somme) - Pas de fonction SUM facile, on doit fetcher id, total_hours
    // On limite aux colonnes nécessaires
    const { data: profilesData, error: statsError } = await supabase
        .from('profiles')
        .select('total_hours');

    if (statsError) throw statsError;

    const totalHours = profilesData.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);

    // b) Counts (Optimisation count: 'exact') pour éviter le transport de data
    const { count: pendingCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

    const { count: volunteersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved');

    // Config graphique cercle (SVG)
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(100, (pendingCount / 20) * 100);
    const offset = circumference - (progress / 100) * circumference;

    // 2. Logique "Urgences" (J+7)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*, shifts(*, registrations(count))')
        .gte('date', today.toISOString())
        .lte('date', nextWeek.toISOString())
        .order('date');

    if (eventsError) throw eventsError;

    let urgentHtml = '';
    let urgentCount = 0;

    if (events) {
        events.forEach(e => {
            if (e.shifts) {
                e.shifts.forEach(s => {
                    // Sécurité sur le tableau registrations
                    const taken = (s.registrations && s.registrations.length > 0) ? s.registrations[0].count : 0;
                    const remaining = s.max_slots - taken;

                    // Si il reste des places, c'est une urgence
                    if (remaining > 0) {
                        urgentCount++;
                        const dateStr = new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                        urgentHtml += `
                            <div class="flex justify-between items-center p-3 bg-red-50 rounded-2xl border border-red-100 mb-2">
                                <div>
                                    <div class="font-bold text-slate-800 text-sm">${e.title}</div>
                                    <div class="text-xs text-red-500 font-bold flex items-center gap-1">
                                        <i data-lucide="alert-circle" class="w-3 h-3"></i> Manque ${remaining} pers. • ${dateStr}
                                    </div>
                                    <div class="text-xs text-slate-500 mt-0.5">${s.title} (${(s.start_time || '').slice(0, 5)})</div>
                                </div>
                                <button data-link="/admin_planning" class="px-3 py-2 bg-white text-red-600 text-xs font-bold border border-red-200 rounded-xl shadow-sm hover:bg-red-100 transition">
                                    Gérer
                                </button>
                            </div>
                        `;
                    }
                });
            }
        });
    }

    if (urgentCount === 0) {
        urgentHtml = '<div class="p-4 text-center text-slate-400 text-sm bg-green-50 rounded-2xl border border-green-100"><i data-lucide="check-circle" class="w-5 h-5 mx-auto mb-1 text-green-500"></i>Aucune urgence planning !</div>';
    }


    // --- MODALE ANNONCE (Embedded) ---
    const announcementModal = `
        <div id="announcement-modal" class="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in hidden">
            <div class="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up border-t-4 border-purple-500">
                <h3 class="font-extrabold text-lg mb-4 text-purple-900">📢 Faire une annonce</h3>
                <p class="text-xs text-slate-500 mb-4">Ce message sera visible par TOUS les bénévoles.</p>
                <form id="form-create-announcement" class="space-y-4">
                    <div>
                        <label class="text-xs font-bold text-slate-400 uppercase ml-1">Titre</label>
                        <input name="subject" required class="w-full p-3 bg-purple-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-400 uppercase ml-1">Message</label>
                        <textarea name="content" rows="4" required class="w-full p-3 bg-purple-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                    </div>
                    <button type="submit" class="w-full py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700">Publier l'annonce</button>
                    <button type="button" id="btn-close-announcement" class="w-full py-3 text-slate-400 font-bold text-sm hover:bg-slate-50 rounded-xl">Annuler</button>
                </form>
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="animate-fade-in max-w-lg mx-auto pb-20">
            <h2 class="text-2xl font-extrabold text-slate-900 mb-6 flex justify-between items-center">
                Tableau de bord
                <button id="btn-open-announcement" class="p-2 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition" title="Faire une annonce">
                    <i data-lucide="megaphone" class="w-5 h-5"></i>
                </button>
            </h2>
            
            <div class="grid grid-cols-2 gap-4 mb-6">
                <!-- Card Bénévoles -->
                <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div class="relative z-10">
                        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bénévoles</div>
                        <div class="text-4xl font-extrabold text-slate-900">${volunteersCount}</div>
                    </div>
                    <div class="absolute -right-4 -bottom-4 bg-brand-50 w-24 h-24 rounded-full group-hover:scale-125 transition duration-500"></div>
                </div>

                <!-- Card Heures -->
                <div class="bg-brand-600 p-5 rounded-3xl shadow-lg shadow-brand-200 text-white relative overflow-hidden">
                    <div class="relative z-10">
                        <div class="text-xs font-bold text-brand-200 uppercase tracking-wider mb-1">Heures</div>
                        <div class="text-4xl font-extrabold">${Math.round(totalHours)}h</div>
                    </div>
                    <i data-lucide="clock" class="absolute -right-2 -bottom-2 w-20 h-20 text-white opacity-20 rotate-12"></i>
                </div>
            </div>

            <!-- Validations Pending -->
            <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between mb-6">
                <div>
                    <h3 class="font-bold text-lg text-slate-900 mb-1">Validations</h3>
                    <p class="text-slate-500 text-sm">Inscriptions à traiter.</p>
                    <button data-link="/admin_users" class="mt-4 px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition">Gérer</button>
                </div>
                <div class="relative w-24 h-24 flex items-center justify-center">
                    <svg class="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="${radius}" stroke="#f1f5f9" stroke-width="8" fill="transparent"/>
                        <circle cx="48" cy="48" r="${radius}" stroke="#3b82f6" stroke-width="8" fill="transparent" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
                    </svg>
                    <span class="absolute text-xl font-bold text-slate-900">${pendingCount}</span>
                </div>
            </div>

            <!-- Urgences -->
            <div class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-6">
                <h3 class="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <i data-lucide="siren" class="w-5 h-5 text-red-500"></i> Urgences (7 jours)
                </h3>
                <div class="space-y-2">
                    ${urgentHtml}
                </div>
            </div>

            <!-- Bouton Création -->
            <button id="btn-create-event-dash" class="w-full py-4 rounded-3xl border-2 border-dashed border-slate-300 text-slate-400 font-bold hover:border-brand-500 hover:text-brand-500 transition flex items-center justify-center gap-2">
                <i data-lucide="plus-circle" class="w-5 h-5"></i> Créer événement
            </button>
        </div>
        ${announcementModal}
    `;
}

// ============================================================
// USER DASHBOARD (Optionnel pour Bénévole si activé)
// ============================================================
async function renderUserDashboard(container) {
    const user = store.state.user;
    const profile = store.state.profile;

    // Calcul stats perso (Heures)
    const totalHours = profile.total_hours || 0;

    // Prochaine Mission
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Optimisation : On récupère les inscriptions futures uniquement
    const { data: myRegs, error } = await supabase
        .from('registrations')
        .select(`
            shift_id, 
            shifts!inner (
                title, 
                start_time, 
                end_time,
                events!inner (
                    title, 
                    date,
                    location
                )
            )
        `)
        .eq('user_id', user.id)
        .gte('shifts.events.date', todayISO);

    let nextMission = null;

    if (myRegs && myRegs.length > 0) {
        const candidates = myRegs
            .map(r => ({ ...r.shifts, event: r.shifts.events }))
            .filter(s => new Date(s.event.date) >= today)
            .sort((a, b) => new Date(a.event.date) - new Date(b.event.date));

        if (candidates.length > 0) nextMission = candidates[0];
    }

    // Rendu
    let missionHtml = renderNextMissionCard(nextMission);
    let statusBadge = getStatusBadge(profile.status);

    container.innerHTML = `
        <div class="animate-slide-up max-w-lg mx-auto pb-20 pt-2">
            
            <div class="flex items-center justify-between mb-8 px-2">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900">Bonjour, ${profile.first_name || 'Bénévole'} 👋</h1>
                    <div class="mt-1">${statusBadge}</div>
                </div>
                <button data-link="/profile" aria-label="Mon Profil" class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-white transition">
                    <i data-lucide="user" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Hours Counter -->
            <div class="bg-gradient-to-br from-brand-600 to-blue-700 rounded-[2rem] p-6 text-white shadow-xl shadow-brand-200 relative overflow-hidden mb-6">
                <div class="relative z-10">
                    <p class="text-brand-100 text-xs font-bold uppercase tracking-wider mb-1">Mon Impact</p>
                    <div class="flex items-baseline gap-1">
                        <span class="text-5xl font-extrabold tracking-tighter">${totalHours}</span>
                        <span class="text-xl font-medium opacity-80">heures</span>
                    </div>
                    <p class="text-xs text-brand-100 mt-2 opacity-80">de bénévolat réalisées 🎉</p>
                </div>
                <i data-lucide="award" class="absolute -right-6 -bottom-6 w-32 h-32 text-white opacity-10 rotate-12"></i>
            </div>

            <h2 class="text-lg font-bold text-slate-900 mb-4 px-2">Prochaine Mission</h2>
            ${missionHtml}

            <div class="grid grid-cols-2 gap-4">
                 <button id="btn-open-scanner-dashboard" class="col-span-2 bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-2xl shadow-lg shadow-slate-200 text-white flex items-center justify-between group overflow-hidden relative">
                    <div class="relative z-10 flex items-center gap-3">
                        <div class="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition">
                             <i data-lucide="qr-code" class="w-5 h-5 text-white"></i>
                        </div>
                        <div class="text-left">
                            <div class="font-bold text-sm">Scanner un QR Code</div>
                            <div class="text-[10px] text-slate-300">Valider ma présence</div>
                        </div>
                    </div>
                    <i data-lucide="scan-line" class="w-24 h-24 absolute -right-6 -bottom-6 text-white opacity-5 rotate-12 transition group-hover:opacity-10"></i>
                </button>
                 <button data-link="/events" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition text-left group">
                    <div class="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition">
                        <i data-lucide="calendar-check" class="w-5 h-5"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm">Missions</div>
                    <div class="text-[10px] text-slate-400">S'inscrire</div>
                 </button>
                 
                 <button data-link="/poles" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition text-left group">
                    <div class="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition">
                        <i data-lucide="network" class="w-5 h-5"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm">Pôles</div>
                    <div class="text-[10px] text-slate-400">Les équipes</div>
                 </button>
            </div>
        </div>
    `;

    // Listeners for User Dashboard
    const scanBtn = container.querySelector('#btn-open-scanner-dashboard');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            import('../scanner/scanner.view.js').then(({ ScannerView }) => {
                ScannerView.openScanner();
            });
        });
    }
}

// Admin Dashboard Listeners Helper (called by initDashboard)
async function attachAdminListeners(container) {
    // 1. Create Event
    const createBtn = container.querySelector('#btn-create-event-dash');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            // Dynamic import to avoid circular dependencies/loading unused code
            import('../admin/planning-form.view.js').then(({ openEventModal }) => {
                openEventModal();
            });
        });
    }

    // 2. Announcement Modal Logic
    const openAnnounceBtn = container.querySelector('#btn-open-announcement');
    const announceModal = container.querySelector('#announcement-modal');

    if (openAnnounceBtn && announceModal) {
        // Open
        openAnnounceBtn.addEventListener('click', () => announceModal.classList.remove('hidden'));

        // Close
        const closeBtn = announceModal.querySelector('#btn-close-announcement');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => announceModal.classList.add('hidden'));
        }

        // Submit
        const form = announceModal.querySelector('form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const subject = fd.get('subject');
                const content = fd.get('content');

                toggleLoader(true);
                // On doit importer le ChatService dynamiquement pour éviter les dépendances circulaires
                const { ChatService } = await import('../chat/chat.service.js');

                const res = await ChatService.createAnnouncement(subject, content);
                toggleLoader(false);

                if (res.success) {
                    showToast('Annonce publiée !');
                    announceModal.classList.add('hidden');
                    form.reset();
                } else {
                    showToast(res.error.message || "Erreur publication", "error");
                }
            });
        }
    }
}

function getStatusBadge(status) {
    if (status === 'pending') return '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-100 text-yellow-800 text-xs font-bold"><i data-lucide="clock" class="w-3 h-3"></i> En attente</span>';
    if (status === 'approved') return '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-bold"><i data-lucide="check-circle-2" class="w-3 h-3"></i> Compte Validé</span>';
    return '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-800 text-xs font-bold"><i data-lucide="x-circle" class="w-3 h-3"></i> Refusé</span>';
}

function renderNextMissionCard(mission) {
    if (mission) {
        const date = new Date(mission.event.date);
        const dayStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = (mission.start_time || '').slice(0, 5);

        return `
            <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6 relative overflow-hidden group">
                 <div class="absolute top-0 left-0 w-2 h-full bg-brand-500"></div>
                 <div class="flex justify-between items-start mb-3 pl-3">
                    <div>
                        <div class="text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-1">C'est bientôt !</div>
                        <h3 class="font-bold text-lg text-slate-900 leading-tight">${mission.event.title}</h3>
                        <p class="text-sm text-slate-500 font-medium">${mission.title}</p>
                    </div>
                 </div>
                 <div class="flex items-center gap-4 pl-3 mt-4">
                    <div class="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                        <div class="flex items-center gap-2 text-slate-700 text-sm font-bold">
                            <i data-lucide="calendar" class="w-4 h-4 text-brand-500"></i>
                            ${dayStr}
                        </div>
                    </div>
                     <div class="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                        <div class="flex items-center gap-2 text-slate-700 text-sm font-bold">
                            <i data-lucide="clock" class="w-4 h-4 text-brand-500"></i>
                            ${timeStr}
                        </div>
                    </div>
                 </div>
                 <button data-link="/events" aria-label="Voir la mission" class="absolute bottom-4 right-4 bg-brand-50 text-brand-600 p-2 rounded-full hover:bg-brand-100 transition">
                    <i data-lucide="arrow-right" class="w-5 h-5"></i>
                 </button>
            </div>
        `;
    }

    return `
        <div class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center mb-6">
            <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-300">
                <i data-lucide="calendar-off" class="w-6 h-6"></i>
            </div>
            <h3 class="text-sm font-bold text-slate-600 mb-1">Rien de prévu ?</h3>
            <p class="text-xs text-slate-400 mb-4">Inscrivez-vous à votre prochaine mission.</p>
            <button data-link="/events" class="px-5 py-2.5 bg-brand-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition">
                Voir les missions
            </button>
        </div>
    `;
}
