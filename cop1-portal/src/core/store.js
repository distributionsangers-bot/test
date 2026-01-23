/**
 * ============================================
 * STORE - Global State Management
 * ============================================
 * Gère l'état global de l'application avec :
 * - Réactivité (Proxy)
 * - Système de souscription (pub/sub)
 * - Persistance localStorage
 * - Méthodes utilitaires
 * - Gestion d'erreur
 * 
 * RESTAURÉ depuis index_originel.html (lignes 160-167)
 * AMÉLIORATIONS :
 * - Système réactif avec Proxy
 * - Subscribe/Unsubscribe
 * - Méthodes utilitaires (reset, persist, etc.)
 * - Gestion d'erreur robuste
 * - Debug mode
 * ============================================
 */

/**
 * Classe Store - Gestion d'état réactive
 * Inspirée de Vue/React state management
 */
class Store {
    constructor(initialState) {
        // État réactif avec Proxy
        this.state = new Proxy(initialState, {
            set: (target, key, value) => {
                const oldValue = target[key];
                target[key] = value;

                // Notifie les listeners uniquement si la valeur a changé
                if (oldValue !== value) {
                    this.notify(key, value, oldValue);
                }

                return true;
            }
        });

        // Map des listeners : key -> Set(callbacks)
        this.listeners = new Map();

        // Map des listeners globaux (écoutent tous les changements)
        this.globalListeners = new Set();

        // Mode debug (affiche les changements d'état)
        this.debug = false;

        // Historique des changements (pour debug)
        this.history = [];
        this.maxHistorySize = 50;
    }

    /**
     * Souscrit à un changement d'état spécifique
     * @param {string} key - La clé de l'état à surveiller
     * @param {Function} callback - La fonction à appeler lors du changement
     * @returns {Function} Fonction de désinscription
     */
    subscribe(key, callback) {
        if (typeof callback !== 'function') {
            console.error('❌ Store.subscribe: callback doit être une fonction');
            return () => { };
        }

        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }

        this.listeners.get(key).add(callback);

        // Retourne une fonction de désinscription
        return () => this.unsubscribe(key, callback);
    }

    /**
     * Se désinscrit d'un changement d'état
     * @param {string} key - La clé de l'état
     * @param {Function} callback - La fonction à retirer
     */
    unsubscribe(key, callback) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).delete(callback);

            // Nettoie la Map si plus de listeners
            if (this.listeners.get(key).size === 0) {
                this.listeners.delete(key);
            }
        }
    }

    /**
     * Souscrit à TOUS les changements d'état
     * @param {Function} callback - La fonction à appeler (reçoit { key, value, oldValue })
     * @returns {Function} Fonction de désinscription
     */
    subscribeAll(callback) {
        if (typeof callback !== 'function') {
            console.error('❌ Store.subscribeAll: callback doit être une fonction');
            return () => { };
        }

        this.globalListeners.add(callback);

        return () => this.globalListeners.delete(callback);
    }

    /**
     * Notifie les listeners d'un changement
     * @param {string} key - La clé qui a changé
     * @param {*} value - La nouvelle valeur
     * @param {*} oldValue - L'ancienne valeur
     */
    notify(key, value, oldValue) {
        // Debug mode
        if (this.debug) {
            console.log(`🔄 Store: ${key} =`, value, `(was: ${oldValue})`);
        }

        // Historique
        this.addToHistory({ key, value, oldValue, timestamp: Date.now() });

        // Notifie les listeners spécifiques
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(cb => {
                try {
                    cb(value, oldValue);
                } catch (error) {
                    console.error(`❌ Erreur dans le listener de "${key}":`, error);
                }
            });
        }

        // Notifie les listeners globaux
        this.globalListeners.forEach(cb => {
            try {
                cb({ key, value, oldValue });
            } catch (error) {
                console.error('❌ Erreur dans un listener global:', error);
            }
        });
    }

    /**
     * Ajoute un changement à l'historique
     * @param {Object} change - { key, value, oldValue, timestamp }
     */
    addToHistory(change) {
        this.history.push(change);

        // Limite la taille de l'historique
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Récupère l'historique des changements
     * @param {number} limit - Nombre de changements à retourner
     * @returns {Array}
     */
    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }

    /**
     * Réinitialise une clé de l'état à sa valeur initiale
     * @param {string} key - La clé à réinitialiser
     */
    reset(key) {
        if (key in initialState) {
            this.state[key] = JSON.parse(JSON.stringify(initialState[key]));
        } else {
            console.warn(`⚠️ Store.reset: "${key}" n'existe pas dans l'état initial`);
        }
    }

    /**
     * Réinitialise tout l'état
     */
    resetAll() {
        Object.keys(initialState).forEach(key => {
            this.state[key] = JSON.parse(JSON.stringify(initialState[key]));
        });
    }

    /**
     * Persiste une clé dans le localStorage
     * @param {string} key - La clé à persister
     * @param {string} storageKey - La clé dans le localStorage (optionnel)
     */
    persist(key, storageKey = null) {
        const lsKey = storageKey || `cop1_store_${key}`;

        try {
            localStorage.setItem(lsKey, JSON.stringify(this.state[key]));
        } catch (error) {
            console.error(`❌ Erreur lors de la persistance de "${key}":`, error);
        }
    }

    /**
     * Restaure une clé depuis le localStorage
     * @param {string} key - La clé à restaurer
     * @param {string} storageKey - La clé dans le localStorage (optionnel)
     * @returns {boolean} True si restauré avec succès
     */
    restore(key, storageKey = null) {
        const lsKey = storageKey || `cop1_store_${key}`;

        try {
            const value = localStorage.getItem(lsKey);
            if (value !== null) {
                this.state[key] = JSON.parse(value);
                return true;
            }
        } catch (error) {
            console.error(`❌ Erreur lors de la restauration de "${key}":`, error);
        }

        return false;
    }

    /**
     * Active/Désactive le mode debug
     * @param {boolean} enabled - True pour activer
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`🐛 Store debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * Récupère un snapshot de l'état actuel
     * @returns {Object} Copie profonde de l'état
     */
    getSnapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Restaure un snapshot de l'état
     * @param {Object} snapshot - L'état à restaurer
     */
    restoreSnapshot(snapshot) {
        Object.keys(snapshot).forEach(key => {
            if (key in this.state) {
                this.state[key] = JSON.parse(JSON.stringify(snapshot[key]));
            }
        });
    }

    /**
     * Nettoie tous les listeners (utile pour les tests)
     */
    clearListeners() {
        this.listeners.clear();
        this.globalListeners.clear();
    }
}

