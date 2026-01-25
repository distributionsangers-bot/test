import { ChatService } from './chat.service.js';
import { store } from '../../core/store.js';
import { supabase } from '../../services/supabase.js';
import { createIcons, icons } from 'lucide';
import { showToast, showConfirm, escapeHtml, toggleLoader } from '../../services/utils.js';

// =============================================================================
// 🎨 CONSTANTS & CONFIG
// =============================================================================

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅'];

// State
let state = {
    tickets: [],
    activeTicketId: null,
    subscription: null,
    loading: false,
    replyTo: null, // { id, content, author }
    typingUsers: new Set(), // Set of user names
    typingTimeout: null,
    searchQuery: '',
    editingMessageId: null
};

// =============================================================================
// 🚀 PUBLIC API
// =============================================================================

export function renderChat(container, params = {}) {
    // 1. Static Layout (Premium Glassmorphism)
    return `
        <div id="chat-view" class="relative w-full h-[calc(100dvh-160px)] md:h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden md:p-6 gap-6">
            
            <!-- BLUR BACKDROP (Desktop) -->
            <div class="absolute inset-0 pointer-events-none hidden md:block">
                <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]"></div>
                <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]"></div>
            </div>

            <!-- 1. LEFT PANEL: LIST (Glassmorphism) -->
            <div id="chat-list-panel" class="
                absolute inset-0 z-20 bg-slate-50 flex flex-col transition-transform duration-300
                md:relative md:w-1/3 md:max-w-sm md:bg-white/80 md:backdrop-blur-xl md:rounded-3xl md:shadow-lg md:border md:border-white/50
                ${params.id ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
            ">
                <!-- Header & Search -->
                <div class="p-6 md:p-5 flex flex-col gap-4 border-b border-slate-100">
                    <div class="flex justify-between items-center">
                        <div>
                            <h1 class="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Messages</h1>
                            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Vos conversations</p>
                        </div>
                        <button id="btn-new" class="w-10 h-10 rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:scale-105 active:scale-95 transition flex items-center justify-center">
                            <i data-lucide="plus" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <!-- Search Bar -->
                    <div class="relative group">
                        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition"></i>
                        <input id="search-input" type="text" placeholder="Rechercher..." class="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition placeholder:text-slate-400">
                    </div>
                </div>

                <!-- List Content -->
                <div id="ticket-list" class="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth">
                    ${renderSkeletonItems()}
                </div>
            </div>

            <!-- 2. RIGHT PANEL: CONVERSATION (Glassmorphism) -->
            <div id="chat-content-panel" class="
                absolute inset-0 z-30 bg-white flex flex-col transition-transform duration-300
                md:relative md:flex-1 md:bg-white/80 md:backdrop-blur-xl md:rounded-3xl md:shadow-lg md:border md:border-white/50
                ${params.id ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            ">
                <!-- Empty State (Desktop Default) -->
                <div id="chat-empty" class="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-0 ${params.id ? 'hidden' : ''}">
                    <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <i data-lucide="message-square-dashed" class="w-10 h-10"></i>
                    </div>
                    <h3 class="font-bold text-slate-700">Aucune conversation sélectionnée</h3>
                    <p class="text-sm text-slate-400 mt-2">Choisissez un échange à gauche ou créez-en un nouveau.</p>
                </div>

                <!-- Active Chat Container -->
                <div id="chat-active" class="flex flex-col h-full relative z-10 ${!params.id ? 'hidden opacity-0' : ''} transition-opacity duration-300">
                    
                    <!-- Header -->
                    <div class="h-[72px] px-4 md:px-6 flex items-center justify-between border-b border-slate-100 bg-white/50 backdrop-blur-md flex-shrink-0 z-20">
                        <div class="flex items-center gap-3">
                            <button id="btn-back" class="md:hidden w-8 h-8 flex items-center justify-center -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition">
                                <i data-lucide="chevron-left" class="w-6 h-6"></i>
                            </button>
                            <div id="active-chat-info" class="flex items-center gap-3 min-w-0">
                                <!-- Filled JS -->
                            </div>
                        </div>
                        <button id="btn-options" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                            <i data-lucide="more-vertical" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <!-- Messages -->
                    <div id="messages-list" class="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30 scroll-smooth pb-32 md:pb-4">
                        <!-- Loaded JS -->
                    </div>

                    <!-- Input Area (Fixed Bottom Mobile) -->
                    <form id="chat-form" class="
                        absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-100
                        md:relative md:bg-transparent md:border-t-0 md:p-4 z-20
                    ">
                        <!-- Reply Context -->
                        <div id="reply-context" class="hidden flex items-center gap-3 p-3 bg-slate-50 border border-brand-200/50 rounded-t-2xl border-b-0 -mb-2 relative z-0 mx-2 animate-slide-up">
                            <div class="w-1 self-stretch bg-brand-500 rounded-full"></div>
                            <div class="flex-1 min-w-0">
                                <p class="text-[10px] font-bold text-brand-600 mb-0.5">Réponse à <span id="reply-author">...</span></p>
                                <p id="reply-text" class="text-xs text-slate-600 truncate">...</p>
                            </div>
                            <button type="button" id="btn-cancel-reply" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
                                <i data-lucide="x" class="w-3 h-3"></i>
                            </button>
                        </div>
                        
                        <!-- Typing Indicator -->
                         <div id="typing-indicator" class="hidden absolute bottom-full left-6 mb-2 text-xs font-semibold text-slate-400 flex items-center gap-2 animate-fade-in">
                            <div class="flex gap-0.5">
                                <span class="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                                <span class="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                <span class="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                            </div>
                            <span id="typing-users">Quelqu'un écrit...</span>
                        </div>

                        <div class="relative flex items-end gap-2 bg-white md:bg-slate-100 p-2 rounded-[24px] shadow-lg shadow-slate-200/50 md:shadow-none border border-slate-200 md:border-transparent focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all z-10">
                            
                            <button type="button" id="btn-emoji-toggle" class="w-10 h-10 flex-shrink-0 text-slate-400 hover:text-amber-500 hover:bg-slate-100 rounded-full flex items-center justify-center transition">
                                <i data-lucide="smile" class="w-6 h-6"></i>
                            </button>

                            <textarea id="msg-input" rows="1" placeholder="Votre message..." class="flex-1 bg-transparent border-0 focus:ring-0 text-slate-800 placeholder:text-slate-400 resize-none py-2.5 max-h-32 text-sm leading-relaxed overflow-hidden"></textarea>
                            
                            <button type="submit" class="w-10 h-10 flex-shrink-0 bg-brand-600 text-white rounded-full flex items-center justify-center hover:bg-brand-700 active:scale-95 transition shadow-md shadow-brand-500/20">
                                <i data-lucide="send-horizontal" class="w-5 h-5 ml-0.5"></i>
                            </button>

                            <!-- Emoji Picker -->
                            <div id="emoji-picker" class="absolute bottom-full left-0 mb-3 ml-2 p-3 bg-white rounded-2xl shadow-xl border border-slate-100 hidden animate-scale-in origin-bottom-left w-64 z-50">
                                <div class="grid grid-cols-8 gap-1">
                                    ${EMOJIS.map(e => `<button type="button" class="btn-emoji w-7 h-7 flex items-center justify-center text-lg hover:bg-slate-50 rounded transition">${e}</button>`).join('')}
                                </div>
                            </div>
                        </div>
                    </form>

                </div>
            </div>
        </div>
        </div>
    `;
}

