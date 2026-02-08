import { ProfileService } from './profile.service.js';
import { store } from '../../core/store.js';
import { toggleLoader, showToast, escapeHtml, showConfirm, showPrompt, formatIdentity } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { supabase } from '../../services/supabase.js';
import { SCHOOLS } from '../../core/schools.js';
import { t } from '../../services/i18n.js';

export async function renderProfile(container, params) {
    if (!container) return;

    const currentUserId = store.state.user?.id;
    const targetUserId = params?.id || currentUserId;
    const isMe = (targetUserId === currentUserId);

    // Skeleton
    container.innerHTML = `
        <div class="animate-pulse max-w-4xl mx-auto mt-10 space-y-6">
            <div class="h-48 bg-gradient-to-r from-slate-200 to-slate-300 rounded-3xl"></div>
            <div class="h-24 bg-slate-100 rounded-3xl"></div>
            <div class="grid grid-cols-3 gap-4">
                <div class="h-28 bg-slate-100 rounded-2xl"></div>
                <div class="h-28 bg-slate-100 rounded-2xl"></div>
                <div class="h-28 bg-slate-100 rounded-2xl"></div>
            </div>
        </div>
    `;

    const { profile, history, error } = await ProfileService.getProfileAndHistory(targetUserId);

    if (error || !profile) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <i data-lucide="user-x" class="w-10 h-10 text-red-400"></i>
                </div>
                <p class="text-red-500 font-bold">${t('profile.error.load')}</p>
            </div>
        `;
        createIcons({ icons, root: container });
        return;
    }

    // Compute stats
    const stats = computeStats(history, profile);
    const badges = computeBadges(stats, profile);

    const fullName = escapeHtml(formatIdentity(profile.first_name, profile.last_name));
    const email = escapeHtml(profile.email || '');
    const initial = (profile.first_name || '?')[0].toUpperCase();
    const avatarUrl = profile.avatar_url || null;
    const hours = profile.total_hours || 0;
    const hasPermit = profile.has_permit;
    const isMandatory = profile.mandatory_hours;
    const phone = profile.phone || '';

    // Status badge
    let statusConfig = { bg: 'bg-slate-100', text: 'text-slate-600', label: t('status.unknown'), icon: 'help-circle' };
    if (profile.status === 'pending') statusConfig = { bg: 'bg-amber-100', text: 'text-amber-700', label: t('status.pending.label'), icon: 'clock' };
    else if (profile.status === 'approved') statusConfig = { bg: 'bg-emerald-100', text: 'text-emerald-700', label: t('status.approved'), icon: 'check-circle' };
    else if (profile.status === 'rejected') statusConfig = { bg: 'bg-red-100', text: 'text-red-700', label: t('status.rejected.label'), icon: 'x-circle' };

    container.innerHTML = `
        <div class="max-w-4xl mx-auto pb-32 space-y-6 animate-fade-in">
            
            <!-- HERO HEADER -->
            <div class="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-700 shadow-2xl shadow-brand-500/30">
                <!-- Background Pattern -->
                <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
                
                <div class="relative p-8 pt-12">
                    <div class="flex flex-col md:flex-row items-center gap-6">
                        <!-- Avatar -->
                        <div class="relative">
                            <div id="avatar-container" class="w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-4xl font-black shadow-xl border-4 border-white/30 overflow-hidden">
                                <span id="profile-initial">${initial}</span>
                            </div>
                            ${profile.is_admin ? `
                            <div class="absolute -top-1 -right-1 w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                                <i data-lucide="shield" class="w-4 h-4 text-amber-900"></i>
                            </div>
                            ` : ''}
                        </div>
                        
                        <!-- Info -->
                        <div class="flex-1 text-center md:text-left text-white">
                            <h1 id="profile-fullname" class="text-3xl font-black tracking-tight mb-1">${fullName}</h1>
                            <p id="profile-email" class="text-brand-200 font-medium mb-3">${email}</p>
                            <div id="profile-tags" class="flex flex-wrap justify-center md:justify-start gap-2">
                                <span class="px-3 py-1.5 rounded-xl text-xs font-bold ${statusConfig.bg} ${statusConfig.text} flex items-center gap-1.5">
                                    <i data-lucide="${statusConfig.icon}" class="w-3.5 h-3.5"></i>
                                    ${statusConfig.label}
                                </span>
                                <span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
                                    ${isMandatory ? `🎓 ${t('profile.badges.student')}` : `💚 ${t('profile.badges.volunteer')}`}
                                </span>
                                ${hasPermit ? `<span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm">🚗 ${t('profile.badges.permit')}</span>` : ''}
                                ${profile.school ? `<span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm flex items-center gap-1"><i data-lucide="graduation-cap" class="w-3.5 h-3.5"></i> ${escapeHtml(profile.school)}</span>` : ''}
                            </div>
                        </div>


                    </div>
                </div>
            </div>

            <!-- STATS GRID -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <!-- Hours -->
                <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
                    <div class="absolute -right-4 -bottom-4 opacity-20">
                        <i data-lucide="clock" class="w-20 h-20"></i>
                    </div>
                    <p class="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-1">${t('profile.stats.hours')}</p>
                    <p class="text-3xl font-black"><span id="stat-hours">${hours}</span><span class="text-lg opacity-60">h</span></p>
                </div>

                <!-- Missions -->
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div class="absolute -right-4 -bottom-4 opacity-10">
                        <i data-lucide="calendar-check" class="w-20 h-20 text-brand-600"></i>
                    </div>
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">${t('profile.stats.missions')}</p>
                    <p id="stat-missions" class="text-3xl font-black text-slate-900">${stats.totalMissions}</p>
                </div>

                <!-- Presence Rate -->
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div class="absolute -right-4 -bottom-4 opacity-10">
                        <i data-lucide="trending-up" class="w-20 h-20 text-blue-600"></i>
                    </div>
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">${t('profile.stats.presence')}</p>
                    <p id="stat-presence" class="text-3xl font-black ${stats.presenceRate >= 80 ? 'text-emerald-600' : stats.presenceRate >= 50 ? 'text-amber-600' : 'text-red-500'}">${stats.presenceRate}<span class="text-lg opacity-60">%</span></p>
                </div>

                <!-- Upcoming -->
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div class="absolute -right-4 -bottom-4 opacity-10">
                        <i data-lucide="rocket" class="w-20 h-20 text-purple-600"></i>
                    </div>
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">${t('profile.stats.upcoming')}</p>
                    <p id="stat-upcoming" class="text-3xl font-black text-purple-600">${stats.upcoming}</p>
                </div>
            </div>

            <!-- BADGES -->
            ${badges.length > 0 ? `
            <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <i data-lucide="award" class="w-5 h-5 text-amber-500"></i>
                    ${t('profile.badges.title')}
                </h3>
                <div class="flex flex-wrap gap-3">
                    ${badges.map(b => `
                        <div class="flex items-center gap-2 px-4 py-2.5 rounded-2xl ${b.bg} ${b.text} font-bold text-sm shadow-sm">
                            <span class="text-xl">${b.emoji}</span>
                            <span>${b.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- TABS -->
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div class="flex border-b border-slate-100">
                    <button id="tab-history" class="flex-1 py-4 text-sm font-bold text-brand-600 border-b-2 border-brand-600 transition-all flex items-center justify-center gap-2">
                        <i data-lucide="history" class="w-4 h-4"></i>
                        ${t('profile.tabs.history')}
                    </button>
                    ${isMe ? `
                    <button id="tab-edit" class="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center gap-2 border-b-2 border-transparent">
                        <i data-lucide="settings" class="w-4 h-4"></i>
                        ${t('profile.tabs.settings')}
                    </button>
                    ` : ''}
                </div>

                <!-- History Content -->
                <div id="content-history" class="p-5">
                    ${renderHistoryList(history)}
                </div>

                <!-- Edit Content -->
                ${isMe ? `
                <div id="content-edit" class="hidden p-5 space-y-6">
                    <form id="form-profile-update" class="space-y-5">
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">${t('profile.form.firstName')}</label>
                                <input name="first_name" value="${escapeHtml(profile.first_name || '')}" type="text" class="w-full p-4 bg-slate-50 rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all" placeholder="${t('profile.form.firstName')}">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">${t('profile.form.lastName')}</label>
                                <input name="last_name" value="${escapeHtml(profile.last_name || '')}" type="text" class="w-full p-4 bg-slate-50 rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all" placeholder="${t('profile.form.lastName')}">
                            </div>
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">${t('profile.form.phone')}</label>
                            <input name="phone" value="${escapeHtml(phone)}" type="tel" class="w-full p-4 bg-slate-50 rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all" placeholder="06 00 00 00 00">
                        </div>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block flex items-center gap-2">
                                    <input type="checkbox" name="has_permit" ${hasPermit ? 'checked' : ''} class="w-5 h-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500">
                                    ${t('profile.form.hasPermit')}
                                </label>
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block flex items-center gap-2">
                                    <input type="checkbox" name="mandatory_hours" ${isMandatory ? 'checked' : ''} class="w-5 h-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500">
                                    ${t('profile.form.mandatoryHours')}
                                </label>
                            </div>
                        </div>
                        <div class="pt-4 border-t border-slate-100">
                            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">${t('profile.form.newPassword')}</label>
                            <div class="relative">
                                <input id="profile-password" name="password" type="password" class="w-full p-4 pr-12 bg-slate-50 rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all" placeholder="••••••••">
                                <button type="button" id="toggle-profile-password" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors" tabindex="-1">
                                    <i data-lucide="eye" class="w-5 h-5"></i>
                                </button>
                            </div>
                            
                            <!-- Password Strength Indicator -->
                            <div id="profile-password-strength" class="hidden mt-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2.5 animate-fade-in">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">${t('auth.password.strength.title')}</span>
                                    <span id="profile-strength-label" class="text-[10px] font-bold uppercase tracking-wide text-slate-400">—</span>
                                </div>
                                <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div id="profile-strength-bar" class="h-full w-0 rounded-full transition-all duration-300 ease-out"></div>
                                </div>
                                <div class="grid grid-cols-2 gap-1.5 pt-1">
                                    <div id="profile-req-length" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                        <i data-lucide="circle" class="w-3 h-3"></i>
                                        <span>${t('auth.password.requirements.length')}</span>
                                    </div>
                                    <div id="profile-req-upper" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                        <i data-lucide="circle" class="w-3 h-3"></i>
                                        <span>${t('auth.password.requirements.upper')}</span>
                                    </div>
                                    <div id="profile-req-lower" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                        <i data-lucide="circle" class="w-3 h-3"></i>
                                        <span>${t('auth.password.requirements.lower')}</span>
                                    </div>
                                    <div id="profile-req-number" class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                        <i data-lucide="circle" class="w-3 h-3"></i>
                                        <span>${t('auth.password.requirements.number')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">${t('profile.form.school')}</label>
                            
                            <!-- Premium Combobox Container -->
                            <div class="space-y-2 relative z-50">
                                <div class="relative group">
                                    <input type="hidden" name="school" id="profile-school-hidden" value="${escapeHtml(profile.school || '')}">
                                    
                                    <!-- Search Input -->
                                    <input type="text" id="profile-school-search" placeholder="${t('profile.form.searchSchool')}" autocomplete="off"
                                        class="w-full p-4 pl-12 bg-slate-50 rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all cursor-pointer hover:bg-white placeholder:text-slate-400 text-slate-800"
                                        value="${escapeHtml(profile.school || '')}">
                                    
                                    <!-- Icons -->
                                    <i data-lucide="graduation-cap" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none"></i>
                                    <i id="profile-school-chevron" data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-transform duration-300 pointer-events-none"></i>

                                    <!-- Dropdown -->
                                    <div id="profile-school-dropdown" class="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto hidden opacity-0 translate-y-2 transition-all duration-200 scrollbar-hide z-50">
                                        <div id="profile-school-list" class="p-2 space-y-0.5">
                                            <!-- Injected via JS -->
                                        </div>
                                    </div>
                                </div>

                                <!-- Custom "Autre" Input -->
                                <div id="profile-school-other-container" class="hidden space-y-1.5 animate-fade-in relative z-40 pt-1">
                                    <label class="text-[10px] font-bold text-brand-600 uppercase ml-1">${t('profile.form.specifySchool')}</label>
                                    <div class="relative group">
                                        <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                            <i data-lucide="building-2" class="w-5 h-5"></i>
                                        </div>
                                        <input id="profile-school-other" type="text" 
                                            class="w-full pl-12 pr-4 py-3 bg-slate-50/50 border-2 border-slate-100 rounded-2xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 transition-all duration-300" 
                                            placeholder="${t('profile.form.schoolName')}">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/30 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            <i data-lucide="save" class="w-5 h-5"></i>
                            ${t('profile.form.saveChanges')}
                        </button>
                    </form>

                    <!-- Danger Zone -->
                    <div class="pt-6 border-t border-slate-100">
                        <h4 class="text-xs font-bold text-red-500 uppercase tracking-wider mb-3">${t('profile.dangerZone.title')}</h4>
                        <button id="btn-delete-account" class="w-full py-4 border-2 border-red-100 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                            ${t('profile.dangerZone.deleteAccount')}
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    createIcons({ icons, root: container });
    setupTabs(container);

    if (isMe) {
        setupEditForm(container, profile.id);
        setupDelete(container, profile.id);
    }
}

function computeStats(history, profile) {
    const now = new Date();
    let totalMissions = history?.length || 0;
    let presentCount = 0;
    let pastCount = 0;
    let upcoming = 0;

    history?.forEach(item => {
        // Data is already flattened by ProfileService
        if (!item.date || !item.endTime) return;

        const eventEnd = new Date(`${item.date}T${item.endTime}`);
        const isPast = now > eventEnd;
        const isPresent = item.attended === true;

        if (isPast) {
            pastCount++;
            if (isPresent) presentCount++;
        } else {
            upcoming++;
        }
    });

    const presenceRate = pastCount > 0 ? Math.round((presentCount / pastCount) * 100) : 100;

    return { totalMissions, presenceRate, upcoming, pastCount, presentCount };
}

function computeBadges(stats, profile) {
    const badges = [];
    const hours = profile.total_hours || 0;

    if (hours >= 100) badges.push({ emoji: '🏆', label: t('profile.badges.centenarian'), bg: 'bg-amber-100', text: 'text-amber-800' });
    else if (hours >= 50) badges.push({ emoji: '⭐', label: t('profile.badges.hours50'), bg: 'bg-yellow-100', text: 'text-yellow-800' });
    else if (hours >= 10) badges.push({ emoji: '🌟', label: t('profile.badges.beginner'), bg: 'bg-blue-100', text: 'text-blue-800' });

    if (stats.totalMissions >= 20) badges.push({ emoji: '🎯', label: t('profile.badges.veteran'), bg: 'bg-purple-100', text: 'text-purple-800' });
    else if (stats.totalMissions >= 10) badges.push({ emoji: '💪', label: t('profile.badges.missions10'), bg: 'bg-green-100', text: 'text-green-800' });
    else if (stats.totalMissions >= 5) badges.push({ emoji: '🚀', label: t('profile.badges.missions5'), bg: 'bg-indigo-100', text: 'text-indigo-800' });

    if (stats.presenceRate === 100 && stats.pastCount >= 5) {
        badges.push({ emoji: '✅', label: t('profile.badges.reliable'), bg: 'bg-emerald-100', text: 'text-emerald-800' });
    }

    if (profile.has_permit) badges.push({ emoji: '🚗', label: t('profile.badges.driver'), bg: 'bg-slate-100', text: 'text-slate-700' });

    return badges;
}

function renderHistoryList(history) {
    if (!history || history.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="calendar-x" class="w-8 h-8 text-slate-300"></i>
                </div>
                <p class="text-slate-400 font-semibold">${t('profile.history.empty')}</p>
                <p class="text-xs text-slate-300 mt-1">${t('profile.history.join')}</p>
            </div>
        `;
    }

    // Group by event name and date
    const groupedByEvent = {};

    history.forEach(item => {
        const key = `${item.eventName}|${item.date}`;
        if (!groupedByEvent[key]) {
            groupedByEvent[key] = {
                eventName: item.eventName,
                date: item.date,
                location: item.location,
                shifts: []
            };
        }
        groupedByEvent[key].shifts.push(item);
    });

    const eventGroups = Object.values(groupedByEvent).sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });

    const items = eventGroups.map(event => {
        const date = new Date(event.date);

        return `
            <div class="rounded-2xl border-2 border-slate-100 overflow-hidden hover:shadow-md transition-all">
                <!-- Event Header -->
                <div class="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4 border-b border-slate-200">
                    <h4 class="font-bold text-slate-900 text-base mb-1">${escapeHtml(event.eventName)}</h4>
                    <p class="text-xs text-slate-500">
                        ${event.location ? escapeHtml(event.location) + ' • ' : ''}
                        ${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                
                <!-- Shifts List -->
                <div class="divide-y divide-slate-100">
                    ${event.shifts.map(shift => {
            const eventEndTime = new Date(`${shift.date}T${shift.endTime}`);
            const isPast = new Date() > eventEndTime;
            const isAttended = shift.attended === true;
            const isValidated = shift.validated === true;
            // New Condition: Attended BUT 0 hours (likely quota overflow)
            const isQuotaOverflow = isAttended && shift.hours === 0;

            let config = {
                icon: 'calendar-x',
                iconColor: 'text-slate-400',
                badge: `❌ ${t('profile.history.absent')}`,
                badgeBg: 'bg-slate-100 text-slate-700'
            };

            if (isQuotaOverflow) {
                config = {
                    icon: 'alert-circle',
                    iconColor: 'text-amber-500',
                    badge: `⚠️ ${t('profile.history.quotaExceeded')}`,
                    badgeBg: 'bg-amber-50 text-amber-600 border border-amber-200'
                };
            } else if (isAttended) {
                config = {
                    icon: 'check-circle',
                    iconColor: 'text-emerald-600',
                    badge: `✓ ${t('profile.history.present')}`,
                    badgeBg: 'bg-emerald-100 text-emerald-700'
                };
            } else if (isValidated) {
                config = {
                    icon: 'clipboard-list',
                    iconColor: 'text-orange-600',
                    badge: `📋 ${t('profile.history.registered')}`,
                    badgeBg: 'bg-orange-100 text-orange-700'
                };
            } else if (!isPast) {
                config = {
                    icon: 'clock',
                    iconColor: 'text-blue-500',
                    badge: `⏳ ${t('profile.history.upcoming')}`,
                    badgeBg: 'bg-blue-100 text-blue-700'
                };
            }

            return `
                            <div class="flex items-center gap-4 p-4">
                                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <i data-lucide="${config.icon}" class="w-5 h-5 ${config.iconColor}"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-semibold text-slate-900">${shift.startTime} - ${shift.endTime}</p>
                                    <p class="text-xs text-slate-500">${shift.hours}h</p>
                                </div>
                                <div class="flex flex-col items-end">
                                    <span class="text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap ${config.badgeBg}">${config.badge}</span>
                                    ${isQuotaOverflow ? `<span class="text-[9px] text-amber-600 mt-1 font-medium">${t('profile.history.volunteerSchool')}</span>` : ''}
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }).join('');

    return `<div class="space-y-4">${items}</div>`;
}

