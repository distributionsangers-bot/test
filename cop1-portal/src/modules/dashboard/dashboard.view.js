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

    // Count upcoming registrations (not yet attended, future dates OR today future time)
    const now = new Date();
    // FIX: Use Local Date instead of UTC ISOString
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // FIX: Use robust local time string HH:MM
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const upcomingRegsCount = myRegs?.filter(r => {
        if (r.attended) return false;
        const evtDate = r.shifts?.events?.date;
        if (evtDate > todayStr) return true;
        if (evtDate === todayStr) {
            const shiftEnd = (r.shifts?.end_time || '23:59').slice(0, 5);
            return shiftEnd >= timeStr;
        }
        return false;
    }).length || 0;

    // Next scheduled mission
    let nextMission = null;
    if (myRegs && myRegs.length > 0) {
        const candidates = myRegs
            .map(r => ({ ...r.shifts, event: r.shifts.events }))
            .filter(s => {
                const d = s.event.date;
                if (d > todayStr) return true;
                if (d === todayStr) {
                    const shiftEnd = (s.end_time || '23:59').slice(0, 5);
                    return shiftEnd >= timeStr;
                }
                return false;
            })
            .sort((a, b) => {
                // Sort by date then start_time
                const dateA = a.event.date;
                const dateB = b.event.date;
                if (dateA !== dateB) return dateA.localeCompare(dateB);
                return (a.start_time || '').localeCompare(b.start_time || '');
            });

        if (candidates.length > 0) nextMission = candidates[0];
    }

    // My shift IDs for filtering available missions
    const myShiftIds = new Set(myRegs?.map(r => r.shift_id) || []);

    // Fetch available mission (not registered)
    const { data: availableEvents } = await supabase
        .from('events')
        .select(`
            id, title, date, location, publish_at,
            shifts (id, title, start_time, end_time, max_slots, total_registrations)
        `)
        .gte('date', todayStr)
        .eq('is_visible', true)
        .order('date')
        .limit(20); // Fetch a bit more to allow for filtering

    let availableMission = null;
    if (availableEvents) {
        // Sort events by date + earliest shift start_time
        const sortedEvents = [...availableEvents].sort((a, b) => {
            const dateCmp = a.date.localeCompare(b.date);
            if (dateCmp !== 0) return dateCmp;
            const aTime = a.shifts?.map(s => s.start_time || '').sort()[0] || '';
            const bTime = b.shifts?.map(s => s.start_time || '').sort()[0] || '';
            return aTime.localeCompare(bTime);
        });

        for (const event of sortedEvents) {
            // Filter: Hide if scheduled for future
            if (event.publish_at && new Date(event.publish_at) > now) continue;

            const sortedShifts = [...(event.shifts || [])].sort((a, b) =>
                (a.start_time || '').localeCompare(b.start_time || '')
            );

            const availableShift = sortedShifts.find(s => {
                // Time Check
                if (event.date === todayStr) {
                    const shiftEnd = (s.end_time || '23:59').slice(0, 5);
                    if (shiftEnd < timeStr) return false;
                }

                return !myShiftIds.has(s.id) &&
                    (s.max_slots - (s.total_registrations || 0)) > 0;
            });

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
                    Annonces
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
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scolaire</div>
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
                Missions disponibles
            </h2>
            <button data-link="/events" class="w-full text-left bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-orange-500"></div>
                <div class="pl-4">
                    <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0">
                            <span class="font-bold text-slate-800 text-sm">${escapeHtml(availableMission.event.title)}</span>
                            <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                <span>${new Date(availableMission.event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                <span class="text-slate-300">•</span>
                                <span>${(availableMission.shift.start_time || '').slice(0, 5)}</span>
                                <span class="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">${availableMission.available} places</span>
                            </div>
                        </div>
                        <i data-lucide="chevron-right" class="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform flex-shrink-0"></i>
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
                label: 'Inscrit',
                badgeClass: 'text-blue-600 bg-blue-50'
            };
        } else if (!r.attended && isPast) {
            // Past mission, not attended (absent)
            return {
                icon: 'x-circle',
                bgColor: 'bg-red-50',
                textColor: 'text-red-500',
                label: 'Absent',
                badgeClass: 'text-red-500 bg-red-50'
            };
        } else if (r.attended && r.hours_counted === 0) {
            // Attended but no hours (hors quota)
            return {
                icon: 'alert-triangle',
                bgColor: 'bg-orange-50',
                textColor: 'text-orange-500',
                label: 'Hors Quota',
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
                    Mon Activité
                </h2>
                <button data-link="/profile?tab=history" class="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    Voir tout
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
            <div class="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-6 mb-6 shadow-2xl shadow-brand-500/20">
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
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <button data-link="/events" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1 group text-center">
                    <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 mx-auto group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="calendar-plus" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">Missions</div>
                    <div class="text-[10px] text-slate-400">S'inscrire à nos missions</div>
                </button>
                
                <button id="btn-scanner" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-500/10 transition-all duration-300 hover:-translate-y-1 group text-center">
                    <div class="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-3 mx-auto group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                        <i data-lucide="scan-line" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-slate-900 transition-colors">Scanner</div>
                    <div class="text-[10px] text-slate-400">Pointer sa présence</div>
                </button>

                <button data-link="/messages" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 group text-center">
                    <div class="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-3 mx-auto group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="message-circle" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-purple-600 transition-colors">Messages</div>
                    <div class="text-[10px] text-slate-400">Contacter un responsable</div>
                </button>

                <button data-link="/poles" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1 group text-center">
                    <div class="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3 mx-auto group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="network" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-amber-600 transition-colors">Pôles</div>
                    <div class="text-[10px] text-slate-400">Voir les postes de l'asso</div>
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
                        <div class="text-[10px] font-bold text-brand-100 uppercase tracking-wider">Cumulées</div>
                    </div>
                </div>

                <!-- Missions Completed -->
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                        <i data-lucide="calendar-check-2" class="w-12 h-12 text-emerald-600"></i>
                    </div>
                    <div class="relative z-10">
                        <div class="text-3xl font-black text-emerald-600 mb-1">${completedMissions}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Effectuées</div>
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
                            Prochaine
                        </div>
                    </div>
                </div>

                <!-- Upcoming Registrations or Scolaire Badge -->
                ${isMandatory ? `
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute top-0 right-0 w-16 h-16 bg-indigo-400/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-indigo-400/20 transition-colors"></div>
                    <div class="relative z-10">
                        <div class="text-3xl font-black text-indigo-600 mb-1">🎓</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scolaire</div>
                    </div>
                </div>
                ` : `
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute top-0 right-0 w-16 h-16 bg-blue-400/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-400/20 transition-colors"></div>
                    <div class="relative z-10">
                        <div class="text-3xl font-black text-blue-600 mb-1">${upcomingRegsCount}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inscriptions</div>
                    </div>
                </div>
                `}
            </div>

            <!-- ANNOUNCEMENTS -->
            ${announcementsHtml}

            <!-- AVAILABLE MISSION (First) -->
            ${availableMissionHtml}

            <!-- NEXT REGISTERED MISSION -->
            ${missionHtml}

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
    const monthStartStr = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-01`;
    const { count: eventsThisMonth } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('date', monthStartStr);

    // Urgencies (7 days)
    const today = new Date();
    const todayAdminStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;

    const { data: events } = await supabase
        .from('events')
        .select('*, shifts(*, registrations(count))')
        .gte('date', todayAdminStr)
        .lte('date', nextWeekStr)
        .order('date');

    // Build urgencies grouped by event
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    let urgentEvents = [];
    let totalUrgentShifts = 0;
    events?.forEach(e => {
        const urgentShifts = [];
        e.shifts?.forEach(s => {
            // Filter past shifts if event is today
            // Use startsWith to handle both 'YYYY-MM-DD' and 'YYYY-MM-DDT...' formats
            if (e.date.startsWith(todayAdminStr)) {
                const shiftEnd = (s.end_time || '23:59').slice(0, 5);
                if (shiftEnd < currentTimeStr) return;
            }

            const taken = s.registrations?.[0]?.count || 0;
            const remaining = s.max_slots - taken;
            if (remaining > 0) {
                urgentShifts.push({
                    shift: s.title,
                    remaining,
                    startTime: s.start_time
                });
            }
        });
        if (urgentShifts.length > 0) {
            const totalRemaining = urgentShifts.reduce((sum, s) => sum + s.remaining, 0);
            urgentEvents.push({
                title: e.title,
                date: e.date,
                shifts: urgentShifts,
                totalRemaining
            });
            totalUrgentShifts += urgentShifts.length;
        }
    });

    // Recent activity
    const { data: recentRegs } = await supabase
        .from('registrations')
        .select('created_at, profiles(first_name, last_name), shifts(title, events(title))')
        .order('created_at', { ascending: false })
        .limit(15);

    // Group by volunteer + event
    const groupedActivity = {};
    recentRegs?.forEach(r => {
        const name = `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.trim();
        const event = r.shifts?.events?.title || '';
        const key = `${name}|${event}`;
        if (!groupedActivity[key]) {
            groupedActivity[key] = { name, event, count: 0, created_at: r.created_at };
        }
        groupedActivity[key].count++;
        // Keep most recent date
        if (r.created_at > groupedActivity[key].created_at) {
            groupedActivity[key].created_at = r.created_at;
        }
    });

    const sortedActivity = Object.values(groupedActivity)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

    const activityHtml = sortedActivity.length > 0 ? sortedActivity.map(a => `
        <div class="flex items-center gap-3 py-2">
            <div class="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i data-lucide="user-plus" class="w-4 h-4 text-emerald-600"></i>
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div class="flex items-center gap-1">
                     <span class="text-sm font-semibold text-slate-700 truncate max-w-[120px]">${escapeHtml(a.name)}</span>
                     <span class="text-xs text-slate-400 flex-shrink-0">s'est inscrit à</span>
                </div>
                <span class="text-xs font-medium text-slate-600 truncate">${escapeHtml(a.event)}</span>
                ${a.count > 1 ? `<span class="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded w-fit mt-0.5">${a.count} créneaux</span>` : ''}
            </div>
            <span class="text-[10px] text-slate-300 flex-shrink-0">${formatTimeAgo(a.created_at)}</span>
        </div>
    `).join('') : '<div class="text-center text-slate-400 py-4 text-sm">Aucune activité récente</div>';

    // Urgencies HTML — grouped by event
    const urgentHtml = urgentEvents.length > 0
        ? urgentEvents.map(evt => `
            <div class="bg-red-50 rounded-2xl border border-red-100 overflow-hidden">
                <!-- Event Header -->
                <div class="flex items-center justify-between p-3 border-b border-red-100/60">
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-slate-800 text-sm truncate">${escapeHtml(evt.title)}</div>
                        <div class="text-[10px] text-red-400 font-semibold mt-0.5">${new Date(evt.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} • ${evt.totalRemaining} place${evt.totalRemaining > 1 ? 's' : ''} à pourvoir</div>
                    </div>
                    <button data-link="/admin_planning" class="px-3 py-2 bg-white text-red-600 text-xs font-bold border border-red-200 rounded-xl hover:bg-red-100 transition flex-shrink-0 ml-2">
                        Gérer
                    </button>
                </div>
                <!-- Shifts list -->
                <div class="divide-y divide-red-100/40">
                    ${evt.shifts.map(s => `
                        <div class="flex items-center gap-2 px-3 py-2">
                            <div class="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i data-lucide="clock" class="w-3 h-3 text-red-500"></i>
                            </div>
                            <span class="text-xs text-slate-600 truncate flex-1">${escapeHtml(s.shift)} ${s.startTime ? '(' + s.startTime.slice(0, 5) + ')' : ''}</span>
                            <span class="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded flex-shrink-0">⚠️ ${s.remaining} pers.</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')
        : '<div class="p-4 text-center text-slate-400 text-sm bg-emerald-50 rounded-2xl border border-emerald-100"><i data-lucide="check-circle" class="w-5 h-5 mx-auto mb-1 text-emerald-500"></i>Aucune urgence !</div>';

    container.innerHTML = `
        <div class="animate-fade-in max-w-4xl mx-auto pb-24">
            
            <!-- ADMIN HERO -->
            <div class="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 mb-6 shadow-2xl">
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
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bénévoles</div>
                    </div>
                </div>

                <!-- 2. Total Heures (Gradient) -->
                <div class="relative group bg-gradient-to-br from-brand-500 to-indigo-600 p-5 rounded-3xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute -bottom-4 -right-4 text-white/10 group-hover:text-white/20 transition-colors transform group-hover:rotate-12 duration-500">
                        <i data-lucide="clock" class="w-20 h-20"></i>
                    </div>
                    <div class="relative z-10 text-white">
                        <div class="text-3xl font-black mb-1">${Math.round(totalHours)}h</div>
                        <div class="text-[10px] font-bold text-brand-100 uppercase tracking-wider">Cumulé</div>
                    </div>
                </div>

                <!-- 3. En Attente -->
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div class="absolute top-0 right-0 w-16 h-16 bg-amber-400/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-amber-400/20 transition-colors"></div>
                    
                    <div class="relative z-10">
                        <div class="text-3xl font-black ${pendingCount > 0 ? 'text-amber-500' : 'text-slate-400'} mb-1">${pendingCount}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            ${pendingCount > 0 ? '<span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>' : ''}
                            En attente
                        </div>
                    </div>
                </div>

                <!-- 4. Cette Semaine -->
                <div class="relative group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                     <div class="absolute top-0 right-0 w-16 h-16 bg-blue-400/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-400/20 transition-colors"></div>
                    <div class="relative z-10">
                        <div class="text-3xl font-black text-blue-600 mb-1">${newThisWeek}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nouveaux</div>
                    </div>
                </div>

                <!-- ACTIONS ROW -->
                
                <!-- 5. Planning -->
                <button data-link="/admin_planning" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-brand-500/10 transition-all duration-300 hover:-translate-y-1 group text-left relative overflow-hidden">
                    <div class="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="calendar" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-brand-600 transition-colors">Planning</div>
                    <div class="text-[10px] text-slate-400 font-medium">Gérer les créneaux</div>
                </button>

                <!-- 6. Annuaire -->
                <button data-link="/admin_users" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 group text-left relative overflow-hidden">
                    <div class="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="users" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-purple-600 transition-colors">Annuaire</div>
                    <div class="text-[10px] text-slate-400 font-medium">Gérer les bénévoles</div>
                </button>

                <!-- 7. Événement -->
                <button id="btn-create-event" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1 group text-left relative overflow-hidden">
                    <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="plus" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">Créer</div>
                    <div class="text-[10px] text-slate-400 font-medium">Nouvel événement</div>
                </button>

                <!-- 8. Messages -->
                <button data-link="/messages" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 group text-left relative overflow-hidden">
                    <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        <i data-lucide="message-square" class="w-6 h-6"></i>
                    </div>
                    <div class="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">Messages</div>
                    <div class="text-[10px] text-slate-400 font-medium">Contacter l'équipe</div>
                </button>

            </div>

            <!-- TWO COLUMNS -->
            <div class="grid md:grid-cols-2 gap-4 w-full min-w-0">
                <!-- URGENCIES -->
                <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 overflow-hidden min-w-0 w-full">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <div class="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i data-lucide="alert-triangle" class="w-4 h-4 text-red-500"></i>
                        </div>
                        <span class="truncate">Urgences (7 jours)</span>
                        ${totalUrgentShifts > 0 ? `<span class="ml-auto px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex-shrink-0">${urgentEvents.length}</span>` : ''}
                    </h3>
                    <div class="space-y-2 overflow-x-hidden min-w-0">
                        ${urgentHtml}
                    </div>
                </div>

                <!-- RECENT ACTIVITY -->
                <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 overflow-hidden min-w-0 w-full">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <div class="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i data-lucide="activity" class="w-4 h-4 text-blue-500"></i>
                        </div>
                        <span class="truncate">Activité récente</span>
                    </h3>
                    <div class="divide-y divide-slate-100 overflow-x-hidden min-w-0">
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
        const dayStr = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeStr = (mission.start_time || '').slice(0, 5);

        // Countdown
        const now = new Date();
        const eventDate = new Date(mission.event.date);
        const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
        const countdownText = diffDays === 0 ? "Aujourd'hui" : diffDays === 1 ? "Demain" : `Dans ${diffDays}j`;

        return `
            <div class="mb-6">
                <h2 class="text-lg font-bold text-slate-900 mb-3 px-1 flex items-center gap-2">
                    <i data-lucide="calendar-check" class="w-5 h-5 text-brand-500"></i>
                    Prochaine mission inscrite
                </h2>
                <button data-link="/events" class="w-full text-left bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-brand-500 to-indigo-600"></div>
                    <div class="pl-4">
                        <div class="flex items-center justify-between">
                            <div class="flex-1 min-w-0">
                                <span class="font-bold text-slate-800 text-sm">${escapeHtml(mission.event.title)}</span>
                                <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                    <span>${dayStr}</span>
                                    <span class="text-slate-300">•</span>
                                    <span>${timeStr}</span>
                                    <span class="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">${countdownText}</span>
                                </div>
                            </div>
                            <i data-lucide="chevron-right" class="w-4 h-4 text-brand-400 group-hover:translate-x-1 transition-transform flex-shrink-0"></i>
                        </div>
                    </div>
                </button>
            </div>
        `;
    }

    return `
        <div class="mb-6">
            <h2 class="text-lg font-bold text-slate-900 mb-3 px-1 flex items-center gap-2">
                <i data-lucide="calendar-check" class="w-5 h-5 text-brand-500"></i>
                Prochaine mission inscrite
            </h2>
            <button data-link="/events" class="w-full text-left bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-slate-300 to-slate-400"></div>
                <div class="pl-4">
                    <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0">
                            <span class="font-bold text-slate-500 text-sm">Aucune mission inscrite</span>
                            <div class="text-[11px] text-slate-400 mt-1">Inscrivez-vous à une mission</div>
                        </div>
                        <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform flex-shrink-0"></i>
                    </div>
                </div>
            </button>
        </div>
    `;
}