export async function initChat(params = {}) {
    state = {
        tickets: [], activeTicketId: null, subscription: null, loading: false,
        replyTo: null, typingUsers: new Set(), typingTimeout: null, searchQuery: '', editingMessageId: null
    };

    // Cleanup leftovers
    document.getElementById('create-ticket-modal')?.remove();
    document.getElementById('chat-options-dropdown')?.remove();
    document.querySelector('.context-menu')?.remove();

    const container = document.getElementById('chat-view');
    if (!container) return;

    // 2. Logic Bindings
    bindEvents(container);

    // 3. Load Data
    await loadTickets();
    if (params.id) openTicket(params.id);

    return () => {
        if (state.subscription) state.subscription.unsubscribe();
        if (state.globalTicketSub) state.globalTicketSub.unsubscribe();
        document.querySelector('.context-menu')?.remove();
    };
}

// =============================================================================
// 🧠 LOGIC & CONTROLLERS
// =============================================================================

async function loadTickets() {
    const list = document.getElementById('ticket-list');
    const { success, data, error } = await ChatService.getTickets();

    if (!success) {
        list.innerHTML = `<div class="p-8 text-center text-slate-400 text-sm">Erreur: ${error.message}</div>`;
        return;
    }

    state.tickets = data || [];
    renderTicketList();
}

