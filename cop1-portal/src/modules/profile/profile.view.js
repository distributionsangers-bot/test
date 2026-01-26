import { ProfileService } from './profile.service.js';
import { store } from '../../core/store.js';
import { toggleLoader, showToast, escapeHtml, showConfirm } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { supabase } from '../../services/supabase.js';

export async function renderProfile(container, params) {
    if (!container) return;

    const currentUserId = store.state.user?.id;
    const targetUserId = params?.id || currentUserId;
    const isMe = (targetUserId === currentUserId);

    // Skeleton
    container.innerHTML = `
        <div class="animate-pulse max-w-2xl mx-auto mt-10 space-y-6">
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
                <p class="text-red-500 font-bold">Impossible de charger le profil.</p>
            </div>
        `;
        createIcons({ icons, root: container });
        return;
    }

    // Compute stats
    const stats = computeStats(history, profile);
    const badges = computeBadges(stats, profile);

    const fullName = escapeHtml(`${profile.first_name || ''} ${profile.last_name || ''}`);
    const email = escapeHtml(profile.email || '');
    const initial = (profile.first_name || '?')[0].toUpperCase();
    const avatarUrl = profile.avatar_url || null;
    const hours = profile.total_hours || 0;
    const hasPermit = profile.has_permit;
    const isMandatory = profile.mandatory_hours;
    const phone = profile.phone || '';

    // Status badge
    let statusConfig = { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Inconnu', icon: 'help-circle' };
    if (profile.status === 'pending') statusConfig = { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente', icon: 'clock' };
    else if (profile.status === 'approved') statusConfig = { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Validé', icon: 'check-circle' };
    else if (profile.status === 'rejected') statusConfig = { bg: 'bg-red-100', text: 'text-red-700', label: 'Refusé', icon: 'x-circle' };

    container.innerHTML = `
        <div class="max-w-2xl mx-auto pb-32 space-y-6 animate-fade-in">
            
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
                                    ${isMandatory ? '🎓 Scolaire' : '💚 Bénévole'}
                                </span>
                                ${hasPermit ? `<span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm">🚗 Permis</span>` : ''}
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
                    <p class="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-1">Heures</p>
                    <p class="text-3xl font-black"><span id="stat-hours">${hours}</span><span class="text-lg opacity-60">h</span></p>
                </div>

                <!-- Missions -->
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div class="absolute -right-4 -bottom-4 opacity-10">
                        <i data-lucide="calendar-check" class="w-20 h-20 text-brand-600"></i>
                    </div>
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Missions</p>
                    <p id="stat-missions" class="text-3xl font-black text-slate-900">${stats.totalMissions}</p>
                </div>

                <!-- Presence Rate -->
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div class="absolute -right-4 -bottom-4 opacity-10">
                        <i data-lucide="trending-up" class="w-20 h-20 text-blue-600"></i>
                    </div>
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Présence</p>
                    <p id="stat-presence" class="text-3xl font-black ${stats.presenceRate >= 80 ? 'text-emerald-600' : stats.presenceRate >= 50 ? 'text-amber-600' : 'text-red-500'}">${stats.presenceRate}<span class="text-lg opacity-60">%</span></p>
                </div>

                <!-- Upcoming -->
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div class="absolute -right-4 -bottom-4 opacity-10">
                        <i data-lucide="rocket" class="w-20 h-20 text-purple-600"></i>
                    </div>
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">À venir</p>
                    <p id="stat-upcoming" class="text-3xl font-black text-purple-600">${stats.upcoming}</p>
                </div>
            </div>

            <!-- BADGES -->
            ${badges.length > 0 ? `
            <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <i data-lucide="award" class="w-5 h-5 text-amber-500"></i>
                    Badges obtenus
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
                        Historique
                    </button>
                    ${isMe ? `
                    <button id="tab-edit" class="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center gap-2 border-b-2 border-transparent">
                        <i data-lucide="settings" class="w-4 h-4"></i>
                        Paramètres
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
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Prénom</label>
                                <input name="first_name" value="${escapeHtml(profile.first_name || '')}" type="text" class="w-full p-4 bg-slate-50 rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all" placeholder="Prénom">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Nom</label>
                                <input name="last_name" value="${escapeHtml(profile.last_name || '')}" type="text" class="w-full p-4 bg-slate-50 rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all" placeholder="Nom">
                            </div>
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Téléphone</label>
                            <input name="phone" value="${escapeHtml(phone)}" type="tel" class="w-full p-4 bg-slate-50 rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all" placeholder="06 00 00 00 00">
                        </div>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block flex items-center gap-2">
                                    <input type="checkbox" name="has_permit" ${hasPermit ? 'checked' : ''} class="w-5 h-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500">
                                    J'ai le permis de conduire
                                </label>
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block flex items-center gap-2">
                                    <input type="checkbox" name="mandatory_hours" ${isMandatory ? 'checked' : ''} class="w-5 h-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500">
                                    Heures obligatoires (scolaire)
                                </label>
                            </div>
                        </div>
                        <div class="pt-4 border-t border-slate-100">
                            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Nouveau mot de passe (optionnel)</label>
                            <input name="password" type="password" class="w-full p-4 bg-slate-50 rounded-2xl font-semibold border-2 border-slate-100 outline-none focus:border-brand-400 focus:bg-white transition-all" placeholder="••••••••">
                        </div>
                        <button type="submit" class="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/30 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            <i data-lucide="save" class="w-5 h-5"></i>
                            Enregistrer les modifications
                        </button>
                    </form>

                    <!-- Danger Zone -->
                    <div class="pt-6 border-t border-slate-100">
                        <h4 class="text-xs font-bold text-red-500 uppercase tracking-wider mb-3">Zone dangereuse</h4>
                        <button id="btn-delete-account" class="w-full py-4 border-2 border-red-100 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                            Supprimer mon compte
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
        const shift = item.shifts;
        const event = shift?.events;
        if (!shift || !event) return;

        const eventEnd = new Date(`${event.date}T${shift.end_time}`);
        const isPast = now > eventEnd;
        const isPresent = item.attended === true || item.status === 'present' || (item.hours_added && item.hours_added > 0);

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

    if (hours >= 100) badges.push({ emoji: '🏆', label: 'Centenaire', bg: 'bg-amber-100', text: 'text-amber-800' });
    else if (hours >= 50) badges.push({ emoji: '⭐', label: '50 heures', bg: 'bg-yellow-100', text: 'text-yellow-800' });
    else if (hours >= 10) badges.push({ emoji: '🌟', label: 'Débutant', bg: 'bg-blue-100', text: 'text-blue-800' });

    if (stats.totalMissions >= 20) badges.push({ emoji: '🎯', label: 'Vétéran', bg: 'bg-purple-100', text: 'text-purple-800' });
    else if (stats.totalMissions >= 10) badges.push({ emoji: '💪', label: '10+ missions', bg: 'bg-green-100', text: 'text-green-800' });
    else if (stats.totalMissions >= 5) badges.push({ emoji: '🚀', label: '5 missions', bg: 'bg-indigo-100', text: 'text-indigo-800' });

    if (stats.presenceRate === 100 && stats.pastCount >= 5) {
        badges.push({ emoji: '✅', label: 'Fiabilité max', bg: 'bg-emerald-100', text: 'text-emerald-800' });
    }

    if (profile.has_permit) badges.push({ emoji: '🚗', label: 'Conducteur', bg: 'bg-slate-100', text: 'text-slate-700' });

    return badges;
}

function renderHistoryList(history) {
    if (!history || history.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="calendar-x" class="w-8 h-8 text-slate-300"></i>
                </div>
                <p class="text-slate-400 font-semibold">Aucune mission pour le moment</p>
                <p class="text-xs text-slate-300 mt-1">Inscrivez-vous à un événement !</p>
            </div>
        `;
    }

    return `<div class="space-y-3">${history.map(item => {
        const shift = item.shifts;
        const event = shift?.events;
        if (!shift || !event) return '';

        const date = new Date(event.date);
        const isPast = new Date() > new Date(`${event.date}T${shift.end_time}`);
        const isPresent = item.attended === true || item.status === 'present' || (item.hours_added && item.hours_added > 0);
        const isAbsent = item.status === 'absent';

        let config = { border: 'border-slate-100', bg: 'bg-white', icon: 'calendar', iconColor: 'text-slate-400', badge: '', badgeBg: '' };

        if (isPresent) {
            config = { border: 'border-emerald-200', bg: 'bg-emerald-50/50', icon: 'check-circle', iconColor: 'text-emerald-600', badge: 'Présent', badgeBg: 'bg-emerald-100 text-emerald-700' };
        } else if (isAbsent) {
            config = { border: 'border-red-200', bg: 'bg-red-50/50', icon: 'x-circle', iconColor: 'text-red-500', badge: 'Absent', badgeBg: 'bg-red-100 text-red-700' };
        } else if (isPast) {
            // Past but neither present nor explicitly absent => Non pointé (or Absent implicitly?)
            // User complaint suggests default fallback was 'Non pointé'
            config = { border: 'border-amber-200', bg: 'bg-amber-50/50', icon: 'help-circle', iconColor: 'text-amber-500', badge: 'Non pointé', badgeBg: 'bg-amber-100 text-amber-700' };
        } else {
            // Future
            config = { border: 'border-blue-200', bg: 'bg-blue-50/50', icon: 'clock', iconColor: 'text-blue-500', badge: 'À venir', badgeBg: 'bg-blue-100 text-blue-700' };
        }

        return `
            <div class="flex items-center gap-4 p-4 rounded-2xl border-2 ${config.border} ${config.bg} transition-all hover:shadow-md">
                <div class="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center flex-shrink-0">
                    <i data-lucide="${config.icon}" class="w-6 h-6 ${config.iconColor}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-900 text-sm truncate">${escapeHtml(event.title)}</h4>
                    <p class="text-xs text-slate-500 truncate">${escapeHtml(shift.title)} • ${date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    ${item.hours_added ? `<span class="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">+${item.hours_added}h</span>` : ''}
                    <span class="text-[10px] font-bold px-2 py-1 rounded-lg ${config.badgeBg}">${config.badge}</span>
                </div>
            </div>
        `;
    }).join('')}</div>`;
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);

        const data = {
            first_name: fd.get('first_name'),
            last_name: fd.get('last_name'),
            phone: fd.get('phone'),
            has_permit: fd.get('has_permit') === 'on',
            mandatory_hours: fd.get('mandatory_hours') === 'on',
            password: fd.get('password')
        };

        toggleLoader(true);
        const res = await ProfileService.updateProfile(uid, data);
        toggleLoader(false);

        if (res.error) {
            showToast("Erreur mise à jour: " + (res.error.message || 'Erreur'), "error");
        } else {
            showToast("Profil mis à jour avec succès ✓");
            // Update store
            if (store.state.profile) {
                store.state.profile.first_name = data.first_name;
                store.state.profile.last_name = data.last_name;
                store.state.profile.phone = data.phone;
                store.state.profile.has_permit = data.has_permit;
                store.state.profile.mandatory_hours = data.mandatory_hours;
            }
            // Trigger UI Refresh
            refreshProfile(uid);

            if (data.password) form.querySelector('[name=password]').value = '';
        }
    });
}



function setupDelete(c, uid) {
    const btn = c.querySelector('#btn-delete-account');
    if (!btn) return;

    btn.addEventListener('click', () => {
        showConfirm(
            "Supprimer définitivement votre compte ? Cette action est irréversible.",
            async () => {
                // Prompt for email confirmation
                const email = prompt("Pour confirmer, entrez votre email :");
                if (email !== store.state.user?.email) {
                    showToast("Email incorrect", "error");
                    return;
                }

                toggleLoader(true);
                const res = await ProfileService.deleteAccount(uid);
                if (res.error) {
                    toggleLoader(false);
                    showToast("Erreur: " + res.error.message, "error");
                } else {
                    await supabase.auth.signOut();
                    window.location.reload();
                }
            },
            { type: 'danger', confirmText: 'Supprimer' }
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
        let statusConfig = { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Inconnu', icon: 'help-circle' };
        if (profile.status === 'pending') statusConfig = { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente', icon: 'clock' };
        else if (profile.status === 'approved') statusConfig = { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Validé', icon: 'check-circle' };
        else if (profile.status === 'rejected') statusConfig = { bg: 'bg-red-100', text: 'text-red-700', label: 'Refusé', icon: 'x-circle' };

        elTags.innerHTML = `
            <span class="px-3 py-1.5 rounded-xl text-xs font-bold ${statusConfig.bg} ${statusConfig.text} flex items-center gap-1.5">
                <i data-lucide="${statusConfig.icon}" class="w-3.5 h-3.5"></i>
                ${statusConfig.label}
            </span>
            <span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
                ${profile.mandatory_hours ? '🎓 Scolaire' : '💚 Bénévole'}
            </span>
            ${profile.has_permit ? `<span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm">🚗 Permis</span>` : ''}
        `;
        createIcons({ icons, root: elTags });
    }

    // Update Stats
    const elHours = document.getElementById('stat-hours');
    if (elHours) elHours.textContent = profile.total_hours || 0;

    const elMissions = document.getElementById('stat-missions');
    if (elMissions) elMissions.textContent = stats.totalMissions;

    const elPresence = document.getElementById('stat-presence');
    if (elPresence) {
        elPresence.innerHTML = `${stats.presenceRate}<span class="text-lg opacity-60">%</span>`;
        // Update color
        elPresence.className = `text-3xl font-black ${stats.presenceRate >= 80 ? 'text-emerald-600' : stats.presenceRate >= 50 ? 'text-amber-600' : 'text-red-500'}`;
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
