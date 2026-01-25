import { ChatService } from './chat.service.js';
import { store } from '../../core/store.js';
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
    loading: false
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
                <!-- Header -->
                <div class="p-6 md:p-5 flex justify-between items-center border-b border-slate-100">
                    <div>
                        <h1 class="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Messages</h1>
                        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Vos conversations</p>
                    </div>
                    <button id="btn-new" class="w-10 h-10 rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:scale-105 active:scale-95 transition flex items-center justify-center">
                        <i data-lucide="plus" class="w-5 h-5"></i>
                    </button>
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
                    <div class="h-[72px] px-4 md:px-6 flex items-center justify-between border-b border-slate-100 bg-white/50 backdrop-blur-md flex-shrink-0">
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
                    <div id="messages-list" class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 scroll-smooth pb-24 md:pb-4">
                        <!-- Loaded JS -->
                    </div>

                    <!-- Input Area (Fixed Bottom Mobile) -->
                    <form id="chat-form" class="
                        absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-100
                        md:relative md:bg-transparent md:border-t-0 md:p-4
                    ">
                        <div class="relative flex items-end gap-2 bg-white md:bg-slate-100 p-2 rounded-[24px] shadow-sm md:shadow-none border border-slate-200 md:border-transparent focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
                            
                            <button type="button" id="btn-emoji-toggle" class="w-10 h-10 flex-shrink-0 text-slate-400 hover:text-amber-500 hover:bg-slate-100 rounded-full flex items-center justify-center transition">
                                <i data-lucide="smile" class="w-6 h-6"></i>
                            </button>

                            <textarea id="msg-input" rows="1" placeholder="Votre message..." class="flex-1 bg-transparent border-0 focus:ring-0 text-slate-800 placeholder:text-slate-400 resize-none py-2.5 max-h-32 text-sm leading-relaxed"></textarea>
                            
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
    state = { tickets: [], activeTicketId: null, subscription: null, loading: false };
    // Cleanup leftovers if any
    document.getElementById('create-ticket-modal')?.remove();
    document.getElementById('chat-options-dropdown')?.remove();

    const container = document.getElementById('chat-view');
    if (!container) {
        console.warn("Chat container not found");
        return;
    }

    // 2. Logic Bindings
    bindEvents(container);

    // 3. Load Data
    await loadTickets();
    if (params.id) openTicket(params.id);

    return () => {
        // Cleanup function
        if (state.subscription) {
            state.subscription.unsubscribe();
        }
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
    if (!state.tickets.length) {
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
        return;
    }

    list.innerHTML = state.tickets.map(t => {
        const isActive = String(t.id) === String(state.activeTicketId);
        const isClosed = t.status === 'closed';
        const isAnnouncement = t.category === 'announcement';

        // Avatar Logic
        let avatar;
        if (isAnnouncement) {
            avatar = `<div class="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><i data-lucide="megaphone" class="w-5 h-5"></i></div>`;
        } else {
            const initial = t.profiles?.first_name?.[0]?.toUpperCase() || '?';
            avatar = `<div class="w-10 h-10 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center">${initial}</div>`;
        }

        return `
            <button data-ticket-id="${t.id}" class="ticket-btn w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-center gap-3 group relative ${isActive ? 'bg-white shadow-md shadow-slate-200 ring-1 ring-slate-100' : 'hover:bg-white/60 hover:shadow-sm'}">
                ${avatar}
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-0.5">
                        <span class="font-bold text-sm text-slate-800 truncate">${escapeHtml(t.subject)}</span>
                        ${isClosed ? '<i data-lucide="check-circle-2" class="w-3 h-3 text-emerald-500"></i>' : ''}
                    </div>
                    <p class="text-xs text-slate-500 truncate font-medium group-hover:text-slate-600">
                        ${t.last_message ? escapeHtml(t.last_message) : 'Nouvelle discussion'}
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

    // Switch View Steps
    const ticket = state.tickets.find(t => String(t.id) === String(id));
    if (!ticket) return;

    // 1. Mobile & Desktop Transition (Mobile only)
    const isMobile = window.innerWidth < 768; // md breakpoint
    if (isMobile) {
        document.getElementById('chat-list-panel').classList.add('-translate-x-full');
        document.getElementById('chat-list-panel').classList.remove('translate-x-0');
        document.getElementById('chat-content-panel').classList.remove('translate-x-full');
    }

    document.getElementById('chat-empty').classList.add('hidden');

    const activeContainer = document.getElementById('chat-active');
    activeContainer.classList.remove('hidden', 'opacity-0');

    // 2. Update Header
    const info = document.getElementById('active-chat-info');
    info.innerHTML = `
        <div class="font-bold text-slate-800 text-sm truncate">${escapeHtml(ticket.subject)}</div>
        <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${ticket.category === 'announcement' ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-600'}">
            ${ticket.category === 'announcement' ? 'Annonce' : 'Support'}
        </span>
    `;

    // 3. Render Messages (Loading)
    const msgList = document.getElementById('messages-list');
    msgList.innerHTML = `<div class="h-full flex items-center justify-center"><div class="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full"></div></div>`;

    // 4. Update List Highlight
    renderTicketList();

    // 5. Fetch Messages
    const { data: msgs } = await ChatService.getMessages(id);
    renderMessages(msgs || []);

    // 6. Realtime
    state.subscription = ChatService.subscribe(id, (newMsg) => {
        appendMessage(newMsg);
        scrollToBottom();
    });
}

function renderMessages(messages) {
    const container = document.getElementById('messages-list');
    if (!messages.length) {
        container.innerHTML = `<div class="h-full flex flex-col items-center justify-center opacity-40"><i data-lucide="message-square" class="w-12 h-12 mb-2"></i><span class="text-sm font-medium">Début de la conversation</span></div>`;
        createIcons({ icons, root: container });
        return;
    }

    container.innerHTML = messages.map(msg => createMessageHtml(msg)).join('');
    scrollToBottom();
}

function appendMessage(msg) {
    const container = document.getElementById('messages-list');
    // Clear empty state if needed
    if (container.querySelector('.opacity-40')) container.innerHTML = '';

    const div = document.createElement('div');
    div.innerHTML = createMessageHtml(msg);
    container.appendChild(div.firstElementChild);
}

function createMessageHtml(msg) {
    const isMe = msg.user_id === store.state.user.id;
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
        <div class="flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-scale-in">
            <div class="max-w-[75%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                <div class="
                    px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${isMe
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'}
                ">
                    ${escapeHtml(msg.content)}
                </div>
                <span class="text-[10px] text-slate-400 mt-1 px-1 font-medium">${time}</span>
            </div>
        </div>
    `;
}

function scrollToBottom() {
    const el = document.getElementById('messages-list');
    if (el) setTimeout(() => el.scrollTop = el.scrollHeight, 50);
}

// =============================================================================
// ⚡ EVENTS & MODALS
// =============================================================================

function bindEvents(container) {
    // 1. Back Button (Mobile)
    container.querySelector('#btn-back')?.addEventListener('click', () => {
        const isMobile = window.innerWidth < 768; // md breakpoint
        if (isMobile) {
            document.getElementById('chat-list-panel').classList.remove('-translate-x-full');
            document.getElementById('chat-content-panel').classList.add('translate-x-full');
        }
        state.activeTicketId = null;
    });

    // 2. New Ticket Modal
    container.querySelector('#btn-new')?.addEventListener('click', () => {
        injectCreateModal();
    });

    // 3. Send Message (Bottom Chat Input)
    container.querySelector('#chat-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('msg-input');
        const content = input?.value.trim();
        if (!content || !state.activeTicketId) return;

        input.value = '';
        input.style.height = 'auto'; // Reset resize
        await ChatService.sendMessage(state.activeTicketId, content);
    });

    // 4. Input Auto-Resize
    const ta = container.querySelector('#msg-input');
    ta?.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // 5. Emoji Toggle
    container.querySelector('#btn-emoji-toggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('emoji-picker').classList.toggle('hidden');
    });

    // 6. Emoji Click
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-emoji')) {
            const input = document.getElementById('msg-input');
            input.value += e.target.textContent;
            input.focus();
        }
    });

    // 7. Options Menu (Delete / Close)
    container.querySelector('#btn-options')?.addEventListener('click', (e) => {
        e.stopPropagation();
        showOptionsModal();
    });

    // 8. TICKET LIST DELEGATION (Scoped for correctness)
    const ticketList = container.querySelector('#ticket-list');
    if (ticketList) {
        ticketList.addEventListener('click', (e) => {
            const btn = e.target.closest('.ticket-btn');

            if (btn) {
                e.preventDefault();
                const id = btn.dataset.ticketId;

                if (id) {
                    openTicket(id);
                } else {
                    console.error("ID de ticket manquant sur le bouton");
                }
            }
        });
    }
}