function renderTicketList() {
    const list = document.getElementById('ticket-list');
    const query = state.searchQuery.toLowerCase();

    // Filter logic
    const filtered = state.tickets.filter(t => {
        const matchSubject = t.subject.toLowerCase().includes(query);
        const matchMsg = t.last_message?.toLowerCase().includes(query);
        const matchUser = (t.profiles?.first_name + ' ' + t.profiles?.last_name).toLowerCase().includes(query);
        return matchSubject || matchMsg || matchUser;
    });

    if (!filtered.length) {
        if (query) {
            list.innerHTML = `<div class="p-8 text-center text-slate-400 text-sm">Aucun résultat pour "${escapeHtml(state.searchQuery)}"</div>`;
        } else {
            list.innerHTML = `
                <div class="mt-20 flex flex-col items-center text-center px-6">
                    <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                        <i data-lucide="inbox" class="w-8 h-8 text-slate-300"></i>
                    </div>
                    <p class="text-sm font-bold text-slate-600">Aucune conversation</p>
                    <p class="text-xs text-slate-400 mt-1">Commencez un nouvel échange !</p>
                </div>
            `;
            createIcons({ icons, root: list });
        }
        return;
    }

    list.innerHTML = filtered.map(t => {
        const isActive = String(t.id) === String(state.activeTicketId);
        const isClosed = t.status === 'closed';
        const isAnnouncement = t.category === 'announcement';

        // Avatar & Name Resolution
        let avatar, otherName;
        const user = t.profiles;

        if (isAnnouncement) {
            avatar = `<div class="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center ring-2 ring-white shadow-sm"><i data-lucide="megaphone" class="w-5 h-5"></i></div>`;
            otherName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Administrateur';
        } else {
            otherName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Bénévole';
            const initial = otherName[0]?.toUpperCase() || '?';
            avatar = `<div class="w-12 h-12 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center ring-2 ring-white shadow-sm text-sm">${initial}</div>`;
        }

        return `
            <button data-ticket-id="${t.id}" class="ticket-btn w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-center gap-3 group relative ${isActive ? 'bg-white shadow-md shadow-slate-200 ring-1 ring-slate-100' : 'hover:bg-white/60 hover:shadow-sm'}">
                ${avatar}
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-0.5">
                        <span class="font-bold text-sm text-slate-800 truncate ${t.is_unread ? 'text-brand-600' : ''}">${escapeHtml(t.subject)}</span>
                        
                        <div class="flex items-center gap-1.5">
                            ${t.is_unread ? `<div class="w-2.5 h-2.5 bg-brand-500 rounded-full animate-pulse"></div>` : ''}
                            ${isClosed ? '<i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-500"></i>' : `<span class="text-[10px] text-slate-400">${formatDateShort(t.last_message_date)}</span>`}
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 truncate font-medium group-hover:text-slate-600 flex items-center gap-1">
                        ${t.last_message ? escapeHtml(t.last_message) : '<span class="italic text-slate-400">Nouvelle discussion</span>'}
                    </p>
                </div>
            </button>
        `;
    }).join('');

    createIcons({ icons, root: list });
}

