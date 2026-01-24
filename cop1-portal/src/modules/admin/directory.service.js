/**
 * ============================================
 * DIRECTORY SERVICE
 * ============================================
 * Gère l'annuaire des bénévoles (admin) :
 * - Recherche et filtrage des utilisateurs
 * - Validation/Rejet des inscriptions
 * - Gestion des rôles (admin)
 * - Gestion des justificatifs (proofs)
 * - Suppression de comptes
 * 
 * RESTAURÉ depuis index_originel.html (renderAnnuaire)
 * ============================================
 */

import { supabase } from '../../services/supabase.js';
import { APP_CONFIG } from '../../core/constants.js';

export const DirectoryService = {
    /**
     * Récupère la liste des utilisateurs avec pagination et filtres
     * RESTAURÉ depuis index_originel.html (lignes 1132-1200)
     * @param {number} page - Numéro de page (1-indexed)
     * @param {number} limit - Nombre d'éléments par page
     * @param {string} search - Terme de recherche
     * @param {string} filter - Filtre ('all', 'pending', 'permit', 'mandatory', 'admin')
     * @returns {Promise<{data, count, error}>}
     */
    async getUsers(page = 1, limit = 20, search = '', filter = 'all') {
        try {
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            let query = supabase
                .from('profiles')
                .select('*', { count: 'exact' });

            // Filtres
            if (filter === 'pending') {
                query = query.eq('status', 'pending');
            } else if (filter === 'permit') {
                query = query.eq('has_permit', true);
            } else if (filter === 'mandatory') {
                query = query.eq('mandatory_hours', true);
            } else if (filter === 'admin') {
                query = query.eq('is_admin', true);
            }

            // Recherche (prénom, nom, email)
            if (search) {
                query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
            }

            // Tri et pagination
            query = query
                .order('created_at', { ascending: false })
                .range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            return { data, count, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération utilisateurs:', error);
            return { data: null, count: 0, error };
        }
    },

    /**
     * Récupère les détails complets d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<{data, error}>}
     */
    async getUserDetails(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération détails utilisateur:', error);
            return { data: null, error };
        }
    },

    /**
     * Alias pour getUserDetails (compatibilité)
     */
    async getUserById(userId) {
        return this.getUserDetails(userId);
    },

    /**
     * Met à jour le statut d'un utilisateur (validation/rejet)
     * RESTAURÉ depuis index_originel.html
     * @param {string} userId - ID de l'utilisateur
     * @param {string} status - 'pending', 'approved', 'rejected'
     * @returns {Promise<{success, error}>}
     */
    async updateUserStatus(userId, status) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status })
                .eq('id', userId);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur mise à jour statut:', error);
            return { success: false, error };
        }
    },

    /**
     * Approuve un utilisateur (raccourci)
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<{success, error}>}
     */
    async approveUser(userId) {
        return this.updateUserStatus(userId, 'approved');
    },

    /**
     * Rejette un utilisateur (raccourci)
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<{success, error}>}
     */
    async rejectUser(userId) {
        return this.updateUserStatus(userId, 'rejected');
    },

    /**
     * Met à jour le rôle admin d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @param {boolean} isAdmin - True pour admin, false pour bénévole
     * @returns {Promise<{success, error}>}
     */
    async updateUserRole(userId, isAdmin) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_admin: isAdmin })
                .eq('id', userId);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur mise à jour rôle:', error);
            return { success: false, error };
        }
    },

    /**
     * Met à jour les informations d'un utilisateur
     * NOUVEAU - Fonctionnalité manquante
     * @param {string} userId - ID de l'utilisateur
     * @param {Object} updates - Champs à mettre à jour
     * @returns {Promise<{success, error}>}
     */
    async updateUserProfile(userId, updates) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur mise à jour profil:', error);
            return { success: false, error };
        }
    },

    /**
     * Ajoute ou met à jour une note admin sur un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @param {string} note - Note de l'admin
     * @returns {Promise<{success, error}>}
     */
    async updateAdminNote(userId, note) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ admin_note: note })
                .eq('id', userId);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur mise à jour note admin:', error);
            return { success: false, error };
        }
    },

    /**
     * Supprime complètement un utilisateur (profil + auth.users)
     * Utilise une fonction RPC Supabase pour supprimer de auth.users
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<{success, error}>}
     */
    async deleteUserProfile(userId) {
        try {
            // Supprime d'abord le justificatif si existe
            await this.deleteProofFile(userId);

            // Supprimer les inscriptions d'abord (au cas où pas de CASCADE)
            await supabase
                .from('registrations')
                .delete()
                .eq('user_id', userId);

            // Supprimer les messages du chat
            await supabase
                .from('messages')
                .delete()
                .eq('user_id', userId);

            // Supprimer les tickets créés par l'utilisateur
            await supabase
                .from('tickets')
                .delete()
                .eq('user_id', userId);

            // Supprimer le profil
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (profileError) {
                console.error('Erreur suppression profil:', profileError);
                throw profileError;
            }

            // Appeler la RPC pour supprimer de auth.users
            // Cette function doit être créée dans Supabase avec SECURITY DEFINER
            const { error: rpcError } = await supabase.rpc('delete_user_from_auth', {
                target_user_id: userId
            });

            if (rpcError) {
                console.warn('RPC delete_user_from_auth non disponible ou erreur:', rpcError.message);
                // On continue quand même, le profil est supprimé
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur suppression utilisateur:', error);
            return { success: false, error };
        }
    },

    /**
     * Récupère l'URL signée du justificatif d'un utilisateur
     * RESTAURÉ depuis index_originel.html (gestion des proofs)
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<{signedUrl, error}>}
     */
    async getProofUrl(userId) {
        try {
            // Liste les fichiers du bucket 'proofs'
            // [FIX] On cherche soit avec le userId comme prefix (si dossier), soit comme nom de fichier
            // Pour l'instant, on suppose que le fichier est stocké à la racine avec le nom 'userId' ou contient 'userId'

            // Stratégie 1: Chercher si c'est un dossier userId/
            let { data: list, error: listErr } = await supabase
                .storage
                .from(APP_CONFIG.BUCKET_PROOF)
                .list(userId + '/');

            let filePath = null;

            if (list && list.length > 0) {
                // C'est un dossier, on prend le premier fichier
                filePath = userId + '/' + list[0].name;
            } else {
                // Stratégie 2: Chercher à la racine avec le userId dans le nom
                const { data: rootList, error: rootErr } = await supabase
                    .storage
                    .from(APP_CONFIG.BUCKET_PROOF)
                    .list('', { search: userId });

                if (rootErr) throw rootErr;

                if (rootList && rootList.length > 0) {
                    // Prend le fichier le plus récent qui correspond
                    const file = rootList.sort((a, b) =>
                        new Date(b.created_at) - new Date(a.created_at)
                    )[0];
                    filePath = file.name;
                }
            }

            if (!filePath) {
                return { signedUrl: null, error: { message: 'Aucun justificatif trouvé' } };
            }

            // Génère une URL signée (valide 1 heure)
            const { data, error } = await supabase
                .storage
                .from(APP_CONFIG.BUCKET_PROOF)
                .createSignedUrl(filePath, 3600);

            if (error) throw error;

            return { signedUrl: data.signedUrl, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération justificatif:', error);
            return { signedUrl: null, error };
        }
    },

    /**
     * Supprime le justificatif d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<{success, error}>}
     */
    async deleteProofFile(userId) {
        try {
            let filesToRemove = [];

            // 1. Vérifier si c'est un dossier userId/
            const { data: folderList } = await supabase
                .storage
                .from(APP_CONFIG.BUCKET_PROOF)
                .list(userId + '/');

            if (folderList && folderList.length > 0) {
                // C'est un dossier, on supprime tout ce qu'il y a dedans
                filesToRemove = folderList.map(f => userId + '/' + f.name);
            } else {
                // 2. Vérifier à la racine
                const { data: rootList } = await supabase
                    .storage
                    .from(APP_CONFIG.BUCKET_PROOF)
                    .list('', { search: userId });

                if (rootList && rootList.length > 0) {
                    filesToRemove = rootList.map(f => f.name);
                }
            }

            if (filesToRemove.length === 0) {
                return { success: true, error: null };
            }

            // Supprime tous les fichiers trouvés
            const { error } = await supabase
                .storage
                .from(APP_CONFIG.BUCKET_PROOF)
                .remove(filesToRemove);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erreur suppression justificatif:', error);
            return { success: false, error };
        }
    },

    /**
     * Récupère les statistiques de l'annuaire
     * NOUVEAU - Fonctionnalité utile pour dashboard
     * @returns {Promise<{data, error}>}
     */
    async getDirectoryStats() {
        try {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('status, is_admin, has_permit, mandatory_hours');

            if (error) throw error;

            const stats = {
                total: profiles.length,
                pending: profiles.filter(p => p.status === 'pending').length,
                approved: profiles.filter(p => p.status === 'approved').length,
                rejected: profiles.filter(p => p.status === 'rejected').length,
                admins: profiles.filter(p => p.is_admin).length,
                withPermit: profiles.filter(p => p.has_permit).length,
                mandatory: profiles.filter(p => p.mandatory_hours).length
            };

            return { data: stats, error: null };
        } catch (error) {
            console.error('❌ Erreur récupération statistiques:', error);
            return { data: null, error };
        }
    },

    /**
     * Exporte la liste des utilisateurs au format CSV
     * NOUVEAU - Fonctionnalité utile pour admin
     * @param {string} filter - Filtre à appliquer
     * @returns {Promise<{csv, error}>}
     */
    async exportUsersCSV(filter = 'all') {
        try {
            // Récupère tous les utilisateurs (sans pagination)
            const { data: users, error } = await this.getUsers(1, 10000, '', filter);

            if (error) throw error;

            // Génère le CSV
            const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Statut', 'Permis', 'Heures Obligatoires', 'Date inscription'];
            const rows = users.map(u => [
                u.first_name,
                u.last_name,
                u.email,
                u.phone || 'N/A',
                u.status,
                u.has_permit ? 'Oui' : 'Non',
                u.mandatory_hours ? 'Oui' : 'Non',
                new Date(u.created_at).toLocaleDateString('fr-FR')
            ]);

            const csv = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            return { csv, error: null };
        } catch (error) {
            console.error('❌ Erreur export CSV:', error);
            return { csv: null, error };
        }
    }
};
