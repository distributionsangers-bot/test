import { ChatService } from './chat.service.js';
import { store } from '../../core/store.js';
import { showToast, toggleLoader, escapeHtml, formatDate } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';

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

    // ... (rest of renderChat HTML) ...

    // --- MODALE NOUVEAU TICKET (Embedded) ---
    const modalHtml = `
        <div id="create-ticket-modal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in hidden">
            <div class="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-slide-up">
                <h3 class="font-bold text-lg mb-4 text-slate-900">Nouvelle Conversation</h3>
                
                <form id="form-create-ticket" class="space-y-4">
                    
                    ${isAdmin ? `
                    <div class="bg-slate-50 p-1 rounded-xl flex mb-4">
                        <button type="button" data-type="support" class="btn-type-select flex-1 py-2 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm transition">Support</button>
                        <button type="button" data-type="announcement" class="btn-type-select flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition">Annonce</button>
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
                
                <button id="btn-close-ticket-modal" class="w-full py-3 mt-2 text-slate-400 font-bold text-sm hover:bg-slate-50 rounded-xl">Annuler</button>
            </div>
        </div>
    `;

    container.innerHTML += modalHtml;

    // Gestionnaires d'événements globaux pour cette vue
    setupEventListeners(container); // S'assure de lier les boutons générés

    createIcons({ icons });

    // Chargement des données
    await loadTicketsList();

    // Si on a un ID dans les params (ex: /messages/123), on ouvre direct
    if (params.id) {
        await openTicket(params.id);
    }
}

// ... (Rest of logic: loadTicketsList, renderTicketItem, openTicket etc. are fine) ...

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

    // Formulaire d'envoi MESSAGE
    const form = root.querySelector('#chat-input-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('message-input');
            const content = input.value.trim();
            if (!content || !currentTicketId) return;

            input.value = ''; // UI Optimiste

            const res = await ChatService.sendMessage(currentTicketId, content);
            if (!res.success) {
                showToast("Échec envoi message", "error");
                input.value = content;
            }
        });
    }

    // --- LOGIQUE MODALE CREATION TICKET ---

    // 1. Ouvrir
    window.openCreateTicketModal = () => {
        const m = document.getElementById('create-ticket-modal');
        if (m) m.classList.remove('hidden');
    };

    // 2. Fermer
    const closeBtn = document.getElementById('btn-close-ticket-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('create-ticket-modal').classList.add('hidden');
        });
    }

    // 3. Gestion Type (Support/Annonce)
    const typeBtns = root.querySelectorAll('.btn-type-select');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            document.getElementById('input-ticket-type').value = type;

            // Update UI
            typeBtns.forEach(b => {
                if (b.dataset.type === type) {
                    b.className = "btn-type-select flex-1 py-2 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm transition";
                } else {
                    b.className = "btn-type-select flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition";
                }
            });
        });
    });

    // 4. Submit Création
    const createForm = document.getElementById('form-create-ticket');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
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
                document.getElementById('create-ticket-modal').classList.add('hidden');
                createForm.reset();
                await loadTicketsList();
                openTicket(res.data.id);
            } else {
                showToast(res.error.message || "Erreur création", "error");
            }
        });
    }
}