/**
 * État initial de l'application
 * RESTAURÉ depuis index_originel.html (lignes 160-167)
 * STRUCTURE IDENTIQUE pour compatibilité
 */
const initialState = {
    // ============================================================
    // AUTHENTIFICATION & UTILISATEUR
    // ============================================================
    user: null,              // Utilisateur Supabase (session)
    profile: null,           // Profil complet depuis la table profiles
    view: 'login',           // Vue actuelle (pour compatibilité, le router gère maintenant)
    adminMode: false,        // Mode admin activé ou non

    // ============================================================
    // DONNÉES MÉTIER
    // ============================================================
    events: [],              // Liste des événements
    myRegs: [],              // Mes inscriptions (registrations)
    usersToValidate: [],     // Utilisateurs en attente de validation (admin)
    allUsers: [],            // Tous les utilisateurs (admin)
    messages: [],            // Messages du chat
    admins: [],              // Liste des administrateurs
    templates: [],           // Templates d'événements (admin)
    tempShifts: [],          // Créneaux temporaires (lors de la création d'événement)
    teams: [],               // Équipes/Pôles
    myInterests: [],         // Centres d'intérêt de l'utilisateur
    proofs: {},              // Map user_id -> chemin du justificatif

    // ============================================================
    // ÉTAT UI
    // ============================================================
    dashboard: {
        totalVolunteers: 0,
        totalHours: 0,
        pendingCount: 0,
        urgentShifts: []
    },
    planningTab: 'upcoming', // Onglet actif dans le planning admin

    // ============================================================
    // NOUVEAUX (Améliorations)
    // ============================================================
    loading: false,          // État de chargement global
    error: null,             // Erreur globale
    notifications: [],       // Notifications en attente
    filters: {               // Filtres actifs (annuaire, événements, etc.)
        search: '',
        status: 'all',
        team: null
    }
};

/**
 * Instance singleton du store
 * Export pour utilisation dans toute l'app
 */
export const store = new Store(initialState);

/**
 * Helper : Restaure l'état depuis le localStorage au démarrage
 * RESTAURÉ depuis index_originel.html (restauration adminMode)
 */
export function restorePersistedState() {
    try {
        // Restaure le mode admin
        const savedMode = localStorage.getItem('cop1_admin_mode');
        if (savedMode !== null) {
            store.state.adminMode = savedMode === 'true';
        }

        // Restaure la dernière vue (pour compatibilité)
        const lastView = localStorage.getItem('cop1_last_view');
        if (lastView) {
            store.state.view = lastView;
        }

    } catch (error) {
        console.error('❌ Erreur lors de la restauration de l\'état persisté:', error);
    }
}

/**
 * Helper : Persiste automatiquement certaines clés
 * À appeler après l'initialisation du store
 */
export function setupAutoPersist() {
    // Auto-persist du mode admin
    store.subscribe('adminMode', (value) => {
        localStorage.setItem('cop1_admin_mode', value.toString());
    });

    // Auto-persist de la vue (pour compatibilité)
    store.subscribe('view', (value) => {
        if (value && value !== 'login' && value !== 'register') {
            localStorage.setItem('cop1_last_view', value);
        }
    });
}

/**
 * Helper : Actions communes sur le store
 * Évite la duplication de logique dans les vues
 */
export const storeActions = {
    /**
     * Définit l'utilisateur connecté
     * @param {Object} user - L'utilisateur Supabase
     * @param {Object} profile - Le profil depuis la DB
     */
    setUser(user, profile) {
        store.state.user = user;
        store.state.profile = profile;
    },

    /**
     * Déconnecte l'utilisateur
     */
    logout() {
        store.state.user = null;
        store.state.profile = null;
        store.state.adminMode = false;
        store.state.view = 'login';

        // Nettoie les données sensibles
        store.state.events = [];
        store.state.myRegs = [];
        store.state.messages = [];
        store.state.allUsers = [];
    },

    /**
     * Active/Désactive le mode admin
     */
    toggleAdminMode() {
        store.state.adminMode = !store.state.adminMode;
    },

    /**
     * Définit l'état de chargement global
     * @param {boolean} loading - True si en chargement
     */
    setLoading(loading) {
        store.state.loading = loading;
    },

    /**
     * Définit une erreur globale
     * @param {Error|string} error - L'erreur
     */
    setError(error) {
        store.state.error = error;
    },

    /**
     * Ajoute une notification
     * @param {Object} notification - { type, message, duration }
     */
    addNotification(notification) {
        store.state.notifications = [
            ...store.state.notifications,
            { id: Date.now(), ...notification }
        ];
    },

    /**
     * Retire une notification
     * @param {number} id - L'ID de la notification
     */
    removeNotification(id) {
        store.state.notifications = store.state.notifications.filter(n => n.id !== id);
    }
};

// Export de l'état initial pour les tests
export { initialState };
