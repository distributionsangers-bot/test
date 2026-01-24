import { supabase } from '../../services/supabase.js';
import { toggleLoader, showToast, escapeHtml } from '../../services/utils.js';
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
            attachUserListeners(container);
        }
    } catch (err) {
        console.error("Init Dashboard Error:", err);
        showToast("Erreur chargement dashboard", "error");
    } finally {
        toggleLoader(false);
        createIcons({ icons });
    }
}

export function cleanup() { }

// ============================================================
// HELPER: Dynamic Greeting based on time
// ============================================================
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Bonjour', emoji: '☀️' };
    if (hour < 18) return { text: 'Bon après-midi', emoji: '🌤️' };
    return { text: 'Bonsoir', emoji: '🌙' };
}

// ============================================================
// USER DASHBOARD
// ============================================================
async function renderUserDashboard(container) {
    const user = store.state.user;
    const profile = store.state.profile;
    const greeting = getGreeting();
    const totalHours = profile.total_hours || 0;

    // Fetch announcements
    const { data: announcements } = await supabase
        .from('tickets')
        .select('id, subject, created_at')
        .eq('is_announcement', true)
        .order('created_at', { ascending: false })
        .limit(3);

    // Fetch next mission
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: myRegs } = await supabase
        .from('registrations')
        .select(`
            shift_id, 
            shifts!inner (
                title, 
                start_time, 
                end_time,
                events!inner (title, date, location)
            )
        `)
        .eq('user_id', user.id)
        .gte('shifts.events.date', today.toISOString());

    let nextMission = null;
    if (myRegs && myRegs.length > 0) {
        const candidates = myRegs
            .map(r => ({ ...r.shifts, event: r.shifts.events }))
            .filter(s => new Date(s.event.date) >= today)
            .sort((a, b) => new Date(a.event.date) - new Date(b.event.date));
        if (candidates.length > 0) nextMission = candidates[0];
    }

    // Status badge
    const statusBadge = getStatusBadge(profile.status);

    // Announcements HTML
    let announcementsHtml = '';
    if (announcements && announcements.length > 0) {
        announcementsHtml = `
            <div class="mb-6">
                <div class="flex items-center gap-2 mb-3 px-1">
                    <i data-lucide="megaphone" class="w-4 h-4 text-purple-500"></i>
                    <span class="text-xs font-bold text-purple-600 uppercase tracking-wider">Annonces</span>
                </div>
                <div class="space-y-2">
                    ${announcements.map(a => `
                        <button data-link="/messages/${a.id}" class="w-full text-left bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-100 hover:shadow-md transition-all group">
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-slate-800 text-sm truncate flex-1">${escapeHtml(a.subject)}</span>
                                <i data-lucide="chevron-right" class="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform"></i>
                            </div>
                            <span class="text-[10px] text-purple-400 font-medium">${new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Next mission with countdown
    const missionHtml = renderNextMissionCard(nextMission);

    container.innerHTML = `
        <div class="animate-fade-in max-w-lg mx-auto pb-24 pt-2">
            
            <!-- HERO HEADER -->
            <div class="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-700 p-6 mb-6 shadow-2xl shadow-brand-500/20">
                <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
                
                <div class="relative flex items-center justify-between">
                    <div class="text-white">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-2xl">${greeting.emoji}</span>
                            <h1 class="text-2xl font-black tracking-tight">${greeting.text}, ${escapeHtml(profile.first_name || 'Bénévole')}</h1>
                        </div>
                        <div class="flex items-center gap-2 mt-2">
                            ${statusBadge}
                        </div>
                    </div>
                    <button data-link="/profile" class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition border border-white/30">
                        <i data-lucide="user" class="w-6 h-6"></i>
                    </button>
                </div>

                <!-- Hours Counter -->
                <div class="mt-6 flex items-center gap-4">
                    <div class="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
                        <div class="text-3xl font-black text-white">${totalHours}<span class="text-lg opacity-60">h</span></div>
                        <div class="text-[10px] font-bold text-white/60 uppercase">Heures</div>
                    </div>
                </div>
            </div>

            <!-- ANNOUNCEMENTS -->
            ${announcementsHtml}

            <!-- NEXT MISSION -->
            <div class="mb-6">
                <h2 class="text-lg font-bold text-slate-900 mb-3 px-1 flex items-center gap-2">
                    <i data-lucide="calendar-check" class="w-5 h-5 text-brand-500"></i>
                    Prochaine Mission
                </h2>
                ${missionHtml}
            </div>

            <!-- QUICK ACTIONS -->
            <div class="grid grid-cols-3 gap-3">
                <button data-link="/events" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all text-center group">
                    <div class="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mb-3 mx-auto shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition">
                        <i data-lucide="calendar-plus" class="w-6 h-6 text-white"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm">Missions</div>
                    <div class="text-[10px] text-slate-400">S'inscrire</div>
                </button>
                
                <button id="btn-scanner" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all text-center group">
                    <div class="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mb-3 mx-auto shadow-lg shadow-slate-500/20 group-hover:scale-110 transition">
                        <i data-lucide="scan-line" class="w-6 h-6 text-white"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm">Scanner</div>
                    <div class="text-[10px] text-slate-400">Pointer</div>
                </button>

                <button data-link="/messages" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all text-center group">
                    <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-3 mx-auto shadow-lg shadow-purple-500/20 group-hover:scale-110 transition">
                        <i data-lucide="message-circle" class="w-6 h-6 text-white"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm">Messages</div>
                    <div class="text-[10px] text-slate-400">Contacter</div>
                </button>
            </div>
        </div>
    `;
}

function attachUserListeners(container) {
    container.querySelector('#btn-scanner')?.addEventListener('click', () => {
        import('../scanner/scanner.view.js').then(({ ScannerView }) => ScannerView.openScanner());
    });
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
async function renderAdminDashboard(container) {
    const profile = store.state.profile;
    const greeting = getGreeting();

    // Stats
    const { data: profilesData } = await supabase.from('profiles').select('total_hours, status, created_at');
    const totalHours = profilesData?.reduce((acc, curr) => acc + (curr.total_hours || 0), 0) || 0;
    const volunteersCount = profilesData?.filter(p => p.status === 'approved').length || 0;
    const pendingCount = profilesData?.filter(p => p.status === 'pending').length || 0;

    // Recent registrations (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = profilesData?.filter(p => new Date(p.created_at) >= weekAgo).length || 0;

    // Events this month
    const monthStart = new Date();
    monthStart.setDate(1);
    const { count: eventsThisMonth } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('date', monthStart.toISOString());

    // Urgencies (7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const { data: events } = await supabase
        .from('events')
        .select('*, shifts(*, registrations(count))')
        .gte('date', today.toISOString())
        .lte('date', nextWeek.toISOString())
        .order('date');

    let urgentItems = [];
    events?.forEach(e => {
        e.shifts?.forEach(s => {
            const taken = s.registrations?.[0]?.count || 0;
            const remaining = s.max_slots - taken;
            if (remaining > 0) {
                urgentItems.push({
                    title: e.title,
                    shift: s.title,
                    date: e.date,
                    remaining,
                    startTime: s.start_time
                });
            }
        });
    });

    // Recent activity
    const { data: recentRegs } = await supabase
        .from('registrations')
        .select('created_at, profiles(first_name, last_name), shifts(title, events(title))')
        .order('created_at', { ascending: false })
        .limit(5);

    const activityHtml = recentRegs?.map(r => `
        <div class="flex items-center gap-3 py-2">
            <div class="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i data-lucide="user-plus" class="w-4 h-4 text-emerald-600"></i>
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div class="flex items-center gap-1">
                     <span class="text-sm font-semibold text-slate-700 truncate max-w-[120px]">${escapeHtml(r.profiles?.first_name || '')} ${escapeHtml(r.profiles?.last_name || '')}</span>
                     <span class="text-xs text-slate-400 flex-shrink-0">s'est inscrit à</span>
                </div>
                <span class="text-xs font-medium text-slate-600 truncate">${escapeHtml(r.shifts?.events?.title || '')}</span>
            </div>
            <span class="text-[10px] text-slate-300 flex-shrink-0">${formatTimeAgo(r.created_at)}</span>
        </div>
    `).join('') || '<div class="text-center text-slate-400 py-4 text-sm">Aucune activité récente</div>';

    // Urgencies HTML
    const urgentHtml = urgentItems.length > 0
        ? urgentItems.slice(0, 4).map(u => `
            <div class="flex items-center justify-between p-3 bg-red-50 rounded-2xl border border-red-100">
                <div>
                    <div class="font-bold text-slate-800 text-sm">${escapeHtml(u.title)}</div>
                    <div class="text-xs text-red-500 font-bold">⚠️ Manque ${u.remaining} pers. • ${new Date(u.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                </div>
                <button data-link="/admin_planning" class="px-3 py-2 bg-white text-red-600 text-xs font-bold border border-red-200 rounded-xl hover:bg-red-100 transition">
                    Gérer
                </button>
            </div>
        `).join('')
        : '<div class="p-4 text-center text-slate-400 text-sm bg-emerald-50 rounded-2xl border border-emerald-100"><i data-lucide="check-circle" class="w-5 h-5 mx-auto mb-1 text-emerald-500"></i>Aucune urgence !</div>';

    container.innerHTML = `
        <div class="animate-fade-in max-w-2xl mx-auto pb-24">
            
            <!-- ADMIN HERO -->
            <div class="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 mb-6 shadow-2xl">
                <div class="absolute inset-0 opacity-5" style="background-image: url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
                
                <div class="relative flex items-center justify-between">
                    <div class="text-white">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-2xl">${greeting.emoji}</span>
                            <h1 class="text-2xl font-black tracking-tight">${greeting.text}, ${escapeHtml(profile.first_name || 'Admin')}</h1>
                        </div>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold border border-amber-500/30">🛡️ Administrateur</span>
                        </div>
                    </div>
                    <button id="btn-announcement" class="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center hover:bg-purple-500/30 transition border border-purple-500/30">
                        <i data-lucide="megaphone" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>

            <!-- STATS GRID -->
            <div class="grid grid-cols-4 gap-3 mb-6">
                <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <div class="text-2xl font-black text-slate-900">${volunteersCount}</div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase">Bénévoles</div>
                </div>
                <div class="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/20 text-center text-white">
                    <div class="text-2xl font-black">${Math.round(totalHours)}h</div>
                    <div class="text-[10px] font-bold text-emerald-100 uppercase">Total</div>
                </div>
                <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center ${pendingCount > 0 ? 'ring-2 ring-amber-400' : ''}">
                    <div class="text-2xl font-black ${pendingCount > 0 ? 'text-amber-500' : 'text-slate-400'}">${pendingCount}</div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase">En attente</div>
                </div>
                <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <div class="text-2xl font-black text-blue-500">${newThisWeek}</div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase">Cette sem.</div>
                </div>
            </div>

            <!-- QUICK ACTIONS -->
            <div class="grid grid-cols-4 gap-3 mb-6">
                <button data-link="/admin_planning" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all text-center group">
                    <div class="w-10 h-10 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition">
                        <i data-lucide="calendar" class="w-5 h-5"></i>
                    </div>
                    <div class="text-xs font-bold text-slate-700">Planning</div>
                </button>
                <button data-link="/admin_users" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all text-center group">
                    <div class="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition">
                        <i data-lucide="users" class="w-5 h-5"></i>
                    </div>
                    <div class="text-xs font-bold text-slate-700">Annuaire</div>
                </button>
                <button id="btn-create-event" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all text-center group">
                    <div class="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition">
                        <i data-lucide="plus-circle" class="w-5 h-5"></i>
                    </div>
                    <div class="text-xs font-bold text-slate-700">Événement</div>
                </button>
                <button data-link="/messages" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all text-center group">
                    <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition">
                        <i data-lucide="message-square" class="w-5 h-5"></i>
                    </div>
                    <div class="text-xs font-bold text-slate-700">Messages</div>
                </button>
            </div>

            <!-- TWO COLUMNS -->
            <div class="grid md:grid-cols-2 gap-4">
                <!-- URGENCIES -->
                <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <div class="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                            <i data-lucide="alert-triangle" class="w-4 h-4 text-red-500"></i>
                        </div>
                        Urgences (7 jours)
                        ${urgentItems.length > 0 ? `<span class="ml-auto px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">${urgentItems.length}</span>` : ''}
                    </h3>
                    <div class="space-y-2 max-h-64 overflow-y-auto">
                        ${urgentHtml}
                    </div>
                </div>

                <!-- RECENT ACTIVITY -->
                <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <div class="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                            <i data-lucide="activity" class="w-4 h-4 text-blue-500"></i>
                        </div>
                        Activité récente
                    </h3>
                    <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        ${activityHtml}
                    </div>
                </div>
            </div>

            <!-- Announcement Modal -->
            ${renderAnnouncementModal()}
        </div>
    `;
}

function renderAnnouncementModal() {
    return `
        <div id="announcement-modal" class="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in hidden">
            <div class="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up border-t-4 border-purple-500">
                <h3 class="font-extrabold text-lg mb-4 text-purple-900 flex items-center gap-2">
                    <i data-lucide="megaphone" class="w-5 h-5"></i>
                    Faire une annonce
                </h3>
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
                    <button type="submit" class="w-full py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 transition">Publier l'annonce</button>
                    <button type="button" id="btn-close-announcement" class="w-full py-3 text-slate-400 font-bold text-sm hover:bg-slate-50 rounded-xl">Annuler</button>
                </form>
            </div>
        </div>
    `;
}

async function attachAdminListeners(container) {
    // Create Event
    container.querySelector('#btn-create-event')?.addEventListener('click', () => {
        import('../admin/planning-form.view.js').then(({ openEventModal }) => openEventModal());
    });

    // Announcement Modal
    const modal = container.querySelector('#announcement-modal');
    container.querySelector('#btn-announcement')?.addEventListener('click', () => modal?.classList.remove('hidden'));
    modal?.querySelector('#btn-close-announcement')?.addEventListener('click', () => modal?.classList.add('hidden'));

    modal?.querySelector('form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        toggleLoader(true);

        const { ChatService } = await import('../chat/chat.service.js');
        const res = await ChatService.createAnnouncement(fd.get('subject'), fd.get('content'));

        toggleLoader(false);
        if (res.success) {
            showToast('Annonce publiée !');
            modal.classList.add('hidden');
            e.target.reset();
        } else {
            showToast(res.error?.message || "Erreur publication", "error");
        }
    });
}

// ============================================================
// HELPERS
// ============================================================
function getStatusBadge(status) {
    if (status === 'pending') return '<span class="px-3 py-1 bg-amber-500/20 text-amber-200 rounded-full text-xs font-bold border border-amber-500/30">⏳ En attente</span>';
    if (status === 'approved') return '<span class="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full text-xs font-bold border border-emerald-500/30">✓ Compte Validé</span>';
    return '<span class="px-3 py-1 bg-red-500/20 text-red-200 rounded-full text-xs font-bold border border-red-500/30">✗ Refusé</span>';
}

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}j`;
}

function renderNextMissionCard(mission) {
    if (mission) {
        const date = new Date(mission.event.date);
        const dayStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = (mission.start_time || '').slice(0, 5);

        // Countdown
        const now = new Date();
        const eventDate = new Date(mission.event.date);
        const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
        const countdownText = diffDays === 0 ? "Aujourd'hui !" : diffDays === 1 ? "Demain !" : `Dans ${diffDays} jours`;

        return `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-lg transition-all">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-brand-500 to-indigo-600"></div>
                
                <div class="pl-4">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg uppercase">${countdownText}</span>
                        <button data-link="/events" class="text-slate-400 hover:text-brand-600 transition">
                            <i data-lucide="arrow-right" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <h3 class="font-bold text-lg text-slate-900 leading-tight mb-1">${escapeHtml(mission.event.title)}</h3>
                    <p class="text-sm text-slate-500 font-medium mb-3">${escapeHtml(mission.title)}</p>
                    
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                            <i data-lucide="calendar" class="w-3.5 h-3.5 text-brand-500"></i>
                            ${dayStr}
                        </div>
                        <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                            <i data-lucide="clock" class="w-3.5 h-3.5 text-brand-500"></i>
                            ${timeStr}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
            <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-300">
                <i data-lucide="calendar-x" class="w-7 h-7"></i>
            </div>
            <h3 class="text-sm font-bold text-slate-600 mb-1">Rien de prévu ?</h3>
            <p class="text-xs text-slate-400 mb-4">Inscrivez-vous à votre prochaine mission.</p>
            <button data-link="/events" class="px-5 py-2.5 bg-brand-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition">
                Voir les missions
            </button>
        </div>
    `;
}
