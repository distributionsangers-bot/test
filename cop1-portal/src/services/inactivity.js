// ==================================================================================
// SERVICE INACTIVITÉ - Déconnexion automatique après 30 minutes d'inactivité
// ==================================================================================

import { supabase } from './supabase.js';
import { showToast } from './utils.js';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE = 5 * 60 * 1000; // Avertissement 5 min avant

let inactivityTimer = null;
let warningTimer = null;
let warningToastShown = false;

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

/**
 * Réinitialise le timer d'inactivité
 */
function resetTimer() {
    // Clear existing timers
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    warningToastShown = false;

    // Set warning timer (25 min)
    warningTimer = setTimeout(() => {
        if (!warningToastShown) {
            warningToastShown = true;
            showToast("⚠️ Vous serez déconnecté dans 5 minutes pour inactivité", "warning");
        }
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    // Set logout timer (30 min)
    inactivityTimer = setTimeout(async () => {
        await performLogout();
    }, INACTIVITY_TIMEOUT);
}

/**
 * Effectue la déconnexion
 */
async function performLogout() {
    try {
        showToast("Session expirée - Déconnexion automatique", "info");

        // Small delay to show the toast
        await new Promise(resolve => setTimeout(resolve, 1500));

        await supabase.auth.signOut();
        window.location.reload();
    } catch (err) {
        console.error('Auto-logout error:', err);
        window.location.reload();
    }
}

/**
 * Démarre la surveillance de l'inactivité
 */
export function startInactivityMonitor() {
    // Add event listeners for user activity
    ACTIVITY_EVENTS.forEach(event => {
        document.addEventListener(event, resetTimer, { passive: true });
    });

    // Start the initial timer
    resetTimer();

    console.log('🔒 Inactivity monitor started (30 min timeout)');
}

/**
 * Arrête la surveillance de l'inactivité
 */
export function stopInactivityMonitor() {
    // Clear timers
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);

    // Remove event listeners
    ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, resetTimer);
    });

    console.log('🔓 Inactivity monitor stopped');
}
