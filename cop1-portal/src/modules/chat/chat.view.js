import { ChatService } from './chat.service.js';
import { store } from '../../core/store.js';
import { showToast, toggleLoader, escapeHtml, formatDate } from '../../services/utils.js';
import { createIcons } from 'lucide';

// État local du module
let currentTicketId = null;
let realtimeSubscription = null;
let isMobileView = window.innerWidth < 768; // Breakpoint MD Tailwind

export async function initChat() {
    // Nettoyage éventuel précédent
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
    }

    // Reset state
    currentTicketId = null;

    // Le routeur a peut-être passé un ID via l'URL (gestion à faire dans le render si on veut ouvrir direct)
    // Pour l'instant on charge la liste.
}

export async function renderChat(container, params = {}) {
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;

    container.innerHTML = `
        <div class="h-[calc(100vh-80px)] md:h-[calc(100vh-64px)] w-full flex overflow-hidden bg-white md:rounded-2xl md:shadow-sm md:border md:border-slate-200">
            
            <!-- LISTE (GAUCHE) -->
            <div id="chat-list-panel" class="w-full md:w-80 flex-shrink-0 flex flex-col border-r border-slate-100 bg-slate-50/50 ${params.id ? 'hidden md:flex' : 'flex'}">
                
                <!-- Header Liste -->
                <div class="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
                    <h2 class="font-extrabold text-lg text-slate-800">Messages</h2>
                    <button onclick="openCreateTicketModal()" class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition shadow-sm">
                        <i data-lucide="plus" class="w-5 h-5"></i>
                    </button>
                </div>

                <!-- Liste Items -->
                <div id="tickets-container" class="flex-1 overflow-y-auto p-2 space-y-1">
                    ${renderSkeletonList()}
                </div>
            </div>

            <!-- CONVERSATION (DROITE) -->
            <div id="chat-conversation-panel" class="flex-1 flex flex-col bg-white overflow-hidden relative ${params.id ? 'flex' : 'hidden md:flex'}">
                
                <!-- Header Conv -->
                <div id="chat-header" class="h-16 border-b border-slate-100 flex items-center px-4 justify-between bg-white z-10 flex-shrink-0">
                    <div class="flex items-center gap-3">
                        <button id="btn-back-list" class="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-700">
                            <i data-lucide="chevron-left" class="w-6 h-6"></i>
                        </button>
                        <div id="active-ticket-info">
                            <p class="text-sm text-slate-400 italic">Sélectionnez une conversation</p>
                        </div>
                    </div>
                </div>

                <!-- Messages Zone -->
                <div id="messages-container" class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 scroll-smooth">
                    <div class="h-full flex flex-col items-center justify-center text-slate-300">
                        <i data-lucide="message-square" class="w-12 h-12 mb-2 opacity-50"></i>
                        <span class="text-sm font-medium">Vos échanges apparaîtront ici</span>
                    </div>
                </div>

                <!-- Input Zone -->
                <form id="chat-input-form" class="p-4 bg-white border-t border-slate-100 hidden">
                    <div class="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition">
                        <input id="message-input" type="text" autocomplete="off" placeholder="Écrivez votre message..." class="flex-1 bg-transparent border-none outline-none text-sm px-2 py-1 font-medium text-slate-700 placeholder-slate-400">
                        <button type="submit" class="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition shadow-sm">
                            <i data-lucide="send" class="w-4 h-4"></i>
                        </button>
                    </div>
                </form>

            </div>
        </div>
    `;

    // Gestionnaires d'événements globaux pour cette vue
    setupEventListeners(container); // S'assure de lier les boutons générés

    createIcons();

    // Chargement des données
    await loadTicketsList();

    // Si on a un ID dans les params (ex: /messages/123), on ouvre direct
    if (params.id) {
        await openTicket(params.id);
    }
}

// --- LOGIQUE LISTE ---

