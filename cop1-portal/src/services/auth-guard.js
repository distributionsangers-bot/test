/**
 * ============================================
 * AUTH GUARD - Frontend Authorization Utility
 * ============================================
 * Fournit des vérifications d'autorisation côté client
 * en complément des RLS Supabase (défense en profondeur).
 * 
 * IMPORTANT : Ces checks NE REMPLACENT PAS les RLS.
 * Ils servent à bloquer les actions avant même d'envoyer
 * la requête à Supabase, pour une meilleure UX.
 * ============================================
 */

import { store } from '../core/store.js';

/**
 * Vérifie si l'utilisateur courant est admin
 * @returns {boolean}
 */
export function isAdmin() {
    return store.state.profile?.is_admin === true;
}

/**
 * Vérifie si l'utilisateur est connecté
 * @returns {boolean}
 */
export function isAuthenticated() {
    return !!store.state.user;
}

/**
 * Guard pour les actions admin.
 * Retourne un objet erreur si l'utilisateur n'est pas admin, null sinon.
 * 
 * Usage dans un service :
 * ```
 * async deleteEvent(id) {
 *     const guard = requireAdmin('supprimer un événement');
 *     if (guard) return guard;
 *     // ... suite de la logique
 * }
 * ```
 * 
 * @param {string} actionName - Description de l'action (pour le log)
 * @returns {Object|null} - Objet { success: false, data: null, error } ou null si OK
 */
export function requireAdmin(actionName = 'cette action') {
    if (!isAdmin()) {
        console.warn(`⛔ Accès refusé: "${actionName}" requiert les droits administrateur.`);
        return {
            success: false,
            data: null,
            error: { message: `Non autorisé : ${actionName}` }
        };
    }
    return null;
}

/**
 * Vérifie si la route actuelle est autorisée pour l'utilisateur.
 * Les routes /admin_* requièrent is_admin.
 * @param {string} path - Le chemin de la route
 * @returns {boolean} - true si autorisé
 */
export function isRouteAllowed(path) {
    // Routes admin
    if (path.startsWith('/admin_') || path.startsWith('/admin/')) {
        return isAdmin();
    }
    return true;
}
