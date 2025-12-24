import { ScannerService } from './scanner.service.js';
import { showToast } from '../../services/utils.js';

// Variable globale pour l'instance du scanner
let html5QrcodeScanner = null;

export const ScannerView = {

    openScanner() {
        // ... (lines 11-60)
        if (typeof Html5Qrcode === 'undefined') {
            console.error("Html5Qrcode not loaded");
            showToast("Erreur: Librairie Scanner manquante", "error");
            ScannerView.closeScanner();
            return;
        }

        // ... (lines 67-83)
        html5QrcodeScanner.start(
            { facingMode: "environment" },
            config,
            ScannerView.onScanSuccess
        ).catch(err => {
            console.error("Camera access error:", err);
            ScannerView.closeScanner();
            showToast("Impossible d'accéder à la caméra.", "error");
        });
    },

    // ... (lines 88-108)

    async onScanSuccess(decodedText) {
        // Pause immédiate pour éviter double scan
        if (html5QrcodeScanner) html5QrcodeScanner.pause();

        try {
            const data = JSON.parse(decodedText);

            // Traitement via le Service
            const result = await ScannerService.processScan(data);

            if (result.success) {
                // Succès -> Feedback + Fermeture
                if (result.warning) {
                    alert("⚠️ ATTENTION : " + result.message); // Alert pour que l'user voit bien le warning quota
                } else {
                    showToast(result.message, "success"); // Toast pour succès normal
                }

                ScannerView.closeScanner();

                // Rafraichir l'interface si nécessaire (ex: dashboard)
                if (window.location.reload) setTimeout(() => window.location.reload(), 1000);

            } else {
                // Erreur logique (ex: mauvais shift) -> On reprend le scan
                showToast(result.message, "error");
                if (html5QrcodeScanner) html5QrcodeScanner.resume();
            }

        } catch (e) {
            console.error(e);
            showToast("QR Code invalide ou illisible", "error");
            if (html5QrcodeScanner) html5QrcodeScanner.resume();
        }
    }
};

// Exposition globale pour usage dans le HTML onclick="openScanner()"
window.openScanner = ScannerView.openScanner;