function setupTabs(c) {
    const tabs = ['history', 'edit'];
    tabs.forEach(t => {
        const btn = c.querySelector(`#tab-${t}`);
        if (!btn) return;
        btn.addEventListener('click', () => {
            tabs.forEach(x => {
                const b = c.querySelector(`#tab-${x}`);
                const content = c.querySelector(`#content-${x}`);
                if (b) {
                    b.className = "flex-1 py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center gap-2 border-b-2 border-transparent";
                }
                if (content) content.classList.add('hidden');
            });
            btn.className = "flex-1 py-4 text-sm font-bold text-brand-600 border-b-2 border-brand-600 transition-all flex items-center justify-center gap-2";
            c.querySelector(`#content-${t}`)?.classList.remove('hidden');
        });
    });
}

function setupEditForm(c, uid) {
    const form = c.querySelector('#form-profile-update');
    if (!form) return;

    // Password Toggle
    const toggleBtn = c.querySelector('#toggle-profile-password');
    const passInput = c.querySelector('#profile-password');

    if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', () => {
            const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passInput.setAttribute('type', type);
            toggleBtn.innerHTML = `<i data-lucide="${type === 'password' ? 'eye' : 'eye-off'}" class="w-5 h-5"></i>`;
            createIcons({ icons, nameAttr: 'data-lucide', attrs: { class: "w-5 h-5" } });
        });
    }

    // Password Strength Validation
    const strengthContainer = c.querySelector('#profile-password-strength');
    const strengthBar = c.querySelector('#profile-strength-bar');
    const strengthLabel = c.querySelector('#profile-strength-label');
    const reqLength = c.querySelector('#profile-req-length');
    const reqUpper = c.querySelector('#profile-req-upper');
    const reqLower = c.querySelector('#profile-req-lower');
    const reqNumber = c.querySelector('#profile-req-number');

    function updateRequirement(el, isValid) {
        if (!el) return;
        // Find existing icon element (could be i or svg after Lucide processing)
        const existingIcon = el.querySelector('i, svg');

        if (isValid) {
            el.classList.remove('text-slate-400');
            el.classList.add('text-green-600');
            // Replace with new icon if needed
            if (existingIcon) {
                existingIcon.outerHTML = '<i data-lucide="check-circle" class="w-3 h-3"></i>';
            }
        } else {
            el.classList.remove('text-green-600');
            el.classList.add('text-slate-400');
            if (existingIcon) {
                existingIcon.outerHTML = '<i data-lucide="circle" class="w-3 h-3"></i>';
            }
        }
    }

    function checkPasswordStrength(password) {
        if (!strengthBar || !strengthLabel) return null;

        const checks = {
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /[0-9]/.test(password)
        };

        updateRequirement(reqLength, checks.length);
        updateRequirement(reqUpper, checks.upper);
        updateRequirement(reqLower, checks.lower);
        updateRequirement(reqNumber, checks.number);

        createIcons({ icons, nameAttr: 'data-lucide', attrs: { class: "w-3 h-3" } });

        const score = Object.values(checks).filter(Boolean).length;

        const configs = [
            { width: '0%', color: 'bg-slate-300', label: '—', labelColor: 'text-slate-400' },
            { width: '25%', color: 'bg-red-500', label: t('auth.password.strength.weak'), labelColor: 'text-red-500' },
            { width: '50%', color: 'bg-orange-500', label: t('auth.password.strength.medium'), labelColor: 'text-orange-500' },
            { width: '75%', color: 'bg-yellow-500', label: t('auth.password.strength.good'), labelColor: 'text-yellow-500' },
            { width: '100%', color: 'bg-green-500', label: t('auth.password.strength.strong'), labelColor: 'text-green-600' }
        ];

        const config = configs[score];
        strengthBar.className = `h-full rounded-full transition-all duration-300 ease-out ${config.color}`;
        strengthBar.style.width = config.width;
        strengthLabel.textContent = config.label;
        strengthLabel.className = `text-[10px] font-bold uppercase tracking-wide ${config.labelColor}`;

        return checks;
    }

    if (passInput && strengthContainer) {
        passInput.addEventListener('focus', () => {
            strengthContainer.classList.remove('hidden');
        });

        passInput.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value);
        });
    }

    // --- Premium School Combobox Logic (Profile) ---
    const schoolInput = c.querySelector('#profile-school-search');
    const schoolHidden = c.querySelector('#profile-school-hidden');
    const schoolDropdown = c.querySelector('#profile-school-dropdown');
    const schoolList = c.querySelector('#profile-school-list');
    const schoolChevron = c.querySelector('#profile-school-chevron');

    // "Other" Elements
    const otherContainer = c.querySelector('#profile-school-other-container');
    const otherInput = c.querySelector('#profile-school-other');

    if (schoolInput && schoolHidden) {
        const sortedSchools = [...SCHOOLS].sort((a, b) => a.localeCompare(b));

        const renderSchools = (filter = '') => {
            if (!schoolList) return;
            const search = filter.toLowerCase();
            const filtered = sortedSchools.filter(s => s.toLowerCase().includes(search));

            if (filtered.length === 0) {
                schoolList.innerHTML = `<div class="px-3 py-2 text-xs text-slate-400 font-medium text-center">${t('common.noResult')}</div>`;
                return;
            }

            schoolList.innerHTML = filtered.map(s => `
                <div data-value="${s}" class="school-option px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-brand-50 hover:text-brand-700 cursor-pointer flex items-center gap-2 transition-colors">
                    <span class="w-1.5 h-1.5 rounded-full bg-brand-200 opacity-0 transition-opacity"></span>
                    ${s}
                </div>
            `).join('');

            // Re-attach listeners
            schoolList.querySelectorAll('.school-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    selectSchool(opt.dataset.value);
                });
            });
        };

        const toggleDropdown = (show) => {
            if (show) {
                schoolDropdown.classList.remove('hidden');
                requestAnimationFrame(() => {
                    schoolDropdown.classList.remove('opacity-0', 'translate-y-2');
                });
                schoolChevron.classList.add('rotate-180');
            } else {
                schoolDropdown.classList.add('opacity-0', 'translate-y-2');
                setTimeout(() => schoolDropdown.classList.add('hidden'), 200);
                schoolChevron.classList.remove('rotate-180');
            }
        };

        const selectSchool = (val) => {
            schoolInput.value = val;
            schoolHidden.value = val;

            // Handle "Autre" logic
            if (val === 'Autre') {
                otherContainer.classList.remove('hidden');
                otherInput.focus();
            } else {
                otherContainer.classList.add('hidden');
                otherInput.value = ''; // Reset
            }

            toggleDropdown(false);
            schoolInput.classList.remove('text-slate-400');
            schoolInput.classList.add('text-slate-800');
        };

        // Init List
        renderSchools();

        // Events
        schoolInput.addEventListener('focus', () => toggleDropdown(true));
        schoolInput.addEventListener('click', () => toggleDropdown(true));
        schoolInput.addEventListener('input', (e) => {
            renderSchools(e.target.value);
            toggleDropdown(true);
            schoolHidden.value = e.target.value; // Allow custom typing fallback
        });

        // Click Outside
        document.addEventListener('click', (e) => {
            if (!schoolInput.contains(e.target) && !schoolDropdown.contains(e.target)) {
                toggleDropdown(false);
            }
        });

        // Pre-fill "Other" if existing value is not in list (or we could improve this later)
        // For now, if current value is complex and not in list, we assume it was a custom entry (Autre logic)
        // But since we store the resolved string, we can't easily distinguish 'Autre' -> 'Custom' vs just 'Custom'.
        // Simple fix: If value is not in SCHOOLS list and not empty, set hidden='Autre' and otherInput=Value ? 
        // Or just let the input text be the value. 
        // Current implementation: `schoolHidden` stores the value properly. `schoolInput` shows it.
        // If user wants to change, they search. If they pick "Autre", custom input shows. 
        // If they pick standard, custom input hides.
        // This is fine. (Edge case: User keeps existing custom value -> Input shows it -> Dropdown shows it typed -> OK)
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const password = fd.get('password')?.trim();

        // Validate password if provided
        if (password) {
            const checks = {
                length: password.length >= 8,
                upper: /[A-Z]/.test(password),
                lower: /[a-z]/.test(password),
                number: /[0-9]/.test(password)
            };
            const allValid = Object.values(checks).every(Boolean);
            if (!allValid) {
                showToast("Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre", "error");
                return;
            }
        }

        // Handle School Value
        let schoolVal = fd.get('school');

        // If "Autre" was selected, or if user typed "Autre" (unlikely but possible), check custom input
        // Note: `fd.get('school')` gets the value from the hidden input.
        if (schoolVal === 'Autre') {
            const custom = otherInput.value.trim();
            if (!custom) {
                showToast(t('profile.form.error.specifySchool'), "error");
                otherInput.focus();
                return;
            }
            schoolVal = custom;
        }

        const data = {
            first_name: fd.get('first_name'),
            last_name: fd.get('last_name'),
            phone: fd.get('phone'),
            has_permit: fd.get('has_permit') === 'on',
            mandatory_hours: fd.get('mandatory_hours') === 'on',
            school: schoolVal,
            password: password
        };

        toggleLoader(true);
        const res = await ProfileService.updateProfile(uid, data);
        toggleLoader(false);

        if (res.error) {
            showToast(t('profile.form.error.update') + ": " + (res.error.message || 'Erreur'), "error");
        } else {
            showToast(t('profile.form.success.update'));
            // Update store
            if (store.state.profile) {
                store.state.profile.first_name = data.first_name;
                store.state.profile.last_name = data.last_name;
                store.state.profile.phone = data.phone;
                store.state.profile.has_permit = data.has_permit;
                store.state.profile.mandatory_hours = data.mandatory_hours;
                store.state.profile.school = data.school;
            }
            // Trigger UI Refresh
            refreshProfile(uid);

            if (data.password) form.querySelector('[name=password]').value = '';
            // Hide strength indicator
            if (strengthContainer) strengthContainer.classList.add('hidden');
        }
    });
}