async function loadTicketsList() {
    const listContainer = document.getElementById('tickets-container');
    if (!listContainer) return;

    const res = await ChatService.getTickets();
    if (!res.success) {
        listContainer.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">${res.error.message || 'Erreur'}</div>`;
        return;
    }

    const tickets = res.data;
    if (tickets.length === 0) {
        listContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 text-slate-400">
                <i data-lucide="inbox" class="w-8 h-8 mb-2 opacity-50"></i>
                <span class="text-xs font-bold">Aucune conversation</span>
            </div>
        `;
        createIcons();
        return;
    }

    listContainer.innerHTML = tickets.map(t => renderTicketItem(t)).join('');
    // Réattacher les événements de clic sur les items
    listContainer.querySelectorAll('.ticket-item').forEach(el => {
        el.addEventListener('click', () => openTicket(el.dataset.id));
    });
}

function renderTicketItem(t) {
    const isAnnouncement = t.category === 'announcement';
    const updated = new Date(t.updated_at);
    // Format date court : "14:30" ou "Hier" ou "20 Dec"
    const timeStr = updated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Style Selectionné si c'est le ticket actif
    const isActive = t.id == currentTicketId;

    return `
        <div data-id="${t.id}" class="ticket-item cursor-pointer p-3 rounded-xl transition flex gap-3 items-start ${isActive ? 'bg-white shadow-sm border border-brand-100 ring-1 ring-brand-100' : 'hover:bg-white hover:shadow-sm border border-transparent'}">
            <div class="flex-shrink-0">
                ${isAnnouncement
            ? `<div class="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center"><i data-lucide="megaphone" class="w-5 h-5"></i></div>`
            : `<div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><i data-lucide="message-circle" class="w-5 h-5"></i></div>`
        }
            </div>
            <div class="flex-1 min-w-0 overflow-hidden">
                <div class="flex justify-between items-baseline mb-0.5">
                    <h4 class="text-sm font-bold text-slate-900 truncate pr-2">${escapeHtml(t.subject)}</h4>
                    <span class="text-[10px] text-slate-400 font-medium whitespace-nowrap">${timeStr}</span>
                </div>
                <div class="flex items-center gap-2">
                    ${isAnnouncement ? '<span class="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold">Annonce</span>' : ''}
                    <p class="text-xs text-slate-500 truncate flex-1">
                         cliquez pour lire...
                    </p>
                </div>
            </div>
        </div>
    `;
}

// --- LOGIQUE CONVERSATION ---

async function openTicket(ticketId) {
    currentTicketId = ticketId;

    // 1. UI Updates (Mobile & Desktop)
    const listPanel = document.getElementById('chat-list-panel');
    const convPanel = document.getElementById('chat-conversation-panel');
    const headerInfo = document.getElementById('active-ticket-info');
    const form = document.getElementById('chat-input-form');

    if (window.innerWidth < 768) {
        // Mobile : cacher liste, montrer chat
        if (listPanel) listPanel.classList.add('hidden');
        if (convPanel) convPanel.classList.remove('hidden');
    }

    // Mettre à jour la liste pour montrer la sélection (visuel)
    const allItems = document.querySelectorAll('.ticket-item');
    allItems.forEach(el => {
        if (el.dataset.id == ticketId) {
            el.classList.add('bg-white', 'shadow-sm', 'border-brand-100', 'ring-1', 'ring-brand-100');
        } else {
            el.classList.remove('bg-white', 'shadow-sm', 'border-brand-100', 'ring-1', 'ring-brand-100');
        }
    });

    // Reset du chat container
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = `<div class="flex justify-center py-10"><i data-lucide="loader-2" class="w-8 h-8 animate-spin text-brand-500"></i></div>`;
    createIcons();

    // 2. Fetch Messages
    const res = await ChatService.getMessages(ticketId);

    // 3. Setup Header & Form
    if (res.success) {
        // Si c'est une annonce et qu'on n'est pas admin, on cache le form
        // On récupère le ticket depuis le cache de liste ou refetch (ici on optimise en cherchant dans DOM ou state si on l'avait stocké)
        // Simplification : on ne cache pas le form pour l'instant sauf si on a l'info

        // TODO: Mettre à jour le header avec le titre du ticket
        // Pour cela il nous faudrait l'objet ticket. On va supposer qu'on peut le trouver dans la liste.
        const ticketEl = document.querySelector(`.ticket-item[data-id="${ticketId}"] h4`);
        const title = ticketEl ? ticketEl.innerText : "Conversation";

        headerInfo.innerHTML = `
            <h3 class="text-sm font-extrabold text-slate-900">${escapeHtml(title)}</h3>
            <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span class="text-xs text-slate-500 font-medium">En ligne</span>
            </div>
        `;

        // Render Messages
        const msgs = res.data;
        if (msgs.length === 0) {
            messagesContainer.innerHTML = `<div class="text-center text-xs text-slate-400 py-10">Début de la conversation</div>`;
        } else {
            messagesContainer.innerHTML = msgs.map(m => renderMessageBubble(m)).join('');
        }

        // Auto-scroll bottom
        scrollToBottom();

        // Afficher le formulaire
        form.classList.remove('hidden');
        document.getElementById('message-input').focus();

        // 4. Realtime Subscribe
        if (realtimeSubscription) realtimeSubscription.unsubscribe();

        realtimeSubscription = ChatService.subscribeToTicket(ticketId, (newMsg) => {
            // Callback quand un nouveau message arrive
            // On l'ajoute à la fin
            // Problème : on n'a pas le profile dans newMsg. On va afficher sans nom ou "Vous" si c'est nous.
            const bubble = renderMessageBubble(newMsg);
            // On ajoute au DOM
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = bubble;
            messagesContainer.appendChild(tempDiv.firstElementChild);
            scrollToBottom();
        });

    } else {
        messagesContainer.innerHTML = `<div class="text-red-500 text-center p-4">Erreur chargement</div>`;
    }
}

function renderMessageBubble(m) {
    const myId = store.state.user.id;
    const isMe = m.user_id === myId;
    const date = new Date(m.created_at);
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Nom de l'expéditeur
    // Si c'est 'Moi', on n'affiche pas le nom.
    // Si c'est l'autre, on affiche profile.first_name si dispo
    let senderName = '';
    if (!isMe && m.profile) {
        senderName = `<span class="text-[10px] text-slate-500 font-bold mb-1 block ml-1">${escapeHtml(m.profile.first_name)}</span>`;
    }

    return `
        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in group">
            ${senderName}
            <div class="max-w-[80%] px-4 py-2 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${isMe
            ? 'bg-brand-600 text-white rounded-br-none'
            : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
        }">
                ${escapeHtml(m.content)}
            </div>
            <span class="text-[10px] text-slate-300 mt-1 mx-1 font-medium opacity-0 group-hover:opacity-100 transition">${time}</span>
        </div>
    `;
}

// --- ACTIONS & EVENTS ---

function setupEventListeners(root) {
    // Bouton Retour Mobile
    const backBtn = root.querySelector('#btn-back-list');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('chat-conversation-panel').classList.add('hidden');
            document.getElementById('chat-list-panel').classList.remove('hidden');
            currentTicketId = null;
        });
    }

    // Formulaire d'envoi
    const form = root.querySelector('#chat-input-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('message-input');
            const content = input.value.trim();
            if (!content || !currentTicketId) return;

            // Optimistic Update (Optionnel: on attend le retour serveur pour l'instant car c'est très rapide avec Supabase)
            // Mais pour UX parfait, on vide le champ tout de suite
            input.value = '';

            const res = await ChatService.sendMessage(currentTicketId, content);
            if (!res.success) {
                showToast("Échec envoi message", "error");
                input.value = content; // On remet le texte en cas d'échec
            } else {
                // Le message sera ajouté via Realtime OU insert response, 
                // mais si Realtime est actif, on risque le doublon si on l'ajoute manuellement aussi.
                // Supabase Realtime renvoie l'insert à l'émetteur aussi par défaut.
                // Donc on ne fait RIEN ici, on laisse le channel gérer l'ajout !
                // UPDATE: Parfois le realtime lag d'une fraction de seconde. 
                // L'idéal est d'ajouter manuellement et de dédupliquer, mais restons simples.
            }
        });
    }

    // Expose globalement la fonction pour la modale
    window.openCreateTicketModal = openCreateTicketModal;
}

function scrollToBottom() {
    const el = document.getElementById('messages-container');
    if (el) el.scrollTop = el.scrollHeight;
}

function renderSkeletonList() {
    return Array(4).fill(0).map(() => `
        <div class="p-3 rounded-xl flex gap-3 items-center animate-pulse">
            <div class="w-10 h-10 bg-slate-200 rounded-full"></div>
            <div class="flex-1 space-y-2">
                <div class="h-3 bg-slate-200 rounded w-3/4"></div>
                <div class="h-2 bg-slate-200 rounded w-1/2"></div>
            </div>
        </div>
    `).join('');
}

// --- MODALE CREATION ---

function openCreateTicketModal() {
    const isAdmin = store.state.profile?.is_admin && store.state.adminMode;
    const isAnnouncement = isAdmin; // Par défaut, un admin crée une annonce ? Ou choix ?
    // Simplifions : Modale avec choix si Admin

    const div = document.createElement('div');
    div.id = 'create-ticket-modal';
    div.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

    div.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-slide-up">
            <h3 class="font-bold text-lg mb-4 text-slate-900">Nouvelle Conversation</h3>
            
            <form onsubmit="handleCreateTicketSubmit(event)" class="space-y-4">
                
                ${isAdmin ? `
                <div class="bg-slate-50 p-1 rounded-xl flex mb-4">
                    <button type="button" onclick="setTicketType('support')" id="btn-type-support" class="flex-1 py-2 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm transition">Support</button>
                    <button type="button" onclick="setTicketType('announcement')" id="btn-type-announcement" class="flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition">Annonce</button>
                    <input type="hidden" name="type" id="input-ticket-type" value="support">
                </div>
                ` : `<input type="hidden" name="type" value="support">`}

                <div>
                    <label class="text-xs font-bold text-slate-400 uppercase ml-1">Sujet</label>
                    <input name="subject" placeholder="Ex: Question sur le planning" class="w-full p-3 bg-slate-50 rounded-xl font-bold border outline-none focus:border-brand-500" required>
                </div>

                <div>
                    <label class="text-xs font-bold text-slate-400 uppercase ml-1">Message</label>
                    <textarea name="content" rows="4" placeholder="Votre message..." class="w-full p-3 bg-slate-50 rounded-xl font-bold border outline-none focus:border-brand-500" required></textarea>
                </div>

                <button type="submit" class="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition">Créer</button>
            </form>
            
            <button onclick="document.getElementById('create-ticket-modal').remove()" class="w-full py-3 mt-2 text-slate-400 font-bold text-sm hover:bg-slate-50 rounded-xl">Annuler</button>
        </div>
    `;

    document.body.appendChild(div);

    // Helpers pour la modale
    window.setTicketType = (type) => {
        document.getElementById('input-ticket-type').value = type;
        const bSup = document.getElementById('btn-type-support');
        const bAnn = document.getElementById('btn-type-announcement');
        if (type === 'support') {
            bSup.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm transition";
            bAnn.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition";
        } else {
            bAnn.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm transition";
            bSup.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition";
        }
    };

    window.handleCreateTicketSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const type = fd.get('type');
        const subj = fd.get('subject');
        const content = fd.get('content');

        toggleLoader(true);

        let res;
        if (type === 'announcement') {
            res = await ChatService.createAnnouncement(subj, content);
        } else {
            res = await ChatService.createTicket(subj, content);
        }

        toggleLoader(false);

        if (res.success) {
            showToast("Conversation créée !");
            document.getElementById('create-ticket-modal').remove();
            await loadTicketsList(); // Refresh list
            openTicket(res.data.id); // Open it
        } else {
            showToast(res.error.message || "Erreur création", "error");
        }
    };
}