async function openTicket(id) {
    if (state.subscription) state.subscription.unsubscribe();
    state.activeTicketId = id;
    state.replyTo = null;
    state.editingMessageId = null;
    updateReplyUI();
    updateTypingUI();
    document.getElementById('msg-input').value = '';

    const ticket = state.tickets.find(t => String(t.id) === String(id));
    // Optimistic unread clear
    if (ticket) ticket.is_unread = false;

    // 1. Mobile & Desktop Transition
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        document.getElementById('chat-list-panel').classList.add('-translate-x-full');
        document.getElementById('chat-list-panel').classList.remove('translate-x-0');
        document.getElementById('chat-content-panel').classList.remove('translate-x-full');
    }

    document.getElementById('chat-empty').classList.add('hidden');
    document.getElementById('chat-active').classList.remove('hidden', 'opacity-0');

    // 2. Update Header Info
    const info = document.getElementById('active-chat-info');
    if (ticket) {
        const isAnnouncement = ticket.category === 'announcement';
        const otherName = isAnnouncement ? 'Annonce Système' : `${ticket.profiles?.first_name || 'Bénévole'} ${ticket.profiles?.last_name || ''}`;
        const initial = otherName[0].toUpperCase();

        // Check if admin (based on logic or if it's me)
        const isAdmin = ticket.profiles?.is_admin || false;

        info.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-md">
                ${isAnnouncement ? '<i data-lucide="megaphone" class="w-4 h-4"></i>' : initial}
            </div>
            <div class="flex flex-col">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 text-sm truncate max-w-[150px] md:max-w-xs">${escapeHtml(otherName)}</span>
                    ${isAdmin ? `<span class="bg-brand-100 text-brand-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"><i data-lucide="shield" class="w-3 h-3"></i> Admin</span>` : ''}
                </div>
                <span class="text-[11px] font-medium text-slate-500">${escapeHtml(ticket.subject)}</span>
            </div>
        `;
        createIcons({ icons, root: info });
    }

    // 3. Render Loading
    const msgList = document.getElementById('messages-list');
    msgList.innerHTML = `<div class="h-full flex items-center justify-center"><div class="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full"></div></div>`;

    renderTicketList();

    // 4. Mark Read
    ChatService.markAsRead(id);

    // 5. Fetch Messages
    const { data: msgs } = await ChatService.getMessages(id);
    renderMessages(msgs || []);


    // 6. Realtime (Active Chat)
    state.subscription = ChatService.subscribe(id, (payload) => {
        if (payload.event === 'typing') {
            handleTypingEvent(payload);
        } else {
            handleRealtimeMessage(payload);
        }
    });

    // 7. Realtime (Global Tickets Update)
    // Subscribe to tickets table to refresh sidebar order/unread status
    // independent of the active chat.
    const ticketSub = supabase.channel('tickets-list-global')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tickets' },
            () => {
                // On any ticket change (new message updates last_message_at), reload the list
                loadTickets().then(() => {
                    // If we are on a ticket, ensure we keep it marked as read if needed
                    if (state.activeTicketId) {
                        // logic handled in openTicket or handleRealtimeMessage
                    }
                });
            }
        )
        .subscribe();

    // Store it to unsubscribe later? 
    // Ideally we should have a global subscription manager. 
    // For now, we attach it to state to clean up on exit, 
    // but typically initChat is called once or heavily managed.
    // Let's add it to a tracking array if needed or just let it be for this view session.
    state.globalTicketSub = ticketSub;
}

async function handleRealtimeMessage(payload) {
    // 1. If currently viewing this ticket, refresh messages & mark as read
    if (state.activeTicketId) {
        // Fetch fresh messages
        const { data } = await ChatService.getMessages(state.activeTicketId);
        renderMessages(data || []);

        // Mark as read again
        ChatService.markAsRead(state.activeTicketId);

        // Note: Sidebar update is now handled by the 'tickets' subscription above,
        // which triggers loadTickets(). 
    }
}


function renderMessages(messages) {
    const container = document.getElementById('messages-list');
    if (!messages.length) {
        container.innerHTML = `<div class="h-full flex flex-col items-center justify-center opacity-40"><i data-lucide="message-square" class="w-12 h-12 mb-2"></i><span class="text-sm font-medium">Début de la conversation</span></div>`;
        createIcons({ icons, root: container });
        return;
    }

    // Grouping logic could go here (by date)
    container.innerHTML = messages.map(msg => createMessageHtml(msg)).join('');

    // Attach events to messages
    container.querySelectorAll('.msg-bubble').forEach(el => {
        // Desktop: Right click
        el.addEventListener('contextmenu', (e) => showMessageContext(e, el.dataset.msgId, el.dataset.isMe === 'true'));
        // Mobile: Double tap or Long press (HammerJS would be better, but simple click for now)
    });

    // Reply buttons
    container.querySelectorAll('.btn-reply-inline').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const content = btn.dataset.content;
            const author = btn.dataset.author;
            startReply(id, content, author);
        });
    });

    scrollToBottom();
    createIcons({ icons, root: container });
}

function createMessageHtml(msg) {
    const isMe = msg.user_id === store.state.user.id;
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isDeleted = !!msg.deleted_at;
    const isEdited = !!msg.edited_at && !isDeleted;

    let content = isDeleted ? '<span class="italic text-slate-400 text-xs flex items-center gap-1"><i data-lucide="ban" class="w-3 h-3"></i> Message supprimé</span>' : escapeHtml(msg.content);

    // Parent Message (Reply)
    let replyBlock = '';
    if (msg.parent && !isDeleted) {
        const parentIsMe = msg.parent.user_id === store.state.user.id; // On n'a pas user_id dans parent via la query actuelle, à améliorer si besoin exact
        const parentName = msg.parent.profiles ? (msg.parent.profiles.first_name || 'Utilisateur') : 'Utilisateur'; // Simplification
        replyBlock = `
            <div class="mb-1 pl-2 border-l-2 ${isMe ? 'border-brand-200' : 'border-slate-300'} opacity-75 text-xs">
                <span class="font-bold block text-[10px] ${isMe ? 'text-brand-100' : 'text-slate-500'}">${escapeHtml(parentName)}</span>
                <span class="truncate block max-w-[200px] ${isMe ? 'text-brand-50' : 'text-slate-400'}">${escapeHtml(msg.parent.content)}</span>
            </div>
        `;
    }

    const isAdmin = msg.profiles?.is_admin;
    const name = msg.profiles?.first_name || 'Utilisateur';

    return `
        <div class="group flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-scale-in mb-2">
            <div class="max-w-[85%] md:max-w-[70%] flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}">
                
                <!-- Avatar (if not me) -->
                ${!isMe ? `
                <div class="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-600 self-end mb-1">
                    ${name[0]}
                </div>` : ''}

                <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                    
                    <!-- Name (if not me) -->
                    ${!isMe && isAdmin ? `<span class="text-[10px] text-brand-600 font-bold ml-1 mb-0.5 flex items-center gap-0.5"><i data-lucide="shield" class="w-3 h-3"></i> Admin</span>` : ''}
                    ${!isMe && !isAdmin ? `<span class="text-[10px] text-slate-400 font-bold ml-1 mb-0.5">${name}</span>` : ''}

                    <!-- Bubble -->
                    <div class="msg-bubble relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm cursor-pointer transition-transform active:scale-[0.98]
                        ${isMe ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'}
                        "
                        data-msg-id="${msg.id}"
                        data-is-me="${isMe}"
                    >
                        ${replyBlock}
                        ${content}
                        
                        <div class="flex items-center justify-end gap-1 mt-1 opacity-70">
                             ${isEdited ? '<span class="text-[9px] italic mr-1">(modifié)</span>' : ''}
                             <span class="text-[10px] font-medium">${time}</span>
                             ${isMe && !isDeleted ? `
                                <i data-lucide="check-check" class="w-3 h-3 text-white/90"></i>
                             ` : ''}
                        </div>

                         <!-- Hover Actions (Desktop) -->
                        ${!isDeleted ? `
                        <button class="btn-reply-inline absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-8' : '-right-8'} w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-white hover:text-brand-600 md:flex hidden"
                            data-id="${msg.id}" data-content="${escapeHtml(msg.content)}" data-author="${isMe ? 'Moi' : name}"
                            title="Répondre">
                            <i data-lucide="reply" class="w-3 h-3"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function scrollToBottom() {
    const container = document.getElementById('messages-list');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// =============================================================================
// ⚡ ACTIONS & EVENTS
// =============================================================================

function startReply(id, content, author) {
    state.replyTo = { id, content, author };
    updateReplyUI();
    document.getElementById('msg-input').focus();
}

function cancelReply() {
    state.replyTo = null;
    updateReplyUI();
}

function updateReplyUI() {
    const ctx = document.getElementById('reply-context');
    if (state.replyTo) {
        document.getElementById('reply-author').textContent = state.replyTo.author;
        document.getElementById('reply-text').textContent = state.replyTo.content;
        ctx.classList.remove('hidden');
    } else {
        ctx.classList.add('hidden');
    }
}

function formatDateShort(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function showMessageContext(e, msgId, isMe) {
    e.preventDefault();
    if (!isMe) return; // Edit logic only for me for now (admin delete could be added)

    // Remove existing
    document.querySelector('.context-menu')?.remove();

    const menu = document.createElement('div');
    menu.className = 'context-menu fixed bg-white shadow-xl rounded-xl border border-slate-100 z-[100] w-40 overflow-hidden animate-scale-in origin-top-left';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    menu.innerHTML = `
        <button id="ctx-edit" class="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <i data-lucide="pencil" class="w-4 h-4"></i> Modifier
        </button>
        <button id="ctx-delete" class="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
            <i data-lucide="trash-2" class="w-4 h-4"></i> Supprimer
        </button>
    `;

    document.body.appendChild(menu);
    createIcons({ icons, root: menu });

    // Close on click outside
    const close = () => {
        menu.remove();
        document.removeEventListener('click', close);
    };
    // Delay to avoid immediate close
    setTimeout(() => document.addEventListener('click', close), 10);

    // Actions
    menu.querySelector('#ctx-delete').onclick = async () => {
        if (showConfirm("Êtes-vous sûr de vouloir supprimer ce message ?")) {
            await ChatService.deleteMessage(msgId);
            const { data } = await ChatService.getMessages(state.activeTicketId);
            renderMessages(data || []);
            menu.remove();
        }
    };

    menu.querySelector('#ctx-edit').onclick = () => {
        menu.remove();
        showEditMessageModal(msgId);
    };
}

function bindEvents(container) {
    // Search
    container.querySelector('#search-input')?.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderTicketList();
    });

    // Form Submit
    container.querySelector('#chat-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('msg-input');
        const content = input?.value.trim();

        if (!content || !state.activeTicketId) return;

        input.value = '';
        input.style.height = 'auto'; // Reset resize

        const replyId = state.replyTo ? state.replyTo.id : null;
        cancelReply(); // Clear reply UI immediately

        await ChatService.sendMessage(state.activeTicketId, content, replyId);
        // Refresh handled by subscription usually, but optimistic add:
        const { data } = await ChatService.getMessages(state.activeTicketId);
        renderMessages(data || []);
    });

    // Reply Cancel
    container.querySelector('#btn-cancel-reply')?.addEventListener('click', cancelReply);

    // Auto Resize Textarea
    const ta = container.querySelector('#msg-input');
    if (ta) {
        const autoResize = () => {
            ta.style.height = 'auto'; // Reset to default
            ta.style.height = Math.min(ta.scrollHeight, 128) + 'px'; // Max 128px (4 rows)
        };

        ta.addEventListener('input', autoResize);
        ta.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                container.querySelector('#chat-form').dispatchEvent(new Event('submit'));
            }
        });

        // Initial resize
        autoResize();
    }

    // Bind other existing events (Back, New, Emoji, Options...)
    container.querySelector('#btn-back')?.addEventListener('click', () => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            document.getElementById('chat-list-panel').classList.remove('-translate-x-full');
            document.getElementById('chat-content-panel').classList.add('translate-x-full');
        }
        state.activeTicketId = null;
    });

    container.querySelector('#btn-new')?.addEventListener('click', injectCreateModal);

    container.querySelector('#btn-options')?.addEventListener('click', (e) => {
        e.stopPropagation();
        showOptionsModal();
    });

    const ticketList = container.querySelector('#ticket-list');
    if (ticketList) {
        ticketList.addEventListener('click', (e) => {
            const btn = e.target.closest('.ticket-btn');
            if (btn && btn.dataset.ticketId) openTicket(btn.dataset.ticketId);
        });
    }

    // 5. Emoji Toggle & Click
    container.querySelector('#btn-emoji-toggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('emoji-picker').classList.toggle('hidden');
    });
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-emoji')) {
            const input = document.getElementById('msg-input');
            input.value += e.target.textContent;
            input.focus();
        }
    });
}

function injectCreateModal() {
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
    const modal = document.createElement('div');
    modal.id = 'create-ticket-modal';
    modal.className = "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm";
    modal.innerHTML = `
        <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 relative animate-scale-in">
            <button id="close-modal" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
            <h3 class="font-bold text-lg mb-4">Nouveau Message</h3>
            <form id="create-form" class="space-y-4">
                ${isAdmin ? `
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Type</label>
                        <select name="type" id="create-type" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                            <option value="support">Support (Demande d'aide)</option>
                            <option value="announcement">Annonce (À tous les bénévoles)</option>
                            <option value="direct">Message Direct (À un bénévole)</option>
                        </select>
                    </div>
                    <div id="target-user-container" class="hidden">
                        <label class="block text-sm font-medium text-slate-700 mb-2">Destinataire</label>
                        <select name="targetUserId" id="target-user-select" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                            <option value="">Chargement...</option>
                        </select>
                    </div>
                ` : '<input type="hidden" name="type" value="support">'}
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Sujet</label>
                    <input name="subject" placeholder="Sujet du message" class="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Message</label>
                    <textarea name="content" placeholder="Votre message..." class="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none" rows="4" required></textarea>
                </div>
                <div class="flex gap-2 justify-end pt-2">
                    <button type="button" id="cancel-modal" class="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition">Annuler</button>
                    <button type="submit" class="px-4 py-2 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition">Envoyer</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    createIcons({ icons, root: modal });

    const closeBtn = modal.querySelector('#close-modal');
    const cancelBtn = modal.querySelector('#cancel-modal');
    closeBtn.onclick = () => modal.remove();
    cancelBtn.onclick = () => modal.remove();

    // Handle type change for direct messages
    if (isAdmin) {
        const typeSelect = modal.querySelector('#create-type');
        const targetContainer = modal.querySelector('#target-user-container');
        const targetSelect = modal.querySelector('#target-user-select');

        typeSelect.addEventListener('change', async (e) => {
            if (e.target.value === 'direct') {
                // Load volunteers
                const { data: volunteers } = await ChatService.getAllVolunteers();
                if (volunteers && volunteers.length) {
                    targetSelect.innerHTML = volunteers
                        .map(v => `<option value="${v.id}">${v.first_name} ${v.last_name}</option>`)
                        .join('');
                }
                targetContainer.classList.remove('hidden');
            } else {
                targetContainer.classList.add('hidden');
            }
        });
    }

    modal.querySelector('#create-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const type = fd.get('type');

        const payload = {
            type,
            subject: fd.get('subject'),
            content: fd.get('content')
        };

        if (type === 'direct') {
            payload.targetUserId = fd.get('targetUserId');
            if (!payload.targetUserId) {
                showToast("Veuillez sélectionner un destinataire", "error");
                return;
            }
        }

        const { success, error } = await ChatService.createTicket(payload);
        if (success) {
            showToast("Message envoyé", "success");
            modal.remove();
            await loadTickets();
        } else {
            showToast("Erreur : " + (error?.message || "Impossible d'envoyer"), "error");
        }
    };
}

function showEditMessageModal(msgId) {
    const modal = document.createElement('div');
    modal.id = 'edit-message-modal';
    modal.className = "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm";
    modal.innerHTML = `
        <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 relative animate-scale-in">
            <button id="close-edit-modal" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
            <h3 class="font-bold text-lg mb-4">Modifier le message</h3>
            <form id="edit-form" class="space-y-4">
                <textarea id="edit-content" placeholder="Votre message..." class="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none" rows="4" required></textarea>
                <div class="flex gap-2 justify-end">
                    <button type="button" id="cancel-edit" class="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition">Annuler</button>
                    <button type="submit" class="px-4 py-2 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition">Enregistrer</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    createIcons({ icons, root: modal });

    // Fetch message content and populate
    ChatService.getMessageById(msgId).then(({ data: msg }) => {
        if (msg) {
            document.getElementById('edit-content').value = msg.content;
        }
    });

    modal.querySelector('#close-edit-modal').onclick = () => modal.remove();
    modal.querySelector('#cancel-edit').onclick = () => modal.remove();

    modal.querySelector('#edit-form').onsubmit = async (e) => {
        e.preventDefault();
        const newContent = document.getElementById('edit-content').value.trim();

        if (newContent) {
            const { success, error } = await ChatService.editMessage(msgId, newContent);
            if (success) {
                showToast("Message modifié", "success");
                modal.remove();
                const { data } = await ChatService.getMessages(state.activeTicketId);
                renderMessages(data || []);
            } else {
                showToast("Erreur : " + (error?.message || "Impossible de modifier"), "error");
            }
        }
    };

    // Auto focus
    document.getElementById('edit-content').focus();
}

function showOptionsModal() {
    // Reuse original logic
    const ticket = state.tickets.find(t => String(t.id) === String(state.activeTicketId));
    if (!ticket) return;

    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
    const isClosed = ticket.status === 'closed';

    const sheet = document.createElement('div');
    sheet.id = 'action-sheet';
    sheet.className = "fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4";
    sheet.innerHTML = `
        <div class="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden p-2 space-y-1 animate-slide-up">
            ${isAdmin && !isClosed ? `
                <button id="act-close" class="w-full p-3 text-emerald-600 font-bold hover:bg-emerald-50 rounded-xl flex items-center gap-2 justify-center">
                    <i data-lucide="check-circle" class="w-5 h-5"></i> Marquer comme résolu
                </button>
            ` : ''}
            ${isAdmin && isClosed ? `
                <button id="act-reopen" class="w-full p-3 text-amber-600 font-bold hover:bg-amber-50 rounded-xl flex items-center gap-2 justify-center">
                    <i data-lucide="redo" class="w-5 h-5"></i> Réouvrir
                </button>
            ` : ''}
            <button id="act-hide" class="w-full p-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl flex items-center gap-2 justify-center">
                <i data-lucide="eye-off" class="w-5 h-5"></i> Masquer
            </button>
            <hr class="my-1 border-slate-100">
            <button id="act-cancel" class="w-full p-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Fermer</button>
        </div>
    `;
    document.body.appendChild(sheet);
    createIcons({ icons, root: sheet });

    sheet.querySelector('#act-cancel').onclick = () => sheet.remove();

    sheet.querySelector('#act-hide')?.addEventListener('click', async () => {
        await ChatService.hideTicket(state.activeTicketId);
        showToast("Conversation masquée", "success");
        sheet.remove();
        await loadTickets();
    });

    sheet.querySelector('#act-close')?.addEventListener('click', async () => {
        await ChatService.closeTicket(state.activeTicketId);
        showToast("Conversation marquée comme résolue", "success");
        sheet.remove();
        await loadTickets();
        renderTicketList();
    });

    sheet.querySelector('#act-reopen')?.addEventListener('click', async () => {
        const { error } = await supabase
            .from('tickets')
            .update({ status: 'open' })
            .eq('id', state.activeTicketId);
        if (!error) {
            showToast("Conversation réouverte", "success");
            sheet.remove();
            await loadTickets();
            renderTicketList();
        }
    });
}

function updateTypingUI() {
    const indicator = document.getElementById('typing-indicator');
    const usersSpan = document.getElementById('typing-users');

    if (!indicator) return;

    if (state.typingUsers.size > 0) {
        const users = Array.from(state.typingUsers);
        const text = users.length === 1
            ? `${users[0]} écrit...`
            : `${users.join(', ')} écrivent...`;
        usersSpan.textContent = text;
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
}

function handleTypingEvent(payload) {
    if (!payload?.payload?.userId) return;

    // Find the user's name (from last seen in messages)
    const msg = state.tickets
        .find(t => t.id === state.activeTicketId)
        ?.last_message;
    const userName = msg?.profiles?.first_name || 'Quelqu\'un';

    // Add user to typing set
    state.typingUsers.add(userName);
    updateTypingUI();

    // Clear timeout and set new one
    clearTimeout(state.typingTimeout);
    state.typingTimeout = setTimeout(() => {
        state.typingUsers.delete(userName);
        updateTypingUI();
    }, 2000);
}

function renderSkeletonItems() {
    return Array(3).fill(0).map(() => `
        <div class="w-full p-3 rounded-2xl bg-white/50 animate-pulse flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-slate-200"></div>
            <div class="flex-1 space-y-2">
                <div class="h-3 bg-slate-200 rounded w-1/2"></div>
                <div class="h-2 bg-slate-200 rounded w-3/4"></div>
            </div>
        </div>
    `).join('');
}