function setupDelete(c, uid) {
    const btn = c.querySelector('#btn-delete-account');
    if (!btn) return;

    btn.addEventListener('click', () => {
        showConfirm(
            t('profile.dangerZone.confirmDelete'),
            async () => {
                showPrompt(
                    t('profile.dangerZone.confirmEmail'),
                    async (email) => {
                        if (email !== store.state.user?.email) {
                            showToast(t('profile.dangerZone.errorEmail'), "error");
                            return;
                        }

                        toggleLoader(true);
                        const res = await ProfileService.deleteAccount(uid);
                        if (res.error) {
                            toggleLoader(false);
                            showToast(t('common.error') + ": " + res.error.message, "error");
                        } else {
                            await supabase.auth.signOut();
                            window.location.reload();
                        }
                    },
                    { title: "Confirmation de sécurité", confirmText: "Supprimer définitivement", cancelText: "Annuler", placeholder: store.state.user?.email }
                );
            },
            { type: 'danger', confirmText: 'Continuer' }
        );
    });
}


export async function initProfile(params) {
    const currentUserId = store.state.user?.id;
    const targetUserId = params?.id || currentUserId;

    // Realtime Subscription
    const channel = supabase.channel(`profile-${targetUserId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'registrations', filter: `user_id=eq.${targetUserId}` },
            () => refreshProfile(targetUserId)
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${targetUserId}` },
            () => refreshProfile(targetUserId)
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

async function refreshProfile(userId) {
    const { profile, history } = await ProfileService.getProfileAndHistory(userId);
    if (!profile) return;

    const stats = computeStats(history, profile);

    // 3. Update Profile Header Elements
    const elFullname = document.getElementById('profile-fullname');
    if (elFullname) elFullname.textContent = `${profile.first_name || ''} ${profile.last_name || ''}`;

    const elEmail = document.getElementById('profile-email');
    if (elEmail) elEmail.textContent = profile.email || '';

    const elInitial = document.getElementById('profile-initial');
    if (elInitial) elInitial.textContent = (profile.first_name || '?')[0].toUpperCase();

    // Re-render Tags
    const elTags = document.getElementById('profile-tags');
    if (elTags) {
        let statusConfig = { bg: 'bg-slate-100', text: 'text-slate-600', label: t('status.unknown'), icon: 'help-circle' };
        if (profile.status === 'pending') statusConfig = { bg: 'bg-amber-100', text: 'text-amber-700', label: t('status.pending.label'), icon: 'clock' };
        else if (profile.status === 'approved') statusConfig = { bg: 'bg-emerald-100', text: 'text-emerald-700', label: t('status.approved'), icon: 'check-circle' };
        else if (profile.status === 'rejected') statusConfig = { bg: 'bg-red-100', text: 'text-red-700', label: t('status.rejected.label'), icon: 'x-circle' };

        const mandatoryLabel = profile.mandatory_hours ? `🎓 ${t('profile.badges.student')}` : `💚 ${t('profile.badges.volunteer')}`;
        let tagsHtml = '<span class="px-3 py-1.5 rounded-xl text-xs font-bold ' + statusConfig.bg + ' ' + statusConfig.text + ' flex items-center gap-1.5">' +
            '<i data-lucide="' + statusConfig.icon + '" class="w-3.5 h-3.5"></i>' +
            statusConfig.label +
            '</span>' +
            '<span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm">' +
            mandatoryLabel +
            '</span>';

        if (profile.has_permit) {
            tagsHtml += '<span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm">🚗 Permis</span>';
        }

        if (profile.school) {
            tagsHtml += '<span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm flex items-center gap-1"><i data-lucide="graduation-cap" class="w-3.5 h-3.5"></i> ' + escapeHtml(profile.school) + '</span>';
        }

        elTags.innerHTML = tagsHtml;
        createIcons({ icons, root: elTags });
    }

    // Update Stats
    const elHours = document.getElementById('stat-hours');
    if (elHours) elHours.textContent = profile.total_hours || 0;

    const elMissions = document.getElementById('stat-missions');
    if (elMissions) elMissions.textContent = stats.totalMissions;

    const elPresence = document.getElementById('stat-presence');
    if (elPresence) {
        elPresence.innerHTML = stats.presenceRate + '<span class="text-lg opacity-60">%</span>';
        // Update color
        let presenceColor = stats.presenceRate >= 80 ? 'text-emerald-600' : stats.presenceRate >= 50 ? 'text-amber-600' : 'text-red-500';
        elPresence.className = 'text-3xl font-black ' + presenceColor;
    }

    const elUpcoming = document.getElementById('stat-upcoming');
    if (elUpcoming) elUpcoming.textContent = stats.upcoming;

    // Update History List
    const elHistory = document.getElementById('content-history');
    if (elHistory) {
        elHistory.innerHTML = renderHistoryList(history);
        createIcons({ icons, root: elHistory });
    }
}
