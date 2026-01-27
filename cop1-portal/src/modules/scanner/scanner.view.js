import { ScannerService } from './scanner.service.js';
import { showToast, showConfirm } from '../../services/utils.js';
import { Html5Qrcode } from 'html5-qrcode'; // Import module from npm
import { createIcons, icons } from 'lucide';

let html5QrcodeScanner = null;

export const ScannerView = {

    openScanner() {
        // 1. Creation de l'interface
        const m = document.createElement('div');
        m.id = 'scanner-overlay';
        m.className = "fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center animate-fade-in";

        // Style CSS temporaire pour la video
        const style = document.createElement('style');
        style.id = 'scanner-css';
        style.innerHTML = `
            #qr-reader video { object-fit: cover; width: 100% !important; height: 100% !important; border-radius: 1.5rem; }
            #qr-reader { border: none !important; width: 100% !important; height: 100% !important; }
        `;
        document.head.appendChild(style);

        m.innerHTML = `
            <button id="close-scanner-btn" class="absolute top-6 right-6 text-white bg-red-500 hover:bg-red-600 p-3 rounded-full backdrop-blur-md transition z-[210] border-2 border-white shadow-lg shadow-red-500/50" style="z-index: 9999 !important;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            
            <h3 class="absolute top-16 text-white font-bold text-lg tracking-wide z-50 drop-shadow-md text-center w-full px-4">
                Visez le QR Code
            </h3>
            
            <div class="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl mx-4 bg-black">
                
                <div id="qr-reader" class="w-full h-full bg-black"></div>

                <div class="absolute inset-0 border-[3rem] border-black/50 z-10 pointer-events-none"></div>
                
                <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-brand-500 rounded-3xl z-20 opacity-80 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-400 to-transparent opacity-50 animate-scan"></div>
                </div>
            </div>

            <p class="text-white/60 mt-8 text-xs font-medium px-10 text-center max-w-xs mx-auto">
                Visez le QR Code du créneau.
            </p>
        `;

        document.body.appendChild(m);

        // Event Listener pour fermer le scanner (avec stopPropagation)
        const closeBtn = m.querySelector('#close-scanner-btn');
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            ScannerView.closeScanner();
        });

        // 2. Démarrage de la caméra
        html5QrcodeScanner = new Html5Qrcode("qr-reader");

        // Calcul de la taille idéale
        const width = Math.min(window.innerWidth * 0.8, 300);

        const config = {
            fps: 10,
            qrbox: { width: width, height: width },
            aspectRatio: 1.0
        };

        html5QrcodeScanner.start({ facingMode: "environment" }, config, ScannerView.onScanSuccess)
            .catch(err => {
                console.error(err);
                ScannerView.closeScanner();
                showToast("Impossible d'accéder à la caméra. Vérifiez les permissions.", "error");
            });
    },

    closeScanner() {
        const style = document.getElementById('scanner-css');
        if (style) style.remove();

        const cleanupOverlay = () => {
            const el = document.getElementById('scanner-overlay');
            if (el) el.remove();
        }

        if (html5QrcodeScanner) {
            html5QrcodeScanner.stop().then(() => {
                html5QrcodeScanner.clear();
                cleanupOverlay();
            }).catch(err => {
                console.warn("Erreur arrêt scanner", err);
                cleanupOverlay();
            });
        } else {
            cleanupOverlay();
        }
    },

    async onScanSuccess(decodedText) {
        ScannerView.closeScanner();
        try {
            const data = JSON.parse(decodedText);

            // Vérification du type de QR Code
            if (data.type === 'shift' || data.type === 'attendance_validation') {
                await ScannerView.validateAttendance(data.shift_id);
            } else {
                showToast('QR Code non reconnu', 'error');
            }
        } catch (e) {
            showToast('Format QR Code invalide', 'error');
        }
    },

    async validateAttendance(shiftId) {
        showConfirm("Confirmer la présence pour ce créneau ?", async () => {
            try {
                const result = await ScannerService.validateAttendance(shiftId);

                if (result.penalty) {
                    showToast(`⚠️ ALERTE QUOTA SCOLAIRE: ${result.message} (0h)`, "warning");
                } else {
                    showToast(`C'est tout bon ! (+${result.hours_added}h)`);
                }

                // Rafraîchir dashboard si visible
                if (document.getElementById('dashboard-view')) {
                    window.location.reload();
                }

            } catch (err) {
                console.error(err);
                showToast(err.message || "Erreur validation", 'error');
            }
        });
    }
};

// Export par défaut pour compatibilité router
export default ScannerView;
