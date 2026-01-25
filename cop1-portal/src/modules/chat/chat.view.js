import { ChatService } from './chat.service.js';
import { store } from '../../core/store.js';
import { showToast, toggleLoader, escapeHtml, formatDate, showConfirm } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';

let currentTicketId = null;
let realtimeSubscription = null;
let ticketsCache = [];

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅', '👏', '🎉', '💪', '👋'];

export async function initChat() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
    }
    currentTicketId = null;
    ticketsCache = [];
}

export async function renderChat(container, params = {}) {
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;

    // PREMIUM GLASSMORPHISM BACKGROUND & LAYOUT
    container.innerHTML = `
        <!-- Main Container: Fits within layout, preserves bottom nav (increased offset for mobile tab bar) -->
        <div class="relative h-[calc(100dvh-140px)] md:h-[calc(100vh-64px)] w-full overflow-hidden flex flex-col md:flex-row md:bg-white/60 md:backdrop-blur-xl md:rounded-3xl md:border md:border-white/50 md:shadow-2xl">
            
            <!-- Animated Blobs Background -->
            <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
                <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200 rounded-full blur-[80px] animate-blob"></div>
                <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200 rounded-full blur-[80px] animate-blob animation-delay-2000"></div>
                <div class="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-pink-100 rounded-full blur-[80px] animate-blob animation-delay-4000"></div>
            </div>

            <!-- LIST PANEL -->
            <div id="chat-list-panel" class="absolute md:relative inset-0 z-20 w-full h-full flex flex-col bg-slate-50 md:bg-white/80 md:backdrop-blur-xl md:bg-transparent md:border-r border-white/40 transition-transform duration-300 ${params.id ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}">
                
                <!-- Header (Immersive Gradient like Missions) -->
                <div class="px-5 py-5 pt-safe flex justify-between items-center bg-gradient-to-br from-brand-600 to-brand-500 shadow-lg shadow-brand-500/20 md:rounded-tl-2xl flex-shrink-0 z-10">
                    <div>
                        <h1 class="font-extrabold text-2xl text-white tracking-tight flex items-center gap-2">
                            <i data-lucide="message-circle" class="w-6 h-6 text-brand-100"></i>
                            Messages
                        </h1>
                        <p class="text-xs font-medium text-brand-100 uppercase tracking-widest mt-0.5 opacity-90">Vos échanges</p>
                    </div>
                    <button id="btn-new-ticket" class="w-10 h-10 rounded-full bg-white text-brand-600 border border-white/50 flex items-center justify-center hover:bg-brand-50 transition active:scale-95 shadow-lg">
                        <i data-lucide="plus" class="w-5 h-5 font-bold"></i>
                    </button>
                </div>

                <!-- Tickets List -->
                <div id="tickets-container" class="flex-1 overflow-y-auto no-scrollbar py-2 space-y-1 px-2 bg-slate-50/50">
                    ${renderSkeletonList()}
                </div>
            </div>

            <!-- CONVERSATION PANEL -->
            <div id="chat-conversation-panel" class="absolute md:relative inset-0 z-30 w-full h-full flex flex-col bg-white transition-transform duration-300 ${params.id ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}">
                
                <!-- Empty State (Desktop only) -->
                <div id="chat-empty-state" class="hidden md:flex absolute inset-0 flex-col items-center justify-center text-center p-8 z-0 bg-white">
                    <div class="w-24 h-24 bg-gradient-to-br from-slate-100 to-white rounded-3xl shadow-xl flex items-center justify-center mb-6 rotate-3">
                        <i data-lucide="message-square" class="w-10 h-10 text-slate-300"></i>
                    </div>
                    <h2 class="text-xl font-bold text-slate-800 mb-2">Sélectionnez une conversation</h2>
                    <p class="text-slate-400 text-sm">Choisissez un échange dans la liste à gauche</p>
                </div>

                <!-- Active Conversation -->
                <div id="active-conversation-wrapper" class="flex flex-col h-full w-full relative z-10 bg-white ${!params.id ? 'hidden' : ''}">
                    
                    <!-- Header -->
                    <div id="chat-header" class="px-4 py-3 pt-safe bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm flex items-center justify-between flex-shrink-0 z-20">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <button id="btn-back-list" class="md:hidden w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-full transition active:scale-95 -ml-2">
                                <i data-lucide="chevron-left" class="w-6 h-6"></i>
                            </button>
                            
                            <div id="active-ticket-info" class="flex items-center gap-3 overflow-hidden">
                                <!-- Dynamic Content -->
                            </div>
                        </div>
                        
                         <div class="relative">
                            <button id="btn-chat-options" class="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                                <i data-lucide="more-vertical" class="w-5 h-5"></i>
                            </button>
                            <div id="chat-options-dropdown" class="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 hidden transform origin-top-right transition-all z-50">
                                <div id="ticket-actions-container"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Messages Area -->
                    <div id="messages-container" class="flex-1 overflow-y-auto px-4 py-4 overscroll-contain space-y-4 scroll-smooth bg-slate-50">
                        <!-- Loading / Messages -->
                    </div>

                    <!-- Input Area (Anchored Solid Bar) -->
                    <form id="chat-input-form" class="flex-shrink-0 bg-white border-t border-slate-200 px-3 py-3 z-30">
                        <div class="flex items-end gap-2 max-w-4xl mx-auto">
                            <!-- Emoji Button -->
                            <button type="button" id="btn-emoji" class="w-10 h-10 text-slate-400 hover:text-amber-500 rounded-full flex items-center justify-center transition flex-shrink-0 hover:bg-slate-50">
                                <i data-lucide="smile" class="w-6 h-6"></i>
                            </button>

                            <!-- Input Field -->
                            <div class="flex-1 bg-slate-100 rounded-[24px] border border-transparent focus-within:border-brand-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
                                <input id="message-input" type="text" autocomplete="off" placeholder="Message..." 
                                    class="w-full px-4 py-2.5 bg-transparent text-[15px] text-slate-800 placeholder-slate-400 outline-none leading-relaxed">
                            </div>

                            <!-- Emoji Picker (Positioned above bar) -->
                            <div id="emoji-picker" class="absolute bottom-full left-2 mb-2 p-3 bg-white rounded-2xl shadow-2xl border border-slate-100 hidden z-50 animate-slide-up origin-bottom-left w-64">
                                <div class="grid grid-cols-6 gap-1">
                                    ${EMOJI_LIST.map(e => `<button type="button" class="emoji-btn w-9 h-9 text-lg hover:bg-slate-100 rounded-lg transition flex items-center justify-center active:scale-90">${e}</button>`).join('')}
                                </div>
                            </div>
                            
                            <!-- Send Button -->
                            <button type="submit" id="btn-send" class="w-10 h-10 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-brand-700 transition active:scale-90 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                                <i data-lucide="send-horizontal" class="w-5 h-5 ml-0.5"></i>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // New ticket modal
    appendNewTicketModal(isAdmin);

    createIcons({ icons, root: container });
    await setupEventListeners(container);
    await loadTicketsList();

    if (params.id) {
        await openTicket(params.id);
    }
}

// ... (KEEPING appendNewTicketModal AS IS BUT MODERNIZED STYLING IN PLACE) ...
async function appendNewTicketModal(isAdmin) {
    // ... Volunteer fetch logic (Keep existing logic) ...
    let volunteersHtml = '';
    if (isAdmin) {
        const { data: volunteers } = await import('../../services/supabase.js').then(m =>
            m.supabase.from('profiles').select('id, first_name, last_name, email').eq('status', 'approved').order('first_name')
        );
        if (volunteers && volunteers.length > 0) {
            volunteersHtml = `
                <div id="volunteer-selector-wrapper" class="hidden animate-fade-in">
                    <label class="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">Destinataire</label>
                    <div class="relative group">
                        <i data-lucide="search" class="absolute left-3 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition"></i>
                        <input type="text" id="volunteer-search" placeholder="Rechercher un bénévole..." 
                            class="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold border border-slate-200 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition">
                    </div>
                    <!-- Dropdown styled similarly -->
                     <div id="volunteers-dropdown" class="mt-2 max-h-48 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-xl hidden custom-scrollbar">
                        ${volunteers.map(v => `
                            <button type="button" class="volunteer-option w-full text-left px-4 py-3 hover:bg-brand-50 transition flex items-center gap-3 border-b border-slate-50 last:border-0" data-id="${v.id}" data-name="${v.first_name || ''} ${v.last_name || ''}">
                                <div class="w-8 h-8 bg-gradient-to-br from-brand-100 to-indigo-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-black shadow-sm flex-shrink-0">
                                    ${(v.first_name || '?')[0].toUpperCase()}
                                </div>
                                <div class="min-w-0">
                                    <div class="text-sm font-bold text-slate-700 truncate">${v.first_name || ''} ${v.last_name || ''}</div>
                                    <div class="text-[10px] text-slate-400 truncate">${v.email}</div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                    <input type="hidden" name="target_user_id" id="input-target-user">
                    <div id="selected-volunteer" class="hidden mt-3 p-3 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-between">
                        <div class="flex items-center gap-2">
                             <div class="w-2 h-2 rounded-full bg-brand-500"></div>
                             <span class="text-sm font-bold text-brand-700" id="selected-volunteer-name"></span>
                        </div>
                        <button type="button" id="btn-clear-volunteer" class="w-6 h-6 rounded-full hover:bg-brand-100 text-brand-500 flex items-center justify-center transition">
                            <i data-lucide="x" class="w-3 h-3"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Prevent duplicates
    const existingModal = document.getElementById('create-ticket-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'create-ticket-modal';
    modal.className = 'fixed inset-0 bg-slate-900/60 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm hidden animate-fade-in';
    modal.innerHTML = `
        <div class="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl p-6 pb-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-6">
                <div>
                     <h3 class="font-black text-2xl text-slate-800 tracking-tight">Nouvelle discussion</h3>
                     <p class="text-slate-500 text-sm font-medium">Commencez un échange</p>
                </div>
                <button id="btn-close-modal" class="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:rotate-90 transition duration-300">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <form id="form-create-ticket" class="space-y-5">
                ${isAdmin ? `
                <div class="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-xl">
                    <button type="button" data-type="support" class="btn-type-select py-2.5 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm ring-1 ring-black/5 transition">💬 Support</button>
                    <button type="button" data-type="direct" class="btn-type-select py-2.5 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition">👤 Direct</button>
                    <button type="button" data-type="announcement" class="btn-type-select py-2.5 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition">📢 Annonce</button>
                    <input type="hidden" name="type" id="input-ticket-type" value="support">
                </div>
                ${volunteersHtml}
                ` : '<input type="hidden" name="type" value="support">'}

                <div class="space-y-1">
                     <label class="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Sujet</label>
                     <input name="subject" placeholder="Ex: Question sur le planning..." required 
                        class="w-full px-4 py-3.5 bg-slate-50 rounded-xl text-sm font-semibold border border-slate-200 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition">
                </div>
                
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Message</label>
                    <textarea name="content" rows="4" placeholder="Votre message..." required 
                        class="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium border border-slate-200 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition resize-none"></textarea>
                </div>

                <div class="pt-2">
                    <button type="submit" class="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-brand-500/30 hover:shadow-xl hover:scale-[1.02] transition active:scale-[0.98] flex items-center justify-center gap-2">
                        <span>Créer la conversation</span>
                        <i data-lucide="arrow-right" class="w-5 h-5"></i>
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    createIcons({ icons, root: modal });
    if (isAdmin) setupVolunteerSearch(modal);
}

// ... (KEEPING renderSkeletonList AS IS) ...
function renderSkeletonList() {
    return Array(5).fill(0).map(() => `
        <div class="flex items-center gap-4 p-3 rounded-2xl bg-white/40 animate-pulse">
            <div class="w-12 h-12 bg-slate-200/50 rounded-full flex-shrink-0"></div>
            <div class="flex-1 space-y-2">
                <div class="h-3 bg-slate-200/50 rounded w-2/3"></div>
                <div class="h-2.5 bg-slate-100/50 rounded w-full"></div>
            </div>
        </div>
    `).join('');
}


// ... (KEEPING loadTicketsList LOGIC BUT UPDATING RENDER FUNCTION) ...
async function loadTicketsList() {
    const container = document.getElementById('tickets-container');
    if (!container) return;

    const { data: tickets, error } = await ChatService.getTickets();
    if (error) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center opacity-60">
                 <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-3">
                    <i data-lucide="alert-circle" class="w-8 h-8 text-red-400"></i>
                </div>
                <p class="text-slate-500 text-sm font-bold">Erreur de chargement</p>
                <button onclick="window.location.reload()" class="mt-2 text-xs text-brand-500 font-bold hover:underline">Réessayer</button>
            </div>
        `;
        createIcons({ icons, root: container });
        return;
    }
    ticketsCache = tickets || [];

    if (!tickets || tickets.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center opacity-60">
                <img src="https://illustrations.popsy.co/amber/surr-mailbox.svg" class="w-32 h-32 mb-4 opacity-80" alt="Empty">
                <p class="text-slate-500 text-sm font-bold">Aucune conversation</p>
                <p class="text-slate-400 text-xs mt-1">Commencez une nouvelle discussion !</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tickets.map(t => renderTicketItem(t)).join('');
    createIcons({ icons, root: container });
}

function renderTicketItem(t) {
    const isAnnouncement = t.category === 'announcement';
    const isActive = currentTicketId === t.id;
    const isClosed = t.status === 'closed';

    // Fallback if data structure slightly different, handled in service normally
    const preview = t.last_message ? escapeHtml(t.last_message).slice(0, 35) + (t.last_message.length > 35 ? '...' : '') : 'Nouvelle conversation';
    const timeAgo = formatTimeAgo(t.updated_at || t.created_at);

    // Avatar Logic
    let avatarHtml = '';

    if (isAnnouncement) {
        avatarHtml = `
            <div class="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <i data-lucide="megaphone" class="w-5 h-5"></i>
            </div>
        `;
    } else {
        // Initials Logic
        let initials = '?';
        if (t.profiles) {
            const first = t.profiles.first_name?.[0] || '';
            const last = t.profiles.last_name?.[0] || '';
            initials = (first + last).toUpperCase() || '?';
        }

        avatarHtml = `
            <div class="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-sm border border-brand-200">
                ${initials}
            </div>
        `;
    }

    return `
        <div class="ticket-item w-full group relative flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${isActive ? 'bg-white shadow-md ring-1 ring-black/5' : 'hover:bg-white/50 hover:shadow-sm border border-transparent'}" data-ticket-id="${t.id}">
            
            ${avatarHtml}
            
            <!-- Content -->
            <div class="flex-1 min-w-0 pr-8">
                <div class="flex items-center justify-between gap-1">
                    <span class="font-bold text-[13px] text-slate-800 truncate ${isActive ? 'text-brand-700' : ''}">${escapeHtml(t.subject)}</span>
                    <span class="text-[10px] font-semibold text-slate-400 flex-shrink-0">${timeAgo}</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs text-slate-500 truncate font-medium group-hover:text-slate-600 transition-colors">${preview}</span>
                    ${isClosed ? '<div class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Résolu"></div>' : ''}
                </div>
            </div>

            <!-- Delete Button (Visible on hover desktop, always on touch if we could but here simpler) -->
            <button class="btn-delete-item absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-white transition-all z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100" title="Supprimer">
                 <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
            
            ${isActive ? '<div class="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-brand-500 rounded-r-full"></div>' : ''}
        </div>
    `;
}

// ... event listeners update ...
async function setupEventListeners(container) {
    // Event Delegation for persistent elements
    container.addEventListener('click', (e) => {
        // New Ticket Button
        if (e.target.closest('#btn-new-ticket')) {
            document.getElementById('create-ticket-modal')?.classList.remove('hidden');
        }
    });

    // Close modal (updated ID)
    document.getElementById('btn-close-modal')?.addEventListener('click', () => {
        document.getElementById('create-ticket-modal')?.classList.add('hidden');
    });
    // Click outside
    document.getElementById('create-ticket-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'create-ticket-modal') e.target.classList.add('hidden');
    });

    // Type Selector logic
    const updateTypeSelect = (targetBtn) => {
        document.querySelectorAll('.btn-type-select').forEach(b => {
            b.className = 'btn-type-select py-2.5 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition';
        });
        targetBtn.className = 'btn-type-select py-2.5 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm ring-1 ring-black/5 transition';
        const type = targetBtn.dataset.type;
        document.getElementById('input-ticket-type').value = type;

        const wrapper = document.getElementById('volunteer-selector-wrapper');
        if (wrapper) {
            if (type === 'direct') {
                wrapper.classList.remove('hidden');
                // Auto-focus search for better UX
                setTimeout(() => document.getElementById('volunteer-search')?.focus(), 100);
            } else {
                wrapper.classList.add('hidden');
            }
        }
    };

    document.querySelectorAll('.btn-type-select').forEach(btn => {
        btn.addEventListener('click', () => updateTypeSelect(btn));
    });

    // Create form
    document.getElementById('form-create-ticket')?.addEventListener('submit', handleCreateTicket);

    // List navigation (Mobile)
    document.getElementById('btn-back-list')?.addEventListener('click', () => {
        document.getElementById('chat-list-panel').classList.remove('-translate-x-full');
        document.getElementById('chat-conversation-panel').classList.remove('translate-x-0');
        document.getElementById('chat-conversation-panel').classList.add('translate-x-full');
        // Wait animation
        setTimeout(() => {
            // Reset UI state if needed
        }, 300);
        currentTicketId = null;
    });

    // Ticket selection & Delete
    document.getElementById('tickets-container')?.addEventListener('click', async (e) => {
        // Handle Delete first
        const deleteBtn = e.target.closest('.btn-delete-item');
        if (deleteBtn) {
            e.stopPropagation();
            const item = deleteBtn.closest('.ticket-item');
            if (item) handleDeleteTicket(item.dataset.ticketId);
            return;
        }

        const item = e.target.closest('.ticket-item');
        if (item) {
            const id = item.dataset.ticketId;
            // Mobile Transition
            if (window.innerWidth < 768) {
                document.getElementById('chat-list-panel').classList.add('-translate-x-full');
                document.getElementById('chat-conversation-panel').classList.remove('translate-x-full');
                document.getElementById('chat-conversation-panel').classList.add('translate-x-0');
            }
            await openTicket(id);
        }
    });

    // Chat Options Dropdown
    const optsBtn = document.getElementById('btn-chat-options');
    const optsMenu = document.getElementById('chat-options-dropdown');

    optsBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        optsMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-chat-options') && !e.target.closest('#chat-options-dropdown')) {
            optsMenu?.classList.add('hidden');
        }
    });

    // Send Message
    document.getElementById('chat-input-form')?.addEventListener('submit', handleSendMessage);

    // Emojis
    const emojiBtn = document.getElementById('btn-emoji');
    const emojiPicker = document.getElementById('emoji-picker');
    emojiBtn?.addEventListener('click', () => emojiPicker.classList.toggle('hidden'));

    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById('message-input');
            input.value += btn.textContent;
            input.focus();
            emojiPicker.classList.add('hidden');
        });
    });
}


// ... (KEEPING handleCreateTicket - minor adjustments for styling classes already done in modal HTML) ...
async function handleCreateTicket(e) {
    e.preventDefault();
    const form = e.target;
    // ... same logic ...
    const fd = new FormData(form);
    const type = fd.get('type');
    const targetUserId = fd.get('target_user_id');

    if (type === 'direct' && !targetUserId) {
        showToast("Sélectionnez un bénévole", "error");
        return;
    }

    toggleLoader(true);
    let res;
    // ... calling service ...
    if (type === 'announcement') {
        res = await ChatService.createAnnouncement(fd.get('subject'), fd.get('content'));
    } else if (type === 'direct') {
        res = await ChatService.createDirectMessage(targetUserId, fd.get('subject'), fd.get('content'));
    } else {
        res = await ChatService.createTicket(fd.get('subject'), fd.get('content'));
    }
    toggleLoader(false);

    if (res.error) {
        showToast(res.error.message || "Erreur création", "error");
        return;
    }

    document.getElementById('create-ticket-modal')?.classList.add('hidden');
    form.reset();
    showToast("Conversation créée ✓");
    await loadTicketsList();

    if (res.data?.id) {
        // Mobile transition manual trigger if needed
        if (window.innerWidth < 768) {
            document.getElementById('chat-list-panel').classList.add('-translate-x-full');
            document.getElementById('chat-conversation-panel').classList.remove('translate-x-full');
            document.getElementById('chat-conversation-panel').classList.add('translate-x-0');
        }
        await openTicket(res.data.id);
    }
}

// ... Volunteer Search Logic (Already good) ...
function setupVolunteerSearch(modal) {
    // ... Keep existing logic unchanged ...
    const searchInput = modal.querySelector('#volunteer-search');
    const dropdown = modal.querySelector('#volunteers-dropdown');
    const options = modal.querySelectorAll('.volunteer-option');
    const selectedDiv = modal.querySelector('#selected-volunteer');
    const selectedName = modal.querySelector('#selected-volunteer-name');
    const clearBtn = modal.querySelector('#btn-clear-volunteer');
    const hiddenInput = modal.querySelector('#input-target-user');

    if (!searchInput || !dropdown) return;

    searchInput.addEventListener('focus', () => dropdown.classList.remove('hidden'));
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        options.forEach(opt => {
            const name = opt.dataset.name.toLowerCase();
            opt.classList.toggle('hidden', !name.includes(query));
        });
        dropdown.classList.remove('hidden');
    });

    options.forEach(opt => {
        opt.addEventListener('click', () => {
            hiddenInput.value = opt.dataset.id;
            selectedName.textContent = opt.dataset.name;
            selectedDiv.classList.remove('hidden');
            dropdown.classList.add('hidden');
            searchInput.value = '';
        });
    });

    clearBtn?.addEventListener('click', () => {
        hiddenInput.value = '';
        selectedDiv.classList.add('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#volunteer-selector-wrapper')) {
            dropdown.classList.add('hidden');
        }
    });
}

// --- OPEN TICKET LOGIC ---

async function openTicket(id) {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
    }
    currentTicketId = id;

    // Hide empty state, show active
    document.getElementById('chat-empty-state')?.classList.add('hidden');
    const activeWrapper = document.getElementById('active-conversation-wrapper');
    activeWrapper?.classList.remove('hidden', 'opacity-0', 'pointer-events-none');

    // Update List Active State
    document.querySelectorAll('.ticket-item').forEach(el => {
        const isActive = el.dataset.ticketId === id;
        if (isActive) {
            el.className = 'ticket-item w-full group relative flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer bg-white shadow-md ring-1 ring-black/5';
            if (!el.querySelector('.absolute.left-0')) {
                el.insertAdjacentHTML('beforeend', '<div class="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-brand-500 rounded-r-full"></div>');
            }
        } else {
            el.className = 'ticket-item w-full group relative flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer hover:bg-white/50 hover:shadow-sm border border-transparent';
            el.querySelector('.absolute.left-0')?.remove();
        }
    });

    // Loading State
    const msgContainer = document.getElementById('messages-container');
    msgContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full animate-pulse">
            <div class="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mb-4"></div>
            <p class="text-xs font-bold text-brand-300 uppercase tracking-widest">Chargement</p>
        </div>
    `;

    const { data: messages, error } = await ChatService.getMessages(id);
    const ticket = ticketsCache.find(t => t.id === id) || (await ChatService.getTickets()).data?.find(t => t.id === id);

    if (error || !ticket) {
        msgContainer.innerHTML = `<div class="text-center py-10 text-red-500 font-bold">Erreur lors de la récupération de la conversation</div>`;
        return;
    }

    // Update Header info
    updateChatHeader(ticket);

    // Render Messages
    renderMessages(msgContainer, messages);

    // Subscribe
    realtimeSubscription = ChatService.subscribeToTicket(id, (newMsg) => {
        appendMessage(msgContainer, newMsg, true);
    });
}

function updateChatHeader(ticket) {
    const container = document.getElementById('active-ticket-info');
    const actionContainer = document.getElementById('ticket-actions-container');

    const isAnnouncement = ticket.category === 'announcement';
    const isClosed = ticket.status === 'closed';
    const isOwner = ticket.user_id === store.state.user.id;
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;

    // Header Content
    let icon = isAnnouncement ? 'megaphone' : 'message-circle';
    let colorClass = isAnnouncement ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-600';

    container.innerHTML = `
        <div class="w-10 h-10 ${colorClass} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
            <i data-lucide="${icon}" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0 flex flex-col">
            <h2 class="font-bold text-slate-800 text-sm truncate leading-tight">${escapeHtml(ticket.subject)}</h2>
            <div class="flex items-center gap-2">
                 <span class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 rounded-md uppercase tracking-wide">
                    ${isAnnouncement ? 'Annonce' : 'Support'}
                 </span>
                 ${isClosed ? '<span class="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><i data-lucide="check-circle-2" class="w-3 h-3"></i> Résolu</span>' : ''}
            </div>
        </div>
    `;

    // Actions Dropdown Content
    let actionsHtml = '';

    // Close Action (Admin only)
    if (isAdmin && !isClosed) {
        actionsHtml += `
            <button id="btn-close-ticket" class="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 transition">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                Marquer résolu
            </button>
        `;
    }

    // Delete Action (Admin OR Owner)
    if (isAdmin || isOwner) {
        actionsHtml += `
            <button id="btn-delete-ticket" class="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
                Supprimer
            </button>
        `;
    }

    if (!actionsHtml) {
        actionsHtml = `<div class="px-4 py-2 text-xs text-slate-400 font-medium italic">Aucune action disponible</div>`;
    }

    actionContainer.innerHTML = actionsHtml;
    // Re-bind listeners because we replaced innerHTML
    document.getElementById('btn-close-ticket')?.addEventListener('click', () => handleCloseTicket(ticket.id));
    document.getElementById('btn-delete-ticket')?.addEventListener('click', () => handleDeleteTicket(ticket.id));
}

function renderMessages(container, messages) {
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center opacity-50 pb-10">
                <div class="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                     <i data-lucide="message-square-dashed" class="w-10 h-10 text-slate-300"></i>
                </div>
                <p class="text-slate-500 font-bold text-sm">C'est calme ici...</p>
                <p class="text-slate-400 text-xs">Envoyez le premier message !</p>
            </div>
        `;
        return;
    }

    const currentUserId = store.state.user?.id;
    let html = '';
    let lastDate = '';
    let lastSenderId = '';

    // Add extra padding at top
    html += '<div class="h-4"></div>';

    messages.forEach((msg) => {
        const isMine = msg.user_id === currentUserId;
        const msgDate = new Date(msg.created_at);
        const dateStr = msgDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = msgDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        // Date Separator
        if (dateStr !== lastDate) {
            html += `
                <div class="flex justify-center my-6">
                    <span class="px-3 py-1 bg-slate-100/80 backdrop-blur-sm text-[10px] font-bold text-slate-500 rounded-full shadow-sm border border-white/50 border-white uppercase tracking-wider">
                        ${dateStr}
                    </span>
                </div>
            `;
            lastDate = dateStr;
            lastSenderId = '';
        }

        const isSequence = lastSenderId === msg.user_id;
        lastSenderId = msg.user_id;

        const senderName = msg.profiles ? msg.profiles.first_name : 'Utilisateur';

        if (isMine) {
            html += `
                <div class="flex justify-end ${isSequence ? 'mt-1' : 'mt-4'} animate-slide-up">
                    <div class="max-w-[80%] md:max-w-[70%]">
                        <div class="group relative px-4 py-3 bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-2xl ${isSequence ? 'rounded-tr-lg' : 'rounded-tr-sm'} shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-shadow">
                            <p class="text-[14px] leading-relaxed break-words font-medium">${escapeHtml(msg.content)}</p>
                            <p class="text-[9px] text-brand-100 text-right mt-1 font-medium opacity-80">${timeStr}</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="flex justify-start ${isSequence ? 'mt-1' : 'mt-4'} animate-slide-up">
                    <div class="max-w-[80%] md:max-w-[70%]">
                        ${!isSequence ? `<p class="ml-4 mb-1 text-[11px] font-bold text-slate-400">${senderName}</p>` : ''}
                        <div class="group relative px-4 py-3 bg-white/90 backdrop-blur-sm border border-white/50 text-slate-700 rounded-2xl ${isSequence ? 'rounded-tl-lg' : 'rounded-tl-sm'} shadow-sm">
                            <p class="text-[14px] leading-relaxed break-words font-medium">${escapeHtml(msg.content)}</p>
                            <p class="text-[9px] text-slate-400 mt-1 font-medium">${timeStr}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    // Add extra padding at bottom for input
    html += '<div class="h-2"></div>';

    container.innerHTML = html;
    createIcons({ icons, root: container });
    // Scroll to bottom
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 50);
}

function appendMessage(container, msg, scroll) {
    const currentUserId = store.state.user?.id;
    const isMine = msg.user_id === currentUserId;
    const timeStr = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Remove Empty State
    const empty = container.querySelector('.opacity-50');
    if (empty) empty.remove();

    // Create element manually to append
    const div = document.createElement('div');

    if (isMine) {
        div.innerHTML = `
            <div class="flex justify-end mt-4 animate-scale-in">
                <div class="max-w-[80%] md:max-w-[70%] text-right">
                    <div class="inline-block px-4 py-3 bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-2xl rounded-tr-sm shadow-lg shadow-brand-500/20">
                        <p class="text-[14px] leading-relaxed break-words font-medium text-left">${escapeHtml(msg.content)}</p>
                         <p class="text-[9px] text-brand-100 text-right mt-1 font-medium opacity-80">${timeStr}</p>
                    </div>
                </div>
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="flex justify-start mt-4 animate-scale-in">
                <div class="max-w-[80%] md:max-w-[70%]">
                    <div class="inline-block px-4 py-3 bg-white/90 backdrop-blur-sm border border-white/50 text-slate-700 rounded-2xl rounded-tl-sm shadow-sm">
                         <p class="text-[14px] leading-relaxed break-words font-medium">${escapeHtml(msg.content)}</p>
                         <p class="text-[9px] text-slate-400 mt-1 font-medium">${timeStr}</p>
                    </div>
                </div>
            </div>
        `;
    }

    container.appendChild(div.firstElementChild);
    if (scroll) {
        container.scrollTop = container.scrollHeight;
    }
}


function handleSendMessage(e) { /* Same as before but updated service call */
    e.preventDefault();
    const input = document.getElementById('message-input');
    const content = input?.value.trim();

    if (!content || !currentTicketId) return;

    input.value = '';
    ChatService.sendMessage(currentTicketId, content).then(res => {
        if (res.error) {
            showToast("Erreur envoi", "error");
            input.value = content;
        }
    });
}

function handleCloseTicket(id) {
    // ... Close logic ...
    showConfirm("Marquer comme résolu ?", async () => {
        toggleLoader(true);
        const res = await ChatService.closeTicket(id);
        toggleLoader(false);
        if (!res.error) {
            showToast("Résolu ✓");
            await loadTicketsList();
            await openTicket(id);
        }
    });
}

function handleDeleteTicket(id) {
    showConfirm("Supprimer définitivement cette conversation ?", async () => {
        toggleLoader(true);
        const res = await ChatService.deleteTicket(id);
        toggleLoader(false);

        if (res.error) showToast("Erreur suppression", "error");
        else {
            showToast("Supprimé");

            // Optimistic UI Update: Remove immediately from DOM
            const item = document.querySelector(`.ticket-item[data-ticket-id="${id}"]`);
            item?.remove();

            // CRITICAL: Remove from local cache immediately so loadTicketsList doesn't resurrect it
            ticketsCache = ticketsCache.filter(t => t.id !== id);

            // Reset UI
            if (window.innerWidth < 768) {
                document.getElementById('chat-list-panel').classList.remove('-translate-x-full');
                document.getElementById('chat-conversation-panel').classList.add('translate-x-full');
            } else {
                document.getElementById('active-conversation-wrapper').classList.add('hidden');
                document.getElementById('chat-empty-state').classList.remove('hidden');
            }

            currentTicketId = null;
            // No need to await, we updated cache manually and DOM manually
            // loadTicketsList(); // Optional: re-sync later if needed, but manual update is cleaner
        }
    }, { type: 'danger', confirmText: 'Supprimer' });
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} h`;
    if (diffDays < 7) return `${diffDays} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function cleanup() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
    }
}