/**
 * MOAL CREATION - SYNC & ROBUST
 */
function injectCreateModal() {
    document.getElementById('create-ticket-modal')?.remove();

    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;

    const modal = document.createElement('div');
    modal.id = 'create-ticket-modal';
    modal.className = "fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in";

    modal.innerHTML = `
        <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slide-up ring-1 ring-white/50">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 class="font-bold text-lg text-slate-800">Nouveau Message</h3>
                <button id="close-modal" class="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition">
                    <i data-lucide="x" class="w-5 h-5 text-slate-500"></i>
                </button>
            </div>

            <form id="create-form" class="p-6 space-y-4">
                
                ${isAdmin ? `
                <div class="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                    <label class="cursor-pointer">
                        <input type="radio" name="type" value="support" class="peer hidden" checked>
                        <span class="block text-center py-2 rounded-lg text-xs font-bold text-slate-500 peer-checked:bg-white peer-checked:text-slate-900 peer-checked:shadow-sm transition">Support</span>
                    </label>
                    <label class="cursor-pointer">
                        <input type="radio" name="type" value="direct" class="peer hidden">
                        <span class="block text-center py-2 rounded-lg text-xs font-bold text-slate-500 peer-checked:bg-white peer-checked:text-slate-900 peer-checked:shadow-sm transition">Direct</span>
                    </label>
                    <label class="cursor-pointer">
                        <input type="radio" name="type" value="announcement" class="peer hidden">
                        <span class="block text-center py-2 rounded-lg text-xs font-bold text-slate-500 peer-checked:bg-white peer-checked:text-slate-900 peer-checked:shadow-sm transition">Annonce</span>
                    </label>
                </div>

                <div id="volunteer-field" class="hidden">
                     <select name="targetUserId" id="volunteer-select" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 transition">
                        <option value="">Chargement...</option>
                     </select>
                </div>
                ` : `<input type="hidden" name="type" value="support">`}

                <input name="subject" required placeholder="Sujet de la conversation" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold placeholder:font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition">

                <textarea name="content" required placeholder="Écrivez votre message..." rows="4" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition resize-none"></textarea>

                <button type="submit" class="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2">
                    <span>Envoyer</span>
                    <i data-lucide="send" class="w-4 h-4"></i>
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    createIcons({ icons, root: modal });

    // Close Event
    document.getElementById('close-modal').onclick = () => modal.remove();

    // Type Change Logic (Admin)
    if (isAdmin) {
        const typeRadios = modal.querySelectorAll('input[name="type"]');
        const vField = document.getElementById('volunteer-field');

        typeRadios.forEach(r => r.addEventListener('change', (e) => {
            if (e.target.value === 'direct') {
                vField.classList.remove('hidden');
                loadVolunteersOptions();
            } else {
                vField.classList.add('hidden');
            }
        }));
    }

    // Submit Logic
    document.getElementById('create-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);

        if (typeof toggleLoader === 'function') toggleLoader(true);

        const res = await ChatService.createTicket({
            type: fd.get('type'),
            subject: fd.get('subject'),
            content: fd.get('content'),
            targetUserId: fd.get('targetUserId')
        });

        if (typeof toggleLoader === 'function') toggleLoader(false);

        if (res.success) {
            modal.remove();
            showToast('Conversation créée');
            await loadTickets();
            // AUTO OPEN NEWLY CREATED TICKET
            if (res.data && res.data.id) {
                openTicket(res.data.id);
            }
        } else {
            showToast('Erreur: ' + (res.error?.message || 'Inconnue'), 'error');
        }
    };
}

async function loadVolunteersOptions() {
    const select = document.getElementById('volunteer-select');
    if (select.dataset.loaded) return;

    try {
        const { data } = await ChatService.getAllVolunteers();
        if (data) {
            select.innerHTML = `<option value="">Choisir un bénévole...</option>` +
                data.map(v => `<option value="${v.id}">${v.first_name} ${v.last_name}</option>`).join('');
            select.dataset.loaded = 'true';
        }
    } catch (e) {
        select.innerHTML = '<option>Erreur chargement</option>';
    }
}

function showOptionsModal() {
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
    const ticket = state.tickets.find(t => t.id === state.activeTicketId);

    if (!ticket) return;

    document.getElementById('action-sheet')?.remove();
    const sheet = document.createElement('div');
    sheet.id = 'action-sheet';
    sheet.className = "fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in";

    sheet.innerHTML = `
        <div class="w-full max-w-sm bg-white m-4 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div class="p-4 border-b border-slate-100 text-center">
                <h4 class="font-bold text-slate-800">Options</h4>
                <p class="text-xs text-slate-500">${escapeHtml(ticket.subject)}</p>
            </div>
            <div class="p-2 space-y-1">
                ${isAdmin && ticket.status !== 'closed' ? `
                <button id="act-close" class="w-full py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition">
                    Marquer comme résolu
                </button>` : ''}
                
                <button id="act-delete" class="w-full py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition">
                    ${isAdmin ? 'Supprimer définitivement' : 'Masquer la conversation'}
                </button>

                <button id="act-cancel" class="w-full py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition">
                    Annuler
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(sheet);

    // Bindings
    sheet.querySelector('#act-cancel').onclick = () => sheet.remove();

    sheet.querySelector('#act-close')?.addEventListener('click', async () => {
        sheet.remove();
        await ChatService.closeTicket(state.activeTicketId);
        loadTickets();
    });

    sheet.querySelector('#act-delete').onclick = async () => {
        sheet.remove();
        toggleLoader(true);
        if (isAdmin) {
            if (confirm("Supprimer pour tout le monde ? Irréversible.")) {
                await ChatService.deleteTicket(state.activeTicketId);
            }
        } else {
            await ChatService.hideTicket(state.activeTicketId);
        }
        toggleLoader(false);
        state.activeTicketId = null;
        loadTickets();
        // Reset View
        document.getElementById('chat-active').classList.add('hidden');
        document.getElementById('chat-empty').classList.remove('hidden');
    };
}


function renderSkeletonItems() {
    return Array(3).fill(0).map(() => `
        <div class="w-full p-3 rounded-2xl bg-white/50 animate-pulse flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-slate-200"></div>
            <div class="flex-1 space-y-2">
                <div class="h-3 bg-slate-200 rounded w-1/2"></div>
                <div class="h-2 bg-slate-200 rounded w-3/4"></div>
            </div>
        </div>
    `).join('');
}
