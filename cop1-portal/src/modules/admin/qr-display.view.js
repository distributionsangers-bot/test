/**
 * ============================================
 * QR DISPLAY VIEW
 * ============================================
 * Affiche un QR code pour un créneau :
 * - Génération QR code avec QRCode.js
 * - Modale d'affichage
 * - Téléchargement du QR code (NOUVEAU)
 * - Gestion d'erreur robuste
 * 
 * RESTAURÉ depuis index_originel.html
 * ============================================
 */

import QRCode from 'qrcode';
import { showToast } from '../../services/utils.js';

export const QRDisplayView = {
    /**
     * Affiche le QR code pour un créneau
     * RESTAURÉ depuis index_originel.html
     * AMÉLIORATIONS : Téléchargement, gestion d'erreur
     * @param {number} shiftId - ID du créneau
     * @param {string} shiftTitle - Titre du créneau
     */
    showShiftQR(shiftId, shiftTitle) {
        try {
            // Nettoyage si modale existante
            const existing = document.getElementById('qr-display-modal');
            if (existing) existing.remove();

            // Création de la modale
            const modal = document.createElement('div');
            modal.id = 'qr-display-modal';
            modal.className = 'fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

            modal.innerHTML = `
                <div class="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-scale-up text-center relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 to-brand-600"></div>

                    <h3 class="font-extrabold text-2xl text-slate-900 mb-2">Scan du Créneau</h3>
                    <p class="text-slate-500 font-medium mb-8 text-sm px-4 leading-relaxed">${shiftTitle}</p>
                    
                    <div class="bg-white p-4 rounded-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 inline-block mb-8 relative group">
                        <canvas id="qr-canvas" class="opacity-0 transition-opacity duration-300 w-[200px] h-[200px]"></canvas>
                        
                        <!-- Logo Central Overlay -->
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div class="w-12 h-12 bg-white rounded-full p-2 shadow-lg flex items-center justify-center">
                                <span class="font-black text-brand-600 text-lg">C</span>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">À scanner par les bénévoles</p>
                        
                        <button 
                            id="download-qr-btn" 
                            class="w-full py-3 bg-brand-600 text-white font-bold rounded-2xl shadow-lg hover:bg-brand-700 transition active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Télécharger
                        </button>
                        
                        <button 
                            id="close-qr-btn" 
                            class="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition active:scale-95"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Event listeners
            modal.querySelector('#close-qr-btn').addEventListener('click', () => modal.remove());
            modal.querySelector('#download-qr-btn').addEventListener('click', () => {
                this.downloadQRCode(shiftId, shiftTitle);
            });

            // Génération du QR Code
            const payload = JSON.stringify({
                shift_id: shiftId,
                type: 'shift',
                timestamp: Date.now()
            });

            setTimeout(() => {
                const canvas = document.getElementById('qr-canvas');
                if (canvas) {
                    QRCode.toCanvas(canvas, payload, {
                        width: 200,
                        margin: 2,
                        color: {
                            dark: "#0f172a",
                            light: "#ffffff"
                        },
                        errorCorrectionLevel: 'H' // Haute correction d'erreur (permet le logo central)
                    }, (error) => {
                        if (error) {
                            console.error('❌ Erreur génération QR code:', error);
                            showToast("Erreur génération QR code", "error");
                        } else {
                            canvas.classList.remove('opacity-0');
                        }
                    });
                }
            }, 50);
        } catch (error) {
            console.error('❌ Erreur affichage QR code:', error);
            showToast("Erreur affichage QR code", "error");
        }
    },

    /**
     * Télécharge le QR code en PNG
     * NOUVEAU - Fonctionnalité manquante
     * @param {number} shiftId - ID du créneau
     * @param {string} shiftTitle - Titre du créneau
     */
    downloadQRCode(shiftId, shiftTitle) {
        try {
            const canvas = document.getElementById('qr-canvas');
            if (!canvas) {
                showToast("QR code introuvable", "error");
                return;
            }

            // Convertit le canvas en image
            canvas.toBlob((blob) => {
                if (!blob) {
                    showToast("Erreur conversion image", "error");
                    return;
                }

                // Crée un lien de téléchargement
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');

                link.href = url;
                link.download = `QR_${shiftTitle.replace(/\s+/g, '_')}_${shiftId}.png`;
                link.style.display = 'none';

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);

                showToast('📥 QR code téléchargé');
            }, 'image/png');
        } catch (error) {
            console.error('❌ Erreur téléchargement QR code:', error);
            showToast("Erreur téléchargement", "error");
        }
    },

    /**
     * Génère un QR code en base64 (pour email ou impression)
     * NOUVEAU - Fonctionnalité utile
     * @param {number} shiftId - ID du créneau
     * @returns {Promise<string>} Data URL du QR code
     */
    async generateQRDataURL(shiftId) {
        try {
            const payload = JSON.stringify({
                shift_id: shiftId,
                type: 'shift',
                timestamp: Date.now()
            });

            const dataURL = await QRCode.toDataURL(payload, {
                width: 400,
                margin: 2,
                color: {
                    dark: "#0f172a",
                    light: "#ffffff"
                },
                errorCorrectionLevel: 'H'
            });

            return dataURL;
        } catch (error) {
            console.error('❌ Erreur génération QR data URL:', error);
            return null;
        }
    }
};
