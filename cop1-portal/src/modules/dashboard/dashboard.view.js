import { supabase } from '../../services/supabase.js';
import { toggleLoader, showToast, escapeHtml } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { store } from '../../core/store.js';
import { t } from '../../services/i18n.js';

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
    if (hour < 12) return { text: t('dashboard.greeting.morning'), emoji: '☀️' };
    if (hour < 18) return { text: t('dashboard.greeting.afternoon'), emoji: '🌤️' };
    return { text: t('dashboard.greeting.evening'), emoji: '🌙' };
}

// ============================================================
// USER DASHBOARD
// ============================================================
async function renderUserDashboard(container) {
    const user = store.state.user;
    const profile = store.state.profile;
    const greeting = getGreeting();
    const totalHours = profile.total_hours || 0;
    const isMandatory = profile.mandatory_hours;

    // Fetch announcements
    const { data: announcements } = await supabase
        .from('tickets')
        .select('id, subject, created_at')
        .eq('category', 'announcement')
        .order('created_at', { ascending: false })
        .limit(3);

    // Fetch user's registrations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: myRegs } = await supabase
        .from('registrations')
        .select(`
            shift_id, 
            attended,
            shifts!inner (
                id,
                title, 
                start_time, 
                end_time,
                events!inner (id, title, date, location)
            )
        `)
        .eq('user_id', user.id);

    // Count total missions completed
    const completedMissions = myRegs?.filter(r => r.attended).length || 0;

    // Count upcoming registrations (not yet attended, future dates)
    const upcomingRegsCount = myRegs?.filter(r => !r.attended && new Date(r.shifts?.events?.date) >= today).length || 0;

    // Next scheduled mission
    let nextMission = null;
    if (myRegs && myRegs.length > 0) {
        const candidates = myRegs
            .map(r => ({ ...r.shifts, event: r.shifts.events }))
            .filter(s => new Date(s.event.date) >= today)
            .sort((a, b) => new Date(a.event.date) - new Date(b.event.date));
        if (candidates.length > 0) nextMission = candidates[0];
    }

    // My shift IDs for filtering available missions
    const myShiftIds = new Set(myRegs?.map(r => r.shift_id) || []);

    // Fetch available mission (not registered)
    const { data: availableEvents } = await supabase
        .from('events')
        .select(`
            id, title, date, location, publish_at,
            shifts (id, title, start_time, max_slots, total_registrations)
        `)
        .gte('date', today.toISOString())
        .eq('is_visible', true)
        .order('date')
        .limit(20); // Fetch a bit more to allow for filtering

    let availableMission = null;
    if (availableEvents) {
        const now = new Date();
        for (const event of availableEvents) {
            // Filter: Hide if scheduled for future
            if (event.publish_at && new Date(event.publish_at) > now) continue;

            const availableShift = event.shifts?.find(s =>
                !myShiftIds.has(s.id) &&
                (s.max_slots - (s.total_registrations || 0)) > 0
            );
            if (availableShift) {
                availableMission = {
                    event,
                    shift: availableShift,
                    available: availableShift.max_slots - (availableShift.total_registrations || 0)
                };
                break;
            }
        }
    }

    // Recent activity (last 5 registrations with all statuses)
    const { data: recentActivity } = await supabase
        .from('registrations')
        .select(`
            id, created_at, attended, hours_counted,
            shifts (title, start_time, end_time, events (title, date))
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

    // Status badge
    const statusBadge = getStatusBadge(profile.status);

    // Announcements HTML
    let announcementsHtml = '';
    if (announcements && announcements.length > 0) {
        announcementsHtml = `
            <div class="mb-6">
                <h2 class="text-lg font-bold text-slate-900 mb-3 px-1 flex items-center gap-2">
                    <i data-lucide="megaphone" class="w-5 h-5 text-purple-500"></i>
                    ${t('dashboard.sections.announcements')}
                </h2>
                <div class="space-y-2">
                    ${announcements.map(a => `
                        <button data-link="/messages/${a.id}" class="w-full text-left bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-400 to-indigo-500"></div>
                            <div class="pl-4">
                                <div class="flex items-center justify-between">
                                    <span class="font-bold text-slate-800 text-sm truncate flex-1">${escapeHtml(a.subject)}</span>
                                    <i data-lucide="chevron-right" class="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform"></i>
                                </div>
                                <span class="text-[10px] text-purple-400 font-medium">${new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Calculate countdown for next mission
    let nextMissionDays = null;
    if (nextMission) {
        const eventDate = new Date(nextMission.event.date);
        nextMissionDays = Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24));
    }

    // Quota progress for mandatory users
    const quotaHtml = isMandatory ? `
        <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div class="absolute top-0 right-0 w-16 h-16 bg-indigo-400/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-indigo-400/20 transition-colors"></div>
            <div class="relative z-10">
                <div class="text-3xl font-black text-indigo-600 mb-1">🎓</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${t('dashboard.badges.student')}</div>
            </div>
        </div>
    ` : '';

    // Next mission card
    const missionHtml = renderNextMissionCard(nextMission);

    // Available mission HTML
    const availableMissionHtml = availableMission ? `
        <div class="mb-6">
            <h2 class="text-lg font-bold text-slate-900 mb-3 px-1 flex items-center gap-2">
                <i data-lucide="sparkles" class="w-5 h-5 text-amber-500"></i>
                ${t('dashboard.sections.availableMission')}
            </h2>
            <button data-link="/events" class="w-full bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-200 hover:shadow-lg hover:shadow-amber-500/10 transition-all text-left group relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-orange-500"></div>
                
                <div class="pl-4">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-lg uppercase flex items-center gap-1">
                            🟢 ${t('events.card.places', { count: availableMission.available })}
                        </span>
                        <i data-lucide="arrow-right" class="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform"></i>
                    </div>
                    
                    <h3 class="font-bold text-lg text-slate-900 leading-tight mb-1">${escapeHtml(availableMission.event.title)}</h3>
                    <p class="text-sm text-slate-500 font-medium mb-3">${escapeHtml(availableMission.shift.title)}</p>
                    
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white/80 px-3 py-1.5 rounded-lg">
                            <i data-lucide="calendar" class="w-3.5 h-3.5 text-amber-500"></i>
                            ${new Date(availableMission.event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white/80 px-3 py-1.5 rounded-lg">
                            <i data-lucide="clock" class="w-3.5 h-3.5 text-amber-500"></i>
                            ${(availableMission.shift.start_time || '').slice(0, 5)}
                        </div>
                    </div>
                </div>
            </button>
        </div>
    ` : '';

    // Helper function to get activity status
    const getActivityStatus = (r) => {
        const eventDate = new Date(r.shifts?.events?.date);
        const isPast = eventDate < today;

        if (!r.attended && !isPast) {
            // Future mission, just registered
            return {
                icon: 'calendar-check',
                bgColor: 'bg-blue-50',
                textColor: 'text-blue-600',
                label: t('events.card.registered'),
                badgeClass: 'text-blue-600 bg-blue-50'
            };
        } else if (!r.attended && isPast) {
            // Past mission, not attended (absent)
            return {
                icon: 'x-circle',
                bgColor: 'bg-red-50',
                textColor: 'text-red-500',
                label: t('profile.history.absent'),
                badgeClass: 'text-red-500 bg-red-50'
            };
        } else if (r.attended && r.hours_counted === 0) {
            // Attended but no hours (hors quota)
            return {
                icon: 'alert-triangle',
                bgColor: 'bg-orange-50',
                textColor: 'text-orange-500',
                label: t('profile.history.quotaExceeded'),
                badgeClass: 'text-orange-500 bg-orange-50'
            };
        } else {
            // Attended and validated with hours
            return {
                icon: 'check-circle',
                bgColor: 'bg-emerald-50',
                textColor: 'text-emerald-600',
                label: `+${r.hours_counted || 0}h`,
                badgeClass: 'text-emerald-600 bg-emerald-50'
            };
        }
    };

    // Group activities by event and limit to 3 most recent events
    const groupedByEvent = {};
    if (recentActivity && recentActivity.length > 0) {
        recentActivity.forEach(r => {
            const eventId = r.shifts?.events?.title + '|' + r.shifts?.events?.date;
            if (!groupedByEvent[eventId]) {
                groupedByEvent[eventId] = {
                    eventTitle: r.shifts?.events?.title || '',
                    eventDate: r.shifts?.events?.date,
                    shifts: []
                };
            }
            groupedByEvent[eventId].shifts.push(r);
        });
    }

    // Sort events by date (most recent first) and limit to 3
    const sortedEvents = Object.values(groupedByEvent)
        .sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))
        .slice(0, 3);

    // Activity panel HTML
    const activityHtml = sortedEvents.length > 0 ? `
        <div class="mb-6">
            <div class="flex items-center justify-between mb-3 px-1">
                <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <i data-lucide="history" class="w-5 h-5 text-blue-500"></i>
                    ${t('dashboard.sections.recentActivity')}
                </h2>
                <button data-link="/profile?tab=history" class="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    ${t('dashboard.viewAll')}
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="space-y-3">
                ${sortedEvents.map(event => `
                    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <!-- Event Header -->
                        <div class="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-100">
                            <p class="font-bold text-slate-800 text-sm truncate">${escapeHtml(event.eventTitle)}</p>
                            <p class="text-[10px] text-slate-400">${new Date(event.eventDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                        </div>
                        <!-- Shifts -->
                        <div class="divide-y divide-slate-50">
                            ${event.shifts.map(r => {
        const status = getActivityStatus(r);
        return `
                                <div class="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition">
                                    <div class="w-8 h-8 rounded-lg ${status.bgColor} ${status.textColor} flex items-center justify-center flex-shrink-0">
                                        <i data-lucide="${status.icon}" class="w-4 h-4"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-xs font-semibold text-slate-600 truncate">${escapeHtml(r.shifts?.title || 'Créneau')}</p>
                                        <p class="text-[10px] text-slate-400">${(r.shifts?.start_time || '').slice(0, 5)} - ${(r.shifts?.end_time || '').slice(0, 5)}</p>
                                    </div>
                                    <span class="text-[10px] font-bold ${status.badgeClass} px-2 py-0.5 rounded-lg">${status.label}</span>
                                </div>
                            `}).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    container.innerHTML = `
        <div class="animate-fade-in max-w-4xl mx-auto pb-24 pt-2">
            
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
            </div>

            <!-- QUICK ACTIONS (moved to top) -->
            <div class="grid grid-cols-3 gap-3 mb-6">
                <button data-link="/events" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1 group text-center">
                    <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 mx-auto group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="calendar-plus" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">${t('nav.missions')}</div>
                    <div class="text-[10px] text-slate-400">${t('events.card.register')}</div>
                </button>
                
                <button id="btn-scanner" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-500/10 transition-all duration-300 hover:-translate-y-1 group text-center">
                    <div class="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-3 mx-auto group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                        <i data-lucide="scan-line" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-slate-900 transition-colors">${t('dashboard.actions.scan')}</div>
                    <div class="text-[10px] text-slate-400">${t('dashboard.actions.scanSubtitle')}</div>
                </button>

                <button data-link="/messages" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 group text-center">
                    <div class="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-3 mx-auto group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="message-circle" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-purple-600 transition-colors">${t('nav.messages')}</div>
                    <div class="text-[10px] text-slate-400">${t('dashboard.actions.contact')}</div>
                </button>
            </div>

            <!-- STATS BENTO GRID (4 columns like admin) -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <!-- Hours (Gradient Card) -->
                <div class="relative group bg-gradient-to-br from-brand-500 to-indigo-600 p-5 rounded-3xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute -bottom-4 -right-4 text-white/10 group-hover:text-white/20 transition-colors transform group-hover:rotate-12 duration-500">
                        <i data-lucide="clock" class="w-16 h-16"></i>
                    </div>
                    <div class="relative z-10 text-white">
                        <div class="text-3xl font-black mb-1">${totalHours}h</div>
                        <div class="text-[10px] font-bold text-brand-100 uppercase tracking-wider">${t('dashboard.stats.accumulated')}</div>
                    </div>
                </div>

                <!-- Missions Completed -->
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                        <i data-lucide="calendar-check-2" class="w-12 h-12 text-emerald-600"></i>
                    </div>
                    <div class="relative z-10">
                        <div class="text-3xl font-black text-emerald-600 mb-1">${completedMissions}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${t('dashboard.stats.completed')}</div>
                    </div>
                </div>

                <!-- Next Mission Countdown -->
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute top-0 right-0 w-16 h-16 bg-amber-400/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-amber-400/20 transition-colors"></div>
                    <div class="relative z-10">
                        <div class="text-3xl font-black ${nextMissionDays !== null ? (nextMissionDays <= 1 ? 'text-amber-500' : 'text-slate-700') : 'text-slate-300'} mb-1">
                            ${nextMissionDays !== null ? (nextMissionDays === 0 ? "Auj." : nextMissionDays === 1 ? "Dem." : "J-" + nextMissionDays) : '—'}
                        </div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            ${nextMissionDays !== null && nextMissionDays <= 1 ? '<span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>' : ''}
                            ${t('dashboard.stats.next')}
                        </div>
                    </div>
                </div>

                <!-- Upcoming Registrations or Scolaire Badge -->
                ${isMandatory ? `
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute top-0 right-0 w-16 h-16 bg-indigo-400/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-indigo-400/20 transition-colors"></div>
                    <div class="relative z-10">
                        <div class="text-3xl font-black text-indigo-600 mb-1">🎓</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${t('dashboard.badges.student')}</div>
                    </div>
                </div>
                ` : `
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute top-0 right-0 w-16 h-16 bg-blue-400/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-400/20 transition-colors"></div>
                    <div class="relative z-10">
                        <div class="text-3xl font-black text-blue-600 mb-1">${upcomingRegsCount}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${t('dashboard.stats.registrations')}</div>
                    </div>
                </div>
                `}
            </div>

            <!-- ANNOUNCEMENTS -->
            ${announcementsHtml}

            <!-- NEXT MISSION -->
            <div class="mb-6">
                <h2 class="text-lg font-bold text-slate-900 mb-3 px-1 flex items-center gap-2">
                    <i data-lucide="calendar-check" class="w-5 h-5 text-brand-500"></i>
                    ${t('dashboard.sections.nextMission')}
                </h2>
                ${missionHtml}
            </div>

            <!-- AVAILABLE MISSION -->
            ${availableMissionHtml}

            <!-- ACTIVITY -->
            ${activityHtml}

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
                     <span class="text-xs text-slate-400 flex-shrink-0">${t('dashboard.activity.registeredTo')}</span>
                </div>
                <span class="text-xs font-medium text-slate-600 truncate">${escapeHtml(r.shifts?.events?.title || '')}</span>
            </div>
            <span class="text-[10px] text-slate-300 flex-shrink-0">${formatTimeAgo(r.created_at)}</span>
        </div>
    `).join('') || `<div class="text-center text-slate-400 py-4 text-sm">${t('dashboard.activity.noActivity')}</div>`;

    // Urgencies HTML
    const urgentHtml = urgentItems.length > 0
        ? urgentItems.slice(0, 4).map(u => `
            <div class="flex items-center justify-between p-3 bg-red-50 rounded-2xl border border-red-100">
                <div>
                    <div class="font-bold text-slate-800 text-sm">${escapeHtml(u.title)}</div>
                    <div class="text-xs text-red-500 font-bold">⚠️ Manque ${u.remaining} pers. • ${new Date(u.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                </div>
                <button data-link="/admin_planning" class="px-3 py-2 bg-white text-red-600 text-xs font-bold border border-red-200 rounded-xl hover:bg-red-100 transition">
                    ${t('dashboard.admin.manage')}
                </button>
            </div>
        `).join('')
        : `<div class="p-4 text-center text-slate-400 text-sm bg-emerald-50 rounded-2xl border border-emerald-100"><i data-lucide="check-circle" class="w-5 h-5 mx-auto mb-1 text-emerald-500"></i>${t('dashboard.empty.noUrgency')}</div>`;

    container.innerHTML = `
        <div class="animate-fade-in max-w-4xl mx-auto pb-24">
            
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
                    <button data-link="/profile" class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition border border-white/30">
                        <i data-lucide="user" class="w-6 h-6"></i>
                    </button>
                </div>
            </div>

            <!-- CONTROL CENTER GRID (Bento Style) -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                
                <!-- 1. Bénévoles -->
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                        <i data-lucide="users" class="w-12 h-12 text-slate-800"></i>
                    </div>
                    <div class="relative z-10">
                        <div class="text-3xl font-black text-slate-800 mb-1">${volunteersCount}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${t('dashboard.stats.volunteers')}</div>
                    </div>
                </div>

                <!-- 2. Total Heures (Gradient) -->
                <div class="relative group bg-gradient-to-br from-brand-500 to-indigo-600 p-5 rounded-3xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute -bottom-4 -right-4 text-white/10 group-hover:text-white/20 transition-colors transform group-hover:rotate-12 duration-500">
                        <i data-lucide="clock" class="w-20 h-20"></i>
                    </div>
                    <div class="relative z-10 text-white">
                        <div class="text-3xl font-black mb-1">${Math.round(totalHours)}h</div>
                        <div class="text-[10px] font-bold text-brand-100 uppercase tracking-wider">${t('dashboard.admin.cumulated')}</div>
                    </div>
                </div>

                <!-- 3. En Attente -->
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute top-0 right-0 w-16 h-16 bg-amber-400/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-amber-400/20 transition-colors"></div>
                    
                    <div class="relative z-10">
                        <div class="text-3xl font-black ${pendingCount > 0 ? 'text-amber-500' : 'text-slate-400'} mb-1">${pendingCount}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            ${pendingCount > 0 ? '<span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>' : ''}
                            ${t('dashboard.stats.pending')}
                        </div>
                    </div>
                </div>

                <!-- 4. Cette Semaine -->
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                     <div class="absolute top-0 right-0 w-16 h-16 bg-blue-400/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-400/20 transition-colors"></div>
                    <div class="relative z-10">
                        <div class="text-3xl font-black text-blue-600 mb-1">${newThisWeek}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${t('dashboard.stats.newThisWeek')}</div>
                    </div>
                </div>

                <!-- ACTIONS ROW -->
                
                <!-- 5. Planning -->
                <button data-link="/admin_planning" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-brand-500/10 transition-all duration-300 hover:-translate-y-1 group text-left relative overflow-hidden">
                    <div class="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="calendar" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-brand-600 transition-colors">${t('dashboard.actions.managePlanning')}</div>
                    <div class="text-[10px] text-slate-400 font-medium">${t('dashboard.actions.managePlanningSubtitle')}</div>
                </button>

                <!-- 6. Annuaire -->
                <button data-link="/admin_users" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 group text-left relative overflow-hidden">
                    <div class="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="users" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-purple-600 transition-colors">${t('dashboard.actions.manageDirectory')}</div>
                    <div class="text-[10px] text-slate-400 font-medium">${t('dashboard.actions.manageDirectorySubtitle')}</div>
                </button>

                <!-- 7. Événement -->
                <button id="btn-create-event" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1 group text-left relative overflow-hidden">
                    <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="plus" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">${t('dashboard.actions.createEvent')}</div>
                    <div class="text-[10px] text-slate-400 font-medium">${t('dashboard.actions.createEventSubtitle')}</div>
                </button>

                <!-- 8. Messages -->
                <button data-link="/messages" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 group text-left relative overflow-hidden">
                    <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="message-square" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">${t('nav.messages')}</div>
                    <div class="text-[10px] text-slate-400 font-medium">${t('dashboard.actions.contact')}</div>
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
                        ${t('dashboard.sections.emergencies')}
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
                        ${t('dashboard.sections.recentActivity')}
                    </h3>
                    <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        ${activityHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function attachAdminListeners(container) {
    // Create Event
    container.querySelector('#btn-create-event')?.addEventListener('click', () => {
        import('../admin/event-modal.view.js').then(({ openEventModal }) => openEventModal());
    });
}

// ============================================================
// HELPERS
// ============================================================
function getStatusBadge(status) {
    if (status === 'pending') return `<span class="px-3 py-1 bg-amber-500/20 text-amber-200 rounded-full text-xs font-bold border border-amber-500/30">⏳ ${t('status.pending.title')}</span>`;
    if (status === 'approved') return `<span class="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full text-xs font-bold border border-emerald-500/30">✓ ${t('dashboard.badges.volunteer')}</span>`;
    return `<span class="px-3 py-1 bg-red-500/20 text-red-200 rounded-full text-xs font-bold border border-red-500/30">✗ ${t('status.rejected.title')}</span>`;
}

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('common.today');
    if (diffMins < 60) return `${diffMins}${t('common.min')}`;
    if (diffHours < 24) return `${diffHours}${t('common.hour')}`;
    return `${diffDays}${t('common.day')}`;
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
        const countdownText = diffDays === 0 ? t('events.urgency.today') : diffDays === 1 ? t('events.urgency.tomorrow') : t('events.urgency.days', { days: diffDays });

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
            <h3 class="text-sm font-bold text-slate-600 mb-1">${t('dashboard.empty.noMission')}</h3>
            <p class="text-xs text-slate-400 mb-4">${t('dashboard.empty.subscribeNext')}</p>
            <button data-link="/events" class="px-5 py-2.5 bg-brand-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition">
                ${t('dashboard.empty.seeMissions')}
            </button>
        </div>
    `;
}
