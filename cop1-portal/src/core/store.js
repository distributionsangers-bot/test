// Basic reactive store implementation to mimic Vue/React state management
class Store {
    constructor(initialState) {
        this.state = new Proxy(initialState, {
            set: (target, key, value) => {
                target[key] = value;
                this.notify(key, value);
                return true;
            }
        });
        this.listeners = new Map();
    }

    // Subscribe to changes on a specific key
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }

    notify(key, value) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(cb => cb(value));
        }
    }
}

const initialState = {
    user: null,
    profile: null,
    view: 'login',
    adminMode: false,

    // Data
    events: [],
    myRegs: [],
    usersToValidate: [],
    allUsers: [],
    messages: [],
    admins: [],
    templates: [],
    tempShifts: [],
    teams: [],
    myInterests: [],

    // UI State
    dashboard: { totalVolunteers: 0, totalHours: 0, pendingCount: 0, urgentShifts: [] },
    planningTab: 'upcoming',
    proofs: {}
};

export const store = new Store(initialState);
