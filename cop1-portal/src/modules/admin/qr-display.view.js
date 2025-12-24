

import QRCode from 'qrcode';

export const QRDisplayView = {
    showShiftQR(shiftId, shiftTitle) {
        // 1. Nettoyage si modale existante
        const existing = document.getElementById('qr-display-modal');
        if (existing) existing.remove();

        // 2. Création de la modale
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
                    
                    <!-- Logo Central Overlay (Optionnel) -->
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div class="w-12 h-12 bg-white rounded-full p-2 shadow-lg flex items-center justify-center">
                            <span class="font-black text-brand-600 text-lg">C</span>
                        </div>
                    </div>
                </div>

                <div class="space-y-3">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">À scanner par les bénévoles</p>
                    
                    <button id="close-qr-btn" class="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg shadow-slate-200 hover:bg-slate-800 transition active:scale-95">
                        Fermer
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#close-qr-btn').addEventListener('click', () => modal.remove());

        // 3. Génération du QR Code
        const payload = JSON.stringify({
            shift_id: shiftId,
            type: 'attendance_validation'
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
                    }
                }, function (error) {
                    if (error) console.error(error);
                    else canvas.classList.remove('opacity-0');
                });
            }
        }, 50);
    }
};
